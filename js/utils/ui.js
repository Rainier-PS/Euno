import { sanitize } from './helpers.js';
import { MOOD_ICONS, MOOD_LABELS } from '../core/constants.js';

export function renderMoodDot(mood) {
  if (!mood) return `<div class="mood-dot mood-dot--empty"><span class="material-icons-round" aria-hidden="true">radio_button_unchecked</span></div>`;
  return `<div class="mood-dot mood-dot--${mood}" title="${sanitize(MOOD_LABELS[mood])}"><span class="material-icons-round" aria-hidden="true">${sanitize(MOOD_ICONS[mood])}</span></div>`;
}
