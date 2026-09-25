import { useState, useEffect } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Sparkles,
  Flame,
  ArrowRight,
  GraduationCap,
  Lightbulb,
  CheckCircle2,
  Compass,
  Code2,
  Rocket,
  HeartHandshake
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
    badge: 'Founder Story',
    title: 'Why I Built BacklogOS',
    subtitle: 'Built by a student who needed it himself.',
    icon: GraduationCap,
    content: (
      <div className="space-y-4 text-sm sm:text-base leading-relaxed text-slate-300">
        <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-4">
          <div className="h-12 w-12 shrink-0 rounded-xl overflow-hidden border border-primary/40 bg-slate-900">
            <img src={studentRocketImg} alt="Student on rocket" className="h-full w-full object-cover" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Ronik</h4>
            <p className="text-xs text-primary font-mono font-medium">Class 11 Student & Founder of BacklogOS</p>
          </div>
        </div>

        <p>
          I'm <strong className="text-white">Ronik</strong>, a Class 11 PCM student and the creator of BacklogOS.
        </p>

        <p>
          BacklogOS started with a problem I was personally struggling with every single week:{' '}
          <span className="text-rose-400 font-bold underline decoration-rose-400/40 underline-offset-4">falling behind.</span>
        </p>

        <p>
          When chapters start piling up, studying becomes much harder than just telling yourself to "study harder."
          You have unfinished chapters scattered across Physics, Chemistry, and Math, half-watched lecture playlists,
          stacks of coaching modules, upcoming school tests, missed study days — and{' '}
          <strong className="text-white">no clear idea of what you should actually do next</strong>.
        </p>

        <p className="italic text-slate-400">
          I experienced that crushing mental fatigue firsthand.
        </p>

        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200 text-xs sm:text-sm leading-relaxed">
          <p className="font-semibold text-amber-300 mb-1">💡 The Realization</p>
          Most traditional planners are built on one flawed assumption:{' '}
          <strong className="text-white">you are already organized.</strong>
          <br className="my-1" />
          <span className="text-amber-100">
            But what about the student who is already drowning in backlogs?
          </span>
        </div>

        <p className="font-semibold text-white">
          That is why I decided to start building BacklogOS.
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
      <div className="space-y-4 text-sm sm:text-base leading-relaxed text-slate-300">
        <p>
          A backlog isn't just a static list of chapters you forgot to read.
        </p>

        <p className="font-medium text-white">
          It is an unpredictable, constantly changing problem.
        </p>

        <p>
          You might ambitiously plan to finish three heavy chapters this week, fall sick or get swamped by school lab practicals for two days, fall even further behind, and suddenly{' '}
          <span className="text-rose-400 font-semibold">your original timetable collapses completely.</span>
        </p>

        <div className="grid gap-2.5 sm:grid-cols-2 pt-2">
          {[
            { q: 'What do I actually need to study?', desc: 'Separating high-yield core concepts from endless extra theory.' },
            { q: 'What should I study first?', desc: 'Prerequisite logic: Vectors before Kinematics; Mole Concept before Equilibrium.' },
            { q: 'How much progress have I made?', desc: 'Real metrics based on PYQs solved rather than hours sat at a desk.' },
            { q: 'What if I fall behind again?', desc: 'Guilt-free automatic reallocation that doesn’t destroy your weekly streak.' },
          ].map((item, idx) => (
            <div key={idx} className="rounded-xl border border-slate-800 bg-slate-900/70 p-3.5 space-y-1">
              <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                {item.q}
              </span>
              <p className="text-[11px] text-slate-400 leading-normal">{item.desc}</p>
            </div>
          ))}
        </div>

        <p className="text-xs sm:text-sm text-slate-300 pt-1">
          Students don't need another generic to-do list. They need a resilient, intelligent recovery engine.
        </p>
      </div>
    ),
  },
  {
    id: 'building',
    tabLabel: '3. What I\'m Building',
    badge: 'The System',
    title: 'What I\'m Building',
    subtitle: 'Turning overwhelming chaos into a realistic 7-day roadmap.',
    icon: Compass,
    content: (
      <div className="space-y-4 text-sm sm:text-base leading-relaxed text-slate-300">
        <p>
          BacklogOS is a student-first platform engineered to transform paralyzing academic backlogs into realistic, step-by-step momentum.
        </p>

        <div className="rounded-2xl border border-primary/40 bg-gradient-to-r from-primary/15 via-slate-900 to-accent/15 p-4 text-center">
          <p className="text-xs uppercase font-mono font-bold tracking-widest text-primary mb-2">The Core Philosophy</p>
          <p className="font-display text-sm sm:text-base font-extrabold text-white">
            Take the Chaos → Map the Backlog → Create a Realistic Path → Track Daily Wins → Adapt When Life Happens
          </p>
        </div>

        <p>
          Instead of expecting students to maintain a superhuman, robotic schedule, BacklogOS is intentionally built around the reality that{' '}
          <strong className="text-white">plans sometimes fail:</strong>
        </p>

        <ul className="space-y-2 text-xs sm:text-sm">
          <li className="flex items-center gap-2.5 text-slate-300">
            <span className="h-2 w-2 rounded-full bg-rose-400 shrink-0" />
            <span>You miss a day because of school commitments or exhaustion.</span>
          </li>
          <li className="flex items-center gap-2.5 text-slate-300">
            <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
            <span>You get stuck on a difficult numerical concept like Rotational Mechanics.</span>
          </li>
          <li className="flex items-center gap-2.5 text-slate-300">
            <span className="h-2 w-2 rounded-full bg-cyan-400 shrink-0" />
            <span>An internal test gets rescheduled with 48 hours notice.</span>
          </li>
          <li className="flex items-center gap-2.5 text-slate-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
            <span>Your subject priorities shift toward weak areas.</span>
          </li>
        </ul>

        <p className="text-white font-semibold">
          Your study tool must adapt with you, not judge or punish you.
        </p>
      </div>
    ),
  },
  {
    id: 'evolution',
    tabLabel: '4. Problem to Product',
    badge: 'Building in Public',
    title: 'From Problem to Product',
    subtitle: 'From a messy notebook sketch to a full-stack web application.',
    icon: Code2,
    content: (
      <div className="space-y-4 text-sm sm:text-base leading-relaxed text-slate-300">
        <p>
          BacklogOS didn't launch as a polished, finished product.
        </p>

        <p className="font-semibold text-white">
          It started as a raw idea born out of desperation late at night at my study desk.
        </p>

        <p>
          First came messy paper prototypes and crude spreadsheets. Then experimental code, broken features, complete UI redesigns,
          unexpected bugs, and hundreds of hours spent debugging edge cases.
        </p>

        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-primary font-mono">
            <Code2 size={15} />
            <span>WHAT WENT INTO BUILDING BACKLOGOS</span>
          </div>
          <div className="flex flex-wrap gap-2 pt-1 text-xs">
            {['React & TypeScript', 'PostgreSQL & Cloud SQL', 'Firebase Authentication', 'Bax AI Assistant', 'Pomodoro Audio', 'Spaced Recall Algorithms', 'Adaptive Priority Scoring'].map((t) => (
              <span key={t} className="rounded-md bg-slate-800 border border-slate-700 px-2.5 py-1 text-[11px] font-mono text-slate-300">
                {t}
              </span>
            ))}
          </div>
        </div>

        <p>
          I've been building and iterating on this product while simultaneously learning modern engineering —
          from frontend reactivity and database relational schemas to authentication security, UX psychology, and API integrations.
        </p>

        <p className="italic text-slate-400">
          Every single version has taught me something new, and it is still evolving every day.
        </p>
      </div>
    ),
  },
  {
    id: 'learnings',
    tabLabel: '5. What I\'m Learning',
    badge: 'Growth Mindset',
    title: 'What I\'m Learning Along the Way',
    subtitle: 'Building a product is the best education a student could ask for.',
    icon: Lightbulb,
    content: (
      <div className="space-y-4 text-sm sm:text-base leading-relaxed text-slate-300">
        <p>
          Building BacklogOS has turned into far more than just writing code for a website.
        </p>

        <p className="font-semibold text-white">
          It has been a real-world masterclass in problem-solving:
        </p>

        <div className="space-y-2 text-xs sm:text-sm">
          {[
            'Turning a genuine personal frustration into a functional product',
            'Designing coherent systems instead of disconnected features',
            'Building, profiling, and debugging full-stack web architectures',
            'Managing relational databases and cloud authentication securely',
            'Thinking through empathetic student user experience and cognitive load',
            'Iterating rapidly based on what actually works during real study sessions',
            'Using AI as an intellectual amplifier rather than blindly pasting generated code',
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2.5 rounded-lg border border-slate-800/80 bg-slate-900/50 p-2.5">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
              <span className="text-slate-300 leading-snug">{item}</span>
            </div>
          ))}
        </div>

        <p className="text-xs sm:text-sm text-cyan-300 font-medium pt-1">
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
      <div className="space-y-5 text-sm sm:text-base leading-relaxed text-slate-300">
        <p>
          BacklogOS is still in its early chapters, but the vision is bold and clear.
        </p>

        <p>
          The mission is to build the ultimate command center that helps students navigate the entire journey of getting back on track:
          adaptive daily calibration, active recall, formula diagnostics, deep analytics, and tailored academic guidance.
        </p>

        <blockquote className="rounded-2xl border-l-4 border-primary bg-primary/10 p-4 sm:p-5 my-3">
          <p className="font-display text-base sm:text-lg font-bold text-white leading-relaxed">
            "You don't need a perfect study routine to start catching up. You only need a way to start."
          </p>
          <footer className="mt-2 text-xs text-primary font-mono font-semibold">
            — The BacklogOS Core Principle
          </footer>
        </blockquote>

        <p className="text-slate-300">
          Thank you for checking out BacklogOS and joining me on this journey. If you're currently dealing with a heavy backlog, take a deep breath — one 45-minute sprint is all it takes to get moving again.
        </p>

        <div className="mt-6 border-t border-slate-800 pt-5 flex items-center justify-between">
          <div>
            <h4 className="font-display text-base font-extrabold text-white">Ronik</h4>
            <p className="text-xs text-primary font-mono">Founder & Builder, BacklogOS</p>
            <p className="text-[11px] text-slate-400">Class 11 PCM Student</p>
          </div>
          <div className="h-14 w-14 rounded-2xl overflow-hidden border border-primary/40 shadow-lg bg-slate-900">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
      {/* Click outside backdrop */}
      <div className="absolute inset-0" onClick={onClose} aria-label="Close hoverboard" />

      {/* Hoverboard Modal Container */}
      <div className="relative w-full max-w-3xl rounded-3xl border border-primary/40 bg-[#0a0f1d] shadow-[0_0_50px_rgba(99,102,241,0.25)] flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        
        {/* Glow Effects */}
        <div className="pointer-events-none absolute -top-24 left-1/4 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-1/4 h-56 w-56 rounded-full bg-accent/20 blur-3xl" />

        {/* Top Header & Close */}
        <div className="relative flex items-center justify-between border-b border-slate-800/80 px-5 py-4 sm:px-6 bg-slate-900/60 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/20 text-primary border border-primary/30">
              <BookOpen size={16} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-sm font-bold text-white">Why BacklogOS Was Built</span>
                <span className="rounded-full bg-primary/20 border border-primary/40 px-2 py-0.5 text-[10px] font-mono font-bold text-primary">
                  Hoverboard Deck
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Written by Ronik · Class 11 Student & Founder</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-block text-[11px] font-mono text-slate-400">
              Use <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300">←</kbd> <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300">→</kbd> to glide
            </span>
            <button
              type="button"
              onClick={onClose}
              className="focus-ring rounded-xl border border-slate-800 bg-slate-800/60 p-2 text-slate-400 hover:bg-slate-700 hover:text-white transition"
              aria-label="Close hoverboard"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Hoverboard Navigation Tabs (Pills) */}
        <div className="relative border-b border-slate-800/80 bg-slate-950/40 px-4 py-2.5 sm:px-6 overflow-x-auto scrollbar-none flex items-center gap-1.5">
          {PAGES.map((page, idx) => {
            const isActive = idx === currentPage;
            return (
              <button
                key={page.id}
                type="button"
                onClick={() => setCurrentPage(idx)}
                className={`focus-ring shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-primary text-white shadow-md shadow-primary/25 border border-primary/60 scale-[1.02]'
                    : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
                }`}
              >
                {page.tabLabel}
              </button>
            );
          })}
        </div>

        {/* Reading Progress Indicator */}
        <div className="h-1 w-full bg-slate-800/50">
          <div
            className="h-full bg-gradient-to-r from-primary via-cyan-400 to-accent transition-all duration-300"
            style={{ width: `${((currentPage + 1) / PAGES.length) * 100}%` }}
          />
        </div>

        {/* Active Page Body (Scrollable) */}
        <div className="relative flex-1 overflow-y-auto px-5 py-6 sm:px-8 sm:py-7 space-y-5">
          {/* Header of the Active Slide */}
          <div className="border-b border-slate-800/70 pb-4">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-mono font-bold text-primary mb-2">
              <PageIcon size={13} />
              <span>{activePage.badge}</span>
              <span>·</span>
              <span>Page {currentPage + 1} of {PAGES.length}</span>
            </div>

            <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {activePage.title}
            </h3>

            {activePage.subtitle && (
              <p className="mt-1 text-xs sm:text-sm text-cyan-400/90 font-medium">
                {activePage.subtitle}
              </p>
            )}
          </div>

          {/* Slide Content */}
          <div className="animate-in fade-in slide-in-from-right-3 duration-200 key={activePage.id}">
            {activePage.content}
          </div>
        </div>

        {/* Hoverboard Footer Controls */}
        <div className="relative flex items-center justify-between border-t border-slate-800/80 bg-slate-900/70 px-5 py-3.5 sm:px-6 backdrop-blur-md">
          {/* Left: Previous Page Button */}
          <button
            type="button"
            disabled={currentPage === 0}
            onClick={() => setCurrentPage((p) => p - 1)}
            className={`focus-ring inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
              currentPage === 0
                ? 'opacity-40 border-slate-800 text-slate-500 cursor-not-allowed'
                : 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <ChevronLeft size={16} />
            <span className="hidden sm:inline">Previous Slide</span>
            <span className="sm:hidden">Prev</span>
          </button>

          {/* Center: Slide indicator */}
          <div className="flex items-center gap-1.5">
            {PAGES.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentPage(i)}
                className={`h-2 rounded-full transition-all ${
                  i === currentPage ? 'w-6 bg-primary' : 'w-2 bg-slate-700 hover:bg-slate-500'
                }`}
                aria-label={`Jump to page ${i + 1}`}
              />
            ))}
          </div>

          {/* Right: Next Page Button or Finish Button */}
          {currentPage < PAGES.length - 1 ? (
            <button
              type="button"
              onClick={() => setCurrentPage((p) => p + 1)}
              className="focus-ring inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-md shadow-primary/25 hover:bg-primary/90 transition"
            >
              <span>Next Slide</span>
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="focus-ring inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md transition"
            >
              <span>Done Reading</span>
              <CheckCircle2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
