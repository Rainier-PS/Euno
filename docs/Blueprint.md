# Euno Blueprint

> **Status:** Multi-page website with modular CSS and ES modules. Entry point is `index.html` at project root. This document describes the **current as-built** codebase — not a future target architecture.

## Feature Inventory

### Core Features
- **Home Dashboard**: Greeting display, mood preview, quick stats, weekly mood visualization, coin balance display
- **Daily Check-In**: Mood selection (emoji + slider), energy level, sleep hours, stress level, thoughts entry, wellness score calculation, streak tracking, insights (summary statistics, mood charts, habit consistency, emotional patterns, PDF report generation)
- **Journal System**:
  - Journal Entries: Markdown editor, labels, reminders, search/sort, draft auto-save
  - Habit Tracker: Weekly grid, completion tracking, metrics, CSV export
- **Wellness**:
  - Breathing Exercises: 4-7-8, Box, Calm techniques with visual feedback
  - Gratitude Journal: 3 daily entries with history
  - Self-Care Challenges: Daily micro-challenges with completion tracking
  - Reflection Prompts: Rotating prompts for journaling
- **Shop**: StudyCoins system, item purchasing, inventory management, coin history, power-ups (streak freeze, double coins, lucky spin, focus boost)
- **Settings**: Profile (name, gender), theme selection (light/dark/system), data export/import, data clearing, onboarding restart
- **Onboarding**: Interactive tour with spotlight highlighting, step navigation
- **Navigation**: Sidebar navigation (desktop), mobile drawer, bottom navigation bar, page routing

### Shared UI Components
- Date Picker: Modal with calendar/year views, manual date selection
- Time Picker: Modal with clock UI and manual input, 12h/24h parsing
- Toast Notifications: Success/error/info messages
- Tab Panels: Content switching within features
- Confirmation Dialogs: User confirmation for destructive actions

### Background Services
- Reminder System: Browser notifications for notes/journals, 60-second polling
- Draft Auto-Save: Debounced localStorage writes for notes/journals
- Coin Earning: Daily check-in rewards, habit completion bonuses
- Streak Calculation: With freeze support for missed days

## Dependency Map

### Feature Dependencies
```
Home Dashboard
  ├─ Check-in data (mood, streaks)
  ├─ Journal data (recent entries count)
  ├─ Habit data (completion tracking)
  └─ Coins (balance display)

Journal System
  ├─ Date/Time Pickers (for deadlines/reminders)
  ├─ Markdown Parser (for content rendering)
  ├─ Reminder System (for notifications)
  ├─ Storage (journals, habits)
  └─ Draft Auto-Save (debounced writes)

Daily Check-In (includes Insights)
  ├─ Check-in data (mood trends, streaks)
  ├─ Habit data (consistency, weekly completion)
  ├─ Journal data (entry count, streaks)
  └─ jsPDF library (report generation)

Wellness
  ├─ Storage (gratitude entries, challenge progress)
  ├─ Timer utilities (breathing exercise phases)
  └─ Date utilities (challenge daily keys)

Shop
  ├─ Check-in data (coin earning on completion)
  ├─ Storage (coins, inventory, history)
  ├─ Streak calculation (freeze usage)
  └─ Random number generation (lucky spin prizes)

Settings
  ├─ Storage (profile, theme)
  ├─ Theme system (CSS variable application)
  ├─ Data export/import (JSON serialization)
  └─ Onboarding system (restart capability)

Onboarding
  ├─ Navigation (page switching)
  ├─ DOM manipulation (spotlight highlighting)
  └─ All feature pages (target elements)

Navigation
  ├─ All feature pages (routing targets)
  ├─ Mobile responsive handling (drawer/bottom-nav)
  └─ Theme system (active state styling)
```

### Cross-Cutting Dependencies
- **Storage Layer**: All features depend on localStorage access via getStorage/setStorage
- **Theme System**: All UI components depend on theme CSS variables and data-theme attribute
- **Date/Time Utilities**: Check-in, Journal, Reminders
- **Markdown Parser**: Journal
- **Notification System**: Reminders, Toast messages
- **Coin System**: Check-in, Habits, Shop
- **Sanitization**: All user input rendering

## Current Directory Structure

