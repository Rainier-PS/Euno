import { getStorage, setStorage } from '../core/storage.js';
import { ONBOARDING_STEPS } from '../core/constants.js';
import { initHome } from './home.js';

function _obClamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

function _obTarget(selector) {
  if (!selector) return null;
  for (const sel of selector.split(',')) {
    const el = document.querySelector(sel.trim());
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
      const cs = window.getComputedStyle(el);
      if (cs.display !== 'none' && cs.visibility !== 'hidden') return el;
    }
  }
  return null;
}

function _obPositionTooltip(tooltip, spotRect) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const tt = tooltip.getBoundingClientRect();
  const GAP = 14;
  const EDGE = 8;

  let x, y, placement;

  if (spotRect) {
    const belowY = spotRect.bottom + GAP;
    const aboveY = spotRect.top  - GAP - tt.height;
    const rightX = spotRect.right + GAP;
    const leftX  = spotRect.left  - GAP - tt.width;

    if (belowY + tt.height + EDGE <= vh) {
      placement = 'bottom';
      y = belowY;
      x = _obClamp(spotRect.left + (spotRect.width - tt.width) / 2, EDGE, vw - tt.width - EDGE);
    } else if (aboveY >= EDGE) {
      placement = 'top';
      y = aboveY;
      x = _obClamp(spotRect.left + (spotRect.width - tt.width) / 2, EDGE, vw - tt.width - EDGE);
    } else if (rightX + tt.width + EDGE <= vw) {
      placement = 'right';
      x = rightX;
      y = _obClamp(spotRect.top + (spotRect.height - tt.height) / 2, EDGE, vh - tt.height - EDGE);
    } else {
      placement = 'left';
      x = Math.max(EDGE, leftX);
      y = _obClamp(spotRect.top + (spotRect.height - tt.height) / 2, EDGE, vh - tt.height - EDGE);
    }
  } else {
    placement = 'center';
    x = _obClamp((vw - tt.width)  / 2, EDGE, vw - tt.width  - EDGE);
    y = _obClamp((vh - tt.height) / 2, EDGE, vh - tt.height - EDGE);
  }

  tooltip.style.left = x + 'px';
  tooltip.style.top  = y + 'px';
  tooltip.style.transform = 'none';
  tooltip.dataset.placement = placement;
  return placement;
}

function _obUpdateSpotlight(targetEl, padding) {
  const hole   = document.getElementById('spotlight-hole');
  const svgEl  = document.getElementById('onboarding-mask');
  if (!hole || !svgEl) return null;

  if (!targetEl) {
    hole.setAttribute('width', '0');
    hole.setAttribute('height', '0');
    return null;
  }

  const r   = targetEl.getBoundingClientRect();
  const pad = padding || 0;
  const vw  = window.innerWidth;
  const vh  = window.innerHeight;

  const x   = Math.max(0, r.left   - pad);
  const y   = Math.max(0, r.top    - pad);
  const x2  = Math.min(vw, r.right  + pad);
  const y2  = Math.min(vh, r.bottom + pad);
  const w   = Math.max(0, x2 - x);
  const h   = Math.max(0, y2 - y);

  const cs  = window.getComputedStyle(targetEl);
  const br  = parseFloat(cs.borderRadius) || 0;
  const rx  = Math.min(br + 4, w / 2, h / 2);

  hole.setAttribute('x',  x);
  hole.setAttribute('y',  y);
  hole.setAttribute('width',  w);
  hole.setAttribute('height', h);
  hole.setAttribute('rx', rx);
  hole.setAttribute('ry', rx);

  return { left: x, top: y, right: x + w, bottom: y + h, width: w, height: h };
}

