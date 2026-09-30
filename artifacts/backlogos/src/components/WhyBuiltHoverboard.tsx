import { useState, useEffect } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  GraduationCap,
  Flame,
  Compass,
  Code2,
  Lightbulb,
  Rocket,
  CheckCircle2,
} from 'lucide-react';
import studentRocketImg from '@/assets/images/student_on_rocket.jpg';
import studentStickersImg from '@/assets/images/student_stickers.jpg';

interface HoverboardPage {
  id: string;
  tabLabel: string;
  badge: string;
  title: string;
  subtitle?: string;
  icon: typeof BookOpen;
  content: React.ReactNode;
}

const PAGES: HoverboardPage[] = [
  {
    id: 'intro',
    tabLabel: '1. Why I Built It',
    badge: 'Founder Note',
    title: 'Why I Built BacklogOS',
    subtitle: 'Built by a student who needed it himself.',
    icon: GraduationCap,
    content: (
      <div className="space-y-4 text-sm leading-relaxed text-foreground/90">
        <div className="flex items-center gap-3 rounded-md border border-border bg-muted/30 p-3.5">
          <div className="h-10 w-10 shrink-0 rounded overflow-hidden border border-border bg-muted">
            <img src={studentRocketImg} alt="Student on rocket" className="h-full w-full object-cover" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">Ronik</h4>
            <p className="text-xs text-muted-foreground font-mono">Class 11 Student & Founder of BacklogOS</p>
          </div>
        </div>

        <p>
          I'm <strong className="text-foreground font-semibold">Ronik</strong>, a Class 11 PCM student and the creator of BacklogOS.
        </p>

        <p>
          BacklogOS started with a problem I was personally struggling with every single week: <span className="text-foreground font-semibold underline underline-offset-4 decoration-border">falling behind</span>.
        </p>

        <p>
          When chapters start piling up, studying becomes much harder than just telling yourself to "study harder." You have unfinished chapters scattered across Physics, Chemistry, and Math, half-watched lecture playlists, stacks of coaching modules, upcoming school tests, missed study days — and <strong className="text-foreground font-semibold">no clear idea of what you should actually do next</strong>.
        </p>

        <p className="italic text-muted-foreground">
          I experienced that crushing mental fatigue firsthand.
        </p>

        <div className="rounded-md border border-border bg-muted/20 p-3.5 text-xs sm:text-sm leading-relaxed space-y-1">
          <p className="font-mono font-bold uppercase text-[10px] text-muted-foreground">The Realization</p>
          <p className="text-foreground">
            Most traditional planners are built on one flawed assumption: <strong className="text-foreground">you are already organized.</strong>
          </p>
          <p className="text-muted-foreground">
            BacklogOS is built for the student who is already drowning in backlogs and needs a realistic recovery route.
          </p>
        </div>

        <p className="font-semibold text-foreground">
          That is why I started building BacklogOS.
        </p>
      </div>
    ),
  },
  {
    id: 'problem',
    tabLabel: '2. The Problem',
    badge: 'The Reality',
    title: 'The Problem',
    subtitle: 'A backlog is not static — it is a moving target.',
    icon: Flame,
    content: (
      <div className="space-y-4 text-sm leading-relaxed text-foreground/90">
        <p>
          A backlog isn't just a static list of chapters you forgot to read. It is an unpredictable, constantly changing problem.
        </p>

        <p>
          You might ambitiously plan to finish three heavy chapters this week, fall sick or get swamped by school lab practicals for two days, fall even further behind, and suddenly <span className="font-semibold text-foreground">your original timetable collapses completely</span>.
        </p>

        <div className="grid gap-2.5 sm:grid-cols-2 pt-2">
          {[
            { q: 'What do I actually need to study?', desc: 'Separating high-yield core concepts from endless extra theory.' },
            { q: 'What should I study first?', desc: 'Prerequisite logic: Vectors before Kinematics; Mole Concept before Equilibrium.' },
            { q: 'How much progress have I made?', desc: 'Real metrics based on PYQs solved rather than passive desk time.' },
            { q: 'What if I fall behind again?', desc: 'Guilt-free automatic reallocation that doesn’t destroy your weekly streak.' },
          ].map((item, idx) => (
            <div key={idx} className="rounded-md border border-border bg-muted/15 p-3 space-y-1">
              <span className="text-xs font-mono font-bold text-foreground block">
                {item.q}
              </span>
              <p className="text-xs text-muted-foreground leading-normal">{item.desc}</p>
            </div>
          ))}
        </div>

        <p className="text-xs sm:text-sm text-muted-foreground pt-1">
          Students don't need another generic to-do list. They need a resilient, intelligent recovery engine.
        </p>
      </div>
    ),
  },
  {
    id: 'building',
    tabLabel: '3. The Architecture',
    badge: 'The System',
    title: 'What I\'m Building',
    subtitle: 'Turning overwhelming chaos into a realistic 7-day roadmap.',
    icon: Compass,
    content: (
      <div className="space-y-4 text-sm leading-relaxed text-foreground/90">
        <p>
          BacklogOS is a student-first platform engineered to transform paralyzing academic backlogs into realistic, step-by-step momentum.
        </p>

        <div className="rounded-md border border-border bg-muted/30 p-3.5 text-center font-mono">
          <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-1">The Core Workflow</p>
          <p className="text-xs sm:text-sm font-semibold text-foreground">
            Map Backlog → Verify Prerequisites → Compute Daily Pacing → Track Deep Sprints → Adapt Automatically
          </p>
        </div>

        <p>
          Instead of expecting students to maintain a superhuman schedule, BacklogOS is intentionally built around the reality that <strong className="text-foreground">life happens:</strong>
        </p>

        <ul className="space-y-2 text-xs sm:text-sm font-mono">
          <li className="flex items-center gap-2 text-foreground">
            <span className="text-muted-foreground">•</span>
            <span>You miss a day because of school practicals or exhaustion.</span>
          </li>
          <li className="flex items-center gap-2 text-foreground">
            <span className="text-muted-foreground">•</span>
            <span>You get stuck on a difficult concept like Rotational Mechanics.</span>
          </li>
          <li className="flex items-center gap-2 text-foreground">
            <span className="text-muted-foreground">•</span>
            <span>An internal test gets rescheduled with 48 hours notice.</span>
          </li>
          <li className="flex items-center gap-2 text-foreground">
            <span className="text-muted-foreground">•</span>
            <span>Your subject priorities shift toward weak areas.</span>
          </li>
        </ul>

        <p className="font-semibold text-foreground">
          Your study tool must adapt with you, not judge or punish you.
        </p>
      </div>
    ),
  },
  {
    id: 'evolution',
    tabLabel: '4. Problem to Product',
    badge: 'Evolution',
    title: 'From Problem to Product',
    subtitle: 'From a messy notebook sketch to a full-stack web application.',
    icon: Code2,
    content: (
      <div className="space-y-4 text-sm leading-relaxed text-foreground/90">
        <p>
          BacklogOS didn't launch as a polished, finished product. It started as a raw idea born out of desperation late at night at my study desk.
        </p>

        <p>
          First came paper prototypes and crude spreadsheets. Then experimental code, broken features, complete UI redesigns, unexpected bugs, and hundreds of hours spent debugging edge cases.
        </p>

        <div className="rounded-md border border-border bg-muted/20 p-3.5 space-y-2 font-mono text-xs">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
            What went into building BacklogOS
          </span>
          <div className="flex flex-wrap gap-1.5">
            {['React & TypeScript', 'PostgreSQL & Cloud SQL', 'Firebase Authentication', 'Bax AI Assistant', 'Pomodoro Audio', 'Spaced Recall Algorithms', 'Adaptive Priority Scoring'].map((t) => (
              <span key={t} className="rounded border border-border bg-card px-2 py-0.5 text-[11px] text-foreground">
                {t}
              </span>
            ))}
          </div>
        </div>

        <p>
          I've been building and iterating on this product while simultaneously learning modern engineering — from frontend reactivity and database relational schemas to authentication security, UX psychology, and API integrations.
        </p>

        <p className="italic text-muted-foreground">
          Every single version has taught me something new, and it is still evolving every day.
        </p>
      </div>
    ),
  },
  {
    id: 'learnings',
    tabLabel: '5. What I\'m Learning',
    badge: 'Learnings',
    title: 'What I\'m Learning Along the Way',
    subtitle: 'Building a product is the best education a student could ask for.',
    icon: Lightbulb,
    content: (
      <div className="space-y-4 text-sm leading-relaxed text-foreground/90">
        <p>
          Building BacklogOS has turned into far more than just writing code for a website. It has been a real-world masterclass in problem-solving:
        </p>

        <div className="space-y-2 text-xs sm:text-sm font-mono">
          {[
            'Turning a genuine personal frustration into a functional product',
            'Designing coherent systems instead of disconnected features',
            'Building, profiling, and debugging full-stack web architectures',
            'Managing relational databases and cloud authentication securely',
            'Thinking through empathetic student user experience and cognitive load',
            'Iterating rapidly based on what actually works during real study sessions',
            'Using AI as an intellectual amplifier rather than blindly pasting generated code',
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2.5 rounded border border-border bg-muted/10 p-2.5">
              <CheckCircle2 size={15} className="text-foreground shrink-0 mt-0.5" />
              <span className="text-foreground leading-snug">{item}</span>
            </div>
          ))}
        </div>

        <p className="text-xs sm:text-sm text-foreground font-medium pt-1">
          Most importantly, I am learning what it truly takes to transform an abstract thought into something real that fellow students can use and rely on.
        </p>
      </div>
    ),
  },
  {
    id: 'vision',
    tabLabel: '6. The Future',
    badge: 'Roadmap & Mission',
    title: 'Where BacklogOS Is Going',
    subtitle: 'From a Class 11 lifesaver to a complete student recovery platform.',
    icon: Rocket,
    content: (
      <div className="space-y-5 text-sm leading-relaxed text-foreground/90">
        <p>
          BacklogOS is still in its early chapters, but the vision is clear: help students navigate the entire journey of getting back on track with adaptive daily calibration, active recall, formula diagnostics, and deep analytics.
        </p>

        <blockquote className="rounded-md border-l-2 border-foreground bg-muted/30 p-4 my-2 font-mono">
          <p className="text-sm font-semibold text-foreground">
            "You don't need a perfect study routine to start catching up. You only need a way to start."
          </p>
          <footer className="mt-1 text-[11px] text-muted-foreground">
            — The BacklogOS Core Principle
          </footer>
        </blockquote>

        <p className="text-muted-foreground">
          Thank you for checking out BacklogOS and joining me on this journey. If you're currently dealing with a heavy backlog, take a deep breath — one 45-minute sprint is all it takes to get moving again.
        </p>

        <div className="mt-5 border-t border-border pt-4 flex items-center justify-between">
          <div>
            <h4 className="font-display text-sm font-bold text-foreground">Ronik</h4>
            <p className="text-xs text-muted-foreground font-mono">Founder & Builder, BacklogOS</p>
            <p className="text-[11px] text-muted-foreground">Class 11 PCM Student</p>
          </div>
          <div className="h-12 w-12 rounded overflow-hidden border border-border bg-muted">
            <img src={studentStickersImg} alt="Student badges" className="h-full w-full object-cover" />
          </div>
        </div>
      </div>
    ),
  },
];

