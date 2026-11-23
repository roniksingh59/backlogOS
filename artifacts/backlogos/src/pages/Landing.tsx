import {
  ArrowRight,
  Atom,
  BookOpenCheck,
  Bookmark,
  Calculator,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  Dna,
  ExternalLink,
  FlaskConical,
  GraduationCap,
  HeartHandshake,
  Layers,
  ListTodo,
  Play,
  RotateCcw,
  Sparkles,
  Table,
  Target,
} from 'lucide-react';
import { Link } from 'wouter';
import { useState } from 'react';
import { CommunityImpactBanner } from '@/components/CommunityImpactBanner';

const SUBJECT_TRACKS = [
  {
    name: 'Physics',
    code: 'NCERT Code 042',
    icon: Atom,
    accentText: 'text-sky-600 dark:text-sky-400',
    accentBorder: 'border-sky-500/25 hover:border-sky-500/50',
    iconBox: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25',
    barColor: 'bg-sky-500',
    chapters: '29 Chapters mapped · Class 11 & 12',
    focus: 'Kinematics · Rotational Motion · Electrostatics · Ray Optics · Modern Physics',
  },
  {
    name: 'Chemistry',
    code: 'NCERT Code 043',
    icon: FlaskConical,
    accentText: 'text-emerald-600 dark:text-emerald-400',
    accentBorder: 'border-emerald-500/25 hover:border-emerald-500/50',
    iconBox: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
    barColor: 'bg-emerald-500',
    chapters: '26 Chapters mapped · Physical, Organic & Inorganic',
    focus: 'Mole Concept · Thermodynamics · Equilibrium · Electrochemistry · GOC',
  },
  {
    name: 'Mathematics',
    code: 'NCERT Code 041',
    icon: Calculator,
    accentText: 'text-indigo-600 dark:text-indigo-400',
    accentBorder: 'border-indigo-500/25 hover:border-indigo-500/50',
    iconBox: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/25',
    barColor: 'bg-indigo-500',
    chapters: '27 Chapters mapped · Boards & Core Problem Sets',
    focus: 'Trigonometry · Straight Lines · Matrices · Integrals · Differential Equations',
  },
  {
    name: 'Biology',
    code: 'NCERT Code 044',
    icon: Dna,
    accentText: 'text-teal-600 dark:text-teal-400',
    accentBorder: 'border-teal-500/25 hover:border-teal-500/50',
    iconBox: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/25',
    barColor: 'bg-teal-500',
    chapters: '38 Chapters mapped · NCERT Line-by-Line Subtopics',
    focus: 'Cell Biology · Plant Physiology · Genetics · Biotechnology · Ecology',
  },
];