export function initOnboarding() {
  const overlay = document.getElementById('onboarding-overlay');
  const app     = document.getElementById('app');
  if (!overlay) return;

  overlay.style.display = 'none';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.classList.remove('active');

  initOnboarding.restart = launchTour;

  function launchTour() {
    const homeBtn = document.querySelector('[data-page="home"].nav-item') ||
                    document.querySelector('[data-page="home"].bnav-item');
    if (homeBtn) homeBtn.click();

    if (app) app.style.display = 'flex';

    overlay.style.display = '';
    overlay.removeAttribute('aria-hidden');
    overlay.classList.add('active');

    const tooltip  = document.getElementById('onboarding-tooltip');
    const titleEl  = document.getElementById('onboarding-tooltip-title');
    const bodyEl   = document.getElementById('onboarding-tooltip-body');
    const iconEl   = document.getElementById('onboarding-tooltip-icon');
    const stepEl   = document.getElementById('onboarding-tooltip-step');
    const dotsEl   = document.getElementById('onboarding-dots');
    const nextBtn  = document.getElementById('onboarding-next');
    const skipBtn  = document.getElementById('onboarding-skip');

    const total = ONBOARDING_STEPS.length;
    let current = 0;
    let resizeTimer;
    let _resizeListener = null;
    let _orientListener = null;
    let _keyListener    = null;

    function detachListeners() {
      if (_keyListener)    { document.removeEventListener('keydown', _keyListener);     _keyListener    = null; }
      if (_resizeListener) { window.removeEventListener('resize', _resizeListener);     _resizeListener = null; }
      if (_orientListener) { window.removeEventListener('orientationchange', _orientListener); _orientListener = null; }
    }

    if (nextBtn) {
      const nb = nextBtn.cloneNode(true);
      nextBtn.parentNode.replaceChild(nb, nextBtn);
    }
    if (skipBtn) {
      const sb = skipBtn.cloneNode(true);
      skipBtn.parentNode.replaceChild(sb, skipBtn);
    }
    const freshNext = document.getElementById('onboarding-next');
    const freshSkip = document.getElementById('onboarding-skip');

    dotsEl.innerHTML = ONBOARDING_STEPS.map((_, i) =>
      `<button class="ob-dot${i === 0 ? ' active' : ''}" data-i="${i}"
        role="tab" aria-selected="${i === 0}" aria-label="Step ${i+1} of ${total}"></button>`
    ).join('');

    dotsEl.querySelectorAll('.ob-dot').forEach(dot => {
      dot.addEventListener('click', () => goStep(parseInt(dot.dataset.i)));
    });

    function renderStep(n) {
      const s = ONBOARDING_STEPS[n];

      if (iconEl)  iconEl.textContent  = s.icon;
      if (titleEl) titleEl.textContent = s.title;
      if (bodyEl)  bodyEl.textContent  = s.body;
      if (stepEl)  stepEl.textContent  = `${n + 1} of ${total}`;

      const nb2 = document.getElementById('onboarding-next');
      if (nb2) {
        const isLast = n === total - 1;
        nb2.innerHTML = isLast
          ? `Get Started<span class="material-icons-round" aria-hidden="true">check</span>`
          : `Next<span class="material-icons-round" aria-hidden="true">arrow_forward</span>`;
      }

      dotsEl.querySelectorAll('.ob-dot').forEach((dot, i) => {
        const active = i === n;
        dot.classList.toggle('active', active);
        dot.setAttribute('aria-selected', String(active));
      });

      const tt = document.getElementById('onboarding-tooltip');
      if (tt) {
        tt.style.animation = 'none';
        void tt.offsetWidth;
        tt.style.animation = '';
      }

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const targetEl = _obTarget(s.targetSelector);

          if (targetEl) {
            targetEl.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
          }

          requestAnimationFrame(() => {
            const spotRect = _obUpdateSpotlight(targetEl, s.padding);
            const tooltip2 = document.getElementById('onboarding-tooltip');
            if (tooltip2) _obPositionTooltip(tooltip2, spotRect);
          });
        });
      });
    }

    function goStep(n) {
      current = n;
      renderStep(n);
    }

    function finish() {
      detachListeners();
      setStorage('onboarding_done', true);
      window.dispatchEvent(new Event('onboarding-complete'));
      overlay.style.display = 'none';
      overlay.setAttribute('aria-hidden', 'true');
      overlay.classList.remove('active');
      const hole = document.getElementById('spotlight-hole');
      if (hole) { hole.setAttribute('width', '0'); hole.setAttribute('height', '0'); }
      if (app) app.style.display = 'flex';
      initHome();
    }

    freshNext && freshNext.addEventListener('click', () => {
      if (current < total - 1) goStep(current + 1);
      else finish();
    });
    freshSkip && freshSkip.addEventListener('click', finish);

    _keyListener = function onKeyDown(e) {
      if (!overlay || overlay.style.display === 'none') return;
      if (e.key === 'Escape') { finish(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); current < total - 1 ? goStep(current + 1) : finish(); }
      else if (e.key === 'ArrowLeft')  { e.preventDefault(); if (current > 0) goStep(current - 1); }
    };
    document.addEventListener('keydown', _keyListener);

    _resizeListener = function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const s = ONBOARDING_STEPS[current];
        const targetEl = _obTarget(s.targetSelector);
        const spotRect = _obUpdateSpotlight(targetEl, s.padding);
        _obPositionTooltip(document.getElementById('onboarding-tooltip'), spotRect);
      }, 80);
    };
    _orientListener = _resizeListener;
    window.addEventListener('resize', _resizeListener);
    window.addEventListener('orientationchange', _orientListener);

    requestAnimationFrame(() => {
      renderStep(0);
      requestAnimationFrame(() => {
        const nb3 = document.getElementById('onboarding-next');
        nb3 && nb3.focus();
      });
    });
  }

  const seen = getStorage('onboarding_done', false);
  if (seen) {
    overlay.style.display = 'none';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.classList.remove('active');
    if (app) app.style.display = 'flex';
    return;
  }
  launchTour();
}

