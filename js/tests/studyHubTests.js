import { getStorage, setStorage } from '../core/storage.js';
import { todayStr } from '../utils/dateUtils.js';
import { scheduleNoteReminder, scheduleJournalReminder, checkReminders } from '../notes/notes.js';
import { renderNotesList } from '../notes/notes.js';
import { renderJournalHistory } from '../journal/journal.js';
import { renderTodos } from '../todo/todo.js';
import { updateHomeDashboard } from '../features/home.js';
import { debounce, matchesQuery, stableSort } from '../utils/helpers.js';
import { PRIORITY_ORDER } from '../core/constants.js';
import { openTimePicker, closeTimePicker, updateTPPeriod, updateTPLabel, updateTPSegments, tpParseInput, tpSmartPeriod, tpTo24 } from '../components/pickers.js';
import { initOnboarding, _obUpdateSpotlight, _obTarget, _obClamp } from '../features/onboarding.js';
import { ONBOARDING_STEPS } from '../core/constants.js';
import { renderDPCalendar, renderDPYearGrid } from '../components/pickers.js';

const StudyHub = {
  runTests() {
    let passed = 0, failed = 0;
    function assert(desc, condition) {
      if (condition) { console.log('%c✔ ' + desc, 'color:green'); passed++; }
      else { console.error('%c✗ ' + desc, 'color:red'); failed++; }
    }

    const LS_BACKUP = {};
    function lsSet(k, v) { LS_BACKUP[k] = localStorage.getItem(k); localStorage.setItem(k, JSON.stringify(v)); }
    function lsRestore() { Object.keys(LS_BACKUP).forEach(k => { if (LS_BACKUP[k] === null) localStorage.removeItem(k); else localStorage.setItem(k, LS_BACKUP[k]); }); }
    function resetState() { 
      if (window._notesState) { window._notesState.query=''; window._notesState.sort='date-desc'; }
      if (window._journalState) { window._journalState.query=''; window._journalState.sort='date-desc'; }
      if (window._todoState) { window._todoState.query=''; window._todoState.sort='date-desc'; }
    }

    (function testMigration() {
      const future = new Date(Date.now() + 86400000 * 2);
      const rd = future.toISOString().slice(0, 10);
      const rt = new Date(rd + 'T09:00:00').getTime();
      lsSet('journal_reminders', [{ journalDate: '2099-01-01', reminderDate: rd, remTime: rt }]);
      lsSet('note_reminders', []);
      try {
        const old = getStorage('journal_reminders', null);
        if (old && Array.isArray(old) && old.length) {
          const existing = getStorage('note_reminders', []);
          const existingKeys = new Set(existing.map(r => r.remTime + '_' + r.label));
          const migrated = old.map(r => ({ reminderDate: r.reminderDate, remTime: r.remTime, label: 'Journal: ' + r.journalDate })).filter(r => !existingKeys.has(r.remTime + '_' + r.label));
          if (migrated.length) setStorage('note_reminders', existing.concat(migrated).slice(0, 50));
          localStorage.removeItem('journal_reminders');
        }
      } catch {}
      const result = getStorage('note_reminders', []);
      assert('Migration: journal_reminders → note_reminders', result.length === 1 && result[0].label === 'Journal: 2099-01-01');
      assert('Migration: journal_reminders key removed', localStorage.getItem('journal_reminders') === null);
      lsRestore();
    })();

    (function testScheduleNote() {
      lsSet('note_reminders', []);
      const future = new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10);
      scheduleNoteReminder(future, 'Test note');
      const reminders = getStorage('note_reminders', []);
      assert('scheduleNoteReminder: stores to note_reminders', reminders.length === 1 && reminders[0].label === 'Test note');
      assert('scheduleNoteReminder: no journal_reminders written', !localStorage.getItem('journal_reminders'));
      scheduleNoteReminder('2000-01-01', 'Past note');
      assert('scheduleNoteReminder: ignores past dates', getStorage('note_reminders', []).length === 1);
      lsRestore();
    })();

    (function testJournalAlias() {
      lsSet('note_reminders', []);
      const future = new Date(Date.now() + 86400000 * 4).toISOString().slice(0, 10);
      scheduleJournalReminder('2099-03-01', future);
      const reminders = getStorage('note_reminders', []);
      assert('scheduleJournalReminder alias: stores to note_reminders', reminders.length === 1 && reminders[0].label.includes('Journal:'));
      lsRestore();
    })();

    (function testCheckReminders() {
      const pastTime = Date.now() - 30000;
      lsSet('note_reminders', [{ reminderDate: '2000-01-01', remTime: pastTime, label: 'Check test' }]);
      let toasted = false;
      const orig = window.showToast;
      window.showToast = (msg) => { if (msg.includes('Check test')) toasted = true; };
      checkReminders();
      window.showToast = orig;
      assert('checkReminders: fires toast', toasted);
      assert('checkReminders: removes fired reminder', getStorage('note_reminders', []).length === 0);
      lsRestore();
    })();

    (function testNoteSaveReminder() {
      lsSet('notes', []);
      const future = new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 10);
      const fakeNote = { content: 'Hello reminder', date: todayStr(), timestamp: Date.now(), id: 1, labels: [], reminder: future };
      setStorage('notes', [fakeNote]);
      assert('Notes: reminder field persists on note object', getStorage('notes', [])[0].reminder === future);
      lsRestore();
    })();

    (function testNoteTagsOnEdit() {
      lsSet('notes', [{ content: 'Tag test', date: todayStr(), timestamp: Date.now(), id: 2, labels: ['study', 'math'] }]);
      const noteList = document.getElementById('notes-list');
      if (!noteList) { assert('Notes tag edit: notes-list in DOM', false); lsRestore(); return; }
      resetState(); renderNotesList();
      const editBtn = noteList.querySelector('.note-edit-btn');
      if (!editBtn) { assert('Notes tag edit: edit button rendered', false); lsRestore(); return; }
      editBtn.click();
      const labelInput = document.getElementById('note-label-input');
      assert('Notes tag edit: label input populated', labelInput && labelInput.value === 'study, math');
      lsRestore(); resetState();
    })();

    (function testJournalTagsOnEdit() {
      lsSet('journals', { '2099-06-01': 'Journal content here' });
      lsSet('journal_meta', { '2099-06-01': { labels: ['reflection', 'goals'] } });
      const jHistory = document.getElementById('journal-history');
      if (!jHistory) { assert('Journal tag edit: journal-history in DOM', false); lsRestore(); return; }
      resetState(); renderJournalHistory();
      const editBtn = jHistory.querySelector('.journal-action-btn.edit');
      if (!editBtn) { assert('Journal tag edit: edit button rendered', false); lsRestore(); return; }
      editBtn.click();
      const jLabelInput = document.getElementById('journal-label-input');
      assert('Journal tag edit: label input populated', jLabelInput && jLabelInput.value === 'reflection, goals');
      lsRestore(); resetState();
    })();

    (function testCancelHiddenByDefault() {
      const cn = document.getElementById('cancel-note-edit');
      const cj = document.getElementById('cancel-journal-edit');
      assert('Cancel Note: hidden by default', !cn || cn.style.display === 'none' || cn.offsetParent === null);
      assert('Cancel Journal: hidden by default', !cj || cj.style.display === 'none' || cj.offsetParent === null);
    })();

    (function testNoteReminderUI() {
      assert('Notes: reminder trigger exists', !!document.getElementById('note-reminder-date-trigger'));
      assert('Notes: reminder display exists', !!document.getElementById('note-reminder-display'));
      assert('Notes: reminder hidden input exists', !!document.getElementById('note-reminder-date'));
    })();

    (function testJournalReminderRemoved() {
      assert('Journal: old reminder trigger removed', !document.getElementById('journal-reminder-date-trigger'));
      assert('Journal: old reminder display removed', !document.getElementById('journal-reminder-display'));
      assert('Journal: old reminder hidden removed', !document.getElementById('journal-reminder-date'));
    })();

    (function testDebounce() {
      let calls = 0;
      const fn = debounce(() => calls++, 50);
      fn(); fn(); fn();
      assert('debounce: multiple rapid calls do not fire immediately', calls === 0);
    })();

    (function testMatchesQuery() {
      assert('matchesQuery: empty query matches all', matchesQuery('', ['anything']));
      assert('matchesQuery: case-insensitive hit', matchesQuery('HELLO', ['hello world']));
      assert('matchesQuery: matches any field', matchesQuery('math', ['algebra', 'math notes']));
      assert('matchesQuery: no match returns false', !matchesQuery('xyz', ['abc', 'def']));
      assert('matchesQuery: null/undefined fields ignored', matchesQuery('test', [null, undefined, 'test']));
    })();

    (function testStableSort() {
      const arr = [{ v: 1, k: 'b' }, { v: 1, k: 'a' }, { v: 2, k: 'c' }];
      const sorted = stableSort(arr, (a, b) => a.v - b.v);
      assert('stableSort: ascending by value', sorted[0].v === 1 && sorted[2].v === 2);
      assert('stableSort: equal elements preserve original order', sorted[0].k === 'b' && sorted[1].k === 'a');
      assert('stableSort: does not mutate original array', arr[0].k === 'b');
    })();

    (function testPriorityOrder() {
      assert('PRIORITY_ORDER: Urgent < High < Medium < Low', PRIORITY_ORDER.Urgent < PRIORITY_ORDER.High && PRIORITY_ORDER.High < PRIORITY_ORDER.Medium && PRIORITY_ORDER.Medium < PRIORITY_ORDER.Low);
    })();

    (function testNotesSearchContent() {
      lsSet('notes', [
        { content: 'Alpha note', date: todayStr(), timestamp: 1, id: 100, labels: [] },
        { content: 'Beta note',  date: todayStr(), timestamp: 2, id: 101, labels: [] }
      ]);
      const el = document.getElementById('notes-list');
      if (!el) { assert('Notes search content: notes-list in DOM', false); lsRestore(); return; }
      if (window._notesState) window._notesState.query = 'alpha';
      renderNotesList();
      assert('Notes search: shows matching note', el.querySelectorAll('.note-item').length === 1);
      assert('Notes search: correct note shown', el.innerHTML.includes('Alpha note'));
      lsRestore(); resetState();
    })();

    (function testNotesSearchTag() {
      lsSet('notes', [
        { content: 'No tag note', date: todayStr(), timestamp: 1, id: 200, labels: [] },
        { content: 'Tagged note', date: todayStr(), timestamp: 2, id: 201, labels: ['physics'] }
      ]);
      const el = document.getElementById('notes-list');
      if (!el) { assert('Notes search tag: notes-list in DOM', false); lsRestore(); return; }
      if (window._notesState) window._notesState.query = 'physics';
      renderNotesList();
      assert('Notes search: tag match returns 1 result', el.querySelectorAll('.note-item').length === 1);
      lsRestore(); resetState();
    })();

    (function testNotesSearchEmpty() {
      lsSet('notes', [
        { content: 'A', date: todayStr(), timestamp: 1, id: 300, labels: [] },
        { content: 'B', date: todayStr(), timestamp: 2, id: 301, labels: [] }
      ]);
      const el = document.getElementById('notes-list');
      if (!el) { assert('Notes search empty: notes-list in DOM', false); lsRestore(); return; }
      if (window._notesState) window._notesState.query = '';
      renderNotesList();
      assert('Notes search: empty query shows all', el.querySelectorAll('.note-item').length === 2);
      lsRestore(); resetState();
    })();

    (function testNotesSortAlpha() {
      lsSet('notes', [
        { content: 'Zebra', date: todayStr(), timestamp: 1, id: 400, labels: [] },
        { content: 'Apple', date: todayStr(), timestamp: 2, id: 401, labels: [] }
      ]);
      const el = document.getElementById('notes-list');
      if (!el) { assert('Notes sort alpha: notes-list in DOM', false); lsRestore(); return; }
      if (window._notesState) { window._notesState.query = ''; window._notesState.sort = 'alpha-asc'; }
      renderNotesList();
      const items = el.querySelectorAll('.note-item-content');
      assert('Notes sort alpha-asc: Apple before Zebra', items[0].textContent.includes('Apple'));
      lsRestore(); resetState();
    })();

    (function testNotesSortDateDesc() {
      lsSet('notes', [
        { content: 'Older', date: todayStr(), timestamp: 1000, id: 500, labels: [] },
        { content: 'Newer', date: todayStr(), timestamp: 9000, id: 501, labels: [] }
      ]);
      const el = document.getElementById('notes-list');
      if (!el) { assert('Notes sort date-desc: notes-list in DOM', false); lsRestore(); return; }
      if (window._notesState) { window._notesState.query = ''; window._notesState.sort = 'date-desc'; }
      renderNotesList();
      const items = el.querySelectorAll('.note-item-content');
      assert('Notes sort date-desc: Newer first', items[0].textContent.includes('Newer'));
      lsRestore(); resetState();
    })();

    (function testJournalSearch() {
      lsSet('journals', { '2099-01-01': 'Alpha entry', '2099-02-01': 'Beta entry' });
      lsSet('journal_meta', {});
      const el = document.getElementById('journal-history');
      if (!el) { assert('Journal search: journal-history in DOM', false); lsRestore(); return; }
      if (window._journalState) window._journalState.query = 'beta';
      renderJournalHistory();
      assert('Journal search: shows only matching entry', el.querySelectorAll('.journal-item').length === 1);
      assert('Journal search: correct entry shown', el.innerHTML.includes('Beta entry'));
      lsRestore(); resetState();
    })();

    (function testJournalSearchLabel() {
      lsSet('journals', { '2099-03-01': 'Some content', '2099-04-01': 'Other content' });
      lsSet('journal_meta', { '2099-03-01': { labels: ['mindfulness'] }, '2099-04-01': { labels: [] } });
      const el = document.getElementById('journal-history');
      if (!el) { assert('Journal search label: journal-history in DOM', false); lsRestore(); return; }
      if (window._journalState) window._journalState.query = 'mindfulness';
      renderJournalHistory();
      assert('Journal search: label match shows 1 result', el.querySelectorAll('.journal-item').length === 1);
      lsRestore(); resetState();
    })();

    (function testJournalSortDateAsc() {
      lsSet('journals', { '2099-06-01': 'June', '2099-01-01': 'January' });
      lsSet('journal_meta', {});
      const el = document.getElementById('journal-history');
      if (!el) { assert('Journal sort: journal-history in DOM', false); lsRestore(); return; }
      if (window._journalState) { window._journalState.query = ''; window._journalState.sort = 'date-asc'; }
      renderJournalHistory();
      const items = el.querySelectorAll('.journal-item-preview');
      assert('Journal sort date-asc: January before June', items[0].textContent.includes('January'));
      lsRestore(); resetState();
    })();

    (function testTodoSearch() {
      lsSet('todos', [
        { text: 'Buy milk', priority: 'Low', progress: 'Not Started', addedAt: Date.now(), id: 600 },
        { text: 'Write report', priority: 'High', progress: 'Not Started', addedAt: Date.now(), id: 601 }
      ]);
      const el = document.getElementById('todo-list');
      if (!el) { assert('Todo search: todo-list in DOM', false); lsRestore(); return; }
      if (window._todoState) window._todoState.query = 'report';
      renderTodos();
      assert('Todo search: shows only matching task', el.querySelectorAll('.todo-item').length === 1);
      assert('Todo search: correct task shown', el.innerHTML.includes('Write report'));
      lsRestore(); resetState();
    })();

    (function testTodoSortPriority() {
      lsSet('todos', [
        { text: 'Low task', priority: 'Low', progress: 'Not Started', addedAt: 1, id: 700 },
        { text: 'Urgent task', priority: 'Urgent', progress: 'Not Started', addedAt: 2, id: 701 }
      ]);
      const el = document.getElementById('todo-list');
      if (!el) { assert('Todo priority sort: todo-list in DOM', false); lsRestore(); return; }
      if (window._todoState) { window._todoState.query = ''; window._todoState.sort = 'priority-asc'; }
      renderTodos();
      const items = el.querySelectorAll('.todo-item div:first-child');
      assert('Todo sort priority-asc: Urgent first', items[0] && items[0].textContent.includes('Urgent'));
      lsRestore(); resetState();
    })();

    (function testTodoSortDeadline() {
      lsSet('todos', [
        { text: 'Far deadline', priority: 'Low', progress: 'Not Started', addedAt: 1, id: 800, deadline: '2099-12-31T23:59:59' },
        { text: 'Near deadline', priority: 'Low', progress: 'Not Started', addedAt: 2, id: 801, deadline: '2099-01-01T23:59:59' }
      ]);
      const el = document.getElementById('todo-list');
      if (!el) { assert('Todo deadline sort: todo-list in DOM', false); lsRestore(); return; }
      if (window._todoState) { window._todoState.query = ''; window._todoState.sort = 'deadline-asc'; }
      renderTodos();
      const items = el.querySelectorAll('.todo-item');
      assert('Todo sort deadline-asc: Near deadline first', items[0] && items[0].textContent.includes('Near deadline'));
      lsRestore(); resetState();
    })();

    (function testTodoDeleteById() {
      lsSet('todos', [
        { text: 'Keep me', priority: 'Low', progress: 'Not Started', addedAt: 1, id: 'keep-1' },
        { text: 'Delete me', priority: 'High', progress: 'Not Started', addedAt: 2, id: 'del-1' }
      ]);
      const el = document.getElementById('todo-list');
      if (!el) { assert('Todo delete by id: todo-list in DOM', false); lsRestore(); return; }
      if (window._todoState) { window._todoState.query = ''; window._todoState.sort = 'priority-asc'; }
      renderTodos();
      const delBtn = el.querySelector('.todo-delete');
      if (!delBtn) { assert('Todo delete by id: delete button rendered', false); lsRestore(); return; }
      delBtn.click();
      const remaining = getStorage('todos', []);
      assert('Todo delete by id: correct item removed', remaining.length === 1 && remaining[0].id === 'keep-1');
      lsRestore(); resetState();
    })();

    (function testSearchUIExists() {
      assert('DOM: notes-search input', !!document.getElementById('notes-search'));
      assert('DOM: notes-sort select', !!document.getElementById('notes-sort'));
      assert('DOM: journal-search input', !!document.getElementById('journal-search'));
      assert('DOM: journal-sort select', !!document.getElementById('journal-sort'));
      assert('DOM: todo-search input', !!document.getElementById('todo-search'));
      assert('DOM: todo-sort select', !!document.getElementById('todo-sort'));
    })();

    (function testNoResultsMessage() {
      lsSet('notes', [{ content: 'Only note', date: todayStr(), timestamp: 1, id: 900, labels: [] }]);
      const el = document.getElementById('notes-list');
      if (!el) { assert('No-results: notes-list in DOM', false); lsRestore(); return; }
      if (window._notesState) window._notesState.query = 'zzzzzznomatch';
      renderNotesList();
      assert('No-results: message shown when search has no match', el.querySelector('.search-no-results') !== null);
      lsRestore(); resetState();
    })();

    (function testSidebarCoinIcon() {
      const coinEl = document.getElementById('sidebar-coins');
      if (!coinEl) { assert('Sidebar coins: element exists', false); return; }
      const icon = coinEl.querySelector('.material-icons-round.sidebar-coin-icon');
      assert('Sidebar coin: uses material-icons-round.sidebar-coin-icon', !!icon);
      assert('Sidebar coin: icon text is "toll"', icon && icon.textContent.trim() === 'toll');
      assert('Sidebar coin: no 🪙 emoji present', !coinEl.innerHTML.includes('🪙'));
    })();

    (function testJournalLabelIcon() {
      lsSet('journals', { '2099-07-01': 'Test entry' });
      lsSet('journal_meta', { '2099-07-01': { labels: ['test-label'] } });
      const el = document.getElementById('journal-history');
      if (!el) { assert('Journal label icon: journal-history in DOM', false); lsRestore(); return; }
      resetState(); renderJournalHistory();
      assert('Journal label: no 🏷 emoji in rendered HTML', !el.innerHTML.includes('🏷'));
      assert('Journal label: uses material-icons-round', el.querySelector('.item-label .material-icons-round') !== null);
      lsRestore(); resetState();
    })();

    (function testOnboardingDOM() {
      assert('Onboarding: overlay element exists', !!document.getElementById('onboarding-overlay'));
      assert('Onboarding: SVG mask exists', !!document.getElementById('onboarding-mask'));
      assert('Onboarding: spotlight-hole rect exists', !!document.getElementById('spotlight-hole'));
      assert('Onboarding: tooltip element exists', !!document.getElementById('onboarding-tooltip'));
      assert('Onboarding: next button exists', !!document.getElementById('onboarding-next'));
      assert('Onboarding: skip button exists', !!document.getElementById('onboarding-skip'));
      assert('Onboarding: dots container exists', !!document.getElementById('onboarding-dots'));
      assert('Onboarding: legacy .onboarding-card removed', !document.querySelector('.onboarding-card'));
      assert('Onboarding: legacy .onboarding-scrim removed', !document.querySelector('.onboarding-scrim'));
    })();

    (function testOnboardingSteps() {
      assert('ONBOARDING_STEPS: array defined', Array.isArray(ONBOARDING_STEPS));
      assert('ONBOARDING_STEPS: at least 4 steps', ONBOARDING_STEPS.length >= 4);
      ONBOARDING_STEPS.forEach((s, i) => {
        assert(`Step ${i}: has icon`, typeof s.icon === 'string' && s.icon.length > 0);
        assert(`Step ${i}: has title`, typeof s.title === 'string' && s.title.length > 0);
        assert(`Step ${i}: has body`, typeof s.body === 'string' && s.body.length > 0);
      });
      const navSteps = ONBOARDING_STEPS.filter(s => s.targetSelector && s.targetSelector.includes('#sidebar'));
      assert('Onboarding: nav steps highlight entire sidebar/bottom-nav', navSteps.length >= 2);
      const individualNavTargets = ONBOARDING_STEPS.filter(s =>
        s.targetSelector && (s.targetSelector.includes('.nav-item') || s.targetSelector.includes('.bnav-item'))
      );
      assert('Onboarding: no step targets individual nav items', individualNavTargets.length === 0);
    })();

    (function testObClamp() {
      assert('_obClamp: clamps to min', _obClamp(-5, 0, 100) === 0);
      assert('_obClamp: clamps to max', _obClamp(200, 0, 100) === 100);
      assert('_obClamp: passes through mid', _obClamp(50, 0, 100) === 50);
    })();

    (function testObTarget() {
      assert('_obTarget: returns null for null selector', _obTarget(null) === null);
      assert('_obTarget: finds body element', _obTarget('body') === document.body);
      assert('_obTarget: comma-separated falls back', _obTarget('.nonexistent-xyz, body') === document.body);
      assert('_obTarget: returns null if no match', _obTarget('.absolutely-nonexistent-xyz') === null);
    })();

    (function testOnboardingRestart() {
      assert('initOnboarding.restart: function exposed', typeof initOnboarding.restart === 'function');
    })();

    (function testRestartResetsFlag() {
      lsSet('onboarding_done', true);
      setStorage('onboarding_done', false);
      assert('Restart: onboarding_done reset to false', getStorage('onboarding_done', true) === false);
      lsRestore();
    })();

    (function testMobileGreetingDOM() {
      assert('Mobile greeting: container exists', !!document.getElementById('mobile-home-greeting'));
      assert('Mobile greeting: time span exists', !!document.getElementById('mobile-greeting-time'));
      assert('Mobile greeting: name span exists', !!document.getElementById('mobile-greeting-name'));
      assert('Mobile greeting: no "StudyHub" title beside hamburger', !document.querySelector('.mobile-page-header--home .mobile-page-title'));
    })();

    (function testMobileGreetingUpdate() {
      lsSet('profile_name', 'Alice');
      updateHomeDashboard();
      const nameEl = document.getElementById('mobile-greeting-name');
      const timeEl = document.getElementById('mobile-greeting-time');
      assert('Mobile greeting: name updated by updateHomeDashboard', nameEl && nameEl.textContent === 'Alice');
      assert('Mobile greeting: time updated by updateHomeDashboard', timeEl && timeEl.textContent.length > 0);
      lsRestore();
    })();

    (function testRestartButtonInSettings() {
      assert('Settings: restart-onboarding button exists', !!document.getElementById('restart-onboarding'));
    })();

    (function testSpotlightNoTarget() {
      const hole = document.getElementById('spotlight-hole');
      if (!hole) { assert('Spotlight: hole element exists', false); return; }
      _obUpdateSpotlight(null, 0);
      assert('Spotlight: no-target sets width=0', hole.getAttribute('width') === '0');
      assert('Spotlight: no-target sets height=0', hole.getAttribute('height') === '0');
    })();

    (function testThemeButtonA11y() {
      const btns = document.querySelectorAll('.theme-opt-btn');
      assert('Theme buttons: at least 3 exist', btns.length >= 3);
      btns.forEach(b => {
        assert(`Theme btn "${b.dataset.theme}": has aria-pressed`, b.hasAttribute('aria-pressed'));
        assert(`Theme btn "${b.dataset.theme}": has data-theme`, !!b.dataset.theme);
      });
    })();

    (function testMobileBottomNav() {
      const nav = document.getElementById('bottom-nav');
      assert('Mobile bottom-nav: element exists', !!nav);
      assert('Mobile bottom-nav: has bnav-item buttons', nav && nav.querySelectorAll('.bnav-item').length >= 4);
      assert('Mobile bottom-nav: has role=navigation', nav && nav.getAttribute('role') === 'navigation');
    })();

    (function testObTargetFixed() {
      const sidebar = document.getElementById('sidebar');
      if (sidebar) {
        const origDisplay = sidebar.style.display;
        sidebar.style.display = 'flex';
        const found = _obTarget('#sidebar');
        assert('_obTarget: handles #sidebar selector without throwing', true);
        sidebar.style.display = origDisplay;
      }
      assert('_obTarget: null selector returns null', _obTarget(null) === null);
      assert('_obTarget: empty selector returns null', _obTarget('.no-such-element-xyz') === null);
    })();

    (function testSpotlightViewportClamp() {
      const hole = document.getElementById('spotlight-hole');
      if (!hole) { assert('Spotlight: hole element exists for clamp test', false); return; }
      const el = document.createElement('div');
      el.style.cssText = 'position:fixed;left:-50px;top:-50px;width:100px;height:100px;';
      document.body.appendChild(el);
      _obUpdateSpotlight(el, 10);
      const x = parseFloat(hole.getAttribute('x'));
      const y = parseFloat(hole.getAttribute('y'));
      assert('Spotlight: x clamped to >= 0', x >= 0);
      assert('Spotlight: y clamped to >= 0', y >= 0);
      document.body.removeChild(el);
      hole.setAttribute('width', '0');
      hole.setAttribute('height', '0');
    })();

    (function testRestartAlwaysExposed() {
      assert('initOnboarding.restart: always a function', typeof initOnboarding.restart === 'function');
    })();

    (function testMobileHomeHeader() {
      const header = document.querySelector('.mobile-page-header--home');
      assert('Mobile home: header exists', !!header);
      const hamburger = header && header.querySelector('#hamburger-btn');
      assert('Mobile home: hamburger is inside header', !!hamburger);
      const greeting = header && header.querySelector('#mobile-home-greeting');
      assert('Mobile home: greeting is inside header', !!greeting);
      if (header && hamburger && greeting) {
        const children = Array.from(header.children);
        const hIdx = children.indexOf(hamburger);
        const gIdx = children.indexOf(greeting);
        assert('Mobile home: hamburger comes before greeting in DOM', hIdx < gIdx);
      }
    })();

    (function testTpParseInput24h() {
      let r;
      r = tpParseInput('23:00');
      assert('tpParseInput: 23:00 → hour=11', r && r.hour === 11);
      assert('tpParseInput: 23:00 → minute=0', r && r.minute === 0);
      assert('tpParseInput: 23:00 → period=PM', r && r.period === 'PM');

      r = tpParseInput('13:30');
      assert('tpParseInput: 13:30 → hour=1', r && r.hour === 1);
      assert('tpParseInput: 13:30 → minute=30', r && r.minute === 30);
      assert('tpParseInput: 13:30 → period=PM', r && r.period === 'PM');

      r = tpParseInput('00:15');
      assert('tpParseInput: 00:15 → hour=12', r && r.hour === 12);
      assert('tpParseInput: 00:15 → minute=15', r && r.minute === 15);
      assert('tpParseInput: 00:15 → period=AM', r && r.period === 'AM');

      r = tpParseInput('12:00');
      assert('tpParseInput: 12:00 → hour=12', r && r.hour === 12);
      assert('tpParseInput: 12:00 → period=PM', r && r.period === 'PM');

      r = tpParseInput('00:00');
      assert('tpParseInput: 00:00 → hour=12', r && r.hour === 12);
      assert('tpParseInput: 00:00 → period=AM', r && r.period === 'AM');
    })();

    (function testTpParseInput12h() {
      let r;
      r = tpParseInput('11:30 PM');
      assert('tpParseInput: 11:30 PM → hour=11', r && r.hour === 11);
      assert('tpParseInput: 11:30 PM → minute=30', r && r.minute === 30);
      assert('tpParseInput: 11:30 PM → period=PM', r && r.period === 'PM');

      r = tpParseInput('12am');
      assert('tpParseInput: 12am → hour=12', r && r.hour === 12);
      assert('tpParseInput: 12am → period=AM', r && r.period === 'AM');

      r = tpParseInput('12pm');
      assert('tpParseInput: 12pm → hour=12', r && r.hour === 12);
      assert('tpParseInput: 12pm → period=PM', r && r.period === 'PM');

      r = tpParseInput('3:15pm');
      assert('tpParseInput: 3:15pm → hour=3', r && r.hour === 3);
      assert('tpParseInput: 3:15pm → minute=15', r && r.minute === 15);
      assert('tpParseInput: 3:15pm → period=PM', r && r.period === 'PM');
    })();

    (function testTpParseInputCompact() {
      let r;
      r = tpParseInput('930');
      assert('tpParseInput: "930" → hour=9', r && r.hour === 9);
      assert('tpParseInput: "930" → minute=30', r && r.minute === 30);

      r = tpParseInput('1330');
      assert('tpParseInput: "1330" → hour=1', r && r.hour === 1);
      assert('tpParseInput: "1330" → period=PM', r && r.period === 'PM');

      r = tpParseInput('9');
      assert('tpParseInput: "9" → hour=9, minute=0', r && r.hour === 9 && r.minute === 0);
    })();

    (function testTpParseInputInvalid() {
      assert('tpParseInput: null → null', tpParseInput(null) === null);
      assert('tpParseInput: "" → null', tpParseInput('') === null);
      assert('tpParseInput: "abc" → null', tpParseInput('abc') === null);
      assert('tpParseInput: "99:00" → null', tpParseInput('99:00') === null);
      assert('tpParseInput: "12:99" → null', tpParseInput('12:99') === null);
    })();

    (function testTpSmartPeriod() {
      const r1 = tpSmartPeriod(9, 0);
      assert('tpSmartPeriod: returns AM or PM for 9:00', r1 === 'AM' || r1 === 'PM');

      const r2 = tpSmartPeriod(12, 0);
      assert('tpSmartPeriod: returns AM or PM for 12:00', r2 === 'AM' || r2 === 'PM');

      const r3 = tpSmartPeriod(1, 0);
      assert('tpSmartPeriod: returns AM or PM for 1:00', r3 === 'AM' || r3 === 'PM');
    })();

    (function testTpTo24() {
      assert('tpTo24: 12:00 AM → 00:00', tpTo24(12, 0, 'AM') === '00:00');
      assert('tpTo24: 12:00 PM → 12:00', tpTo24(12, 0, 'PM') === '12:00');
      assert('tpTo24: 1:30 PM → 13:30',  tpTo24(1, 30, 'PM') === '13:30');
      assert('tpTo24: 11:59 PM → 23:59', tpTo24(11, 59, 'PM') === '23:59');
      assert('tpTo24: 1:00 AM → 01:00',  tpTo24(1, 0, 'AM') === '01:00');
      assert('tpTo24: 12:30 AM → 00:30', tpTo24(12, 30, 'AM') === '00:30');
    })();

    (function testTimepickerDOM() {
      assert('TP: dialog exists', !!document.getElementById('time-picker-dialog'));
      assert('TP: hour button exists', !!document.getElementById('tp-hour-btn'));
      assert('TP: minute button exists', !!document.getElementById('tp-min-btn'));
      assert('TP: AM button exists', !!document.getElementById('tp-am'));
      assert('TP: PM button exists', !!document.getElementById('tp-pm'));
      assert('TP: OK button exists', !!document.getElementById('tp-ok'));
      assert('TP: Cancel button exists', !!document.getElementById('tp-cancel'));
      assert('TP: hint element exists', !!document.getElementById('tp-input-hint'));
    })();

    (function testTPOpenClose() {
      const dialog = document.getElementById('time-picker-dialog');
      openTimePicker('14:30', () => {});
      assert('TP: dialog visible after open', dialog && dialog.getAttribute('aria-hidden') === 'false');
      assert('TP: tpHour=2 after 14:30', tpHour === 2);
      assert('TP: tpMinute=30 after 14:30', tpMinute === 30);
      assert('TP: tpPeriod=PM after 14:30', tpPeriod === 'PM');
      closeTimePicker();
      assert('TP: dialog hidden after close', dialog && dialog.getAttribute('aria-hidden') === 'true');
      assert('TP: callback cleared after close', tpCallback === null);

      openTimePicker('00:00', () => {});
      assert('TP: tpHour=12 for 00:00', tpHour === 12);
      assert('TP: tpPeriod=AM for 00:00', tpPeriod === 'AM');
      closeTimePicker();

      openTimePicker('12:00', () => {});
      assert('TP: tpHour=12 for 12:00', tpHour === 12);
      assert('TP: tpPeriod=PM for 12:00', tpPeriod === 'PM');
      closeTimePicker();
    })();

    (function testTPPeriodToggle() {
      openTimePicker('09:00', () => {});
      assert('TP: initial period AM for 09:00', tpPeriod === 'AM');
      tpPeriod = 'PM';
      updateTPPeriod();
      updateTPLabel();
      const label = document.getElementById('tp-selected-label');
      assert('TP: label shows PM after toggle', label && label.textContent.includes('PM'));
      const pmBtn = document.getElementById('tp-pm');
      assert('TP: pm button active after toggle', pmBtn && pmBtn.classList.contains('active'));
      const amBtn = document.getElementById('tp-am');
      assert('TP: am button inactive after toggle', amBtn && !amBtn.classList.contains('active'));
      closeTimePicker();
    })();

    (function testTPOKOutput() {
      let result = null;
      openTimePicker('', t => { result = t; });
      tpHour = 11; tpMinute = 45; tpPeriod = 'PM';
      updateTPSegments(); updateTPLabel();
      const timeStr = tpTo24(tpHour, tpMinute, tpPeriod);
      assert('TP: 11:45 PM → 23:45', timeStr === '23:45');

      tpHour = 12; tpMinute = 15; tpPeriod = 'AM';
      assert('TP: 12:15 AM → 00:15', tpTo24(tpHour, tpMinute, tpPeriod) === '00:15');

      tpHour = 12; tpMinute = 0; tpPeriod = 'PM';
      assert('TP: 12:00 PM → 12:00', tpTo24(tpHour, tpMinute, tpPeriod) === '12:00');
      closeTimePicker();
    })();

    (function testBnavStudy() {
      const bnav = document.getElementById('bottom-nav');
      assert('Bnav: element exists', !!bnav);
      const studyBtn = bnav && bnav.querySelector('[data-page="study"].bnav-item');
      assert('Bnav: Study item present', !!studyBtn);
      const insightsBtn = bnav && bnav.querySelector('[data-page="insights"].bnav-item');
      assert('Bnav: Insights item removed from bottom nav', !insightsBtn);
      const studyIcon = studyBtn && studyBtn.querySelector('.bnav-icon');
      assert('Bnav: Study uses school icon', studyIcon && studyIcon.textContent.trim() === 'school');
    })();

    (function testInsightsSidebar() {
      const sidebarInsights = document.querySelector('.sidebar [data-page="insights"].nav-item');
      assert('Sidebar: Insights nav-item still present', !!sidebarInsights);
    })();

    (function testBnavCount() {
      const bnav = document.getElementById('bottom-nav');
      const items = bnav && bnav.querySelectorAll('.bnav-item');
      assert('Bnav: exactly 5 items', items && items.length === 5);
    })();

    (function testDpYearClasses() {
      const origDate = typeof dpCurrentDate !== 'undefined' ? dpCurrentDate : null;
      if (typeof renderDPYearGrid === 'function' && document.getElementById('dp-year-grid')) {
        if (typeof dpCurrentDate !== 'undefined') dpCurrentDate = new Date().toISOString().slice(0,10);
        renderDPYearGrid();
        const grid = document.getElementById('dp-year-grid');
        const selectedBtns  = grid && grid.querySelectorAll('.dp-year-btn.selected');
        const currentBtns   = grid && grid.querySelectorAll('.dp-year-btn.current-year');
        assert('DpYear: at most one selected button', !selectedBtns || selectedBtns.length <= 1);
        assert('DpYear: at most one current-year button', !currentBtns || currentBtns.length <= 1);
        if (selectedBtns && selectedBtns.length === 1 && selectedBtns[0].classList.contains('current-year')) {
          assert('DpYear: current-year.selected button exists', true);
        }
        if (origDate && typeof dpCurrentDate !== 'undefined') dpCurrentDate = origDate;
      } else {
        assert('DpYear: year grid element exists', !!document.getElementById('dp-year-grid'));
      }
    })();

    (function testTPSegmentContrast() {
      openTimePicker('10:30', () => {});
      const hourBtn = document.getElementById('tp-hour-btn');
      const minBtn  = document.getElementById('tp-min-btn');
      assert('TP contrast: hour button active class on open', hourBtn && hourBtn.classList.contains('active'));
      assert('TP contrast: minute button not active on open', minBtn && !minBtn.classList.contains('active'));
      tpMode = 'minute';
      updateTPSegments();
      assert('TP contrast: hour button loses active after switch', hourBtn && !hourBtn.classList.contains('active'));
      assert('TP contrast: minute button gains active after switch', minBtn && minBtn.classList.contains('active'));
      closeTimePicker();
    })();

    (function testDpDayClasses() {
      if (typeof renderDPCalendar !== 'function') {
        assert('DP: renderDPCalendar accessible', false); return;
      }
      if (typeof dpCurrentDate !== 'undefined') {
        const saved = dpCurrentDate;
        dpCurrentDate = new Date().toISOString().slice(0,10);
        const calView = document.getElementById('dp-calendar-view');
        const yrView  = document.getElementById('dp-year-view');
        if (calView) calView.style.display = '';
        if (yrView)  yrView.style.display  = 'none';
        renderDPCalendar();
        const days = document.getElementById('dp-days');
        if (days) {
          const todayBtns    = days.querySelectorAll('.dp-day.today');
          const selectedBtns = days.querySelectorAll('.dp-day.selected');
          const otherBtns    = days.querySelectorAll('.dp-day.other-month');
          assert('DP: at most one today marker', todayBtns.length <= 1);
          assert('DP: other-month days present', otherBtns.length >= 0);
        }
        dpCurrentDate = saved;
      }
    })();

    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    return { passed, failed };
  }
};

export default StudyHub;
