import { getStorage, setStorage } from '../core/storage.js';
import { todayStr, formatDateDisplay, formatTimeTo12 } from '../utils/dateUtils.js';
import { showToast } from '../utils/notifications.js';
import { sanitize, sanitizeDate, sanitizeTime, matchesQuery, stableSort, debounce } from '../utils/helpers.js';
import { openDatePicker, openTimePicker } from '../components/pickers.js';
import { PRIORITY_ORDER } from '../core/constants.js';

let _todoState = { query: '', sort: 'date-desc' };

export function initTodo() {
  const todoInput = document.getElementById('todo-input');
  todoInput && todoInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { document.getElementById('add-todo') && document.getElementById('add-todo').click(); }
  });
  const todoAllDay = document.getElementById('todo-allday');
  const todoTimeDisplay = document.getElementById('todo-time-display');
  const todoTimeHidden = document.getElementById('todo-time');
  todoAllDay && todoAllDay.addEventListener('change', () => {
    const fg = todoTimeDisplay ? todoTimeDisplay.closest('.field-group') : null;
    if (fg) fg.style.opacity = todoAllDay.checked ? '0.4' : '';
    if (todoAllDay.checked) { if (todoTimeDisplay) todoTimeDisplay.value = ''; if (todoTimeHidden) todoTimeHidden.value = ''; }
  });
  const todoDTrigger = document.getElementById('todo-date-trigger');
  const todoDDisplay = document.getElementById('todo-date-display');
  const todoDHidden = document.getElementById('todo-date');
  const openTodoDate = () => openDatePicker((todoDHidden && todoDHidden.value) || todayStr(), picked => { if (todoDHidden) todoDHidden.value = picked; if (todoDDisplay) todoDDisplay.value = formatDateDisplay(picked); });
  todoDTrigger && todoDTrigger.addEventListener('click', openTodoDate);
  todoDDisplay && todoDDisplay.addEventListener('click', openTodoDate);
  const todoTTrigger = document.getElementById('todo-time-trigger');
  todoTTrigger && todoTTrigger.addEventListener('click', () => openTimePicker((todoTimeHidden && todoTimeHidden.value) || '', picked => { if (todoTimeHidden) todoTimeHidden.value = picked; if (todoTimeDisplay) todoTimeDisplay.value = formatTimeTo12(picked); }));
  document.getElementById('add-todo') && document.getElementById('add-todo').addEventListener('click', () => {
    const text = todoInput ? todoInput.value.trim().slice(0,200) : '';
    if (!text) { showToast('Enter a task first.','error'); return; }
    const dateVal = todoDHidden ? sanitizeDate(todoDHidden.value) : '';
    const timeVal = todoTimeHidden ? sanitizeTime(todoTimeHidden.value) : '';
    const allday = todoAllDay ? todoAllDay.checked : false;
    let deadline = null;
    if (dateVal) deadline = allday ? dateVal+'T23:59:59' : (timeVal ? dateVal+'T'+timeVal : dateVal+'T23:59:59');
    const priorEl = document.getElementById('todo-priority');
    const progEl = document.getElementById('todo-progress');
    const priority = priorEl && ['Low','Medium','High','Urgent'].includes(priorEl.value) ? priorEl.value : 'Medium';
    const progress = progEl && ['Not Started','In Progress','Done'].includes(progEl.value) ? progEl.value : 'Not Started';
    const todos = getStorage('todos',[]);

    if (_editingTodoId) {
      const idx = todos.findIndex(t => String(t.id) === String(_editingTodoId));
      if (idx >= 0) {
        todos[idx] = Object.assign({}, todos[idx], {
          text, deadline, allday, priority, progress,
          editedAt: Date.now()
        });
        if (progress === 'Done' && !todos[idx].completedAt) {
          todos[idx].completedAt = Date.now();
        } else if (progress !== 'Done') {
          todos[idx].completedAt = null;
        }
      }
    } else {
      todos.push({ text, deadline, allday, priority, progress, addedAt: Date.now(), completedAt: progress==='Done'?Date.now():null, id: Date.now()+Math.random() });
    }
    setStorage('todos', todos);
    _resetTodoForm();
    _clearTodoEditMode();
    renderTodos(); showToast(_editingTodoId ? 'Task updated!' : 'Task added!','success');
  });

  const todoSearch = document.getElementById('todo-search');
  const todoSort = document.getElementById('todo-sort');
  if (todoSearch) {
    const onSearch = debounce(() => { _todoState.query = todoSearch.value.trim(); renderTodos(); }, 250);
    todoSearch.addEventListener('input', onSearch);
    todoSearch.addEventListener('search', onSearch);
  }
  if (todoSort) {
    todoSort.value = _todoState.sort;
    todoSort.addEventListener('change', () => { _todoState.sort = todoSort.value; renderTodos(); });
  }

  const cancelTodoEdit = document.getElementById('cancel-todo-edit');
  cancelTodoEdit && cancelTodoEdit.addEventListener('click', () => {
    if (_editingTodoOriginal) {
      if (!confirm('Discard changes to this task?')) return;
    }
    _clearTodoEditMode();
    _resetTodoForm();
  });

  renderTodos();
}

