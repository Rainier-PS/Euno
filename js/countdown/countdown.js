import { showToast } from '../utils/notifications.js';
import { sanitizeNum } from '../utils/helpers.js';

let countdownTimer = null, countdownRunning = false, countdownRemaining = 0;

export function initCountdown() {
  const toggleBtn = document.getElementById('countdown-toggle');
  const resetBtn = document.getElementById('reset-countdown');

  function getCountdownInput() {
    const h = sanitizeNum(document.getElementById('countdown-h') ? document.getElementById('countdown-h').value : 0, 0, 23);
    const m = sanitizeNum(document.getElementById('countdown-m') ? document.getElementById('countdown-m').value : 5, 0, 59);
    const s = sanitizeNum(document.getElementById('countdown-s') ? document.getElementById('countdown-s').value : 0, 0, 59);
    return h * 3600 + m * 60 + s;
  }

  function updateCountdownDisplay(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const el = document.getElementById('countdown-display');
    if (el) el.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  toggleBtn && toggleBtn.addEventListener('click', () => {
    if (countdownRunning) {
      pauseCountdown();
    } else {
      startCountdown();
    }
  });

  function startCountdown() {
    if (countdownRunning) return;
    if (countdownRemaining <= 0) countdownRemaining = getCountdownInput();
    if (countdownRemaining <= 0) { showToast('Set a countdown time first.', 'error'); return; }
    countdownRunning = true;
    if (toggleBtn) {
      toggleBtn.setAttribute('data-state', 'stop');
      toggleBtn.innerHTML = '<span class="material-icons-round" aria-hidden="true">stop</span>Stop';
    }
    countdownTimer = setInterval(() => {
      countdownRemaining--;
      updateCountdownDisplay(countdownRemaining);
      if (countdownRemaining <= 0) {
        clearInterval(countdownTimer); countdownRunning = false; countdownRemaining = 0;
        showToast('Countdown complete!', 'success');
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification('Euno', { body: 'Your countdown timer has finished!', icon: '' });
        }
        if (toggleBtn) {
          toggleBtn.setAttribute('data-state', 'start');
          toggleBtn.innerHTML = '<span class="material-icons-round" aria-hidden="true">play_arrow</span>Start';
        }
      }
    }, 1000);
  }

  function pauseCountdown() {
    clearInterval(countdownTimer); countdownRunning = false;
    if (toggleBtn) {
      toggleBtn.setAttribute('data-state', 'start');
      toggleBtn.innerHTML = '<span class="material-icons-round" aria-hidden="true">play_arrow</span>Start';
    }
  }

  resetBtn && resetBtn.addEventListener('click', () => {
    clearInterval(countdownTimer); countdownRunning = false;
    countdownRemaining = getCountdownInput();
    if (toggleBtn) {
      toggleBtn.setAttribute('data-state', 'start');
      toggleBtn.innerHTML = '<span class="material-icons-round" aria-hidden="true">play_arrow</span>Start';
    }
    updateCountdownDisplay(countdownRemaining);
  });

  ['countdown-h','countdown-m','countdown-s'].forEach(id => {
    const el = document.getElementById(id);
    el && el.addEventListener('input', () => {
      if (!countdownRunning) {
        countdownRemaining = getCountdownInput();
        updateCountdownDisplay(countdownRemaining);
      }
    });
  });

  updateCountdownDisplay(getCountdownInput());
}
