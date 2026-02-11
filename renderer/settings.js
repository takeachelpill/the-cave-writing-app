// Settings module - handles the settings modal and preferences

const Settings = {
  modal: null,
  currentSettings: {
    fontFamily: 'Literata',
    fontSize: 18,
    columnWidth: 700,
    paragraphSpacing: 1.5,
    darkMode: true,
    autoPause: true
  },
  onSettingsChange: null,

  onCloseProject: null,

  init() {
    this.modal = document.getElementById('settings-modal');
    this.setupEventListeners();
  },

  setupEventListeners() {
    // Settings button
    document.getElementById('settings-btn').addEventListener('click', () => {
      this.open();
    });

    // Close button
    document.getElementById('close-settings').addEventListener('click', () => {
      this.close();
    });

    // Close on overlay click
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });

    // Keyboard shortcut
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === ',') {
        e.preventDefault();
        this.open();
      }
      if (e.key === 'Escape' && !this.modal.classList.contains('hidden')) {
        this.close();
      }
    });

    // Font family
    document.getElementById('font-family').addEventListener('change', (e) => {
      this.updateSetting('fontFamily', e.target.value);
    });

    // Font size
    const fontSizeInput = document.getElementById('font-size');
    fontSizeInput.addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      document.getElementById('font-size-value').textContent = value;
      this.updateSetting('fontSize', value);
    });

    // Column width
    const columnWidthInput = document.getElementById('column-width');
    columnWidthInput.addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      document.getElementById('column-width-value').textContent = value;
      this.updateSetting('columnWidth', value);
    });

    // Paragraph spacing
    const paragraphSpacingInput = document.getElementById('paragraph-spacing');
    paragraphSpacingInput.addEventListener('input', (e) => {
      const value = parseInt(e.target.value) / 10;
      document.getElementById('paragraph-spacing-value').textContent = value.toFixed(1);
      this.updateSetting('paragraphSpacing', value);
    });

    // Dark mode
    document.getElementById('dark-mode').addEventListener('change', (e) => {
      this.updateSetting('darkMode', e.target.checked);
    });

    // Auto-pause
    document.getElementById('auto-pause').addEventListener('change', (e) => {
      this.updateSetting('autoPause', e.target.checked);
    });

    // Export as DOCX button
    document.getElementById('export-docx-btn').addEventListener('click', async () => {
      this.close();
      await Export.exportAsDocx();
    });

    // Close project button
    document.getElementById('close-project-btn').addEventListener('click', () => {
      this.close();
      if (this.onCloseProject) {
        this.onCloseProject();
      }
    });

    // Close window button (close settings modal)
    document.getElementById('close-window-btn').addEventListener('click', () => {
      this.close();
    });
  },

  open() {
    this.modal.classList.remove('hidden');
    this.loadSettingsToUI();
  },

  close() {
    this.modal.classList.add('hidden');
  },

  loadSettingsToUI() {
    document.getElementById('font-family').value = this.currentSettings.fontFamily;

    const fontSizeInput = document.getElementById('font-size');
    fontSizeInput.value = this.currentSettings.fontSize;
    document.getElementById('font-size-value').textContent = this.currentSettings.fontSize;

    const columnWidthInput = document.getElementById('column-width');
    columnWidthInput.value = this.currentSettings.columnWidth;
    document.getElementById('column-width-value').textContent = this.currentSettings.columnWidth;

    const paragraphSpacingInput = document.getElementById('paragraph-spacing');
    paragraphSpacingInput.value = this.currentSettings.paragraphSpacing * 10;
    document.getElementById('paragraph-spacing-value').textContent = this.currentSettings.paragraphSpacing.toFixed(1);

    document.getElementById('dark-mode').checked = this.currentSettings.darkMode;
    document.getElementById('auto-pause').checked = this.currentSettings.autoPause;
  },

  loadSettings(settings) {
    this.currentSettings = { ...this.currentSettings, ...settings };
    this.applySettings();
  },

  updateSetting(key, value) {
    this.currentSettings[key] = value;
    this.applySettings();

    if (this.onSettingsChange) {
      this.onSettingsChange(this.currentSettings);
    }
  },

  applySettings() {
    const root = document.documentElement;

    // Font family
    root.style.setProperty('--font-family', this.currentSettings.fontFamily);

    // Font size
    root.style.setProperty('--font-size', `${this.currentSettings.fontSize}px`);

    // Column width
    root.style.setProperty('--column-width', `${this.currentSettings.columnWidth}px`);

    // Paragraph spacing - margin-bottom on paragraphs
    root.style.setProperty('--paragraph-spacing', `${this.currentSettings.paragraphSpacing}em`);

    // Dark mode
    if (this.currentSettings.darkMode) {
      document.body.classList.remove('light-mode');
    } else {
      document.body.classList.add('light-mode');
    }

    // Auto-pause
    if (typeof Stats !== 'undefined') {
      Stats.setAutoPause(this.currentSettings.autoPause);
    }

    // Apply to editor component
    if (typeof Editor !== 'undefined') {
      Editor.applySettings(this.currentSettings);
    }
  },

  getSettings() {
    return { ...this.currentSettings };
  }
};
