import { createPetCard } from "./components/petCard.js";
import { createSpeechBubble } from "./components/speechBubble.js";

const STATUS_LABELS = {
  neutral: "Ready",
  happy: "All set",
  stress: "Reflecting on stress",
  anxiety: "Reflecting on anxiety",
  burnout: "Reflecting on burnout",
  overthinking: "Reflecting on overthinking",
  loneliness: "Reflecting on loneliness"
};

export function renderApp(root, { onNavSelect, onInfoOpen, onCheckinSave }) {
  root.innerHTML = "";

  const petCard = createPetCard();
  const speechBubble = createSpeechBubble();

  const contentCard = document.createElement("div");
  contentCard.className = "content-card";
  contentCard.append(speechBubble.element, petCard.element);

  root.appendChild(contentCard);

  return { petCard, speechBubble };
}

export function statusLabelFor(expression) {
  return STATUS_LABELS[expression] || "";
}



const EMOTION_OPTIONS = [
  { id: "Happy",      icon: "mood",            tone: "positive" },
  { id: "Calm",       icon: "spa",             tone: "positive" },
  { id: "Relaxed",    icon: "weekend",         tone: "positive" },
  { id: "Motivated",  icon: "rocket_launch",   tone: "positive" },
  { id: "Excited",    icon: "celebration",     tone: "positive" },
  { id: "Grateful",   icon: "favorite",        tone: "positive" },
  { id: "Stressed",   icon: "psychology_alt",  tone: "negative" },
  { id: "Nervous",    icon: "psychology",      tone: "negative" },
  { id: "Overwhelmed",icon: "cloud",           tone: "negative" },
  { id: "Lonely",     icon: "person_off",      tone: "negative" },
  { id: "Exhausted",  icon: "battery_alert",   tone: "negative" },
  { id: "Frustrated", icon: "mood_bad",        tone: "negative" }
];

const GRAD_QUESTIONS = [
  {
    field: "stress_level",
    legend: "How stressed do you feel today?",
    options: [
      { value: 1, icon: "sentiment_very_satisfied", label: "Not stressed" },
      { value: 2, icon: "sentiment_satisfied",      label: "Slightly" },
      { value: 3, icon: "sentiment_neutral",        label: "Moderate" },
      { value: 4, icon: "sentiment_dissatisfied",   label: "Very" },
      { value: 5, icon: "sentiment_very_dissatisfied", label: "Extremely" }
    ]
  },
  {
    field: "worry_level",
    legend: "How often did you worry about things today?",
    options: [
      { value: 1, icon: "check_circle", label: "Never" },
      { value: 2, icon: "schedule",     label: "Rarely" },
      { value: 3, icon: "more_horiz",   label: "Sometimes" },
      { value: 4, icon: "warning",      label: "Often" },
      { value: 5, icon: "error",        label: "Constantly" }
    ]
  },
  {
    field: "thought_loop_level",
    legend: "How often did you keep thinking about the same problem today?",
    options: [
      { value: 1, icon: "check_circle", label: "Never" },
      { value: 2, icon: "schedule",     label: "Rarely" },
      { value: 3, icon: "more_horiz",   label: "Sometimes" },
      { value: 4, icon: "warning",      label: "Often" },
      { value: 5, icon: "error",        label: "Constantly" }
    ]
  },
  {
    field: "energy_level",
    legend: "How much energy did you have today?",
    options: [
      { value: 5, icon: "bolt",          label: "Very energetic" },
      { value: 4, icon: "battery_full",  label: "Energetic" },
      { value: 3, icon: "battery_5_bar", label: "Normal" },
      { value: 2, icon: "battery_2_bar", label: "Tired" },
      { value: 1, icon: "battery_alert", label: "Exhausted" }
    ]
  },
  {
    field: "social_connection_level",
    legend: "How connected did you feel with other people today?",
    options: [
      { value: 5, icon: "groups",         label: "Very connected" },
      { value: 4, icon: "group",          label: "Connected" },
      { value: 3, icon: "person",         label: "Neutral" },
      { value: 2, icon: "person_outline", label: "Disconnected" },
      { value: 1, icon: "person_off",     label: "Very lonely" }
    ]
  }
];


