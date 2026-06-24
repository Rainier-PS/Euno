'use strict';

const ITEMS = [
    { id: 'book-1', label: 'Novel', category: 'books', icon: 'menu_book' },
    { id: 'book-2', label: 'Textbook', category: 'books', icon: 'auto_stories' },
    { id: 'book-3', label: 'Journal', category: 'books', icon: 'import_contacts' },
    { id: 'paper-1', label: 'Invoice', category: 'papers', icon: 'description' },
    { id: 'paper-2', label: 'Report', category: 'papers', icon: 'article' },
    { id: 'paper-3', label: 'Contract', category: 'papers', icon: 'contract' },
    { id: 'pen-1', label: 'Ballpoint', category: 'pens', icon: 'edit' },
    { id: 'pen-2', label: 'Marker', category: 'pens', icon: 'draw' },
    { id: 'pen-3', label: 'Fountain pen', category: 'pens', icon: 'stylus_note' },
    { id: 'note-1', label: 'Task list', category: 'notes', icon: 'sticky_note_2' },
    { id: 'note-2', label: 'Reminder', category: 'notes', icon: 'note_alt' },
    { id: 'note-3', label: 'Memo', category: 'notes', icon: 'edit_note' },
];

const TIMER_DURATION = 60;
const POINTS_PER_ITEM = 10;

let state = {
    score: 0,
    timeLeft: TIMER_DURATION,
    placed: 0,
    timerInterval: null,
    dragItemId: null,
    touchClone: null,
    touchItemId: null,
    active: false,
};

const scoreEl = document.getElementById('score');
const timerEl = document.getElementById('timer');
const itemPool = document.getElementById('item-pool');
const overlaySuccess = document.getElementById('overlay-success');
const overlayFailure = document.getElementById('overlay-failure');
const finalScore = document.getElementById('final-score');
const finalTime = document.getElementById('final-time');
const failScore = document.getElementById('fail-score');
const failRemaining = document.getElementById('fail-remaining');
const toast = document.getElementById('toast');
const drops = document.querySelectorAll('.container-drop');
const containers = document.querySelectorAll('.container');

function init() {
    clearInterval(state.timerInterval);

    state = {
        score: 0,
        timeLeft: TIMER_DURATION,
        placed: 0,
        timerInterval: null,
        dragItemId: null,
        touchClone: null,
        touchItemId: null,
        active: true,
    };

    scoreEl.textContent = '0';
    timerEl.textContent = TIMER_DURATION;
    timerEl.classList.remove('urgent');

    overlaySuccess.hidden = true;
    overlayFailure.hidden = true;
    closeDeskDrawer();

    drops.forEach(d => { d.innerHTML = ''; });
    containers.forEach(c => c.classList.remove('drag-over', 'drop-valid', 'drop-invalid'));

    renderItems();
    startTimer();
}

function shuffleItems(items) {
    return [...items]
        .map(item => ({
            item,
            random: crypto.getRandomValues(new Uint32Array(1))[0]
        }))
        .sort((a, b) => a.random - b.random)
        .map(entry => entry.item);
}

function updateDeskCount() {
    const remaining = ITEMS.length - state.placed;
    const countEl = document.getElementById('desk-count');
    if (countEl) countEl.textContent = remaining;
}

function renderItems() {
    itemPool.innerHTML = '';

    const shuffledItems = shuffleItems(ITEMS);

    shuffledItems.forEach(item => {
        itemPool.appendChild(buildItemEl(item));
    });

    updateDeskCount();
}

const deskZone = document.querySelector('.desk-zone');
const deskToggle = document.getElementById('desk-toggle');

function setupDeskToggle() {
    if (!deskToggle) return;
    deskToggle.addEventListener('click', () => {
        const isOpen = deskZone.classList.toggle('open');
        deskToggle.setAttribute('aria-expanded', String(isOpen));
    });
}

function closeDeskDrawer() {
    deskZone.classList.remove('open');
    if (deskToggle) deskToggle.setAttribute('aria-expanded', 'false');
}