```
Euno/
├── index.html              # Home page
├── about.html              # About page
├── checkin.html            # Daily check-in page (includes insights)
├── credits.html            # Credits page
├── journal.html            # Journal page
├── privacy.html            # Privacy policy page
├── settings.html           # Settings page
├── shop.html               # Shop page
├── wellness.html           # Wellness page
├── readme.md               # Project readme
├── docs/
│   └── Blueprint.md        # This documentation
├── css/
│   ├── base/
│   │   ├── variables.css   # CSS custom properties and theme variables
│   │   ├── reset.css       # Base reset and global styles
│   │   └── index.css       # Base module entry point
│   ├── components/
│   │   ├── buttons.css     # Button component styles
│   │   ├── inputs.css      # Input, textarea, select, checkbox, range slider styles
│   │   ├── cards.css       # Card component styles
│   │   ├── chips.css       # Chip and badge component styles
│   │   ├── tabs.css        # Tab component styles
│   │   ├── toast.css       # Toast notification component styles
│   │   └── index.css       # Components module entry point
│   ├── layout/
│   │   ├── sidebar.css     # Sidebar navigation styles
│   │   ├── main-content.css # Main content area styles
│   │   ├── mobile-drawer.css # Mobile drawer navigation styles
│   │   ├── bottom-nav.css  # Bottom navigation styles
│   │   └── index.css       # Layout module entry point
│   ├── features/
│   │   ├── home.css        # Home page feature styles
│   │   ├── checkin.css     # Daily check-in feature styles
│   │   ├── journal.css     # Journal feature styles
│   │   ├── pickers.css     # Date/time picker component styles
│   │   ├── habits.css      # Habit tracker feature styles
│   │   ├── wellness.css    # Wellness (breathing, gratitude, challenges) feature styles
│   │   ├── shop.css        # Shop/inventory feature styles
│   │   ├── settings.css    # Settings page styles
│   │   ├── onboarding.css  # Onboarding overlay styles
│   │   └── index.css       # Features module entry point
│   ├── utilities/
│   │   ├── responsive.css  # Responsive media queries
│   │   └── index.css       # Utilities module entry point
│   └── index.css           # Main CSS entry point
├── html/
│   ├── components/
│   │   ├── dialogs.html    # Dialog components (date picker, time picker, streak calendar, toast)
│   │   └── onboarding.html # Onboarding overlay component
│   ├── layout/
│   │   ├── bottom-nav.html # Bottom navigation component
│   │   ├── mobile-drawer.html # Mobile drawer navigation component
│   │   └── sidebar.html    # Sidebar navigation component
│   ├── pages/
│   │   ├── about.html      # About page content
│   │   ├── checkin.html    # Daily check-in page content (includes insights)
│   │   ├── credits.html    # Credits page content
│   │   ├── home.html       # Home page content
│   │   ├── journal.html    # Journal page content
│   │   ├── privacy.html    # Privacy policy page content
│   │   ├── settings.html   # Settings page content
│   │   ├── shop.html       # Shop page content
│   │   └── wellness.html   # Wellness page content
│   ├── head.html           # Head section (meta tags, fonts, CSS)
│   └── scripts.html        # Script section (jsPDF CDN, main script)
└── js/
    ├── core/
    │   ├── constants.js    # MOOD_*, SHOP_ITEMS, ONBOARDING_STEPS, BREATH_PATTERNS, etc.
    │   └── storage.js      # getStorage, setStorage
    ├── utils/
    │   ├── helpers.js      # sanitize*, parseMarkdown, debounce, matchesQuery, stableSort
    │   ├── dateUtils.js    # todayStr, formatDateDisplay, greetingByTime, formatTimeTo12
    │   ├── notifications.js  # showToast
    │   └── ui.js           # renderMoodDot
    ├── components/
    │   └── pickers.js      # Date picker + time picker (merged)
    ├── features/
    │   ├── home.js         # Dashboard, streak calc, week moods, insight teaser
    │   ├── checkin.js      # Daily check-in, wellness score, history
    │   ├── theme.js        # Theme init/apply, system preference listener
    │   └── onboarding.js   # Spotlight tour; exposes initOnboarding.restart
    ├── journal/
    │   ├── journal.js      # Journal editor, history, save/load
    │   └── editor.js       # Shared markdown editor helpers
    ├── habits/habits.js
    ├── wellness/wellness.js
    ├── shop/shop.js
    ├── settings/settings.js
    ├── streak/streakCalendar.js
    └── migrations/migrateJournalReminders.js
```

## Entry Point & Bootstrap

Each HTML page loads `css/index.css` (modular CSS), jsPDF CDN, and `<script type="module" src="js/script.js">`.

