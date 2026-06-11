import { getStorage, setStorage } from '../core/storage.js';
import { formatDateDisplay, formatTimeTo12 } from '../utils/dateUtils.js';
import { showToast } from '../utils/notifications.js';
import { sanitize, sanitizeTime } from '../utils/helpers.js';
import { openTimePicker } from '../components/pickers.js';

let calendarState = { viewMode:'month', month:new Date().getMonth(), year:new Date().getFullYear(), day:new Date().getDate(), selectedDate:null, notifications:[] };

export function initCalendar() {
  const monthSel = document.getElementById('calendar-month');
  const yearSel = document.getElementById('calendar-year');
  const viewSel = document.getElementById('calendar-view-mode');
  if (monthSel) {
    ['January','February','March','April','May','June','July','August','September','October','November','December'].forEach((m,i) => {
      const o = document.createElement('option'); o.value=i; o.textContent=m; if(i===calendarState.month) o.selected=true; monthSel.appendChild(o);
    });
  }
  if (yearSel) {
    const ty = new Date().getFullYear();
    for (let y=ty-5; y<=ty+5; y++) { const o=document.createElement('option'); o.value=y; o.textContent=y; if(y===calendarState.year) o.selected=true; yearSel.appendChild(o); }
  }
  viewSel && viewSel.addEventListener('change', () => { calendarState.viewMode=viewSel.value; renderCalendar(); });
  monthSel && monthSel.addEventListener('change', () => { calendarState.month=parseInt(monthSel.value); renderCalendar(); });
  yearSel && yearSel.addEventListener('change', () => { calendarState.year=parseInt(yearSel.value); renderCalendar(); });
  document.getElementById('prev-period') && document.getElementById('prev-period').addEventListener('click', () => {
    if (calendarState.viewMode==='month') { calendarState.month--; if(calendarState.month<0){calendarState.month=11;calendarState.year--;} }
    else if (calendarState.viewMode==='week') { const d=new Date(calendarState.year,calendarState.month,calendarState.day); d.setDate(d.getDate()-7); calendarState.year=d.getFullYear();calendarState.month=d.getMonth();calendarState.day=d.getDate(); }
    else if (calendarState.viewMode==='day') { const d=new Date(calendarState.year,calendarState.month,calendarState.day); d.setDate(d.getDate()-1); calendarState.year=d.getFullYear();calendarState.month=d.getMonth();calendarState.day=d.getDate(); }
    else if (calendarState.viewMode==='year') { calendarState.year--; }
    if (monthSel) monthSel.value=calendarState.month; if (yearSel) yearSel.value=calendarState.year; renderCalendar();
  });
  document.getElementById('next-period') && document.getElementById('next-period').addEventListener('click', () => {
    if (calendarState.viewMode==='month') { calendarState.month++; if(calendarState.month>11){calendarState.month=0;calendarState.year++;} }
    else if (calendarState.viewMode==='week') { const d=new Date(calendarState.year,calendarState.month,calendarState.day); d.setDate(d.getDate()+7); calendarState.year=d.getFullYear();calendarState.month=d.getMonth();calendarState.day=d.getDate(); }
    else if (calendarState.viewMode==='day') { const d=new Date(calendarState.year,calendarState.month,calendarState.day); d.setDate(d.getDate()+1); calendarState.year=d.getFullYear();calendarState.month=d.getMonth();calendarState.day=d.getDate(); }
    else if (calendarState.viewMode==='year') { calendarState.year++; }
    if (monthSel) monthSel.value=calendarState.month; if (yearSel) yearSel.value=calendarState.year; renderCalendar();
  });
  document.getElementById('add-event-global') && document.getElementById('add-event-global').addEventListener('click', () => {
    const ds = `${calendarState.year}-${String(calendarState.month+1).padStart(2,'0')}-${String(calendarState.day).padStart(2,'0')}`;
    calendarState.selectedDate = ds; openEventForm(ds);
  });
  document.getElementById('event-allday') && document.getElementById('event-allday').addEventListener('change', () => {
    const tg=document.getElementById('event-time-group'); if(tg) tg.style.opacity=document.getElementById('event-allday').checked?'0.4':'';
  });
  document.getElementById('event-time-trigger') && document.getElementById('event-time-trigger').addEventListener('click', () => {
    openTimePicker(document.getElementById('event-time').value||'', picked => { document.getElementById('event-time').value=picked; document.getElementById('event-time-display').value=formatTimeTo12(picked); });
  });
  document.getElementById('add-notification-btn') && document.getElementById('add-notification-btn').addEventListener('click', () => { if(calendarState.notifications.length>=5) return; calendarState.notifications.push(''); renderNotifInputs(); });
  document.getElementById('save-event') && document.getElementById('save-event').addEventListener('click', saveCalendarEvent);
  document.getElementById('cancel-event') && document.getElementById('cancel-event').addEventListener('click', () => { const ef=document.getElementById('calendar-event-form'); if(ef) ef.style.display='none'; calendarState.notifications=[]; });
  renderCalendar();
}

