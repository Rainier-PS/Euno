import { getStorage, setStorage } from '../core/storage.js';
import { todayStr, formatDateDisplay } from '../utils/dateUtils.js';
import { showToast } from '../utils/notifications.js';
import { sanitize, sanitizeDate, matchesQuery, stableSort, parseMarkdown, debounce } from '../utils/helpers.js';
import { openDatePicker } from '../components/pickers.js';
import { setDraftStatus, applyMarkdown, insertAtCursor, setEditorMode } from './editor.js';
import { updateHomeDashboard } from '../features/home.js';
import { addCoins } from '../shop/shop.js';

let _journalState = { query: '', sort: 'date-desc' };
let journalDraftTimer = null;

export function initJournalEditor() {
  const textarea = document.getElementById('journal-entry');
  const preview = document.getElementById('journal-preview');
  const container = document.getElementById('journal-editor-container');
  const draftStatus = document.getElementById('journal-draft-status');
  const journalCount = document.getElementById('journal-count');
  const journalDateDisplay = document.getElementById('journal-date');
  const journalDateHidden = document.getElementById('journal-date-value');

  let _editingJournalDate = null;
  let _editingJournalOriginal = null;

  function _journalHasChanges() {
    if (_editingJournalOriginal === null) return false;
    const jLabelInput = document.getElementById('journal-label-input');
    return (
      (textarea ? textarea.value : '') !== _editingJournalOriginal.content ||
      (jLabelInput ? jLabelInput.value : '') !== _editingJournalOriginal.labels
    );
  }

  function _journalSetEditMode(date, content, labels) {
    _editingJournalDate = date;
    _editingJournalOriginal = { content, labels };
    const cancelBtn = document.getElementById('cancel-journal-edit');
    if (cancelBtn) cancelBtn.style.display = '';
  }

  function _journalClearEditMode() {
    _editingJournalDate = null;
    _editingJournalOriginal = null;
    const cancelBtn = document.getElementById('cancel-journal-edit');
    if (cancelBtn) cancelBtn.style.display = 'none';
  }

  function setJournalDate(val) {
    if (journalDateDisplay) journalDateDisplay.value = val ? formatDateDisplay(val) : '';
    if (journalDateHidden) journalDateHidden.value = val || '';
    const journalMeta = getStorage('journal_meta', {});
    const meta = journalMeta[val] || {};
    const jLabelInput = document.getElementById('journal-label-input');
    if (jLabelInput) jLabelInput.value = (meta.labels || []).join(', ');
    loadJournalEntry(val);
    _journalClearEditMode();
  }
  setJournalDate(todayStr());
  const dateOpenFn = () => {
    const cur = (journalDateHidden && journalDateHidden.value) || todayStr();
    openDatePicker(cur, (picked) => setJournalDate(picked));
  };
  document.getElementById('journal-date-trigger') && document.getElementById('journal-date-trigger').addEventListener('click', dateOpenFn);
  journalDateDisplay && journalDateDisplay.addEventListener('click', dateOpenFn);
  textarea && textarea.addEventListener('input', () => {
    if (journalCount) journalCount.textContent = textarea.value.length + ' / 10000';
    setDraftStatus(draftStatus,'saving');
    clearTimeout(journalDraftTimer);
    const dateKey = (journalDateHidden && journalDateHidden.value) || todayStr();
    journalDraftTimer = setTimeout(() => {
      setStorage('journal_draft_' + dateKey, textarea.value);
      setDraftStatus(draftStatus,'saved');
      if (container.classList.contains('split-mode') || (preview && preview.style.display !== 'none'))
        preview.innerHTML = parseMarkdown(textarea.value);
    }, 800);
  });

  const copyBtn = document.getElementById('journal-copy-btn');
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
  const editBtn = document.getElementById('journal-edit-mode-btn');
  const prevBtn = document.getElementById('journal-preview-mode-btn');
  const splitBtn = document.getElementById('journal-split-mode-btn');
  editBtn && editBtn.addEventListener('click', () => setEditorMode(textarea, preview, container, 'edit', editBtn, prevBtn, splitBtn));
  prevBtn && prevBtn.addEventListener('click', () => setEditorMode(textarea, preview, container, 'preview', editBtn, prevBtn, splitBtn));
  splitBtn && splitBtn.addEventListener('click', () => setEditorMode(textarea, preview, container, 'split', editBtn, prevBtn, splitBtn));
  document.querySelectorAll('#tab-journal .toolbar-btn[data-md]').forEach(btn => btn.addEventListener('click', () => applyMarkdown(textarea, btn.dataset.md)));
  const jImgUpload = document.getElementById('journal-img-upload');
  jImgUpload && jImgUpload.addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      insertAtCursor(textarea, `\n![${sanitize(file.name)}](${ev.target.result})\n`);
      const dateKey = (journalDateHidden && journalDateHidden.value) || todayStr();
      setStorage('journal_draft_' + dateKey, textarea.value);
      if (preview && preview.style.display !== 'none') preview.innerHTML = parseMarkdown(textarea.value);
    };
    reader.readAsDataURL(file); jImgUpload.value = '';
  });
  const saveJournal = document.getElementById('save-journal');
  saveJournal && saveJournal.addEventListener('click', () => {
    const date = sanitizeDate((journalDateHidden && journalDateHidden.value) || todayStr()) || todayStr();
    const text = textarea ? textarea.value.trim().slice(0,10000) : '';
    if (!text) { showToast('Write something first!', 'error'); return; }
    const journals = getStorage('journals',{});
    journals[date] = text;
    setStorage('journals', journals);
    addCoins(8, 'Journal Entry');
    const jLabelInput = document.getElementById('journal-label-input');
    const journalMeta = getStorage('journal_meta', {});
    if (!journalMeta[date]) journalMeta[date] = {};
    const jLabels = jLabelInput ? jLabelInput.value.split(',').map(l => l.trim().slice(0,30)).filter(Boolean).slice(0,8) : [];
    journalMeta[date].labels = jLabels;
    setStorage('journal_meta', journalMeta);
    if (jLabelInput) jLabelInput.value = '';
    try { localStorage.removeItem('journal_draft_' + date); } catch {}
    setDraftStatus(draftStatus,'');
    _journalClearEditMode();
    showToast('Journal entry saved!', 'success');
    renderJournalHistory(); updateHomeDashboard();
  });

  const cancelJournalEdit = document.getElementById('cancel-journal-edit');
  cancelJournalEdit && cancelJournalEdit.addEventListener('click', () => {
    if (_journalHasChanges()) {
      if (!confirm('Discard changes to this journal entry?')) return;
    }
    if (_editingJournalDate && _editingJournalOriginal) {
      if (textarea) { textarea.value = _editingJournalOriginal.content; if (journalCount) journalCount.textContent = textarea.value.length + ' / 10000'; }
      const jLabelInput = document.getElementById('journal-label-input');
      if (jLabelInput) jLabelInput.value = _editingJournalOriginal.labels;
    } else {
      if (textarea) { textarea.value = ''; if (journalCount) journalCount.textContent = '0 / 10000'; }
      const jLabelInput = document.getElementById('journal-label-input');
      if (jLabelInput) jLabelInput.value = '';
    }
    setDraftStatus(draftStatus,'');
    _journalClearEditMode();
  });

  initJournalEditor._setEditMode = _journalSetEditMode;

  const journalSearch = document.getElementById('journal-search');
  const journalSort = document.getElementById('journal-sort');
  if (journalSearch) {
    const onSearch = debounce(() => { _journalState.query = journalSearch.value.trim(); renderJournalHistory(); }, 250);
    journalSearch.addEventListener('input', onSearch);
    journalSearch.addEventListener('search', onSearch);
  }
  if (journalSort) {
    journalSort.value = _journalState.sort;
    journalSort.addEventListener('change', () => { _journalState.sort = journalSort.value; renderJournalHistory(); });
  }

  renderJournalHistory();
}