const EMOTION_SCORING = {
  Stressed:    { stress: 2 },
  Overwhelmed: { stress: 2 },
  Nervous:     { anxiety: 2 },
  Exhausted:   { burnout: 2 },
  Lonely:      { loneliness: 2 },
  Frustrated:  { stress: 1, burnout: 1 }
};
const STRESS_PTS   = { 1:0, 2:1, 3:2, 4:3, 5:4 };
const WORRY_PTS    = { 1:0, 2:1, 3:2, 4:3, 5:4 };
const THOUGHTLOOP  = { 1:0, 2:2, 3:4, 4:6, 5:8 };
const ENERGY_PTS   = { 5:0, 4:0, 3:1, 2:3, 1:4 };
const SOCIAL_PTS   = { 5:0, 4:0, 3:1, 2:3, 1:4 };
const THRESHOLDS   = { stress:5, anxiety:5, burnout:5, overthinking:5, loneliness:5 };

function calculateScores(entry) {
  let s=0, a=0, b=0, o=0, l=0;
  (entry.moods||[]).forEach(m => {
    const p = EMOTION_SCORING[m] || {};
    s += p.stress||0; a += p.anxiety||0; b += p.burnout||0; l += p.loneliness||0;
  });
  s += STRESS_PTS[entry.stress_level]||0;
  a += WORRY_PTS[entry.worry_level]||0;
  o += THOUGHTLOOP[entry.thought_loop_level]||0;
  b += ENERGY_PTS[entry.energy_level]||0;
  l += SOCIAL_PTS[entry.social_connection_level]||0;
  return { stress_score:s, anxiety_score:a, burnout_score:b, overthinking_score:o, loneliness_score:l };
}

function detectChallenges(scores) {
  const out = [];
  if (scores.stress_score       >= THRESHOLDS.stress)       out.push("stress");
  if (scores.anxiety_score      >= THRESHOLDS.anxiety)      out.push("anxiety");
  if (scores.burnout_score      >= THRESHOLDS.burnout)      out.push("burnout");
  if (scores.overthinking_score >= THRESHOLDS.overthinking) out.push("overthinking");
  if (scores.loneliness_score   >= THRESHOLDS.loneliness)   out.push("loneliness");
  return out;
}

function getSeverityLabel(score) {
  const ranges = [
    [0, 1, "Low"],
    [2, 3, "Mild"],
    [4, 5, "Moderate"],
    [6, Infinity, "High"]
  ];

  for (const [min, max, label] of ranges) {
    if (score >= min && score <= max) return label;
  }

  return "High";
}

const DIM_META = {
  stress:       { label:"Stress",       icon:"psychology_alt" },
  anxiety:      { label:"Anxiety",      icon:"psychology" },
  burnout:      { label:"Burnout",      icon:"battery_alert" },
  overthinking: { label:"Overthinking", icon:"loop" },
  loneliness:   { label:"Loneliness",   icon:"person_off" }
};

const REC_MAP = {
  stress:       { name:"Organize the Desk",        icon:"inventory_2" },
  anxiety:      { name:"Control or Let Go",         icon:"self_improvement" },
  burnout:      { name:"Recharge the Pet",          icon:"pets" },
  overthinking: { name:"Pop the Thought",           icon:"bubble_chart" },
  loneliness:   { name:"Grow Friendship Flowers",   icon:"local_florist" }
};

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function getCheckins() {
  try { return JSON.parse(localStorage.getItem("checkins")||"[]"); } catch { return []; }
}
function saveCheckins(arr) {
  try { localStorage.setItem("checkins", JSON.stringify(arr)); } catch {}
}

function mk(tag, cls, attrs={}) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  Object.entries(attrs).forEach(([k,v]) => el.setAttribute(k,v));
  return el;
}
function icon(name) {
  const s = mk("span","material-symbols-rounded");
  s.setAttribute("aria-hidden","true"); s.textContent = name; return s;
}

