import { getStorage, setStorage } from '../core/storage.js';
import { showToast } from '../utils/notifications.js';
import { applyTheme, updateThemeBtns } from '../features/theme.js';
import { initOnboarding } from '../features/onboarding.js';
import { updateHomeDashboard } from '../features/home.js';
import { downloadBackup, importBackupFile } from '../core/dataSync.js';
import { refreshFromWellnessData } from '../pet/main.js';

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
    downloadBackup();
    showToast('Data exported!','success');
  });

  const importInput = document.getElementById('import-data-file');
  const importBtn = document.getElementById('import-data-btn');
  const importZone = document.getElementById('import-data-zone');

  async function handleImportFile(file) {
    if (!file) return;
    try {
      const count = await importBackupFile(file);
      applyTheme(getStorage('theme', 'system'));
      updateThemeBtns(getStorage('theme', 'system'));
      updateHomeDashboard();
      if (typeof refreshFromWellnessData === 'function') refreshFromWellnessData();
      showToast(`Backup restored (${count} items). Syncing…`, 'success');
      setTimeout(() => location.reload(), 800);
    } catch (err) {
      showToast(err.message || 'Import failed.', 'error');
    } finally {
      if (importInput) importInput.value = '';
    }
  }

  importBtn && importBtn.addEventListener('click', () => importInput && importInput.click());
  importInput && importInput.addEventListener('change', () => handleImportFile(importInput.files && importInput.files[0]));

  if (importZone) {
    importZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      importZone.classList.add('is-dragover');
    });
    importZone.addEventListener('dragleave', () => importZone.classList.remove('is-dragover'));
    importZone.addEventListener('drop', (e) => {
      e.preventDefault();
      importZone.classList.remove('is-dragover');
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      handleImportFile(file);
    });
  }

  document.getElementById('clear-data') && document.getElementById('clear-data').addEventListener('click', () => {
    if (!confirm('Clear ALL data? This cannot be undone.')) return;
    try { localStorage.clear(); } catch {}
    showToast('All data cleared.','');
    setTimeout(() => location.reload(), 1000);
  });
  document.getElementById('restart-onboarding') && document.getElementById('restart-onboarding').addEventListener('click', () => {
    setStorage('onboarding_done', false);
    sessionStorage.setItem('launch_tour', '1');
    window.location.href = 'index.html';
  });
}
