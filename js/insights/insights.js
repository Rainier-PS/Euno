import { getStorage } from '../core/storage.js';
import { todayStr, formatDateDisplay, getCurrentWeekDates } from '../utils/dateUtils.js';
import { showToast } from '../utils/notifications.js';
import { sanitize } from '../utils/helpers.js';
import { MOOD_LABELS, MOOD_COLORS, WELLNESS_LEVEL_LABELS } from '../core/constants.js';
import { calcCheckinStreak } from '../features/home.js';
import {
  getCheckinScores,
  getCheckinWellnessLevel,
  detectChallenges,
  getTotalBurden,
  getSeverity,
  DIMENSION_META,
  EMOTION_OPTIONS as SCORING_EMOTIONS
} from '../features/checkinScoring.js';

export function initInsights() {
  const itabs = document.querySelectorAll('.tab[data-itab]');
  itabs.forEach(t => {
    t.addEventListener('click', () => {
      itabs.forEach(x => { x.classList.remove('active'); x.setAttribute('aria-selected','false'); });
      document.querySelectorAll('.itab-panel').forEach(p => p.classList.remove('active'));
      t.classList.add('active'); t.setAttribute('aria-selected','true');
      const panel = document.getElementById('itab-' + t.dataset.itab);
      if (panel) panel.classList.add('active');
      requestAnimationFrame(() => renderInsights());
    });
  });
  document.getElementById('generate-report') && document.getElementById('generate-report').addEventListener('click', generateReport);
  if (document.getElementById('insights-summary')) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => renderInsights());
    });
    window.addEventListener('resize', debounceRenderInsights);
  }
}

let renderPending = false;

function debounceRenderInsights() {
  if (renderPending) return;
  renderPending = true;
  requestAnimationFrame(() => {
    renderPending = false;
    renderInsights();
  });
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
  const diarys = getStorage('diarys',{});
  const today = todayStr();
  const last7 = checkins.slice(-7);
  let challengeDays = 0, wellnessSum = 0, wellnessCount = 0;
  last7.forEach(c => {
    const scores = getCheckinScores(c);
    if (scores) {
      if (detectChallenges(scores).length) challengeDays++;
      wellnessSum += getCheckinWellnessLevel(c);
      wellnessCount++;
    }
  });
  const avgWellness = wellnessCount ? (wellnessSum / wellnessCount).toFixed(1) : '—';
  el.innerHTML = `
    <div class="summary-card"><span class="summary-icon"><span class="material-icons-round" aria-hidden="true">local_fire_department</span></span><div class="summary-value">${streak}</div><div class="summary-label">Day Streak</div></div>
    <div class="summary-card"><span class="summary-icon"><span class="material-icons-round" aria-hidden="true">monitor_heart</span></span><div class="summary-value">${avgWellness}</div><div class="summary-label">Avg Wellness</div></div>
    <div class="summary-card"><span class="summary-icon"><span class="material-icons-round" aria-hidden="true">warning</span></span><div class="summary-value">${challengeDays}</div><div class="summary-label">Challenge Days</div></div>
    <div class="summary-card"><span class="summary-icon"><span class="material-icons-round" aria-hidden="true">menu_book</span></span><div class="summary-value">${Object.keys(diarys).length}</div><div class="summary-label">Diary Entries</div></div>
    <div class="summary-card"><span class="summary-icon"><span class="material-icons-round" aria-hidden="true">event_note</span></span><div class="summary-value">${checkins.length}</div><div class="summary-label">Total Check-ins</div></div>
    <div class="summary-card"><span class="summary-icon"><span class="material-icons-round" aria-hidden="true">today</span></span><div class="summary-value">${checkins.filter(c=>c.date===today).length ? '1' : '0'}</div><div class="summary-label">Checked In Today</div></div>`;
}

function renderMoodChart(checkins) {
  const canvas = document.getElementById('mood-chart');
  if (!canvas) return;
  const days = [];
  for (let i=6; i>=0; i--) { const d=new Date(); d.setDate(d.getDate()-i); days.push(d.toISOString().slice(0,10)); }
  const labels = days.map(d => { const dt=new Date(d+'T12:00:00'); return dt.toLocaleDateString(undefined,{weekday:'short'}); });
  const data = days.map(d => { const c=checkins.find(x=>x.date===d); return c ? getCheckinWellnessLevel(c) : null; });
  drawLineChart(canvas, labels, data, 'Wellness', MOOD_COLORS[4], WELLNESS_LEVEL_LABELS);
}