const STUDENT_OUTCOME_CASES = [
  {
    num: '01',
    tag: 'Daily Study Plan',
    title: 'Daily Study Plan Built Around School & Coaching',
    description:
      'Instead of staring at a stressful list of pending chapters, BacklogOS breaks your selected topics into realistic 45–60 minute blocks ordered by prerequisites (like Vectors before Rotational Motion).',
    icon: BookOpenCheck,
    iconStyle: 'bg-sky-500/10 border-sky-500/25 text-sky-600 dark:text-sky-400',
    caseStudent: 'Aarav · Class 11 PCM · 9 Pending Chapters',
    problem: 'Jumped randomly between marathon playlists without finishing exercises.',
    outcome: 'Switched to 2 focused blocks/day (Kinematics + Bonding) and finished 6 full chapters in 14 days.',
  },
  {
    num: '02',
    tag: 'Zero-Guilt Catch-Up',
    title: 'Automatic Day-Shift When You Miss a Study Day',
    description:
      'School practicals, fever, or family commitments happen. One click redistributes missed hours evenly across upcoming weekends and lighter weekdays—zero 12-hour burnout days.',
    icon: RotateCcw,
    iconStyle: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400',
    caseStudent: 'Sneha · Class 12 PCB · Missed 3 Study Days',
    problem: 'Fell ill before pre-boards; paper timetable stacked 11 impossible hours on Day 4.',
    outcome: 'Spread missed sessions as +25 mins across 16 days and completed Organic Chemistry on time.',
  },
  {
    num: '03',
    tag: 'AI Photo Solver',
    title: 'Step-by-Step Photo Doubt & Numerical Solver',
    description:
      'Stuck on a pulley diagram, titration numerical, or tricky integration step late at night? Snap a photo to get clear derivations, SI unit checks, and common CBSE trap alerts.',
    icon: Camera,
    iconStyle: 'bg-indigo-500/10 border-indigo-500/25 text-indigo-600 dark:text-indigo-400',
    caseStudent: 'Kabir · Class 11 Physics · 11 PM Numerical Doubt',
    problem: 'Wrong answer on constrained pulley problem with zero clarity on sign convention.',
    outcome: 'Photo solver broke down free-body tension equations step-by-step and caught the minus sign error.',
  },
  {
    num: '04',
    tag: 'AI Mentor (Bax)',
    title: 'Non-Judgmental Concept Mentor & Exam Calm Mode',
    description:
      'Ask Bax anything—from intuitive physics analogies to rapid PYQ triage. When exam stress hits, Bax turns panic into the top 4 high-weightage chapters to tackle first.',
    icon: HeartHandshake,
    iconStyle: 'bg-rose-500/10 border-rose-500/25 text-rose-600 dark:text-rose-400',
    caseStudent: 'Diya · Class 12 Science · 3 Weeks to Pre-Boards',
    problem: 'Overwhelmed by 10 unfinished chapters and paralyzed before mock tests.',
    outcome: 'Got a clear 4-chapter high-weightage recovery order and restarted deep focus in 10 minutes.',
  },
  {
    num: '05',
    tag: 'Focus Room',
    title: 'Distraction-Free Study Room & Calendar Sync',
    description:
      'Full-screen Pomodoro sprint clock linked directly to your chapter backlog plus one-click Google Calendar & .ICS reminders so you never miss your 5 PM study slot.',
    icon: Calendar,
    iconStyle: 'bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400',
    caseStudent: 'Rohan · Class 11 PCM · Consistency Struggle',
    problem: 'Lost track of afternoon study slots and got pulled into short-form feeds.',
    outcome: 'Synced daily 50-minute calendar blocks with personal chapter notes saved directly in cloud.',
  },
  {
    num: '06',
    tag: 'NCERT Subtopics',
    title: 'Visual Mind Maps & NCERT Subtopic Checklists',
    description:
      'Every chapter opens with official CBSE/NCERT subtopic granularity and formula connection mind maps—so you finish definitions, derivations, and exemplar problems systematically.',
    icon: Layers,
    iconStyle: 'bg-violet-500/10 border-violet-500/25 text-violet-600 dark:text-violet-400',
    caseStudent: 'Ananya · Class 11 Chemistry · Heavy Chapters',
    problem: 'Felt lost inside huge 60-page NCERT units like Chemical Equilibrium.',
    outcome: 'Checked off subtopics one-by-one alongside visual formula maps with steady daily momentum.',
  },
];

