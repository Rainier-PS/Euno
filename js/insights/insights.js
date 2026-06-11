import { getStorage } from '../core/storage.js';
import { todayStr, formatDateDisplay } from '../utils/dateUtils.js';
import { showToast } from '../utils/notifications.js';
import { sanitize } from '../utils/helpers.js';
import { MOOD_LABELS, MOOD_COLORS } from '../core/constants.js';
import { calcCheckinStreak } from '../features/home.js';
import { getCurrentWeekDates } from '../features/checkin.js';

export function initInsights() {
  const itabs = document.querySelectorAll('.tab[data-itab]');
  itabs.forEach(t => {
    t.addEventListener('click', () => {
      itabs.forEach(x => { x.classList.remove('active'); x.setAttribute('aria-selected','false'); });
      document.querySelectorAll('.itab-panel').forEach(p => p.classList.remove('active'));
      t.classList.add('active'); t.setAttribute('aria-selected','true');
      const panel = document.getElementById('itab-' + t.dataset.itab);
      if (panel) panel.classList.add('active');
      renderInsights();
    });
  });
  document.getElementById('generate-report') && document.getElementById('generate-report').addEventListener('click', generateReport);
}

export function renderInsights() {
  const checkins = getStorage('checkins',[]);
  renderInsightsSummary(checkins);
  renderMoodChart(checkins);
  renderMoodChart30(checkins);
  renderMoodDistChart(checkins);
  renderHabitChart();
  renderWellnessStreaks();
  renderEmotionalPatterns(checkins);
  renderWeeklyAverages(checkins);
}

function renderInsightsSummary(checkins) {
  const el = document.getElementById('insights-summary');
  if (!el) return;
  const streak = calcCheckinStreak(checkins);
  const habits = getStorage('habits',[]);
  const today = todayStr();
  let habitsDoneToday = 0;
  habits.forEach(h => { if(h.days && h.days[today]) habitsDoneToday++; });
  const sessions = getStorage('pomodoro_sessions',[]);
  const todaySessions = sessions.filter(s => s.date === today).length;
  const journals = getStorage('journals',{});
  const avgMood = checkins.length ? (checkins.reduce((s,c)=>s+c.mood,0)/checkins.length).toFixed(1) : '—';
  el.innerHTML = `
    <div class="summary-card"><span class="summary-icon"><span class="material-icons-round" aria-hidden="true">local_fire_department</span></span><div class="summary-value">${streak}</div><div class="summary-label">Day Streak</div></div>
    <div class="summary-card"><span class="summary-icon"><span class="material-icons-round" aria-hidden="true">mood</span></span><div class="summary-value">${avgMood}</div><div class="summary-label">Avg Mood</div></div>
    <div class="summary-card"><span class="summary-icon"><span class="material-icons-round" aria-hidden="true">check_circle</span></span><div class="summary-value">${habitsDoneToday}/${habits.length}</div><div class="summary-label">Habits Today</div></div>
    <div class="summary-card"><span class="summary-icon"><span class="material-icons-round" aria-hidden="true">timer</span></span><div class="summary-value">${todaySessions}</div><div class="summary-label">Focus Today</div></div>
    <div class="summary-card"><span class="summary-icon"><span class="material-icons-round" aria-hidden="true">menu_book</span></span><div class="summary-value">${Object.keys(journals).length}</div><div class="summary-label">Journal Entries</div></div>
    <div class="summary-card"><span class="summary-icon"><span class="material-icons-round" aria-hidden="true">event_note</span></span><div class="summary-value">${checkins.length}</div><div class="summary-label">Total Check-ins</div></div>`;
}

