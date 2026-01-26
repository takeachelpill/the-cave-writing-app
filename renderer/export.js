// Export module - handles exporting project to DOCX format

const Export = {
  async exportAsDocx() {
    // Check if a project is open
    if (!Storage.currentProject) {
      await window.electronAPI.showMessageBox({
        type: 'warning',
        title: 'No Project Open',
        message: 'Please open a project before exporting.',
        buttons: ['OK']
      });
      return;
    }

    // Check if there are chapters to export
    if (Storage.currentProject.chapters.length === 0) {
      await window.electronAPI.showMessageBox({
        type: 'warning',
        title: 'No Chapters',
        message: 'There are no chapters to export.',
        buttons: ['OK']
      });
      return;
    }

    // Save current chapter first
    if (Editor.currentChapter) {
      await Editor.saveNow();
    }

    // Show save dialog
    const result = await window.electronAPI.showSaveDialog({
      title: 'Export as DOCX',
      defaultPath: `${Storage.currentProject.name}.docx`,
      filters: [
        { name: 'Word Document', extensions: ['docx'] }
      ]
    });

    if (result.canceled || !result.filePath) {
      return;
    }

    try {
      // Read all chapters in order
      const chapters = [];
      for (const chapter of Storage.currentProject.chapters) {
        const content = await Storage.readChapter(chapter);
        chapters.push({
          title: chapter.title,
          content: content
        });
      }

      // Generate DOCX via main process
      const docResult = await window.electronAPI.exportDocx(
        Storage.currentProject.name,
        chapters
      );

      if (!docResult.success) {
        throw new Error(docResult.error);
      }

      // Write the file
      const writeResult = await window.electronAPI.writeBinaryFile(
        result.filePath,
        docResult.buffer
      );

      if (!writeResult.success) {
        throw new Error(writeResult.error);
      }

      // Show success message
      await window.electronAPI.showMessageBox({
        type: 'info',
        title: 'Export Complete',
        message: `Project exported successfully to:\n${result.filePath}`,
        buttons: ['OK']
      });
    } catch (err) {
      await window.electronAPI.showMessageBox({
        type: 'error',
        title: 'Export Failed',
        message: 'Failed to export project.',
        detail: err.message,
        buttons: ['OK']
      });
    }
  }
};