interface WhyBuiltHoverboardProps {
  isOpen: boolean;
  onClose: () => void;
  initialPageIndex?: number;
}

export function WhyBuiltHoverboard({ isOpen, onClose, initialPageIndex = 0 }: WhyBuiltHoverboardProps) {
  const [currentPage, setCurrentPage] = useState(initialPageIndex);

  useEffect(() => {
    if (isOpen) {
      setCurrentPage(initialPageIndex);
    }
  }, [isOpen, initialPageIndex]);

  // Keyboard navigation & lock scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' && currentPage < PAGES.length - 1) {
        setCurrentPage((prev) => prev + 1);
      } else if (e.key === 'ArrowLeft' && currentPage > 0) {
        setCurrentPage((prev) => prev - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, currentPage, onClose]);

  if (!isOpen) return null;

  const activePage = PAGES[currentPage];
  const PageIcon = activePage.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-background/80 backdrop-blur-xs animate-in fade-in duration-150">
      {/* Click outside backdrop */}
      <div className="absolute inset-0" onClick={onClose} aria-label="Close story" />

      {/* Modal Container */}
      <div className="relative w-full max-w-2xl rounded-lg border border-border bg-card shadow-xl flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden z-10 animate-in zoom-in-95 duration-150 text-foreground">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5 bg-card">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded border border-border bg-muted/40 text-foreground">
              <BookOpen size={14} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-sm font-bold text-foreground">Why BacklogOS Was Built</span>
                <span className="rounded border border-border bg-muted/40 px-1.5 py-0.2 text-[10px] font-mono text-muted-foreground">
                  Founder Story
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground font-mono">By Ronik · Class 11 Student</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block text-[10px] font-mono text-muted-foreground">
              Keys: <kbd className="rounded border border-border bg-muted px-1 text-[10px]">←</kbd> <kbd className="rounded border border-border bg-muted px-1 text-[10px]">→</kbd>
            </span>
            <button
              type="button"
              onClick={onClose}
              className="focus-ring rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-border bg-muted/20 px-4 py-2 overflow-x-auto flex items-center gap-1 font-mono text-xs">
          {PAGES.map((page, idx) => {
            const isActive = idx === currentPage;
            return (
              <button
                key={page.id}
                type="button"
                onClick={() => setCurrentPage(idx)}
                className={`shrink-0 rounded px-2.5 py-1 transition ${
                  isActive
                    ? 'bg-foreground text-background font-bold shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                }`}
              >
                {page.tabLabel}
              </button>
            );
          })}
        </div>

        {/* Progress Bar */}
        <div className="h-0.5 w-full bg-muted">
          <div
            className="h-full bg-foreground transition-all duration-200"
            style={{ width: `${((currentPage + 1) / PAGES.length) * 100}%` }}
          />
        </div>

        {/* Active Page Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6 space-y-4">
          <div className="border-b border-border pb-3">
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
              <PageIcon size={12} />
              <span>{activePage.badge}</span>
              <span>·</span>
              <span>Page {currentPage + 1} of {PAGES.length}</span>
            </div>

            <h3 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              {activePage.title}
            </h3>

            {activePage.subtitle && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {activePage.subtitle}
              </p>
            )}
          </div>

          <div>{activePage.content}</div>
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between border-t border-border bg-card px-5 py-3 font-mono text-xs">
          <button
            type="button"
            disabled={currentPage === 0}
            onClick={() => setCurrentPage((p) => p - 1)}
            className={`inline-flex items-center gap-1 rounded border px-2.5 py-1 transition ${
              currentPage === 0
                ? 'opacity-30 border-border text-muted-foreground cursor-not-allowed'
                : 'border-border bg-card text-foreground hover:bg-muted'
            }`}
          >
            <ChevronLeft size={14} />
            <span>Prev</span>
          </button>

          <span className="text-[11px] text-muted-foreground">
            {currentPage + 1} / {PAGES.length}
          </span>

          {currentPage < PAGES.length - 1 ? (
            <button
              type="button"
              onClick={() => setCurrentPage((p) => p + 1)}
              className="inline-flex items-center gap-1 rounded bg-foreground text-background px-3 py-1 font-bold hover:bg-foreground/90 transition shadow-2xs"
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 rounded bg-foreground text-background px-3 py-1 font-bold hover:bg-foreground/90 transition shadow-2xs"
            >
              <span>Done</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