function renderMoodChart(checkins) {
  const canvas = document.getElementById('mood-chart');
  if (!canvas) return;
  const days = [];
  for (let i=6; i>=0; i--) { const d=new Date(); d.setDate(d.getDate()-i); days.push(d.toISOString().slice(0,10)); }
  const labels = days.map(d => { const dt=new Date(d+'T12:00:00'); return dt.toLocaleDateString(undefined,{weekday:'short'}); });
  const data = days.map(d => { const c=checkins.find(x=>x.date===d); return c ? c.mood : null; });
  drawLineChart(canvas, labels, data, 'Mood', MOOD_COLORS[3]);
}

function renderMoodChart30(checkins) {
  const canvas = document.getElementById('mood-chart-30');
  if (!canvas) return;
  const days = [];
  for (let i=29; i>=0; i--) { const d=new Date(); d.setDate(d.getDate()-i); days.push(d.toISOString().slice(0,10)); }
  const labels = days.map((d,i) => i%5===0 ? new Date(d+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric'}) : '');
  const data = days.map(d => { const c=checkins.find(x=>x.date===d); return c ? c.mood : null; });
  drawLineChart(canvas, labels, data, '30-Day Mood', MOOD_COLORS[4]);
}

function renderMoodDistChart(checkins) {
  const canvas = document.getElementById('mood-dist-chart');
  if (!canvas) return;
  const counts = [0,0,0,0,0,0];
  checkins.forEach(c => { if(c.mood>=1&&c.mood<=5) counts[c.mood]++; });
  const labels = ['','Struggling','Low','Okay','Good','Amazing'];
  const data = counts.slice(1);
  const colors = MOOD_COLORS.slice(1);
  drawBarChart(canvas, labels.slice(1), data, colors);
}

function drawLineChart(canvas, labels, data, label, color) {
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth || 600;
  const H = canvas.offsetHeight || 200;
  canvas.width = W; canvas.height = H;
  const pad = { top:20, right:20, bottom:30, left:30 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;
  ctx.clearRect(0,0,W,H);
  const isDark = document.documentElement.getAttribute('data-theme')==='dark';
  const textColor = isDark ? '#CAC4D0' : '#49454F';
  const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  for (let y=1; y<=5; y++) {
    const yPos = pad.top + chartH - ((y-1)/4)*chartH;
    ctx.strokeStyle = gridColor; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(pad.left, yPos); ctx.lineTo(pad.left+chartW, yPos); ctx.stroke();
    ctx.fillStyle = textColor; ctx.font='10px DM Sans,sans-serif'; ctx.textAlign='right';
    ctx.fillText(MOOD_LABELS[y]||y, pad.left-4, yPos+4);
  }
  const validPts = data.map((v,i) => v!==null ? { x: pad.left+(i/(labels.length-1))*chartW, y: pad.top+chartH-((v-1)/4)*chartH } : null);
  ctx.strokeStyle = color; ctx.lineWidth=2.5; ctx.lineJoin='round';
  let started=false;
  ctx.beginPath();
  validPts.forEach((pt,i) => {
    if (!pt) return;
    if (!started) { ctx.moveTo(pt.x, pt.y); started=true; } else { ctx.lineTo(pt.x, pt.y); }
  });
  ctx.stroke();
  validPts.forEach(pt => {
    if (!pt) return;
    ctx.fillStyle=color; ctx.beginPath(); ctx.arc(pt.x, pt.y, 4, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle='white'; ctx.beginPath(); ctx.arc(pt.x, pt.y, 2, 0, Math.PI*2); ctx.fill();
  });
  ctx.fillStyle=textColor; ctx.font='10px DM Sans,sans-serif'; ctx.textAlign='center';
  labels.forEach((l,i) => {
    if (!l) return;
    const x = pad.left+(i/(labels.length-1))*chartW;
    ctx.fillText(l, x, H-5);
  });
}

function drawBarChart(canvas, labels, data, colors) {
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth || 300;
  const H = canvas.offsetHeight || 300;
  canvas.width = W; canvas.height = H;
  const pad = { top:20, right:20, bottom:40, left:30 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;
  ctx.clearRect(0,0,W,H);
  const isDark = document.documentElement.getAttribute('data-theme')==='dark';
  const textColor = isDark ? '#CAC4D0' : '#49454F';
  const max = Math.max(...data, 1);
  const barW = chartW / (labels.length * 1.5);
  const gap = (chartW - barW*labels.length) / (labels.length+1);
  data.forEach((v,i) => {
    const x = pad.left + gap + i*(barW+gap);
    const bH = (v/max)*chartH;
    const y = pad.top + chartH - bH;
    ctx.fillStyle = colors[i] || '#6750A4';
    ctx.beginPath();
    const r = Math.min(6, barW/2);
    ctx.moveTo(x+r, y); ctx.lineTo(x+barW-r, y);
    ctx.arcTo(x+barW, y, x+barW, y+r, r); ctx.lineTo(x+barW, y+bH);
    ctx.lineTo(x, y+bH); ctx.arcTo(x, y, x+r, y, r); ctx.closePath();
    ctx.fill();
    ctx.fillStyle=textColor; ctx.font='10px DM Sans,sans-serif'; ctx.textAlign='center';
    if (v>0) ctx.fillText(v, x+barW/2, y-4);
    ctx.fillText(labels[i], x+barW/2, pad.top+chartH+15);
  });
}

function renderHabitChart() {
  const canvas = document.getElementById('habit-chart');
  if (!canvas) return;
  const habits = getStorage('habits',[]);
  const weekDays = getCurrentWeekDates();
  const labels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const data = weekDays.map(d => habits.filter(h=>h.days&&h.days[d]).length);
  drawBarChart(canvas, labels, data, weekDays.map(()=>'#6750A4'));
}

function renderWellnessStreaks() {
  const el = document.getElementById('wellness-streaks');
  if (!el) return;
  const checkins = getStorage('checkins',[]);
  const habits = getStorage('habits',[]);
  const journals = getStorage('journals',{});
  const checkStreak = calcCheckinStreak(checkins);
  const journalDates = Object.keys(journals).sort().reverse();
  let journalStreak=0, expected=todayStr();
  for(const d of journalDates) {
    if(d===expected){journalStreak++;const dt=new Date(d+'T12:00:00');dt.setDate(dt.getDate()-1);expected=dt.toISOString().slice(0,10);}else break;
  }
  el.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:0.75rem;">
      <div style="display:flex;align-items:center;gap:1rem;padding:0.75rem 1rem;background:var(--md-surface-container);border-radius:var(--radius-lg);">
        <span class="material-icons-round" style="color:#E65100;font-size:1.5rem;" aria-hidden="true">local_fire_department</span>
        <div><div style="font-weight:700;color:var(--md-on-surface)">${checkStreak} day check-in streak</div><div style="font-size:0.78rem;color:var(--md-on-surface-variant)">Daily mood tracking</div></div>
      </div>
      <div style="display:flex;align-items:center;gap:1rem;padding:0.75rem 1rem;background:var(--md-surface-container);border-radius:var(--radius-lg);">
        <span class="material-icons-round" style="color:var(--md-primary);font-size:1.5rem;" aria-hidden="true">menu_book</span>
        <div><div style="font-weight:700;color:var(--md-on-surface)">${journalStreak} day journal streak</div><div style="font-size:0.78rem;color:var(--md-on-surface-variant)">Consistent journaling</div></div>
      </div>
      <div style="display:flex;align-items:center;gap:1rem;padding:0.75rem 1rem;background:var(--md-surface-container);border-radius:var(--radius-lg);">
        <span class="material-icons-round" style="color:var(--md-success);font-size:1.5rem;" aria-hidden="true">check_circle</span>
        <div><div style="font-weight:700;color:var(--md-on-surface)">${habits.length} habits tracked</div><div style="font-size:0.78rem;color:var(--md-on-surface-variant)">Active habits this week</div></div>
      </div>
    </div>`;
}

function renderEmotionalPatterns(checkins) {
  const el = document.getElementById('emotional-patterns');
  if (!el) return;
  if (checkins.length < 3) { el.innerHTML = '<p style="color:var(--md-on-surface-variant);font-size:0.875rem;">Log more check-ins to see emotional patterns.</p>'; return; }
  const moodCounts = [0,0,0,0,0,0];
  checkins.forEach(c => { if(c.mood>=1&&c.mood<=5) moodCounts[c.mood]++; });
  const dominant = moodCounts.slice(1).indexOf(Math.max(...moodCounts.slice(1)))+1;
  const avgStress = checkins.length ? (checkins.reduce((s,c)=>s+(c.stress||5),0)/checkins.length).toFixed(1) : '—';
  const energyCounts = { low:0, medium:0, high:0 };
  checkins.forEach(c => { if(c.energy&&energyCounts[c.energy]!==undefined) energyCounts[c.energy]++; });
  const domEnergy = Object.entries(energyCounts).sort((a,b)=>b[1]-a[1])[0][0];
  el.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:0.75rem;">
      <div style="padding:0.875rem 1rem;background:var(--md-surface-container);border-radius:var(--radius-lg);">
        <p style="font-size:0.85rem;color:var(--md-on-surface-variant);margin-bottom:0.375rem;">Most frequent mood</p>
        <p style="font-weight:700;color:var(--md-primary);font-size:1rem;">${sanitize(MOOD_LABELS[dominant]||'—')}</p>
      </div>
      <div style="padding:0.875rem 1rem;background:var(--md-surface-container);border-radius:var(--radius-lg);">
        <p style="font-size:0.85rem;color:var(--md-on-surface-variant);margin-bottom:0.375rem;">Average stress level</p>
        <p style="font-weight:700;color:var(--md-on-surface);font-size:1rem;">${avgStress}/10</p>
      </div>
      <div style="padding:0.875rem 1rem;background:var(--md-surface-container);border-radius:var(--radius-lg);">
        <p style="font-size:0.85rem;color:var(--md-on-surface-variant);margin-bottom:0.375rem;">Typical energy level</p>
        <p style="font-weight:700;color:var(--md-on-surface);font-size:1rem;text-transform:capitalize;">${sanitize(domEnergy)}</p>
      </div>
    </div>`;
}

function renderWeeklyAverages(checkins) {
  const el = document.getElementById('weekly-averages');
  if (!el) return;
  if (checkins.length < 3) { el.innerHTML = '<p style="color:var(--md-on-surface-variant);font-size:0.875rem;">Not enough data yet.</p>'; return; }
  const weeks = {};
  checkins.forEach(c => {
    const d = new Date(c.date+'T12:00:00');
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().slice(0,10);
    if (!weeks[key]) weeks[key] = [];
    weeks[key].push(c.mood);
  });
  const rows = Object.entries(weeks).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,6);
  el.innerHTML = `<div style="display:flex;flex-direction:column;gap:0.5rem;">` + rows.map(([week, moods]) => {
    const avg = (moods.reduce((s,m)=>s+m,0)/moods.length).toFixed(1);
    const pct = ((avg-1)/4)*100;
    return `<div style="padding:0.75rem 1rem;background:var(--md-surface-container);border-radius:var(--radius-lg);">
      <div style="display:flex;justify-content:space-between;margin-bottom:0.375rem;">
        <span style="font-size:0.8rem;color:var(--md-on-surface-variant)">Week of ${sanitize(formatDateDisplay(week))}</span>
        <span style="font-weight:700;color:var(--md-primary)">${avg}/5</span>
      </div>
      <div style="height:6px;background:var(--md-outline-variant);border-radius:3px;">
        <div style="height:100%;width:${pct}%;background:var(--md-primary);border-radius:3px;transition:width 0.5s ease;"></div>
      </div>
    </div>`;
  }).join('') + '</div>';
}

function generateReport() {
  const periodEl = document.getElementById('report-period');
  const nameEl = document.getElementById('report-name');
  const period = periodEl ? parseInt(periodEl.value) : 30;
  const studentName = nameEl ? nameEl.value.trim().slice(0,100) : '';
  const checkins = getStorage('checkins',[]);
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate()-period);
  const filtered = checkins.filter(c => new Date(c.date+'T12:00:00') >= cutoff);
  if (!filtered.length) { showToast('No data for selected period.','error'); return; }
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let y = 20;
    doc.setFontSize(20); doc.setFont('helvetica','bold');
    doc.text('StudyHub Wellness Report', 105, y, {align:'center'}); y+=10;
    doc.setFontSize(11); doc.setFont('helvetica','normal');
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 105, y, {align:'center'}); y+=6;
    if (studentName) { doc.text(`Student: ${studentName}`, 105, y, {align:'center'}); y+=6; }
    doc.text(`Period: Last ${period} days`, 105, y, {align:'center'}); y+=12;
    doc.setDrawColor(103,80,164); doc.setLineWidth(0.5); doc.line(20, y, 190, y); y+=8;
    const avgMood = (filtered.reduce((s,c)=>s+c.mood,0)/filtered.length).toFixed(2);
    const avgStress = (filtered.reduce((s,c)=>s+(c.stress||5),0)/filtered.length).toFixed(2);
    doc.setFontSize(14); doc.setFont('helvetica','bold'); doc.text('Summary Statistics', 20, y); y+=8;
    doc.setFontSize(11); doc.setFont('helvetica','normal');
    doc.text(`Total Check-ins: ${filtered.length}`, 25, y); y+=6;
    doc.text(`Average Mood: ${avgMood}/5 (${MOOD_LABELS[Math.round(parseFloat(avgMood))]||''})`, 25, y); y+=6;
    doc.text(`Average Stress Level: ${avgStress}/10`, 25, y); y+=6;
    const streak = calcCheckinStreak(checkins);
    doc.text(`Current Check-in Streak: ${streak} days`, 25, y); y+=10;
    doc.setFontSize(14); doc.setFont('helvetica','bold'); doc.text('Mood Distribution', 20, y); y+=8;
    doc.setFontSize(11); doc.setFont('helvetica','normal');
    [1,2,3,4,5].forEach(m => {
      const cnt = filtered.filter(c=>c.mood===m).length;
      const pct = ((cnt/filtered.length)*100).toFixed(0);
      doc.text(`${MOOD_LABELS[m]}: ${cnt} (${pct}%)`, 25, y); y+=6;
    });
    y+=4;
    const energyCounts = {low:0,medium:0,high:0};
    filtered.forEach(c=>{if(c.energy&&energyCounts[c.energy]!==undefined)energyCounts[c.energy]++;});
    doc.setFontSize(14); doc.setFont('helvetica','bold'); doc.text('Energy & Sleep Patterns', 20, y); y+=8;
    doc.setFontSize(11); doc.setFont('helvetica','normal');
    Object.entries(energyCounts).forEach(([k,v])=>{if(v>0){doc.text(`${k.charAt(0).toUpperCase()+k.slice(1)} energy: ${v} days`,25,y);y+=6;}});
    y+=4;
    doc.setFontSize(14); doc.setFont('helvetica','bold'); doc.text('Recent Reflections', 20, y); y+=8;
    doc.setFontSize(10); doc.setFont('helvetica','normal');
    filtered.slice(-5).reverse().forEach(c => {
      if (c.thoughts && y < 260) {
        doc.text(`${c.date}: "${c.thoughts.slice(0,80)}${c.thoughts.length>80?'…':''}"`, 25, y, {maxWidth:165}); y+=10;
      }
    });
    doc.save('studyhub-wellness-report.pdf');
    showToast('Report downloaded!','success');
  } catch(e) { showToast('Error generating report: '+e.message,'error'); }
}
