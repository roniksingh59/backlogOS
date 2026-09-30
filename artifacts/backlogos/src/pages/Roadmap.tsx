import { ArrowRight, BookOpen, Check, ChevronDown, CircleHelp, RotateCcw, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { chapters, kindLabels, type PlanDay, type PlanTask, type StudentPlan } from '@/lib/backlog-data';
import { clearStoredPlan, readCompleted, readPlan, saveCompleted } from '@/lib/storage';
import { ChapterSubtopicsCard } from '@/components/ChapterSubtopicsCard';

function EmptyRoadmap() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6 sm:py-28 font-sans">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded border border-border bg-muted/40 text-foreground">
        <CircleHelp size={18} />
      </div>
      <p className="mt-4 text-xs font-mono uppercase tracking-widest text-muted-foreground">Recovery Route</p>
      <h1 className="font-display mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
        Your week starts with one honest choice.
      </h1>
      <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground leading-relaxed">
        Choose the chapters, study hours, and academic goals that fit your real runway. BacklogOS will shape them into a structured seven-day route.
      </p>
      <div className="mt-6 flex justify-center gap-3 font-mono text-xs">
        <Link
          href="/onboarding"
          className="focus-ring inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2 font-bold text-background hover:bg-foreground/90 transition shadow-2xs"
          data-testid="link-empty-create-plan"
        >
          Create Recovery Plan <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}

function TaskRow({ task, done, onToggle }: { task: PlanTask; done: boolean; onToggle: () => void }) {
  return (
    <label
      className={`group flex min-w-0 cursor-pointer gap-2.5 border-b border-border/60 py-3 last:border-b-0 ${
        done ? 'opacity-50' : ''
      }`}
      data-testid={`task-row-${task.id}`}
    >
      <input
        type="checkbox"
        checked={done}
        onChange={onToggle}
        className="sr-only"
        data-testid={`checkbox-task-${task.id}`}
      />
      <span
        className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border transition-colors ${
          done ? 'border-foreground bg-foreground text-background' : 'border-border bg-background group-hover:border-foreground/50'
        }`}
      >
        {done && <Check size={12} strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-semibold ${done ? 'text-muted-foreground' : 'text-foreground'}`}>
          <span className="font-mono text-[10px] uppercase text-muted-foreground">{kindLabels[task.kind]}</span>
          <span className="text-muted-foreground">·</span>
          <span className={done ? 'line-through' : ''}>{task.chapterTitle}</span>
          {task.isPrerequisite && (
            <span className="rounded border border-border px-1.5 py-0.2 text-[9px] font-mono uppercase text-foreground">
              Foundation
            </span>
          )}
        </span>
        <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">
          {task.minutes} min · {task.label}
        </span>
      </span>
    </label>
  );
}