`js/script.js` on `DOMContentLoaded` initializes all features. Side-effect imports: `migrateJournalReminders.js`.

**Still in `js/script.js` (not extracted):** `initNavigation()` (page routing, drawer), `initJournal()` (journal section tabs).

## Module Responsibilities

| Module | Key exports |
|--------|-------------|
| `core/constants.js` | Mood/shop/onboarding/breath constants |
| `core/storage.js` | `getStorage`, `setStorage` |
| `utils/helpers.js` | Sanitize, markdown, debounce, search/sort |
| `utils/dateUtils.js` | Date/time formatting |
| `utils/notifications.js` | `showToast` |
| `utils/ui.js` | `renderMoodDot` |
| `components/pickers.js` | `initDatePicker`, `openDatePicker`, `closeDatePicker`, `initTimePicker`, `openTimePicker`, `closeTimePicker` |
| `features/theme.js` | `initTheme`, `applyTheme`, `updateThemeBtns` |
| `features/onboarding.js` | `initOnboarding` |
| `features/home.js` | `initHome`, `updateHomeDashboard`, `calcCheckinStreak` |
| `features/checkin.js` | `initCheckin`, `getCurrentWeekDates` (includes insights functionality) |
| `journal/editor.js` | `setDraftStatus`, `applyMarkdown`, `insertAtCursor`, `setEditorMode` |
| `journal/journal.js` | `initJournalEditor` |
| `habits/habits.js` | `initHabits`, `renderHabits` |
| `wellness/wellness.js` | `initWellness` |
| `shop/shop.js` | `addCoins`, `updateCoinDisplay`, `initShop`, `renderShop`, `calcCheckinStreakWithFreezes` |
| `settings/settings.js` | `initSettings` |
| `streak/streakCalendar.js` | `initStreakCalendar` |
| `migrations/migrateJournalReminders.js` | Side-effect only — runs one-time migration on import |

## Cross-Feature Imports (Actual)

- `checkin.js` → `home.js` (includes insights functionality)
- `habits.js`, `journal.js`, `checkin.js`, `settings.js` → `home.js`
- `checkin.js`, `habits.js`, `journal.js` → `shop.js` (for `addCoins`)
- `streakCalendar.js` → `shop.js`
- `onboarding.js` → `home.js`
- `settings.js` → `onboarding.js`

## Function Reference (by module file)

### Utility Functions (`js/utils/`, `js/core/`)
- `sanitize(str)`: HTML escaping
- `sanitizeNum(n, min, max)`: Number clamping
- `sanitizeDate(s)`: Date format validation
- `sanitizeTime(s)`: Time format validation
- `getStorage(key, fallback)`: localStorage read with JSON parse
- `setStorage(key, val)`: localStorage write with JSON stringify
- `showToast(msg, type)`: Toast notification creation
- `todayStr()`: Current date in YYYY-MM-DD format
- `formatDateDisplay(str)`: Localized date formatting
- `greetingByTime()`: Time-based greeting
- `formatTimeTo12(time24)`: 24h to 12h conversion
- `renderMoodDot(mood)`: Mood icon HTML generation
- `parseMarkdown(md)`: Markdown to HTML conversion
- `debounce(fn, ms)`: Function debouncing
- `matchesQuery(query, fields)`: Search query matching
- `stableSort(arr, cmp)`: Stable array sorting

### Navigation (`script.js`)
- `initNavigation()`, `navigateTo(page)` — inline in entry point

### Feature init exports
Each feature module exports `init*` (and render helpers where needed). See **Module Responsibilities** table above for file locations. Private helpers stay unexported within each file.

### Reminders & migrations
- `notes/notes.js`: `scheduleNoteReminder`, `scheduleJournalReminder`, `checkReminders` (+ 60s interval)
- `migrations/migrateJournalReminders.js`: runs once on import

## Shared State Map

