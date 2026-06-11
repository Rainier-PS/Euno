import { todayStr, formatDateDisplay } from '../utils/dateUtils.js';
import { sanitizeDate } from '../utils/helpers.js';

let dpCallback = null, dpCurrentDate = null;
const _g = typeof window !== 'undefined' ? window : globalThis;
Object.defineProperty(_g, 'dpCallback', { get() { return dpCallback; }, set(v) { dpCallback = v; }, configurable: true });
Object.defineProperty(_g, 'dpCurrentDate', { get() { return dpCurrentDate; }, set(v) { dpCurrentDate = v; }, configurable: true });

function initDatePicker() {
  document.getElementById('dp-cancel') && document.getElementById('dp-cancel').addEventListener('click', closeDatePicker);
  document.getElementById('dp-ok') && document.getElementById('dp-ok').addEventListener('click', () => {
    if (dpCurrentDate && dpCallback) dpCallback(dpCurrentDate);
    closeDatePicker();
  });
  document.getElementById('dp-prev-month') && document.getElementById('dp-prev-month').addEventListener('click', () => {
    const d = new Date(dpCurrentDate+'T12:00:00'); d.setMonth(d.getMonth()-1);
    dpCurrentDate = d.toISOString().slice(0,10); renderDPCalendar();
  });
  document.getElementById('dp-next-month') && document.getElementById('dp-next-month').addEventListener('click', () => {
    const d = new Date(dpCurrentDate+'T12:00:00'); d.setMonth(d.getMonth()+1);
    dpCurrentDate = d.toISOString().slice(0,10); renderDPCalendar();
  });
  document.getElementById('dp-month-year-btn') && document.getElementById('dp-month-year-btn').addEventListener('click', toggleDPYearView);
  document.getElementById('dp-toggle-mode') && document.getElementById('dp-toggle-mode').addEventListener('click', toggleDPYearView);
  const dialog = document.getElementById('date-picker-dialog');
  const scrim = dialog && dialog.querySelector('.picker-scrim');
  scrim && scrim.addEventListener('click', closeDatePicker);
}

function openDatePicker(initialDate, callback) {
  dpCurrentDate = sanitizeDate(initialDate) || todayStr();
  dpCallback = callback;
  const dialog = document.getElementById('date-picker-dialog');
  if (!dialog) return;
  dialog.setAttribute('aria-hidden','false');
  renderDPCalendar();
}

function closeDatePicker() {
  const dialog = document.getElementById('date-picker-dialog');
  if (dialog) dialog.setAttribute('aria-hidden','true');
  dpCallback = null;
}

function renderDPCalendar() {
  const d = new Date(dpCurrentDate+'T12:00:00');
  const year = d.getFullYear(), month = d.getMonth();
  const labelEl = document.getElementById('dp-month-year-label');
  if (labelEl) labelEl.textContent = d.toLocaleDateString(undefined,{month:'long',year:'numeric'});
  const selectedLabel = document.getElementById('dp-selected-label');
  if (selectedLabel) selectedLabel.textContent = formatDateDisplay(dpCurrentDate);
  const daysEl = document.getElementById('dp-days');
  if (!daysEl) return;
  const fd = new Date(year, month, 1).getDay();
  const dim = new Date(year, month+1, 0).getDate();
  const today = todayStr();
  let html = '';
  for (let i=0; i<fd; i++) html += `<div></div>`;
  for (let day=1; day<=dim; day++) {
    const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const isSel = ds===dpCurrentDate, isToday=ds===today;
    html += `<button class="dp-day${isSel?' selected':''}${isToday&&!isSel?' today':''}" data-date="${ds}" type="button" aria-label="${ds}">${day}</button>`;
  }
  daysEl.innerHTML = html;
  daysEl.querySelectorAll('.dp-day').forEach(btn => {
    btn.addEventListener('click', () => { dpCurrentDate=btn.dataset.date; renderDPCalendar(); });
  });
  const calView = document.getElementById('dp-calendar-view');
  if (calView) calView.style.display = '';
  const yrView = document.getElementById('dp-year-view');
  if (yrView) yrView.style.display = 'none';
}

