  import { getStorage, setStorage } from '../core/storage.js';
  import { todayStr, formatDateDisplay } from '../utils/dateUtils.js';
  import { showToast } from '../utils/notifications.js';
  import { sanitize, sanitizeDate, matchesQuery, stableSort, parseMarkdown, debounce } from '../utils/helpers.js';
  import { openDatePicker } from '../components/pickers.js';
  import { setDraftStatus, applyMarkdown, insertAtCursor, setEditorMode } from './editor.js';
  import { updateHomeDashboard } from '../features/home.js';
  import { addCoins } from '../shop/shop.js';
  import { DIARY_PROMPTS } from '../core/constants.js';

  let _diaryState = { query: '', sort: 'date-desc' };
  let diaryDraftTimer = null;
  let _viewingMarkdown = '';

  export function initDiaryEditor() {
    const textarea = document.getElementById('diary-entry');
    const preview = document.getElementById('diary-preview');
    const container = document.getElementById('diary-editor-container');
    const draftStatus = document.getElementById('diary-draft-status');
    const diaryCount = document.getElementById('diary-count');
    const diaryTitle = document.getElementById('diary-title');
    const diaryDateDisplay = document.getElementById('diary-date');
    const diaryDateHidden = document.getElementById('diary-date-value');

    let _editingDiaryDate = null;
    let _editingDiaryOriginal = null;

    function _diaryHasChanges() {
      if (_editingDiaryOriginal === null) return false;
      const jLabelInput = document.getElementById('diary-label-input');
      return (
        (textarea ? textarea.value : '') !== _editingDiaryOriginal.content ||
        (jLabelInput ? jLabelInput.value : '') !== _editingDiaryOriginal.labels ||
        (diaryTitle ? diaryTitle.value : '') !== _editingDiaryOriginal.title
      );
    }

    function _diarySetEditMode(date, content, labels, title) {
      _editingDiaryDate = date;
      _editingDiaryOriginal = { content, labels, title: title || '' };
      const cancelBtn = document.getElementById('cancel-diary-edit');
      if (cancelBtn) cancelBtn.style.display = '';
    }

    function _diaryClearEditMode() {
      _editingDiaryDate = null;
      _editingDiaryOriginal = null;
      const cancelBtn = document.getElementById('cancel-diary-edit');
      if (cancelBtn) cancelBtn.style.display = 'none';
    }

    function setDiaryDate(val) {
      if (diaryDateDisplay) diaryDateDisplay.value = val ? formatDateDisplay(val) : '';
      if (diaryDateHidden) diaryDateHidden.value = val || '';
      const diaryMeta = getStorage('diary_meta', {});
      const meta = diaryMeta[val] || {};
      const jLabelInput = document.getElementById('diary-label-input');
      if (jLabelInput) jLabelInput.value = (meta.labels || []).join(', ');
      if (diaryTitle) diaryTitle.value = meta.title || '';
      loadDiaryEntry(val);
      _diaryClearEditMode();
    }
    setDiaryDate(todayStr());

    const diaryViewModal = document.getElementById('diary-view-modal');
    const diaryViewClose = document.getElementById('diary-view-close');
    const diaryViewCopy = document.getElementById('diary-view-copy');

    function closeDiaryModal() {
      diaryViewModal?.classList.remove('open');
      _viewingMarkdown = '';
    }

    diaryViewClose?.addEventListener('click', closeDiaryModal);

    diaryViewCopy?.addEventListener('click', () => {
      if (!_viewingMarkdown) return;
      navigator.clipboard.writeText(_viewingMarkdown).then(() => {
        diaryViewCopy.classList.add('copied');
        showToast('Copied to clipboard!', 'success');
        setTimeout(() => diaryViewCopy.classList.remove('copied'), 2000);
      }).catch(() => {
        showToast('Failed to copy.', 'error');
      });
    });

    diaryViewModal?.addEventListener('click', e => {
      if (e.target === diaryViewModal) {
        closeDiaryModal();
      }
    });

    document.addEventListener('keydown', e => {
      if (
        e.key === 'Escape' &&
        diaryViewModal?.classList.contains('open')
      ) {
        closeDiaryModal();
      }
    });

    const promptGrid = document.getElementById('diary-prompt-grid');
    if (promptGrid) {
      promptGrid.innerHTML = DIARY_PROMPTS.map((p, i) =>
        `<button type="button" class="chip diary-prompt-chip" data-prompt-idx="${i}"><span class="material-icons-round chip-icon" aria-hidden="true">lightbulb</span>${sanitize(p)}</button>`
      ).join('');
      promptGrid.querySelectorAll('.diary-prompt-chip').forEach(btn => {
        btn.addEventListener('click', () => {
          if (!textarea) return;
          const prompt = DIARY_PROMPTS[parseInt(btn.dataset.promptIdx, 10)];
          if (!prompt) return;
          const prefix = textarea.value.trim() ? '\n\n' : '';
          insertAtCursor(textarea, prefix + prompt + '\n');
          if (diaryCount) diaryCount.textContent = textarea.value.length + ' / 10000';
        });
      });
    }

    const dateOpenFn = () => {
      const cur = (diaryDateHidden && diaryDateHidden.value) || todayStr();
      openDatePicker(cur, (picked) => setDiaryDate(picked));
    };
    document.getElementById('diary-date-trigger') && document.getElementById('diary-date-trigger').addEventListener('click', dateOpenFn);
    diaryDateDisplay && diaryDateDisplay.addEventListener('click', dateOpenFn);
    textarea && textarea.addEventListener('input', () => {
      if (diaryCount) diaryCount.textContent = textarea.value.length + ' / 10000';
      setDraftStatus(draftStatus,'saving');
      clearTimeout(diaryDraftTimer);
      const dateKey = (diaryDateHidden && diaryDateHidden.value) || todayStr();
      diaryDraftTimer = setTimeout(() => {
        setStorage('diary_draft_' + dateKey, textarea.value);
        setDraftStatus(draftStatus,'saved');
        if (container.classList.contains('split-mode') || (preview && preview.style.display !== 'none'))
          preview.innerHTML = `<div class="md-preview">${parseMarkdown(textarea.value)}</div>`;
      }, 800);
    });

    const copyBtn = document.getElementById('diary-copy-btn');
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

    const clearBtn = document.getElementById('clear-diary');

    clearBtn?.addEventListener('click', () => {
      if (!textarea) return;

      if (!textarea.value.trim()) {
        showToast('Editor is already empty.', '');
        return;
      }

      if (!confirm('Clear the current diary draft?')) {
        return;
      }

      textarea.value = '';

      const dateKey =
        (diaryDateHidden && diaryDateHidden.value) || todayStr();

      try {
        localStorage.removeItem('diary_draft_' + dateKey);
      } catch { }

      if (preview) {
        preview.innerHTML = '';
      }

      if (diaryCount) {
        diaryCount.textContent = '0 / 10000';
      }

      setDraftStatus(draftStatus, '');

      textarea.dispatchEvent(new Event('input'));

      showToast('Draft cleared.', 'success');
    });
    const editBtn = document.getElementById('diary-edit-mode-btn');
    const prevBtn = document.getElementById('diary-preview-mode-btn');
    const splitBtn = document.getElementById('diary-split-mode-btn');
    editBtn && editBtn.addEventListener('click', () => setEditorMode(textarea, preview, container, 'edit', editBtn, prevBtn, splitBtn));
    prevBtn && prevBtn.addEventListener('click', () => setEditorMode(textarea, preview, container, 'preview', editBtn, prevBtn, splitBtn));
    splitBtn && splitBtn.addEventListener('click', () => setEditorMode(textarea, preview, container, 'split', editBtn, prevBtn, splitBtn));
    document.querySelectorAll('.editor-toolbar .toolbar-btn[data-md]').forEach(btn => btn.addEventListener('click', () => applyMarkdown(textarea, btn.dataset.md)));
    const jImgUpload = document.getElementById('diary-img-upload');
    jImgUpload && jImgUpload.addEventListener('change', e => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        insertAtCursor(textarea, `\n![${sanitize(file.name)}](${ev.target.result})\n`);
        const dateKey = (diaryDateHidden && diaryDateHidden.value) || todayStr();
        setStorage('diary_draft_' + dateKey, textarea.value);
        if (preview && preview.style.display !== 'none') preview.innerHTML = parseMarkdown(textarea.value);
      };
      reader.readAsDataURL(file); jImgUpload.value = '';
    });
    const saveDiary = document.getElementById('save-diary');
    saveDiary && saveDiary.addEventListener('click', () => {
      const date = sanitizeDate((diaryDateHidden && diaryDateHidden.value) || todayStr()) || todayStr();
      const text = textarea ? textarea.value.trim().slice(0,10000) : '';
      if (!text) { showToast('Write something first!', 'error'); return; }
      const jLabelInput = document.getElementById('diary-label-input');
      const diaryMeta = getStorage('diary_meta', {});

      if (_editingDiaryDate) {
        const diarys = getStorage('diarys', {});
        diarys[_editingDiaryDate] = { markdown: text, html: parseMarkdown(text) };
        setStorage('diarys', diarys);
        if (!diaryMeta[_editingDiaryDate]) diaryMeta[_editingDiaryDate] = {};
        const jLabels = jLabelInput ? jLabelInput.value.split(',').map(l => l.trim().slice(0,30)).filter(Boolean).slice(0,8) : [];
        diaryMeta[_editingDiaryDate].labels = jLabels;
        diaryMeta[_editingDiaryDate].title = diaryTitle ? diaryTitle.value.trim().slice(0,120) : '';
        diaryMeta[_editingDiaryDate].updated_at = Date.now();
        setStorage('diary_meta', diaryMeta);
        try { localStorage.removeItem('diary_draft_' + _editingDiaryDate); } catch {}
      } else {
        const entryId = date + '_' + Date.now();
        const diarys = getStorage('diarys', {});
        diarys[entryId] = { markdown: text, html: parseMarkdown(text) };
        setStorage('diarys', diarys);
        if (!diaryMeta[entryId]) diaryMeta[entryId] = {};
        const jLabels = jLabelInput ? jLabelInput.value.split(',').map(l => l.trim().slice(0,30)).filter(Boolean).slice(0,8) : [];
        diaryMeta[entryId].labels = jLabels;
        diaryMeta[entryId].title = diaryTitle ? diaryTitle.value.trim().slice(0,120) : '';
        diaryMeta[entryId].date = date;
        diaryMeta[entryId].created_at = Date.now();
        diaryMeta[entryId].updated_at = Date.now();
        setStorage('diary_meta', diaryMeta);
        try { localStorage.removeItem('diary_draft_' + date); } catch {}
        addCoins(8, 'Diary Entry');
      }

      if (jLabelInput) jLabelInput.value = '';
      if (diaryTitle) diaryTitle.value = '';
      if (textarea) { textarea.value = ''; if (diaryCount) diaryCount.textContent = '0 / 10000'; }
      if (preview) preview.innerHTML = '';
      setDraftStatus(draftStatus,'');
      _diaryClearEditMode();
      showToast('Diary entry saved!', 'success');
      renderDiaryHistory(); updateHomeDashboard();
    });

    const cancelDiaryEdit = document.getElementById('cancel-diary-edit');
    cancelDiaryEdit && cancelDiaryEdit.addEventListener('click', () => {
      if (_diaryHasChanges()) {
        if (!confirm('Discard changes to this diary entry?')) return;
      }
      if (textarea) { textarea.value = ''; if (diaryCount) diaryCount.textContent = '0 / 10000'; }
      const jLabelInput = document.getElementById('diary-label-input');
      if (jLabelInput) jLabelInput.value = '';
      if (diaryTitle) diaryTitle.value = '';
      if (preview) preview.innerHTML = '';
      setDraftStatus(draftStatus,'');
      _diaryClearEditMode();
    });

    initDiaryEditor._setEditMode = _diarySetEditMode;

    const diarySearch = document.getElementById('diary-search');
    const diarySort = document.getElementById('diary-sort');
    if (diarySearch) {
      const onSearch = debounce(() => { _diaryState.query = diarySearch.value.trim(); renderDiaryHistory(); }, 250);
      diarySearch.addEventListener('input', onSearch);
      diarySearch.addEventListener('search', onSearch);
    }
    if (diarySort) {
      diarySort.value = _diaryState.sort;
      diarySort.addEventListener('change', () => { _diaryState.sort = diarySort.value; renderDiaryHistory(); });
    }

    renderDiaryHistory();
  }

  function loadDiaryEntry(date) {
    const textarea = document.getElementById('diary-entry');
    const diaryCount = document.getElementById('diary-count');
    const draftStatus = document.getElementById('diary-draft-status');
    if (!textarea) return;
    const d = sanitizeDate(date) || todayStr();
    const diarys = getStorage('diarys',{});
    const draft = getStorage('diary_draft_' + d, null);
    const saved =
      typeof diarys[d] === 'string'
        ? diarys[d]
        : diarys[d]?.markdown || '';

    if (draft !== null && draft !== saved) { textarea.value = draft; setDraftStatus(draftStatus,'draft'); }
    else {textarea.value = saved;}
    if (diaryCount) diaryCount.textContent = textarea.value.length + ' / 10000';
  }

  export function renderDiaryHistory() {
    const el = document.getElementById('diary-history');
    if (!el) return;
    const diarys = getStorage('diarys',{});
    const diaryMeta = getStorage('diary_meta', {});

    const allEntries = Object.entries(diarys).map(([id, entry]) => {

      const markdown =
        typeof entry === 'string'
          ? entry
          : entry.markdown || '';

      const meta = diaryMeta[id] || {};
      const date = meta.date || id.slice(0, 10);

      return {
        id,
        date,
        text: markdown,
        title: meta.title || '',
        labels: meta.labels || [],
        reminder: meta.reminder || ''
      };
    });

    const { query, sort } = _diaryState;
    let entries = allEntries.filter(e =>
      matchesQuery(query, [e.text, e.title, e.date, ...e.labels])
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
      el.innerHTML = `<p class="search-no-results">${allEntries.length ? 'No entries match your search.' : 'No diary entries yet.'}</p>`;
      return;
    }

    el.innerHTML = entries.map(({ id, date, text, title, labels, reminder }) => `
      <div class="diary-item" role="article">
        <div class="diary-item-header">
          <div>
            ${title ? `<div class="diary-item-title">${sanitize(title)}</div>` : ''}
            <div class="diary-item-date">${sanitize(formatDateDisplay(date))}</div>
          </div>
          <div class="diary-item-actions">
            <button class="diary-action-btn view" data-id="${sanitize(id)}" title="View"><span class="material-icons-round">visibility</span></button>
            <button class="diary-action-btn edit" data-id="${sanitize(id)}" aria-label="Edit entry" title="Edit"><span class="material-icons-round" aria-hidden="true">edit</span></button>
            <button class="diary-action-btn del" data-id="${sanitize(id)}" aria-label="Delete entry" title="Delete"><span class="material-icons-round" aria-hidden="true">delete</span></button>
          </div>
        </div>
        ${labels.length ? `<div class="item-labels">${labels.map(l=>`<span class="item-label"><span class="material-icons-round" aria-hidden="true" style="font-size:0.75rem;vertical-align:middle">label</span> ${sanitize(l)}</span>`).join('')}</div>` : ''}
        ${reminder ? `<div class="item-reminder"><span class="material-icons-round" aria-hidden="true" style="font-size:0.95rem">alarm</span>${sanitize(formatDateDisplay(reminder))}</div>` : ''}
        <div class="diary-item-preview md-preview">${parseMarkdown(text.slice(0,150))}${text.length>150?'<span class="diary-item-ellipsis">…</span>':''}</div>
      </div>`).join('');

    el.querySelectorAll('.diary-action-btn.edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const diaryMeta = getStorage('diary_meta', {});
        const meta = diaryMeta[id] || {};
        const entryDate = meta.date || id.slice(0, 10);
        const dd = document.getElementById('diary-date'); if (dd) dd.value = formatDateDisplay(entryDate);
        const dh = document.getElementById('diary-date-value'); if (dh) dh.value = entryDate;
        const jLabelInput = document.getElementById('diary-label-input');
        const diaryTitleEl = document.getElementById('diary-title');
        if (jLabelInput) jLabelInput.value = (meta.labels || []).join(', ');
        if (diaryTitleEl) diaryTitleEl.value = meta.title || '';
        const diarys = getStorage('diarys', {});
        const entry = diarys[id];
        const markdown = typeof entry === 'string' ? entry : entry?.markdown || '';
        const textarea = document.getElementById('diary-entry');
        const diaryCount = document.getElementById('diary-count');
        if (textarea) { textarea.value = markdown; if (diaryCount) diaryCount.textContent = markdown.length + ' / 10000'; }
        if (initDiaryEditor._setEditMode) {
          initDiaryEditor._setEditMode(id, markdown, (meta.labels || []).join(', '), meta.title || '');
        }
        const jTab = document.querySelector('.tab[data-tab="diary"]'); if (jTab) jTab.click();
        const je = document.getElementById('diary-entry'); if (je) je.scrollIntoView({behavior:'smooth'});
      });
    });
    el.querySelectorAll('.diary-action-btn.del').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!confirm('Delete this diary entry?')) return;
        const diarys = getStorage('diarys', {});
        const diaryMeta = getStorage('diary_meta', {});

        delete diarys[btn.dataset.id];
        delete diaryMeta[btn.dataset.id];

        setStorage('diarys', diarys);
        setStorage('diary_meta', diaryMeta);
        renderDiaryHistory(); updateHomeDashboard();
        showToast('Entry deleted.','');
      });
    });
    el.querySelectorAll('.diary-action-btn.view').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const diarys = getStorage('diarys', {});
        const diaryMeta = getStorage('diary_meta', {});
        const entry = diarys[id];

        if (!entry) return;

        const markdown =
          typeof entry === 'string'
            ? entry
            : entry.markdown || '';

        const meta = diaryMeta[id] || {};
        const entryDate = meta.date || id.slice(0, 10);
        const title = meta.title || formatDateDisplay(entryDate);

        const modal = document.getElementById('diary-view-modal');
        const titleEl = document.getElementById('diary-view-title');
        const bodyEl = document.getElementById('diary-view-body');

        if (!modal || !titleEl || !bodyEl) return;

        titleEl.textContent = title;
        bodyEl.innerHTML = `<div class="md-preview">${parseMarkdown(markdown)}</div>`;
        _viewingMarkdown = markdown;

        modal.classList.add('open');
      });
    });
  }