### Global Variables
- `_notesState`: `{ query: '', sort: 'date-desc' }` - Notes search/sort state (module-scoped in `notes.js`)
- `_journalState`: `{ query: '', sort: 'date-desc' }` - Journal search/sort state (module-scoped in `journal.js`)
- `_todoState`: `{ query: '', sort: 'date-desc' }` - To-Do search/sort state (module-scoped in `todo.js`)
- `calendarState`: `{ viewMode, month, year, day, selectedDate, notifications }` - Calendar view state
- `dpCallback`: Function - Date picker callback
- `dpCurrentDate`: String - Date picker selected date
- `tpCallback`: Function - Time picker callback
- `tpHour`: Number - Time picker hour (1-12)
- `tpMinute`: Number - Time picker minute (0-59)
- `tpPeriod`: 'AM' | 'PM' - Time picker period
- `tpMode`: 'hour' | 'minute' - Time picker input mode
- `tpInputMode`: Boolean - Time picker manual input mode
- `pomodoroTimer`: Interval - Pomodoro timer interval
- `stopwatchTimer`: Interval - Stopwatch timer interval
- `stopwatchSeconds`: Number - Stopwatch elapsed seconds
- `clockTimer`: Interval - Live clock interval
- `countdownTimer`: Interval - Countdown timer interval
- `countdownRunning`: Boolean - Countdown running state
- `countdownRemaining`: Number - Countdown remaining seconds
- `breathTimer`: Timeout - Breathing exercise timer
- `breathRunning`: Boolean - Breathing running state
- `breathCycles`: Number - Breathing cycles completed
- `selectedBreathType`: String - Selected breathing pattern
- `streakCalMonth`: Number - Streak calendar month
- `streakCalYear`: Number - Streak calendar year
- `currentPromptIdx`: Number - Current reflection prompt index

### Constants
- `MOOD_ICONS`: Array of mood icon names
- `MOOD_LABELS`: Array of mood label strings
- `MOOD_COLORS`: Array of mood color values
- `PRIORITY_ORDER`: Object mapping priority to numeric order
- `ONBOARDING_STEPS`: Array of onboarding step objects
- `POMO_TIPS`: Array of pomodoro tip strings
- `BREATH_PATTERNS`: Object mapping pattern names to phase arrays
- `CHALLENGES`: Array of challenge objects
- `REFLECTION_PROMPTS`: Array of reflection prompt strings
- `SHOP_ITEMS`: Array of shop item objects

### State Ownership
- **Notes/Journal/To-Do State**: Owned by respective feature modules, shared search/sort pattern
- **Calendar State**: Owned by calendar module
- **Picker State**: Owned by respective picker modules (date, time)
- **Timer State**: Owned by respective timer modules (pomodoro, stopwatch, countdown, breathing)
- **Constants**: Centralized in `js/core/constants.js`

## Shared DOM Map

### Shared DOM Elements (Global)
- `toast-container`: Toast notification container
- `sidebar`, `sidebar-coins`, `sidebar-coin-count`: Desktop navigation + coin badge
- `bottom-nav`: Mobile bottom navigation
- `mobile-drawer`, `drawer-scrim`, `drawer-panel`, `drawer-close`: Mobile drawer
- `app`: Main app container (hidden until onboarding completes)
- `onboarding-overlay`, `spotlight-hole`, `onboarding-tooltip*`: Onboarding tour

### Feature-Specific DOM Elements
- **Home**: `greeting-name`, `greeting-label-text`, `home-mood-display`, `home-streak`, `home-habits-today`, `home-focus`, `home-entries`, `week-moods-home`, `insight-teaser-content`
- **Check-in**: Mood buttons, sliders, input fields, check-in history
- **Journal**: Notes editor, journal editor, tabs, lists, search/sort inputs
- **To-Do**: Todo input, deadline fields, priority/status selects, todo list
- **Habits**: Habit input, habit grid, metrics, motivation text
- **Calendar**: Calendar view, event form, notification inputs
- **Flashcards**: Deck list, deck section, card grid
- **Music**: Track info, iframe, controls
- **Pomodoro**: Timer display, mode buttons, controls, settings
- **Wellness**: Breathing ring, gratitude inputs, challenges grid, reflection prompt
- **Insights**: Chart canvases, summary elements, report form
- **Shop**: Shop grid, inventory list, coin history
- **Settings**: Profile inputs, theme buttons, data buttons
- **Onboarding**: Overlay, spotlight, tooltip, navigation buttons
- **Date Picker**: Dialog, calendar, year grid, buttons
- **Time Picker**: Dialog, clock, segments, period buttons
- **Streak Calendar**: Dialog, stats, calendar grid

### DOM Access Pattern
- Most features use `document.getElementById()` to access their elements
- Event listeners are attached during `init*` functions
- Some features cache DOM references in local variables within init functions
- No centralized DOM cache exists

## Event Listener Map

### Global Event Listeners
- `DOMContentLoaded` in `script.js`: Initializes all features
- `window.matchMedia('(prefers-color-scheme: dark)')` in `features/theme.js`: System theme change
- `setInterval(checkReminders, 60000)` in `notes/notes.js`: Reminder polling