export function renderCalendar() {
  if (calendarState.viewMode==='month') renderMonthView();
  else if (calendarState.viewMode==='week') renderWeekView();
  else if (calendarState.viewMode==='day') renderDayView();
  else renderYearView();
}

function renderMonthView() {
  const el=document.getElementById('calendar-view'); if(!el) return;
  const events=getStorage('calendarEvents',{}), today=new Date();
  const fd=new Date(calendarState.year,calendarState.month,1).getDay();
  const dim=new Date(calendarState.year,calendarState.month+1,0).getDate();
  let html='<table class="cal-table" role="grid"><thead><tr>'+['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>`<th scope="col">${d}</th>`).join('')+'</tr></thead><tbody><tr>';
  for(let i=0;i<fd;i++) html+='<td></td>';
  for(let d=1;d<=dim;d++) {
    const ds=`${calendarState.year}-${String(calendarState.month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday=d===today.getDate()&&calendarState.month===today.getMonth()&&calendarState.year===today.getFullYear();
    const hasEv=events[ds]&&events[ds].length>0;
    html+=`<td class="${isToday?'today':''}${hasEv?' has-event':''}" data-date="${sanitize(ds)}" tabindex="0" role="gridcell" aria-label="${sanitize(ds)}${hasEv?', has events':''}">${d}</td>`;
    if((fd+d)%7===0) html+='</tr><tr>';
  }
  html+='</tr></tbody></table>';
  el.innerHTML=html;
  el.querySelectorAll('td[data-date]').forEach(cell => {
    const h=()=>{ calendarState.selectedDate=cell.dataset.date; calendarState.day=parseInt(cell.dataset.date.split('-')[2]); showDayDetails(cell.dataset.date); };
    cell.addEventListener('click',h); cell.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')h();});
  });
  const detEl=document.getElementById('calendar-details'); if(detEl) detEl.innerHTML='';
}

function renderWeekView() {
  const el=document.getElementById('calendar-view'); if(!el) return;
  const events=getStorage('calendarEvents',{});
  const d=new Date(calendarState.year,calendarState.month,calendarState.day);
  const ws=new Date(d); ws.setDate(d.getDate()-d.getDay());
  let html='<div class="cal-week-view">';
  for(let i=0;i<7;i++) {
    const day=new Date(ws); day.setDate(ws.getDate()+i);
    const ds=day.toISOString().slice(0,10); const evs=events[ds]||[];
    html+=`<div class="cal-week-day"><div class="cal-week-day-header">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][i]} ${day.getDate()}</div>`;
    html+=evs.length?evs.map(ev=>renderEventChip(ev)).join(''):'<span style="font-size:0.8rem;color:var(--md-on-surface-variant)">No events</span>';
    html+='</div>';
  }
  el.innerHTML=html+'</div>';
}

function renderDayView() {
  const el=document.getElementById('calendar-view'); if(!el) return;
  const ds=`${calendarState.year}-${String(calendarState.month+1).padStart(2,'0')}-${String(calendarState.day).padStart(2,'0')}`;
  const evs=(getStorage('calendarEvents',{}))[ds]||[];
  el.innerHTML=`<div class="cal-day-view"><div class="cal-week-day-header">${sanitize(formatDateDisplay(ds))}</div>${evs.length?evs.map(ev=>renderEventChip(ev)).join(''):'<p style="color:var(--md-on-surface-variant);font-size:0.875rem;margin-top:0.5rem;">No events for this day.</p>'}</div>`;
}

function renderYearView() {
  const el=document.getElementById('calendar-view'); if(!el) return;
  const events=getStorage('calendarEvents',{});
  let html='<div class="cal-year-view">';
  ['January','February','March','April','May','June','July','August','September','October','November','December'].forEach((mName,m) => {
    html+=`<div class="cal-year-month"><div class="cal-year-month-title">${sanitize(mName)}</div>`;
    let hasAny=false;
    for(let d=1;d<=31;d++) { const ds=`${calendarState.year}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; const evs=events[ds]||[]; if(evs.length){hasAny=true;html+=`<div style="margin:2px 0 2px 1rem;font-size:0.8rem;color:var(--md-on-surface-variant)">${d}: ${evs.map(ev=>sanitize(ev.title)).join(', ')}</div>`;} }
    if(!hasAny) html+='<span style="font-size:0.78rem;color:var(--md-on-surface-variant);opacity:0.6">No events</span>';
    html+='</div>';
  });
  el.innerHTML=html+'</div>';
}

