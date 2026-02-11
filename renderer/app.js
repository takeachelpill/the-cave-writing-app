// Main application controller

const App = {
  chapters: [],
  currentChapter: null,

  async init() {
    // Initialize modules
    Editor.init();
    Find.init();
    Sidebar.init();
    Stats.init();
    Settings.init();

    // Setup window controls
    this.setupWindowControls();

    // Setup keyboard shortcuts
    this.setupKeyboardShortcuts();

    // Setup callbacks
    this.setupCallbacks();

    // Load recent projects for welcome screen
    await this.loadRecentProjects();

    // Setup welcome screen buttons
    this.setupWelcomeScreen();

    // Listen for project open from main process
    window.electronAPI.onOpenProject(async (projectPath) => {
      await this.openProject(projectPath);
    });
  },

  setupWindowControls() {
    document.getElementById('min-btn').addEventListener('click', () => {
      window.electronAPI.minimize();
    });

    document.getElementById('max-btn').addEventListener('click', () => {
      window.electronAPI.maximize();
    });

    document.getElementById('close-btn').addEventListener('click', () => {
      window.electronAPI.close();
    });

    document.getElementById('menu-btn').addEventListener('click', () => {
      Sidebar.toggle();
    });

    // Help button
    document.getElementById('help-btn').addEventListener('click', () => {
      this.showHelp();
    });

    document.getElementById('close-help').addEventListener('click', () => {
      this.hideHelp();
    });

    document.getElementById('help-modal').addEventListener('click', (e) => {
      if (e.target.id === 'help-modal') {
        this.hideHelp();
      }
    });
  },

  showHelp() {
    document.getElementById('help-modal').classList.remove('hidden');
  },

  hideHelp() {
    document.getElementById('help-modal').classList.add('hidden');
  },

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', async (e) => {
      // F11 - Toggle fullscreen
      if (e.key === 'F11') {
        e.preventDefault();
        window.electronAPI.toggleFullscreen();
      }

      // Ctrl+P - Toggle sidebar
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        Sidebar.toggle();
      }

      // Ctrl+O - Open project
      if (e.ctrlKey && e.key === 'o') {
        e.preventDefault();
        await this.promptOpenProject();
      }

      // Ctrl+F - Find
      if (e.ctrlKey && !e.shiftKey && e.key === 'f') {
        e.preventDefault();
        Find.open(false);
      }

      // Ctrl+H - Find and Replace
      if (e.ctrlKey && e.key === 'h') {
        e.preventDefault();
        Find.open(true);
      }

      // Ctrl+Shift+E - Export as DOCX
      if (e.ctrlKey && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        await Export.exportAsDocx();
      }

      // Escape - Close find bar, modals, or exit fullscreen
      if (e.key === 'Escape') {
        // Close find bar if open
        if (Find.isOpen) {
          Find.close();
          return;
        }
        // Close help modal if open
        if (!document.getElementById('help-modal').classList.contains('hidden')) {
          this.hideHelp();
          return;
        }
        // Close settings modal if open
        if (!document.getElementById('settings-modal').classList.contains('hidden')) {
          Settings.close();
          return;
        }
        // Exit fullscreen
        const isFullscreen = await window.electronAPI.isFullscreen();
        if (isFullscreen) {
          window.electronAPI.toggleFullscreen();
        }
      }

      // ? - Show help (only when not typing in editor)
      if (e.key === '?' && document.activeElement !== Editor.element) {
        e.preventDefault();
        this.showHelp();
      }
    });
  },

  setupCallbacks() {
    // Sidebar callbacks
    Sidebar.onChapterSelect = async (chapterId) => {
      const chapter = this.chapters.find(c => c.id === chapterId);
      if (chapter) {
        this.currentChapter = chapter;
        await Editor.loadChapter(chapter);
      }
    };

    Sidebar.onChapterCreate = async (title) => {
      const chapter = await Storage.createChapter(title);
      if (chapter) {
        this.chapters = Storage.currentProject.chapters;
        Sidebar.renderChapters(this.chapters);
        Sidebar.selectChapter(chapter.id);
      }
    };

    Sidebar.onChapterRename = async (chapter, newTitle) => {
      await Storage.renameChapter(chapter, newTitle);
      this.chapters = Storage.currentProject.chapters;
      Sidebar.renderChapters(this.chapters);
    };

    Sidebar.onChapterDelete = async (chapter) => {
      const result = await window.electronAPI.showMessageBox({
        type: 'warning',
        buttons: ['Cancel', 'Delete'],
        defaultId: 0,
        title: 'Delete Chapter',
        message: `Are you sure you want to delete "${chapter.title}"?`,
        detail: 'This action cannot be undone.'
      });

      if (result.response === 1) {
        await Storage.deleteChapter(chapter);
        this.chapters = Storage.currentProject.chapters;
        Sidebar.renderChapters(this.chapters);

        // Select another chapter or clear editor
        if (this.currentChapter && this.currentChapter.id === chapter.id) {
          if (this.chapters.length > 0) {
            Sidebar.selectChapter(this.chapters[0].id);
          } else {
            this.currentChapter = null;
            await Editor.loadChapter(null);
          }
        }
      }
    };

    Sidebar.onChapterReorder = async (draggedChapter, targetChapter) => {
      const draggedIndex = this.chapters.findIndex(c => c.id === draggedChapter.id);
      const targetIndex = this.chapters.findIndex(c => c.id === targetChapter.id);

      if (draggedIndex !== -1 && targetIndex !== -1) {
        // Remove dragged item
        this.chapters.splice(draggedIndex, 1);
        // Insert at target position
        this.chapters.splice(targetIndex, 0, draggedChapter);

        await Storage.reorderChapters(this.chapters);
        Sidebar.renderChapters(this.chapters);
      }
    };

    // Editor callbacks
    Editor.onTodosChange = (todos) => {
      Sidebar.renderTodos(todos);
    };

    Editor.onHeadingsChange = (headings) => {
      Sidebar.renderHeadings(headings);
    };

    // Settings callbacks
    Settings.onSettingsChange = async (settings) => {
      if (Storage.currentProject) {
        await Storage.updateSettings(settings);
      }
    };

    Settings.onCloseProject = async () => {
      await this.closeProject();
    };
  },

  async closeProject() {
    // Save current chapter if any
    if (Editor.currentChapter) {
      await Editor.saveNow();
    }

    // Reset state
    Storage.currentProject = null;
    Storage.projectPath = null;
    this.chapters = [];
    this.currentChapter = null;

    // Reload recent projects and show welcome screen
    await this.loadRecentProjects();
    this.showWelcome();
  },

  setupWelcomeScreen() {
    document.getElementById('new-project-btn').addEventListener('click', async () => {
      await this.promptNewProject();
    });

    document.getElementById('open-project-btn').addEventListener('click', async () => {
      await this.promptOpenProject();
    });
  },

  async loadRecentProjects() {
    const recentProjects = await Storage.getRecentProjects();
    const recentList = document.getElementById('recent-list');
    recentList.innerHTML = '';

    if (recentProjects.length === 0) {
      const li = document.createElement('li');
      li.innerHTML = '<span class="project-name" style="color: var(--text-muted); font-style: italic;">No recent projects</span>';
      li.style.cursor = 'default';
      recentList.appendChild(li);
      return;
    }

    recentProjects.forEach(project => {
      const li = document.createElement('li');
      li.innerHTML = `
        <div class="project-name">${project.name}</div>
        <div class="project-path">${project.path}</div>
      `;
      li.addEventListener('click', async () => {
        await this.openProject(project.path);
      });
      recentList.appendChild(li);
    });
  },

  async promptNewProject() {
    const result = await window.electronAPI.showSaveDialog({
      title: 'Create New Project',
      buttonLabel: 'Create Project',
      properties: ['createDirectory']
    });

    if (!result.canceled && result.filePath) {
      const projectPath = result.filePath;
      const projectName = projectPath.split(/[\\/]/).pop();

      await Storage.createProject(projectPath, projectName);

      // Auto-create first chapter so user can start writing immediately
      await Storage.createChapter('Chapter 1');

      await this.loadProject();
    }
  },

  async promptOpenProject() {
    const result = await window.electronAPI.showOpenDialog({
      title: 'Open Project',
      buttonLabel: 'Open',
      properties: ['openDirectory']
    });

    if (!result.canceled && result.filePaths.length > 0) {
      await this.openProject(result.filePaths[0]);
    }
  },

  async openProject(projectPath) {
    try {
      await Storage.openProject(projectPath);
      await this.loadProject();
    } catch (err) {
      await window.electronAPI.showMessageBox({
        type: 'error',
        title: 'Error',
        message: 'Failed to open project',
        detail: err.message
      });
    }
  },

  async loadProject() {
    if (!Storage.currentProject) return;

    // Hide welcome screen
    document.getElementById('welcome-screen').classList.add('hidden');

    // Update UI
    Sidebar.setProjectName(Storage.currentProject.name);
    document.getElementById('title-text').textContent = Storage.currentProject.name;

    // Load settings
    if (Storage.currentProject.settings) {
      Settings.loadSettings(Storage.currentProject.settings);
    }

    // Load chapters
    this.chapters = Storage.currentProject.chapters;
    Sidebar.renderChapters(this.chapters);

    // Select first chapter if any
    if (this.chapters.length > 0) {
      Sidebar.selectChapter(this.chapters[0].id);
    } else {
      Editor.loadChapter(null);
      Sidebar.renderTodos([]);
    }

    // Enable editor
    Editor.focus();
  },

  showWelcome() {
    document.getElementById('welcome-screen').classList.remove('hidden');
    Sidebar.setProjectName('No Project');
    document.getElementById('title-text').textContent = 'Writing App';
    Sidebar.renderChapters([]);
    Sidebar.renderHeadings([]);
    Sidebar.renderTodos([]);
    Editor.loadChapter(null);
  }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
