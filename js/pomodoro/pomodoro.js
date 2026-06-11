import { getStorage, setStorage } from '../core/storage.js';
import { todayStr } from '../utils/dateUtils.js';
import { showToast } from '../utils/notifications.js';
import { sanitizeNum } from '../utils/helpers.js';
import { POMO_TIPS } from '../core/constants.js';
import { updateHomeDashboard } from '../features/home.js';
import { addCoins } from '../shop/shop.js';

let pomodoroTimer = null, pomodoroRunning = false, pomodoroSeconds = 25*60, pomodoroMode = 'pomodoro';
let stopwatchTimer = null, stopwatchRunning = false, stopwatchSeconds = 0, stopwatchLaps = [];
let clockTimer = null;

export function initPomodoro() {
  const focusBoostUnlocked = getStorage('focus_boost_unlocked', false);
  const pomoSettings = document.getElementById('pomo-settings');
  if (pomoSettings && focusBoostUnlocked) {
    pomoSettings.innerHTML += `<div class="field-group"><label class="field-label">Preset</label><select id="pomo-preset" class="input-field"><option value="25">25 min (Standard)</option><option value="45">45 min (Focus Boost)</option></select></div>`;
    const presetSelect = document.getElementById('pomo-preset');
    if (presetSelect) {
      presetSelect.addEventListener('change', () => {
        const durInput = document.getElementById('pomo-duration');
        if (durInput) {
          durInput.value = presetSelect.value;
          if (!pomodoroRunning) {
            pomodoroSeconds = parseInt(presetSelect.value) * 60;
            updatePomodoroDisplay();
          }
        }
      });
    }
  }

  const pmodes = document.querySelectorAll('.pmode');
  pmodes.forEach(btn => {
    btn.addEventListener('click', () => {
      pmodes.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed','false'); });
      btn.classList.add('active'); btn.setAttribute('aria-pressed','true');
      pomodoroMode = btn.dataset.pmode;
      switchPomodoroMode(pomodoroMode);
    });
  });

  document.getElementById('pomodoro-toggle') && document.getElementById('pomodoro-toggle').addEventListener('click', togglePomodoro);
  document.getElementById('reset-pomodoro') && document.getElementById('reset-pomodoro').addEventListener('click', resetPomodoro);
  document.getElementById('stopwatch-toggle') && document.getElementById('stopwatch-toggle').addEventListener('click', toggleStopwatch);
  document.getElementById('lap-stopwatch') && document.getElementById('lap-stopwatch').addEventListener('click', lapStopwatch);
  document.getElementById('reset-stopwatch') && document.getElementById('reset-stopwatch').addEventListener('click', resetStopwatch);

  const durInput = document.getElementById('pomo-duration');
  durInput && durInput.addEventListener('change', () => {
    const val = sanitizeNum(durInput.value, 1, 99);
    durInput.value = val;
    if (!pomodoroRunning) {
      pomodoroSeconds = val * 60;
      updatePomodoroDisplay();
    }
  });

  updatePomodoroDisplay();
  startClock();
  rotatePomodoroTips();

  const stabs = document.querySelectorAll('.tab[data-stab]');
  stabs.forEach(t => {
    t.addEventListener('click', () => {
      stabs.forEach(x => { x.classList.remove('active'); x.setAttribute('aria-selected','false'); });
      document.querySelectorAll('.stab-panel').forEach(p => p.classList.remove('active'));
      t.classList.add('active'); t.setAttribute('aria-selected','true');
      const panel = document.getElementById('stab-' + t.dataset.stab);
      if (panel) panel.classList.add('active');
    });
  });
}

function switchPomodoroMode(mode) {
  clearInterval(pomodoroTimer); clearInterval(stopwatchTimer); clearInterval(clockTimer);
  pomodoroRunning = false; stopwatchRunning = false;
  const timerRing = document.getElementById('timer-ring');
  const clockDisplay = document.getElementById('clock-display');
  const pomoControls = document.getElementById('pomodoro-controls');
  const swControls = document.getElementById('stopwatch-controls');
  const pomoSettings = document.getElementById('pomo-settings');
  const lapsList = document.getElementById('stopwatch-laps');
  const countdownSection = document.getElementById('countdown-section');

  [timerRing, clockDisplay, pomoControls, swControls, pomoSettings, countdownSection, lapsList].forEach(el => {
    if (el) el.style.display = 'none';
  });

  if (mode === 'pomodoro') {
    if (timerRing) timerRing.style.display = '';
    if (pomoControls) pomoControls.style.display = '';
    if (pomoSettings) pomoSettings.style.display = '';
    const dur = sanitizeNum(document.getElementById('pomo-duration') ? document.getElementById('pomo-duration').value : 25, 1, 99);
    pomodoroSeconds = dur * 60;
    updatePomodoroDisplay();
  } else if (mode === 'stopwatch') {
    if (timerRing) timerRing.style.display = '';
    if (swControls) swControls.style.display = '';
    stopwatchSeconds = 0; stopwatchLaps = [];
    if (lapsList) { lapsList.innerHTML = ''; }
    updateStopwatchDisplay();
  } else if (mode === 'clock') {
    if (clockDisplay) clockDisplay.style.display = '';
    if (countdownSection) countdownSection.style.display = '';
    startClock();
  }
}

function togglePomodoro() {
  if (pomodoroRunning) {
    pausePomodoro();
  } else {
    startPomodoro();
  }
}

