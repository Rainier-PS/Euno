import { getStorage, setStorage } from '../core/storage.js';
import { todayStr, formatDateDisplay } from '../utils/dateUtils.js';
import { showToast } from '../utils/notifications.js';
import { sanitize, sanitizeNum } from '../utils/helpers.js';
import { renderMoodDot } from '../utils/ui.js';
import { MOOD_LABELS } from '../core/constants.js';
import { updateHomeDashboard } from './home.js';
import { addCoins } from '../shop/shop.js';

export function getCurrentWeekDates() {
  const days = [], today = new Date(), day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const start = new Date(today); start.setDate(today.getDate()+diff);
  for (let i = 0; i < 7; i++) { const d = new Date(start); d.setDate(start.getDate()+i); days.push(d.toISOString().slice(0,10)); }
  return days;
}

export function initCheckin() {
  let selectedMood = 0, selectedEnergy = '', selectedSleep = '';
  const moodGrid = document.getElementById('mood-emoji-grid');
  const moodLabel = document.getElementById('selected-mood-label');
  const moodSlider = document.getElementById('mood-slider');
  const finetuneGroup = document.getElementById('mood-finetune-group');
  const finetuneZoneLabel = document.getElementById('mood-finetune-zone-label');
  const finetuneCenterLabel = document.getElementById('mood-finetune-center-label');
  const sliderDots = document.getElementById('mood-slider-dots');
  const stressSlider = document.getElementById('stress-slider');
  const thoughts = document.getElementById('checkin-thoughts');
  const thoughtsCount = document.getElementById('thoughts-count');
  const wellnessRow = document.getElementById('wellness-score-row');
  const wellnessValue = document.getElementById('wellness-score-value');
  const wellnessBar = document.getElementById('wellness-score-bar');

  const ZONE_CENTERS = { 1:1, 2:3, 3:5, 4:7, 5:9 };

  function sliderValToMood(val) {
    return Math.ceil(val / 2);
  }

  function updateSliderDots(mood) {
    if (!sliderDots) return;
    sliderDots.innerHTML = [1,2,3,4,5].map(m => {
      const active = m === mood ? ' active' : '';
      return `<span class="msd-dot msd-dot--${m}${active}"></span>`;
    }).join('');
  }

  function updateSliderColor(val) {
    if (!moodSlider) return;
    const pct = ((val - 1) / 9) * 100;
    moodSlider.style.background = `linear-gradient(to right, var(--md-mood-${Math.min(sliderValToMood(val),5)}) ${pct}%, var(--md-secondary-container) ${pct}%)`;
  }

  function syncSliderToMood(mood) {
    const center = ZONE_CENTERS[mood];
    if (moodSlider) { moodSlider.value = center; updateSliderColor(center); }
    if (finetuneGroup) finetuneGroup.style.display = '';
    if (finetuneZoneLabel) finetuneZoneLabel.textContent = '— ' + (MOOD_LABELS[mood] || '');
    if (finetuneCenterLabel) finetuneCenterLabel.textContent = MOOD_LABELS[mood] || '';
    updateSliderDots(mood);
    updateWellnessScore();
  }

  function updateWellnessScore() {
    if (!wellnessRow || !wellnessValue || !wellnessBar) return;
    if (!selectedMood) { wellnessRow.style.display = 'none'; return; }
    const sliderVal = moodSlider ? parseInt(moodSlider.value) : ZONE_CENTERS[selectedMood];
    const stressVal = stressSlider ? parseInt(stressSlider.value) : 5;
    const energyScore = { low: 1, medium: 2, high: 3 }[selectedEnergy] || 2;
    const sleepScore = { poor: 1, fair: 2, good: 3, great: 4 }[selectedSleep] || 2;
    const raw = sliderVal * 3 + stressVal * 2 + energyScore * 2 + sleepScore * 2;
    const score = Math.round((raw / 64) * 100);
    wellnessRow.style.display = '';
    wellnessValue.textContent = score + ' / 100';
    wellnessBar.style.width = score + '%';
    const barColor = score >= 70 ? 'var(--md-mood-4)' : score >= 45 ? 'var(--md-mood-3)' : 'var(--md-mood-2)';
    wellnessBar.style.background = barColor;

    function renderDots(filled, max, color) {
      let html = '';
      for (let i = 0; i < max; i++) {
        html += `<span class="wsb-dot${i < filled ? ' filled' : ''}" style="${i < filled ? 'background:' + color : ''}"></span>`;
      }
      return html;
    }
    const moodDots = Math.round(sliderVal / 2);
    const stressDots = Math.round(stressVal / 2);
    const energyDots = energyScore;
    const sleepDots = sleepScore;

    const wsbMood = document.getElementById('wsb-mood');
    const wsbStress = document.getElementById('wsb-stress');
    const wsbEnergy = document.getElementById('wsb-energy');
    const wsbSleep = document.getElementById('wsb-sleep');
    if (wsbMood) wsbMood.innerHTML = renderDots(moodDots, 5, barColor);
    if (wsbStress) wsbStress.innerHTML = renderDots(stressDots, 5, stressDots <= 1 ? 'var(--md-mood-1)' : stressDots <= 3 ? 'var(--md-mood-3)' : 'var(--md-mood-4)');
    if (wsbEnergy) wsbEnergy.innerHTML = renderDots(energyDots, 3, energyDots === 1 ? 'var(--md-mood-2)' : energyDots === 2 ? 'var(--md-mood-3)' : 'var(--md-mood-4)');
    if (wsbSleep) wsbSleep.innerHTML = renderDots(sleepDots, 4, sleepDots <= 1 ? 'var(--md-mood-2)' : sleepDots <= 2 ? 'var(--md-mood-3)' : 'var(--md-mood-4)');
  }

  moodGrid && moodGrid.querySelectorAll('.mood-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      moodGrid.querySelectorAll('.mood-btn').forEach(b => { b.classList.remove('selected'); b.setAttribute('aria-pressed','false'); });
      btn.classList.add('selected'); btn.setAttribute('aria-pressed','true');
      selectedMood = parseInt(btn.dataset.mood);
      if (moodLabel) moodLabel.textContent = btn.dataset.label;
      syncSliderToMood(selectedMood);
    });
  });

  moodSlider && moodSlider.addEventListener('input', () => {
    const val = parseInt(moodSlider.value);
    const newMood = sliderValToMood(val);
    updateSliderColor(val);
    updateSliderDots(newMood);
    if (newMood !== selectedMood && newMood >= 1 && newMood <= 5) {
      selectedMood = newMood;
      if (moodLabel) moodLabel.textContent = MOOD_LABELS[selectedMood];
      if (finetuneZoneLabel) finetuneZoneLabel.textContent = '— ' + MOOD_LABELS[selectedMood];
      if (finetuneCenterLabel) finetuneCenterLabel.textContent = MOOD_LABELS[selectedMood];
      moodGrid && moodGrid.querySelectorAll('.mood-btn').forEach(b => {
        const active = parseInt(b.dataset.mood) === selectedMood;
        b.classList.toggle('selected', active);
        b.setAttribute('aria-pressed', String(active));
      });
    }
    updateWellnessScore();
  });

  thoughts && thoughts.addEventListener('input', () => { if (thoughtsCount) thoughtsCount.textContent = thoughts.value.length + ' / 500'; });

  document.querySelectorAll('[data-energy]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-energy]').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed','false'); });
      btn.classList.add('active'); btn.setAttribute('aria-pressed','true'); selectedEnergy = btn.dataset.energy;
      updateWellnessScore();
    });
  });
  document.querySelectorAll('[data-sleep]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-sleep]').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed','false'); });
      btn.classList.add('active'); btn.setAttribute('aria-pressed','true'); selectedSleep = btn.dataset.sleep;
      updateWellnessScore();
    });
  });
  stressSlider && stressSlider.addEventListener('input', () => {
    const val = parseInt(stressSlider.value);
    const pct = (val / 10) * 100;
    const color = val <= 3 ? 'var(--md-mood-1)' : val <= 6 ? 'var(--md-mood-3)' : 'var(--md-mood-4)';
    stressSlider.style.background = `linear-gradient(to right, ${color} ${pct}%, var(--md-secondary-container) ${pct}%)`;
    updateWellnessScore();
  });
  if (stressSlider) { stressSlider.style.background = `linear-gradient(to right, var(--md-mood-3) 50%, var(--md-secondary-container) 50%)`; }

  const saveBtn = document.getElementById('save-checkin');

  function applyCheckinLock() {
    const checkins = getStorage('checkins', []);
    const alreadyDone = checkins.some(c => c.date === todayStr());
    if (!saveBtn) return;

    const existingBanner = document.getElementById('checkin-done-banner');
    if (existingBanner) existingBanner.remove();

    if (alreadyDone) {
      saveBtn.disabled = true;
      saveBtn.setAttribute('aria-disabled', 'true');
      saveBtn.innerHTML = '<span class="material-icons-round" aria-hidden="true">check_circle</span>Already checked in today';

      const banner = document.createElement('div');
      banner.id = 'checkin-done-banner';
      banner.className = 'checkin-done-banner';
      banner.setAttribute('role', 'status');
      banner.innerHTML = `
        <span class="material-icons-round checkin-done-icon" aria-hidden="true">check_circle</span>
        <div>
          <strong>You've already checked in today!</strong>
          <p>Come back tomorrow to log your next check-in. Keep the streak going!</p>
        </div>`;
      saveBtn.parentNode.insertBefore(banner, saveBtn);
    } else {
      saveBtn.disabled = false;
      saveBtn.removeAttribute('aria-disabled');
      saveBtn.innerHTML = '<span class="material-icons-round" aria-hidden="true">save</span>Save Check-In';
    }
  }

  applyCheckinLock();

  saveBtn && saveBtn.addEventListener('click', () => {
    const checkins0 = getStorage('checkins', []);
    if (checkins0.some(c => c.date === todayStr())) {
      showToast('You\'ve already checked in today. Come back tomorrow!', 'error');
      return;
    }
    if (!selectedMood) { showToast('Please select a mood first.', 'error'); return; }
    const stressVal = stressSlider ? sanitizeNum(stressSlider.value, 0, 10) : 5;
    const sliderVal = moodSlider ? sanitizeNum(moodSlider.value, 1, 10) : ZONE_CENTERS[selectedMood];
    const energyScore = { low: 1, medium: 2, high: 3 }[selectedEnergy] || 2;
    const sleepScore = { poor: 1, fair: 2, good: 3, great: 4 }[selectedSleep] || 2;
    const raw = sliderVal * 3 + stressVal * 2 + energyScore * 2 + sleepScore * 2;
    const wellnessScore = Math.round((raw / 64) * 100);
    const entry = {
      date: todayStr(), mood: sanitizeNum(selectedMood, 1, 5),
      moodSlider: sliderVal,
      stress: stressVal,
      energy: ['low','medium','high'].includes(selectedEnergy) ? selectedEnergy : '',
      sleep: ['poor','fair','good','great'].includes(selectedSleep) ? selectedSleep : '',
      thoughts: thoughts ? thoughts.value.trim().slice(0, 500) : '',
      wellnessScore,
      timestamp: Date.now()
    };
    let checkins = getStorage('checkins', []);
    checkins.push(entry);
    setStorage('checkins', checkins);
    addCoins(10, 'Daily Check-In');
    showToast('Check-in saved! Great job keeping your streak!', 'success');
    moodGrid && moodGrid.querySelectorAll('.mood-btn').forEach(b => { b.classList.remove('selected'); b.setAttribute('aria-pressed','false'); });
    selectedMood = 0; selectedEnergy = ''; selectedSleep = '';
    document.querySelectorAll('[data-energy]').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed','false'); });
    document.querySelectorAll('[data-sleep]').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed','false'); });
    if (moodLabel) moodLabel.textContent = '';
    if (finetuneGroup) finetuneGroup.style.display = 'none';
    if (wellnessRow) wellnessRow.style.display = 'none';
    if (thoughts) thoughts.value = '';
    if (thoughtsCount) thoughtsCount.textContent = '0 / 500';
    if (moodSlider) { moodSlider.value = 5; moodSlider.style.background = ''; }
    if (stressSlider) { stressSlider.value = 5; stressSlider.style.background = `linear-gradient(to right, var(--md-mood-3) 50%, var(--md-secondary-container) 50%)`; }
    renderCheckinHistory(); updateHomeDashboard();
    applyCheckinLock();
  });
  renderCheckinHistory();
}

function renderCheckinHistory() {
  const el = document.getElementById('checkin-history');
  if (!el) return;
  const checkins = getStorage('checkins',[]).slice(-10).reverse();
  if (!checkins.length) { el.innerHTML = '<p style="color:var(--md-on-surface-variant);font-size:0.875rem;">No check-ins yet. Start your first one above!</p>'; return; }
  el.innerHTML = checkins.map(c => `
    <div class="checkin-item">
      <div class="checkin-emoji">${renderMoodDot(c.mood)}</div>
      <div class="checkin-info">
        <div class="checkin-date">${sanitize(formatDateDisplay(c.date))}</div>
        <div class="checkin-mood-name">${sanitize(MOOD_LABELS[c.mood]||'')}</div>
        ${c.thoughts ? `<div class="checkin-thoughts">${sanitize(c.thoughts.slice(0,80))}${c.thoughts.length>80?'…':''}</div>` : ''}
      </div>
    </div>`).join('');
}
