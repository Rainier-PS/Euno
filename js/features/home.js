import { getStorage } from '../core/storage.js';
import { greetingByTime, todayStr } from '../utils/dateUtils.js';
import { MOOD_LABELS } from '../core/constants.js';
import { renderMoodDot } from '../utils/ui.js';
import { sanitize } from '../utils/helpers.js';

export function initHome() { updateHomeDashboard(); }

export function updateHomeDashboard() {
  const name = getStorage('profile_name','');
  const gender = getStorage('profile_gender','male');
  const greetEl = document.getElementById('greeting-name');
  if (greetEl) greetEl.textContent = name || 'Student';
  const labelEl = document.getElementById('greeting-label-text');
  if (labelEl) labelEl.textContent = greetingByTime();
  const mobileTimeEl = document.getElementById('mobile-greeting-time');
  if (mobileTimeEl) mobileTimeEl.textContent = greetingByTime();
  const mobileNameEl = document.getElementById('mobile-greeting-name');
  if (mobileNameEl) mobileNameEl.textContent = name || 'Student';
  const avatarIcon = document.getElementById('avatar-icon');
  if (avatarIcon) avatarIcon.textContent = gender === 'female' ? 'face_3' : 'face';
  const checkins = getStorage('checkins',[]);
  const today = todayStr();
  const todayCheckin = checkins.find(c => c.date === today);
  const moodDisplay = document.getElementById('home-mood-display');
  if (moodDisplay) moodDisplay.textContent = todayCheckin ? MOOD_LABELS[todayCheckin.mood] : 'Not logged yet';
  const streak = calcCheckinStreak(checkins);
  const streakEl = document.getElementById('home-streak');
  if (streakEl) streakEl.textContent = streak + (streak === 1 ? ' day' : ' days');
  const habits = getStorage('habits',[]);
  let doneToday = 0;
  habits.forEach(h => { if (h.days && h.days[today]) doneToday++; });
  const habitEl = document.getElementById('home-habits-today');
  if (habitEl) habitEl.textContent = doneToday + '/' + habits.length;
  const sessions = getStorage('pomodoro_sessions',[]);
  const focusEl = document.getElementById('home-focus');
  if (focusEl) focusEl.textContent = sessions.filter(s => s.date === today).length + ' today';
  const journals = getStorage('journals',{});
  const entriesEl = document.getElementById('home-entries');
  if (entriesEl) entriesEl.textContent = Object.keys(journals).length;
  
  const themeUnlocked = getStorage('theme_unlocked', false);
  const goldenBadgeEl = document.getElementById('golden-badge');
  const goldenBadgeMobileEl = document.getElementById('golden-badge-mobile');
  if (goldenBadgeEl) {
    goldenBadgeEl.style.display = themeUnlocked ? 'flex' : 'none';
  }
  if (goldenBadgeMobileEl) {
    goldenBadgeMobileEl.style.display = themeUnlocked ? 'flex' : 'none';
  }
  
  const moodHeroBtn = document.querySelector('.mood-hero-btn');
  const qaCheckinBtn = document.querySelector('.qa-card[data-page="checkin"] .qa-label');
  if (todayCheckin) {
    if (moodHeroBtn) {
      moodHeroBtn.textContent = 'Done';
      moodHeroBtn.disabled = true;
      moodHeroBtn.setAttribute('data-page', '');
    }
    if (qaCheckinBtn) qaCheckinBtn.textContent = 'Done';
  } else {
    if (moodHeroBtn) {
      moodHeroBtn.textContent = 'Log Mood';
      moodHeroBtn.disabled = false;
      moodHeroBtn.setAttribute('data-page', 'checkin');
    }
    if (qaCheckinBtn) qaCheckinBtn.textContent = 'Log Mood';
  }
  
  renderWeekMoodsHome(checkins);
  renderInsightTeaser(checkins);
}

export function calcCheckinStreak(checkins) {
  if (!checkins.length) return 0;
  const dates = [...new Set(checkins.map(c => c.date))].sort().reverse();
  let streak = 0, expected = todayStr();
  for (const d of dates) {
    if (d === expected) { streak++; const dt = new Date(d+'T12:00:00'); dt.setDate(dt.getDate()-1); expected = dt.toISOString().slice(0,10); } else break;
  }
  return streak;
}

function renderWeekMoodsHome(checkins) {
  const el = document.getElementById('week-moods-home');
  if (!el) return;
  const days = [];
  for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate()-i); days.push(d.toISOString().slice(0,10)); }
  el.innerHTML = days.map(date => {
    const c = checkins.find(x => x.date === date);
    const dt = new Date(date+'T12:00:00');
    const label = dt.toLocaleDateString(undefined,{weekday:'short'}).slice(0,2);
    return `<div class="week-mood-item">${renderMoodDot(c ? c.mood : 0)}<span class="mood-day">${sanitize(label)}</span></div>`;
  }).join('');
}

function renderInsightTeaser(checkins) {
  const el = document.getElementById('insight-teaser-content');
  if (!el) return;
  if (checkins.length < 3) {
    el.innerHTML = '<span class="material-icons-round insight-icon" aria-hidden="true">auto_graph</span><p class="insight-placeholder">Complete a few days of check-ins to see your mood insights here.</p>';
    return;
  }
  const last7 = checkins.slice(-7);
  const avg = last7.reduce((s,c) => s+c.mood, 0) / last7.length;
  const avgLabel = MOOD_LABELS[Math.round(avg)] || 'Okay';
  el.innerHTML = `<span class="material-icons-round insight-icon" aria-hidden="true">auto_graph</span><p style="font-size:0.9rem;color:var(--md-on-surface-variant)">Your average mood this week is <strong style="color:var(--md-primary)">${sanitize(avgLabel)}</strong> (${avg.toFixed(1)}/5). Keep checking in daily for better insights.</p>`;
}