function buildItemEl(item) {
    const el = document.createElement('div');
    el.className = 'item';
    el.setAttribute('role', 'listitem');
    el.setAttribute('draggable', 'true');
    el.setAttribute('tabindex', '0');
    el.dataset.id = item.id;
    el.dataset.category = item.category;
    el.setAttribute('aria-label', `${item.label} — drag to ${item.category}`);
    el.innerHTML =
        `<span class="material-symbols-rounded" aria-hidden="true">${item.icon}</span>` +
        `<span>${item.label}</span>`;

    el.addEventListener('dragstart', onDragStart);
    el.addEventListener('dragend', onDragEnd);
    el.addEventListener('keydown', onItemKeydown);
    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);

    return el;
}

function startTimer() {
    state.timerInterval = setInterval(() => {
        state.timeLeft--;
        timerEl.textContent = state.timeLeft;
        if (state.timeLeft <= 10) timerEl.classList.add('urgent');
        if (state.timeLeft <= 0) {
            clearInterval(state.timerInterval);
            showFailure();
        }
    }, 1000);
}

let kbSelectedId = null;

function onItemKeydown(e) {
    if (!state.active) return;
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const id = e.currentTarget.dataset.id;
        if (kbSelectedId === id) {
            kbSelectedId = null;
            e.currentTarget.setAttribute('aria-grabbed', 'false');
        } else {
            if (kbSelectedId) {
                const prev = itemPool.querySelector(`[data-id="${kbSelectedId}"]`);
                if (prev) prev.setAttribute('aria-grabbed', 'false');
            }
            kbSelectedId = id;
            e.currentTarget.setAttribute('aria-grabbed', 'true');
            showToast('Select a container — press Enter on it', '');
        }
    }
}

function setupContainerKeyboard() {
    containers.forEach(container => {
        container.setAttribute('tabindex', '0');
        container.addEventListener('keydown', e => {
            if (!state.active || !kbSelectedId) return;
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const itemEl = itemPool.querySelector(`[data-id="${kbSelectedId}"]`);
                const drop = container.querySelector('.container-drop');
                if (itemEl && drop) {
                    itemEl.setAttribute('aria-grabbed', 'false');
                    handleDrop(itemEl, drop);
                    kbSelectedId = null;
                }
            }
        });
    });
}

function onDragStart(e) {
    if (!state.active) { e.preventDefault(); return; }
    state.dragItemId = e.currentTarget.dataset.id;
    e.currentTarget.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', state.dragItemId);
}

function onDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    state.dragItemId = null;
    clearDragStates();
}

drops.forEach(drop => {
    drop.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        drop.closest('.container').classList.add('drag-over');
    });

    drop.addEventListener('dragleave', e => {
        if (!drop.contains(e.relatedTarget)) {
            drop.closest('.container').classList.remove('drag-over');
        }
    });

    drop.addEventListener('drop', e => {
        e.preventDefault();
        const id = e.dataTransfer.getData('text/plain');
        const itemEl = itemPool.querySelector(`[data-id="${id}"]`);
        if (itemEl) handleDrop(itemEl, drop);
        clearDragStates();
    });
});

function onTouchStart(e) {
    if (!state.active) return;
    const el = e.currentTarget;
    const touch = e.touches[0];
    state.touchItemId = el.dataset.id;

    const rect = el.getBoundingClientRect();
    const clone = el.cloneNode(true);
    clone.style.cssText = `
    position: fixed;
    left: ${rect.left}px;
    top: ${rect.top}px;
    width: ${rect.width}px;
    z-index: 9999;
    pointer-events: none;
    opacity: 0.8;
    transform: scale(1.05);
    transition: none;
  `;
    document.body.appendChild(clone);
    state.touchClone = clone;
    state._touchOffsetX = touch.clientX - rect.left;
    state._touchOffsetY = touch.clientY - rect.top;
}

function onTouchMove(e) {
    if (!state.touchClone) return;
    e.preventDefault();
    const touch = e.touches[0];
    state.touchClone.style.left = `${touch.clientX - state._touchOffsetX}px`;
    state.touchClone.style.top = `${touch.clientY - state._touchOffsetY}px`;

    clearDragStates();
    state.touchClone.style.display = 'none';
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    state.touchClone.style.display = '';
    const drop = el && el.closest('.container-drop');
    if (drop) drop.closest('.container').classList.add('drag-over');
}

