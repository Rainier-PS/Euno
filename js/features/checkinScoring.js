export const EMOTION_OPTIONS = [
  { id: 'Happy', icon: 'mood', tone: 'positive' },
  { id: 'Calm', icon: 'spa', tone: 'positive' },
  { id: 'Relaxed', icon: 'weekend', tone: 'positive' },
  { id: 'Motivated', icon: 'rocket_launch', tone: 'positive' },
  { id: 'Excited', icon: 'celebration', tone: 'positive' },
  { id: 'Grateful', icon: 'favorite', tone: 'positive' },
  { id: 'Stressed', icon: 'psychology_alt', tone: 'negative' },
  { id: 'Nervous', icon: 'psychology', tone: 'negative' },
  { id: 'Overwhelmed', icon: 'cloud', tone: 'negative' },
  { id: 'Lonely', icon: 'person_off', tone: 'negative' },
  { id: 'Exhausted', icon: 'battery_alert', tone: 'negative' },
  { id: 'Frustrated', icon: 'mood_bad', tone: 'negative' }
];

export const EMOTION_SCORING = {
  Stressed: { stress: 2 },
  Overwhelmed: { stress: 2 },
  Nervous: { anxiety: 2 },
  Exhausted: { burnout: 2 },
  Lonely: { loneliness: 2 },
  Frustrated: { stress: 1, burnout: 1 }
};

export const STRESS_LEVEL_POINTS = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4 };
export const WORRY_LEVEL_POINTS = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4 };
export const THOUGHT_LOOP_POINTS = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4 };
export const ENERGY_LEVEL_POINTS = { 5: 0, 4: 0, 3: 1, 2: 3, 1: 4 };
export const SOCIAL_LEVEL_POINTS = { 5: 0, 4: 0, 3: 1, 2: 3, 1: 4 };

export const CHALLENGE_THRESHOLDS = {
  stress: 5,
  anxiety: 5,
  burnout: 5,
  overthinking: 5,
  loneliness: 5
};

export const DIMENSION_META = {
  stress: { label: 'Stress', icon: 'psychology_alt' },
  anxiety: { label: 'Anxiety', icon: 'psychology' },
  burnout: { label: 'Burnout', icon: 'battery_alert' },
  overthinking: { label: 'Overthinking', icon: 'loop' },
  loneliness: { label: 'Loneliness', icon: 'person_off' }
};

const SEVERITY_RANGES = {
  stress: [[0, 1, 'Low'], [2, 3, 'Mild'], [4, 5, 'Moderate'], [6, Infinity, 'High']],
  anxiety: [[0, 1, 'Low'], [2, 3, 'Mild'], [4, 5, 'Moderate'], [6, Infinity, 'High']],
  burnout: [[0, 1, 'Low'], [2, 3, 'Mild'], [4, 5, 'Moderate'], [6, Infinity, 'High']],
  overthinking: [[0, 1, 'Low'], [2, 3, 'Mild'], [4, 5, 'Moderate'], [6, Infinity, 'High']],
  loneliness: [[0, 1, 'Low'], [2, 3, 'Mild'], [4, 5, 'Moderate'], [6, Infinity, 'High']]
};

export function calculateScores(entry) {
  let stress_score = 0;
  let anxiety_score = 0;
  let burnout_score = 0;
  let overthinking_score = 0;
  let loneliness_score = 0;

  (entry.moods || []).forEach(mood => {
    const pts = EMOTION_SCORING[mood];
    if (pts) {
      stress_score += pts.stress || 0;
      anxiety_score += pts.anxiety || 0;
      burnout_score += pts.burnout || 0;
      loneliness_score += pts.loneliness || 0;
    }
  });

  stress_score += STRESS_LEVEL_POINTS[entry.stress_level] || 0;
  anxiety_score += WORRY_LEVEL_POINTS[entry.worry_level] || 0;
  overthinking_score += THOUGHT_LOOP_POINTS[entry.thought_loop_level] || 0;
  burnout_score += ENERGY_LEVEL_POINTS[entry.energy_level] || 0;
  loneliness_score += SOCIAL_LEVEL_POINTS[entry.social_connection_level] || 0;

  return { stress_score, anxiety_score, burnout_score, overthinking_score, loneliness_score };
}

export function getSeverity(score, dimension) {
  const ranges = SEVERITY_RANGES[dimension] || SEVERITY_RANGES.stress;
  for (const [min, max, label] of ranges) {
    if (score >= min && score <= max) return label;
  }
  return 'High';
}

export function detectChallenges(scores) {
  const challenges = [];
  if (scores.stress_score >= CHALLENGE_THRESHOLDS.stress) challenges.push('stress');
  if (scores.anxiety_score >= CHALLENGE_THRESHOLDS.anxiety) challenges.push('anxiety');
  if (scores.burnout_score >= CHALLENGE_THRESHOLDS.burnout) challenges.push('burnout');
  if (scores.overthinking_score >= CHALLENGE_THRESHOLDS.overthinking) challenges.push('overthinking');
  if (scores.loneliness_score >= CHALLENGE_THRESHOLDS.loneliness) challenges.push('loneliness');
  return challenges;
}

export function getTotalBurden(scores) {
  return scores.stress_score + scores.anxiety_score + scores.burnout_score + scores.overthinking_score + scores.loneliness_score;
}

export function burdenToWellnessLevel(scores) {
  const total = getTotalBurden(scores);
  if (total <= 3) return 5;
  if (total <= 7) return 4;
  if (total <= 12) return 3;
  if (total <= 17) return 2;
  return 1;
}

export function isCheckinPositive(checkin) {
  if (!checkin) return false;
  const scores = getCheckinScores(checkin);
  if (!scores) return false;
  return detectChallenges(scores).length === 0;
}

export function normalizeCheckinEntry(entry) {
  if (!entry) return null;
  if (entry.moods) return entry;
  if (entry.mood) {
    const moods = entry.mood >= 4 ? ['Happy'] : entry.mood <= 2 ? ['Stressed'] : ['Calm'];
    const stressVal = typeof entry.stress === 'number' ? entry.stress : 5;
    const stress_level = Math.min(5, Math.max(1, Math.round((10 - stressVal) / 2.5) + 1));
    const energyMap = { low: 2, medium: 3, high: 5 };
    return {
      moods,
      stress_level,
      worry_level: 3,
      thought_loop_level: 3,
      energy_level: energyMap[entry.energy] || 3,
      social_connection_level: 3
    };
  }
  return null;
}

export function getCheckinScores(checkin) {
  const normalized = normalizeCheckinEntry(checkin);
  if (!normalized) return null;
  return calculateScores(normalized);
}

export function getCheckinWellnessLevel(checkin) {
  const scores = getCheckinScores(checkin);
  if (!scores) return 0;
  return burdenToWellnessLevel(scores);
}