### Navigation Events
- Sidebar nav items: Click to navigate to page
- Bottom nav items: Click to navigate to page
- Mobile back buttons: Click to navigate back
- Hamburger button: Click to open drawer
- Drawer scrim: Click to close drawer

### Feature Event Listeners
- **Check-in**: Mood buttons, sliders, save button
- **Journal**: Tab buttons, editor inputs, save/delete buttons, search/sort inputs
- **To-Do**: Add button, checkbox changes, delete buttons, search/sort inputs
- **Habits**: Add button, habit checkboxes, delete buttons, download button
- **Calendar**: View mode select, month/year selects, navigation buttons, event form inputs
- **Flashcards**: Add deck/card buttons, delete buttons, review buttons
- **Music**: Play/pause/next/prev buttons
- **Pomodoro**: Mode buttons, start/pause/reset buttons, duration input
- **Wellness**: Breathing type buttons, start/stop buttons, gratitude save, challenge items, new prompt button
- **Insights**: Tab buttons, generate report button
- **Shop**: Buy buttons, use buttons
- **Settings**: Save profile button, theme buttons, export/clear/restart buttons
- **Date Picker**: Month navigation, day selection, year selection, OK/Cancel buttons
- **Time Picker**: Segment buttons, period buttons, OK/Cancel buttons, clock numbers
- **Streak Calendar**: Month navigation, close button

### Event Delegation
- Most event listeners are attached directly to elements during initialization
- Some dynamic elements (list items) get listeners attached after rendering
- No centralized event delegation pattern exists

## localStorage Map

### Storage Keys by Feature
- **Theme**: `theme`, `onboarding_done`
- **Profile**: `profile_name`, `profile_gender`
- **Check-in**: `checkins`
- **Journal**: `journals`, `journal_meta`, `notes`, `notes_draft`, `journal_draft_{date}`
- **To-Do**: `todos`
- **Habits**: `habits`
- **Calendar**: `calendarEvents`
- **Flashcards**: `flashcard_decks`, `current_deck_idx`
- **Pomodoro**: `pomodoro_sessions`
- **Wellness**: `gratitude_entries`, `challenges_done_{date}`
- **Shop**: `coins_balance`, `coins_history`, `inventory`, `streak_freezes`
- **Reminders**: `note_reminders` (migrated from `journal_reminders`)

### Storage Patterns
- **Simple Values**: Strings, numbers (theme, profile_name, profile_gender, coins_balance)
- **Arrays**: Lists of objects (checkins, notes, todos, habits, flashcard_decks, pomodoro_sessions, gratitude_entries, coins_history, note_reminders)
- **Objects**: Key-value maps (journals, journal_meta, calendarEvents, inventory)
- **Dynamic Keys**: Per-date drafts (`journal_draft_{date}`), per-day challenges (`challenges_done_{date}`)

### Storage Access Functions
- `getStorage(key, fallback)`: Read with JSON parse, fallback on error
- `setStorage(key, val)`: Write with JSON stringify, silent fail on error

## Assets & External Dependencies

| Asset | Location | Notes |
|-------|----------|-------|
| Application CSS | `css/index.css` | Modular CSS; loaded in each HTML page |
| Application JS | `js/script.js` + `js/**` | ES modules; no bundler |
| jsPDF | CDN in each HTML page | Used by `insights.js` for PDF reports |
| Google Fonts | CDN in each HTML page | Plus Jakarta Sans, DM Sans |
| Material Icons | CDN in each HTML page | `Material+Icons+Round` |
| Images / favicon | None local | No `assets/` folder yet |

## Dynamic DOM (created at runtime)

These IDs/classes are not in `index.html` but are created by JS:

- `checkin-done-banner` — after saving check-in (`features/checkin.js`)
- `add-event-day-btn` — day view in calendar (`calendar/calendar.js`)
- `ob-dot` — onboarding step dots (`features/onboarding.js`)
- List item classes: `note-item`, `journal-item`, `todo-item`, `checkin-item`, `week-mood-item`, etc.

## Coding Standards (current)

- ES module `export function initFeature()` pattern
- `sanitize()` for user-generated HTML
- `getStorage()` / `setStorage()` for all persistence
- `debounce()` for draft auto-save and search inputs
- Theme via `data-theme="dark"` on `<html>`
- Coin earning via direct `import { addCoins } from '../shop/shop.js'` — not via `window`