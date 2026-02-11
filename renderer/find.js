// Find and Replace module

const Find = {
  bar: null,
  findInput: null,
  replaceInput: null,
  replaceRow: null,
  matchCount: null,
  caseBtn: null,
  matches: [],
  currentIndex: -1,
  caseSensitive: false,
  isOpen: false,
  searchDebounce: null,
  editorInputDebounce: null,

  init() {
    this.bar = document.getElementById('find-bar');
    this.findInput = document.getElementById('find-input');
    this.replaceInput = document.getElementById('find-replace-input');
    this.replaceRow = document.getElementById('find-replace-row');
    this.matchCount = document.getElementById('find-match-count');
    this.caseBtn = document.getElementById('find-case-btn');

    this.setupEventListeners();
  },

  setupEventListeners() {
    // Find input - live search with debounce
    this.findInput.addEventListener('input', () => {
      clearTimeout(this.searchDebounce);
      this.searchDebounce = setTimeout(() => this.performSearch(), 50);
    });

    // Enter/Shift+Enter in find input for navigation
    this.findInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) {
          this.navigatePrev();
        } else {
          this.navigateNext();
        }
      }
    });

    // Enter in replace input - replace current
    this.replaceInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.replaceCurrent();
      }
    });

    // Buttons
    document.getElementById('find-next-btn').addEventListener('click', () => this.navigateNext());
    document.getElementById('find-prev-btn').addEventListener('click', () => this.navigatePrev());
    document.getElementById('find-close-btn').addEventListener('click', () => this.close());
    document.getElementById('find-replace-btn').addEventListener('click', () => this.replaceCurrent());
    document.getElementById('find-replace-all-btn').addEventListener('click', () => this.replaceAll());

    // Case toggle
    this.caseBtn.addEventListener('click', () => {
      this.caseSensitive = !this.caseSensitive;
      this.caseBtn.classList.toggle('active', this.caseSensitive);
      this.performSearch();
    });

    // Toggle replace row
    document.getElementById('find-toggle-replace').addEventListener('click', () => {
      const isVisible = !this.replaceRow.classList.contains('hidden');
      this.replaceRow.classList.toggle('hidden', isVisible);
    });
  },

  open(showReplace) {
    this.isOpen = true;
    this.bar.classList.remove('hidden');
    this.replaceRow.classList.toggle('hidden', !showReplace);

    // Pre-fill with selection if short and single-line
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    if (selectedText && selectedText.length < 100 && !selectedText.includes('\n')) {
      this.findInput.value = selectedText;
    }

    this.findInput.focus();
    this.findInput.select();

    if (this.findInput.value) {
      this.performSearch();
    }
  },

  close() {
    this.isOpen = false;
    this.bar.classList.add('hidden');
    this.clearHighlights();
    this.matches = [];
    this.currentIndex = -1;
    this.matchCount.textContent = '';
    Editor.element.focus();
  },

  clearHighlights() {
    const marks = Editor.element.querySelectorAll('mark.find-highlight');
    marks.forEach(mark => {
      const parent = mark.parentNode;
      const text = document.createTextNode(mark.textContent);
      parent.replaceChild(text, mark);
      parent.normalize();
    });
  },

  performSearch() {
    this.clearHighlights();
    this.matches = [];
    this.currentIndex = -1;

    const query = this.findInput.value;
    if (!query) {
      this.matchCount.textContent = '';
      return;
    }

    const flags = this.caseSensitive ? 'g' : 'gi';
    let regex;
    try {
      regex = new RegExp(this.escapeRegex(query), flags);
    } catch (e) {
      this.matchCount.textContent = 'Invalid';
      return;
    }

    // Walk text nodes inside paragraphs
    const paragraphs = Editor.element.querySelectorAll('p');
    paragraphs.forEach(p => {
      const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT, null);
      const textNodes = [];
      let node;
      while ((node = walker.nextNode())) {
        textNodes.push(node);
      }

      // Process each text node
      textNodes.forEach(textNode => {
        const text = textNode.textContent;
        const nodeMatches = [];
        let match;

        regex.lastIndex = 0;
        while ((match = regex.exec(text)) !== null) {
          nodeMatches.push({ index: match.index, length: match[0].length });
        }

        if (nodeMatches.length === 0) return;

        // Build a fragment with marks
        const frag = document.createDocumentFragment();
        let lastEnd = 0;

        nodeMatches.forEach(m => {
          // Text before match
          if (m.index > lastEnd) {
            frag.appendChild(document.createTextNode(text.substring(lastEnd, m.index)));
          }
          // The match
          const mark = document.createElement('mark');
          mark.className = 'find-highlight';
          mark.textContent = text.substring(m.index, m.index + m.length);
          frag.appendChild(mark);
          this.matches.push(mark);
          lastEnd = m.index + m.length;
        });

        // Text after last match
        if (lastEnd < text.length) {
          frag.appendChild(document.createTextNode(text.substring(lastEnd)));
        }

        textNode.parentNode.replaceChild(frag, textNode);
      });
    });

    // Update count and go to first match
    if (this.matches.length > 0) {
      this.currentIndex = 0;
      this.goToMatch(0);
    } else {
      this.matchCount.textContent = 'No results';
    }
  },

  goToMatch(index) {
    // Remove current class from previous
    const prev = Editor.element.querySelector('mark.find-current');
    if (prev) prev.classList.remove('find-current');

    if (index < 0 || index >= this.matches.length) return;

    const mark = this.matches[index];
    mark.classList.add('find-current');
    mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
    this.matchCount.textContent = `${index + 1} of ${this.matches.length}`;
  },

  navigateNext() {
    if (this.matches.length === 0) return;
    this.currentIndex = (this.currentIndex + 1) % this.matches.length;
    this.goToMatch(this.currentIndex);
  },

  navigatePrev() {
    if (this.matches.length === 0) return;
    this.currentIndex = (this.currentIndex - 1 + this.matches.length) % this.matches.length;
    this.goToMatch(this.currentIndex);
  },

  replaceCurrent() {
    if (this.currentIndex < 0 || this.currentIndex >= this.matches.length) return;

    const mark = this.matches[this.currentIndex];
    const replacementText = this.replaceInput.value;
    const textNode = document.createTextNode(replacementText);
    mark.parentNode.replaceChild(textNode, mark);
    textNode.parentNode.normalize();

    // Remove from matches array
    this.matches.splice(this.currentIndex, 1);

    // Trigger save and updates
    Editor.scheduleSave();
    Editor.detectTodos();
    Editor.detectHeadings();
    Editor.updateWordCount();

    // Navigate to next (or wrap)
    if (this.matches.length === 0) {
      this.currentIndex = -1;
      this.matchCount.textContent = 'No results';
    } else {
      if (this.currentIndex >= this.matches.length) {
        this.currentIndex = 0;
      }
      this.goToMatch(this.currentIndex);
    }
  },

  replaceAll() {
    if (this.matches.length === 0) return;

    const replacementText = this.replaceInput.value;

    // Replace all matches (iterate in reverse to keep indices valid)
    for (let i = this.matches.length - 1; i >= 0; i--) {
      const mark = this.matches[i];
      const textNode = document.createTextNode(replacementText);
      mark.parentNode.replaceChild(textNode, mark);
      textNode.parentNode.normalize();
    }

    this.matches = [];
    this.currentIndex = -1;
    this.matchCount.textContent = 'No results';

    // Trigger save and updates
    Editor.scheduleSave();
    Editor.detectTodos();
    Editor.detectHeadings();
    Editor.updateWordCount();
  },

  // Called from editor input handler
  onEditorInput() {
    if (!this.isOpen || !this.findInput.value) return;

    this.clearHighlights();

    clearTimeout(this.editorInputDebounce);
    this.editorInputDebounce = setTimeout(() => {
      if (this.isOpen && this.findInput.value) {
        this.performSearch();
      }
    }, 300);
  },

  // Called when a new chapter is loaded
  onChapterLoad() {
    if (!this.isOpen) return;
    this.clearHighlights();
    this.matches = [];
    this.currentIndex = -1;

    if (this.findInput.value) {
      this.performSearch();
    }
  },

  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
};
