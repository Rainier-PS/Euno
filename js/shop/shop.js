import { getStorage, setStorage } from '../core/storage.js';
import { todayStr } from '../utils/dateUtils.js';
import { showToast } from '../utils/notifications.js';
import { sanitize } from '../utils/helpers.js';
import { SHOP_ITEMS } from '../core/constants.js';

function getCoinBalance() { return getStorage('coins_balance', 0); }
function setCoinBalance(v) { setStorage('coins_balance', Math.max(0, v)); updateCoinDisplay(); }

export function addCoins(amount, reason) {
  const doubleActive = getStorage('double_coins_active') === todayStr();
  const finalAmount = doubleActive ? amount * 2 : amount;
  const newBal = getCoinBalance() + finalAmount;
  setCoinBalance(newBal);
  const hist = getStorage('coins_history', []);
  hist.unshift({ amount: finalAmount, reason: doubleActive ? `${reason} (2x)` : reason, timestamp: Date.now(), balance: newBal });
  setStorage('coins_history', hist.slice(0, 100));
}

function spendCoins(amount, reason) {
  const bal = getCoinBalance();
  if (bal < amount) return false;
  const newBal = bal - amount;
  setCoinBalance(newBal);
  const hist = getStorage('coins_history', []);
  hist.unshift({ amount: -amount, reason, timestamp: Date.now(), balance: newBal });
  setStorage('coins_history', hist.slice(0, 100));
  return true;
}

export function updateCoinDisplay() {
  const bal = getCoinBalance();
  const el = document.getElementById('sidebar-coin-count');
  if (el) el.textContent = bal;
  const balEl = document.getElementById('coin-balance-display');
  if (balEl) balEl.textContent = bal + ' StudyCoins';
}

export function initShop() {
  updateCoinDisplay();
  renderShop();
}