function _setTodoEditMode(todo) {
  _editingTodoId = todo.id;
  _editingTodoOriginal = { ...todo };
  const cancelBtn = document.getElementById('cancel-todo-edit');
  if (cancelBtn) cancelBtn.style.display = '';
}

function _clearTodoEditMode() {
  _editingTodoId = null;
  _editingTodoOriginal = null;
  const cancelBtn = document.getElementById('cancel-todo-edit');
  if (cancelBtn) cancelBtn.style.display = 'none';
  const addBtn = document.getElementById('add-todo');
  if (addBtn) {
    addBtn.innerHTML = '<span class="material-icons-round" aria-hidden="true">add</span>Add Task';
  }
}

function _resetTodoForm() {
  const todoInput = document.getElementById('todo-input');
  const todoDHidden = document.getElementById('todo-date');
  const todoDDisplay = document.getElementById('todo-date-display');
  const todoTimeHidden = document.getElementById('todo-time');
  const todoTimeDisplay = document.getElementById('todo-time-display');
  const todoAllDay = document.getElementById('todo-allday');
  const todoPriorEl = document.getElementById('todo-priority');
  const todoProgEl = document.getElementById('todo-progress');
  const todoTimeFg = todoTimeDisplay ? todoTimeDisplay.closest('.field-group') : null;

  if (todoInput) todoInput.value = '';
  if (todoDHidden) todoDHidden.value = '';
  if (todoDDisplay) todoDDisplay.value = '';
  if (todoTimeHidden) todoTimeHidden.value = '';
  if (todoTimeDisplay) todoTimeDisplay.value = '';
  if (todoAllDay) {
    todoAllDay.checked = false;
    if (todoTimeFg) todoTimeFg.style.opacity = '';
  }
  if (todoPriorEl) todoPriorEl.value = 'Medium';
  if (todoProgEl) todoProgEl.value = 'Not Started';
}

