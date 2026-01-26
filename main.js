const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, PageBreak, AlignmentType } = require('docx');

let mainWindow;
let appSettings = {
  recentProjects: [],
  windowBounds: { width: 1200, height: 800 },
  lastProject: null
};

const settingsPath = path.join(app.getPath('userData'), 'settings.json');

// Load app settings
function loadAppSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      appSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    }
  } catch (err) {
    console.error('Failed to load settings:', err);
  }
}

// Save app settings
function saveAppSettings() {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(appSettings, null, 2));
  } catch (err) {
    console.error('Failed to save settings:', err);
  }
}

function createWindow() {
  const bounds = appSettings.windowBounds || { width: 1200, height: 800 };

  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('renderer/index.html');

  // Save window bounds on close
  mainWindow.on('close', () => {
    appSettings.windowBounds = mainWindow.getBounds();
    saveAppSettings();
  });

  // Parse command line for --project argument
  const args = process.argv.slice(2);
  const projectArg = args.find(arg => arg.startsWith('--project='));
  if (projectArg) {
    const projectPath = projectArg.split('=')[1].replace(/"/g, '');
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow.webContents.send('open-project', projectPath);
    });
  } else if (appSettings.lastProject) {
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow.webContents.send('open-project', appSettings.lastProject);
    });
  }
}

app.whenReady().then(() => {
  loadAppSettings();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers

// Window controls
ipcMain.on('window-minimize', () => {
  mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.on('window-close', () => {
  mainWindow.close();
});

ipcMain.on('toggle-fullscreen', () => {
  mainWindow.setFullScreen(!mainWindow.isFullScreen());
});

ipcMain.handle('is-fullscreen', () => {
  return mainWindow.isFullScreen();
});

// Dialog handlers
ipcMain.handle('show-open-dialog', async (event, options) => {
  return dialog.showOpenDialog(mainWindow, options);
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  return dialog.showSaveDialog(mainWindow, options);
});

ipcMain.handle('show-message-box', async (event, options) => {
  return dialog.showMessageBox(mainWindow, options);
});

// File system handlers
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return { success: true, content };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('write-file', async (event, filePath, content) => {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('write-binary-file', async (event, filePath, base64Data) => {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filePath, buffer);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('delete-file', async (event, filePath) => {
  try {
    fs.unlinkSync(filePath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('rename-file', async (event, oldPath, newPath) => {
  try {
    fs.renameSync(oldPath, newPath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('exists', async (event, filePath) => {
  return fs.existsSync(filePath);
});

ipcMain.handle('mkdir', async (event, dirPath) => {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('readdir', async (event, dirPath) => {
  try {
    const files = fs.readdirSync(dirPath);
    return { success: true, files };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// App settings handlers
ipcMain.handle('get-app-settings', () => {
  return appSettings;
});

ipcMain.handle('set-app-settings', (event, newSettings) => {
  appSettings = { ...appSettings, ...newSettings };
  saveAppSettings();
  return { success: true };
});

ipcMain.handle('add-recent-project', (event, projectPath, projectName) => {
  // Remove if already exists
  appSettings.recentProjects = appSettings.recentProjects.filter(
    p => p.path !== projectPath
  );

  // Add to front
  appSettings.recentProjects.unshift({
    path: projectPath,
    name: projectName,
    lastOpened: new Date().toISOString()
  });

  // Keep only last 10
  appSettings.recentProjects = appSettings.recentProjects.slice(0, 10);

  // Update last project
  appSettings.lastProject = projectPath;

  saveAppSettings();
  return { success: true };
});

ipcMain.handle('get-user-data-path', () => {
  return app.getPath('userData');
});

// Export to DOCX handler
ipcMain.handle('export-docx', async (event, projectName, chapters) => {
  try {
    const docChildren = [];

    // Add project title as centered heading
    docChildren.push(
      new Paragraph({
        text: projectName,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER
      })
    );

    // Process each chapter
    chapters.forEach((chapter, index) => {
      // Add page break before each chapter (except first)
      if (index > 0) {
        docChildren.push(
          new Paragraph({
            children: [new PageBreak()]
          })
        );
      }

      // Add chapter title as Heading 1
      docChildren.push(
        new Paragraph({
          text: chapter.title,
          heading: HeadingLevel.HEADING_1
        })
      );

      // Parse chapter content
      const lines = chapter.content.split('\n');
      for (const line of lines) {
        const trimmedLine = line.trim();

        // Skip the chapter title if it's the first line (# Title format)
        if (trimmedLine.startsWith('# ') && lines.indexOf(line) === 0) {
          continue;
        }

        // Handle ## headings as Heading 2
        if (trimmedLine.startsWith('## ')) {
          docChildren.push(
            new Paragraph({
              text: trimmedLine.substring(3),
              heading: HeadingLevel.HEADING_2
            })
          );
        } else if (trimmedLine === '') {
          // Empty paragraph for spacing
          docChildren.push(new Paragraph({}));
        } else {
          // Regular paragraph
          docChildren.push(
            new Paragraph({
              children: [new TextRun(line)]
            })
          );
        }
      }
    });

    const doc = new Document({
      sections: [{
        properties: {},
        children: docChildren
      }]
    });

    const buffer = await Packer.toBuffer(doc);
    return { success: true, buffer: buffer.toString('base64') };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
