import { getStorage, setStorage } from '../core/storage.js';
import { todayStr } from '../utils/dateUtils.js';
import { showToast } from '../utils/notifications.js';
import { sanitize } from '../utils/helpers.js';
import { getCurrentWeekDates } from '../features/checkin.js';
import { updateHomeDashboard } from '../features/home.js';
import { addCoins } from '../shop/shop.js';

export function initHabits() {
  const habitInput = document.getElementById('habit-input');
  habitInput && habitInput.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('add-habit') && document.getElementById('add-habit').click(); });
  document.getElementById('add-habit') && document.getElementById('add-habit').addEventListener('click', () => {
    const input = document.getElementById('habit-input');
    const name = input ? input.value.trim().slice(0,100) : '';
    if (!name) { showToast('Enter a habit name.','error'); return; }
    const habits = getStorage('habits',[]);
    habits.push({ name, days:{}, createdAt: todayStr() });
    setStorage('habits', habits);
    if (input) input.value = '';
    renderHabits(); showToast('Habit added!','success');
  });
  document.getElementById('download-habits') && document.getElementById('download-habits').addEventListener('click', exportHabitsCSV);
  renderHabits();
}

export function renderHabits() {
  const habits = getStorage('habits',[]);
  const weekDays = getCurrentWeekDates();
  const today = todayStr();
  const metEl = document.getElementById('habit-metrics');
  const gridEl = document.getElementById('habit-grid');
  const motEl = document.getElementById('habit-motivation');
  let doneTotal = 0;
  habits.forEach(h => { weekDays.forEach(d => { if (h.days && h.days[d]) doneTotal++; }); });
  const total = habits.length * 7;
  const pct = total ? Math.round((doneTotal/total)*100) : 0;
  let doneToday = 0;
  habits.forEach(h => { if (h.days && h.days[today]) doneToday++; });
  let streak = 0;
  let cur = new Date(today+'T12:00:00');
  while (habits.length > 0 && habits.every(h => h.days && h.days[cur.toISOString().slice(0,10)])) { streak++; cur.setDate(cur.getDate()-1); }
  if (metEl) metEl.innerHTML = `
    <div class="metric-item"><div class="metric-value">${pct}%</div><div class="metric-label">This week</div></div>
    <div class="metric-item"><div class="metric-value">${doneToday}/${habits.length}</div><div class="metric-label">Today</div></div>
    <div class="metric-item"><div class="metric-value">${streak}</div><div class="metric-label">Day streak</div></div>
    <div class="metric-item"><div class="metric-value">${habits.length}</div><div class="metric-label">Total habits</div></div>`;
  if (gridEl) {
    if (!habits.length) { gridEl.innerHTML = '<p style="color:var(--md-on-surface-variant);font-size:0.875rem;">No habits yet. Add one above!</p>'; }
    else {
      gridEl.innerHTML = `<table class="habit-table" role="grid">
        <thead><tr><th scope="col">Habit</th>${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>`<th scope="col">${sanitize(d)}</th>`).join('')}<th scope="col">Del</th></tr></thead>
        <tbody>${habits.map((h,hi) => `<tr><td>${sanitize(h.name)}</td>${weekDays.map(day=>{
          const checked = h.days&&h.days[day]?'checked':'';
          if (day === today) return `<td><input type="checkbox" ${checked} data-hi="${hi}" data-day="${sanitize(day)}" aria-label="${sanitize(h.name)} on ${sanitize(day)}"></td>`;
          if (day < today) return `<td class="habit-day-past"><input type="checkbox" ${checked} disabled data-hi="${hi}" data-day="${sanitize(day)}" aria-label="${sanitize(h.name)} on ${sanitize(day)}"></td>`;
          return `<td class="habit-day-future"><input type="checkbox" disabled data-hi="${hi}" data-day="${sanitize(day)}" aria-label="${sanitize(h.name)} on ${sanitize(day)}"></td>`;
        }).join('')}<td><button class="habit-del-btn" data-hi="${hi}" aria-label="Delete ${sanitize(h.name)}"><span class="material-icons-round" aria-hidden="true">delete</span></button></td></tr>`).join('')}</tbody>
      </table>`;
      gridEl.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', () => {
          if (cb.dataset.day !== todayStr()) return;
          let habits = getStorage('habits',[]); const hi = parseInt(cb.dataset.hi); const day = cb.dataset.day;
          if (!habits[hi].days) habits[hi].days = {};
          habits[hi].days[day] = cb.checked;
          setStorage('habits', habits); renderHabits(); updateHomeDashboard();
          if (cb.checked) addCoins(2, 'Habit completed');
        });
      });
      gridEl.querySelectorAll('.habit-del-btn').forEach(btn => {
        btn.addEventListener('click', () => { let habits = getStorage('habits',[]); habits.splice(parseInt(btn.dataset.hi),1); setStorage('habits',habits); renderHabits(); updateHomeDashboard(); });
      });
    }
  }
  const msgs = ['Let\'s get started! Small steps lead to big changes.','Every step counts. Try to do a bit more next week!','You\'re making progress. Stay consistent!','Great job! Keep up the good work!','Amazing! You completed all your habits this week!'];
  if (motEl) motEl.textContent = msgs[pct===100?4:pct>=70?3:pct>=40?2:pct>0?1:0];
}

function exportHabitsCSV() {
  const habits = getStorage('habits',[]);
  let allDays = [];
  habits.forEach(h => { if (h.days) allDays = allDays.concat(Object.keys(h.days)); });
  allDays = [...new Set(allDays)].sort();
  const header = ['Habit',...allDays];
  const rows = habits.map(h => [h.name,...allDays.map(d => h.days&&h.days[d]?'1':'0')]);
  const csv = [header,...rows].map(r => r.map(c => '"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\n');
  const blob = new Blob([csv],{type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='habits.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}
