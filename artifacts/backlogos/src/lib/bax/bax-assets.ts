/**
 * Central Bax Mascot Asset Mapping & Contextual Slot Configuration.
 *
 * Uses official extracted Bax illustrations from the BacklogOS Bax character chart
 * stored under /public/brand/bax/.
 */

export type BaxExpression =
  | 'happy'
  | 'thinking'
  | 'explaining'
  | 'celebrating'
  | 'confused'
  | 'sleepy'
  | 'determined'
  | 'shy';

export type BaxPose =
  | 'idle'
  | 'waving'
  | 'pointing'
  | 'reading'
  | 'cheering'
  | 'resting'
  | 'focused';

export type BaxSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type BaxPlacementSlot =
  | 'dashboard'
  | 'my_plans'
  | 'recovery_route'
  | 'notes'
  | 'flashcards'
  | 'learn_test'
  | 'revision'
  | 'analytics'
  | 'ai_chatbot'
  | 'tutorial';

export interface BaxAssetDescriptor {
  expression: BaxExpression;
  /** Public path to the official Bax expression artwork. */
  imageSrc: string | null;
  /** Optional pose-specific artwork overrides keyed by BaxPose. */
  poseOverrides?: Partial<Record<BaxPose, string | null>>;
  alt: string;
  label: string;
  defaultPose: BaxPose;
  /** Fallback token if an image ever fails to load. */
  placeholderTag: string;
  accentClass: string;
  ringClass: string;
}

export const BAX_ASSET_MAP: Record<BaxExpression, BaxAssetDescriptor> = {
  happy: {
    expression: 'happy',
    imageSrc: '/brand/bax/happy.png',
    poseOverrides: {
      reading: '/brand/bax/pose-reading.png',
      pointing: '/brand/bax/pose-pointing.png',
    },
    alt: 'Bax mascot looking happy and welcoming',
    label: 'Happy',
    defaultPose: 'waving',
    placeholderTag: 'BX·HI',
    accentClass:
      'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
    ringClass: 'ring-emerald-500/20',
  },
  thinking: {
    expression: 'thinking',
    imageSrc: '/brand/bax/thinking.png',
    poseOverrides: {},
    alt: 'Bax mascot thinking through a problem',
    label: 'Thinking',
    defaultPose: 'focused',
    placeholderTag: 'BX·...',
    accentClass:
      'text-sky-700 dark:text-sky-300 bg-sky-500/10 border-sky-500/30',
    ringClass: 'ring-sky-500/20',
  },
  explaining: {
    expression: 'explaining',
    imageSrc: '/brand/bax/explaining.png',
    poseOverrides: {
      pointing: '/brand/bax/pose-pointing.png',
    },
    alt: 'Bax mascot explaining a concept step by step',
    label: 'Explaining',
    defaultPose: 'reading',
    placeholderTag: 'BX·EXP',
    accentClass:
      'text-teal-700 dark:text-teal-300 bg-teal-500/10 border-teal-500/30',
    ringClass: 'ring-teal-500/20',
  },
  celebrating: {
    expression: 'celebrating',
    imageSrc: '/brand/bax/celebrating.png',
    poseOverrides: {},
    alt: 'Bax mascot celebrating milestone completion',
    label: 'Celebrating',
    defaultPose: 'cheering',
    placeholderTag: 'BX·WIN',
    accentClass:
      'text-emerald-700 dark:text-emerald-300 bg-emerald-500/12 border-emerald-500/35',
    ringClass: 'ring-emerald-500/25',
  },
  confused: {
    expression: 'confused',
    imageSrc: '/brand/bax/confused.png',
    poseOverrides: {},
    alt: 'Bax mascot signaling an issue or confusion',
    label: 'Confused',
    defaultPose: 'idle',
    placeholderTag: 'BX·?!',
    accentClass:
      'text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/30',
    ringClass: 'ring-amber-500/20',
  },
  sleepy: {
    expression: 'sleepy',
    imageSrc: '/brand/bax/sleepy.png',
    poseOverrides: {},
    alt: 'Bax mascot resting during a study break',
    label: 'Sleepy',
    defaultPose: 'resting',
    placeholderTag: 'BX·ZZZ',
    accentClass:
      'text-slate-600 dark:text-slate-300 bg-slate-500/10 border-slate-500/30',
    ringClass: 'ring-slate-500/15',
  },
  determined: {
    expression: 'determined',
    imageSrc: '/brand/bax/determined.png',
    poseOverrides: {
      reading: '/brand/bax/pose-reading.png',
      pointing: '/brand/bax/pose-pointing.png',
    },
    alt: 'Bax mascot focused and determined on today’s goal',
    label: 'Determined',
    defaultPose: 'focused',
    placeholderTag: 'BX·GO',
    accentClass:
      'text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 border-indigo-500/30',
    ringClass: 'ring-indigo-500/20',
  },
  shy: {
    expression: 'shy',
    imageSrc: '/brand/bax/shy.png',
    poseOverrides: {},
    alt: 'Bax mascot blushing shyly',
    label: 'Shy',
    defaultPose: 'idle',
    placeholderTag: 'BX·UWU',
    accentClass:
      'text-pink-700 dark:text-pink-300 bg-pink-500/10 border-pink-500/30',
    ringClass: 'ring-pink-500/20',
  },
};