function renderMoodChart30(checkins) {
  const canvas = document.getElementById('mood-chart-30');
  if (!canvas) return;
  const days = [];
  for (let i=29; i>=0; i--) { const d=new Date(); d.setDate(d.getDate()-i); days.push(d.toISOString().slice(0,10)); }
  const labels = days.map((d,i) => i%5===0 ? new Date(d+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric'}) : '');
  const data = days.map(d => { const c=checkins.find(x=>x.date===d); return c ? getCheckinWellnessLevel(c) : null; });
  drawLineChart(canvas, labels, data, '30-Day Wellness', MOOD_COLORS[4], WELLNESS_LEVEL_LABELS);
}

function renderMoodDistChart(checkins) {
  const canvas = document.getElementById('mood-dist-chart');
  if (!canvas) return;
  const counts = {};
  SCORING_EMOTIONS.forEach(e => { counts[e.id] = 0; });
  checkins.forEach(c => {
    (c.moods || []).forEach(m => { if (counts[m] !== undefined) counts[m]++; });
  });
  const labels = SCORING_EMOTIONS.map(e => e.id);
  const data = labels.map(l => counts[l]);
  const colors = SCORING_EMOTIONS.map(e => e.tone === 'positive' ? '#186A3B' : '#B3261E');
  drawBarChart(canvas, labels, data, colors);
}

function drawLineChart(canvas, labels, data, label, color, yLabels) {
  const wrap = canvas.closest('.chart-wrap');
  let W = wrap ? wrap.clientWidth : canvas.offsetWidth;
  let H = wrap ? wrap.clientHeight : canvas.offsetHeight;
  if (!W || !H) {
    W = canvas.parentElement ? canvas.parentElement.clientWidth : 600;
    H = 200;
  }
  if (!W) W = 600;
  if (!H) H = 200;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const axisLabels = yLabels || MOOD_LABELS;
  const labelFont = '11px DM Sans, sans-serif';
  ctx.font = labelFont;
  const yLabelStrings = axisLabels.slice(1, 6);
  const maxLabelWidth = Math.max(...yLabelStrings.map(l => l ? ctx.measureText(l).width : 0));
  const leftLabelPadding = Math.ceil(maxLabelWidth + 14);
  const pad = { top: 24, right: 22, bottom: 40, left: Math.max(72, leftLabelPadding) };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;
  const xDenom = Math.max(labels.length - 1, 1);
  ctx.clearRect(0,0,W,H);
  const isDark = document.documentElement.getAttribute('data-theme')==='dark';
  const textColor = isDark ? '#CAC4D0' : '#49454F';
  const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = textColor;
  ctx.font = labelFont;
  for (let y=1; y<=5; y++) {
    const yPos = pad.top + chartH - ((y-1)/4)*chartH;
    ctx.strokeStyle = gridColor; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.left, yPos); ctx.lineTo(pad.left+chartW, yPos); ctx.stroke();
    ctx.fillStyle = textColor;
    ctx.textAlign = 'right';
    ctx.fillText(axisLabels[y] || y, pad.left - 10, yPos);
  }
  const validPts = data.map((v,i) => v !== null ? { x: pad.left + (i/xDenom) * chartW, y: pad.top + chartH - ((v-1)/4) * chartH } : null);
  ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
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
    const x = pad.left+(i/xDenom)*chartW;
    ctx.fillText(l, x, H-5);
  });
}