function renderEventChip(ev) {
  return `<div class="cal-event"><span class="cal-event-type ${sanitize(ev.type)}">${sanitize(ev.type)}</span><span class="cal-event-title">${sanitize(ev.title)}</span><span class="cal-event-time">${ev.allday?'All day':sanitize(formatTimeTo12(ev.time)||'')}</span></div>`;
}

function showDayDetails(date) {
  const el=document.getElementById('calendar-details'); if(!el) return;
  const evs=(getStorage('calendarEvents',{}))[date]||[];
  let html=`<div style="margin-bottom:0.75rem;font-weight:700;color:var(--md-on-surface)">${sanitize(formatDateDisplay(date))}</div>`;
  html+=evs.length?evs.map((ev,idx)=>`<div class="cal-event"><span class="cal-event-type ${sanitize(ev.type)}">${sanitize(ev.type)}</span><span class="cal-event-title">${sanitize(ev.title)}</span><span class="cal-event-time">${ev.allday?'All day':sanitize(formatTimeTo12(ev.time)||'')}</span><button class="cal-event-del" data-date="${sanitize(date)}" data-idx="${idx}" aria-label="Delete event"><span class="material-icons-round" aria-hidden="true">delete</span></button></div>`).join(''):'<p style="color:var(--md-on-surface-variant);font-size:0.875rem;margin-bottom:0.75rem;">No events.</p>';
  html+=`<button class="btn-secondary" id="add-event-day-btn" style="margin-top:0.5rem;"><span class="material-icons-round" style="font-size:1rem;margin-right:4px" aria-hidden="true">add</span>Add Event</button>`;
  el.innerHTML=html;
  el.querySelectorAll('.cal-event-del').forEach(btn => {
    btn.addEventListener('click',()=>{ let evts=getStorage('calendarEvents',{}); const d=btn.dataset.date,i=parseInt(btn.dataset.idx); if(evts[d]){evts[d].splice(i,1);if(!evts[d].length)delete evts[d];} setStorage('calendarEvents',evts); renderCalendar(); showDayDetails(d); });
  });
  document.getElementById('add-event-day-btn') && document.getElementById('add-event-day-btn').addEventListener('click',()=>openEventForm(date));
}