export function resolveBaxAsset(
  expression: BaxExpression = 'happy',
  pose?: BaxPose
): BaxAssetDescriptor & { resolvedImageSrc: string | null; activePose: BaxPose } {
  const descriptor = BAX_ASSET_MAP[expression] || BAX_ASSET_MAP.happy;
  const activePose = pose || descriptor.defaultPose;
  const poseOverride = descriptor.poseOverrides?.[activePose];
  const resolvedImageSrc =
    typeof poseOverride === 'string' && poseOverride.trim().length > 0
      ? poseOverride
      : descriptor.imageSrc;

  return {
    ...descriptor,
    activePose,
    resolvedImageSrc,
  };
}

export interface BaxTabGuideItem {
  label: string;
  detail: string;
}

export interface BaxSlotDefinition {
  slot: BaxPlacementSlot;
  title: string;
  defaultExpression: BaxExpression;
  defaultPose: BaxPose;
  defaultMessage: string;
  /** Step-by-step feature breakdown shown when user expands "How this tab works". */
  guideItems?: BaxTabGuideItem[];
  /** Toggle to enable/disable contextual appearance without editing page JSX. */
  enabledByDefault: boolean;
}

/**
 * Central contextual integration registry for all BacklogOS surfaces.
 * Uses contextual appearances rather than showing Bax everywhere at once.
 */