function onTouchEnd(e) {
    if (!state.touchClone) return;
    const touch = e.changedTouches[0];
    state.touchClone.style.display = 'none';
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    state.touchClone.remove();
    state.touchClone = null;

    const drop = el && el.closest('.container-drop');
    if (drop && state.touchItemId) {
        const itemEl = itemPool.querySelector(`[data-id="${state.touchItemId}"]`);
        if (itemEl) handleDrop(itemEl, drop);
    }

    clearDragStates();
    state.touchItemId = null;
}

function handleDrop(itemEl, dropZone) {
    if (!state.active) return;

    const itemCat = itemEl.dataset.category;
    const dropCat = dropZone.dataset.category;
    const container = dropZone.closest('.container');

    if (itemCat === dropCat) {
        placeItem(itemEl, dropZone, container);
    } else {
        container.classList.add('drop-invalid');
        setTimeout(() => container.classList.remove('drop-invalid'), 400);
        showToast('Wrong container', 'incorrect');
    }
}

function placeItem(itemEl, dropZone, container) {
    const meta = ITEMS.find(i => i.id === itemEl.dataset.id);

    itemEl.classList.add('placed');
    itemEl.setAttribute('aria-disabled', 'true');
    itemEl.removeAttribute('draggable');

    const chip = document.createElement('div');
    chip.className = 'item-placed';
    chip.setAttribute('aria-label', meta.label);
    chip.innerHTML =
        `<span class="material-symbols-rounded" aria-hidden="true">${meta.icon}</span>` +
        `<span>${meta.label}</span>`;
    dropZone.appendChild(chip);

    container.classList.add('drop-valid');
    setTimeout(() => container.classList.remove('drop-valid'), 500);

    state.score += POINTS_PER_ITEM;
    state.placed += 1;
    scoreEl.textContent = state.score;
    updateDeskCount();
    showToast(`+${POINTS_PER_ITEM}`, 'correct');

    if (state.placed === ITEMS.length) {
        setTimeout(showSuccess, 350);
    }
}

function clearDragStates() {
    containers.forEach(c => c.classList.remove('drag-over'));
}

let toastTimer = null;

function showToast(msg, type) {
    clearTimeout(toastTimer);
    toast.className = `toast${type ? ' ' + type : ''}`;
    toast.textContent = msg;

    requestAnimationFrame(() => {
        requestAnimationFrame(() => { toast.classList.add('show'); });
    });

    toastTimer = setTimeout(() => toast.classList.remove('show'), 1000);
}

function showSuccess() {
    let msg = 'Workspace sequence organized structurally. Optimal order achieved.';
    if (window.EunoGameUtils) {
        const earned = window.EunoGameUtils.awardStudyCoins(10, 'Organized Desk');
        const currentHighscore = window.EunoGameUtils.getHighScore('organize_desk');
        window.EunoGameUtils.saveHighScore('organize_desk', currentHighscore + 1);
        msg += ` +${earned} StudyCoins!`;
    }
    showToast(msg, 'success');
    
    if (!state.active) return;
    state.active = false;
    clearInterval(state.timerInterval);
    finalScore.textContent = state.score;
    finalTime.textContent = state.timeLeft;
    overlaySuccess.hidden = false;
    overlaySuccess.querySelector('.overlay-card').focus();
}

function showFailure() {
    if (!state.active) return;
    state.active = false;
    failScore.textContent = state.score;
    failRemaining.textContent = ITEMS.length - state.placed;
    overlayFailure.hidden = false;
    overlayFailure.querySelector('.overlay-card').focus();
}

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        if (!overlaySuccess.hidden || !overlayFailure.hidden) init();
    }
});

document.getElementById('restart-btn').addEventListener('click', init);
document.getElementById('success-restart').addEventListener('click', init);
document.getElementById('failure-restart').addEventListener('click', init);

setupContainerKeyboard();
setupDeskToggle();
init();
