// Sidebar module - handles chapters list and TODOs list

const Sidebar = {
  element: null,
  chaptersList: null,
  headingsList: null,
  todosList: null,
  isVisible: true,
  currentChapterId: null,
  onChapterSelect: null,
  onChapterCreate: null,
  onChapterRename: null,
  onChapterDelete: null,
  onChapterReorder: null,
  contextMenuTarget: null,
  draggedItem: null,

  init() {
    this.element = document.getElementById('sidebar');
    this.chaptersList = document.getElementById('chapters-list');
    this.headingsList = document.getElementById('headings-list');
    this.todosList = document.getElementById('todos-list');
    this.setupEventListeners();
  },

  setupEventListeners() {
    // New chapter button
    document.getElementById('new-chapter-btn').addEventListener('click', () => {
      this.promptNewChapter();
    });

    // Context menu
    document.getElementById('ctx-rename').addEventListener('click', () => {
      const chapter = this.contextMenuTarget;
      this.hideContextMenu();
      if (chapter) {
        this.startRename(chapter);
      }
    });

    document.getElementById('ctx-delete').addEventListener('click', () => {
      const chapter = this.contextMenuTarget;
      this.hideContextMenu();
      if (chapter && this.onChapterDelete) {
        this.onChapterDelete(chapter);
      }
    });

    // Hide context menu on click outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#context-menu')) {
        this.hideContextMenu();
      }
    });

    // Keyboard shortcut for new chapter
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        this.promptNewChapter();
      }
    });
  },

  // Toggle sidebar visibility
  toggle() {
    this.isVisible = !this.isVisible;
    this.element.classList.toggle('hidden', !this.isVisible);
  },

  // Show sidebar
  show() {
    this.isVisible = true;
    this.element.classList.remove('hidden');
  },

  // Hide sidebar
  hide() {
    this.isVisible = false;
    this.element.classList.add('hidden');
  },

  // Render chapters list
  renderChapters(chapters, chapterTodos = {}) {
    this.chaptersList.innerHTML = '';

    chapters.forEach((chapter) => {
      const li = document.createElement('li');
      li.dataset.id = chapter.id;
      li.draggable = true;

      // Chapter title
      const titleSpan = document.createElement('span');
      titleSpan.className = 'chapter-title';
      titleSpan.textContent = chapter.title;
      li.appendChild(titleSpan);

      // TODO indicator
      if (chapterTodos[chapter.id] && chapterTodos[chapter.id].length > 0) {
        const indicator = document.createElement('span');
        indicator.className = 'has-todo';
        indicator.title = `${chapterTodos[chapter.id].length} TODO(s)`;
        li.appendChild(indicator);
      }

      // Active state
      if (chapter.id === this.currentChapterId) {
        li.classList.add('active');
      }

      // Click to select
      li.addEventListener('click', (e) => {
        if (!e.target.isContentEditable) {
          this.selectChapter(chapter.id);
        }
      });

      // Double-click to rename
      titleSpan.addEventListener('dblclick', () => {
        this.startRename(chapter);
      });

      // Right-click for context menu
      li.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.showContextMenu(e, chapter);
      });

      // Drag and drop
      li.addEventListener('dragstart', (e) => {
        this.draggedItem = chapter;
        li.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });

      li.addEventListener('dragend', () => {
        li.classList.remove('dragging');
        this.draggedItem = null;
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      });

      li.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (this.draggedItem && this.draggedItem.id !== chapter.id) {
          li.classList.add('drag-over');
        }
      });

      li.addEventListener('dragleave', () => {
        li.classList.remove('drag-over');
      });

      li.addEventListener('drop', (e) => {
        e.preventDefault();
        li.classList.remove('drag-over');
        if (this.draggedItem && this.draggedItem.id !== chapter.id) {
          this.handleDrop(this.draggedItem, chapter);
        }
      });

      this.chaptersList.appendChild(li);
    });
  },

  // Select a chapter
  selectChapter(chapterId) {
    this.currentChapterId = chapterId;

    // Update active state
    this.chaptersList.querySelectorAll('li').forEach(li => {
      li.classList.toggle('active', li.dataset.id === chapterId);
    });

    if (this.onChapterSelect) {
      this.onChapterSelect(chapterId);
    }
  },

  // Prompt for new chapter using custom modal
  async promptNewChapter() {
    // Check if a project is open
    if (!Storage.currentProject) {
      await window.electronAPI.showMessageBox({
        type: 'info',
        title: 'No Project Open',
        message: 'Please create or open a project first.'
      });
      return;
    }

    const title = await this.showPromptModal('New Chapter', 'Enter chapter title...');
    if (title && title.trim() && this.onChapterCreate) {
      await this.onChapterCreate(title.trim());
    }
  },

  // Custom prompt modal
  showPromptModal(title, placeholder) {
    return new Promise((resolve) => {
      const modal = document.getElementById('prompt-modal');
      const input = document.getElementById('prompt-input');
      const titleEl = document.getElementById('prompt-title');
      const okBtn = document.getElementById('prompt-ok');
      const cancelBtn = document.getElementById('prompt-cancel');
      const closeBtn = document.getElementById('close-prompt');

      titleEl.textContent = title;
      input.placeholder = placeholder;
      input.value = '';
      modal.classList.remove('hidden');
      input.focus();

      const cleanup = () => {
        modal.classList.add('hidden');
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
        closeBtn.removeEventListener('click', onCancel);
        input.removeEventListener('keydown', onKeydown);
        modal.removeEventListener('click', onOverlayClick);
      };

      const onOk = () => {
        cleanup();
        resolve(input.value);
      };

      const onCancel = () => {
        cleanup();
        resolve(null);
      };

      const onKeydown = (e) => {
        if (e.key === 'Enter') {
          onOk();
        } else if (e.key === 'Escape') {
          onCancel();
        }
      };

      const onOverlayClick = (e) => {
        if (e.target === modal) {
          onCancel();
        }
      };

      okBtn.addEventListener('click', onOk);
      cancelBtn.addEventListener('click', onCancel);
      closeBtn.addEventListener('click', onCancel);
      input.addEventListener('keydown', onKeydown);
      modal.addEventListener('click', onOverlayClick);
    });
  },

  // Start renaming a chapter
  startRename(chapter) {
    const li = this.chaptersList.querySelector(`li[data-id="${chapter.id}"]`);
    if (!li) return;

    const titleSpan = li.querySelector('.chapter-title');
    titleSpan.contentEditable = true;
    titleSpan.focus();

    // Select all text
    const range = document.createRange();
    range.selectNodeContents(titleSpan);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    const finishRename = async () => {
      titleSpan.contentEditable = false;
      const newTitle = titleSpan.textContent.trim();
      if (newTitle && newTitle !== chapter.title && this.onChapterRename) {
        await this.onChapterRename(chapter, newTitle);
      } else {
        titleSpan.textContent = chapter.title;
      }
    };

    titleSpan.addEventListener('blur', finishRename, { once: true });
    titleSpan.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        titleSpan.blur();
      } else if (e.key === 'Escape') {
        titleSpan.textContent = chapter.title;
        titleSpan.blur();
      }
    });
  },

  // Show context menu
  showContextMenu(event, chapter) {
    this.contextMenuTarget = chapter;
    const menu = document.getElementById('context-menu');
    menu.classList.remove('hidden');
    menu.style.left = `${event.clientX}px`;
    menu.style.top = `${event.clientY}px`;
  },

  // Hide context menu
  hideContextMenu() {
    document.getElementById('context-menu').classList.add('hidden');
    this.contextMenuTarget = null;
  },

  // Handle drag and drop reorder
  handleDrop(draggedChapter, targetChapter) {
    if (this.onChapterReorder) {
      this.onChapterReorder(draggedChapter, targetChapter);
    }
  },

  // Render headings list
  renderHeadings(headings) {
    this.headingsList.innerHTML = '';
    const section = document.getElementById('headings-section');

    if (headings.length === 0) {
      section.classList.add('hidden');
      return;
    }

    section.classList.remove('hidden');

    headings.forEach(heading => {
      const li = document.createElement('li');

      const textSpan = document.createElement('span');
      textSpan.className = 'heading-text';
      textSpan.textContent = heading.text;
      li.appendChild(textSpan);

      li.addEventListener('click', () => {
        Editor.jumpToLine(heading.line);
      });

      this.headingsList.appendChild(li);
    });
  },

  // Render TODOs list
  renderTodos(todos) {
    this.todosList.innerHTML = '';

    if (todos.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'No TODOs found';
      li.style.fontStyle = 'italic';
      li.style.cursor = 'default';
      this.todosList.appendChild(li);
      return;
    }

    todos.forEach(todo => {
      const li = document.createElement('li');

      const textSpan = document.createElement('span');
      textSpan.className = 'todo-text';
      textSpan.textContent = todo.text;
      li.appendChild(textSpan);

      const locationSpan = document.createElement('span');
      locationSpan.className = 'todo-location';
      locationSpan.textContent = `Line ${todo.line}`;
      li.appendChild(locationSpan);

      li.addEventListener('click', () => {
        Editor.jumpToLine(todo.line);
      });

      this.todosList.appendChild(li);
    });
  },

  // Set project name
  setProjectName(name) {
    document.getElementById('project-name').textContent = name;
  }
};
