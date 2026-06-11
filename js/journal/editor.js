import { parseMarkdown } from '../utils/helpers.js';

export function setDraftStatus(el, state) {
  if (!el) return;
  el.className = 'draft-status';
  if (state === 'saving') { el.className += ' saving'; el.textContent = 'Saving draft…'; }
  else if (state === 'saved') { el.className += ' saved'; el.textContent = 'Draft saved · ' + new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}); }
  else if (state === 'draft') { el.textContent = 'Unsaved draft restored'; }
  else { el.textContent = ''; }
}

export function applyMarkdown(textarea, type) {
  if (!textarea) return;
  const start = textarea.selectionStart, end = textarea.selectionEnd;
  const sel = textarea.value.slice(start, end);
  const before = textarea.value.slice(0, start), after = textarea.value.slice(end);
  let insert = '';
  switch(type) {
    case 'bold': insert = `**${sel||'bold text'}**`; break;
    case 'italic': insert = `*${sel||'italic text'}*`; break;
    case 'heading': insert = `\n## ${sel||'Heading'}\n`; break;
    case 'ul': insert = `\n- ${sel||'List item'}\n`; break;
    case 'ol': insert = `\n1. ${sel||'List item'}\n`; break;
    case 'code': insert = sel.includes('\n') ? `\`\`\`\n${sel||'code'}\n\`\`\`` : `\`${sel||'code'}\``; break;
    case 'link': insert = `[${sel||'link text'}](https://)`; break;
    case 'image': insert = `![${sel||'alt text'}](https://)`; break;
    default: insert = sel;
  }
  textarea.value = before + insert + after;
  textarea.focus();
  textarea.dispatchEvent(new Event('input'));
}

export function insertAtCursor(textarea, text) {
  if (!textarea) return;
  const start = textarea.selectionStart;
  textarea.value = textarea.value.slice(0, start) + text + textarea.value.slice(textarea.selectionEnd);
  textarea.selectionStart = textarea.selectionEnd = start + text.length;
  textarea.dispatchEvent(new Event('input'));
}

export function setEditorMode(textarea, preview, container, mode, editBtn, prevBtn, splitBtn) {
  [editBtn, prevBtn, splitBtn].forEach(b => { if (b) { b.classList.remove('active'); b.setAttribute('aria-pressed','false'); } });
  container.classList.remove('split-mode');
  if (mode === 'edit') {
    if (editBtn) { editBtn.classList.add('active'); editBtn.setAttribute('aria-pressed','true'); }
    if (textarea) textarea.style.display = '';
    if (preview) preview.style.display = 'none';
  } else if (mode === 'preview') {
    if (prevBtn) { prevBtn.classList.add('active'); prevBtn.setAttribute('aria-pressed','true'); }
    if (preview) { preview.innerHTML = parseMarkdown(textarea ? textarea.value : ''); preview.style.display = ''; }
    if (textarea) textarea.style.display = 'none';
  } else {
    if (splitBtn) { splitBtn.classList.add('active'); splitBtn.setAttribute('aria-pressed','true'); }
    container.classList.add('split-mode');
    if (textarea) textarea.style.display = '';
    if (preview) { preview.innerHTML = parseMarkdown(textarea ? textarea.value : ''); preview.style.display = ''; }
  }
}