function toggleDPYearView() {
  const cal = document.getElementById('dp-calendar-view');
  const yr = document.getElementById('dp-year-view');
  if (!cal||!yr) return;
  if (yr.style.display==='none'||!yr.style.display) {
    cal.style.display='none'; yr.style.display='';
    renderDPYearGrid();
  } else {
    yr.style.display='none'; cal.style.display='';
  }
}

function renderDPYearGrid() {
  const grid = document.getElementById('dp-year-grid');
  if (!grid) return;
  const curYear = new Date(dpCurrentDate+'T12:00:00').getFullYear();
  const thisYear = new Date().getFullYear();
  let html='';
  for(let y=thisYear-10; y<=thisYear+10; y++) {
    html+=`<button class="dp-year-btn${y===curYear?' selected':''}${y===thisYear?' current-year':''}" data-y="${y}" type="button">${y}</button>`;
  }
  grid.innerHTML=html;
  grid.querySelectorAll('.dp-year-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const d=new Date(dpCurrentDate+'T12:00:00'); d.setFullYear(parseInt(btn.dataset.y));
      dpCurrentDate=d.toISOString().slice(0,10);
      const yrView = document.getElementById('dp-year-view');
      if (yrView) yrView.style.display = 'none';
      const calView = document.getElementById('dp-calendar-view');
      if (calView) calView.style.display = '';
      renderDPCalendar();
    });
  });
  setTimeout(()=>{const sel=grid.querySelector('.selected');if(sel)sel.scrollIntoView({block:'center'});},50);
}

let tpCallback = null, tpHour = 12, tpMinute = 0, tpPeriod = 'AM', tpMode = 'hour';
let tpInputMode = false;
Object.defineProperty(_g, 'tpCallback', { get() { return tpCallback; }, set(v) { tpCallback = v; }, configurable: true });
Object.defineProperty(_g, 'tpHour', { get() { return tpHour; }, set(v) { tpHour = v; }, configurable: true });
Object.defineProperty(_g, 'tpMinute', { get() { return tpMinute; }, set(v) { tpMinute = v; }, configurable: true });
Object.defineProperty(_g, 'tpPeriod', { get() { return tpPeriod; }, set(v) { tpPeriod = v; }, configurable: true });
Object.defineProperty(_g, 'tpMode', { get() { return tpMode; }, set(v) { tpMode = v; }, configurable: true });


function tpSmartPeriod(hour12, minute) {
  const now   = new Date();
  const nowM  = now.getHours() * 60 + now.getMinutes();
  const amH   = hour12 === 12 ? 0 : hour12;
  const pmH   = hour12 === 12 ? 12 : hour12 + 12;
  const amM   = amH * 60 + minute;
  const pmM   = pmH * 60 + minute;
  function dist(target) {
    let d = target - nowM;
    if (d < 0) d += 24 * 60;
    return d;
  }
  return dist(amM) <= dist(pmM) ? 'AM' : 'PM';
}

function tpParseInput(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const s = raw.trim().toUpperCase();

  let hasPM = /PM$/.test(s);
  let hasAM = /AM$/.test(s);
  const stripped = s.replace(/[AP]M$/, '').trim();

  let h, m;

  const colonMatch = stripped.match(/^(\d{1,2}):(\d{2})$/);
  if (colonMatch) {
    h = parseInt(colonMatch[1], 10);
    m = parseInt(colonMatch[2], 10);
  } else {
    const digits = stripped.replace(/\D/g, '');
    if (digits.length === 4) {
      h = parseInt(digits.slice(0, 2), 10);
      m = parseInt(digits.slice(2), 10);
    } else if (digits.length === 3) {
      h = parseInt(digits.slice(0, 1), 10);
      m = parseInt(digits.slice(1), 10);
    } else if (digits.length === 1 || digits.length === 2) {
      h = parseInt(digits, 10);
      m = 0;
    } else {
      return null;
    }
  }

  if (isNaN(h) || isNaN(m) || m < 0 || m > 59) return null;

  if (!hasAM && !hasPM) {
    if (h >= 0 && h <= 23) {
      hasPM = h >= 12;
      hasAM = !hasPM;
    } else {
      return null;
    }
  }

  if (hasAM || hasPM) {
    if (h === 0) {
      h = 12; hasPM = false; hasAM = true;
    } else if (h > 23) {
      return null;
    }
    if (h > 12) {
      h = h % 12 || 12;
    }
    if (h === 0) h = 12;
  }

  if (h < 1 || h > 12) return null;

  const period = hasPM ? 'PM' : (hasAM ? 'AM' : null);
  return { hour: h, minute: m, period };
}

