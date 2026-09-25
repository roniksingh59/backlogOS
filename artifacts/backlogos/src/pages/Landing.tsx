import { ArrowRight, BookOpenCheck, Check, Clock3, Flame, Layers, Layers3, ShieldCheck, Sparkles, Zap, Award, BookOpen, Coffee, GraduationCap } from 'lucide-react';
import { Link } from 'wouter';
import studentStudyDeskImg from '@/assets/images/student_study_desk.jpg';
import studentStickersImg from '@/assets/images/student_stickers.jpg';
import studentRocketImg from '@/assets/images/student_on_rocket.jpg';

export function Landing() {
  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <section className="relative border-b border-border bg-card/40">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:gap-14 lg:pb-20">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded border border-border bg-muted/40 px-2.5 py-1 text-xs font-mono text-muted-foreground">
              <span>CLASS 11 PCM · BACKLOG RECOVERY SYSTEM</span>
            </div>
            <h1 className="font-display max-w-2xl text-4xl font-extrabold leading-[1.08] tracking-tight text-foreground sm:text-6xl">
              Turn your academic backlog into a prioritized recovery plan.
            </h1>
            <p className="mt-4 max-w-xl text-sm sm:text-base leading-relaxed text-muted-foreground font-sans">
              BacklogOS is an academic command center for students with large backlogs and limited runway before exams. Calculate exact requirements, respect prerequisite foundations, and automatically adapt when you fall behind.
            </p>
            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:items-center font-mono text-xs">
              <Link
                href="/dashboard"
                className="focus-ring inline-flex items-center justify-center gap-2 rounded bg-foreground px-5 py-3 font-bold text-background shadow-xs hover:bg-foreground/90 transition"
                data-testid="link-create-plan"
              >
                <span>OPEN DASHBOARD</span>
                <ArrowRight size={14} />
              </Link>
              <Link
                href="/onboarding"
                className="focus-ring inline-flex items-center justify-center gap-2 rounded border border-border bg-card px-4 py-3 font-medium text-foreground hover:bg-muted transition"
                data-testid="link-see-flashcards"
              >
                <span>GENERATE NEW PLAN</span>
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-4 text-xs font-mono text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Check size={13} className="text-emerald-500" /> Prerequisite dependency aware
              </span>
              <span className="flex items-center gap-1.5">
                <Check size={13} className="text-emerald-500" /> Auto-recovering schedules
              </span>
              <span className="flex items-center gap-1.5">
                <Check size={13} className="text-emerald-500" /> Spaced recall automation
              </span>
            </div>
          </div>

          {/* Precision Command Preview */}
          <div className="relative mx-auto w-full max-w-[440px]">
            <div className="rounded border border-border bg-card p-4 shadow-sm font-mono text-xs">
              <div className="border border-border bg-muted/30 p-3.5">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground uppercase">
                  <span>TODAY'S SCHEDULE</span>
                  <span className="font-bold text-foreground">4.0 HOURS ALLOCATED</span>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="font-sans text-lg font-bold text-foreground">
                    Kinematics & Mole Concept
                  </span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    ON TRACK
                  </span>
                </div>
                <div className="mt-2 h-1 w-full bg-muted overflow-hidden">
                  <div className="h-full bg-foreground w-2/3" />
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Runway to Exam: 87 days</span>
                  <span>Required: 3.1h/day</span>
                </div>
              </div>

              <div className="mt-3 divide-y divide-border border-t border-b border-border">
                {[
                  { duration: '60m', sub: 'Physics', topic: 'Kinematics · Relative Velocity', status: '✓ Complete' },
                  { duration: '60m', sub: 'Chemistry', topic: 'Mole Concept · Stoichiometry', status: 'In Progress' },
                  { duration: '45m', sub: 'Maths', topic: 'Quadratic Equations · Roots', status: 'Queued' },
                  { duration: '30m', sub: 'Revision', topic: 'Basic Mathematics Formula Drill', status: 'Queued' },
                ].map((item) => (
                  <div
                    key={item.topic}
                    className="py-2 flex items-center justify-between text-[11px]"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <span className="text-muted-foreground w-8 shrink-0">{item.duration}</span>
                      <span className="font-bold text-foreground w-16 shrink-0 truncate">{item.sub}</span>
                      <span className="text-muted-foreground truncate">{item.topic}</span>
                    </div>
                    <span className={`shrink-0 ${item.status === '✓ Complete' ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Student Study Desk Graphic Showcase */}
      <section className="relative border-b border-border/70 bg-gradient-to-b from-card/30 to-background/90 py-16 sm:py-24 overflow-hidden">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            {/* Visual Graphic with Student Sticky Notes */}
            <div className="relative lg:col-span-7">
              <div className="relative overflow-hidden rounded-3xl border-2 border-primary/30 shadow-2xl shadow-primary/10 bg-slate-950 group">
                <img
                  src={studentStudyDeskImg}
                  alt="Student study desk late night with books, highlighter notes, and chai"
                  className="h-full w-full object-cover aspect-[16/10] transform transition-transform duration-700 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                {/* Overlaid Badges & Student Telemetry */}
                <div className="absolute top-4 left-4 inline-flex items-center gap-2 rounded-full bg-slate-950/80 backdrop-blur-md border border-white/20 px-3 py-1 text-xs font-bold text-white shadow-lg">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Late Night Study Desk · 11:42 PM</span>
                </div>

                <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-white bg-slate-950/85 backdrop-blur-md p-3 rounded-2xl border border-white/15">
                  <div className="flex items-center gap-2">
                    <span className="text-primary font-bold">📚 Active Focus:</span>
                    <span className="text-slate-200">Laws of Motion & Friction</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-accent font-semibold">
                    <span>☕ Chai Break: 5m</span>
                    <span>·</span>
                    <span className="text-emerald-400">Streak: +1</span>
                  </div>
                </div>
              </div>

              {/* Floating Student Sticky Note Accent */}
              <div className="hidden sm:block absolute -bottom-6 -right-6 max-w-xs rotate-2 rounded-2xl border border-amber-300/40 bg-amber-100/95 dark:bg-amber-950/90 p-4 shadow-xl text-amber-950 dark:text-amber-100 backdrop-blur-md transition-transform hover:rotate-0">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 mb-1">
                  <span>📌 Aspirant's Note</span>
                </div>
                <p className="font-mono text-xs leading-relaxed font-semibold">
                  "v² = u² + 2as · PV = nRT · sin²θ + cos²θ = 1"
                </p>
                <p className="mt-1 text-[10px] text-amber-700 dark:text-amber-400 italic">
                  Don't memorize everything at once. Test yourself with 3 cards a day!
                </p>
              </div>
            </div>

            {/* Content & Student Manifesto */}
            <div className="lg:col-span-5 space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-bold text-accent">
                <GraduationCap size={15} />
                <span>Made Exclusively For Students</span>
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                The anti-overwhelm workspace you wished you had in Term 1.
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                School exams on Monday, coaching tests on Sunday, and 4 pending chapters in between. Most study tools give you generic to-do lists that pile on guilt. BacklogOS is engineered by people who know the exact Class 11 PCM pain.
              </p>

              <div className="space-y-3 pt-2">
                {[
                  {
                    title: 'Prerequisite-Aware Ordering',
                    desc: 'We never schedule Rotational Motion before Vectors and Torque basics are clear.',
                  },
                  {
                    title: 'Chai-Sized 45-Minute Focus Blocks',
                    desc: 'Realistic study sprints broken down into 40% concepts, 40% PYQ numericals, and 20% recall.',
                  },
                  {
                    title: 'Zero Guilt "Recovery Days"',
                    desc: 'Fell sick or had school practicals? Tap one button to slide pending topics forward without breaking your streak.',
                  },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3 rounded-xl border border-border/70 bg-card/50 p-3.5 transition hover:border-primary/40">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/15 text-primary text-xs font-bold mt-0.5">
                      ✓
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">{item.title}</h4>
                      <p className="text-[11px] leading-relaxed text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillars */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Everything you need to recover</p>
          <h2 className="font-display mt-3 text-3xl font-extrabold tracking-tight sm:text-5xl">
            Built specifically for the Class 11 PCM struggle.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Standard study planners assume you are starting fresh. BacklogOS is engineered for when you are already behind, prioritizing prerequisite chapters before advanced topics.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Sparkles,
              tag: 'Gemini AI',
              title: 'Instant AI Study Copilot',
              copy: 'Stuck on a tricky concept or sign convention? Tap the AI Copilot to get high-yield formula breakdowns, derivation shortcuts, and PYQ traps in seconds.',
            },
            {
              icon: Flame,
              tag: 'Heatmaps',
              title: 'Study Streaks & Heatmap',
              copy: 'A GitHub-style consistency grid that tracks your daily focus hours, builds your study streak, and rewards milestone badges as you clear chapters.',
            },
            {
              icon: Layers3,
              tag: 'Active Recall',
              title: 'Smart Formula Flashcards',
              copy: 'Interactive 3D flip cards covering core Physics, Chemistry, and Math formulas with symbol definitions, unit hygiene, and test traps.',
            },
          ].map(({ icon: Icon, tag, title, copy }) => (
            <article
              key={title}
              className="group relative rounded-2xl border border-border/70 bg-card/60 p-6 shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-primary/50 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon size={20} />
                </div>
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {tag}
                </span>
              </div>
              <h3 className="font-display mt-6 text-xl font-bold tracking-tight text-foreground">{title}</h3>
              <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">{copy}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Student Stickers & Badges Wall */}
      <section className="border-t border-border/70 bg-gradient-to-b from-background via-card/40 to-background py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            {/* Left Column: Badges & Features */}
            <div className="lg:col-span-6 space-y-6 order-2 lg:order-1">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary">
                <Award size={15} />
                <span>Student Hall of Small Wins</span>
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                Ditch the guilt. Collect small daily wins instead.
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                You don't defeat backlogs through wishful thinking or marathon all-nighters that ruin the next 3 days. You beat it by winning one 45-minute sprint at a time.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                <div className="rounded-2xl border border-border/80 bg-card/60 p-4 space-y-1.5 shadow-sm">
                  <div className="flex items-center gap-2 text-primary font-bold text-xs">
                    <span className="text-lg">⭐</span>
                    <span>Zero Backlog Club</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Clear each chapter's concept + PYQ block to light up your GitHub-style consistency streak.
                  </p>
                </div>

                <div className="rounded-2xl border border-border/80 bg-card/60 p-4 space-y-1.5 shadow-sm">
                  <div className="flex items-center gap-2 text-accent font-bold text-xs">
                    <span className="text-lg">☕</span>
                    <span>Chai & Focus Sprints</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Custom 15m, 25m, or 45m Pomodoro timers built specifically for solving numericals without phone tabs.
                  </p>
                </div>

                <div className="rounded-2xl border border-border/80 bg-card/60 p-4 space-y-1.5 shadow-sm">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
                    <span className="text-lg">⚡</span>
                    <span>Formula Flashcards</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Interactive 3D flip cards covering high-yield PCM formulas, unit hygiene, and frequent test traps.
                  </p>
                </div>

                <div className="rounded-2xl border border-border/80 bg-card/60 p-4 space-y-1.5 shadow-sm">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <span className="text-lg">🛡️</span>
                    <span>Guilt-Free Shift</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Exhausted from school lab practicals? Slide today's chapter safely to tomorrow with one gentle tap.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: 3D Student Stickers Graphic */}
            <div className="lg:col-span-6 relative order-1 lg:order-2">
              <div className="relative mx-auto max-w-md rounded-3xl border-2 border-primary/30 p-2 shadow-2xl shadow-primary/20 bg-gradient-to-b from-primary/10 via-card to-background">
                <div className="relative overflow-hidden rounded-2xl bg-slate-950 aspect-square group">
                  <img
                    src={studentStickersImg}
                    alt="Collection of 3D student sticker badges, formula notebook, and chai cup"
                    className="h-full w-full object-cover transform transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

                  {/* Top student sticker badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-slate-900/90 backdrop-blur-md border border-white/20 px-3 py-1 text-[11px] font-bold text-white shadow-md">
                    <span className="text-yellow-400">★</span>
                    <span>Official PCM Student Pack</span>
                  </div>

                  {/* Bottom sticker quote */}
                  <div className="absolute bottom-3 left-3 right-3 rounded-xl bg-slate-950/85 backdrop-blur-md border border-white/15 p-3 text-center">
                    <p className="text-xs font-bold text-white tracking-wide">
                      "Padhai hogi ab bina stress ke."
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Class 11 Physics · Chemistry · Mathematics Recovery Hub
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="border-y border-border/70 bg-gradient-to-r from-primary/10 via-purple-500/10 to-accent/10 py-14">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-display text-2xl font-bold tracking-tight text-foreground">
              You do not need to finish the whole syllabus today.
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              You only need one honest focus block. BacklogOS takes care of the rest.
            </p>
          </div>
          <Link
            href="/onboarding"
            className="focus-ring inline-flex items-center gap-2 self-start rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-md transition hover:bg-primary/90"
            data-testid="link-bottom-create-plan"
          >
            <span>Start My Recovery</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Founder Story Callout - Why BacklogOS is Built? */}
      <section className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-card to-accent/10 p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <span className="text-3xl select-none">🎒</span>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-display text-sm font-bold text-foreground">Why BacklogOS is built?</h4>
                <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-mono font-bold text-primary">
                  Founder's Note
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                "Built by a Class 11 student who experienced the crushing stress of falling behind firsthand."
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-why-built'))}
            className="focus-ring shrink-0 inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-card px-4 py-2.5 text-xs font-bold text-primary hover:bg-primary/15 transition shadow-xs"
            data-testid="button-open-founder-story"
          >
            <span>Read Hoverboard Story (6 Slides)</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </section>
    </div>
  );
}
