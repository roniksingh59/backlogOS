import { ArrowRight, Check, Clock3, Layers3, Sparkles } from 'lucide-react';
import { Link } from 'wouter';

export function Landing() {
  return (
    <div className="overflow-hidden">
      <section className="paper-grid relative border-b border-border/70">
        <div className="mx-auto grid max-w-6xl gap-14 px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:gap-20 lg:pb-28">
          <div className="rise-in">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-card px-3 py-1.5 text-xs font-bold uppercase tracking-[.16em] text-primary">
              <span className="h-2 w-2 rounded-full bg-accent" /> A gentler way back in
            </div>
            <h1 className="font-display max-w-2xl text-5xl font-semibold leading-[.98] tracking-[-.04em] text-foreground sm:text-7xl">
              Your backlog is not a personality trait.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-muted-foreground sm:text-xl">
              BacklogOS turns the chapters sitting in the corner of your mind into a realistic seven-day route. No grand promises. Just the next useful hour.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/onboarding" className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground shadow-[0_8px_0_hsl(171_38%_24%)] transition-transform hover:-translate-y-0.5 active:translate-y-0" data-testid="link-create-plan">
                Create my recovery plan <ArrowRight size={17} />
              </Link>
              <Link href="/roadmap" className="focus-ring inline-flex items-center justify-center rounded-xl px-5 py-3.5 text-sm font-bold text-foreground hover:bg-card" data-testid="link-see-roadmap">
                See the roadmap
              </Link>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Takes about 2 minutes · saved only in this browser</p>
          </div>
          <div className="rise-in rise-in-delay-2 relative mx-auto w-full max-w-[430px]">
            <div className="absolute -right-3 -top-4 h-20 w-20 rounded-full bg-accent/30 blur-2xl" />
            <div className="relative rotate-2 rounded-[2rem] border border-border bg-card p-4 shadow-[0_24px_70px_hsl(222_32%_18%_/_0.13)]">
              <div className="rounded-[1.35rem] bg-primary p-6 text-primary-foreground">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-[.14em] text-primary-foreground/70"><span>This week</span><span>01 / 07</span></div>
                <p className="mt-14 max-w-xs font-display text-3xl leading-tight">Start small. Make it count.</p>
                <div className="mt-8 h-2 rounded-full bg-primary-foreground/20"><div className="h-2 w-[14%] rounded-full bg-accent" /></div>
                <p className="mt-3 text-xs text-primary-foreground/70">1 of 7 days · 18 min checked off</p>
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
              <span className="mr-2 inline-block h-2 w-2 rounded-full bg-accent" /> one day at a time
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="max-w-xl">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-primary">The idea is simple</p>
          <h2 className="font-display mt-4 text-4xl leading-tight tracking-[-.03em] sm:text-5xl">Less panic. More sequence.</h2>
          <p className="mt-5 text-base leading-7 text-muted-foreground">A pile of unfinished chapters feels impossible because it has no order. BacklogOS gives it a beginning, a middle, and a finish line you can actually see.</p>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {[
            { icon: Layers3, number: '01', title: 'Name the pile', copy: 'Pick the chapters that are genuinely waiting for you. Not every chapter in the textbook.' },
            { icon: Clock3, number: '02', title: 'Set a true limit', copy: 'Tell us the time you really have on a normal day. Your plan should fit your life.' },
            { icon: Sparkles, number: '03', title: 'Follow the next step', copy: 'Each day has learning, practice, and review so progress feels tangible, not abstract.' },
          ].map(({ icon: Icon, number, title, copy }) => (
            <article key={number} className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center justify-between"><Icon size={22} className="text-primary" /><span className="font-mono text-xs font-bold text-muted-foreground">{number}</span></div>
              <h3 className="mt-12 font-display text-2xl">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{copy}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="border-y border-border/70 bg-secondary/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-12 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div><p className="font-display text-2xl">Ready to make the pile smaller?</p><p className="mt-1 text-sm text-muted-foreground">Start with what you can do today.</p></div>
          <Link href="/onboarding" className="focus-ring inline-flex items-center gap-2 self-start rounded-xl bg-accent px-5 py-3 text-sm font-bold text-foreground hover:brightness-95" data-testid="link-bottom-create-plan">Build my seven-day plan <ArrowRight size={16} /></Link>
        </div>
      </section>
    </div>
  );
}