import { useState, useEffect } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ListTodo,
  GitFork,
  RotateCcw,
  BookOpen,
  Layers,
  Clock3,
  Award,
  ArrowRight,
  Check,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'wouter';

interface FeaturePage {
  id: string;
  tabLabel: string;
  badge: string;
  title: string;
  subtitle: string;
  icon: typeof ListTodo;
  content: React.ReactNode;
}

const FEATURE_PAGES: FeaturePage[] = [
  {
    id: 'planner',
    tabLabel: '1. Adaptive Daily Plan',
    badge: 'Core Engine',
    title: 'Adaptive Daily Recovery Plan',
    subtitle: 'Wake up knowing exactly what to study, for how long, and with what resource.',
    icon: ListTodo,
    content: (
      <div className="space-y-4 text-xs sm:text-sm leading-relaxed text-foreground/90 font-sans">
        <p>
          Traditional timetables fail because they assume every day is identical. BacklogOS constructs a dynamic daily schedule based on your <strong className="text-foreground">actual available hours</strong> (from 2h to 6h per day).
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1">
            <span className="font-mono text-[10px] uppercase text-muted-foreground block font-bold">1. Concept Chunk</span>
            <span className="text-foreground font-semibold text-xs block">60 min Focus</span>
            <span className="text-muted-foreground text-[11px] block">High-yield theory lecture and core formula derivations.</span>
          </div>

          <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1">
            <span className="font-mono text-[10px] uppercase text-muted-foreground block font-bold">2. Practice Chunk</span>
            <span className="text-foreground font-semibold text-xs block">45 min Solving</span>
            <span className="text-muted-foreground text-[11px] block">NCERT exemplar and previous 10-year board questions.</span>
          </div>

          <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1">
            <span className="font-mono text-[10px] uppercase text-muted-foreground block font-bold">3. Active Recall</span>
            <span className="text-foreground font-semibold text-xs block">20 min Revision</span>
            <span className="text-muted-foreground text-[11px] block">Spaced repetition flashcards to lock formulas into long-term memory.</span>
          </div>
        </div>

        <div className="rounded-md border border-border bg-muted/20 p-3.5 space-y-1.5">
          <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
            <Check size={14} className="text-emerald-500" />
            <span>Never get stuck searching for study material</span>
          </div>
          <p className="text-muted-foreground text-xs">
            Every scheduled task links directly to vetted, high-yield one-shot lectures from top educators with exact durations, eliminating the YouTube distraction trap.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'prerequisites',
    tabLabel: '2. Prerequisite Sequences',
    badge: 'Foundation First',
    title: 'Prerequisite-Aware Sequence',
    subtitle: 'Master fundamental roots before tackling complex branches.',
    icon: GitFork,
    content: (
      <div className="space-y-4 text-xs sm:text-sm leading-relaxed text-foreground/90 font-sans">
        <p>
          Students often get stuck in backlog because they attempt difficult chapters without mastering their prerequisite foundations. BacklogOS uses a <strong className="text-foreground">deterministic dependency graph</strong> to prevent this frustration.
        </p>

        <div className="rounded-md border border-border bg-muted/20 p-3.5 space-y-2 text-xs">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground block font-bold">Dependency Chain Examples</span>
          <div className="space-y-2 font-mono text-[11px]">
            <div className="p-2 rounded border border-border bg-background flex items-center justify-between">
              <span>Basic Calculus & Vectors</span>
              <span className="text-muted-foreground">→ unlocks →</span>
              <span className="font-semibold text-foreground">Kinematics & Laws of Motion</span>
            </div>
            <div className="p-2 rounded border border-border bg-background flex items-center justify-between">
              <span>Mole Concept & Chemical Bonding</span>
              <span className="text-muted-foreground">→ unlocks →</span>
              <span className="font-semibold text-foreground">Electrochemistry & Coordination Compounds</span>
            </div>
            <div className="p-2 rounded border border-border bg-background flex items-center justify-between">
              <span>Functions & Limits</span>
              <span className="text-muted-foreground">→ unlocks →</span>
              <span className="font-semibold text-foreground">Integrals & Differential Equations</span>
            </div>
          </div>
        </div>

        <p className="text-muted-foreground text-xs">
          By solving foundations in logical order, your comprehension speed increases dramatically and you avoid hitting frustrating mental dead ends.
        </p>
      </div>
    ),
  },
  {
    id: 'recovery',
    tabLabel: '3. Missed-Day Rebalancer',
    badge: 'Zero Burnout',
    title: 'Guilt-Free Missed Day Recovery',
    subtitle: 'One sick day or practical exam will never derail your preparation again.',
    icon: RotateCcw,
    content: (
      <div className="space-y-4 text-xs sm:text-sm leading-relaxed text-foreground/90 font-sans">
        <p>
          The number one cause of abandoned study plans is guilt. You miss Tuesday due to fever or unexpected school homework, wake up on Wednesday facing an impossible 14-hour pileup, and quit altogether.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-3.5 space-y-1.5">
            <span className="font-mono text-[10px] uppercase text-rose-600 dark:text-rose-400 font-bold block">Traditional Static Timetables</span>
            <p className="text-xs text-muted-foreground">
              Uncompleted tasks stack up blindly. By Friday, you owe 20 hours. You burn out, give up, and stay behind.
            </p>
          </div>

          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3.5 space-y-1.5">
            <span className="font-mono text-[10px] uppercase text-emerald-600 dark:text-emerald-400 font-bold block">The BacklogOS Recovery Engine</span>
            <p className="text-xs text-muted-foreground">
              Click "Missed Day" and BacklogOS automatically disperses missed minutes across your future buffer days (+15 mins per session). No panic, no cramming.
            </p>
          </div>
        </div>

        <div className="rounded-md border border-border bg-muted/20 p-3 text-xs flex items-center justify-between">
          <span className="text-foreground font-medium">Automatic buffer day recalculation</span>
          <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">100% Syllabus Covered</span>
        </div>
      </div>
    ),
  },
  {
    id: 'resources',
    tabLabel: '4. Curated Lectures & PYQs',
    badge: 'Zero Search Rabbitholes',
    title: 'Vetted In-Task Video Lectures',
    subtitle: 'High-yield one-shots and chapter breakdowns without leaving your task.',
    icon: BookOpen,
    content: (
      <div className="space-y-4 text-xs sm:text-sm leading-relaxed text-foreground/90 font-sans">
        <p>
          Most students waste 30 to 45 minutes searching for lecture videos, only to fall into algorithmic rabbit holes. BacklogOS integrates <strong className="text-foreground">curated, chapter-specific educational resources</strong> right inside each daily slot.
        </p>

        <div className="space-y-2 pt-1">
          <div className="rounded border border-border bg-card p-3 flex items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5 min-w-0">
              <span className="font-semibold text-foreground truncate block">Physics Galaxy: Rotational Motion One-Shot</span>
              <span className="text-muted-foreground text-[11px] font-mono">Ashish Arora Sir · 1h 12m · Comprehensive Derivations</span>
            </div>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-border bg-muted/40 text-muted-foreground shrink-0">
              Verified High-Yield
            </span>
          </div>

          <div className="rounded border border-border bg-card p-3 flex items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5 min-w-0">
              <span className="font-semibold text-foreground truncate block">Canvas Classes: Solutions & Colligative NCERT Decoded</span>
              <span className="text-muted-foreground text-[11px] font-mono">Paaras Sir · 54m · Direct Board PYQs</span>
            </div>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-border bg-muted/40 text-muted-foreground shrink-0">
              NCERT Line-by-Line
            </span>
          </div>
        </div>

        <p className="text-muted-foreground text-xs">
          Each resource displays verified duration so you can immediately see if it fits within your available time block.
        </p>
      </div>
    ),
  },
  {
    id: 'flashcards',
    tabLabel: '5. Spaced Recall Flashcards',
    badge: 'Permanent Retention',
    title: 'Active Recall & Formula Decks',
    subtitle: 'Stop cleared chapters from quietly slipping out of your memory.',
    icon: Layers,
    content: (
      <div className="space-y-4 text-xs sm:text-sm leading-relaxed text-foreground/90 font-sans">
        <p>
          Clearing a backlog chapter is only half the battle. Without structured spaced repetition, 70% of what you learned evaporates within two weeks due to the forgetting curve.
        </p>

        <div className="rounded-md border border-border bg-muted/30 p-4 text-center space-y-3">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block font-bold">
            Spaced Repetition Schedule
          </span>
          <div className="flex items-center justify-around text-xs font-mono">
            <div className="p-2 rounded border border-border bg-background">
              <span className="block text-muted-foreground text-[10px]">Session 1</span>
              <span className="font-bold text-foreground">Day 1</span>
            </div>
            <span className="text-muted-foreground">→</span>
            <div className="p-2 rounded border border-border bg-background">
              <span className="block text-muted-foreground text-[10px]">Review 1</span>
              <span className="font-bold text-foreground">Day 3</span>
            </div>
            <span className="text-muted-foreground">→</span>
            <div className="p-2 rounded border border-border bg-background">
              <span className="block text-muted-foreground text-[10px]">Review 2</span>
              <span className="font-bold text-foreground">Day 7</span>
            </div>
            <span className="text-muted-foreground">→</span>
            <div className="p-2 rounded border border-border bg-background">
              <span className="block text-muted-foreground text-[10px]">Mastery</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">Day 14</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Built-in flashcard decks cover Physics derivations, Organic reaction mechanisms, and Math identities with simple 10-minute active recall drills.
        </p>
      </div>
    ),
  },
  {
    id: 'focusroom',
    tabLabel: '6. Focus Room & Timer',
    badge: 'Deep Work',
    title: 'Distraction-Free Focus Room',
    subtitle: 'A single environment for timing, ambient sound, and syllabus notes.',
    icon: Clock3,
    content: (
      <div className="space-y-4 text-xs sm:text-sm leading-relaxed text-foreground/90 font-sans">
        <p>
          Switching between a timer app, a notepad, and Spotify creates micro-distractions. BacklogOS includes a built-in <strong className="text-foreground">Focus Room</strong> tied directly to your active task.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          <div className="rounded border border-border bg-card p-3 space-y-1">
            <span className="font-mono text-[10px] uppercase text-muted-foreground block font-bold">Targeted Timer</span>
            <p className="text-xs text-foreground font-medium">Automatic countdown synced to your allocated block length.</p>
          </div>

          <div className="rounded border border-border bg-card p-3 space-y-1">
            <span className="font-mono text-[10px] uppercase text-muted-foreground block font-bold">Ambient Audio</span>
            <p className="text-xs text-foreground font-medium">Calming soundscapes (Soft Rain, Library Silence, White Noise).</p>
          </div>

          <div className="rounded border border-border bg-card p-3 space-y-1">
            <span className="font-mono text-[10px] uppercase text-muted-foreground block font-bold">Quick Notes</span>
            <p className="text-xs text-foreground font-medium">Capture tricky formulas and doubts without leaving the screen.</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Completed sessions automatically log into your study heatmap and velocity analytics.
        </p>
      </div>
    ),
  },
  {
    id: 'runway',
    tabLabel: '7. Runway & Velocity Math',
    badge: 'Deterministic Math',
    title: 'Mathematical Exam Runway',
    subtitle: 'Know with complete certainty if you will finish before Board exams.',
    icon: Award,
    content: (
      <div className="space-y-4 text-xs sm:text-sm leading-relaxed text-foreground/90 font-sans">
        <p>
          Vague hopes like "I'll try my best" lead to constant anxiety. BacklogOS turns exam preparation into <strong className="text-foreground">deterministic mathematics</strong>.
        </p>

        <div className="rounded-md border border-border bg-muted/20 p-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div>
              <span className="text-muted-foreground text-[10px] block uppercase">Remaining Debt</span>
              <span className="text-foreground font-bold text-sm block">36 hours</span>
            </div>
            <div>
              <span className="text-muted-foreground text-[10px] block uppercase">Days to Exam</span>
              <span className="text-foreground font-bold text-sm block">120 days</span>
            </div>
            <div>
              <span className="text-muted-foreground text-[10px] block uppercase">Required Pace</span>
              <span className="text-foreground font-bold text-sm block">1.8 h / day</span>
            </div>
            <div>
              <span className="text-muted-foreground text-[10px] block uppercase">Current Buffer</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm block">+14 days</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          You will always know whether your current study pace is on track, in danger, or ahead of schedule, giving you total peace of mind.
        </p>
      </div>
    ),
  },
];

interface ExploreFeaturesDeckProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExploreFeaturesDeck({ isOpen, onClose }: ExploreFeaturesDeckProps) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  const currentPage = FEATURE_PAGES[currentPageIndex];
  const IconComponent = currentPage.icon;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && currentPageIndex < FEATURE_PAGES.length - 1) {
        setCurrentPageIndex((prev) => prev + 1);
      }
      if (e.key === 'ArrowLeft' && currentPageIndex > 0) {
        setCurrentPageIndex((prev) => prev - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentPageIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-xl border border-border bg-card shadow-2xl overflow-hidden font-sans text-foreground"
        role="dialog"
        aria-modal="true"
      >
        {/* Top Notion Window Header */}
        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-border" />
              <span className="h-2.5 w-2.5 rounded-full bg-border" />
              <span className="h-2.5 w-2.5 rounded-full bg-border" />
            </div>
            <div className="h-3 w-px bg-border mx-1" />
            <span className="text-xs font-mono text-muted-foreground">
              Explore BacklogOS · Feature Architecture
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-muted-foreground hidden sm:inline">
              Slide {currentPageIndex + 1} of {FEATURE_PAGES.length}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition"
              aria-label="Close feature deck"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Body: Left Tab Sidebar + Right Content */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Navigation Sidebar */}
          <aside className="w-full md:w-56 border-b md:border-b-0 md:border-r border-border bg-muted/20 p-2 md:p-3 overflow-x-auto md:overflow-y-auto shrink-0 flex md:flex-col gap-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground px-2 py-1 hidden md:block">
              Features
            </div>

            {FEATURE_PAGES.map((page, idx) => {
              const TabIcon = page.icon;
              const isActive = idx === currentPageIndex;
              return (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => setCurrentPageIndex(idx)}
                  className={`flex items-center gap-2 rounded-[5px] px-2.5 py-1.5 text-xs font-medium transition text-left shrink-0 md:shrink ${
                    isActive
                      ? 'bg-foreground text-background font-semibold shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  }`}
                >
                  <TabIcon size={13} className={isActive ? 'text-background' : 'text-muted-foreground'} />
                  <span className="truncate">{page.tabLabel}</span>
                </button>
              );
            })}
          </aside>

          {/* Right Slide Content Area */}
          <main className="flex-1 p-5 sm:p-7 overflow-y-auto space-y-5">
            {/* Header info */}
            <div className="space-y-1.5 border-b border-border/70 pb-4">
              <div className="inline-flex items-center gap-1.5 rounded border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                <IconComponent size={11} className="text-foreground" />
                <span>{currentPage.badge}</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-sans">
                {currentPage.title}
              </h2>

              <p className="text-xs sm:text-sm text-muted-foreground">
                {currentPage.subtitle}
              </p>
            </div>

            {/* Slide Body */}
            <div>{currentPage.content}</div>
          </main>
        </div>

        {/* Modal Bottom Navigation Bar */}
        <div className="border-t border-border bg-muted/30 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Controls: Prev / Next */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPageIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentPageIndex === 0}
              className="flex items-center gap-1 rounded-[5px] border border-border bg-card px-2.5 py-1 font-medium text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none transition"
            >
              <ChevronLeft size={14} />
              <span>Previous</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentPageIndex((prev) => Math.min(FEATURE_PAGES.length - 1, prev + 1))}
              disabled={currentPageIndex === FEATURE_PAGES.length - 1}
              className="flex items-center gap-1 rounded-[5px] border border-border bg-card px-2.5 py-1 font-medium text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none transition"
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>

            <div className="hidden sm:flex items-center gap-1.5 ml-2">
              {FEATURE_PAGES.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentPageIndex(idx)}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === currentPageIndex ? 'w-5 bg-foreground' : 'w-1.5 bg-border hover:bg-muted-foreground'
                  }`}
                  aria-label={`Jump to slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Primary CTA */}
          <div className="flex items-center gap-2">
            <Link
              href="/onboarding"
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-[5px] bg-sky-500 hover:bg-sky-400 text-white px-3.5 py-1.5 text-xs font-medium transition shadow-2xs border border-sky-400/40"
            >
              <div className="flex h-3.5 w-3.5 items-center justify-center rounded-[2px] bg-white/20 text-white font-mono text-[8px] font-bold">
                B
              </div>
              <span>Create your backlog plan now</span>
              <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