function DayCard({ day, completed, onToggle }: { day: PlanDay; completed: Set<string>; onToggle: (taskId: string) => void }) {
  const [open, setOpen] = useState(day.day === 1);
  const doneCount = day.tasks.filter((task) => completed.has(task.id)).length;

  return (
    <article
      className="rounded-md border border-border bg-card transition-colors"
      data-testid={`card-day-${day.day}`}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="focus-ring flex w-full min-w-0 items-center gap-3.5 p-4 text-left sm:p-5"
        aria-expanded={open}
        data-testid={`button-toggle-day-${day.day}`}
      >
        <span
          className={`grid h-8 w-8 shrink-0 place-items-center rounded border border-border font-mono text-xs font-bold ${
            doneCount === day.tasks.length ? 'bg-foreground text-background' : 'bg-muted/40 text-foreground'
          }`}
        >
          {doneCount === day.tasks.length ? <Check size={14} strokeWidth={3} /> : `0${day.day}`}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Day {day.day} · {doneCount} of {day.tasks.length} complete
          </span>
          <span className="mt-0.5 block font-sans text-base font-bold text-foreground">{day.theme}</span>
          {(day.isPrerequisite || day.isRecap) && (
            <span className="mt-1 flex flex-wrap gap-2 text-[10px] font-mono uppercase text-muted-foreground">
              {day.isPrerequisite && <span>• Prerequisite Phase</span>}
              {day.isRecap && <span>• Consolidation Day</span>}
            </span>
          )}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="px-4 pb-4 sm:px-5 sm:pb-5 space-y-4 border-t border-border pt-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5">
            <Link
              href={`/study?chapter=${day.chapterId}`}
              className="focus-ring inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-mono font-medium text-foreground hover:bg-muted transition"
              data-testid={`link-study-day-${day.day}`}
            >
              <BookOpen size={12} /> Open Chapter Study Room
            </Link>
            <span className="text-[11px] text-muted-foreground font-mono">
              {day.tasks.reduce((sum, t) => sum + t.minutes, 0)} min allocated
            </span>
          </div>

          {/* Sprint Tasks */}
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground block mb-1">
              Sprint Blocks
            </span>
            <div className="divide-y divide-border/60 rounded border border-border bg-background px-3">
              {day.tasks.map((task) => (
                <TaskRow key={task.id} task={task} done={completed.has(task.id)} onToggle={() => onToggle(task.id)} />
              ))}
            </div>
          </div>

          {/* NCERT Subtopics Clearing Checklist */}
          <div className="pt-1">
            <ChapterSubtopicsCard
              chapterId={day.chapterId}
              chapterTitle={day.chapterTitle}
              subject={day.subject}
              compact
            />
          </div>
        </div>
      )}
    </article>
  );
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
    if (window.confirm('Reset checkmarks for this plan?')) {
      setCompletedIds([]);
      saveCompleted([]);
    }
  };

  const startOver = () => {
    if (window.confirm('Start over and build a new plan?')) {
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 space-y-6 font-sans">
      {/* Header */}
      <div className="border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              <span>BacklogOS</span>
              <span>·</span>
              <span>7-Day Recovery Route</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-0.5">
              Keep the promise small. Keep showing up.
            </h1>
            <p className="mt-1 text-xs text-muted-foreground font-mono">
              {plan.board} · {plan.goal} · {plan.minutesPerDay} min/day · {plan.priority}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
            <Link
              href="/dashboard"
              className="rounded border border-border bg-card px-2.5 py-1 text-foreground hover:bg-muted transition flex items-center gap-1"
              data-testid="link-roadmap-dashboard"
            >
              <span>Dashboard</span>
              <ArrowRight size={12} />
            </Link>
            <Link
              href="/onboarding"
              className="rounded border border-border bg-card px-2.5 py-1 text-muted-foreground hover:text-foreground hover:bg-muted transition"
              data-testid="link-edit-plan"
            >
              Edit plan
            </Link>
            <button
              type="button"
              onClick={resetProgress}
              className="rounded border border-border bg-card px-2.5 py-1 text-muted-foreground hover:text-foreground hover:bg-muted transition flex items-center gap-1"
              data-testid="button-reset-progress"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
            <button
              type="button"
              onClick={startOver}
              className="rounded border border-border bg-card px-2.5 py-1 text-destructive hover:bg-destructive/10 transition"
              data-testid="button-start-over"
            >
              Start over
            </button>
          </div>
        </div>

        {/* Why this order & Selected Chapters */}
        <div className="pt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)] text-xs font-mono">
          <div className="border border-border bg-muted/15 p-3.5 space-y-1">
            <span className="text-[10px] uppercase text-muted-foreground font-bold block">
              Prerequisite & Priority Logic
            </span>
            <p className="text-foreground leading-relaxed font-sans">{plan.orderReason}</p>
          </div>

          <div className="border border-border bg-muted/15 p-3.5 space-y-1">
            <span className="text-[10px] uppercase text-muted-foreground font-bold block">
              Selected Units ({selectedChapters.length})
            </span>
            <div className="flex flex-wrap gap-1 pt-1">
              {selectedChapters.map((chapter) => (
                <span
                  key={chapter!.id}
                  className="rounded border border-border bg-background px-2 py-0.5 text-[11px] text-foreground truncate max-w-full"
                >
                  {chapter!.title}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Roadmap Area */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
        <div className="space-y-3">
          {plan.days.map((day) => (
            <DayCard key={day.day} day={day} completed={completed} onToggle={toggleTask} />
          ))}
        </div>

        {/* Progress Sidebar */}
        <aside
          className="border border-border bg-card p-5 rounded-md lg:sticky lg:top-20 space-y-4 font-mono text-xs"
          data-testid="card-progress"
        >
          <div className="border-b border-border pb-3">
            <span className="text-[10px] uppercase text-muted-foreground block">Route Progress</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-foreground font-mono">{progress}%</span>
              <span className="text-xs text-muted-foreground">completed</span>
            </div>
          </div>

          <div className="h-1.5 w-full bg-muted overflow-hidden rounded-full">
            <div
              className="h-full bg-foreground transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed font-sans">
            {completedCount} of {allTasks.length} steps checked. {progress === 100 ? 'You completed the entire recovery route.' : progress > 0 ? 'Good momentum. Keep going.' : 'Start with Day 1 concept learning.'}
          </p>

          <div className="border-t border-border pt-3 text-[11px] text-muted-foreground space-y-1">
            <p className="font-bold text-foreground uppercase tracking-wider text-[10px]">Academic Discipline</p>
            <p className="leading-relaxed">
              Adjust your daily minutes whenever exams or school practicals require attention. BacklogOS recalculates without penalty.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
