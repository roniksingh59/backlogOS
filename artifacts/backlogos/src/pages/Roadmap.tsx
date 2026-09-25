import { ArrowRight, BookOpen, Check, ChevronDown, CircleHelp, RotateCcw, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { chapters, kindLabels, type PlanDay, type PlanTask, type StudentPlan } from '@/lib/backlog-data';
import { clearStoredPlan, readCompleted, readPlan, saveCompleted } from '@/lib/storage';
import { ChapterSubtopicsCard } from '@/components/ChapterSubtopicsCard';

function EmptyRoadmap() {
  return <div className="mx-auto max-w-3xl px-5 py-20 text-center sm:px-8 sm:py-28"><div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-secondary text-primary"><CircleHelp size={28} /></div><p className="mt-7 text-xs font-bold uppercase tracking-[.18em] text-primary">Nothing waiting here yet</p><h1 className="font-display mt-3 text-4xl tracking-[-.03em] sm:text-5xl">Your week starts with one honest choice.</h1><p className="mx-auto mt-5 max-w-lg text-base leading-7 text-muted-foreground">Choose the chapters, time, and goal that fit your real life. BacklogOS will shape them into a calm seven-day route.</p><Link href="/onboarding" className="focus-ring mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground" data-testid="link-empty-create-plan">Create my recovery plan <ArrowRight size={17} /></Link></div>;
}

function TaskRow({ task, done, onToggle }: { task: PlanTask; done: boolean; onToggle: () => void }) {
  return <label className={`group flex min-w-0 cursor-pointer gap-3 border-b border-border/70 py-4 last:border-b-0 ${done ? 'opacity-75' : ''}`} data-testid={`task-row-${task.id}`}>
    <input type="checkbox" checked={done} onChange={onToggle} className="sr-only" data-testid={`checkbox-task-${task.id}`} />
    <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-colors ${done ? 'border-accent bg-accent text-foreground' : 'border-border bg-background group-hover:border-primary'}`}>{done && <Check size={14} strokeWidth={3} />}</span>
    <span className="min-w-0 break-words">
      <span className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-bold ${done ? 'text-muted-foreground' : ''}`}>
        <span className="text-[10px] uppercase tracking-[.14em] text-primary">{kindLabels[task.kind]}</span>
        <span className={done ? 'line-through' : ''}>{task.chapterTitle}</span>
        {task.isPrerequisite && <span className="rounded-full bg-accent/25 px-2 py-0.5 text-[10px] uppercase tracking-wider text-foreground no-underline">Prerequisite</span>}
      </span>
      <span className={`mt-1 block break-words text-xs leading-5 ${done ? 'text-muted-foreground' : 'text-muted-foreground'}`}>{task.minutes} min · {task.label}</span>
    </span>
  </label>;
}

function DayCard({ day, completed, onToggle }: { day: PlanDay; completed: Set<string>; onToggle: (taskId: string) => void }) {
  const [open, setOpen] = useState(day.day === 1);
  const doneCount = day.tasks.filter((task) => completed.has(task.id)).length;
  return <article className={`rounded-2xl border bg-card transition-colors ${doneCount === day.tasks.length ? 'border-primary/40' : 'border-border'}`} data-testid={`card-day-${day.day}`}>
    <button type="button" onClick={() => setOpen((value) => !value)} className="focus-ring flex w-full min-w-0 items-center gap-4 p-5 text-left sm:p-6" aria-expanded={open} data-testid={`button-toggle-day-${day.day}`}>
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-sm font-bold ${doneCount === day.tasks.length ? 'bg-accent text-foreground' : 'bg-secondary text-primary'}`}>{doneCount === day.tasks.length ? <Check size={19} strokeWidth={3} /> : `0${day.day}`}</span>
      <span className="min-w-0 flex-1 break-words">
        <span className="block text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">Day {day.day} · {doneCount} / {day.tasks.length} complete</span>
        <span className="mt-1 block break-words font-display text-xl">{day.theme}</span>
        <span className="mt-1 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider text-primary">
          {day.isPrerequisite && <span>Prerequisite</span>}
          {day.isRecap && <span>Consolidation day</span>}
        </span>
      </span>
      <ChevronDown size={19} className={`shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && (
      <div className="px-5 pb-5 sm:px-6 sm:pb-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-3">
          <Link
            href={`/study?chapter=${day.chapterId}`}
            className="focus-ring inline-flex items-center gap-2 rounded-xl bg-secondary px-3.5 py-2 text-xs font-bold text-primary hover:bg-secondary/80 transition"
            data-testid={`link-study-day-${day.day}`}
          >
            <BookOpen size={14} /> Open Full Chapter Study Room
          </Link>
          <span className="text-[11px] text-muted-foreground font-mono">
            {day.tasks.reduce((sum, t) => sum + t.minutes, 0)} min allocated
          </span>
        </div>

        {/* Sprint Tasks */}
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
            Sprint Action Blocks
          </span>
          <div className="rounded-xl border border-border/60 bg-muted/20 px-3">
            {day.tasks.map((task) => (
              <TaskRow key={task.id} task={task} done={completed.has(task.id)} onToggle={() => onToggle(task.id)} />
            ))}
          </div>
        </div>

        {/* NCERT Subtopics Clearing Checklist */}
        <div className="pt-2">
          <ChapterSubtopicsCard
            chapterId={day.chapterId}
            chapterTitle={day.chapterTitle}
            subject={day.subject}
            compact
          />
        </div>
      </div>
    )}
  </article>;
}

