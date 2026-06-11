import { getStorage, setStorage } from '../core/storage.js';

export function initTheme() {
  const saved = getStorage('theme', 'system');
  applyTheme(saved);
  updateThemeBtns(saved);
}

export function applyTheme(t) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = t === 'dark' || (t === 'system' && prefersDark);
  if (isDark) document.documentElement.setAttribute('data-theme','dark');
  else document.documentElement.removeAttribute('data-theme');
  setStorage('theme', t);
}

export function updateThemeBtns(t) {
  document.querySelectorAll('.theme-opt-btn').forEach(b => {
    const active = b.dataset.theme === t;
    b.classList.toggle('active', active);
    b.setAttribute('aria-pressed', String(active));
  });
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (getStorage('theme','system') === 'system') applyTheme('system');
});
