import { getStorage } from '../core/storage.js';
import { calcCheckinStreakWithFreezes } from '../shop/shop.js';

let streakCalMonth = new Date().getMonth();
let streakCalYear = new Date().getFullYear();

export function initStreakCalendar() {
  const btn = document.getElementById('streak-cal-btn');
  btn && btn.addEventListener('click', openStreakCalendar);

  const desktopBtn = document.getElementById('streak-cal-btn-desktop');
  desktopBtn && desktopBtn.addEventListener('click', openStreakCalendar);

  const closeBtn = document.getElementById('streak-cal-close');
  closeBtn && closeBtn.addEventListener('click', closeStreakCalendar);

  const scrim = document.getElementById('streak-cal-scrim');
  scrim && scrim.addEventListener('click', closeStreakCalendar);

  const prevBtn = document.getElementById('streak-cal-prev');
  prevBtn && prevBtn.addEventListener('click', () => {
    streakCalMonth--;
    if (streakCalMonth < 0) { streakCalMonth = 11; streakCalYear--; }
    renderStreakCalendar();
  });

  const nextBtn = document.getElementById('streak-cal-next');
  nextBtn && nextBtn.addEventListener('click', () => {
    streakCalMonth++;
    if (streakCalMonth > 11) { streakCalMonth = 0; streakCalYear++; }
    renderStreakCalendar();
  });
}

function openStreakCalendar() {
  streakCalMonth = new Date().getMonth();
  streakCalYear = new Date().getFullYear();
  const dialog = document.getElementById('streak-calendar-dialog');
  if (dialog) {
    dialog.setAttribute('aria-hidden', 'false');
    dialog.style.display = 'flex';
  }
  renderStreakCalendar();
}

function closeStreakCalendar() {
  const dialog = document.getElementById('streak-calendar-dialog');
  if (dialog) {
    dialog.setAttribute('aria-hidden', 'true');
    dialog.style.display = 'none';
  }
}

function renderStreakCalendar() {
  const checkins = getStorage('checkins', []);
  const { current, longest } = calcCheckinStreakWithFreezes(checkins);
  const freezes = new Set(getStorage('streak_freezes', []));
  const checkDates = new Set(checkins.map(c => c.date));

  const curEl = document.getElementById('streak-cal-current');
  if (curEl) curEl.textContent = current;
  const longestEl = document.getElementById('streak-cal-longest');
  if (longestEl) longestEl.textContent = longest;

  const monthLabel = document.getElementById('streak-cal-month-label');
  const monthName = new Date(streakCalYear, streakCalMonth, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  if (monthLabel) monthLabel.textContent = monthName;

  const daysEl = document.getElementById('streak-cal-days');
  if (!daysEl) return;

  const today = new Date().toISOString().slice(0, 10);
  const firstDay = new Date(streakCalYear, streakCalMonth, 1).getDay();
  const daysInMonth = new Date(streakCalYear, streakCalMonth + 1, 0).getDate();

  let html = '';
  for (let i = 0; i < firstDay; i++) html += '<div class="streak-cal-day"></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${streakCalYear}-${String(streakCalMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = ds === today;
    const isChecked = checkDates.has(ds);
    const isFrozen = freezes.has(ds);
    const isFuture = ds > today;
    let cls = 'streak-cal-day';
    if (isChecked) cls += ' checked';
    if (isFrozen && !isChecked) cls += ' frozen';
    if (isToday) cls += ' today';
    if (isFuture) cls += ' future';
    const title = isChecked ? 'Checked in' : isFrozen ? 'Streak Freeze used' : '';
    html += `<div class="${cls}" title="${title}">${d}${isFrozen && !isChecked ? '<span class="material-icons-round" style="font-size:0.65rem;vertical-align:middle;margin-left:1px">ac_unit</span>' : ''}</div>`;
  }
  daysEl.innerHTML = html;
}
