const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  toggleFullscreen: () => ipcRenderer.send('toggle-fullscreen'),
  isFullscreen: () => ipcRenderer.invoke('is-fullscreen'),

  // Dialogs
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),

  // File system
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
  writeBinaryFile: (filePath, base64Data) => ipcRenderer.invoke('write-binary-file', filePath, base64Data),
  deleteFile: (filePath) => ipcRenderer.invoke('delete-file', filePath),
  renameFile: (oldPath, newPath) => ipcRenderer.invoke('rename-file', oldPath, newPath),
  exists: (filePath) => ipcRenderer.invoke('exists', filePath),
  mkdir: (dirPath) => ipcRenderer.invoke('mkdir', dirPath),
  readdir: (dirPath) => ipcRenderer.invoke('readdir', dirPath),

  // App settings
  getAppSettings: () => ipcRenderer.invoke('get-app-settings'),
  setAppSettings: (settings) => ipcRenderer.invoke('set-app-settings', settings),
  addRecentProject: (path, name) => ipcRenderer.invoke('add-recent-project', path, name),
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),

  // Export
  exportDocx: (projectName, chapters) => ipcRenderer.invoke('export-docx', projectName, chapters),

  // Events
  onOpenProject: (callback) => {
    ipcRenderer.on('open-project', (event, projectPath) => callback(projectPath));
  }
});
