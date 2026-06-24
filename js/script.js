'use strict';

import { initDatePicker, initTimePicker, closeDatePicker, closeTimePicker } from './components/pickers.js';
import { initOnboarding } from './features/onboarding.js';
import { initTheme } from './features/theme.js';
import { initHome, updateHomeDashboard } from './features/home.js';
import { initCheckin } from './features/checkin.js';
import { initDiaryEditor } from './diary/diary.js';

import { initializePet } from './pet/main.js';
import { initInsights } from './insights/insights.js';
import { initSettings } from './settings/settings.js';
import { initShop, renderShop, updateCoinDisplay } from './shop/shop.js';
import { initStreakCalendar, openStreakCalendar, closeStreakCalendar } from './streak/streakCalendar.js';
import { initCountdown } from './countdown/countdown.js';
import { initIcons } from './core/icons.js';
import { getStorage, setStorage } from './core/storage.js';
import { showToast } from './utils/notifications.js';

function showProfilePromptToast() {
  const toast = document.createElement('div');
  toast.className = 'toast info';
  toast.textContent = 'Complete your profile in Settings to personalize your experience. ';
  const link = document.createElement('a');
  link.href = 'settings.html';
  link.textContent = 'Go to Settings';
  link.style.cssText = 'color:inherit;text-decoration:underline;margin-left:0.5rem;';
  toast.appendChild(link);
  const c = document.getElementById('toast-container');
  if (c) {
    c.appendChild(toast);
    setTimeout(() => { toast.style.animation = 'toastOut 0.25s ease forwards'; setTimeout(() => toast.remove(), 250); }, 5000);
  }
}
function checkFirstTimeProfile() {
  const profileName = getStorage('profile_name', '');
  const profilePromptShown = getStorage('profile_prompt_shown', false);
  const onboardingDone = getStorage('onboarding_done', false);
  
  if (!profileName && !profilePromptShown) {
    setStorage('profile_prompt_shown', true);
    
    if (onboardingDone) {
      setTimeout(showProfilePromptToast, 1000);
    } else {
      window.addEventListener('onboarding-complete', () => {
        setTimeout(showProfilePromptToast, 1000);
      }, { once: true });
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initIcons();
  initTheme();
  initOnboarding();
  initMobileDrawer();
  initCheckin();
  initDiary();
  initStreakCard();
  initializePet('#euno-app');
  initInsights();
  initSettings();
  initDatePicker();
  initTimePicker();
  initHome();
  initShop();
  initStreakCalendar();
  initCountdown();
  updateCoinDisplay();
  checkFirstTimeProfile();
  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
  }
});

function initMobileDrawer() {
  const hamburger = document.getElementById('hamburger-btn');
  const drawer = document.getElementById('mobile-drawer');
  const drawerScrim = document.getElementById('drawer-scrim');
  const drawerClose = document.getElementById('drawer-close');

  function openMobileDrawer() {
    drawer.classList.add('open'); drawer.setAttribute('aria-hidden','false');
    hamburger && hamburger.setAttribute('aria-expanded','true');
    document.body.style.overflow = 'hidden';
    const panel = document.getElementById('drawer-panel'); if (panel) panel.focus();
  }
  window.closeMobileDrawer = function() {
    drawer.classList.remove('open'); drawer.setAttribute('aria-hidden','true');
    hamburger && hamburger.setAttribute('aria-expanded','false');
    document.body.style.overflow = '';
  };

  hamburger && hamburger.addEventListener('click', openMobileDrawer);
  drawerScrim && drawerScrim.addEventListener('click', window.closeMobileDrawer);
  drawerClose && drawerClose.addEventListener('click', window.closeMobileDrawer);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      window.closeMobileDrawer?.();
      closeDatePicker();
      closeTimePicker();
      closeStreakCalendar();
    }
  });
}

function initDiary() {
  const tabs = document.querySelectorAll('.tab[data-tab]');
  tabs.forEach(t => {
    t.addEventListener('click', () => {
      tabs.forEach(x => { x.classList.remove('active'); x.setAttribute('aria-selected','false'); });
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      t.classList.add('active'); t.setAttribute('aria-selected','true');
      const panel = document.getElementById('tab-' + t.dataset.tab);
      if (panel) panel.classList.add('active');
    });
  });
  
  const hash = window.location.hash.slice(1);
  if (hash) {
    const targetTab = document.querySelector('.tab[data-tab="' + hash + '"]');
    if (targetTab) {
      tabs.forEach(x => { x.classList.remove('active'); x.setAttribute('aria-selected','false'); });
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      targetTab.classList.add('active'); targetTab.setAttribute('aria-selected','true');
      const panel = document.getElementById('tab-' + hash);
      if (panel) panel.classList.add('active');
    }
  }
  
  initDiaryEditor();
}

function initStreakCard() {
  if (!document.getElementById('home-streak-card')) return;

  const streakCard = document.getElementById('home-streak-card');
  if (streakCard) {
    streakCard.addEventListener('click', (e) => openStreakCalendar(e.currentTarget));
    streakCard.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openStreakCalendar(e.currentTarget);
      }
    });
  }


  const diaryCard = document.getElementById('home-diary-card');
  if (diaryCard) {
    diaryCard.addEventListener('click', () => {
      window.location.href = 'diary.html';
    });
    diaryCard.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        window.location.href = 'diary.html';
      }
    });
  }
}