export function renderShop() {
  updateCoinDisplay();
  const shopGrid = document.getElementById('shop-grid');
  const inventoryList = document.getElementById('inventory-list');
  const historyList = document.getElementById('coin-history-list');

  const inventory = getStorage('inventory', {});
  if (shopGrid) {
    shopGrid.innerHTML = SHOP_ITEMS.map(item => {
      const owned = inventory[item.id] || 0;
      const maxed = owned >= item.maxOwn;
      return `<div class="shop-item${maxed ? ' maxed' : ''}">
        <div class="shop-item-icon" style="color:${sanitize(item.color)}">
          <span class="material-icons-round" aria-hidden="true">${sanitize(item.matIcon)}</span>
        </div>
        <div class="shop-item-info">
          <div class="shop-item-name">${sanitize(item.name)}</div>
          <div class="shop-item-desc">${sanitize(item.desc)}</div>
          ${owned > 0 ? `<div class="shop-item-owned"><span class="material-icons-round" aria-hidden="true" style="font-size:0.9rem;vertical-align:middle">inventory_2</span> Owned: ${owned}${item.maxOwn > 1 && item.maxOwn < 99 ? '/' + item.maxOwn : ''}</div>` : ''}
        </div>
        <button class="btn-filled shop-buy-btn" data-id="${sanitize(item.id)}" ${maxed ? 'disabled' : ''} aria-label="Buy ${sanitize(item.name)} for ${item.price} coins">
          <span class="material-icons-round" aria-hidden="true" style="font-size:1rem">toll</span>${item.price}
        </button>
      </div>`;
    }).join('');
    shopGrid.querySelectorAll('.shop-buy-btn').forEach(btn => {
      btn.addEventListener('click', () => buyShopItem(btn.dataset.id));
    });
  }

  if (inventoryList) {
    const ownedItems = SHOP_ITEMS.filter(i => (inventory[i.id] || 0) > 0);
    if (!ownedItems.length) {
      inventoryList.innerHTML = '<p style="color:var(--md-on-surface-variant);font-size:0.875rem;">Your inventory is empty. Visit the shop above!</p>';
    } else {
      inventoryList.innerHTML = ownedItems.map(i => {
        let useBtn = '';
        if (i.id === 'streak_freeze') {
          useBtn = `<button class="btn-outlined" style="height:32px;padding:0 0.75rem;font-size:0.8rem;" data-use="${sanitize(i.id)}"><span class="material-icons-round" aria-hidden="true" style="font-size:1rem">ac_unit</span> Use</button>`;
        } else if (i.id === 'lucky_spin') {
          useBtn = `<button class="btn-outlined" style="height:32px;padding:0 0.75rem;font-size:0.8rem;" data-use="${sanitize(i.id)}"><span class="material-icons-round" aria-hidden="true" style="font-size:1rem">casino</span> Spin!</button>`;
        } else if (i.id === 'double_coins') {
          const activeToday = getStorage('double_coins_active') === todayStr();
          useBtn = activeToday ? '<span style="font-size:0.75rem;color:var(--md-primary);font-weight:600;">Active today</span>' : `<button class="btn-outlined" style="height:32px;padding:0 0.75rem;font-size:0.8rem;" data-use="${sanitize(i.id)}"><span class="material-icons-round" aria-hidden="true" style="font-size:1rem">currency_exchange</span> Activate</button>`;
        } else if (i.id === 'focus_boost') {
          useBtn = `<button class="btn-outlined" style="height:32px;padding:0 0.75rem;font-size:0.8rem;" data-use="${sanitize(i.id)}"><span class="material-icons-round" aria-hidden="true" style="font-size:1rem">bolt</span> Use</button>`;
        } else if (i.id === 'theme_unlock') {
          const unlocked = getStorage('theme_unlocked', false);
          useBtn = unlocked ? '<span style="font-size:0.75rem;color:var(--md-primary);font-weight:600;">Equipped</span>' : `<button class="btn-outlined" style="height:32px;padding:0 0.75rem;font-size:0.8rem;" data-use="${sanitize(i.id)}"><span class="material-icons-round" aria-hidden="true" style="font-size:1rem">workspace_premium</span> Equip</button>`;
        }
        return `<div class="inventory-item">
          <span class="inventory-icon" style="color:${sanitize(i.color)}">
            <span class="material-icons-round" aria-hidden="true">${sanitize(i.matIcon)}</span>
          </span>
          <div class="inventory-info">
            <div class="inventory-name">${sanitize(i.name)}</div>
            <div class="inventory-qty">Qty: ${inventory[i.id]}</div>
          </div>
          ${useBtn}
        </div>`;
      }).join('');
      inventoryList.querySelectorAll('[data-use]').forEach(btn => {
        btn.addEventListener('click', () => useInventoryItem(btn.dataset.use));
      });
    }
  }

  if (historyList) {
    const hist = getStorage('coins_history', []).slice(0, 20);
    if (!hist.length) {
      historyList.innerHTML = '<p style="color:var(--md-on-surface-variant);font-size:0.875rem;">No coin history yet. Earn coins by checking in, journaling, and completing habits!</p>';
    } else {
      historyList.innerHTML = hist.map(h => `
        <div class="coin-history-item">
          <div class="coin-history-amount${h.amount < 0 ? ' negative' : ''}">
            <span class="material-icons-round" aria-hidden="true" style="font-size:1rem;vertical-align:middle">${h.amount < 0 ? 'remove_circle' : 'add_circle'}</span>
            ${h.amount > 0 ? '+' : ''}${h.amount}
          </div>
          <div class="coin-history-info">
            <div class="coin-history-reason">${sanitize(h.reason)}</div>
            <div class="coin-history-time">${new Date(h.timestamp).toLocaleString()}</div>
          </div>
          <div class="coin-history-total">
            <span class="material-icons-round" aria-hidden="true" style="font-size:0.9rem;vertical-align:middle;color:var(--md-on-surface-variant)">toll</span> ${h.balance}
          </div>
        </div>`).join('');
    }
  }
}

