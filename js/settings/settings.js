import { getStorage, setStorage } from '../core/storage.js';
import { todayStr } from '../utils/dateUtils.js';
import { showToast } from '../utils/notifications.js';
import { applyTheme, updateThemeBtns } from '../features/theme.js';
import { initOnboarding } from '../features/onboarding.js';
import { updateHomeDashboard } from '../features/home.js';

export function initSettings() {
  const nameInput = document.getElementById('settings-name');
  const savedName = getStorage('profile_name','');
  const savedGender = getStorage('profile_gender','male');
  if (nameInput) nameInput.value = savedName;
  document.querySelectorAll('.gender-btn').forEach(btn => {
    const active = btn.dataset.gender === savedGender;
    btn.classList.toggle('active', active); btn.setAttribute('aria-pressed', String(active));
    btn.addEventListener('click', () => {
      document.querySelectorAll('.gender-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed','false'); });
      btn.classList.add('active'); btn.setAttribute('aria-pressed','true');
    });
  });
  document.getElementById('save-profile') && document.getElementById('save-profile').addEventListener('click', () => {
    const name = nameInput ? nameInput.value.trim().slice(0,100) : '';
    const genderBtn = document.querySelector('.gender-btn.active');
    const gender = genderBtn ? genderBtn.dataset.gender : 'male';
    setStorage('profile_name', name);
    setStorage('profile_gender', gender);
    showToast('Profile saved!','success');
    updateHomeDashboard();
  });
  document.querySelectorAll('.theme-opt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      applyTheme(btn.dataset.theme); updateThemeBtns(btn.dataset.theme);
    });
  });
  document.getElementById('export-data') && document.getElementById('export-data').addEventListener('click', () => {
    const data = {};
    ['checkins','habits','journals','notes','todos','calendarEvents','pomodoro_sessions','gratitude_entries','flashcard_decks','profile_name','profile_gender','theme'].forEach(k => {
      data[k] = getStorage(k, null);
    });
    const blob = new Blob([JSON.stringify(data, null, 2)],{type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=`studyhub-backup-${todayStr()}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    showToast('Data exported!','success');
  });
  document.getElementById('clear-data') && document.getElementById('clear-data').addEventListener('click', () => {
    if (!confirm('Clear ALL data? This cannot be undone.')) return;
    try { localStorage.clear(); } catch {}
    showToast('All data cleared.','');
    setTimeout(() => location.reload(), 1000);
  });
  document.getElementById('restart-onboarding') && document.getElementById('restart-onboarding').addEventListener('click', () => {
    setStorage('onboarding_done', false);
    if (initOnboarding.restart) initOnboarding.restart();
    else location.reload();
  });
}