function openEventForm(date) {
  const ef=document.getElementById('calendar-event-form'); if(!ef) return;
  ef.style.display='';
  const ti=document.getElementById('cal-form-title'); if(ti) ti.textContent='Add Event for '+formatDateDisplay(date);
  const et=document.getElementById('event-title'); if(et) et.value='';
  const etype=document.getElementById('event-type'); if(etype) etype.value='event';
  const allday=document.getElementById('event-allday'); if(allday) allday.checked=false;
  const etd=document.getElementById('event-time-display'); if(etd) etd.value='';
  const eth=document.getElementById('event-time'); if(eth) eth.value='';
  const tg=document.getElementById('event-time-group'); if(tg) tg.style.opacity='';
  calendarState.notifications=[]; renderNotifInputs(); calendarState.selectedDate=date;
  ef.scrollIntoView({behavior:'smooth'});
}

function renderNotifInputs() {
  const el=document.getElementById('notification-list'); if(!el) return;
  el.innerHTML=calendarState.notifications.map((t,i)=>`
    <div class="notification-item">
      <div class="time-picker-wrap" style="flex:1;">
        <input type="text" class="input-field time-display-input notif-time-disp" value="${t?sanitize(formatTimeTo12(t)):''}" data-i="${i}" placeholder="Pick time…" aria-label="Notification time ${i+1}" readonly style="padding-right:3rem;">
        <button type="button" class="time-picker-trigger notif-time-btn" data-i="${i}" aria-label="Open time picker"><span class="material-icons-round" aria-hidden="true">schedule</span></button>
        <input type="hidden" class="notif-time-hidden" data-i="${i}" value="${sanitize(t)}">
      </div>
      <button class="remove-notif" data-i="${i}" type="button" aria-label="Remove notification"><span class="material-icons-round" aria-hidden="true">close</span></button>
    </div>`).join('');
  el.querySelectorAll('.notif-time-btn').forEach(btn => {
    btn.addEventListener('click',()=>{ const i=parseInt(btn.dataset.i); const hidden=el.querySelector(`.notif-time-hidden[data-i="${i}"]`); const disp=el.querySelector(`.notif-time-disp[data-i="${i}"]`); openTimePicker(hidden?hidden.value:'',picked=>{ calendarState.notifications[i]=sanitizeTime(picked); if(hidden)hidden.value=sanitizeTime(picked); if(disp)disp.value=formatTimeTo12(picked); }); });
  });
  el.querySelectorAll('.remove-notif').forEach(btn => { btn.addEventListener('click',()=>{ calendarState.notifications.splice(parseInt(btn.dataset.i),1); renderNotifInputs(); }); });
  const addBtn=document.getElementById('add-notification-btn'); if(addBtn) addBtn.disabled=calendarState.notifications.length>=5;
}

function saveCalendarEvent() {
  if(!calendarState.selectedDate) return;
  const titleEl=document.getElementById('event-title'); const title=titleEl?titleEl.value.trim().slice(0,200):'';
  if(!title){showToast('Enter an event title.','error');return;}
  const typeEl=document.getElementById('event-type'); const type=typeEl&&['event','task','reminder','deadline'].includes(typeEl.value)?typeEl.value:'event';
  const alldayEl=document.getElementById('event-allday'); const allday=alldayEl?alldayEl.checked:false;
  const timeVal=sanitizeTime(document.getElementById('event-time')?document.getElementById('event-time').value:'');
  if(!allday&&!timeVal){showToast('Enter a time or check All Day.','error');return;}
  const notifs=calendarState.notifications.filter(n=>n&&sanitizeTime(n));
  let evts=getStorage('calendarEvents',{}); if(!evts[calendarState.selectedDate]) evts[calendarState.selectedDate]=[];
  evts[calendarState.selectedDate].push({title,type,allday,time:timeVal,notifications:notifs});
  setStorage('calendarEvents',evts);
  const ef=document.getElementById('calendar-event-form'); if(ef) ef.style.display='none';
  calendarState.notifications=[]; showDayDetails(calendarState.selectedDate); renderCalendar(); showToast('Event saved!','success');
}
