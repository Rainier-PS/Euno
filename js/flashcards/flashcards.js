import { getStorage, setStorage } from '../core/storage.js';
import { showToast } from '../utils/notifications.js';
import { sanitize } from '../utils/helpers.js';

export function initFlashcards() {
  const deckNameInput = document.getElementById('flashcard-deck-name');
  const addDeckBtn = document.getElementById('add-flashcard-deck');
  addDeckBtn && addDeckBtn.addEventListener('click', () => {
    const name = deckNameInput ? deckNameInput.value.trim().slice(0,100) : '';
    if (!name) { showToast('Enter a deck name.','error'); return; }
    const decks = getStorage('flashcard_decks',[]);
    decks.push({ name, cards:[], id: Date.now()+Math.random() });
    setStorage('flashcard_decks', decks);
    if (deckNameInput) deckNameInput.value = '';
    renderDecksList(); showToast('Deck created!','success');
  });
  deckNameInput && deckNameInput.addEventListener('keydown', e => { if(e.key==='Enter') addDeckBtn && addDeckBtn.click(); });
  document.getElementById('add-flashcard') && document.getElementById('add-flashcard').addEventListener('click', () => {
    const q = document.getElementById('flashcard-question');
    const a = document.getElementById('flashcard-answer');
    const question = q ? q.value.trim().slice(0,300) : '';
    const answer = a ? a.value.trim().slice(0,300) : '';
    if (!question || !answer) { showToast('Enter both question and answer.','error'); return; }
    const decks = getStorage('flashcard_decks',[]);
    const idx = getStorage('current_deck_idx', -1);
    if (idx < 0 || idx >= decks.length) return;
    if (!decks[idx].cards) decks[idx].cards = [];
    decks[idx].cards.push({ question, answer, correct:0, wrong:0, id: Date.now()+Math.random() });
    setStorage('flashcard_decks', decks);
    if (q) q.value = ''; if (a) a.value = '';
    renderDeckCards(idx); showToast('Card added!','success');
  });
  document.getElementById('delete-flashcard-deck') && document.getElementById('delete-flashcard-deck').addEventListener('click', () => {
    const idx = getStorage('current_deck_idx',-1);
    if (idx < 0) return;
    if (!confirm('Delete this deck and all its cards?')) return;
    const decks = getStorage('flashcard_decks',[]);
    decks.splice(idx, 1);
    setStorage('flashcard_decks', decks);
    setStorage('current_deck_idx', -1);
    const sec = document.getElementById('flashcard-deck-section'); if(sec) sec.style.display='none';
    renderDecksList(); showToast('Deck deleted.','');
  });
  document.getElementById('close-flashcard-deck') && document.getElementById('close-flashcard-deck').addEventListener('click', () => {
    const sec = document.getElementById('flashcard-deck-section'); if(sec) sec.style.display='none';
    setStorage('current_deck_idx',-1);
  });
  renderDecksList();
}

function renderDecksList() {
  const el = document.getElementById('flashcard-decks-list');
  if (!el) return;
  const decks = getStorage('flashcard_decks',[]);
  if (!decks.length) { el.innerHTML = '<p style="color:var(--md-on-surface-variant);font-size:0.875rem;">No decks yet. Create one above!</p>'; return; }
  el.innerHTML = decks.map((d,i) => `
    <div class="deck-item">
      <div class="deck-item-name">${sanitize(d.name)}</div>
      <div class="deck-item-count">${(d.cards||[]).length} cards</div>
      <div class="deck-item-actions">
        <button class="btn-filled open-deck-btn" data-i="${i}" type="button">Open</button>
      </div>
    </div>`).join('');
  el.querySelectorAll('.open-deck-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.i);
      setStorage('current_deck_idx', idx);
      renderDeckCards(idx);
      const sec = document.getElementById('flashcard-deck-section'); if(sec) sec.style.display='';
      sec && sec.scrollIntoView({behavior:'smooth'});
    });
  });
}

function renderDeckCards(idx) {
  const decks = getStorage('flashcard_decks',[]);
  const deck = decks[idx];
  if (!deck) return;
  const nameEl = document.getElementById('current-deck-name'); if(nameEl) nameEl.textContent = deck.name;
  const cards = deck.cards || [];
  const correct = cards.reduce((s,c)=>s+c.correct,0);
  const wrong = cards.reduce((s,c)=>s+c.wrong,0);
  const summEl = document.getElementById('flashcard-review-summary');
  if (summEl) {
    if (cards.length > 0) {
      summEl.className = 'review-summary active';
      summEl.innerHTML = `Cards: ${cards.length} · Correct: <strong style="color:var(--md-success)">${correct}</strong> · Wrong: <strong style="color:var(--md-error)">${wrong}</strong>`;
    } else {
      summEl.className = 'review-summary';
    }
  }
  const grid = document.getElementById('flashcard-deck-cards-grid');
  if (!grid) return;
  if (!cards.length) { grid.innerHTML = '<p style="color:var(--md-on-surface-variant);font-size:0.875rem;">No cards yet. Add one above!</p>'; return; }
  grid.innerHTML = cards.map((c,ci) => `
    <div>
      <div class="flashcard" data-idx="${idx}" data-ci="${ci}">
        <div class="flashcard-inner">
          <div class="fc-front">${sanitize(c.question)}</div>
          <div class="fc-back">${sanitize(c.answer)}</div>
        </div>
      </div>
      <div class="fc-actions-wrap" data-ci="${ci}">
        <div class="fc-actions">
          <button class="fc-btn correct${c.correct>0?' sel':''}" data-idx="${idx}" data-ci="${ci}" type="button">Correct (${c.correct})</button>
          <button class="fc-btn wrong${c.wrong>0?' sel':''}" data-idx="${idx}" data-ci="${ci}" type="button">Wrong (${c.wrong})</button>
          <button class="fc-btn del" data-idx="${idx}" data-ci="${ci}" type="button">Delete</button>
        </div>
      </div>
    </div>`).join('');
  grid.querySelectorAll('.flashcard').forEach(card => {
    card.addEventListener('click', () => {
      card.classList.toggle('flipped');
      const ci = card.dataset.ci;
      const wrap = grid.querySelector(`.fc-actions-wrap[data-ci="${ci}"]`);
      if (wrap) wrap.classList.toggle('visible', card.classList.contains('flipped'));
    });
  });
  grid.querySelectorAll('.fc-btn.correct').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation();
      const decks = getStorage('flashcard_decks',[]); const i=parseInt(btn.dataset.idx); const ci=parseInt(btn.dataset.ci);
      decks[i].cards[ci].correct++; setStorage('flashcard_decks',decks); renderDeckCards(i);
    });
  });
  grid.querySelectorAll('.fc-btn.wrong').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation();
      const decks = getStorage('flashcard_decks',[]); const i=parseInt(btn.dataset.idx); const ci=parseInt(btn.dataset.ci);
      decks[i].cards[ci].wrong++; setStorage('flashcard_decks',decks); renderDeckCards(i);
    });
  });
  grid.querySelectorAll('.fc-btn.del').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation();
      if(!confirm('Delete this card?')) return;
      const decks = getStorage('flashcard_decks',[]); const i=parseInt(btn.dataset.idx); const ci=parseInt(btn.dataset.ci);
      decks[i].cards.splice(ci,1); setStorage('flashcard_decks',decks); renderDeckCards(i);
    });
  });
}