function drawBarChart(canvas, labels, data, colors) {
  const wrap = canvas.closest('.chart-wrap');
  let W = wrap ? wrap.clientWidth : canvas.offsetWidth;
  let H = wrap ? wrap.clientHeight : canvas.offsetHeight;
  if (!W || !H) {
    W = canvas.parentElement ? canvas.parentElement.clientWidth : 300;
    H = wrap && wrap.classList.contains('chart-wrap--sm') ? 280 : 200;
  }
  if (!W) W = 300;
  if (!H) H = 200;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const pad = { top: 24, right: 22, bottom: 54, left: 40 };
  const chartW = Math.max(0, W - pad.left - pad.right);
  const chartH = H - pad.top - pad.bottom;
  const minGap = 10;
  const minBarWidth = 12;
  let gap = minGap;
  let barW = (chartW - gap * (labels.length + 1)) / labels.length;
  if (barW < minBarWidth) {
    barW = Math.max(minBarWidth, chartW / labels.length * 0.6);
    gap = Math.max(4, (chartW - barW * labels.length) / (labels.length + 1));
  }
  if (Number.isNaN(gap) || gap < 4) {
    gap = 4;
  }
  if (barW * labels.length + gap * (labels.length + 1) > chartW) {
    barW = Math.max(minBarWidth, (chartW - gap * (labels.length + 1)) / labels.length);
  }
  ctx.clearRect(0,0,W,H);
  const isDark = document.documentElement.getAttribute('data-theme')==='dark';
  const textColor = isDark ? '#CAC4D0' : '#49454F';
  const max = Math.max(...data, 1);
  data.forEach((v,i) => {
    const x = pad.left + gap + i * (barW + gap);
    const bH = (v/max) * chartH;
    const y = pad.top + chartH - bH;
    ctx.fillStyle = colors[i] || '#6750A4';
    ctx.beginPath();
    const r = Math.min(6, barW / 2);
    ctx.moveTo(x + r, y); ctx.lineTo(x + barW - r, y);
    ctx.arcTo(x + barW, y, x + barW, y + r, r); ctx.lineTo(x + barW, y + bH);
    ctx.lineTo(x, y + bH); ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = textColor;
    ctx.font = `${labels.length > 10 ? 9 : 10}px DM Sans, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    if (v > 0) ctx.fillText(v, x + barW / 2, y - 4);
    ctx.fillText(labels[i], x + barW / 2, pad.top + chartH + 8);
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
  const diarys = getStorage('diarys',{});
  const checkStreak = calcCheckinStreak(checkins);
  const diaryDates = Object.keys(diarys).sort().reverse();
  let diaryStreak=0, expected=todayStr();
  for(const d of diaryDates) {
    if(d===expected){diaryStreak++;const dt=new Date(d+'T12:00:00');dt.setDate(dt.getDate()-1);expected=dt.toISOString().slice(0,10);}else break;
  }
  el.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:0.75rem;">
      <div style="display:flex;align-items:center;gap:1rem;padding:0.75rem 1rem;background:var(--md-surface-container);border-radius:var(--radius-lg);">
        <span class="material-icons-round" style="color:#E65100;font-size:1.5rem;" aria-hidden="true">local_fire_department</span>
        <div><div style="font-weight:700;color:var(--md-on-surface)">${checkStreak} day check-in streak</div><div style="font-size:0.78rem;color:var(--md-on-surface-variant)">Daily mood tracking</div></div>
      </div>
      <div style="display:flex;align-items:center;gap:1rem;padding:0.75rem 1rem;background:var(--md-surface-container);border-radius:var(--radius-lg);">
        <span class="material-icons-round" style="color:var(--md-primary);font-size:1.5rem;" aria-hidden="true">menu_book</span>
        <div><div style="font-weight:700;color:var(--md-on-surface)">${diaryStreak} day diary streak</div><div style="font-size:0.78rem;color:var(--md-on-surface-variant)">Consistent diarying</div></div>
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

  const dims = ['stress', 'anxiety', 'burnout', 'overthinking', 'loneliness'];
  const totals = { stress: 0, anxiety: 0, burnout: 0, overthinking: 0, loneliness: 0 };
  let count = 0;
  const emotionCounts = {};
  SCORING_EMOTIONS.forEach(e => { emotionCounts[e.id] = 0; });

  checkins.forEach(c => {
    const scores = getCheckinScores(c);
    if (!scores) return;
    count++;
    dims.forEach(d => { totals[d] += scores[d + '_score']; });
    (c.moods || []).forEach(m => { if (emotionCounts[m] !== undefined) emotionCounts[m]++; });
  });

  const topEmotion = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1]).find(([, v]) => v > 0);
  const topEmotionLabel = topEmotion ? topEmotion[0] : '—';

  el.innerHTML = `<div style="display:flex;flex-direction:column;gap:0.75rem;">
    <div style="padding:0.875rem 1rem;background:var(--md-surface-container);border-radius:var(--radius-lg);">
      <p style="font-size:0.85rem;color:var(--md-on-surface-variant);margin-bottom:0.375rem;">Most frequent emotion</p>
      <p style="font-weight:700;color:var(--md-primary);font-size:1rem;">${sanitize(topEmotionLabel)}</p>
    </div>
    ${dims.map(dim => {
      const avg = count ? (totals[dim] / count).toFixed(1) : '—';
      const severity = count ? getSeverity(Math.round(totals[dim] / count), dim) : '—';
      const meta = DIMENSION_META[dim];
      return `<div style="padding:0.875rem 1rem;background:var(--md-surface-container);border-radius:var(--radius-lg);">
        <p style="font-size:0.85rem;color:var(--md-on-surface-variant);margin-bottom:0.375rem;">Average ${meta.label.toLowerCase()}</p>
        <p style="font-weight:700;color:var(--md-on-surface);font-size:1rem;">${avg} <span style="font-size:0.8rem;color:var(--md-on-surface-variant);font-weight:600;">(${severity})</span></p>
      </div>`;
    }).join('')}
  </div>`;
}

function renderWeeklyAverages(checkins) {
  const el = document.getElementById('weekly-averages');
  if (!el) return;
  if (checkins.length < 3) { el.innerHTML = '<p style="color:var(--md-on-surface-variant);font-size:0.875rem;">Not enough data yet.</p>'; return; }
  const weeks = {};
  checkins.forEach(c => {
    const level = getCheckinWellnessLevel(c);
    if (!level) return;
    const d = new Date(c.date+'T12:00:00');
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().slice(0,10);
    if (!weeks[key]) weeks[key] = [];
    weeks[key].push(level);
  });
  const rows = Object.entries(weeks).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,6);
  el.innerHTML = `<div style="display:flex;flex-direction:column;gap:0.5rem;">` + rows.map(([week, levels]) => {
    const avg = (levels.reduce((s,m)=>s+m,0)/levels.length).toFixed(1);
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
  const studentName = getStorage('user_name', '') || '';
  const checkins = getStorage('checkins',[]);
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate()-period);
  const filtered = checkins.filter(c => new Date(c.date+'T12:00:00') >= cutoff);
  if (!filtered.length) { showToast('No data for selected period.','error'); return; }
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let y = 20;
    doc.setFontSize(20); doc.setFont('helvetica','bold');
    doc.text('Euno Wellness Report', 105, y, {align:'center'}); y+=10;
    doc.setFontSize(11); doc.setFont('helvetica','normal');
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 105, y, {align:'center'}); y+=6;
    if (studentName) { doc.text(`Student: ${studentName}`, 105, y, {align:'center'}); y+=6; }
    doc.text(`Period: Last ${period} days`, 105, y, {align:'center'}); y+=12;
    doc.setDrawColor(103,80,164); doc.setLineWidth(0.5); doc.line(20, y, 190, y); y+=8;
    const avgWellness = (filtered.reduce((s,c) => s + getCheckinWellnessLevel(c), 0) / filtered.length).toFixed(2);
    const challengeTotal = filtered.reduce((s, c) => s + (c.challenges ? c.challenges.length : detectChallenges(getCheckinScores(c) || {}).length), 0);
    doc.setFontSize(14); doc.setFont('helvetica','bold'); doc.text('Summary Statistics', 20, y); y+=8;
    doc.setFontSize(11); doc.setFont('helvetica','normal');
    doc.text(`Total Check-ins: ${filtered.length}`, 25, y); y+=6;
    doc.text(`Average Wellness Level: ${avgWellness}/5`, 25, y); y+=6;
    doc.text(`Total Challenges Detected: ${challengeTotal}`, 25, y); y+=6;
    const streak = calcCheckinStreak(checkins);
    doc.text(`Current Check-in Streak: ${streak} days`, 25, y); y+=10;
    doc.setFontSize(14); doc.setFont('helvetica','bold'); doc.text('Dimension Averages', 20, y); y+=8;
    doc.setFontSize(11); doc.setFont('helvetica','normal');
    const dims = ['stress', 'anxiety', 'burnout', 'overthinking', 'loneliness'];
    dims.forEach(dim => {
      let sum = 0, cnt = 0;
      filtered.forEach(c => {
        const scores = getCheckinScores(c);
        if (scores) { sum += scores[dim + '_score']; cnt++; }
      });
      const avg = cnt ? (sum / cnt).toFixed(1) : '—';
      doc.text(`${DIMENSION_META[dim].label}: ${avg} (${cnt ? getSeverity(Math.round(sum / cnt), dim) : '—'})`, 25, y); y+=6;
    });
    y+=4;
    doc.setFontSize(14); doc.setFont('helvetica','bold'); doc.text('Emotion Frequency', 20, y); y+=8;
    doc.setFontSize(11); doc.setFont('helvetica','normal');
    const emotionCounts = {};
    SCORING_EMOTIONS.forEach(e => { emotionCounts[e.id] = 0; });
    filtered.forEach(c => { (c.moods || []).forEach(m => { if (emotionCounts[m] !== undefined) emotionCounts[m]++; }); });
    Object.entries(emotionCounts).filter(([,v]) => v > 0).sort((a,b) => b[1]-a[1]).forEach(([emo, cnt]) => {
      doc.text(`${emo}: ${cnt}`, 25, y); y+=6;
    });
    doc.save('euno-wellness-report.pdf');
    showToast('Report downloaded!','success');
  } catch(e) { showToast('Error generating report: '+e.message,'error'); }
}