function loadJournalEntry(date) {
  const textarea = document.getElementById('journal-entry');
  const journalCount = document.getElementById('journal-count');
  const draftStatus = document.getElementById('journal-draft-status');
  if (!textarea) return;
  const d = sanitizeDate(date) || todayStr();
  const journals = getStorage('journals',{});
  const draft = getStorage('journal_draft_' + d, null);
  if (draft !== null && draft !== (journals[d] || '')) { textarea.value = draft; setDraftStatus(draftStatus,'draft'); }
  else { textarea.value = journals[d] || ''; setDraftStatus(draftStatus,''); }
  if (journalCount) journalCount.textContent = textarea.value.length + ' / 10000';
}

export function renderJournalHistory() {
  const el = document.getElementById('journal-history');
  if (!el) return;
  const journals = getStorage('journals',{});
  const journalMeta = getStorage('journal_meta', {});

  const allEntries = Object.entries(journals).map(([date, text]) => {
    const meta = journalMeta[date] || {};
    return { date, text, labels: meta.labels || [], reminder: meta.reminder || '' };
  });

  const { query, sort } = _journalState;
  let entries = allEntries.filter(e =>
    matchesQuery(query, [e.text, e.date, ...e.labels])
  );

  entries = stableSort(entries, (a, b) => {
    switch (sort) {
      case 'date-asc':   return a.date.localeCompare(b.date);
      case 'alpha-asc':  return a.text.localeCompare(b.text);
      case 'alpha-desc': return b.text.localeCompare(a.text);
      default:           return b.date.localeCompare(a.date);
    }
  });

  entries = entries.slice(0, 20);

  if (!entries.length) {
    el.innerHTML = `<p class="search-no-results">${allEntries.length ? 'No entries match your search.' : 'No journal entries yet.'}</p>`;
    return;
  }

  el.innerHTML = entries.map(({ date, text, labels, reminder }) => `
    <div class="journal-item" role="article">
      <div class="journal-item-header">
        <div class="journal-item-date">${sanitize(formatDateDisplay(date))}</div>
        <div class="journal-item-actions">
          <button class="journal-action-btn edit" data-date="${sanitize(date)}" aria-label="Edit entry" title="Edit"><span class="material-icons-round" aria-hidden="true">edit</span></button>
          <button class="journal-action-btn del" data-date="${sanitize(date)}" aria-label="Delete entry" title="Delete"><span class="material-icons-round" aria-hidden="true">delete</span></button>
        </div>
      </div>
      ${labels.length ? `<div class="item-labels">${labels.map(l=>`<span class="item-label"><span class="material-icons-round" aria-hidden="true" style="font-size:0.75rem;vertical-align:middle">label</span> ${sanitize(l)}</span>`).join('')}</div>` : ''}
      ${reminder ? `<div class="item-reminder"><span class="material-icons-round" aria-hidden="true" style="font-size:0.95rem">alarm</span>${sanitize(formatDateDisplay(reminder))}</div>` : ''}
      <div class="journal-item-preview">${sanitize(text.slice(0,150))}${text.length>150?'…':''}</div>
    </div>`).join('');

  el.querySelectorAll('.journal-action-btn.edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const date = btn.dataset.date;
      const dd = document.getElementById('journal-date'); if (dd) dd.value = formatDateDisplay(date);
      const dh = document.getElementById('journal-date-value'); if (dh) dh.value = date;
      const journalMeta = getStorage('journal_meta', {});
      const meta = journalMeta[date] || {};
      const jLabelInput = document.getElementById('journal-label-input');
      if (jLabelInput) jLabelInput.value = (meta.labels || []).join(', ');
      loadJournalEntry(date);
      const journals = getStorage('journals', {});
      if (initJournalEditor._setEditMode) {
        initJournalEditor._setEditMode(date, journals[date] || '', (meta.labels || []).join(', '));
      }
      const jTab = document.querySelector('.tab[data-tab="journal"]'); if (jTab) jTab.click();
      const je = document.getElementById('journal-entry'); if (je) je.scrollIntoView({behavior:'smooth'});
    });
  });
  el.querySelectorAll('.journal-action-btn.del').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!confirm('Delete this journal entry?')) return;
      const journals = getStorage('journals',{}); delete journals[btn.dataset.date];
      setStorage('journals', journals);
      renderJournalHistory(); updateHomeDashboard();
      showToast('Entry deleted.','');
    });
  });
}
