import { getStorage, setStorage } from '../core/storage.js';
import { todayStr, formatDateDisplay } from '../utils/dateUtils.js';
import { showToast } from '../utils/notifications.js';
import { sanitize, sanitizeDate, matchesQuery, stableSort, parseMarkdown, debounce } from '../utils/helpers.js';
import { openDatePicker } from '../components/pickers.js';
import { setDraftStatus, applyMarkdown, insertAtCursor, setEditorMode } from '../journal/editor.js';

let _notesState = { query: '', sort: 'date-desc' };
let notesDraftTimer = null;

export function initNotesEditor() {
  const textarea = document.getElementById('notes-input');
  const preview = document.getElementById('notes-preview');
  const container = document.getElementById('notes-editor-container');
  const draftStatus = document.getElementById('notes-draft-status');
  const draft = getStorage('notes_draft','');
  if (draft && textarea) { textarea.value = draft; setDraftStatus(draftStatus,'draft'); }

  let _editingNoteIndex = -1;
  let _editingNoteOriginal = null;

  function _notesHasChanges() {
    if (_editingNoteOriginal === null) return false;
    const labelInput = document.getElementById('note-label-input');
    const reminderHidden = document.getElementById('note-reminder-date');
    return (
      (textarea ? textarea.value : '') !== _editingNoteOriginal.content ||
      (labelInput ? labelInput.value : '') !== _editingNoteOriginal.labels ||
      (reminderHidden ? reminderHidden.value : '') !== (_editingNoteOriginal.reminder || '')
    );
  }

  function _notesSetEditMode(index, note) {
    _editingNoteIndex = index;
    _editingNoteOriginal = {
      content: note.content,
      labels: (note.labels || []).join(', '),
      reminder: note.reminder || '',
      _fullNote: note
    };
    const cancelBtn = document.getElementById('cancel-note-edit');
    if (cancelBtn) cancelBtn.style.display = '';
  }

  function _notesClearEditMode() {
    _editingNoteIndex = -1;
    _editingNoteOriginal = null;
    const cancelBtn = document.getElementById('cancel-note-edit');
    if (cancelBtn) cancelBtn.style.display = 'none';
  }

  textarea && textarea.addEventListener('input', () => {
    setDraftStatus(draftStatus,'saving');
    clearTimeout(notesDraftTimer);
    notesDraftTimer = setTimeout(() => {
      setStorage('notes_draft', textarea.value);
      setDraftStatus(draftStatus,'saved');
      if (container.classList.contains('split-mode') || (preview && preview.style.display !== 'none'))
        preview.innerHTML = parseMarkdown(textarea.value);
    }, 800);
  });

  const copyBtn = document.getElementById('notes-copy-btn');
  copyBtn && copyBtn.addEventListener('click', () => {
    if (!textarea || !textarea.value) { showToast('Nothing to copy.', 'error'); return; }
    navigator.clipboard.writeText(textarea.value).then(() => {
      copyBtn.classList.add('copied');
      showToast('Copied to clipboard!', 'success');
      setTimeout(() => copyBtn.classList.remove('copied'), 2000);
    }).catch(() => {
      showToast('Failed to copy.', 'error');
    });
  });
  const editBtn = document.getElementById('notes-edit-mode-btn');
  const prevBtn = document.getElementById('notes-preview-mode-btn');
  const splitBtn = document.getElementById('notes-split-mode-btn');
  editBtn && editBtn.addEventListener('click', () => setEditorMode(textarea, preview, container, 'edit', editBtn, prevBtn, splitBtn));
  prevBtn && prevBtn.addEventListener('click', () => setEditorMode(textarea, preview, container, 'preview', editBtn, prevBtn, splitBtn));
  splitBtn && splitBtn.addEventListener('click', () => setEditorMode(textarea, preview, container, 'split', editBtn, prevBtn, splitBtn));
  document.querySelectorAll('#tab-notes .toolbar-btn[data-md]').forEach(btn => btn.addEventListener('click', () => applyMarkdown(textarea, btn.dataset.md)));
  const imgUpload = document.getElementById('notes-img-upload');
  imgUpload && imgUpload.addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { insertAtCursor(textarea, `\n![${sanitize(file.name)}](${ev.target.result})\n`); setStorage('notes_draft', textarea.value); if (preview && preview.style.display !== 'none') preview.innerHTML = parseMarkdown(textarea.value); };
    reader.readAsDataURL(file); imgUpload.value = '';
  });

  const noteReminderTrigger = document.getElementById('note-reminder-date-trigger');
  const noteReminderDisplay = document.getElementById('note-reminder-display');
  const noteReminderHidden = document.getElementById('note-reminder-date');
  noteReminderTrigger && noteReminderTrigger.addEventListener('click', () => {
    openDatePicker(noteReminderHidden && noteReminderHidden.value ? noteReminderHidden.value : todayStr(), picked => {
      if (noteReminderHidden) noteReminderHidden.value = picked;
      if (noteReminderDisplay) noteReminderDisplay.value = formatDateDisplay(picked);
    });
  });

  const saveNote = document.getElementById('save-note');
  saveNote && saveNote.addEventListener('click', () => {
    if (!textarea || !textarea.value.trim()) { showToast('Nothing to save.', 'error'); return; }
    const notes = getStorage('notes',[]);
    const labelInput = document.getElementById('note-label-input');
    const labels = labelInput ? labelInput.value.split(',').map(l => l.trim().slice(0,30)).filter(Boolean).slice(0,8) : [];
    const reminderVal = noteReminderHidden ? sanitizeDate(noteReminderHidden.value) : '';
    if (_editingNoteIndex >= 0 && _editingNoteIndex < notes.length) {
      const existing = notes[_editingNoteIndex];
      notes[_editingNoteIndex] = Object.assign({}, existing, {
        content: textarea.value.trim().slice(0,10000),
        labels,
        reminder: reminderVal || undefined,
        editedAt: Date.now()
      });
      if (!reminderVal) delete notes[_editingNoteIndex].reminder;
    } else {
      const newNote = { content: textarea.value.trim().slice(0,10000), date: todayStr(), timestamp: Date.now(), id: Date.now() + Math.random(), labels };
      if (reminderVal) newNote.reminder = reminderVal;
      notes.unshift(newNote);
    }
    if (reminderVal) scheduleNoteReminder(reminderVal, textarea.value.trim().slice(0,60));
    if (labelInput) labelInput.value = '';
    if (noteReminderDisplay) noteReminderDisplay.value = '';
    if (noteReminderHidden) noteReminderHidden.value = '';
    setStorage('notes', notes.slice(0,200));
    setStorage('notes_draft','');
    textarea.value = '';
    if (preview) preview.innerHTML = '';
    setDraftStatus(draftStatus,'');
    _notesClearEditMode();
    renderNotesList();
    showToast('Note saved!', 'success');
  });

  const cancelNoteEdit = document.getElementById('cancel-note-edit');
  cancelNoteEdit && cancelNoteEdit.addEventListener('click', () => {
    if (_notesHasChanges()) {
      if (!confirm('Discard changes to this note?')) return;
    }
    if (_editingNoteIndex >= 0 && _editingNoteOriginal) {
      const notes = getStorage('notes',[]);
      const restored = _editingNoteOriginal._fullNote || { content: _editingNoteOriginal.content, labels: _editingNoteOriginal.labels ? _editingNoteOriginal.labels.split(',').map(l=>l.trim()).filter(Boolean) : [], reminder: _editingNoteOriginal.reminder || undefined, date: todayStr(), timestamp: Date.now(), id: Date.now() + Math.random() };
      const insertAt = Math.min(_editingNoteIndex, notes.length);
      notes.splice(insertAt, 0, restored);
      setStorage('notes', notes.slice(0,200));
    }
    textarea && (textarea.value = '');
    if (preview) preview.innerHTML = '';
    const labelInput = document.getElementById('note-label-input');
    if (labelInput) labelInput.value = '';
    if (noteReminderDisplay) noteReminderDisplay.value = '';
    if (noteReminderHidden) noteReminderHidden.value = '';
    setStorage('notes_draft','');
    setDraftStatus(draftStatus,'');
    _notesClearEditMode();
    renderNotesList();
  });

  initNotesEditor._setEditMode = _notesSetEditMode;
  initNotesEditor._clearEditMode = _notesClearEditMode;

  const notesSearch = document.getElementById('notes-search');
  const notesSort = document.getElementById('notes-sort');
  if (notesSearch) {
    const onSearch = debounce(() => { _notesState.query = notesSearch.value.trim(); renderNotesList(); }, 250);
    notesSearch.addEventListener('input', onSearch);
    notesSearch.addEventListener('search', onSearch);
  }
  if (notesSort) {
    notesSort.value = _notesState.sort;
    notesSort.addEventListener('change', () => { _notesState.sort = notesSort.value; renderNotesList(); });
  }

  renderNotesList();
}