export const BAX_CONTEXTUAL_SLOTS: Record<BaxPlacementSlot, BaxSlotDefinition> = {
  dashboard: {
    slot: 'dashboard',
    title: 'Dashboard · Study Hub',
    defaultExpression: 'happy',
    defaultPose: 'pointing',
    defaultMessage:
      'Your command center: see remaining chapters, today’s study slots, and launch your next block.',
    guideItems: [
      {
        label: 'Top 4 Telemetry Cards',
        detail:
          'Separates Backlog Clearance (chapters studied) from Concept Mastery (quiz-verified), Retention Health, and Weak Concepts.',
      },
      {
        label: 'Today’s Study Plan',
        detail:
          'Hit Start First Block to study in Learn & Test, or export slots to Google Calendar / .ICS.',
      },
      {
        label: 'Missed a Day? / Rest Day',
        detail:
          'Shift today forward penalty-free or rebalance missed blocks instead of piling up pressure.',
      },
      {
        label: 'Study Launchpad & Table View',
        detail:
          'Switch to Backlog Chapters (table) to filter or jump straight to Recovery Route, Revision, or Analytics.',
      },
    ],
    enabledByDefault: true,
  },
  my_plans: {
    slot: 'my_plans',
    title: 'My Plans · Track Manager',
    defaultExpression: 'explaining',
    defaultPose: 'pointing',
    defaultMessage:
      'Keep multiple recovery plans (e.g., 3-Day Sprint, Subject Rescue) and switch the active one anytime.',
    guideItems: [
      {
        label: 'Create Separate Tracks',
        detail:
          'Use + Create New Plan for a new subject cluster or exam sprint without losing your existing plans.',
      },
      {
        label: 'Switch Active Plan',
        detail:
          'Click Set Active on any saved card—Dashboard and Recovery Route update immediately to follow that plan.',
      },
      {
        label: 'Rename, Inspect & Clean Up',
        detail:
          'Search or filter plans, inspect included chapters, rename tracks clearly, or delete outdated drafts.',
      },
    ],
    enabledByDefault: true,
  },
  recovery_route: {
    slot: 'recovery_route',
    title: 'Recovery Route · Daily Mission',
    defaultExpression: 'explaining',
    defaultPose: 'pointing',
    defaultMessage:
      'Follow your day-by-day checklist with live countdown timers, merged blocks, and quiz verification.',
    guideItems: [
      {
        label: 'Active Mission & Day Countdown',
        detail:
          'Shows your next recommended block and hours left in today’s window. Unfinished tasks carry safely forward.',
      },
      {
        label: 'Horizon Switcher (1D–30D)',
        detail:
          'Too fast or overloaded? Switch between 1D Crisis Rescue and 30D Full Reset without losing completed progress.',
      },
      {
        label: 'Verify Before Ticking Off',
        detail:
          'Click any block checkbox to answer quick verification questions—study clearance and quiz mastery stay honest.',
      },
      {
        label: 'Reschedule / Restore Day 1',
        detail:
          'Spread missed days evenly across upcoming days, or restore Day 1 if you started ahead by mistake.',
      },
    ],
    enabledByDefault: true,
  },
  notes: {
    slot: 'notes',
    title: 'Chapter Notes Helper',
    defaultExpression: 'explaining',
    defaultPose: 'reading',
    defaultMessage: 'Keep key formulas and NCERT derivations concise for quick revision.',
    enabledByDefault: true,
  },
  flashcards: {
    slot: 'flashcards',
    title: 'Active Recall Coach',
    defaultExpression: 'thinking',
    defaultPose: 'focused',
    defaultMessage: 'Try recalling the derivation before flipping the card.',
    enabledByDefault: true,
  },
  learn_test: {
    slot: 'learn_test',
    title: 'Learn & Test · Focus Room',
    defaultExpression: 'determined',
    defaultPose: 'reading',
    defaultMessage:
      'Study one chapter deeply with Pomodoro sprints, NCERT subtopics, Cloud Notes, and Mastery Quizzes.',
    guideItems: [
      {
        label: 'Backlog-Linked Pomodoro Timer',
        detail:
          'Pick a chapter and hit Start Focus—the mini timer stays floating if you switch tabs and alerts you when done.',
      },
      {
        label: 'Concept Overview & Notes',
        detail:
          'Read key formulas and save personal derivations in Cloud Notes synced across your devices.',
      },
      {
        label: 'Videos, Mind Map & Subtopics',
        detail:
          'Watch curated lectures and check off individual NCERT subtopics as you master each idea.',
      },
      {
        label: 'Verify & Mastery Test',
        detail:
          'Pass the chapter quiz here to earn Verified Mastery and auto-schedule spaced reviews in Revision.',
      },
    ],
    enabledByDefault: true,
  },
  revision: {
    slot: 'revision',
    title: 'Revision · Anti-Forgetting Engine',
    defaultExpression: 'celebrating',
    defaultPose: 'cheering',
    defaultMessage:
      'Not extra clutter—this stops you from forgetting chapters you already cleared before exams!',
    guideItems: [
      {
        label: 'Why Revision Matters',
        detail:
          'Clearing a chapter once only solves today’s backlog—the forgetting curve erases ~70% in a week without quick recall.',
      },
      {
        label: 'Auto-Scheduled Intervals (1, 3, 7, 14, 30d)',
        detail:
          'Every verified chapter lands here automatically so you spend 5 minutes locking it into long-term memory.',
      },
      {
        label: 'Clear Due & Overdue First',
        detail:
          'Pass a short retention quiz to push the next review further out; if recall drops, intervals reset safely while keeping your peak history.',
      },
    ],
    enabledByDefault: true,
  },
  analytics: {
    slot: 'analytics',
    title: 'Analytics · Reality Check',
    defaultExpression: 'thinking',
    defaultPose: 'pointing',
    defaultMessage:
      'Track true exam readiness by comparing chapters studied vs. quiz-verified mastery and weak topics.',
    guideItems: [
      {
        label: 'XP, Level & Academic Milestones',
        detail:
          'Earned only from real focus blocks, verified quizzes, and completed recovery work—never fake clicks.',
      },
      {
        label: 'Clearance vs. Concept Mastery',
        detail:
          'Spots the gap between chapters you merely ticked off vs. chapters you can actually solve under exam pressure.',
      },
      {
        label: 'Weak Concepts & Pace Breakdown',
        detail:
          'Highlights shaky subtopics from quizzes and compares your current chapters/week speed against your exam date.',
      },
    ],
    enabledByDefault: true,
  },
  ai_chatbot: {
    slot: 'ai_chatbot',
    title: 'Bax AI Mentor',
    defaultExpression: 'happy',
    defaultPose: 'waving',
    defaultMessage: 'Ask me any NCERT concept, doubt, or backlog strategy.',
    enabledByDefault: true,
  },
  tutorial: {
    slot: 'tutorial',
    title: 'BacklogOS Walkthrough',
    defaultExpression: 'happy',
    defaultPose: 'waving',
    defaultMessage: 'Let’s take a quick tour of your recovery workspace.',
    enabledByDefault: true,
  },
};