function startPomodoro() {
  if (pomodoroRunning) return;
  pomodoroRunning = true;
  const btn = document.getElementById('pomodoro-toggle');
  if (btn) {
    btn.setAttribute('data-state', 'stop');
    btn.innerHTML = '<span class="material-icons-round" aria-hidden="true">stop</span>Stop';
  }
  pomodoroTimer = setInterval(() => {
    pomodoroSeconds--;
    if (pomodoroSeconds <= 0) {
      clearInterval(pomodoroTimer); pomodoroRunning = false;
      pomodoroSeconds = 0; updatePomodoroDisplay();
      const sessions = getStorage('pomodoro_sessions',[]);
      sessions.push({ date: todayStr(), timestamp: Date.now() });
      setStorage('pomodoro_sessions', sessions);
      showToast('Pomodoro complete! Take a break.', 'success');
      addCoins(5, 'Pomodoro Session');
      updateHomeDashboard();
      if (btn) {
        btn.setAttribute('data-state', 'start');
        btn.innerHTML = '<span class="material-icons-round" aria-hidden="true">play_arrow</span>Start';
      }
    } else {
      updatePomodoroDisplay();
    }
  }, 1000);
}

function pausePomodoro() {
  clearInterval(pomodoroTimer); pomodoroRunning = false;
  const btn = document.getElementById('pomodoro-toggle');
  if (btn) {
    btn.setAttribute('data-state', 'start');
    btn.innerHTML = '<span class="material-icons-round" aria-hidden="true">play_arrow</span>Start';
  }
}

function resetPomodoro() {
  clearInterval(pomodoroTimer); pomodoroRunning = false;
  const dur = sanitizeNum(document.getElementById('pomo-duration') ? document.getElementById('pomo-duration').value : 25, 1, 99);
  pomodoroSeconds = dur * 60;
  const btn = document.getElementById('pomodoro-toggle');
  if (btn) {
    btn.setAttribute('data-state', 'start');
    btn.innerHTML = '<span class="material-icons-round" aria-hidden="true">play_arrow</span>Start';
  }
  updatePomodoroDisplay();
}

function updatePomodoroDisplay() {
  const m = Math.floor(pomodoroSeconds / 60);
  const s = pomodoroSeconds % 60;
  const display = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  const el = document.getElementById('timer-value'); if(el) el.textContent = display;
  const dur = sanitizeNum(document.getElementById('pomo-duration') ? document.getElementById('pomo-duration').value : 25, 1, 99);
  const total = dur * 60;
  const pct = total > 0 ? pomodoroSeconds / total : 1;
  const circumference = 2 * Math.PI * 88;
  const circle = document.getElementById('timer-progress-circle');
  if (circle) circle.style.strokeDashoffset = circumference * (1 - pct);
  const modeLabel = document.getElementById('timer-mode-label'); if(modeLabel) modeLabel.textContent = 'Focus';
}

function toggleStopwatch() {
  if (stopwatchRunning) {
    pauseStopwatch();
  } else {
    startStopwatch();
  }
}

function startStopwatch() {
  if (stopwatchRunning) return;
  stopwatchRunning = true;
  const btn = document.getElementById('stopwatch-toggle');
  if (btn) {
    btn.setAttribute('data-state', 'stop');
    btn.innerHTML = '<span class="material-icons-round" aria-hidden="true">stop</span>Stop';
  }
  stopwatchTimer = setInterval(() => {
    stopwatchSeconds++;
    updateStopwatchDisplay();
  }, 1000);
}

function pauseStopwatch() {
  clearInterval(stopwatchTimer); stopwatchRunning = false;
  const btn = document.getElementById('stopwatch-toggle');
  if (btn) {
    btn.setAttribute('data-state', 'start');
    btn.innerHTML = '<span class="material-icons-round" aria-hidden="true">play_arrow</span>Start';
  }
}

function lapStopwatch() {
  if (!stopwatchRunning) return;
  stopwatchLaps.push(stopwatchSeconds);
  const el = document.getElementById('stopwatch-laps');
  if (el) {
    const li = document.createElement('li');
    const m = Math.floor(stopwatchSeconds/60), s = stopwatchSeconds%60;
    li.textContent = `Lap ${stopwatchLaps.length}: ${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    el.appendChild(li);
    el.style.display = '';
  }
}

function resetStopwatch() {
  clearInterval(stopwatchTimer); stopwatchRunning = false;
  stopwatchSeconds = 0; stopwatchLaps = [];
  const btn = document.getElementById('stopwatch-toggle');
  if (btn) {
    btn.setAttribute('data-state', 'start');
    btn.innerHTML = '<span class="material-icons-round" aria-hidden="true">play_arrow</span>Start';
  }
  updateStopwatchDisplay();
  const el = document.getElementById('stopwatch-laps'); if(el) { el.innerHTML=''; el.style.display='none'; }
}

function updateStopwatchDisplay() {
  const m = Math.floor(stopwatchSeconds/60), s = stopwatchSeconds%60;
  const el = document.getElementById('timer-value'); if(el) el.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  const modeLabel = document.getElementById('timer-mode-label'); if(modeLabel) modeLabel.textContent = 'Stopwatch';
  const circle = document.getElementById('timer-progress-circle');
  if (circle) { const circumference = 2 * Math.PI * 88; circle.style.strokeDashoffset = circumference * (1 - (stopwatchSeconds % 60) / 60); }
}

function startClock() {
  clearInterval(clockTimer);
  function tick() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2,'0');
    const m = String(now.getMinutes()).padStart(2,'0');
    const s = String(now.getSeconds()).padStart(2,'0');
    const el = document.getElementById('live-clock'); if(el) el.textContent = `${h}:${m}:${s}`;
  }
  tick();
  clockTimer = setInterval(tick, 1000);
}

function rotatePomodoroTips() {
  let i = 0;
  const el = document.getElementById('pomo-tip-text');
  if (el) el.textContent = POMO_TIPS[0];
  setInterval(() => { i = (i+1) % POMO_TIPS.length; if(el) el.textContent = POMO_TIPS[i]; }, 15000);
}
