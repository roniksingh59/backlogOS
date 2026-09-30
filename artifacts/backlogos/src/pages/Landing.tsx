import {
  ArrowRight,
  BookOpenCheck,
  Check,
  Clock3,
  Flame,
  Layers,
  Sparkles,
  GraduationCap,
  GitFork,
  RotateCcw,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ListTodo,
  Table,
  Play,
  Share2,
  Star,
  MoreHorizontal,
  Bookmark,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'wouter';
import { useState } from 'react';

export function Landing() {
  const [activeTab, setActiveTab] = useState<'plan' | 'backlog' | 'recovery' | 'flashcards'>('plan');

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-foreground selection:text-background">
      {/* 1. NOTION-STYLE HERO SECTION */}
      <section className="border-b border-border/80 bg-background pt-14 pb-16 sm:pt-20 sm:pb-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 text-center space-y-6">
          {/* Notion-style subtle top tag */}
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground hover:border-foreground/30 transition-colors">
            <span className="flex h-1.5 w-1.5 rounded-full bg-foreground" />
            <span>The syllabus recovery workspace for Class 11 & 12 CBSE</span>
            <ChevronRight size={12} className="opacity-50" />
          </div>

          {/* Hero Headline: Clean, human-designed, impactful */}
          <h1 className="font-sans text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-foreground max-w-4xl mx-auto leading-[1.08]">
            The all-in-one workspace for your study backlog.
          </h1>

          {/* Hero Subtitle */}
          <p className="text-base sm:text-xl leading-relaxed text-muted-foreground max-w-2xl mx-auto font-normal">
            Turn chapter debt into a calm, prioritized daily plan. BacklogOS computes your runway, respects prerequisite foundations, and adapts automatically when you miss a day.
          </p>

          {/* Notion-Style Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/onboarding"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-[5px] bg-sky-500 hover:bg-sky-400 text-white px-5 py-2.5 text-sm font-medium transition shadow-2xs border border-sky-400/40"
              data-testid="link-hero-get-started"
            >
              <div className="flex h-4 w-4 items-center justify-center rounded-[2px] bg-white/20 text-white font-mono text-[9px] font-bold">
                B
              </div>
              <span>Create your backlog plan now</span>
              <ArrowRight size={14} />
            </Link>

            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open-explore-features'))}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-[5px] border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition"
              data-testid="button-hero-explore-backlogos"
            >
              <Sparkles size={14} className="text-muted-foreground" />
              <span>Explore BacklogOS</span>
            </button>

            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open-why-built'))}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 decoration-border transition py-1"
              data-testid="button-hero-why-built"
            >
              Why BacklogOS was built (Ronik's story)
            </button>
          </div>

          <div className="text-[11px] font-mono text-muted-foreground pt-1">
            Free for students · CBSE Class 11 & 12 · Local authoritative
          </div>
        </div>

        {/* 2. NOTION-STYLE INTERACTIVE PRODUCT SHOWCASE WINDOW */}
        <div className="mx-auto max-w-5xl px-4 sm:px-6 pt-10">
          {/* Notion Tab Switcher - Pure Notion Tab Design */}
          <div className="flex items-center justify-center pb-5 overflow-x-auto">
            <div className="inline-flex items-center gap-1 rounded-lg border border-border/80 bg-muted/40 p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setActiveTab('plan')}
                className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-medium transition ${
                  activeTab === 'plan'
                    ? 'bg-background text-foreground font-semibold shadow-2xs border border-border/70'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <ListTodo size={13} className={activeTab === 'plan' ? 'text-foreground' : 'text-muted-foreground'} />
                <span>Today's Recovery Plan</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('backlog')}
                className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-medium transition ${
                  activeTab === 'backlog'
                    ? 'bg-background text-foreground font-semibold shadow-2xs border border-border/70'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <Table size={13} className={activeTab === 'backlog' ? 'text-foreground' : 'text-muted-foreground'} />
                <span>Backlog Database</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('recovery')}
                className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-medium transition ${
                  activeTab === 'recovery'
                    ? 'bg-background text-foreground font-semibold shadow-2xs border border-border/70'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <RotateCcw size={13} className={activeTab === 'recovery' ? 'text-foreground' : 'text-muted-foreground'} />
                <span>Zero-Guilt Rebalancer</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('flashcards')}
                className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-medium transition ${
                  activeTab === 'flashcards'
                    ? 'bg-background text-foreground font-semibold shadow-2xs border border-border/70'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <Layers size={13} className={activeTab === 'flashcards' ? 'text-foreground' : 'text-muted-foreground'} />
                <span>Spaced Recall</span>
              </button>
            </div>
          </div>

          {/* The Notion Workspace Window Frame */}
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden text-left font-sans">
            {/* Notion Window Top Header Bar */}
            <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-border" />
                  <span className="h-2.5 w-2.5 rounded-full bg-border" />
                  <span className="h-2.5 w-2.5 rounded-full bg-border" />
                </div>
                <div className="h-3 w-px bg-border mx-1" />
                <span className="font-mono text-[11px] text-muted-foreground">BacklogOS / Workspace / Today</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="hidden sm:inline font-mono text-[10px] uppercase">CBSE 2026–27</span>
                <div className="flex items-center gap-1">
                  <button type="button" className="p-1 hover:bg-muted rounded" title="Star">
                    <Star size={12} />
                  </button>
                  <button type="button" className="p-1 hover:bg-muted rounded" title="Share">
                    <Share2 size={12} />
                  </button>
                  <button type="button" className="p-1 hover:bg-muted rounded" title="More">
                    <MoreHorizontal size={12} />
                  </button>
                </div>
              </div>
            </div>

            {/* Notion Page Inner Content */}
            <div className="p-5 sm:p-8 space-y-6">
              {/* Page Title & Icon */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-2xl">
                  <span>🎯</span>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-sans">
                    {activeTab === 'plan' && "Today's Academic Recovery Schedule"}
                    {activeTab === 'backlog' && "Physics & Chemistry Chapter Debt Database"}
                    {activeTab === 'recovery' && "Automatic Catch-up Engine"}
                    {activeTab === 'flashcards' && "Active Recall & Formula Mastery"}
                  </h2>
                </div>

                {/* Notion Property Metadata Block */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2 border-y border-border/70 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Exam Target</span>
                    <span className="font-medium text-foreground">CBSE Boards Feb 2027</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Daily Study Budget</span>
                    <span className="font-medium text-foreground">3.0 Hours / Day</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Backlog Remaining</span>
                    <span className="font-medium text-foreground">8 Chapters (24 hrs)</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Current Pace</span>
                    <span className="font-medium text-foreground text-emerald-600 dark:text-emerald-400">On Track (+2 days)</span>
                  </div>
                </div>
              </div>

              {/* Notion Callout Box */}
              <div className="rounded-md border border-border bg-muted/40 p-3.5 flex items-start gap-3 text-xs leading-relaxed">
                <div className="p-1 bg-background rounded border border-border shrink-0 mt-0.5">
                  <Sparkles size={14} className="text-foreground" />
                </div>
                <div className="space-y-0.5">
                  <span className="font-semibold text-foreground">Daily Adaptive Note:</span>
                  <p className="text-muted-foreground">
                    {activeTab === 'plan' && "Today prioritizes Physics Kinematics because it unlocks Newton's Laws and Work-Energy-Power. Complete the concept lecture before attempting the HC Verma question set."}
                    {activeTab === 'backlog' && "Chapters are sorted by Exam Weightage × Dependency Rank. Clearing high-leverage foundations early increases retention by 3.2×."}
                    {activeTab === 'recovery' && "Zero-guilt shift active: If you miss a slot today, BacklogOS gently redistributes the 45 minutes across your weekend buffer without piling up."}
                    {activeTab === 'flashcards' && "Spaced repetition intervals ensure formulas learned last week are tested at optimal forgetting curve decay points."}
                  </p>
                </div>
              </div>

              {/* Active Tab View Showcase */}
              {activeTab === 'plan' && (
                <div className="space-y-3">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider font-mono">
                    Today's Task Block
                  </div>

                  {/* Task 1 */}
                  <div className="rounded-md border border-border bg-background p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="h-4 w-4 rounded border border-border flex items-center justify-center text-foreground font-mono text-[10px]">
                          1
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-foreground">Physics: Kinematics — 1D & 2D Motion</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border bg-muted/50 text-muted-foreground">
                              Concept Learning
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground font-mono">60 minutes · High Weightage (7 marks)</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <Link
                          href="/study"
                          className="rounded-[5px] bg-foreground text-background px-3 py-1.5 text-xs font-medium hover:opacity-90 transition flex items-center gap-1.5"
                        >
                          <Play size={11} />
                          <span>Start Focus Timer</span>
                        </Link>
                      </div>
                    </div>

                    {/* Integrated Resource Bookmark inside the Task (Notion Style) */}
                    <div className="rounded border border-border bg-muted/20 p-2.5 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <Bookmark size={13} className="text-muted-foreground shrink-0" />
                        <span className="truncate text-foreground font-medium">Physics Galaxy: Motion in a Straight Line Full Revision</span>
                        <span className="text-muted-foreground font-mono text-[11px] shrink-0">· 52 min</span>
                      </div>
                      <a
                        href="https://www.youtube.com/watch?v=0Wb6WbZ4mQo"
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted-foreground hover:text-foreground font-mono text-[11px] flex items-center gap-1 shrink-0"
                      >
                        <span>Open Lecture</span>
                        <ExternalLink size={10} />
                      </a>
                    </div>
                  </div>

                  {/* Task 2 */}
                  <div className="rounded-md border border-border bg-background p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="h-4 w-4 rounded border border-border flex items-center justify-center text-foreground font-mono text-[10px]">
                          2
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-foreground">Chemistry: Solutions & Colligative Properties</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border bg-muted/50 text-muted-foreground">
                              NCERT PYQ Solving
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground font-mono">45 minutes · Direct Board Questions</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <Link
                          href="/dashboard"
                          className="rounded-[5px] border border-border bg-muted/30 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition flex items-center gap-1.5"
                        >
                          <Check size={11} />
                          <span>Mark Complete</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'backlog' && (
                <div className="space-y-3">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider font-mono">
                    Database View: Remaining Chapters
                  </div>

                  <div className="border border-border rounded-md overflow-hidden text-xs">
                    <div className="grid grid-cols-12 bg-muted/50 px-3 py-2 font-mono text-muted-foreground text-[11px] border-b border-border font-medium">
                      <div className="col-span-5">Chapter</div>
                      <div className="col-span-2">Subject</div>
                      <div className="col-span-2">Weight</div>
                      <div className="col-span-3">Status</div>
                    </div>

                    {[
                      { chapter: 'Electrochemistry', subject: 'Chemistry', weight: '8 marks', status: 'In Progress', statusColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
                      { chapter: 'Rotational Motion', subject: 'Physics', weight: '7 marks', status: 'Backlog Debt', statusColor: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' },
                      { chapter: 'Integrals & Differential Eq.', subject: 'Math', weight: '12 marks', status: 'Scheduled Day 3', statusColor: 'bg-muted text-muted-foreground border-border' },
                      { chapter: 'Ray Optics & Optical Inst.', subject: 'Physics', weight: '9 marks', status: 'Scheduled Day 4', statusColor: 'bg-muted text-muted-foreground border-border' },
                    ].map((row, idx) => (
                      <div key={idx} className="grid grid-cols-12 px-3 py-2.5 border-b border-border last:border-0 items-center hover:bg-muted/20">
                        <div className="col-span-5 font-medium text-foreground">{row.chapter}</div>
                        <div className="col-span-2 text-muted-foreground">{row.subject}</div>
                        <div className="col-span-2 font-mono text-[11px] text-muted-foreground">{row.weight}</div>
                        <div className="col-span-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono border ${row.statusColor}`}>
                            {row.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'recovery' && (
                <div className="space-y-3">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider font-mono">
                    Adaptive Buffer Simulation
                  </div>

                  <div className="rounded-md border border-border p-4 bg-muted/10 space-y-3 text-xs">
                    <div className="flex items-center gap-2 text-foreground font-medium">
                      <RotateCcw size={14} />
                      <span>Missed study session on Tuesday? No panic.</span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      Traditional planners break the moment a student falls sick or misses a day. BacklogOS detects uncompleted tasks and recalculates the timeline with zero guilt:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                      <div className="p-2.5 rounded border border-border bg-background space-y-1">
                        <span className="text-muted-foreground block">Old Static Apps</span>
                        <span className="text-red-500 block font-semibold">14 hrs stacked next day (burnout)</span>
                      </div>
                      <div className="p-2.5 rounded border border-border bg-background space-y-1">
                        <span className="text-muted-foreground block">BacklogOS Algorithm</span>
                        <span className="text-foreground block font-semibold">+20 mins to next 3 sessions</span>
                      </div>
                      <div className="p-2.5 rounded border border-border bg-background space-y-1">
                        <span className="text-muted-foreground block">Exam Date Impact</span>
                        <span className="text-emerald-500 block font-semibold">0 days lost, 100% covered</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'flashcards' && (
                <div className="space-y-3">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider font-mono">
                    Spaced Repetition Deck
                  </div>

                  <div className="rounded-md border border-border p-5 bg-background text-center space-y-3">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Physics · Derivation Card 4 of 28</span>
                    <h3 className="text-base font-semibold text-foreground">
                      State Gauss's Law and write the formula for electric flux through a closed Gaussian surface.
                    </h3>
                    <div className="pt-2 flex justify-center gap-2">
                      <Link
                        href="/flashcards"
                        className="rounded-[5px] bg-foreground text-background px-4 py-1.5 text-xs font-medium hover:opacity-90 transition"
                      >
                        Practice Active Recall Decks
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* Notion Footer Link inside Preview */}
              <div className="pt-2 flex items-center justify-between text-xs text-muted-foreground border-t border-border/60">
                <span className="font-mono text-[11px]">Ready to build your personal syllabus map?</span>
                <Link
                  href="/onboarding"
                  className="font-medium text-foreground hover:underline flex items-center gap-1"
                >
                  <span>Start Plan Wizard</span>
                  <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. NOTION-STYLE BENTO GRID / CORE FEATURES */}
      <section className="border-b border-border/80 bg-background py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 space-y-12">
          <div className="max-w-2xl space-y-3">
            <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Built for Student Reality
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground font-sans">
              Everything you need to clear backlog. Nothing you don't.
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              No decorative distractions, no unrealistic 16-hour timetables. BacklogOS is engineered around the actual cognitive limits of high school and entrance exam students.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bento Card 1 */}
            <div className="rounded-lg border border-border bg-card p-6 space-y-4 hover:border-foreground/30 transition-colors">
              <div className="flex h-9 w-9 items-center justify-center rounded-[5px] border border-border bg-muted/60 text-foreground">
                <BookOpenCheck size={18} />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-semibold text-foreground">
                  Prerequisite-Aware Sequence
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Never get stuck trying to learn Rotational Dynamics before mastering Vectors. BacklogOS organizes chapters in logical foundational order so you actually understand what you study.
                </p>
              </div>
              <div className="pt-2 text-xs font-mono text-muted-foreground flex items-center gap-1.5">
                <Check size={12} className="text-foreground" />
                <span>Prevents circular dependency traps</span>
              </div>
            </div>

            {/* Bento Card 2 */}
            <div className="rounded-lg border border-border bg-card p-6 space-y-4 hover:border-foreground/30 transition-colors">
              <div className="flex h-9 w-9 items-center justify-center rounded-[5px] border border-border bg-muted/60 text-foreground">
                <RotateCcw size={18} />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-semibold text-foreground">
                  Guilt-Free Missed Day Recovery
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  When school exams or sickness interrupt your schedule, one click redistributes overdue tasks across future buffer days without guilt or cramming.
                </p>
              </div>
              <div className="pt-2 text-xs font-mono text-muted-foreground flex items-center gap-1.5">
                <Check size={12} className="text-foreground" />
                <span>Dynamic time-block recalculation</span>
              </div>
            </div>

            {/* Bento Card 3 */}
            <div className="rounded-lg border border-border bg-card p-6 space-y-4 hover:border-foreground/30 transition-colors">
              <div className="flex h-9 w-9 items-center justify-center rounded-[5px] border border-border bg-muted/60 text-foreground">
                <Bookmark size={18} />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-semibold text-foreground">
                  In-Task Curated Free Lectures
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  No more getting lost down the YouTube recommendation rabbit hole. Every task links directly to vetted, high-yield one-shot lectures and NCERT line-by-line breakdowns.
                </p>
              </div>
              <div className="pt-2 text-xs font-mono text-muted-foreground flex items-center gap-1.5">
                <Check size={12} className="text-foreground" />
                <span>Verified channels & exact durations</span>
              </div>
            </div>

            {/* Bento Card 4 */}
            <div className="rounded-lg border border-border bg-card p-6 space-y-4 hover:border-foreground/30 transition-colors">
              <div className="flex h-9 w-9 items-center justify-center rounded-[5px] border border-border bg-muted/60 text-foreground">
                <Layers size={18} />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-semibold text-foreground">
                  Active Recall & Formula Mastery
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Passive reading gives the illusion of competence. BacklogOS integrates active recall flashcards into revision slots to permanently cement key definitions and formulas.
                </p>
              </div>
              <div className="pt-2 text-xs font-mono text-muted-foreground flex items-center gap-1.5">
                <Check size={12} className="text-foreground" />
                <span>Spaced repetition intervals</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. NOTION-STYLE WORKFLOW COMPARISON SECTION */}
      <section className="border-b border-border/80 bg-background py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
              Replace fragmented tools with one workspace.
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Most students fail to clear backlog because their system is scattered across five different apps.
            </p>
          </div>

          <div className="border border-border rounded-lg overflow-hidden text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
              {/* Left Column: Fragmented */}
              <div className="p-6 bg-muted/20 space-y-4">
                <div className="font-semibold text-muted-foreground uppercase tracking-wider font-mono text-[11px]">
                  Traditional Frustration
                </div>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold shrink-0">✕</span>
                    <span>Paper checklists that get abandoned after 3 days of missed targets</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold shrink-0">✕</span>
                    <span>Rigid timetable apps requiring unrealistic 14-hour daily commitments</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold shrink-0">✕</span>
                    <span>Browsing YouTube for 40 minutes just trying to find one decent explanation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold shrink-0">✕</span>
                    <span>Constant anxiety of not knowing if syllabus will finish before board exams</span>
                  </li>
                </ul>
              </div>

              {/* Right Column: BacklogOS */}
              <div className="p-6 bg-card space-y-4">
                <div className="font-semibold text-foreground uppercase tracking-wider font-mono text-[11px] flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>The BacklogOS Standard</span>
                </div>
                <ul className="space-y-3 text-foreground">
                  <li className="flex items-start gap-2">
                    <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span>Single calm dashboard showing exactly what to study right now</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span>Realistic daily study budget (2.5–4.5 hrs) matched to your real schedule</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span>Instant access to vetted one-shot lectures right inside the task card</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span>Mathematical finish-date countdown that adjusts when you mark tasks complete</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. NOTION-STYLE FOUNDER QUOTE & STORY */}
      <section className="border-b border-border/80 bg-background py-14 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center space-y-4">
          <blockquote className="text-base sm:text-xl font-medium text-foreground leading-relaxed italic">
            "Backlog is not a moral failure; it is a scheduling error. Every student falls behind at some point in Class 11 and 12. What matters is having a deterministic tool that tells you what to do today without judgment."
          </blockquote>
          <div className="pt-2 flex flex-col items-center gap-1 text-xs">
            <span className="font-semibold text-foreground">Ronik</span>
            <span className="text-muted-foreground font-mono">Creator of BacklogOS</span>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open-why-built'))}
              className="mt-2 text-xs text-foreground hover:underline font-medium"
            >
              Read the story behind BacklogOS →
            </button>
          </div>
        </div>
      </section>

      {/* 6. NOTION-STYLE FINAL CTA BANNER */}
      <section className="bg-muted/30 py-16 sm:py-24 text-center">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 space-y-5">
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground font-sans">
            Start clearing your backlog today.
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
            Build your personalized syllabus plan in less than two minutes. Zero setup fees, 100% free for students.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/onboarding"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-[5px] bg-sky-500 hover:bg-sky-400 text-white px-6 py-2.5 text-sm font-medium transition shadow-2xs border border-sky-400/40"
            >
              <div className="flex h-4 w-4 items-center justify-center rounded-[2px] bg-white/20 text-white font-mono text-[9px] font-bold">
                B
              </div>
              <span>Create your backlog plan now</span>
              <ArrowRight size={14} />
            </Link>

            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open-explore-features'))}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-[5px] border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition"
            >
              <Sparkles size={14} className="text-muted-foreground" />
              <span>Explore BacklogOS</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
