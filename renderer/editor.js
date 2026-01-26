// Editor module - handles the contenteditable editor, autosave, and TODO detection

const Editor = {
  element: null,
  currentChapter: null,
  saveTimeout: null,
  lastActivityTime: null,
  onContentChange: null,
  onTodosChange: null,
  onHeadingsChange: null,

  init() {
    this.element = document.getElementById('editor');
    this.setupEventListeners();
    this.disable(); // Start disabled until a chapter is loaded
  },

  setupEventListeners() {
    // Input handling with debounced save
    this.element.addEventListener('input', () => {
      this.lastActivityTime = Date.now();
      this.ensureParagraphs();
      this.scheduleSave();
      this.detectTodos();
      this.detectHeadings();
      this.updateWordCount();
      this.scrollCursorToCenter();

      if (this.onContentChange) {
        this.onContentChange();
      }
    });

    // Handle Enter key to create proper paragraphs
    this.element.addEventListener('keydown', (e) => {
      this.lastActivityTime = Date.now();

      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.insertParagraph();
        // Small delay to ensure new paragraph is laid out before scrolling
        setTimeout(() => this.scrollCursorToCenter(), 10);
      }

      // If editor is empty and user types a character, create first paragraph
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (this.element.childNodes.length === 0) {
          e.preventDefault();
          const p = document.createElement('p');
          p.textContent = e.key;
          this.element.appendChild(p);
          this.moveCursorToEnd();
        }
      }
    });

    // Handle paste - strip formatting, use execCommand to maintain undo stack
    this.element.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = e.clipboardData.getData('text/plain');
      // Filter out empty lines and join with newlines
      const cleanedText = text.split(/\r?\n/)
        .filter(line => line.trim() !== '')
        .join('\n');
      // Use execCommand to maintain undo/redo history
      document.execCommand('insertText', false, cleanedText);
    });

    // Track focus for activity
    this.element.addEventListener('focus', () => {
      this.lastActivityTime = Date.now();
    });

    // Track selection changes to update word count for selected text
    document.addEventListener('selectionchange', () => {
      this.updateWordCount();
    });
  },

  // Ensure content is wrapped in paragraphs
  ensureParagraphs() {
    // If editor is empty or has only text nodes, wrap in paragraph
    if (this.element.childNodes.length === 0) {
      return;
    }

    // Convert any direct text nodes or non-paragraph elements to paragraphs
    const fragment = document.createDocumentFragment();
    let needsUpdate = false;

    // Helper to split text with newlines/BRs into multiple paragraphs
    const splitIntoParagraphs = (html) => {
      // Split by BR tags and newlines
      const parts = html.split(/<br\s*\/?>/gi)
        .flatMap(part => part.split('\n'))
        .map(part => part.trim())
        .filter(part => part !== '');
      return parts;
    };

    Array.from(this.element.childNodes).forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        if (node.textContent.trim()) {
          // Split text node by newlines
          const lines = node.textContent.split('\n').filter(l => l.trim());
          lines.forEach(line => {
            const p = document.createElement('p');
            p.textContent = line;
            fragment.appendChild(p);
          });
          needsUpdate = true;
        }
      } else if (node.nodeName === 'DIV') {
        // Convert divs to paragraphs, splitting by BRs if present
        const parts = splitIntoParagraphs(node.innerHTML);
        if (parts.length > 0) {
          parts.forEach(part => {
            const p = document.createElement('p');
            p.textContent = part;
            fragment.appendChild(p);
          });
        } else {
          const p = document.createElement('p');
          p.innerHTML = node.innerHTML;
          fragment.appendChild(p);
        }
        needsUpdate = true;
      } else if (node.nodeName === 'BR') {
        // Remove stray BR elements
        needsUpdate = true;
      } else if (node.nodeName === 'P') {
        // Check if paragraph contains BR tags and split if needed
        if (node.innerHTML.includes('<br')) {
          const parts = splitIntoParagraphs(node.innerHTML);
          if (parts.length > 1) {
            parts.forEach(part => {
              const p = document.createElement('p');
              p.textContent = part;
              fragment.appendChild(p);
            });
            needsUpdate = true;
          } else {
            fragment.appendChild(node.cloneNode(true));
          }
        } else {
          fragment.appendChild(node.cloneNode(true));
        }
      } else {
        fragment.appendChild(node.cloneNode(true));
      }
    });

    if (needsUpdate) {
      const selection = window.getSelection();
      const hadFocus = document.activeElement === this.element;

      this.element.innerHTML = '';
      this.element.appendChild(fragment);

      if (hadFocus) {
        // Move cursor to end
        this.moveCursorToEnd();
      }
    }
  },

  // Insert a new paragraph at cursor position
  insertParagraph() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);

    // Find the current paragraph
    let currentP = range.startContainer;
    while (currentP && currentP.nodeName !== 'P' && currentP !== this.element) {
      currentP = currentP.parentNode;
    }

    if (currentP === this.element || !currentP) {
      // No paragraph found, create one
      const p = document.createElement('p');
      p.innerHTML = '<br>';
      this.element.appendChild(p);
      this.moveCursorToElement(p);
      return;
    }

    // Split the paragraph at cursor position
    const newP = document.createElement('p');

    // Get content after cursor
    const afterRange = document.createRange();
    afterRange.setStart(range.endContainer, range.endOffset);
    afterRange.setEndAfter(currentP.lastChild || currentP);

    const afterContent = afterRange.extractContents();

    if (afterContent.textContent.trim() || afterContent.querySelector('*')) {
      newP.appendChild(afterContent);
    } else {
      newP.innerHTML = '<br>';
    }

    // Ensure current paragraph isn't empty
    if (!currentP.textContent.trim() && !currentP.querySelector('*')) {
      currentP.innerHTML = '<br>';
    }

    // Insert new paragraph after current
    currentP.parentNode.insertBefore(newP, currentP.nextSibling);

    // Move cursor to new paragraph
    this.moveCursorToElement(newP, 0);
  },

  // Insert pasted text as paragraphs
  insertTextAsParagraphs(text) {
    // Filter out empty lines to avoid extra blank paragraphs
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    const selection = window.getSelection();

    if (!selection.rangeCount) return;
    if (lines.length === 0) return;

    const range = selection.getRangeAt(0);
    range.deleteContents();

    // Find current paragraph
    let currentP = range.startContainer;
    while (currentP && currentP.nodeName !== 'P' && currentP !== this.element) {
      currentP = currentP.parentNode;
    }

    if (lines.length === 1) {
      // Single line - just insert text
      const textNode = document.createTextNode(lines[0]);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      // Multiple lines - create paragraphs
      const fragment = document.createDocumentFragment();

      lines.forEach((line, index) => {
        if (index === 0 && currentP && currentP !== this.element) {
          // First line goes into current paragraph
          const textNode = document.createTextNode(line);
          range.insertNode(textNode);
        } else {
          const p = document.createElement('p');
          p.textContent = line;
          fragment.appendChild(p);
        }
      });

      if (currentP && currentP !== this.element) {
        // Insert after current paragraph
        if (currentP.nextSibling) {
          this.element.insertBefore(fragment, currentP.nextSibling);
        } else {
          this.element.appendChild(fragment);
        }
      } else {
        this.element.appendChild(fragment);
      }

      // Move cursor to end
      this.moveCursorToEnd();
    }

    this.ensureParagraphs();
  },

  // Move cursor to an element
  moveCursorToElement(element, offset = 0) {
    const range = document.createRange();
    const selection = window.getSelection();

    if (element.firstChild) {
      range.setStart(element.firstChild, offset);
    } else {
      range.setStart(element, 0);
    }
    range.collapse(true);

    selection.removeAllRanges();
    selection.addRange(range);
  },

  // Move cursor to end of editor
  moveCursorToEnd() {
    const range = document.createRange();
    const selection = window.getSelection();

    range.selectNodeContents(this.element);
    range.collapse(false);

    selection.removeAllRanges();
    selection.addRange(range);
  },

  // Scroll so the cursor is approximately centered in the viewport (typewriter mode)
  scrollCursorToCenter() {
    // Use requestAnimationFrame to ensure DOM has updated
    requestAnimationFrame(() => {
      const selection = window.getSelection();
      if (!selection.rangeCount) return;

      const range = selection.getRangeAt(0);

      // Find the current paragraph element for more reliable positioning
      let currentNode = range.startContainer;
      while (currentNode && currentNode.nodeName !== 'P' && currentNode !== this.element) {
        currentNode = currentNode.parentNode;
      }

      // Use the paragraph's position, or fall back to range
      const rect = (currentNode && currentNode.nodeName === 'P')
        ? currentNode.getBoundingClientRect()
        : range.getBoundingClientRect();

      // Get the editor wrapper (scrollable container)
      const wrapper = document.getElementById('editor-wrapper');
      const wrapperRect = wrapper.getBoundingClientRect();

      // Calculate where the cursor is relative to the center of the viewport
      const cursorY = rect.top + (rect.height / 2);
      const viewportCenter = wrapperRect.top + (wrapperRect.height / 2);
      const offset = cursorY - viewportCenter;

      // Only scroll when cursor is below center (typing downward)
      // This keeps the typing position centered without affecting content at the top
      if (offset > 20) {
        wrapper.scrollTo({
          top: wrapper.scrollTop + offset,
          behavior: 'auto'
        });
      }
    });
  },

  // Load chapter content
  async loadChapter(chapter) {
    if (this.currentChapter && this.saveTimeout) {
      await this.saveNow();
    }

    this.currentChapter = chapter;

    if (chapter) {
      const content = await Storage.readChapter(chapter);
      this.setContent(content);
      this.enable();
      this.detectTodos();
      this.detectHeadings();
      this.updateWordCount();
    } else {
      this.element.innerHTML = '';
      this.disable();
    }
  },

  // Get content as plain text (one paragraph per line)
  getContent() {
    const paragraphs = this.element.querySelectorAll('p');
    if (paragraphs.length === 0) {
      return this.element.textContent.trim();
    }

    return Array.from(paragraphs)
      .map(p => p.textContent.replace(/\u200B/g, '').trim())
      .join('\n');
  },

  // Set content from plain text (one paragraph per line)
  setContent(text) {
    this.element.innerHTML = '';

    if (!text || !text.trim()) {
      return;
    }

    const lines = text.split(/\r?\n/);
    lines.forEach(line => {
      const p = document.createElement('p');
      p.textContent = line || '\u200B';
      this.element.appendChild(p);
    });
  },

  // Enable editing
  enable() {
    this.element.contentEditable = 'true';
  },

  // Disable editing
  disable() {
    this.element.contentEditable = 'false';
  },

  // Schedule save (debounced)
  scheduleSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    document.getElementById('save-status').textContent = '';

    this.saveTimeout = setTimeout(() => {
      this.saveNow();
    }, 500);
  },

  // Save immediately
  async saveNow() {
    if (!this.currentChapter) return;

    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }

    await Storage.saveChapter(this.currentChapter, this.getContent());
    document.getElementById('save-status').textContent = 'Saved';

    setTimeout(() => {
      const status = document.getElementById('save-status');
      if (status.textContent === 'Saved') {
        status.textContent = '';
      }
    }, 2000);
  },

  // Detect TODOs in content
  detectTodos() {
    const content = this.getContent();
    const todos = [];

    const lines = content.split('\n');
    lines.forEach((line, lineIndex) => {
      const todoRegex = /<([^>]+)>/g;
      let match;
      while ((match = todoRegex.exec(line)) !== null) {
        todos.push({
          text: match[1].substring(0, 30) + (match[1].length > 30 ? '...' : ''),
          line: lineIndex + 1,
          column: match.index
        });
      }
    });

    if (this.onTodosChange) {
      this.onTodosChange(todos);
    }

    return todos;
  },

  // Detect headings (## syntax) in content
  detectHeadings() {
    const paragraphs = this.element.querySelectorAll('p');
    const headings = [];

    paragraphs.forEach((p, index) => {
      const text = p.textContent.trim();
      if (text.startsWith('## ')) {
        // Add heading class for styling
        p.classList.add('heading');
        const headingText = text.substring(3).trim();
        headings.push({
          text: headingText.substring(0, 40) + (headingText.length > 40 ? '...' : ''),
          line: index + 1
        });
      } else {
        // Remove heading class if no longer a heading
        p.classList.remove('heading');
      }
    });

    if (this.onHeadingsChange) {
      this.onHeadingsChange(headings);
    }

    return headings;
  },

  // Update word count (shows selection count if text is selected)
  updateWordCount() {
    const content = this.getContent().trim();
    const totalWords = content ? content.split(/\s+/).filter(w => w.length > 0).length : 0;

    // Check if there's selected text within the editor
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText.length > 0 && this.element.contains(selection.anchorNode)) {
      // Count words in selection
      const selectedWords = selectedText.split(/\s+/).filter(w => w.length > 0).length;
      document.getElementById('word-count').textContent =
        `${selectedWords.toLocaleString()} of ${totalWords.toLocaleString()} words`;
    } else {
      // Show total document count
      document.getElementById('word-count').textContent =
        `${totalWords.toLocaleString()} word${totalWords !== 1 ? 's' : ''}`;
    }
  },

  // Jump to line (paragraph)
  jumpToLine(lineNumber) {
    const paragraphs = this.element.querySelectorAll('p');
    const index = lineNumber - 1;

    if (index >= 0 && index < paragraphs.length) {
      const p = paragraphs[index];
      p.scrollIntoView({ behavior: 'smooth', block: 'center' });
      this.moveCursorToElement(p);
      this.element.focus();
    }
  },

  // Check if user has been inactive
  isInactive(thresholdMs = 60000) {
    if (!this.lastActivityTime) return false;
    return Date.now() - this.lastActivityTime > thresholdMs;
  },

  // Apply settings
  applySettings(settings) {
    if (settings.fontFamily) {
      this.element.style.fontFamily = settings.fontFamily;
    }
    if (settings.fontSize) {
      this.element.style.fontSize = `${settings.fontSize}px`;
    }
    if (settings.columnWidth) {
      this.element.style.width = `${settings.columnWidth}px`;
    }
  },

  // Focus the editor
  focus() {
    this.element.focus();
    if (this.element.childNodes.length > 0) {
      this.moveCursorToEnd();
    }
  }
};