function tpTo24(hour12, minute, period) {
  let h = period === 'AM' ? (hour12 === 12 ? 0 : hour12) : (hour12 === 12 ? 12 : hour12 + 12);
  return `${String(h).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;
}

function tpStartManualInput(field) {
  const segId = field === 'hour' ? 'tp-hour-btn' : 'tp-min-btn';
  const seg   = document.getElementById(segId);
  if (!seg) return;

  if (seg.querySelector('.tp-seg-input')) return;

  tpInputMode = true;
  const current = field === 'hour' ? String(tpHour) : String(tpMinute).padStart(2, '0');

  const input = document.createElement('input');
  input.type       = 'text';
  input.inputMode  = 'numeric';
  input.pattern    = '[0-9]*';
  input.maxLength  = field === 'hour' ? 2 : 2;
  input.className  = 'tp-seg-input';
  input.value      = current;
  input.setAttribute('aria-label', field === 'hour' ? 'Enter hour' : 'Enter minute');
  input.setAttribute('autocomplete', 'off');

  const span = seg.querySelector('span');
  if (span) span.style.display = 'none';
  seg.appendChild(input);
  seg.classList.add('editing');

  requestAnimationFrame(() => { input.focus(); input.select(); });

  function commit() {
    if (!tpInputMode) return;
    tpInputMode = false;
    const raw = input.value.trim();
    cleanup();

    if (field === 'hour') {
      const parsed = tpParseInput(raw);
      if (parsed) {
        tpHour   = parsed.hour;
        tpMinute = parsed.minute;
        if (parsed.period) {
          tpPeriod = parsed.period;
        } else {
          tpPeriod = tpSmartPeriod(tpHour, tpMinute);
        }
      } else {
        let v = parseInt(raw, 10);
        if (!isNaN(v)) {
          if (v >= 13 && v <= 23) {
            tpPeriod = 'PM';
            v = v % 12 || 12;
          } else if (v === 0) {
            tpPeriod = 'AM';
            v = 12;
          } else if (v >= 1 && v <= 12) {
            tpPeriod = tpSmartPeriod(v, tpMinute);
          }
          tpHour = (v >= 1 && v <= 12) ? v : tpHour;
        }
      }
    } else {
      let v = parseInt(raw, 10);
      if (!isNaN(v) && v >= 0 && v <= 59) tpMinute = v;
    }
    updateTPSegments();
    updateTPPeriod();
    updateTPLabel();
    renderTPClock();
  }

  function cancel() {
    tpInputMode = false;
    cleanup();
    updateTPSegments();
  }

  function cleanup() {
    if (input.parentNode) input.parentNode.removeChild(input);
    seg.classList.remove('editing');
    if (span) span.style.display = '';
  }

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { e.preventDefault(); cancel(); }
  });
  input.addEventListener('blur', () => { if (tpInputMode) commit(); });
  input.addEventListener('click', e => e.stopPropagation());
}

function initTimePicker() {
  document.getElementById('tp-cancel')&&document.getElementById('tp-cancel').addEventListener('click',closeTimePicker);
  document.getElementById('tp-ok')&&document.getElementById('tp-ok').addEventListener('click',()=>{
    const timeStr = tpTo24(tpHour, tpMinute, tpPeriod);
    if(tpCallback)tpCallback(timeStr);
    closeTimePicker();
  });

  document.getElementById('tp-hour-btn')&&document.getElementById('tp-hour-btn').addEventListener('click', e => {
    if (e.target.classList && e.target.classList.contains('tp-seg-input')) return;
    if (tpMode === 'hour') {
      tpStartManualInput('hour');
    } else {
      tpMode = 'hour';
      renderTPClock();
      updateTPSegments();
    }
  });

  document.getElementById('tp-min-btn')&&document.getElementById('tp-min-btn').addEventListener('click', e => {
    if (e.target.classList && e.target.classList.contains('tp-seg-input')) return;
    if (tpMode === 'minute') {
      tpStartManualInput('minute');
    } else {
      tpMode = 'minute';
      renderTPClock();
      updateTPSegments();
    }
  });

  document.getElementById('tp-am')&&document.getElementById('tp-am').addEventListener('click',()=>{
    if (tpPeriod !== 'AM') {
      tpPeriod = 'AM';
      updateTPPeriod();
      updateTPLabel();
    }
  });

  document.getElementById('tp-pm')&&document.getElementById('tp-pm').addEventListener('click',()=>{
    if (tpPeriod !== 'PM') {
      tpPeriod = 'PM';
      updateTPPeriod();
      updateTPLabel();
    }
  });

  const dialog=document.getElementById('time-picker-dialog');
  const scrim=dialog&&dialog.querySelector('.picker-scrim');
  scrim&&scrim.addEventListener('click',closeTimePicker);
  const handle = document.getElementById('tp-clock-handle');
  const hand = document.getElementById('tp-clock-hand');
  const clock = document.getElementById('tp-clock');
  
  if (handle && hand && clock) {
    let isDragging = false;
    let lastSnapValue = null;

    const triggerHaptic = () => {
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
    };

    const updateFromAngle = (angle) => {
      const normalizedAngle = (angle + 360) % 360;
      
      if (tpMode === 'hour') {
        const hourIndex = Math.round(normalizedAngle / 30);
        const newHour = hourIndex === 0 ? 12 : hourIndex;
        if (newHour !== tpHour) {
          tpHour = newHour;
          triggerHaptic();
          renderTPClock();
          updateTPSegments();
          updateTPLabel();
        }
      } else {
        const minuteIndex = Math.round(normalizedAngle / 6);
        const newMinute = minuteIndex * 5;
        if (newMinute !== tpMinute) {
          tpMinute = newMinute;
          triggerHaptic();
          renderTPClock();
          updateTPSegments();
          updateTPLabel();
        }
      }
    };

    const getAngleFromEvent = (e) => {
      const rect = clock.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const angle = Math.atan2(clientY - centerY, clientX - centerX) * 180 / Math.PI + 90;
      return angle;
    };

    const startDrag = (e) => {
      isDragging = true;
      hand.style.transition = 'none';
      e.preventDefault();
    };

    const doDrag = (e) => {
      if (!isDragging) return;
      const angle = getAngleFromEvent(e);
      hand.style.transform = `rotate(${angle}deg)`;
      updateFromAngle(angle);
      e.preventDefault();
    };

    const endDrag = () => {
      isDragging = false;
      hand.style.transition = 'transform 0.1s cubic-bezier(0.4, 0, 0.2, 1)';
    };
    handle.addEventListener('mousedown', startDrag);
    handle.addEventListener('touchstart', startDrag, { passive: false });
    hand.addEventListener('mousedown', startDrag);
    hand.addEventListener('touchstart', startDrag, { passive: false });
    
    document.addEventListener('mousemove', doDrag);
    document.addEventListener('touchmove', doDrag, { passive: false });
    
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);
  }
}

function openTimePicker(initialTime, callback) {
  tpCallback=callback;
  tpInputMode=false;
  if(initialTime&&/^\d{2}:\d{2}$/.test(initialTime)){
    let [h,m]=initialTime.split(':').map(Number);
    tpPeriod=h>=12?'PM':'AM';
    tpHour=h%12||12;
    tpMinute=m;
  } else {
    const now=new Date();
    tpHour=now.getHours()%12||12;
    tpMinute=now.getMinutes();
    tpPeriod=now.getHours()>=12?'PM':'AM';
  }
  tpMode='hour';
  const dialog=document.getElementById('time-picker-dialog');
  if(dialog){dialog.style.display='';dialog.setAttribute('aria-hidden','false');}
  updateTPSegments(); updateTPPeriod(); updateTPLabel(); renderTPClock();
}

function closeTimePicker() {
  tpInputMode=false;
  document.querySelectorAll('.tp-seg-input').forEach(el=>{
    const seg=el.parentNode;
    el.remove();
    if(seg){seg.classList.remove('editing'); const sp=seg.querySelector('span'); if(sp)sp.style.display='';}
  });
  const dialog=document.getElementById('time-picker-dialog');
  if(dialog)dialog.setAttribute('aria-hidden','true');
  tpCallback=null;
}

function updateTPLabel() {
  const el=document.getElementById('tp-selected-label');
  if(el)el.textContent=`${tpHour}:${String(tpMinute).padStart(2,'0')} ${tpPeriod}`;
}

function updateTPSegments() {
  const hBtn=document.getElementById('tp-hour-btn'), mBtn=document.getElementById('tp-min-btn');
  if(hBtn){hBtn.classList.toggle('active',tpMode==='hour');const sp=hBtn.querySelector('span');if(sp)sp.textContent=tpHour;}
  if(mBtn){mBtn.classList.toggle('active',tpMode==='minute');const sp=mBtn.querySelector('span');if(sp)sp.textContent=String(tpMinute).padStart(2,'0');}
  const hint=document.getElementById('tp-input-hint');
  if(hint){hint.textContent=tpInputMode?'Enter to confirm, Esc to cancel':'Tap a field again to type';}
}

function updateTPPeriod() {
  const amBtn=document.getElementById('tp-am'),pmBtn=document.getElementById('tp-pm');
  if(amBtn){amBtn.classList.toggle('active',tpPeriod==='AM');amBtn.setAttribute('aria-pressed',String(tpPeriod==='AM'));}
  if(pmBtn){pmBtn.classList.toggle('active',tpPeriod==='PM');pmBtn.setAttribute('aria-pressed',String(tpPeriod==='PM'));}
}

function renderTPClock() {
  const container=document.getElementById('tp-clock-numbers');
  const hand=document.getElementById('tp-clock-hand');
  const clock=document.getElementById('tp-clock');
  if(!container||!hand||!clock)return;
  const r=112;
  container.innerHTML='';
  if(tpMode==='hour'){
    const nums=[12,1,2,3,4,5,6,7,8,9,10,11];
    nums.forEach((n,i)=>{
      const angle=(i/12)*2*Math.PI - Math.PI/2;
      const x=112+r*Math.cos(angle), y=112+r*Math.sin(angle);
      const btn=document.createElement('button');
      btn.className='tp-number'+(n===tpHour?' selected':'');
      btn.style.left=x+'px'; btn.style.top=y+'px';
      btn.textContent=n; btn.type='button';
      btn.addEventListener('click',()=>{tpHour=n;tpMode='minute';renderTPClock();updateTPSegments();updateTPLabel();});
      container.appendChild(btn);
    });
    const idx=tpHour===12?0:tpHour;
    const angle=(idx/12)*360;
    hand.style.height=(r-12)+'px'; hand.style.top=(112-(r-12))+'px'; hand.style.left='111px';
    hand.style.transform=`rotate(${angle}deg)`;
  } else {
    for(let m=0;m<60;m+=5){
      const angle=(m/60)*2*Math.PI-Math.PI/2;
      const x=112+r*Math.cos(angle), y=112+r*Math.sin(angle);
      const btn=document.createElement('button');
      btn.className='tp-number'+(m===tpMinute?' selected':'');
      btn.style.left=x+'px'; btn.style.top=y+'px';
      btn.textContent=String(m).padStart(2,'0'); btn.type='button';
      btn.addEventListener('click',()=>{tpMinute=m;renderTPClock();updateTPSegments();updateTPLabel();});
      container.appendChild(btn);
    }
    const angle=(tpMinute/60)*360;
    hand.style.height=(r-12)+'px'; hand.style.top=(112-(r-12))+'px'; hand.style.left='111px';
    hand.style.transform=`rotate(${angle}deg)`;
  }
}

export { initDatePicker, openDatePicker, closeDatePicker, initTimePicker, openTimePicker, closeTimePicker };