export function renderTodos() {
  const el = document.getElementById('todo-list');
  if (!el) return;
  let todos = getStorage('todos',[]);
  const now = Date.now();

  todos = todos.filter(t => {
    if (t.progress==='Done' && t.completedAt && now-t.completedAt >= 86400000) return false;
    if (t.deadline && t.progress!=='Done' && new Date(t.deadline).getTime()+86400000 < now) return false;
    return true;
  });
  setStorage('todos', todos);

  const { query, sort } = _todoState;
  const visible = todos.filter(t =>
    matchesQuery(query, [t.text, t.priority, t.progress])
  );

  const sorted = stableSort(visible, (a, b) => {
    switch (sort) {
      case 'date-asc':      return (a.addedAt || 0) - (b.addedAt || 0);
      case 'alpha-asc':     return a.text.localeCompare(b.text);
      case 'alpha-desc':    return b.text.localeCompare(a.text);
      case 'deadline-asc':  return (a.deadline ? new Date(a.deadline).getTime() : Infinity) - (b.deadline ? new Date(b.deadline).getTime() : Infinity);
      case 'deadline-desc': return (b.deadline ? new Date(b.deadline).getTime() : -Infinity) - (a.deadline ? new Date(a.deadline).getTime() : -Infinity);
      case 'priority-asc':  return (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2);
      case 'priority-desc': return (PRIORITY_ORDER[b.priority] ?? 2) - (PRIORITY_ORDER[a.priority] ?? 2);
      default:              return (b.addedAt || 0) - (a.addedAt || 0);
    }
  });

  if (!sorted.length) {
    el.innerHTML = `<li style="color:var(--md-on-surface-variant);font-size:0.875rem;padding:0.5rem 0;list-style:none;">${todos.length ? 'No tasks match your search.' : 'No tasks yet.'}</li>`;
    return;
  }

  const prMap = { Low:'badge-low', Medium:'badge-medium', High:'badge-high', Urgent:'badge-urgent' };
  const pgMap = { 'Not Started':'badge-notstarted', 'In Progress':'badge-inprogress', 'Done':'badge-done' };

  el.innerHTML = sorted.map(t => `
    <li class="todo-item${t.progress==='Done'?' done':''}">
      <input type="checkbox" ${t.progress==='Done'?'checked':''} data-id="${sanitize(String(t.id))}" aria-label="Mark ${sanitize(t.text)} as done">
      <div class="todo-item-text">
        <div>${sanitize(t.text)}</div>
        <div class="todo-meta">${t.deadline?'Due: '+sanitize(new Date(t.deadline).toLocaleString()):'No deadline'}</div>
        <div class="todo-badges">
          <span class="badge ${sanitize(prMap[t.priority]||'badge-medium')}">${sanitize(t.priority)}</span>
          <span class="badge ${sanitize(pgMap[t.progress]||'badge-notstarted')}">${sanitize(t.progress)}</span>
        </div>
      </div>
      <div class="todo-item-actions">
        <button class="todo-edit" data-id="${sanitize(String(t.id))}" aria-label="Edit task"><span class="material-icons-round" aria-hidden="true">edit</span></button>
        <button class="todo-delete" data-id="${sanitize(String(t.id))}" aria-label="Delete task"><span class="material-icons-round" aria-hidden="true">delete</span></button>
      </div>
    </li>`).join('');

  el.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      const id = cb.dataset.id;
      let todos = getStorage('todos',[]);
      const idx = todos.findIndex(t => String(t.id) === id);
      if (idx < 0) return;
      todos[idx].progress = todos[idx].progress==='Done'?'Not Started':'Done';
      todos[idx].completedAt = todos[idx].progress==='Done'?Date.now():null;
      setStorage('todos', todos); renderTodos();
    });
  });
  el.querySelectorAll('.todo-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!confirm('Delete this task?')) return;
      const id = btn.dataset.id;
      let todos = getStorage('todos',[]);
      const idx = todos.findIndex(t => String(t.id) === id);
      if (idx < 0) return;
      todos.splice(idx, 1);
      setStorage('todos', todos); renderTodos();
    });
  });

  el.querySelectorAll('.todo-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      let todos = getStorage('todos',[]);
      const todo = todos.find(t => String(t.id) === id);
      if (!todo) return;

      const todoInput = document.getElementById('todo-input');
      const todoDHidden = document.getElementById('todo-date');
      const todoDDisplay = document.getElementById('todo-date-display');
      const todoTimeHidden = document.getElementById('todo-time');
      const todoTimeDisplay = document.getElementById('todo-time-display');
      const todoAllDay = document.getElementById('todo-allday');
      const todoPriorEl = document.getElementById('todo-priority');
      const todoProgEl = document.getElementById('todo-progress');
      const todoTimeFg = todoTimeDisplay ? todoTimeDisplay.closest('.field-group') : null;

      if (todoInput) todoInput.value = todo.text;
      if (todo.deadline) {
        const d = new Date(todo.deadline);
        const dateStr = d.toISOString().slice(0,10);
        const timeStr = d.toTimeString().slice(0,5);
        if (todoDHidden) todoDHidden.value = dateStr;
        if (todoDDisplay) todoDDisplay.value = formatDateDisplay(dateStr);
        if (todoTimeHidden) todoTimeHidden.value = timeStr;
        if (todoTimeDisplay) todoTimeDisplay.value = formatTimeTo12(timeStr);
      } else {
        if (todoDHidden) todoDHidden.value = '';
        if (todoDDisplay) todoDDisplay.value = '';
        if (todoTimeHidden) todoTimeHidden.value = '';
        if (todoTimeDisplay) todoTimeDisplay.value = '';
      }
      if (todoAllDay) {
        todoAllDay.checked = todo.allday || false;
        if (todoTimeFg) todoTimeFg.style.opacity = todo.allday ? '0.4' : '';
      }
      if (todoPriorEl) todoPriorEl.value = todo.priority || 'Medium';
      if (todoProgEl) todoProgEl.value = todo.progress || 'Not Started';

      _setTodoEditMode(todo);
      const addBtn = document.getElementById('add-todo');
      if (addBtn) {
        addBtn.innerHTML = '<span class="material-icons-round" aria-hidden="true">save</span>Update Task';
      }

      const tab = document.querySelector('.tab[data-tab="todo"]');
      if (tab) tab.click();
      if (todoInput) todoInput.scrollIntoView({behavior:'smooth'});
    });
  });
}
