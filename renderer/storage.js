// Storage module - handles all file operations for projects and chapters

const Storage = {
  currentProject: null,
  projectPath: null,

  // Create a new project
  async createProject(projectPath, projectName) {
    const project = {
      name: projectName,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      chapters: [],
      settings: {
        fontFamily: 'Literata',
        fontSize: 18,
        columnWidth: 700,
        paragraphSpacing: 1.5,
        darkMode: true
      }
    };

    // Create project folder
    await window.electronAPI.mkdir(projectPath);
    await window.electronAPI.mkdir(`${projectPath}/chapters`);

    // Write project.json
    const projectFile = `${projectPath}/project.json`;
    await window.electronAPI.writeFile(projectFile, JSON.stringify(project, null, 2));

    // Add to recent projects
    await window.electronAPI.addRecentProject(projectPath, projectName);

    this.currentProject = project;
    this.projectPath = projectPath;

    return project;
  },

  // Open an existing project
  async openProject(projectPath) {
    const projectFile = `${projectPath}/project.json`;
    const result = await window.electronAPI.readFile(projectFile);

    if (!result.success) {
      throw new Error(`Failed to open project: ${result.error}`);
    }

    this.currentProject = JSON.parse(result.content);
    this.projectPath = projectPath;

    // Add to recent projects
    await window.electronAPI.addRecentProject(projectPath, this.currentProject.name);

    return this.currentProject;
  },

  // Save project metadata
  async saveProject() {
    if (!this.currentProject || !this.projectPath) return;

    this.currentProject.modified = new Date().toISOString();
    const projectFile = `${this.projectPath}/project.json`;
    await window.electronAPI.writeFile(projectFile, JSON.stringify(this.currentProject, null, 2));
  },

  // Create a new chapter
  async createChapter(title) {
    if (!this.currentProject || !this.projectPath) return null;

    // Generate chapter ID
    const existingIds = this.currentProject.chapters.map(c => parseInt(c.id));
    const nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
    const id = String(nextId).padStart(3, '0');

    // Create chapter entry
    const chapter = {
      id,
      title,
      order: this.currentProject.chapters.length + 1
    };

    // Create chapter file
    const filename = this.getChapterFilename(chapter);
    const filePath = `${this.projectPath}/chapters/${filename}`;
    await window.electronAPI.writeFile(filePath, `# ${title}\n\n`);

    // Add to project
    this.currentProject.chapters.push(chapter);
    await this.saveProject();

    return chapter;
  },

  // Get chapter filename
  getChapterFilename(chapter) {
    const safeTitle = chapter.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return `${chapter.id}-${safeTitle}.md`;
  },

  // Get chapter file path
  getChapterPath(chapter) {
    return `${this.projectPath}/chapters/${this.getChapterFilename(chapter)}`;
  },

  // Read chapter content
  async readChapter(chapter) {
    const filePath = this.getChapterPath(chapter);
    const result = await window.electronAPI.readFile(filePath);

    if (!result.success) {
      // Try to find the file by ID prefix
      const chaptersDir = `${this.projectPath}/chapters`;
      const files = await window.electronAPI.readdir(chaptersDir);
      if (files.success) {
        const matchingFile = files.files.find(f => f.startsWith(chapter.id));
        if (matchingFile) {
          const altPath = `${chaptersDir}/${matchingFile}`;
          const altResult = await window.electronAPI.readFile(altPath);
          if (altResult.success) return altResult.content;
        }
      }
      return '';
    }

    return result.content;
  },

  // Save chapter content
  async saveChapter(chapter, content) {
    const filePath = this.getChapterPath(chapter);
    await window.electronAPI.writeFile(filePath, content);
    await this.saveProject();
  },

  // Rename chapter
  async renameChapter(chapter, newTitle) {
    const oldPath = this.getChapterPath(chapter);

    // Update chapter object
    chapter.title = newTitle;

    // Get new path
    const newPath = this.getChapterPath(chapter);

    // Rename file if paths differ
    if (oldPath !== newPath) {
      // Read content first
      const result = await window.electronAPI.readFile(oldPath);
      if (result.success) {
        // Write to new path
        await window.electronAPI.writeFile(newPath, result.content);
        // Delete old file
        await window.electronAPI.deleteFile(oldPath);
      }
    }

    await this.saveProject();
  },

  // Delete chapter
  async deleteChapter(chapter) {
    const filePath = this.getChapterPath(chapter);

    // Remove from project
    const index = this.currentProject.chapters.findIndex(c => c.id === chapter.id);
    if (index !== -1) {
      this.currentProject.chapters.splice(index, 1);
    }

    // Delete file
    await window.electronAPI.deleteFile(filePath);

    // Reorder remaining chapters
    this.currentProject.chapters.forEach((c, i) => {
      c.order = i + 1;
    });

    await this.saveProject();
  },

  // Reorder chapters
  async reorderChapters(chapters) {
    this.currentProject.chapters = chapters;
    chapters.forEach((c, i) => {
      c.order = i + 1;
    });
    await this.saveProject();
  },

  // Update project settings
  async updateSettings(settings) {
    if (!this.currentProject) return;
    this.currentProject.settings = { ...this.currentProject.settings, ...settings };
    await this.saveProject();
  },

  // Get recent projects
  async getRecentProjects() {
    const settings = await window.electronAPI.getAppSettings();
    return settings.recentProjects || [];
  }
};
