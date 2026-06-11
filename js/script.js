'use strict';

import { initDatePicker, initTimePicker, closeDatePicker, closeTimePicker } from './components/pickers.js';
import { initOnboarding } from './features/onboarding.js';
import { initTheme } from './features/theme.js';
import { initHome, updateHomeDashboard } from './features/home.js';
import { initCheckin } from './features/checkin.js';
import { initJournalEditor } from './journal/journal.js';
import { initNotesEditor } from './notes/notes.js';
import { initTodo } from './todo/todo.js';
import { initHabits } from './habits/habits.js';
import { initCalendar } from './calendar/calendar.js';
import { initFlashcards } from './flashcards/flashcards.js';
import { initMusic } from './music/music.js';
import { initPomodoro } from './pomodoro/pomodoro.js';
import { initWellness } from './wellness/wellness.js';
import { initInsights, renderInsights } from './insights/insights.js';
import { initSettings } from './settings/settings.js';
import { initShop, renderShop, updateCoinDisplay } from './shop/shop.js';
import { initStreakCalendar } from './streak/streakCalendar.js';
import { initCountdown } from './countdown/countdown.js';
import './migrations/migrateJournalReminders.js';
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initOnboarding();
  initMobileDrawer();
  initCheckin();
  initJournal();
  initStreakCard();
  initTodo();
  initHabits();
  initCalendar();
  initFlashcards();
  initMusic();
  initPomodoro();
  initWellness();
  initInsights();
  initSettings();
  initDatePicker();
  initTimePicker();
  initHome();
  initShop();
  initStreakCalendar();
  initCountdown();
  updateCoinDisplay();
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
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { window.closeMobileDrawer(); closeDatePicker(); closeTimePicker(); } });
}

function initJournal() {
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
  
  initNotesEditor();
  initJournalEditor();
}

function initStreakCard() {
  if (!document.getElementById('home-streak-card')) return;
  
  const streakCard = document.getElementById('home-streak-card');
  const streakDialog = document.getElementById('streak-calendar-dialog');
  if (streakCard && streakDialog) {
    streakCard.addEventListener('click', () => {
      streakDialog.setAttribute('aria-hidden', 'false');
      streakDialog.style.display = 'flex';
    });
    streakCard.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        streakDialog.setAttribute('aria-hidden', 'false');
        streakDialog.style.display = 'flex';
      }
    });
  }

  const habitsCard = document.getElementById('home-habits-card');
  if (habitsCard) {
    habitsCard.addEventListener('click', () => {
      window.location.href = 'journal.html#habits';
    });
    habitsCard.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        window.location.href = 'journal.html#habits';
      }
    });
  }

  const focusCard = document.getElementById('home-focus-card');
  if (focusCard) {
    focusCard.addEventListener('click', () => {
      window.location.href = 'study.html';
    });
    focusCard.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        window.location.href = 'study.html';
      }
    });
  }

  const journalCard = document.getElementById('home-journal-card');
  if (journalCard) {
    journalCard.addEventListener('click', () => {
      window.location.href = 'journal.html';
    });
    journalCard.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        window.location.href = 'journal.html';
      }
    });
  }
}