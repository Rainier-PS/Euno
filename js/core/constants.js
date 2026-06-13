export const MOOD_ICONS = ['','sentiment_very_dissatisfied','sentiment_dissatisfied','sentiment_neutral','sentiment_satisfied','sentiment_very_satisfied'];

export const MOOD_LABELS = ['','Struggling','Low','Okay','Good','Amazing'];

export const MOOD_COLORS = ['','#B3261E','#E8650A','#8B5E00','#186A3B','#6750A4'];

export const PRIORITY_ORDER = { Urgent: 0, High: 1, Medium: 2, Low: 3 };

export const ONBOARDING_STEPS = [
  {
    icon: 'auto_stories',
    title: 'Welcome to Euno',
    body: 'Your all-in-one wellness and study companion. This quick tour highlights the key features.',
    targetSelector: null,
    padding: 0
  },
  {
    icon: 'cottage',
    title: 'Your Dashboard',
    body: 'See today\'s mood, habit progress, and quick actions at a glance every day.',
    targetSelector: '#page-home .page-inner',
    padding: 8
  },
  {
    icon: 'navigation',
    title: 'Navigation',
    body: 'Use the sidebar (desktop) or bottom bar (mobile) to move between all sections of the app.',
    targetSelector: '#sidebar, #bottom-nav',
    padding: 8
  },
  {
    icon: 'sentiment_satisfied',
    title: 'Daily Check-In',
    body: 'Log your mood, energy, and sleep each day to track your emotional wellbeing over time.',
    targetSelector: '#sidebar, #bottom-nav',
    padding: 8
  },
  {
    icon: 'insights',
    title: 'Insights & Wellness',
    body: 'See your progress trends, generate wellness reports, and explore wellness tools — all in one place.',
    targetSelector: '#sidebar, #bottom-nav',
    padding: 8
  }
];

export const POMO_TIPS = [
  'Stay focused for 25 minutes, then take a short 5-minute break.',
  'Remove distractions before starting your session.',
  'After 4 pomodoros, take a longer 15-20 minute break.',
  'Write down your task before starting to stay on track.',
  'Drink water and stretch during your breaks.',
  'Turn off notifications during focus sessions.',
  'One task at a time — multitasking reduces efficiency.'
];

export const BREATH_PATTERNS = {
  '478': [{ phase:'Inhale', dur:4000 }, { phase:'Hold', dur:7000 }, { phase:'Exhale', dur:8000 }],
  'box': [{ phase:'Inhale', dur:4000 }, { phase:'Hold', dur:4000 }, { phase:'Exhale', dur:4000 }, { phase:'Hold', dur:4000 }],
  'calm': [{ phase:'Inhale', dur:4000 }, { phase:'Exhale', dur:6000 }]
};

export const CHALLENGES = [
  { icon:'directions_walk', title:'10-min Walk', desc:'Step outside for fresh air' },
  { icon:'local_drink', title:'Drink Water', desc:'8 glasses today' },
  { icon:'menu_book', title:'Read 10 Min', desc:'Any book or article' },
  { icon:'self_improvement', title:'Meditate', desc:'5 minutes mindfulness' },
  { icon:'phone_disabled', title:'Screen Break', desc:'30 mins without phone' },
  { icon:'night_shelter', title:'Sleep Early', desc:'Bed by 10 PM' },
  { icon:'fitness_center', title:'Exercise', desc:'15 mins movement' },
  { icon:'edit_note', title:'Journaling', desc:'Write 3 sentences' }
];

export const REFLECTION_PROMPTS = [
  'What is one thing you learned about yourself today?',
  'What are three small wins from this week?',
  'Who made a positive impact on your life recently, and why?',
  'What challenge are you most proud of overcoming?',
  'If today were perfect, what would it look like?',
  'What emotion have you been feeling most this week?',
  'What is one habit you want to build this month?',
  'When did you last feel truly at peace?',
  'What would you tell your past self from one year ago?',
  'What does success mean to you right now?',
  'What is draining your energy, and how can you reduce it?',
  'What are you most grateful for in your life today?'
];

export const SHOP_ITEMS = [
  { id: 'streak_freeze',  matIcon: 'ac_unit',            color: 'var(--md-primary)',   name: 'Streak Freeze',        desc: 'Protects your check-in streak for 1 missed day. Used automatically.', price: 50,  maxOwn: 5  },
  { id: 'double_coins',   matIcon: 'currency_exchange',  color: 'var(--md-primary)',   name: 'Double Coins (1 day)', desc: 'Earn 2× StudyCoins for all activities today.',                         price: 30,  maxOwn: 10 },
  { id: 'lucky_spin',     matIcon: 'casino',             color: 'var(--md-primary)',   name: 'Lucky Spin',           desc: 'Spin to win 5–100 bonus StudyCoins instantly.',                        price: 20,  maxOwn: 99 },
  { id: 'focus_boost',    matIcon: 'bolt',               color: 'var(--md-primary)',   name: 'Focus Boost',          desc: 'Unlock a 45-minute Pomodoro preset for power study sessions.',         price: 40,  maxOwn: 99 },
  { id: 'theme_unlock',   matIcon: 'workspace_premium',  color: 'var(--md-primary)',   name: 'Golden Theme Badge',   desc: 'A shiny golden badge on your dashboard to show off your dedication.',  price: 100, maxOwn: 1  }
];
