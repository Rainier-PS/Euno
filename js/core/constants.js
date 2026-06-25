export const MOOD_ICONS = ['','sentiment_very_dissatisfied','sentiment_dissatisfied','sentiment_neutral','sentiment_satisfied','sentiment_very_satisfied'];

export const MOOD_LABELS = ['','Struggling','Low','Okay','Good','Amazing'];

export const MOOD_COLORS = ['','#B3261E','#E8650A','#8B5E00','#186A3B','#6750A4'];

export const WELLNESS_LEVEL_LABELS = ['','Needs Support','Low','Moderate','Good','Thriving'];

export const DIARY_PROMPTS = [
  'What made today meaningful?',
  'What challenged you today?',
  'What are you grateful for today?',
  'What is one thing you learned today?',
  'How are you feeling right now?'
];

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
    icon: 'smart_toy',
    title: 'Your Wellness Companion',
    body: 'Euno the pet reflects your emotional state. Check in daily and watch how Euno responds to your wellbeing.',
    targetSelector: '.pet-card__stage, #euno-app',
    padding: 16
  },
  {
    icon: 'sentiment_satisfied',
    title: 'Daily Check-In',
    body: 'Tap Check-In to log your mood and emotional dimensions. It only takes a minute.',
    targetSelector: 'a[href="checkin.html"].nav-item, a[href="checkin.html"].bnav-item',
    padding: 6
  },
  {
    icon: 'menu_book',
    title: 'Diary',
    body: 'Write private entries with full Markdown support. Your thoughts, saved locally and never shared.',
    targetSelector: 'a[href="diary.html"].nav-item, a[href="diary.html"].bnav-item',
    padding: 6
  },
  {
    icon: 'extension',
    title: 'Coping Games',
    body: 'Five short interactive games designed to help you manage stress, anxiety, and overthinking.',
    targetSelector: 'a[href="games.html"].nav-item, a[href="games.html"].bnav-item, .bnav-center',
    padding: 6
  },
  {
    icon: 'insights',
    title: 'Insights',
    body: 'See your mood trends, wellness scores, and download a full PDF report of your progress.',
    targetSelector: '#home-insight-teaser, #insight-teaser-content',
    padding: 12
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
  { icon:'edit_note', title:'Diarying', desc:'Write 3 sentences' }
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
