// Stats module - handles clock, writing timer, and word count

const Stats = {
  timerRunning: false,
  timerSeconds: 0,
  timerInterval: null,
  clockInterval: null,
  autoPauseEnabled: true,
  autoPauseTimeout: null,

  init() {
    this.setupClock();
    this.setupTimer();
  },

  // Clock
  setupClock() {
    this.updateClock();
    this.clockInterval = setInterval(() => this.updateClock(), 1000);
  },

  updateClock() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    document.getElementById('clock').textContent = `${displayHours}:${minutes} ${ampm}`;
  },

  // Timer
  setupTimer() {
    const timerBtn = document.getElementById('timer-btn');

    timerBtn.addEventListener('click', () => {
      if (this.timerRunning) {
        this.pauseTimer();
      } else {
        this.startTimer();
      }
    });
  },

  startTimer() {
    if (this.timerRunning) return;

    this.timerRunning = true;
    // Initialize activity time when timer starts so it doesn't auto-pause immediately
    Editor.lastActivityTime = Date.now();

    const timerBtn = document.getElementById('timer-btn');
    timerBtn.innerHTML = '&#10074;&#10074;'; // Pause icon
    timerBtn.classList.add('running');

    this.timerInterval = setInterval(() => {
      this.timerSeconds++;
      this.updateTimerDisplay();

      // Check for auto-pause (only if enabled and user has been inactive)
      if (this.autoPauseEnabled && Editor.lastActivityTime && Editor.isInactive(60000)) {
        this.pauseTimer();
      }
    }, 1000);
  },

  pauseTimer() {
    if (!this.timerRunning) return;

    this.timerRunning = false;
    const timerBtn = document.getElementById('timer-btn');
    timerBtn.innerHTML = '&#9654;'; // Play icon
    timerBtn.classList.remove('running');

    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  },

  resetTimer() {
    this.pauseTimer();
    this.timerSeconds = 0;
    this.updateTimerDisplay();
  },

  updateTimerDisplay() {
    const hours = Math.floor(this.timerSeconds / 3600);
    const minutes = Math.floor((this.timerSeconds % 3600) / 60);
    const seconds = this.timerSeconds % 60;

    document.getElementById('timer').textContent =
      `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  },

  setAutoPause(enabled) {
    this.autoPauseEnabled = enabled;
  },

  // Cleanup
  destroy() {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }
};