export function Landing() {
  const [activeTab, setActiveTab] = useState<'plan' | 'backlog' | 'recovery'>('plan');
  const [previewTask1Done, setPreviewTask1Done] = useState(false);
  const [previewTask2Done, setPreviewTask2Done] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-indigo-600 selection:text-white animate-page-enter">
      {/* 1. AUTHORITATIVE EDTECH HERO SECTION */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-indigo-500/[0.04] via-background to-background pt-12 pb-16 sm:pt-20 sm:pb-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 text-center space-y-6">
          {/* Clean Unboxed Academic Eyebrow */}
          <p className="hero-stagger-1 text-xs font-mono uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400 font-bold">
            CBSE Class 11 &amp; 12 · Academic Backlog Command Center
          </p>

          {/* Hero Headline: Animated Neon Typography */}
          <div className="relative my-2">
            <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 h-36 w-full max-w-2xl rounded-full bg-gradient-to-r from-cyan-500/15 via-indigo-500/20 to-fuchsia-500/15 blur-3xl opacity-80 dark:opacity-100" />

            <h1 className="hero-stagger-2 relative font-sans text-4xl sm:text-6xl lg:text-[4.25rem] font-extrabold tracking-tight text-foreground max-w-4xl mx-auto leading-[1.1] sm:leading-[1.06]">
              <span>Clear your </span>
              <span className="neon-animated-text font-black px-1">
                backlog,
              </span>
              {' '}
              <br className="hidden sm:inline" />
              <span className="neon-animated-text-full font-black">
                one focused block
              </span>
              <span> at a time.</span>
            </h1>
          </div>

          {/* Value Proposition */}
          <p className="hero-stagger-3 text-base sm:text-xl leading-relaxed text-muted-foreground max-w-2xl mx-auto font-normal">
            Turn pending Physics, Chemistry, Maths &amp; Biology chapters into a structured daily study sprint built around school and coaching — with instant catch-up whenever you miss a day.
          </p>

          {/* Action Buttons */}
          <div className="hero-stagger-4 pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/onboarding"
              className="group relative overflow-hidden w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3.5 text-sm font-bold transition shadow-md hover:shadow-indigo-500/25 active:scale-95 cursor-pointer"
              data-testid="link-hero-get-started"
            >
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-button-shimmer" />
              <img
                src="/brand/mark-transparent.svg"
                alt=""
                className="h-4 w-4 object-contain brightness-200 group-hover:scale-110 transition-transform shrink-0"
              />
              <span className="tracking-tight">Build Your Backlog Plan</span>
              <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform duration-200" />
            </Link>

            <button
              type="button"
              onClick={() => {
                document.getElementById('workspace-showcase')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-5 py-3.5 text-sm font-semibold text-foreground hover:bg-muted transition active:scale-[0.98] cursor-pointer"
              data-testid="button-hero-explore-backlogos"
            >
              <Play size={14} className="text-indigo-600 dark:text-indigo-400 fill-current" />
              <span>Preview Live Workspace</span>
            </button>
          </div>

          {/* Academic Readiness & Trust Strip (Zero-Pill Clean Horizontal Metrics) */}
          <div className="hero-stagger-4 pt-6 max-w-4xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 border border-border rounded-xl bg-card divide-y md:divide-y-0 md:divide-x divide-border text-left shadow-2xs">
              <div className="px-4 py-3.5">
                <div className="font-mono tabular-nums text-lg font-extrabold text-indigo-600 dark:text-indigo-400">
                  120+ Units
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">Official NCERT Chapters</div>
              </div>
              <div className="px-4 py-3.5">
                <div className="font-mono tabular-nums text-lg font-extrabold text-foreground">
                  Class 11 &amp; 12
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">CBSE PCM · PCB · PCMB</div>
              </div>
              <div className="px-4 py-3.5">
                <div className="font-mono tabular-nums text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                  Zero-Guilt
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">Adaptive Day Rebalancer</div>
              </div>
              <div className="px-4 py-3.5">
                <div className="font-mono tabular-nums text-lg font-extrabold text-foreground">
                  100% Free
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">Cloud Sync &amp; AI Doubt Solver</div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. INTERACTIVE STUDENT COMMAND CENTER SHOWCASE */}
        <div id="workspace-showcase" className="hero-stagger-5 mx-auto max-w-5xl px-4 sm:px-6 pt-12 scroll-mt-16">
          {/* Interactive View Switcher */}
          <div className="flex items-center justify-center pb-5">
            <div className="inline-flex flex-wrap items-center justify-center gap-1 rounded-lg border border-border bg-muted/50 p-1 max-w-full">
              <button
                type="button"
                onClick={() => setActiveTab('plan')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 sm:px-3.5 py-1.5 text-[11px] sm:text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'plan'
                    ? 'bg-card text-indigo-600 dark:text-indigo-400 shadow-2xs border border-border/80'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <ListTodo size={13} className="shrink-0" />
                <span>Today&apos;s Study Plan</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('backlog')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 sm:px-3.5 py-1.5 text-[11px] sm:text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'backlog'
                    ? 'bg-card text-indigo-600 dark:text-indigo-400 shadow-2xs border border-border/80'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Table size={13} className="shrink-0" />
                <span>Pending Chapters</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('recovery')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 sm:px-3.5 py-1.5 text-[11px] sm:text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'recovery'
                    ? 'bg-card text-emerald-600 dark:text-emerald-400 shadow-2xs border border-border/80'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <RotateCcw size={13} className="shrink-0" />
                <span>Catch-Up When You Miss a Day</span>
              </button>
            </div>
          </div>

          {/* Academic Workspace Window */}
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden text-left font-sans">
            {/* Top Header Strip */}
            <div className="flex items-center justify-between border-b border-border bg-muted/35 px-4 py-2.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <GraduationCap size={14} className="text-indigo-600 dark:text-indigo-400" />
                <span className="font-semibold text-foreground">BacklogOS</span>
                <span>/</span>
                <span>Student Command Center</span>
              </div>

              <div className="flex items-center gap-3 font-mono text-[11px]">
                <span className="hidden sm:inline">CBSE 2026–27 Academic Sprint</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Cloud Ready</span>
              </div>
            </div>

            {/* Inner Workspace */}
            <div className="p-5 sm:p-8 space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/25 text-indigo-600 dark:text-indigo-400 shrink-0">
                    <Target size={16} />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-sans">
                    {activeTab === 'plan' && "Today's Focused Study Blocks"}
                    {activeTab === 'backlog' && 'Pending Chapters (High Board Weightage First)'}
                    {activeTab === 'recovery' && 'Automatic Catch-Up Engine (Missed-Day Protection)'}
                  </h2>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2.5 border-y border-border/70 text-xs tabular-nums">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Target Exam</span>
                    <span className="font-semibold text-foreground">CBSE Boards Feb 2027</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Daily Study Target</span>
                    <span className="font-semibold text-foreground">3.0 Hours / Day</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Chapters Left</span>
                    <span className="font-semibold text-foreground">5 Pending Chapters</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Current Pace</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      On Track (+2 days buffer)
                    </span>
                  </div>
                </div>
              </div>

              {/* Academic Strategy Callout */}
              <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/[0.04] p-3.5 flex items-start gap-3 text-xs leading-relaxed">
                <div className="p-1.5 bg-card rounded-md border border-indigo-500/20 shrink-0 mt-0.5">
                  <Sparkles size={14} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="space-y-0.5">
                  <span className="font-bold text-foreground">Study Sequence Tip: </span>
                  <span className="text-muted-foreground">
                    {activeTab === 'plan' &&
                      "Today opens with Kinematics because it unlocks Newton's Laws and Work-Energy effortlessly. Complete the lecture sprint first, then solve NCERT in-text examples."}
                    {activeTab === 'backlog' &&
                      'Chapters are prioritized with highest board weightage and prerequisite foundations first so your mock scores improve immediately.'}
                    {activeTab === 'recovery' &&
                      'Missed Tuesday due to coaching tests or illness? BacklogOS redistributes those 45 minutes into weekend slots so daily load stays realistic.'}
                  </span>
                </div>
              </div>

              {activeTab === 'plan' && (
                <div className="space-y-3 animate-page-enter">
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider font-mono">
                    Interactive Sprint Preview
                  </div>

                  {/* Task 1 */}
                  <div
                    className={`rounded-lg border border-border bg-background p-4 space-y-3 transition-all duration-200 ${
                      previewTask1Done ? 'opacity-65' : ''
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => setPreviewTask1Done(!previewTask1Done)}
                          className="h-5 w-5 rounded border border-border flex items-center justify-center text-foreground font-mono text-[10px] hover:border-indigo-500 transition active:scale-90 shrink-0 cursor-pointer"
                          aria-label="Toggle task 1"
                        >
                          {previewTask1Done ? (
                            <CheckCircle2 size={16} className="text-emerald-500 animate-check-pop" />
                          ) : (
                            <span>1</span>
                          )}
                        </button>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-sm font-semibold transition-all duration-200 ${
                                previewTask1Done ? 'line-through text-muted-foreground' : 'text-foreground'
                              }`}
                            >
                              Physics · Kinematics: 1D &amp; 2D Motion
                            </span>
                            <span className="text-[11px] font-mono text-sky-600 dark:text-sky-400 font-semibold">
                              Concept Sprint
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground font-mono tabular-nums">
                            60 minutes · High Board Weightage (7 marks)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setPreviewTask1Done(!previewTask1Done)}
                          className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition active:scale-95 flex items-center gap-1.5 cursor-pointer ${
                            previewTask1Done
                              ? 'border border-border bg-muted/50 text-muted-foreground'
                              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-2xs'
                          }`}
                        >
                          {previewTask1Done ? (
                            <>
                              <Check size={12} className="text-emerald-500" />
                              <span>Completed</span>
                            </>
                          ) : (
                            <>
                              <Play size={11} className="fill-current" />
                              <span>Mark Done Demo</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Curated Lecture Row */}
                    <div className="rounded-md border border-border bg-muted/25 p-2.5 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <Bookmark size={13} className="text-indigo-500 shrink-0" />
                        <span className="truncate text-foreground font-medium">
                          Motion in a Straight Line — Complete NCERT &amp; Graph Revision
                        </span>
                        <span className="text-muted-foreground font-mono text-[11px] shrink-0 tabular-nums">
                          · 52m
                        </span>
                      </div>
                      <a
                        href="https://www.youtube.com/watch?v=0Wb6WbZ4mQo"
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 dark:text-indigo-400 hover:underline font-mono text-[11px] font-semibold flex items-center gap-1 shrink-0"
                      >
                        <span>Open Lecture</span>
                        <ExternalLink size={10} />
                      </a>
                    </div>
                  </div>

                  {/* Task 2 */}
                  <div
                    className={`rounded-lg border border-border bg-background p-4 space-y-3 transition-all duration-200 ${
                      previewTask2Done ? 'opacity-65' : ''
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => setPreviewTask2Done(!previewTask2Done)}
                          className="h-5 w-5 rounded border border-border flex items-center justify-center text-foreground font-mono text-[10px] hover:border-indigo-500 transition active:scale-90 shrink-0 cursor-pointer"
                          aria-label="Toggle task 2"
                        >
                          {previewTask2Done ? (
                            <CheckCircle2 size={16} className="text-emerald-500 animate-check-pop" />
                          ) : (
                            <span>2</span>
                          )}
                        </button>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-sm font-semibold transition-all duration-200 ${
                                previewTask2Done ? 'line-through text-muted-foreground' : 'text-foreground'
                              }`}
                            >
                              Chemistry · Solutions &amp; Colligative Properties
                            </span>
                            <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                              NCERT PYQ Solving
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground font-mono tabular-nums">
                            45 minutes · Direct Board Questions
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setPreviewTask2Done(!previewTask2Done)}
                          className={`rounded-lg border border-border px-3 py-1.5 text-xs font-semibold transition active:scale-95 flex items-center gap-1.5 cursor-pointer ${
                            previewTask2Done
                              ? 'bg-muted text-muted-foreground'
                              : 'bg-card text-foreground hover:bg-muted'
                          }`}
                        >
                          <Check size={12} className={previewTask2Done ? 'text-emerald-500' : ''} />
                          <span>{previewTask2Done ? 'Completed' : 'Mark Complete'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'backlog' && (
                <div className="space-y-3 animate-page-enter">
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider font-mono">
                    Prioritized Pending Chapters Table
                  </div>

                  <div className="border border-border rounded-lg overflow-hidden text-xs">
                    <div className="hidden sm:grid grid-cols-12 bg-muted/50 px-4 py-2.5 font-mono text-muted-foreground text-[11px] border-b border-border font-semibold">
                      <div className="col-span-5">Chapter</div>
                      <div className="col-span-2">Subject</div>
                      <div className="col-span-2">Weight</div>
                      <div className="col-span-3">Status</div>
                    </div>

                    {[
                      {
                        chapter: 'Electrochemistry',
                        subject: 'Chemistry',
                        weight: '8 marks',
                        status: 'In Progress',
                        statusClass: 'text-amber-600 dark:text-amber-400 font-semibold',
                      },
                      {
                        chapter: 'Rotational Motion',
                        subject: 'Physics',
                        weight: '7 marks',
                        status: 'Priority Queue',
                        statusClass: 'text-rose-600 dark:text-rose-400 font-semibold',
                      },
                      {
                        chapter: 'Integrals & Differential Eq.',
                        subject: 'Mathematics',
                        weight: '12 marks',
                        status: 'Scheduled Day 3',
                        statusClass: 'text-indigo-600 dark:text-indigo-400 font-semibold',
                      },
                      {
                        chapter: 'Ray Optics & Optical Inst.',
                        subject: 'Physics',
                        weight: '9 marks',
                        status: 'Scheduled Day 4',
                        statusClass: 'text-muted-foreground',
                      },
                    ].map((row, idx) => (
                      <div key={idx} className="border-b border-border last:border-0 p-3.5 sm:px-4 sm:py-3 hover:bg-muted/20">
                        <div className="flex sm:hidden items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-foreground text-xs leading-snug">{row.chapter}</div>
                            <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                              {row.subject} · {row.weight}
                            </div>
                          </div>
                          <span className={`shrink-0 text-[11px] font-mono ${row.statusClass}`}>{row.status}</span>
                        </div>

                        <div className="hidden sm:grid grid-cols-12 items-center">
                          <div className="col-span-5 font-semibold text-foreground">{row.chapter}</div>
                          <div className="col-span-2 text-muted-foreground">{row.subject}</div>
                          <div className="col-span-2 font-mono tabular-nums text-[11px] text-muted-foreground">
                            {row.weight}
                          </div>
                          <div className={`col-span-3 font-mono text-[11px] ${row.statusClass}`}>{row.status}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'recovery' && (
                <div className="space-y-3 animate-page-enter">
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider font-mono">
                    Adaptive Buffer Simulation
                  </div>

                  <div className="rounded-lg border border-border p-4 bg-muted/15 space-y-3 text-xs">
                    <div className="flex items-center gap-2 text-foreground font-bold">
                      <RotateCcw size={14} className="text-emerald-600 dark:text-emerald-400" />
                      <span>Missed study session on Tuesday? Zero guilt.</span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      Static timetables break the moment school tests or illness hit. BacklogOS detects missed blocks and spreads hours gently across upcoming days:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 font-mono text-[11px]">
                      <div className="p-3 rounded-lg border border-border bg-card space-y-1">
                        <span className="text-muted-foreground block">Paper Timetables</span>
                        <span className="text-rose-600 dark:text-rose-400 block font-bold">
                          14 hrs piled up next day
                        </span>
                      </div>
                      <div className="p-3 rounded-lg border border-indigo-500/30 bg-indigo-500/5 space-y-1">
                        <span className="text-muted-foreground block">BacklogOS Rebalancer</span>
                        <span className="text-indigo-600 dark:text-indigo-400 block font-bold">
                          +20 mins across 3 days
                        </span>
                      </div>
                      <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 space-y-1">
                        <span className="text-muted-foreground block">Exam Readiness</span>
                        <span className="text-emerald-600 dark:text-emerald-400 block font-bold">
                          100% syllabus covered on time
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer Row inside Showcase */}
              <div className="pt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground border-t border-border/70">
                <span className="font-mono text-[11px]">
                  Pick your exact Class 11 or 12 chapters to generate this workspace in under 2 minutes.
                </span>
                <Link
                  href="/onboarding"
                  className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <span>Build Your Backlog Plan</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PW x UNACADEMY SUBJECT MASTERY TRACKS & STUDY METHODOLOGY SPLIT */}
      <section id="subjects-track" className="border-b border-border bg-background py-16 sm:py-24 scroll-mt-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-12">
          {/* Editorial Split: Methodology + Clean Visual Study Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            <div className="lg:col-span-6 space-y-5">
              <p className="text-xs font-mono font-bold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-400">
                01 · Structured CBSE Academic System
              </p>
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
                Built Like a Toppers&apos; Mentorship Batch — Focused on Clearing Backlogs
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Great coaching platforms succeed because they remove confusion about <em>what to study today</em>. BacklogOS applies that exact discipline specifically to your unfinished CBSE chapters.
              </p>

              <div className="space-y-3 pt-2 border-t border-border text-xs sm:text-sm">
                <div className="flex items-start gap-3">
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">01</span>
                  <div>
                    <strong className="text-foreground">Prerequisite Ordering:</strong>
                    <span className="text-muted-foreground"> Foundations like Vectors, Mole Concept, and Limits are scheduled automatically before dependent chapters.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">02</span>
                  <div>
                    <strong className="text-foreground">NCERT + Board Weightage Triage:</strong>
                    <span className="text-muted-foreground"> High-scoring board units surface at the top when exam days are tight.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="font-mono font-bold text-sky-600 dark:text-sky-400 shrink-0 mt-0.5">03</span>
                  <div>
                    <strong className="text-foreground">Cross-Device Cloud Sync:</strong>
                    <span className="text-muted-foreground"> Plan on your laptop, revise subtopics on your phone—every completed chapter and personal note stays synced.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <img
                  src="/images/edtech_study_desk.jpg"
                  alt="Focused Class 11 and 12 student study desk with physics textbook and structured schedule"
                  className="aspect-video w-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>
          </div>

          {/* 4 Subject Tracks Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {SUBJECT_TRACKS.map((sub) => {
              const Icon = sub.icon;
              return (
                <Link
                  key={sub.name}
                  href="/curriculum"
                  className={`group rounded-xl border bg-card p-5 transition-all duration-200 flex flex-col justify-between space-y-4 hover:-translate-y-0.5 hover:shadow-sm ${sub.accentBorder}`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg border ${sub.iconBox}`}>
                        <Icon size={18} />
                      </div>
                      <span className="font-mono text-[11px] text-muted-foreground">{sub.code}</span>
                    </div>

                    <div>
                      <h3 className={`text-lg font-bold tracking-tight ${sub.accentText}`}>{sub.name}</h3>
                      <p className="text-[11px] font-mono text-muted-foreground mt-0.5">{sub.chapters}</p>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">{sub.focus}</p>
                  </div>

                  <div className="pt-3 border-t border-border flex items-center justify-between text-xs font-semibold text-foreground">
                    <span>Explore Chapters</span>
                    <ArrowRight size={13} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. CORE ENGINE CAPABILITIES & REAL STUDENT OUTCOMES */}
      <section id="explore-backlogos" className="border-b border-border bg-muted/20 py-16 sm:py-24 scroll-mt-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-10">
          <div className="max-w-3xl space-y-2.5">
            <p className="text-xs font-mono font-bold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-400">
              02 · Student Backlog Engine
            </p>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground font-sans">
              Every Feature Explained with Real CBSE Student Cases
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Practical workflows designed around real school schedules, pre-boards, and coaching backlog scenarios.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {STUDENT_OUTCOME_CASES.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.num}
                  className="rounded-xl border border-border bg-card p-6 space-y-4 transition-all duration-200 hover:border-indigo-500/35 hover:shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${item.iconStyle}`}>
                      <Icon size={20} />
                    </div>
                    <span className="text-[11px] font-mono font-bold text-muted-foreground uppercase tracking-wider">
                      {item.num} · {item.tag}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="text-lg font-bold text-foreground">{item.title}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                  </div>

                  <div className="border-t border-border pt-3.5 space-y-1.5 text-xs">
                    <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      Student Case · {item.caseStudent}
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      <strong className="text-foreground">Challenge:</strong> {item.problem}
                    </p>
                    <p className="text-foreground leading-relaxed">
                      <strong>Result:</strong> {item.outcome}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. WHY STATIC TIMETABLES COLLAPSE VS. BACKLOGOS */}
      <section className="border-b border-border bg-background py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-mono uppercase tracking-widest text-indigo-600 dark:text-indigo-400 font-bold">
              03 · Built for Real Student Days
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-sans">
              Why static paper timetables always collapse
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Students rarely fail due to lack of ambition—static timetables assume you never have surprise school tests, practical files, or low-energy evenings.
            </p>
          </div>

          <div className="border border-border rounded-xl overflow-hidden text-xs shadow-2xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
              <div className="p-6 sm:p-8 bg-muted/20 space-y-4">
                <div className="font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider font-mono text-[11px]">
                  Traditional Rigid Timetables
                </div>
                <ul className="space-y-3 text-muted-foreground leading-relaxed">
                  <li className="flex items-start gap-2.5">
                    <span className="text-rose-500 font-bold shrink-0">×</span>
                    <span>Abandoning your entire schedule by Day 4 after one missed evening study slot.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-rose-500 font-bold shrink-0">×</span>
                    <span>Binge-watching 10-hour marathon videos at 2x speed without solving NCERT problems.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-rose-500 font-bold shrink-0">×</span>
                    <span>Wasting study time searching random links instead of following a clear chapter order.</span>
                  </li>
                </ul>
              </div>

              <div className="p-6 sm:p-8 bg-card space-y-4">
                <div className="font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-mono text-[11px]">
                  The BacklogOS Study System
                </div>
                <ul className="space-y-3 text-foreground leading-relaxed">
                  <li className="flex items-start gap-2.5">
                    <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span>
                      <strong>Adaptive Day-Shift:</strong> Missed hours spread gently across open weekend blocks with zero panic.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span>
                      <strong>Structured Learning Loops:</strong> Concept lecture + NCERT subtopic checklist + PYQ drill inside each chapter.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span>
                      <strong>Honest Completion Forecast:</strong> Always see exact chapters left and real days to exam readiness.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FOUNDER NOTE & FINAL EXAM-READY CTA */}
      <section className="border-b border-border bg-muted/20 py-14 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center space-y-5">
          <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-muted-foreground font-semibold">
            A Note to Every Student Catching Up
          </p>

          <blockquote className="text-base sm:text-lg font-medium text-foreground leading-relaxed italic max-w-2xl mx-auto">
            &quot;Schools and coaching move at full speed even if you fall sick or get stuck on one chapter. Once 8 chapters pile up, fear makes it harder to open the book. BacklogOS turns that pile into a clear daily plan—take it one 50-minute block at a time.&quot;
          </blockquote>

          <div className="pt-1 flex flex-col items-center gap-0.5 text-xs font-mono">
            <span className="font-bold text-foreground">Ronik &amp; Student Contributors</span>
            <span className="text-muted-foreground text-[11px]">CBSE Class 11 &amp; 12 Syllabus Platform · 2026–27</span>
          </div>
        </div>
      </section>

      {/* 7. FINAL CTA BANNER */}
      <section className="bg-background py-16 sm:py-24 text-center">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 space-y-5">
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground font-sans">
            Start clearing your backlog today.
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
            Select your pending chapters and daily study hours in under 2 minutes. Completely free for CBSE Class 11 &amp; 12 students.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/onboarding"
              className="group relative overflow-hidden w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 text-sm font-bold transition shadow-sm active:scale-95"
            >
              <img
                src="/brand/mark-transparent.svg"
                alt=""
                className="h-4 w-4 object-contain brightness-200 group-hover:scale-110 transition-transform shrink-0"
              />
              <span className="tracking-tight">Build Your Backlog Plan</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform duration-200" />
            </Link>

            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground hover:bg-muted transition active:scale-[0.98]"
            >
              <BookOpenCheck size={14} className="text-indigo-600 dark:text-indigo-400" />
              <span>Open Dashboard</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Landing Footer with Community Impact Counter & Legal Links */}
      <footer className="border-t border-border/80 py-8 px-4 sm:px-6 text-xs text-muted-foreground bg-muted/15">
        <div className="mx-auto max-w-5xl space-y-6">
          <CommunityImpactBanner />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground">BacklogOS</span>
              <span>·</span>
              <span>CBSE Class 11–12 Study &amp; Backlog Assistant</span>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-mono">
              <Link href="/privacy" className="hover:text-foreground transition underline underline-offset-4">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-foreground transition underline underline-offset-4">
                Terms of Service
              </Link>
              <Link href="/login" className="hover:text-foreground transition inline-flex items-center gap-1">
                <span>Student Login</span>
                <ExternalLink size={10} className="opacity-70" />
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