function buildCheckinSection(onCheckinSave) {
  const wrap = mk("section","checkin-wrap");
  wrap.setAttribute("aria-label","Daily Check-In");

  
  const heading = mk("div","checkin-heading");
  const h2 = mk("h2","checkin-heading__title");
  h2.textContent = "Daily Check-In";
  const sub = mk("p","checkin-heading__sub");
  sub.textContent = "A moment to notice how you're doing.";
  heading.append(h2, sub);
  wrap.appendChild(heading);

  
  const card = mk("div","checkin-form-card");
  wrap.appendChild(card);

  
  const state = {
    moods: [],
    stress_level: 0,
    worry_level: 0,
    thought_loop_level: 0,
    energy_level: 0,
    social_connection_level: 0
  };

  
  const emotionBlock = mk("fieldset","checkin-field");
  const eLegend = mk("legend","checkin-field__legend");
  eLegend.textContent = "How are you feeling right now?";
  const eHint = mk("p","checkin-field__hint");
  eHint.textContent = "Select 1 to 3 emotions";
  const eGrid = mk("div","emotion-grid");
  eGrid.setAttribute("role","group");
  eGrid.setAttribute("aria-label","Emotions");

  EMOTION_OPTIONS.forEach(opt => {
    const btn = mk("button",`emotion-chip emotion-chip--${opt.tone}`);
    btn.type = "button";
    btn.setAttribute("aria-pressed","false");
    btn.setAttribute("data-emotion", opt.id);
    const ic = mk("span","emotion-chip__icon material-symbols-rounded");
    ic.setAttribute("aria-hidden","true");
    ic.textContent = opt.icon;
    const lbl = mk("span","emotion-chip__label");
    lbl.textContent = opt.id;
    btn.append(ic, lbl);

    btn.addEventListener("click", () => {
      const idx = state.moods.indexOf(opt.id);
      if (idx >= 0) {
        state.moods.splice(idx, 1);
        btn.classList.remove("is-active");
        btn.setAttribute("aria-pressed","false");
      } else {
        if (state.moods.length >= 3) {
          showToast(card,"You can select up to 3 emotions.","warn"); return;
        }
        state.moods.push(opt.id);
        btn.classList.add("is-active");
        btn.setAttribute("aria-pressed","true");
      }
      const c = state.moods.length;
      eHint.textContent = !c ? "Select 1 to 3 emotions"
        : c < 3 ? `${c} selected — up to 3 allowed`
        : "3 emotions selected";
      updatePreview();
    });
    eGrid.appendChild(btn);
  });
  emotionBlock.append(eLegend, eHint, eGrid);
  card.appendChild(emotionBlock);

  
  GRAD_QUESTIONS.forEach(q => {
    const fs = mk("fieldset","checkin-field");
    const lg = mk("legend","checkin-field__legend");
    lg.textContent = q.legend;
    const btnRow = mk("div","grad-row");
    btnRow.setAttribute("role","radiogroup");
    btnRow.setAttribute("data-field", q.field);

    q.options.forEach(opt => {
      const btn = mk("button","grad-btn");
      btn.type="button";
      btn.setAttribute("aria-pressed","false");
      btn.setAttribute("data-value", opt.value);
      const ic = mk("span","grad-btn__icon material-symbols-rounded");
      ic.setAttribute("aria-hidden","true"); ic.textContent = opt.icon;
      const lb = mk("span","grad-btn__label"); lb.textContent = opt.label;
      btn.append(ic, lb);

      btn.addEventListener("click", () => {
        btnRow.querySelectorAll(".grad-btn").forEach(b => {
          b.classList.remove("is-active");
          b.setAttribute("aria-pressed","false");
        });
        btn.classList.add("is-active");
        btn.setAttribute("aria-pressed","true");
        state[q.field] = parseInt(opt.value, 10);
        updatePreview();
      });
      btnRow.appendChild(btn);
    });
    fs.append(lg, btnRow);
    card.appendChild(fs);
  });

  
  const preview = mk("div","checkin-preview");
  preview.setAttribute("aria-live","polite");
  preview.style.display = "none";
  card.appendChild(preview);

  function updatePreview() {
    const complete =
      state.moods.length >= 1 &&
      state.stress_level && state.worry_level &&
      state.thought_loop_level && state.energy_level &&
      state.social_connection_level;

    if (!complete) { preview.style.display = "none"; return; }
    preview.style.display = "";

    const scores = calculateScores(state);
    const challenges = detectChallenges(scores);

    const dims = ["stress","anxiety","burnout","overthinking","loneliness"];
    let html = `<div class="preview-header">
      <span class="material-symbols-rounded preview-header__icon" aria-hidden="true">monitor_heart</span>
      <div><p class="preview-header__title">Today's Assessment</p>
           <p class="preview-header__sub">Based on your responses</p></div>
    </div>
    <div class="preview-dims">`;
    dims.forEach(dim => {
      const score = scores[dim+"_score"];
      const sev = getSeverityLabel(score, dim);
      const sevClass = sev.toLowerCase();
      html += `<div class="preview-dim-row">
        <span class="material-symbols-rounded preview-dim__icon" aria-hidden="true">${DIM_META[dim].icon}</span>
        <span class="preview-dim__label">${DIM_META[dim].label}</span>
        <span class="preview-dim__score">${score}</span>
        <span class="preview-dim__sev preview-dim__sev--${sevClass}">${sev}</span>
      </div>`;
    });
    html += "</div>";

    if (!challenges.length) {
      html += `<div class="preview-alert preview-alert--ok">
        <span class="material-symbols-rounded" aria-hidden="true">check_circle</span>
        No significant challenges detected today.
      </div>`;
    } else {
      challenges.forEach(c => {
        html += `<div class="preview-alert preview-alert--warn">
          <span class="material-symbols-rounded" aria-hidden="true">info</span>
          ${DIM_META[c].label} challenge detected — consider using wellness tools.
        </div>`;
      });
      const recs = challenges.map(c => REC_MAP[c]).filter(Boolean);
      if (recs.length) {
        html += `<div class="preview-recs">
          <p class="preview-recs__heading">Recommended activities</p>
          <div class="preview-recs__list">`;
        recs.forEach(r => {
          html += `<div class="preview-rec-item">
            <span class="material-symbols-rounded preview-rec__icon" aria-hidden="true">${r.icon}</span>
            <span class="preview-rec__name">${r.name}</span>
            <span class="material-symbols-rounded preview-rec__arrow" aria-hidden="true">arrow_forward</span>
          </div>`;
        });
        html += "</div></div>";
      }
    }
    preview.innerHTML = html;
  }

  
  const saveBtn = mk("button","checkin-save-btn");
  saveBtn.type = "button";
  saveBtn.append(icon("save"));
  const saveLbl = document.createTextNode(" Save Check-In");
  saveBtn.appendChild(saveLbl);
  card.appendChild(saveBtn);

  
  const doneBanner = mk("div","checkin-done-banner");
  doneBanner.setAttribute("role","status");
  doneBanner.style.display = "none";
  card.appendChild(doneBanner);

  function applyLock() {
    const checkins = getCheckins();
    const done = checkins.some(c => c.date === todayStr());
    if (done) {
      saveBtn.disabled = true;
      saveBtn.setAttribute("aria-disabled","true");
      saveBtn.innerHTML = "";
      saveBtn.append(icon("check_circle"));
      saveBtn.appendChild(document.createTextNode(" Already checked in today"));
      doneBanner.style.display = "";
      doneBanner.innerHTML = `<span class="material-symbols-rounded checkin-done__icon" aria-hidden="true">check_circle</span>
        <div>
          <strong>You've already checked in today.</strong>
          <p>Come back tomorrow to continue your streak.</p>
        </div>`;
    } else {
      saveBtn.disabled = false;
      saveBtn.removeAttribute("aria-disabled");
      doneBanner.style.display = "none";
    }
  }

  applyLock();

  saveBtn.addEventListener("click", () => {
    const checkins = getCheckins();
    if (checkins.some(c => c.date === todayStr())) {
      showToast(card,"You've already checked in today.","warn"); return;
    }
    if (!state.moods.length)           { showToast(card,"Please select at least one emotion.","error"); return; }
    if (!state.stress_level)           { showToast(card,"Please answer the stress question.","error"); return; }
    if (!state.worry_level)            { showToast(card,"Please answer the worry question.","error"); return; }
    if (!state.thought_loop_level)     { showToast(card,"Please answer the thought loop question.","error"); return; }
    if (!state.energy_level)           { showToast(card,"Please answer the energy question.","error"); return; }
    if (!state.social_connection_level){ showToast(card,"Please answer the social connection question.","error"); return; }

    const scores = calculateScores(state);
    const challenges = detectChallenges(scores);
    const entry = {
      date: todayStr(),
      moods: [...state.moods],
      stress_level: state.stress_level,
      worry_level: state.worry_level,
      thought_loop_level: state.thought_loop_level,
      energy_level: state.energy_level,
      social_connection_level: state.social_connection_level,
      scores,
      challenges,
      timestamp: Date.now()
    };
    checkins.push(entry);
    saveCheckins(checkins);
    showToast(card,"Check-in saved! Great job.","success");

    if (typeof onCheckinSave === "function") onCheckinSave({ scores, challenges, entry });

    
    state.moods = [];
    ["stress_level","worry_level","thought_loop_level","energy_level","social_connection_level"]
      .forEach(f => state[f] = 0);
    card.querySelectorAll(".emotion-chip.is-active").forEach(b => {
      b.classList.remove("is-active"); b.setAttribute("aria-pressed","false");
    });
    card.querySelectorAll(".grad-btn.is-active").forEach(b => {
      b.classList.remove("is-active"); b.setAttribute("aria-pressed","false");
    });
    preview.style.display = "none";
    applyLock();
  });

  return wrap;
}


