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
  Camera,
  Zap,
  Timer,
  HeartHandshake,
  ShieldCheck,
  FileText,
  Smartphone,
  Brain,
  Download,
} from 'lucide-react';
import { Link } from 'wouter';
import { useState } from 'react';
import { LinearLiveStreamTicker } from '@/components/LinearLiveStreamTicker';
import { LinearFeatureInteractiveScreenshots } from '@/components/LinearFeatureInteractiveScreenshots';

export function Landing() {
  const [activeTab, setActiveTab] = useState<'plan' | 'backlog' | 'recovery' | 'flashcards'>('plan');
  const [previewTask1Done, setPreviewTask1Done] = useState(false);
  const [previewTask2Done, setPreviewTask2Done] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-foreground selection:text-background animate-page-enter">
      {/* 1. NOTION-STYLE HERO SECTION */}
      <section className="border-b border-border/80 bg-background pt-14 pb-16 sm:pt-20 sm:pb-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 text-center space-y-6">
          {/* Notion-style subtle top tag */}
          <div className="hero-stagger-1 inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3.5 py-1.5 text-xs font-medium text-muted-foreground hover:border-foreground/40 hover:bg-muted transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs animate-float">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
            </span>
            <span>The syllabus recovery workspace for Class 11 & 12 CBSE</span>
            <ChevronRight size={12} className="opacity-60" />
          </div>

          {/* Hero Headline: Dynamic Neon Animated Typography */}
          <div className="relative my-2">
            {/* Ambient Neon Lighting Glow */}
            <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 h-36 w-full max-w-2xl rounded-full bg-gradient-to-r from-cyan-500/20 via-purple-500/25 to-pink-500/20 blur-3xl opacity-80" />

            <h1 className="hero-stagger-2 relative font-sans text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground max-w-4xl mx-auto leading-[1.12] sm:leading-[1.08]">
              <span>The </span>
              <span className="neon-animated-text font-black px-1.5 drop-shadow-sm">
                all-in-one workspace
              </span>
              <br className="hidden sm:inline" />
              <span> for your </span>
              <span className="neon-animated-text-full font-black">
                study backlog.
              </span>
            </h1>
          </div>

          {/* Hero Subtitle */}
          <p className="hero-stagger-3 text-base sm:text-xl leading-relaxed text-muted-foreground max-w-2xl mx-auto font-normal">
            Turn chapter debt into a calm, prioritized daily plan. BacklogOS computes your runway, respects prerequisite foundations, and adapts automatically when you miss a day.
          </p>

          {/* Human Student Reality Note */}
          <div className="hero-stagger-3 mx-auto max-w-xl rounded-xl border border-amber-500/35 bg-amber-500/5 dark:bg-amber-500/10 p-3 sm:p-3.5 text-xs text-left text-foreground flex items-start gap-3 shadow-2xs">
            <span className="text-base select-none shrink-0 mt-0.5">☕</span>
            <div className="space-y-0.5">
              <span className="font-bold text-amber-700 dark:text-amber-300 font-mono text-[11px] uppercase tracking-wider block">
                From students who survived the backlog crisis:
              </span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Backlog isn't laziness. It's just syllabus overload. You don't need a frantic 16-hour timetable — you just need 3.5 honest hours without panic.
              </p>
            </div>
          </div>

          {/* Action Buttons: Clean, zero-spoiler */}
          <div className="hero-stagger-4 pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/onboarding"
              className="group relative overflow-hidden w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-white px-5 py-2.5 text-sm font-semibold transition shadow-md hover:shadow-sky-500/25 border border-sky-400/40 active:scale-95 cursor-pointer"
              data-testid="link-hero-get-started"
            >
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-button-shimmer" />
              <div className="flex h-4 w-4 items-center justify-center rounded-[2px] bg-white/20 text-white font-mono text-[9px] font-bold group-hover:scale-110 transition-transform">
                B
              </div>
              <span className="font-semibold tracking-tight">Create your backlog plan now</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform duration-200" />
            </Link>

            <button
              type="button"
              onClick={() => {
                document.getElementById('explore-backlogos')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition active:scale-[0.98] cursor-pointer shadow-2xs hover:border-foreground/30"
              data-testid="button-hero-explore-backlogos"
            >
              <Sparkles size={14} className="text-sky-500" />
              <span>Explore BacklogOS ↓</span>
            </button>
          </div>

          <div className="hero-stagger-4 text-[11px] font-mono text-muted-foreground pt-1">
            Free for students · CBSE Class 11 & 12 · Local authoritative
          </div>
        </div>

        {/* 2. NOTION-STYLE INTERACTIVE PRODUCT SHOWCASE WINDOW */}
        <div className="hero-stagger-5 mx-auto max-w-5xl px-4 sm:px-6 pt-10">
          {/* Notion Tab Switcher - Pure Notion Tab Design */}
          <div className="flex items-center justify-start sm:justify-center pb-5 overflow-x-auto whitespace-nowrap">
            <div className="inline-flex items-center gap-1 rounded-lg border border-border/80 bg-muted/40 p-1 shadow-2xs shrink-0 mx-auto sm:mx-0">
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
                    <span className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse-subtle" />
                      <span>On Track (+2 days)</span>
                    </span>
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
                <div className="space-y-3 animate-page-enter">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider font-mono">
                    Today's Task Block
                  </div>

                  {/* Task 1 */}
                  <div className={`card-interactive rounded-md border border-border bg-background p-4 space-y-3 transition-all duration-200 ${previewTask1Done ? 'opacity-65' : ''}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => setPreviewTask1Done(!previewTask1Done)}
                          className="h-5 w-5 rounded border border-border flex items-center justify-center text-foreground font-mono text-[10px] hover:border-foreground/50 transition-all duration-150 active:scale-90 shrink-0"
                          aria-label="Toggle task 1"
                        >
                          {previewTask1Done ? (
                            <CheckCircle2 size={16} className="text-foreground animate-check-pop" />
                          ) : (
                            <span>1</span>
                          )}
                        </button>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold transition-all duration-200 ${previewTask1Done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                              Physics: Kinematics — 1D & 2D Motion
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border bg-muted/50 text-muted-foreground">
                              Concept Learning
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground font-mono">60 minutes · High Weightage (7 marks)</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setPreviewTask1Done(!previewTask1Done)}
                          className={`rounded-[5px] px-3 py-1.5 text-xs font-medium transition-all duration-150 active:scale-95 flex items-center gap-1.5 ${
                            previewTask1Done
                              ? 'border border-border bg-muted/40 text-muted-foreground'
                              : 'bg-foreground text-background hover:opacity-90'
                          }`}
                        >
                          {previewTask1Done ? (
                            <>
                              <Check size={11} className="text-emerald-500" />
                              <span>Completed</span>
                            </>
                          ) : (
                            <>
                              <Play size={11} />
                              <span>Start Focus Timer</span>
                            </>
                          )}
                        </button>
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
                  <div className={`card-interactive rounded-md border border-border bg-background p-4 space-y-3 transition-all duration-200 ${previewTask2Done ? 'opacity-65' : ''}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => setPreviewTask2Done(!previewTask2Done)}
                          className="h-5 w-5 rounded border border-border flex items-center justify-center text-foreground font-mono text-[10px] hover:border-foreground/50 transition-all duration-150 active:scale-90 shrink-0"
                          aria-label="Toggle task 2"
                        >
                          {previewTask2Done ? (
                            <CheckCircle2 size={16} className="text-foreground animate-check-pop" />
                          ) : (
                            <span>2</span>
                          )}
                        </button>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold transition-all duration-200 ${previewTask2Done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                              Chemistry: Solutions & Colligative Properties
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border bg-muted/50 text-muted-foreground">
                              NCERT PYQ Solving
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground font-mono">45 minutes · Direct Board Questions</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setPreviewTask2Done(!previewTask2Done)}
                          className={`rounded-[5px] border border-border px-3 py-1.5 text-xs font-medium transition-all duration-150 active:scale-95 flex items-center gap-1.5 ${
                            previewTask2Done
                              ? 'bg-muted text-muted-foreground'
                              : 'bg-muted/40 text-foreground hover:bg-muted'
                          }`}
                        >
                          <Check size={11} className={previewTask2Done ? "text-emerald-500" : ""} />
                          <span>{previewTask2Done ? 'Completed' : 'Mark Complete'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'backlog' && (
                <div className="space-y-3 animate-page-enter">
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
                <div className="space-y-3 animate-page-enter">
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
                <div className="space-y-3 animate-page-enter">
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

      {/* 2. LINEAR-STYLE CONTINUOUS UPWARD SLIDING STREAM */}
      <section className="border-b border-border/80 bg-background/50 py-8 sm:py-12 overflow-hidden">
        <LinearLiveStreamTicker />
      </section>

      {/* 3. EXPLORE BACKLOGOS: COMPREHENSIVE FEATURES EXPLAINED WITH REAL STUDENT EXAMPLES */}
      <section id="explore-backlogos" className="border-b border-border/80 bg-background py-16 sm:py-24 scroll-mt-14">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 space-y-12">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 text-xs font-mono font-semibold text-sky-600 dark:text-sky-400">
              <Sparkles size={13} className="text-sky-500" />
              <span>Full System Breakdown</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground font-sans">
              Everything Inside BacklogOS — Explained with Real CBSE Examples
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              No vague buzzwords or unrealistic 16-hour timetables. Here is exactly how each feature works and how real students use it to clear backlog without burnout.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Feature 1: Smart Daily Adaptive Plan */}
            <div className="card-interactive rounded-xl border border-border bg-card p-6 space-y-4 hover:border-sky-400/40 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-500">
                  <BookOpenCheck size={20} />
                </div>
                <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-mono font-bold text-muted-foreground uppercase">
                  Core Engine
                </span>
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-foreground">
                  1. Smart Daily Adaptive Planner & Backlog Triage
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Instead of staring at an overwhelming 15-chapter list, BacklogOS calculates your exam runway, respects foundational prerequisites (Vectors before Rotational Motion), and schedules bite-sized 45–60 minute concept and numerical blocks.
                </p>
              </div>

              {/* Real Student Example Box */}
              <div className="rounded-lg border border-border bg-muted/40 p-3.5 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-mono text-[11px] font-bold text-sky-600 dark:text-sky-400">
                  <span>📌 Real Student Case:</span>
                  <span className="text-foreground">Aarav (Class 11 PCM, 42h Backlog)</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  <strong>The Trap:</strong> Aarav had 9 chapters pending and felt paralyzed, switching randomly between YouTube videos without finishing anything.
                </p>
                <p className="text-foreground leading-relaxed font-medium">
                  <strong>BacklogOS Action:</strong> Scheduled two focused blocks today: 60 mins of <em>Kinematics 1D</em> (foundations) + 40 mins of <em>Chemical Bonding</em> (high-yield). In 14 days, Aarav completed 6 full chapters with steady daily momentum.
                </p>
              </div>
            </div>

            {/* Feature 2: Zero-Guilt Rebalancer */}
            <div className="card-interactive rounded-xl border border-border bg-card p-6 space-y-4 hover:border-emerald-400/40 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-500">
                  <RotateCcw size={20} />
                </div>
                <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-mono font-bold text-muted-foreground uppercase">
                  Adaptive
                </span>
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-foreground">
                  2. Zero-Guilt Rebalancer (Dynamic Catch-Up)
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  When school pre-boards, illness, or fatigue interrupt your week, ordinary timetables collapse. BacklogOS recalculates your remaining hours and redistributes missed tasks across future buffer days without forcing 14-hour cram days.
                </p>
              </div>

              {/* Real Student Example Box */}
              <div className="rounded-lg border border-border bg-muted/40 p-3.5 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <span>📌 Real Student Case:</span>
                  <span className="text-foreground">Sneha (Class 12 PCB, Missed 3 Days)</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  <strong>The Trap:</strong> Sneha had high fever and missed 3 study days. Traditional timetables would demand an impossible 11 hours on day 4.
                </p>
                <p className="text-foreground leading-relaxed font-medium">
                  <strong>BacklogOS Action:</strong> One click on "Rebalance" smoothed her missed 8 hours across 16 upcoming days by adding just 30 minutes per session. Her syllabus finish date was protected with zero guilt.
                </p>
              </div>
            </div>

            {/* Feature 3: Multimodal AI Doubt Solver */}
            <div className="card-interactive rounded-xl border border-border bg-card p-6 space-y-4 hover:border-sky-400/40 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-500">
                  <Camera size={20} />
                </div>
                <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-mono font-bold text-muted-foreground uppercase">
                  Bax Vision AI
                </span>
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-foreground">
                  3. Multimodal AI Photo Doubt & Numerical Solver
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Snap a photo of any textbook problem, coaching DPP, or handwritten assignment. Bax Vision transcribes the diagram and formulas, then generates a complete 5-layer CBSE marking scheme breakdown with examiner trap warnings.
                </p>
              </div>

              {/* Real Student Example Box */}
              <div className="rounded-lg border border-border bg-muted/40 p-3.5 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                  <span>📌 Real Student Case:</span>
                  <span className="text-foreground">Kabir (Stuck on Laws of Motion at 11 PM)</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  <strong>The Trap:</strong> Kabir couldn't figure out why his acceleration answer for a 2-block pulley system on a friction incline was wrong.
                </p>
                <p className="text-foreground leading-relaxed font-medium">
                  <strong>BacklogOS Action:</strong> He uploaded a quick camera photo. Bax Vision drew the force equilibrium, solved step-by-step, and highlighted Kabir's sign convention mistake with normal reaction $N = mg \cos\theta$.
                </p>
              </div>
            </div>

            {/* Feature 4: Bax AI Mentor & Mental Health Support */}
            <div className="card-interactive rounded-xl border border-border bg-card p-6 space-y-4 hover:border-rose-400/40 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500">
                  <HeartHandshake size={20} />
                </div>
                <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-mono font-bold text-muted-foreground uppercase">
                  Mentor & Panic Reset
                </span>
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-foreground">
                  4. Deep Academic & Mental Health Mentor (Bax AI)
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Trained on CBSE examiner marking schemes and real experiences from r/CBSE and r/JEENEETards. Explains deep conceptual physics/chemistry intuition (e.g. <em>What is Inertia?</em>), curates verified YouTube playlists, and provides grounding when exam panic strikes.
                </p>
              </div>

              {/* Real Student Example Box */}
              <div className="rounded-lg border border-border bg-muted/40 p-3.5 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-mono text-[11px] font-bold text-rose-600 dark:text-rose-400">
                  <span>📌 Real Student Case:</span>
                  <span className="text-foreground">Diya (Panic 3 Weeks Before Board Pre-Boards)</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  <strong>The Trap:</strong> Diya felt paralyzed by guilt, believing she had ruined her entire academic year and could never pass Physics.
                </p>
                <p className="text-foreground leading-relaxed font-medium">
                  <strong>BacklogOS Action:</strong> Bax delivered a compassionate reality check: "Backlog is not a moral failure; it is a scheduling error." Bax triaged her syllabus into 4 must-win chapters, restoring calm and focus in 10 minutes.
                </p>
              </div>
            </div>

            {/* Feature 5: Focus Room & Calendar Sync */}
            <div className="card-interactive rounded-xl border border-border bg-card p-6 space-y-4 hover:border-amber-400/40 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-500">
                  <Calendar size={20} />
                </div>
                <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-mono font-bold text-muted-foreground uppercase">
                  1-Click Sync
                </span>
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-foreground">
                  5. Focus Room & 1-Click Calendar Sync
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Full-screen Pomodoro study zone with ambient lofi rain, binaural study acoustics, and 1-click sync to your Google Calendar or phone (.ics). Receive native mobile reminder alerts so you never skip a planned study block.
                </p>
              </div>

              {/* Real Student Example Box */}
              <div className="rounded-lg border border-border bg-muted/40 p-3.5 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-mono text-[11px] font-bold text-amber-600 dark:text-amber-400">
                  <span>📌 Real Student Case:</span>
                  <span className="text-foreground">Rohan (Phone Distraction & Forgetting Study Slots)</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  <strong>The Trap:</strong> Rohan kept forgetting to sit down for study at 5 PM, getting sucked into reels and gaming.
                </p>
                <p className="text-foreground leading-relaxed font-medium">
                  <strong>BacklogOS Action:</strong> Synced his daily plan to Google Calendar with 10-minute alerts. In Focus Room, rain acoustics and full-screen timer kept him locked in for 50 uninterrupted minutes.
                </p>
              </div>
            </div>

            {/* Feature 6: Spaced Recall & Formula Drills */}
            <div className="card-interactive rounded-xl border border-border bg-card p-6 space-y-4 hover:border-purple-400/40 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-500">
                  <Layers size={20} />
                </div>
                <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-mono font-bold text-muted-foreground uppercase">
                  Retention Engine
                </span>
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-foreground">
                  6. Spaced Retrieval Flashcards & Speed Formula Drills
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Passive reading gives the illusion of learning. BacklogOS integrates active recall flashcards on Hermann Ebbinghaus's forgetting curve (Day 1, 3, 7, 21) plus timed speed drills to build reflex-fast equation recall under exam pressure.
                </p>
              </div>

              {/* Real Student Example Box */}
              <div className="rounded-lg border border-border bg-muted/40 p-3.5 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-mono text-[11px] font-bold text-purple-600 dark:text-purple-400">
                  <span>📌 Real Student Case:</span>
                  <span className="text-foreground">Ananya (Forgetting Formulas After 1 Week)</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  <strong>The Trap:</strong> Ananya cleared <em>Equilibrium</em> in October, but by December she couldn't remember the $K_p$ and buffer equations during tests.
                </p>
                <p className="text-foreground leading-relaxed font-medium">
                  <strong>BacklogOS Action:</strong> Automated spaced retrieval cards tested her right before the forgetting curve decayed. She retained all formulas with 95% accuracy on test day.
                </p>
              </div>
            </div>
          </div>

          {/* Quick CTA inside feature breakdown */}
          <div className="rounded-xl border border-sky-400/30 bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-sky-500/5 p-6 text-center space-y-3">
            <h3 className="text-base sm:text-lg font-bold text-foreground">
              Ready to turn your backlog into a calm, finished plan?
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto">
              Takes less than 2 minutes to select your chapters and generate your personal recovery schedule. 100% free for students.
            </p>
            <div className="pt-1">
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-white px-5 py-2.5 text-xs sm:text-sm font-semibold shadow-md transition active:scale-95 cursor-pointer"
              >
                <span>Create Your Backlog Plan Now</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4. LINEAR-STYLE INTERACTIVE ANIMATED FEATURE SCREENSHOTS */}
      <LinearFeatureInteractiveScreenshots />

      {/* 5. HUMAN REALITY: TRADITIONAL FRUSTRATIONS VS THE BACKLOGOS STANDARD */}
      <section className="border-b border-border/80 bg-background py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-widest text-primary font-bold">
              Built by Students, for Students
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
              Why traditional study schedules always collapse.
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Most students don't fail because of lack of discipline. They fail because paper timetables treat human teenagers like machines that never get tired, sick, or overwhelmed.
            </p>
          </div>

          <div className="border border-border rounded-xl overflow-hidden text-xs card-interactive shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
              {/* Left Column: Fragmented */}
              <div className="p-6 sm:p-8 bg-muted/20 space-y-5">
                <div className="font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider font-mono text-[11px] flex items-center gap-2">
                  <span>✕ The Unrealistic Routine</span>
                </div>
                <ul className="space-y-3.5 text-muted-foreground text-xs leading-relaxed">
                  <li className="flex items-start gap-2.5">
                    <span className="text-rose-500 font-bold shrink-0 mt-0.5">✕</span>
                    <span>Buying a fresh notebook to draw a "New Timetable" that gets completely abandoned by Day 4.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-rose-500 font-bold shrink-0 mt-0.5">✕</span>
                    <span>Binge-watching 10-hour marathon YouTube one-shots at 2x speed, then being unable to solve a single NCERT intext problem.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-rose-500 font-bold shrink-0 mt-0.5">✕</span>
                    <span>Falling behind 2 chapters and feeling such intense guilt that you procrastinate even longer on your phone.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-rose-500 font-bold shrink-0 mt-0.5">✕</span>
                    <span>Waking up on Sunday afternoon with the sinking realization that another entire study weekend has vanished.</span>
                  </li>
                </ul>
              </div>

              {/* Right Column: BacklogOS */}
              <div className="p-6 sm:p-8 bg-card space-y-5">
                <div className="font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-mono text-[11px] flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse-subtle" />
                  <span>✓ The BacklogOS Reality</span>
                </div>
                <ul className="space-y-3.5 text-foreground text-xs leading-relaxed">
                  <li className="flex items-start gap-2.5">
                    <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>Honest 3.5-hour daily blocks</strong> that actually fit between your school hours and coaching tuitions.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>1-Click Zero-Guilt Rebalancer</strong> that absorbs missed days across upcoming buffer slots without demanding 14-hour cram sessions.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>Vetted high-yield lectures & notes</strong> pinned directly to the exact task so you never wander into the YouTube algorithm trap.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>Deterministic finish-date countdown</strong> that proves mathematically you can finish your syllabus before board exams.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. AUTHENTIC STUDENT PERSPECTIVE / FOUNDER MESSAGE */}
      <section className="border-b border-border/80 bg-muted/20 py-14 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center space-y-5">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-[11px] font-mono text-muted-foreground shadow-2xs">
            <span>📝 An Honest Note to Every Struggling Student</span>
          </div>

          <blockquote className="text-base sm:text-lg font-medium text-foreground leading-relaxed italic max-w-2xl mx-auto">
            "I spent months in Class 11 believing I was fundamentally stupid because my timetable broke every single Tuesday. The truth is: coaching and schools dump 12 chapters at once with zero coordination. When you fall behind, fear freezes you. BacklogOS exists so no student has to sit in their room at 2 AM crying over an unfinished textbook chapter thinking their future is over. You can finish this syllabus. Take it one 50-minute block at a time."
          </blockquote>

          <div className="pt-2 flex flex-col items-center gap-0.5 text-xs font-mono">
            <span className="font-bold text-foreground">Ronik & Peer Contributors</span>
            <span className="text-muted-foreground text-[11px]">
              Class 11 & 12 Syllabus Survivors · CBSE 2026–27
            </span>
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
              className="group relative overflow-hidden w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-[5px] bg-sky-500 hover:bg-sky-400 text-white px-6 py-2.5 text-sm font-medium transition shadow-sm hover:shadow-md border border-sky-400/40 active:scale-95"
            >
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-button-shimmer" />
              <div className="flex h-4 w-4 items-center justify-center rounded-[2px] bg-white/20 text-white font-mono text-[9px] font-bold group-hover:scale-110 transition-transform">
                B
              </div>
              <span className="font-semibold tracking-tight">Create your backlog plan now</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform duration-200" />
            </Link>

            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-[5px] border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition active:scale-[0.98]"
            >
              <BookOpenCheck size={14} className="text-muted-foreground" />
              <span>Open Student Workspace</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