export function renderNotesList() {
  const el = document.getElementById('notes-list');
  if (!el) return;
  const allNotes = getStorage('notes',[]);

  const { query, sort } = _notesState;
  let notes = allNotes.filter((n, origIdx) => {
    n._origIdx = origIdx;
    return matchesQuery(query, [n.content, ...(n.labels || [])]);
  });

  notes = stableSort(notes, (a, b) => {
    switch (sort) {
      case 'date-asc':   return (a.timestamp || 0) - (b.timestamp || 0);
      case 'alpha-asc':  return a.content.localeCompare(b.content);
      case 'alpha-desc': return b.content.localeCompare(a.content);
      default:           return (b.timestamp || 0) - (a.timestamp || 0);
    }
  });

  if (!notes.length) {
    el.innerHTML = `<p class="search-no-results">${allNotes.length ? 'No notes match your search.' : 'No notes yet.'}</p>`;
    return;
  }

  el.innerHTML = notes.map((n) => {
    const i = n._origIdx;
    return `
    <div class="note-item" data-id="${sanitize(String(n.id))}">
      <div class="note-item-header">
        <div class="note-item-meta">${sanitize(formatDateDisplay(n.date))}</div>
        <div class="note-item-actions">
          <button class="note-edit-btn" data-i="${i}" aria-label="Edit note" title="Edit"><span class="material-icons-round" aria-hidden="true">edit</span></button>
          <button class="note-delete" data-i="${i}" aria-label="Delete note" title="Delete"><span class="material-icons-round" aria-hidden="true">delete</span></button>
        </div>
      </div>
      ${n.labels && n.labels.length ? `<div class="item-labels">${n.labels.map(l=>`<span class="item-label"><span class="material-icons-round" aria-hidden="true" style="font-size:0.75rem;vertical-align:middle">label</span> ${sanitize(l)}</span>`).join('')}</div>` : ''}
      ${n.reminder ? `<div class="item-reminder"><span class="material-icons-round" aria-hidden="true" style="font-size:0.95rem">alarm</span>${sanitize(formatDateDisplay(n.reminder))}</div>` : ''}
      <div class="note-item-content md-preview">${parseMarkdown(n.content)}</div>
    </div>`;
  }).join('');

  el.querySelectorAll('.note-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const notes = getStorage('notes',[]);
      const idx = parseInt(btn.dataset.i);
      const n = notes[idx];
      if (!n) return;
      const textarea = document.getElementById('notes-input');
      const labelInput = document.getElementById('note-label-input');
      const noteReminderDisplay = document.getElementById('note-reminder-display');
      const noteReminderHidden = document.getElementById('note-reminder-date');
      if (textarea) { textarea.value = n.content; textarea.dispatchEvent(new Event('input')); }
      if (labelInput) labelInput.value = (n.labels || []).join(', ');
      if (n.reminder) {
        if (noteReminderHidden) noteReminderHidden.value = n.reminder;
        if (noteReminderDisplay) noteReminderDisplay.value = formatDateDisplay(n.reminder);
      } else {
        if (noteReminderHidden) noteReminderHidden.value = '';
        if (noteReminderDisplay) noteReminderDisplay.value = '';
      }
      if (initNotesEditor._setEditMode) initNotesEditor._setEditMode(idx, n);
      notes.splice(idx, 1);
      setStorage('notes', notes);
      renderNotesList();
      const tab = document.querySelector('.tab[data-tab="notes"]'); if (tab) tab.click();
      textarea && textarea.scrollIntoView({behavior:'smooth'});
    });
  });
  el.querySelectorAll('.note-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!confirm('Delete this note?')) return;
      const notes = getStorage('notes',[]); notes.splice(parseInt(btn.dataset.i), 1);
      setStorage('notes', notes); renderNotesList();
    });
  });
}

