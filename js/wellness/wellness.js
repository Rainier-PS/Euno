import { getStorage, setStorage } from '../core/storage.js';
import { todayStr, formatDateDisplay } from '../utils/dateUtils.js';
import { showToast } from '../utils/notifications.js';
import { sanitize } from '../utils/helpers.js';
import { BREATH_PATTERNS, CHALLENGES, REFLECTION_PROMPTS } from '../core/constants.js';

let breathTimer = null, breathRunning = false, breathCycles = 0;
let selectedBreathType = '478';

export function initWellness() {
  document.querySelectorAll('[data-type]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-type]').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed','false'); });
      btn.classList.add('active'); btn.setAttribute('aria-pressed','true');
      selectedBreathType = btn.dataset.type;
      stopBreathing();
    });
  });

  document.getElementById('breath-toggle') && document.getElementById('breath-toggle').addEventListener('click', toggleBreathing);

  const wtabs = document.querySelectorAll('.tab[data-wtab]');
  wtabs.forEach(t => {
    t.addEventListener('click', () => {
      wtabs.forEach(x => { x.classList.remove('active'); x.setAttribute('aria-selected','false'); });
      document.querySelectorAll('.wtab-panel').forEach(p => p.classList.remove('active'));
      t.classList.add('active'); t.setAttribute('aria-selected','true');
      const panel = document.getElementById('wtab-' + t.dataset.wtab);
      if (panel) panel.classList.add('active');
    });
  });

  document.getElementById('save-gratitude') && document.getElementById('save-gratitude').addEventListener('click', saveGratitude);
  renderGratitudeHistory();
  initChallenges();
  initReflectionPrompts();
}

function toggleBreathing() {
  if (breathRunning) {
    stopBreathing();
  } else {
    startBreathing();
  }
}

function startBreathing() {
  if (breathRunning) return;
  breathRunning = true;
  breathCycles = 0;
  const cycleEl = document.getElementById('cycle-count'); if(cycleEl) cycleEl.textContent = '0';
  const btn = document.getElementById('breath-toggle');
  if (btn) {
    btn.setAttribute('data-state', 'stop');
    btn.innerHTML = '<span class="material-icons-round" aria-hidden="true">stop</span>Stop';
  }
  runBreathPhase(0);
}

function stopBreathing() {
  clearTimeout(breathTimer); breathRunning = false;
  const circle = document.getElementById('breathing-circle');
  const ring = document.getElementById('breathing-ring');
  const instr = document.getElementById('breath-instruction');
  const btn = document.getElementById('breath-toggle');
  if (circle) circle.className = 'breathing-circle';
  if (ring) ring.className = 'breathing-ring';
  if (instr) instr.textContent = 'Press Start';
  if (btn) {
    btn.setAttribute('data-state', 'start');
    btn.innerHTML = '<span class="material-icons-round" aria-hidden="true">play_arrow</span>Start';
  }
}

function runBreathPhase(phaseIdx) {
  if (!breathRunning) return;
  const pattern = BREATH_PATTERNS[selectedBreathType] || BREATH_PATTERNS['478'];
  const phase = pattern[phaseIdx];
  const circle = document.getElementById('breathing-circle');
  const ring = document.getElementById('breathing-ring');
  const instr = document.getElementById('breath-instruction');
  if (instr) instr.textContent = phase.phase;
  if (circle) circle.className = 'breathing-circle ' + (phase.phase==='Inhale'?'expand':phase.phase==='Exhale'?'shrink':'hold');
  if (ring) ring.className = 'breathing-ring ' + (phase.phase==='Inhale'?'expand':phase.phase==='Exhale'?'shrink':'hold');
  breathTimer = setTimeout(() => {
    const nextIdx = (phaseIdx + 1) % pattern.length;
    if (nextIdx === 0) {
      breathCycles++;
      const cycleEl = document.getElementById('cycle-count'); if(cycleEl) cycleEl.textContent = breathCycles;
    }
    runBreathPhase(nextIdx);
  }, phase.dur);
}

function saveGratitude() {
  const g1 = document.getElementById('gratitude-1');
  const g2 = document.getElementById('gratitude-2');
  const g3 = document.getElementById('gratitude-3');
  const items = [g1,g2,g3].map(el => el ? el.value.trim().slice(0,200) : '').filter(Boolean);
  if (!items.length) { showToast('Write at least one gratitude item.','error'); return; }
  const entries = getStorage('gratitude_entries',[]);
  entries.unshift({ date: todayStr(), items, timestamp: Date.now() });
  setStorage('gratitude_entries', entries.slice(0,100));
  if(g1) g1.value=''; if(g2) g2.value=''; if(g3) g3.value='';
  renderGratitudeHistory(); showToast('Gratitude saved!','success');
}

function renderGratitudeHistory() {
  const el = document.getElementById('gratitude-history');
  if (!el) return;
  const entries = getStorage('gratitude_entries',[]).slice(0,10);
  if (!entries.length) { el.innerHTML = ''; return; }
  el.innerHTML = entries.map(e => `
    <div class="gratitude-entry">
      <div class="gratitude-entry-date">${sanitize(formatDateDisplay(e.date))}</div>
      ${e.items.map(item => `<div class="gratitude-entry-item">${sanitize(item)}</div>`).join('')}
    </div>`).join('');
}

function initChallenges() {
  const grid = document.getElementById('challenges-grid');
  if (!grid) return;
  const done = getStorage('challenges_done_' + todayStr(), []);
  grid.innerHTML = CHALLENGES.map((c,i) => `
    <div class="challenge-item${done.includes(i)?' done':''}" data-ci="${i}" role="listitem" tabindex="0" aria-pressed="${done.includes(i)}">
      <div class="challenge-icon"><span class="material-icons-round" aria-hidden="true">${sanitize(c.icon)}</span></div>
      <div class="challenge-title">${sanitize(c.title)}</div>
      <div class="challenge-desc">${sanitize(c.desc)}</div>
    </div>`).join('');
  grid.querySelectorAll('.challenge-item').forEach(item => {
    const toggle = () => {
      const ci = parseInt(item.dataset.ci);
      const done = getStorage('challenges_done_' + todayStr(), []);
      const idx = done.indexOf(ci);
      if (idx >= 0) done.splice(idx,1); else done.push(ci);
      setStorage('challenges_done_' + todayStr(), done);
      item.classList.toggle('done', done.includes(ci));
      item.setAttribute('aria-pressed', String(done.includes(ci)));
    };
    item.addEventListener('click', toggle);
    item.addEventListener('keydown', e => { if(e.key==='Enter'||e.key===' ') toggle(); });
  });
}

let currentPromptIdx = 0;

function initReflectionPrompts() {
  currentPromptIdx = Math.floor(Math.random() * REFLECTION_PROMPTS.length);
  const el = document.getElementById('reflection-prompt');
  if (el) el.textContent = REFLECTION_PROMPTS[currentPromptIdx];
  document.getElementById('new-prompt') && document.getElementById('new-prompt').addEventListener('click', () => {
    currentPromptIdx = (currentPromptIdx + 1) % REFLECTION_PROMPTS.length;
    const el = document.getElementById('reflection-prompt');
    if (el) el.textContent = REFLECTION_PROMPTS[currentPromptIdx];
  });
}