function showToast(parent, message, type="info") {
  const existing = parent.querySelector(".ci-toast");
  if (existing) existing.remove();
  const t = mk("div",`ci-toast ci-toast--${type}`);
  t.setAttribute("role","alert");
  t.textContent = message;
  parent.prepend(t);
  requestAnimationFrame(() => t.classList.add("ci-toast--visible"));
  setTimeout(() => { t.classList.remove("ci-toast--visible"); setTimeout(() => t.remove(), 300); }, 3000);
}


export function renderInfoDialog(root, onClose) {
  const overlay = document.createElement("div");
  overlay.className = "info-dialog-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "info-dialog-title");

  const dialog = document.createElement("div");
  dialog.className = "info-dialog";

  const title = document.createElement("h2");
  title.id = "info-dialog-title";
  title.className = "info-dialog__title";
  title.textContent = "About Euno";

  const body = document.createElement("p");
  body.className = "info-dialog__body";
  body.textContent =
    "Euno is a wellness companion that reflects what your daily check-in shows. When a condition reaches a high severity, Euno acknowledges it alongside you and points toward the coping tools built into this space.";

  const closeBtn = document.createElement("button");
  closeBtn.className = "info-dialog__close";
  closeBtn.type = "button";
  closeBtn.textContent = "Close";

  function dismiss() {
    overlay.remove();
    document.removeEventListener("keydown", onKeydown);
    if (typeof onClose === "function") onClose();
  }

  function onKeydown(e) {
    if (e.key === "Escape") dismiss();
  }

  closeBtn.addEventListener("click", dismiss);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) dismiss(); });
  document.addEventListener("keydown", onKeydown);

  dialog.append(title, body, closeBtn);
  overlay.appendChild(dialog);
  root.appendChild(overlay);
  closeBtn.focus();
}