function buyShopItem(itemId) {
  const item = SHOP_ITEMS.find(i => i.id === itemId);
  if (!item) return;
  const inventory = getStorage('inventory', {});
  const owned = inventory[itemId] || 0;
  if (owned >= item.maxOwn) { showToast('You already own the maximum!', 'error'); return; }
  if (getCoinBalance() < item.price) { showToast('Not enough StudyCoins! Keep checking in to earn more.', 'error'); return; }
  if (!confirm(`Buy "${item.name}" for ${item.price} StudyCoins?`)) return;

  if (itemId === 'lucky_spin') {
    const ok = spendCoins(item.price, `Bought: ${item.name}`);
    if (!ok) { showToast('Not enough StudyCoins!', 'error'); return; }
    const prize = [5, 10, 15, 20, 30, 50, 75, 100][Math.floor(Math.random() * 8)];
    addCoins(prize, `Lucky Spin prize`);
    showToast(`Lucky Spin — you won ${prize} StudyCoins!`, 'success');
    renderShop();
    return;
  }

  const ok = spendCoins(item.price, `Bought: ${item.name}`);
  if (!ok) { showToast('Not enough StudyCoins!', 'error'); return; }
  inventory[itemId] = owned + 1;
  setStorage('inventory', inventory);
  showToast(`"${item.name}" added to your inventory!`, 'success');
  renderShop();
}

function useInventoryItem(itemId) {
  const inventory = getStorage('inventory', {});
  if ((inventory[itemId] || 0) <= 0) { showToast('You don\'t have this item!', 'error'); return; }
  if (itemId === 'streak_freeze') {
    inventory[itemId]--;
    setStorage('inventory', inventory);
    const freezes = getStorage('streak_freezes', []);
    freezes.push(todayStr());
    setStorage('streak_freezes', [...new Set(freezes)]);
    showToast('Streak Freeze activated for today! Your streak is protected.', 'success');
    renderShop();
  } else if (itemId === 'lucky_spin') {
    inventory[itemId]--;
    setStorage('inventory', inventory);
    const prize = [5, 10, 15, 20, 30, 50, 75, 100][Math.floor(Math.random() * 8)];
    addCoins(prize, 'Lucky Spin prize');
    showToast(`Lucky Spin — you won ${prize} StudyCoins!`, 'success');
    renderShop();
  } else if (itemId === 'double_coins') {
    const activeToday = getStorage('double_coins_active') === todayStr();
    if (activeToday) { showToast('Double Coins is already active today!', 'error'); return; }
    inventory[itemId]--;
    setStorage('inventory', inventory);
    setStorage('double_coins_active', todayStr());
    showToast('Double Coins activated! You\'ll earn 2x StudyCoins for all activities today.', 'success');
    renderShop();
  } else if (itemId === 'focus_boost') {
    inventory[itemId]--;
    setStorage('inventory', inventory);
    setStorage('focus_boost_unlocked', true);
    showToast('Focus Boost unlocked! 45-minute Pomodoro preset is now available.', 'success');
    renderShop();
  } else if (itemId === 'theme_unlock') {
    const unlocked = getStorage('theme_unlocked', false);
    if (unlocked) { showToast('Golden Theme Badge is already equipped!', 'error'); return; }
    inventory[itemId]--;
    setStorage('inventory', inventory);
    setStorage('theme_unlocked', true);
    showToast('Golden Theme Badge equipped! Your dedication is now displayed on your dashboard.', 'success');
    renderShop();
  }
}

export function calcCheckinStreakWithFreezes(checkins) {
  if (!checkins.length) return { current: 0, longest: 0 };
  const checkDates = new Set(checkins.map(c => c.date));
  const freezes = new Set(getStorage('streak_freezes', []));
  let longest = 0, cur = 0;
  let d = new Date(todayStr() + 'T12:00:00');
  for (let i = 0; i < 365; i++) {
    const ds = d.toISOString().slice(0, 10);
    if (checkDates.has(ds) || freezes.has(ds)) {
      cur++;
      if (cur > longest) longest = cur;
    } else if (i === 0) {
      d.setDate(d.getDate() - 1);
      continue;
    } else {
      break;
    }
    d.setDate(d.getDate() - 1);
  }
  const allDates = [...checkDates].sort();
  let run = 0, maxRun = 0;
  for (let i = 0; i < allDates.length; i++) {
    if (i === 0) { run = 1; } else {
      const prev = new Date(allDates[i-1] + 'T12:00:00');
      prev.setDate(prev.getDate() + 1);
      if (prev.toISOString().slice(0,10) === allDates[i] || freezes.has(allDates[i-1])) run++;
      else run = 1;
    }
    if (run > maxRun) maxRun = run;
  }
  return { current: cur, longest: Math.max(longest, maxRun) };
}