export function Roadmap() {
  const [, setLocation] = useLocation();
  const [plan, setPlan] = useState<StudentPlan | null>(readPlan);
  const [completedIds, setCompletedIds] = useState<string[]>(readCompleted);
  const completed = useMemo(() => new Set(completedIds), [completedIds]);
  const allTasks = plan?.days.flatMap((day) => day.tasks) ?? [];
  const completedCount = completedIds.filter((id) => allTasks.some((task) => task.id === id)).length;
  const progress = allTasks.length ? Math.round((completedCount / allTasks.length) * 100) : 0;

  const toggleTask = (id: string) => {
    const next = completedIds.includes(id) ? completedIds.filter((taskId) => taskId !== id) : [...completedIds, id];
    setCompletedIds(next);
    saveCompleted(next);
  };

  const resetProgress = () => {
    if (window.confirm('Reset the checkmarks for this plan?')) {
      setCompletedIds([]);
      saveCompleted([]);
    }
  };

  const startOver = () => {
    if (window.confirm('Start over and clear this plan?')) {
      clearStoredPlan();
      setPlan(null);
      setCompletedIds([]);
      setLocation('/onboarding');
    }
  };

  if (!plan) return <EmptyRoadmap />;
  const selectedChapters = plan.chapterIds
    .map((id) => chapters.find((chapter) => chapter.id === id))
    .filter((chapter) => chapter);

  return <div className="human-layout mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-16">
    <div className="flex flex-col gap-7 border-b border-border/70 pb-9 lg:flex-row lg:items-end lg:justify-between">
      <div className="rise-in min-w-0"><div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-primary"><span className="h-2 w-2 shrink-0 rounded-full bg-accent" /> Your 7-day recovery roadmap <span className="rounded-full bg-accent/25 px-2 py-1 text-[10px] text-foreground">Prototype</span></div><h1 className="font-display mt-4 max-w-2xl break-words text-4xl leading-tight tracking-[-.03em] sm:text-6xl">Keep the promise small. Keep showing up.</h1><p className="mt-4 max-w-xl break-words text-sm leading-6 text-muted-foreground">{plan.board} · {plan.goal} · {plan.minutesPerDay >= 60 ? `${Math.floor(plan.minutesPerDay / 60)}h${plan.minutesPerDay % 60 ? ` ${plan.minutesPerDay % 60}m` : ''} (${plan.minutesPerDay} min/day)` : `${plan.minutesPerDay} min/day`} · {plan.priority}</p></div>
       <div className="flex shrink-0 flex-wrap gap-2"><Link href="/dashboard" className="focus-ring inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold hover:bg-muted" data-testid="link-roadmap-dashboard">Dashboard <ArrowRight size={15} /></Link><Link href="/onboarding" className="focus-ring inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold hover:bg-muted" data-testid="link-edit-plan">Edit plan <ArrowRight size={15} /></Link><button type="button" onClick={resetProgress} className="focus-ring inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold hover:bg-muted" data-testid="button-reset-progress"><RotateCcw size={15} /> Reset checks</button><button type="button" onClick={startOver} className="focus-ring inline-flex items-center rounded-xl px-3 py-2.5 text-sm font-bold text-destructive hover:bg-destructive/5" data-testid="button-start-over">Start over</button></div>
    </div>
    <section className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)]" aria-label="Plan context">
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-primary"><Sparkles size={15} /> Why this order?</div>
        <p className="mt-3 break-words text-sm leading-6 text-muted-foreground">{plan.orderReason}</p>
      </div>
      <div className="rounded-2xl border border-border bg-secondary/45 p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[.16em] text-primary">Your selected chapters</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {selectedChapters.map((chapter) => <span key={chapter!.id} className="max-w-full break-words rounded-full border border-primary/15 bg-background px-3 py-1.5 text-xs font-semibold text-foreground">{chapter!.title}</span>)}
        </div>
      </div>
    </section>
    <p className="mt-4 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-xs leading-5 text-foreground">{plan.coverageNote}</p>
    <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
      <div className="space-y-4">{plan.days.map((day) => <DayCard key={day.day} day={day} completed={completed} onToggle={toggleTask} />)}</div>
      <aside className="order-first rounded-2xl border border-border bg-primary p-6 text-primary-foreground lg:sticky lg:top-24 lg:order-last" data-testid="card-progress"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-primary-foreground/70">This week</p><p className="mt-2 font-display text-5xl">{progress}<span className="text-2xl">%</span></p></div><Sparkles size={21} className="shrink-0 text-accent" /></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-primary-foreground/20"><div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${progress}%` }} /></div><p className="mt-3 text-xs leading-5 text-primary-foreground/75">{completedCount} of {allTasks.length} steps checked. {progress === 100 ? 'You made it through the route.' : progress > 0 ? 'That is real movement.' : 'Start with Day 1, Learning.'}</p><div className="mt-7 border-t border-primary-foreground/20 pt-5 text-xs leading-5 text-primary-foreground/75"><p className="font-bold text-primary-foreground">A note on this prototype</p><p className="mt-2">This is a simple planning tool, not professional academic advice. Adjust the pace when your week changes.</p></div></aside>
    </div>
  </div>;
}