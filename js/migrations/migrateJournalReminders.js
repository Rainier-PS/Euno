import { getStorage, setStorage } from '../core/storage.js';

function migrateJournalReminders() {
  try {
    const old = getStorage('journal_reminders', null);
    if (!old || !Array.isArray(old) || !old.length) return;
    const existing = getStorage('note_reminders', []);
    const existingKeys = new Set(existing.map(r => r.remTime + '_' + r.label));
    const migrated = old.map(r => ({
      reminderDate: r.reminderDate,
      remTime: r.remTime,
      label: 'Journal: ' + r.journalDate
    })).filter(r => !existingKeys.has(r.remTime + '_' + r.label));
    if (migrated.length) setStorage('note_reminders', existing.concat(migrated).slice(0, 50));
    localStorage.removeItem('journal_reminders');
  } catch {}
}

migrateJournalReminders();
