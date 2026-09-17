import { ArrowRight, Check, Clock3, Layers3, Sparkles } from 'lucide-react';
import { Link } from 'wouter';

export function Landing() {
  return (
    <div className="human-layout overflow-hidden">
      <section className="paper-grid relative border-b border-border/70">
        <div className="mx-auto grid max-w-6xl gap-14 px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:gap-20 lg:pb-28">
          <div className="rise-in">
            <div className="mb-6 flex items-center gap-3 text-xs font-bold uppercase tracking-[.16em] text-primary">
              <span className="h-px w-10 bg-primary" /> Class 11 PCM · backlog planning
            </div>
            <h1 className="font-display max-w-2xl text-5xl font-semibold leading-[.98] tracking-[-.04em] text-foreground sm:text-7xl">
              A study plan for the chapters you keep postponing.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-muted-foreground sm:text-xl">
              Tell BacklogOS what is unfinished, how much time you have, and what matters next. It turns that into a week you can actually sit down and follow.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/onboarding" className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground shadow-[0_8px_0_hsl(171_38%_24%)] transition-transform hover:-translate-y-0.5 active:translate-y-0" data-testid="link-create-plan">
                Build a week I can follow <ArrowRight size={17} />
              </Link>
              <Link href="/roadmap" className="focus-ring inline-flex items-center justify-center rounded-xl px-5 py-3.5 text-sm font-bold text-foreground hover:bg-card" data-testid="link-see-roadmap">
                Look inside the plan
              </Link>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Takes about 2 minutes · saved only in this browser</p>
          </div>
          <div className="rise-in rise-in-delay-2 relative mx-auto w-full max-w-[430px]">
            <div className="absolute -right-3 -top-4 h-20 w-20 rounded-full bg-accent/30 blur-2xl" />
            <div className="relative rotate-2 rounded-[2rem] border border-border bg-card p-4 shadow-[0_24px_70px_hsl(222_32%_18%_/_0.13)]">
              <div className="rounded-[1.35rem] bg-primary p-6 text-primary-foreground">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-[.14em] text-primary-foreground/70"><span>Monday · 01</span><span>Physics</span></div>
                <p className="mt-14 max-w-xs font-display text-3xl leading-tight">Motion in a straight line</p>
                <div className="mt-8 h-2 rounded-full bg-primary-foreground/20"><div className="h-2 w-[14%] rounded-full bg-accent" /></div>
                <p className="mt-3 text-xs text-primary-foreground/70">45 minutes · concept, questions, recall</p>
              </div>
              <div className="space-y-2 p-3">
                {['Learn · Motion in a Straight Line', 'Practice · 8 focused questions', 'Review · recall the key formulas'].map((item, index) => (
                  <div key={item} className="flex items-center gap-3 rounded-xl border border-border/70 p-3 text-sm">
                    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${index === 0 ? 'bg-accent text-foreground' : 'bg-secondary text-primary'}`}>{index === 0 ? <Check size={14} strokeWidth={3} /> : <span className="text-[10px] font-bold">{index + 1}</span>}</span>
                    <span className={index === 0 ? 'text-muted-foreground line-through' : 'font-medium'}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute -bottom-5 -left-6 rounded-xl border border-border bg-card px-4 py-3 text-xs font-bold shadow-lg">
              <span className="mr-2 inline-block h-2 w-2 rounded-full bg-accent" /> first, make the next hour clear
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="max-w-xl">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-primary">How the week takes shape</p>
          <h2 className="font-display mt-4 text-4xl leading-tight tracking-[-.03em] sm:text-5xl">Start with the chapter that unlocks the next one.</h2>
          <p className="mt-5 text-base leading-7 text-muted-foreground">A backlog feels heavy when every chapter looks equally urgent. BacklogOS puts foundations before the topics that depend on them, then gives each day one job.</p>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {[
            { icon: Layers3, number: '01', title: 'Name the pile', copy: 'Pick the chapters that are genuinely waiting for you. Not every chapter in the textbook.' },
            { icon: Clock3, number: '02', title: 'Set a true limit', copy: 'Tell us the time you really have on a normal day. Your plan should fit your life.' },
            { icon: Sparkles, number: '03', title: 'Follow the next step', copy: 'Each day has learning, practice, and review so progress feels tangible, not abstract.' },
          ].map(({ icon: Icon, number, title, copy }) => (
            <article key={number} className="border-t-2 border-foreground/15 pt-5">
              <div className="flex items-center justify-between"><Icon size={22} className="text-primary" /><span className="font-mono text-xs font-bold text-muted-foreground">{number}</span></div>
              <h3 className="mt-10 font-display text-2xl">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{copy}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="border-y border-border/70 bg-secondary/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-12 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div><p className="font-display text-2xl">You do not need the whole syllabus today.</p><p className="mt-1 text-sm text-muted-foreground">You need the first honest block.</p></div>
          <Link href="/onboarding" className="focus-ring inline-flex items-center gap-2 self-start rounded-lg bg-accent px-5 py-3 text-sm font-bold text-foreground hover:brightness-95" data-testid="link-bottom-create-plan">Choose my chapters <ArrowRight size={16} /></Link>
        </div>
      </section>
    </div>
  );
}