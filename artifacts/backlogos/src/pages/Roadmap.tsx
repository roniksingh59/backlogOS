import { ArrowRight, Check, ChevronDown, CircleHelp, RotateCcw, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { kindLabels, type PlanDay, type PlanTask, type StudentPlan } from '@/lib/backlog-data';
import { clearStoredPlan, readCompleted, readPlan, saveCompleted } from '@/lib/storage';

function EmptyRoadmap() {
  return <div className="mx-auto max-w-3xl px-5 py-20 text-center sm:px-8 sm:py-28"><div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-secondary text-primary"><CircleHelp size={28} /></div><p className="mt-7 text-xs font-bold uppercase tracking-[.18em] text-primary">Nothing waiting here yet</p><h1 className="font-display mt-3 text-4xl tracking-[-.03em] sm:text-5xl">Your week starts with one honest choice.</h1><p className="mx-auto mt-5 max-w-lg text-base leading-7 text-muted-foreground">Choose the chapters, time, and goal that fit your real life. BacklogOS will shape them into a calm seven-day route.</p><Link href="/onboarding" className="focus-ring mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground" data-testid="link-empty-create-plan">Create my recovery plan <ArrowRight size={17} /></Link></div>;
}

function TaskRow({ task, done, onToggle }: { task: PlanTask; done: boolean; onToggle: () => void }) {
  return <label className={`group flex cursor-pointer gap-3 border-b border-border/70 py-4 last:border-b-0 ${done ? 'opacity-65' : ''}`} data-testid={`task-row-${task.id}`}><input type="checkbox" checked={done} onChange={onToggle} className="sr-only" data-testid={`checkbox-task-${task.id}`} /><span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-colors ${done ? 'border-accent bg-accent text-foreground' : 'border-border bg-background group-hover:border-primary'}`}>{done && <Check size={14} strokeWidth={3} />}</span><span className="min-w-0"><span className={`flex items-center gap-2 text-sm font-bold ${done ? 'text-muted-foreground line-through' : ''}`}><span className="text-[10px] uppercase tracking-[.14em] text-primary">{kindLabels[task.kind]}</span>{task.label}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{task.detail}</span></span></label>;
}

function DayCard({ day, completed, onToggle }: { day: PlanDay; completed: Set<string>; onToggle: (taskId: string) => void }) {
  const [open, setOpen] = useState(day.day === 1);
  const doneCount = day.tasks.filter((task) => completed.has(task.id)).length;
  return <article className={`rounded-2xl border bg-card transition-colors ${doneCount === day.tasks.length ? 'border-primary/40' : 'border-border'}`} data-testid={`card-day-${day.day}`}><button type="button" onClick={() => setOpen((value) => !value)} className="focus-ring flex w-full items-center gap-4 p-5 text-left sm:p-6" aria-expanded={open} data-testid={`button-toggle-day-${day.day}`}><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-sm font-bold ${doneCount === day.tasks.length ? 'bg-accent text-foreground' : 'bg-secondary text-primary'}`}>{doneCount === day.tasks.length ? <Check size={19} strokeWidth={3} /> : `0${day.day}`}</span><span className="min-w-0 flex-1"><span className="block text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">Day {day.day} · {doneCount} / {day.tasks.length} complete</span><span className="mt-1 block truncate font-display text-xl">{day.theme}</span></span><ChevronDown size={19} className={`shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} /></button>{open && <div className="px-5 pb-5 sm:px-6 sm:pb-6">{day.tasks.map((task) => <TaskRow key={task.id} task={task} done={completed.has(task.id)} onToggle={() => onToggle(task.id)} />)}</div>}</article>;
}

export function Roadmap() {
  const [, setLocation] = useLocation();
  const [plan, setPlan] = useState<StudentPlan | null>(readPlan);
  const [completedIds, setCompletedIds] = useState<string[]>(readCompleted);
  const completed = useMemo(() => new Set(completedIds), [completedIds]);
  const allTasks = plan?.days.flatMap((day) => day.tasks) ?? [];
  const progress = allTasks.length ? Math.round((completedIds.filter((id) => allTasks.some((task) => task.id === id)).length / allTasks.length) * 100) : 0;

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
  return <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-16">
    <div className="flex flex-col gap-7 border-b border-border/70 pb-9 lg:flex-row lg:items-end lg:justify-between">
      <div className="rise-in"><div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-primary"><span className="h-2 w-2 rounded-full bg-accent" /> Your 7-day recovery roadmap <span className="rounded-full bg-accent/25 px-2 py-1 text-[10px] text-foreground">Prototype</span></div><h1 className="font-display mt-4 max-w-2xl text-4xl leading-tight tracking-[-.03em] sm:text-6xl">Keep the promise small. Keep showing up.</h1><p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">{plan.board} · {plan.goal} · {plan.minutesPerDay} minutes/day · {plan.priority}</p></div>
      <div className="flex shrink-0 flex-wrap gap-2"><Link href="/onboarding" className="focus-ring inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold hover:bg-muted" data-testid="link-edit-plan">Edit plan <ArrowRight size={15} /></Link><button type="button" onClick={resetProgress} className="focus-ring inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold hover:bg-muted" data-testid="button-reset-progress"><RotateCcw size={15} /> Reset checks</button><button type="button" onClick={startOver} className="focus-ring inline-flex items-center rounded-xl px-3 py-2.5 text-sm font-bold text-destructive hover:bg-destructive/5" data-testid="button-start-over">Start over</button></div>
    </div>
    <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
      <div className="space-y-4">{plan.days.map((day) => <DayCard key={day.day} day={day} completed={completed} onToggle={toggleTask} />)}</div>
      <aside className="order-first rounded-2xl border border-border bg-primary p-6 text-primary-foreground lg:sticky lg:top-24 lg:order-last" data-testid="card-progress"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-primary-foreground/70">This week</p><p className="mt-2 font-display text-5xl">{progress}<span className="text-2xl">%</span></p></div><Sparkles size={21} className="text-accent" /></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-primary-foreground/20"><div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${progress}%` }} /></div><p className="mt-3 text-xs leading-5 text-primary-foreground/75">{completedIds.length} of {allTasks.length} steps checked. {progress === 100 ? 'You made it through the route.' : progress > 0 ? 'That is real movement.' : 'Start with Day 1, Learning.'}</p><div className="mt-7 border-t border-primary-foreground/20 pt-5 text-xs leading-5 text-primary-foreground/75"><p className="font-bold text-primary-foreground">A note on this prototype</p><p className="mt-2">This is a simple planning tool, not professional academic advice. Adjust the pace when your week changes.</p></div></aside>
    </div>
  </div>;
}