export function scheduleNoteReminder(reminderDate, label) {
  if (!reminderDate) return;
  const remTime = new Date(reminderDate + 'T09:00:00').getTime();
  const now = Date.now();
  if (remTime <= now) return;
  const reminders = getStorage('note_reminders', []);
  const entry = { reminderDate, remTime, label: (label || '').slice(0, 60) };
  const existing = reminders.findIndex(r => r.reminderDate === reminderDate && r.label === entry.label);
  if (existing >= 0) reminders[existing] = entry;
  else reminders.push(entry);
  setStorage('note_reminders', reminders.slice(0, 50));
  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

export function scheduleJournalReminder(date, reminderDate) {
  scheduleNoteReminder(reminderDate, 'Journal: ' + date);
}

export function checkReminders() {
  const reminders = getStorage('note_reminders', []);
  if (!reminders.length) return;
  const now = Date.now();
  let changed = false;
  const updated = reminders.filter(r => {
    if (r.remTime <= now + 60000 && r.remTime >= now - 3600000) {
      if (r.remTime <= now) {
        const msg = r.label ? `Reminder: ${r.label}` : `Reminder for ${r.reminderDate}`;
        showToast(msg, 'success');
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification('StudyHub Reminder', { body: msg });
        }
        changed = true;
        return false;
      }
    }
    return r.remTime > now - 3600000;
  });
  if (changed) setStorage('note_reminders', updated);
}

setInterval(checkReminders, 60000);
checkReminders();
