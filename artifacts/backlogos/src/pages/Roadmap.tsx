import {
  ArrowRight,
  BookOpen,
  Calendar,
  Check,
  ChevronDown,
  CircleHelp,
  Clock,
  Compass,
  Flame,
  Play,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  chapters,
  kindLabels,
  makePlan,
  PLAN_DURATION_OPTIONS,
  type PlanDay,
  type PlanDuration,
  type PlanTask,
  type StudentPlan,
  type TaskKind,
} from '@/lib/backlog-data';
import { clearStoredPlan, readCompleted, readPlan, saveCompleted, savePlan } from '@/lib/storage';
import { ChapterSubtopicsCard } from '@/components/ChapterSubtopicsCard';
import { triggerGrandCelebration, triggerTaskCelebration } from '@/lib/celebration';
import { useAuth } from '@/lib/auth-context';
import {
  deleteStudyPlanDirect,
  removeCompletedTaskDirect,
  saveCompletedTaskDirect,
  saveStudyPlanDirect,
} from '@/lib/supabase-service';

function getSubjectAccent(subject: string) {
  const s = (subject || '').toLowerCase();
  if (s.includes('phys')) {
    return {
      dot: 'bg-sky-500',
      text: 'text-sky-700 dark:text-sky-300',
      chipBg: 'border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300',
    };
  }
  if (s.includes('chem')) {
    return {
      dot: 'bg-emerald-500',
      text: 'text-emerald-700 dark:text-emerald-300',
      chipBg: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    };
  }
  if (s.includes('math')) {
    return {
      dot: 'bg-indigo-500',
      text: 'text-indigo-700 dark:text-indigo-300',
      chipBg: 'border-indigo-500/25 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
    };
  }
  if (s.includes('bio')) {
    return {
      dot: 'bg-teal-500',
      text: 'text-teal-700 dark:text-teal-300',
      chipBg: 'border-teal-500/25 bg-teal-500/10 text-teal-700 dark:text-teal-300',
    };
  }
  return {
    dot: 'bg-amber-500',
    text: 'text-amber-700 dark:text-amber-300',
    chipBg: 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  };
}

function getKindVisual(kind: TaskKind) {
  if (kind === 'learning') {
    return {
      icon: BookOpen,
      iconWrap: 'bg-sky-500/12 text-sky-600 dark:text-sky-400 border-sky-500/25',
      labelColor: 'text-sky-600 dark:text-sky-400',
    };
  }
  if (kind === 'practice') {
    return {
      icon: Zap,
      iconWrap: 'bg-amber-500/12 text-amber-600 dark:text-amber-400 border-amber-500/25',
      labelColor: 'text-amber-600 dark:text-amber-400',
    };
  }
  return {
    icon: Sparkles,
    iconWrap: 'bg-violet-500/12 text-violet-600 dark:text-violet-400 border-violet-500/25',
    labelColor: 'text-violet-600 dark:text-violet-400',
  };
}

function getHorizonStyles(days: number) {
  switch (days) {
    case 1:
      return 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300 hover:bg-rose-500/15';
    case 3:
      return 'border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/15';
    case 7:
      return 'border-sky-500/35 bg-sky-500/10 text-sky-700 dark:text-sky-300 hover:bg-sky-500/15';
    case 14:
      return 'border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15';
    case 21:
      return 'border-indigo-500/35 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/15';
    default:
      return 'border-violet-500/35 bg-violet-500/10 text-violet-700 dark:text-violet-300 hover:bg-violet-500/15';
  }
}

function getHorizonActiveStyles(days: number) {
  switch (days) {
    case 1:
      return 'bg-rose-600 text-white border-rose-600 shadow-sm';
    case 3:
      return 'bg-amber-600 text-white border-amber-600 shadow-sm';
    case 7:
      return 'bg-sky-600 text-white border-sky-600 shadow-sm';
    case 14:
      return 'bg-emerald-600 text-white border-emerald-600 shadow-sm';
    case 21:
      return 'bg-indigo-600 text-white border-indigo-600 shadow-sm';
    default:
      return 'bg-violet-600 text-white border-violet-600 shadow-sm';
  }
}

function EmptyRoadmap() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6 sm:py-28 font-sans">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-500">
        <Compass size={22} />
      </div>
      <p className="mt-4 text-xs font-mono uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-bold">
        Recovery Route
      </p>
      <h1 className="font-display mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
        Your recovery journey starts with one honest plan.
      </h1>
      <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground leading-relaxed">
        Choose the chapters, study hours, and exam runway that fit your week. BacklogOS turns them into a visual day-by-day route.
      </p>
      <div className="mt-6 flex justify-center gap-3 font-mono text-xs">
        <Link
          href="/onboarding"
          className="focus-ring inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-600 px-5 py-2.5 font-bold text-white hover:opacity-95 transition shadow-sm"
          data-testid="link-empty-create-plan"
        >
          Create Recovery Plan <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}

function ProgressRing({ progress, isEmergency }: { progress: number; isEmergency: boolean }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  const strokeColor =
    progress === 100
      ? 'stroke-emerald-500'
      : isEmergency
      ? 'stroke-rose-500'
      : 'stroke-sky-500';

  return (
    <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
      <svg className="h-24 w-24 -rotate-90" viewBox="0 0 88 88" aria-hidden="true">
        <circle
          cx="44"
          cy="44"
          r={radius}
          fill="none"
          strokeWidth="7"
          className="stroke-muted/70"
        />
        <circle
          cx="44"
          cy="44"
          r={radius}
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={`${strokeColor} transition-all duration-700 ease-out`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-mono tabular-nums text-lg font-extrabold text-foreground leading-none">
          {progress}%
        </span>
        <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mt-0.5">
          {progress === 100 ? 'Mastered' : 'Cleared'}
        </span>
      </div>
    </div>
  );
}

function TaskBlock({
  task,
  done,
  onToggle,
}: {
  task: PlanTask;
  done: boolean;
  onToggle: () => void;
}) {
  const kindMeta = getKindVisual(task.kind);
  const KindIcon = kindMeta.icon;
  const subjectAccent = getSubjectAccent(task.subject);

  return (
    <label
      className={`group flex min-w-0 cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-all duration-150 ${
        done
          ? 'border-emerald-500/25 bg-emerald-500/5 opacity-75'
          : 'border-border/80 bg-card hover:border-sky-500/40 hover:bg-muted/25'
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
        className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-all duration-150 ${
          done
            ? 'border-emerald-500 bg-emerald-500 text-white shadow-xs animate-spring-pop'
            : 'border-border bg-background group-hover:border-sky-500'
        }`}
      >
        {done && <Check size={12} strokeWidth={3} />}
      </span>

      <div className={`hidden sm:flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${kindMeta.iconWrap}`}>
        <KindIcon size={14} />
      </div>

      <span className="min-w-0 flex-1 space-y-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
          <span className={`font-mono text-[10px] font-bold uppercase tracking-wider ${kindMeta.labelColor}`}>
            {kindLabels[task.kind] || 'Focus'}
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="inline-flex items-center gap-1 font-mono text-[11px] font-medium text-muted-foreground">
            <span className={`h-1.5 w-1.5 rounded-full ${subjectAccent.dot}`} />
            {task.subject}
          </span>
          {task.isPrerequisite && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="font-mono text-[10px] font-semibold uppercase text-amber-600 dark:text-amber-400">
                Foundation First
              </span>
            </>
          )}
        </span>

        <span
          className={`block text-sm font-semibold leading-snug ${
            done ? 'line-through text-muted-foreground' : 'text-foreground'
          }`}
        >
          {task.label}
        </span>

        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1 text-foreground/80 font-semibold tabular-nums">
            <Clock size={11} className="text-sky-500" />
            {task.minutes}m
          </span>
          <span>·</span>
          <span className="truncate">{task.detail}</span>
        </span>
      </span>
    </label>
  );
}

function DayMilestoneCard({
  day,
  isCurrentStop,
  isLast,
  completed,
  forceExpanded,
  onToggle,
}: {
  day: PlanDay;
  isCurrentStop: boolean;
  isLast: boolean;
  completed: Set<string>;
  forceExpanded?: boolean;
  onToggle: (taskId: string) => void;
}) {
  const [open, setOpen] = useState(isCurrentStop || day.day === 1);

  useEffect(() => {
    if (forceExpanded) setOpen(true);
  }, [forceExpanded]);

  const dayTasks = Array.isArray(day.tasks) ? day.tasks : [];
  const doneCount = dayTasks.filter((task) => completed.has(task.id)).length;
  const totalCount = dayTasks.length;
  const dayComplete = totalCount > 0 && doneCount === totalCount;
  const dayPercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const dayTotalMins = dayTasks.reduce((sum, t) => sum + (Number(t.minutes) || 0), 0);

  const primaryAccent = getSubjectAccent(day.subject);
  const secondaryAccent = day.secondarySubject ? getSubjectAccent(day.secondarySubject) : null;

  return (
    <div id={`roadmap-day-${day.day}`} className="relative flex gap-3 sm:gap-5">
      {/* Left Vertical Milestone Rail */}
      <div className="flex flex-col items-center pt-5">
        <div
          className={`relative z-10 flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full border-2 font-mono text-xs font-bold transition-all ${
            dayComplete
              ? 'border-emerald-500 bg-emerald-500 text-white shadow-sm shadow-emerald-500/25'
              : isCurrentStop
              ? 'border-sky-500 bg-sky-500 text-white shadow-md shadow-sky-500/25 ring-4 ring-sky-500/15'
              : 'border-border bg-card text-muted-foreground'
          }`}
        >
          {dayComplete ? <Check size={16} strokeWidth={3} /> : `${day.day}`.padStart(2, '0')}
        </div>

        {!isLast && (
          <div
            className={`mt-2 w-[2px] flex-1 rounded-full ${
              dayComplete
                ? 'bg-emerald-500/50'
                : isCurrentStop
                ? 'bg-gradient-to-b from-sky-500/60 to-border'
                : 'bg-border/70'
            }`}
          />
        )}
      </div>

      {/* Milestone Card */}
      <article
        className={`flex-1 min-w-0 mb-4 rounded-2xl border transition-all duration-200 ${
          dayComplete
            ? 'border-emerald-500/35 bg-emerald-500/[0.03]'
            : isCurrentStop
            ? 'border-sky-500/45 bg-card shadow-sm ring-1 ring-sky-500/15'
            : 'border-border bg-card hover:border-foreground/25'
        }`}
        data-testid={`card-day-${day.day}`}
      >
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="focus-ring flex w-full min-w-0 items-start sm:items-center justify-between gap-3 p-4 sm:p-5 text-left"
          aria-expanded={open}
          data-testid={`button-toggle-day-${day.day}`}
        >
          <div className="min-w-0 flex-1 space-y-2">
            {/* Typographic Metadata Line (Zero Pill Boxes) */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-mono">
              <span
                className={`font-bold uppercase tracking-wider ${
                  dayComplete
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : isCurrentStop
                    ? 'text-sky-600 dark:text-sky-400'
                    : 'text-muted-foreground'
                }`}
              >
                {dayComplete
                  ? '✓ Day Mastered'
                  : isCurrentStop
                  ? '● Current Stop'
                  : `Stop ${day.day}`}
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground uppercase">
                {day.dayOfWeekLabel ? `${day.dayOfWeekLabel} · ` : ''}Day {day.day}
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground tabular-nums">{dayTotalMins} min</span>
              {day.isPrerequisite && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">Prerequisite First</span>
                </>
              )}
              {day.isRecap && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-violet-600 dark:text-violet-400 font-semibold">Consolidation</span>
                </>
              )}
            </div>

            {/* Day Title */}
            <h2 className="font-display text-base sm:text-lg font-bold tracking-tight text-foreground leading-snug">
              {day.theme}
            </h2>

            {/* Colorful Subject Pairing + Day Progress Bar */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-0.5">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={`inline-flex items-center gap-1.5 font-medium ${primaryAccent.text}`}>
                  <span className={`h-2 w-2 rounded-full ${primaryAccent.dot}`} />
                  <span>{day.subject}: {day.chapterTitle}</span>
                </span>
                {day.secondaryChapterTitle && secondaryAccent && (
                  <>
                    <span className="text-muted-foreground">+</span>
                    <span className={`inline-flex items-center gap-1.5 font-medium ${secondaryAccent.text}`}>
                      <span className={`h-2 w-2 rounded-full ${secondaryAccent.dot}`} />
                      <span>{day.secondarySubject}: {day.secondaryChapterTitle}</span>
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 ml-auto shrink-0">
                <div className="w-20 sm:w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      dayComplete ? 'bg-emerald-500' : 'bg-gradient-to-r from-sky-500 to-indigo-500'
                    }`}
                    style={{ width: `${dayPercent}%` }}
                  />
                </div>
                <span className="font-mono tabular-nums text-[11px] font-semibold text-muted-foreground">
                  {doneCount}/{totalCount}
                </span>
              </div>
            </div>
          </div>

          <ChevronDown
            size={18}
            className={`shrink-0 mt-1 sm:mt-0 text-muted-foreground transition-transform duration-200 ${
              open ? 'rotate-180 text-foreground' : ''
            }`}
          />
        </button>

        {open && (
          <div className="px-4 pb-5 sm:px-5 sm:pb-5 space-y-4 border-t border-border/70 pt-4 animate-in fade-in duration-150">
            {/* Chapter Focus Room Quick Launch Strip */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/study?chapter=${day.chapterId}`}
                  className={`focus-ring inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-mono font-semibold transition hover:opacity-90 ${primaryAccent.chipBg}`}
                  data-testid={`link-study-day-${day.day}`}
                >
                  <Play size={11} className="fill-current" />
                  <span>Study {day.subject}: {day.chapterTitle}</span>
                </Link>

                {day.secondaryChapterId && day.secondaryChapterTitle && day.secondaryChapterId !== day.chapterId && (
                  <Link
                    href={`/study?chapter=${day.secondaryChapterId}`}
                    className={`focus-ring inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-mono font-semibold transition hover:opacity-90 ${
                      secondaryAccent?.chipBg || 'border-border bg-muted/40 text-foreground'
                    }`}
                    data-testid={`link-secondary-study-day-${day.day}`}
                  >
                    <Play size={11} className="fill-current" />
                    <span>Study {day.secondarySubject || 'Next'}: {day.secondaryChapterTitle}</span>
                  </Link>
                )}
              </div>

              {day.rhythmBadge && (
                <span className="text-[11px] font-mono text-muted-foreground">
                  {day.rhythmBadge}
                </span>
              )}
            </div>

            {/* Study Sprint Blocks */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground block">
                Today&apos;s Recovery Blocks
              </span>
              <div className="space-y-2">
                {dayTasks.map((task) => (
                  <TaskBlock
                    key={task.id}
                    task={task}
                    done={completed.has(task.id)}
                    onToggle={() => onToggle(task.id)}
                  />
                ))}
              </div>
            </div>

            {/* NCERT Subtopics Clearing Checklist */}
            <div className="pt-1 space-y-3">
              <ChapterSubtopicsCard
                chapterId={day.chapterId}
                chapterTitle={day.chapterTitle}
                subject={day.subject}
                compact
              />
              {day.secondaryChapterId && day.secondaryChapterTitle && day.secondaryChapterId !== day.chapterId && (
                <ChapterSubtopicsCard
                  chapterId={day.secondaryChapterId}
                  chapterTitle={day.secondaryChapterTitle}
                  subject={day.secondarySubject || 'Secondary Focus'}
                  compact
                />
              )}
            </div>
          </div>
        )}
      </article>
    </div>
  );
}

export function Roadmap() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [plan, setPlan] = useState<StudentPlan | null>(() => readPlan(user?.uid));
  const [completedIds, setCompletedIds] = useState<string[]>(() => readCompleted(user?.uid));
  const [focusedDay, setFocusedDay] = useState<number | null>(null);

  useEffect(() => {
    setPlan(readPlan(user?.uid));
    setCompletedIds(readCompleted(user?.uid));
  }, [user?.uid]);

  useEffect(() => {
    const handleUpdate = () => {
      setPlan(readPlan(user?.uid));
      setCompletedIds(readCompleted(user?.uid));
    };
    window.addEventListener('backlogos-plan-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('backlogos-plan-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [user?.uid]);

  const completed = useMemo(() => new Set(completedIds), [completedIds]);
  const planDays = Array.isArray(plan?.days) ? plan.days : [];
  const allTasks = planDays.flatMap((day) => (Array.isArray(day?.tasks) ? day.tasks : []));
  const completedCount = completedIds.filter((id) => allTasks.some((task) => task.id === id)).length;
  const progress = allTasks.length ? Math.round((completedCount / allTasks.length) * 100) : 0;

  const toggleTask = (id: string) => {
    const isNowCompleted = !completedIds.includes(id);
    const next = isNowCompleted ? [...completedIds, id] : completedIds.filter((taskId) => taskId !== id);
    setCompletedIds(next);
    saveCompleted(next, user?.uid);

    if (user?.uid && !user.isGuest) {
      if (isNowCompleted) {
        saveCompletedTaskDirect(id, user.uid).catch(() => {});
      } else {
        removeCompletedTaskDirect(id, user.uid).catch(() => {});
      }
    }

    if (isNowCompleted) {
      if (allTasks.length > 0 && next.length === allTasks.length) {
        triggerGrandCelebration();
      } else {
        triggerTaskCelebration();
      }
    }
  };

  const resetProgress = () => {
    if (window.confirm('Reset checkmarks for this plan?')) {
      setCompletedIds([]);
      saveCompleted([], user?.uid);
    }
  };

  const startOver = () => {
    if (window.confirm('Delete this plan and start over?')) {
      clearStoredPlan(user?.uid);
      if (user?.uid && !user.isGuest) {
        deleteStudyPlanDirect(user.uid).catch(() => {});
      }
      setPlan(null);
      setCompletedIds([]);
      setLocation('/onboarding');
    }
  };

  const switchPlanDuration = (newDays: PlanDuration) => {
    if (!plan) return;
    const resolvedIds =
      plan.chapterIds && plan.chapterIds.length > 0
        ? plan.chapterIds
        : plan.plannedChapterIds && plan.plannedChapterIds.length > 0
        ? plan.plannedChapterIds
        : plan.days
        ? Array.from(new Set(plan.days.map((d) => d.chapterId)))
        : ['phy-units'];

    const minutes = plan.minutesPerDay || ((plan as any).hoursPerDay ? (plan as any).hoursPerDay * 60 : 240);

    const updated = makePlan({
      board: plan.board || 'CBSE Class 12',
      subjects: plan.subjects || ['Physics', 'Chemistry', 'Mathematics'],
      chapterIds: resolvedIds,
      minutesPerDay: minutes,
      goal: plan.goal || 'Complete Backlog Recovery',
      priority: plan.priority || 'backlog recovery',
      confidence: plan.confidence || 'mixed',
      examDate: plan.examDate || '',
      planDuration: newDays,
    });
    setPlan(updated);
    savePlan(updated, user?.uid);
    if (user?.uid && !user.isGuest) {
      saveStudyPlanDirect(updated, user.uid).catch(() => {});
    }
  };

  if (!plan) return <EmptyRoadmap />;

  const resolvedChapterIds =
    plan.chapterIds && plan.chapterIds.length > 0
      ? plan.chapterIds
      : plan.plannedChapterIds && plan.plannedChapterIds.length > 0
      ? plan.plannedChapterIds
      : plan.days
      ? Array.from(new Set(plan.days.map((d) => d.chapterId)))
      : [];

  const selectedChapters = resolvedChapterIds
    .map((id) => chapters.find((chapter) => chapter.id === id))
    .filter((chapter): chapter is (typeof chapters)[0] => Boolean(chapter));

  const currentDuration = plan.planDuration || (planDays.length as PlanDuration) || 7;
  const isEmergency = currentDuration === 1;

  // Determine first incomplete day ("Current Stop") and next study chapter
  const currentStopDay =
    planDays.find((d) => (Array.isArray(d?.tasks) ? d.tasks : []).some((t) => !completed.has(t.id)))?.day ?? planDays[0]?.day ?? 1;
  const currentStopObj = planDays.find((d) => d.day === currentStopDay) || planDays[0];
  const completedDaysCount = planDays.filter((d) => {
    const tasks = Array.isArray(d?.tasks) ? d.tasks : [];
    return tasks.length > 0 && tasks.every((t) => completed.has(t.id));
  }).length;
  const totalSprintHours = Math.round(
    (allTasks.reduce((acc, t) => acc + (Number(t.minutes) || 0), 0) / 60) * 10
  ) / 10;

  const jumpToDay = (dayNum: number) => {
    setFocusedDay(dayNum);
    const el = document.getElementById(`roadmap-day-${dayNum}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 space-y-6 font-sans animate-page-enter">
      {/* Eye-Catching Visual Recovery Hero Banner */}
      <section
        className={`relative overflow-hidden rounded-2xl border p-5 sm:p-7 shadow-xs ${
          isEmergency
            ? 'border-rose-500/40 bg-gradient-to-br from-rose-500/10 via-card to-amber-500/5'
            : 'border-border bg-gradient-to-br from-sky-500/[0.07] via-card to-emerald-500/[0.07]'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-5 border-b border-border/70">
          {/* Left: Ring + Headline */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <ProgressRing progress={progress} isEmergency={isEmergency} />

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-wider">
                <span className={`font-bold ${isEmergency ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {isEmergency ? '🚨 1-Day Emergency Triage' : `${currentDuration}-Day Visual Route`}
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">{plan.board}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">{plan.goal}</span>
              </div>

              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {isEmergency
                  ? 'Emergency Triage: High-Yield Finish'
                  : progress === 100
                  ? 'Entire Recovery Route Completed!'
                  : 'Your Visual Syllabus Recovery Map'}
              </h1>

              <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
                {plan.coverageNote || 'Every day pairs manageable study blocks so backlog clears steadily without burnout.'}
              </p>
            </div>
          </div>

          {/* Right: Clean Utility Controls */}
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs shrink-0 self-start lg:self-center">
            {currentStopObj && (
              <Link
                href={`/study?chapter=${currentStopObj.chapterId}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 px-3.5 py-2 font-bold text-white shadow-xs transition active:scale-95"
              >
                <Play size={12} className="fill-current" />
                <span>Resume Day {currentStopDay}</span>
              </Link>
            )}
            <Link
              href="/dashboard"
              className="rounded-lg border border-border bg-card px-3 py-2 text-foreground hover:bg-muted transition flex items-center gap-1"
              data-testid="link-roadmap-dashboard"
            >
              <span>Dashboard</span>
              <ArrowRight size={12} />
            </Link>
            <Link
              href="/onboarding"
              className="rounded-lg border border-border bg-card px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted transition"
              data-testid="link-edit-plan"
            >
              Edit Plan
            </Link>
            <button
              type="button"
              onClick={resetProgress}
              className="rounded-lg border border-border bg-card px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted transition flex items-center gap-1"
              data-testid="button-reset-progress"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
            <button
              type="button"
              onClick={startOver}
              className="rounded-lg border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-500/15 transition"
              data-testid="button-start-over"
            >
              Start over
            </button>
          </div>
        </div>

        {/* Route Telemetry Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-b border-border/70 font-mono">
          <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-3">
            <span className="text-[10px] uppercase text-sky-700 dark:text-sky-300 font-semibold flex items-center gap-1.5">
              <Clock size={12} className="text-sky-500" />
              Daily Study Pace
            </span>
            <span className="mt-1 block text-lg font-bold text-foreground tabular-nums">
              {plan.minutesPerDay} min/day
            </span>
          </div>

          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3">
            <span className="text-[10px] uppercase text-indigo-700 dark:text-indigo-300 font-semibold flex items-center gap-1.5">
              <Zap size={12} className="text-indigo-500" />
              Route Volume
            </span>
            <span className="mt-1 block text-lg font-bold text-foreground tabular-nums">
              {totalSprintHours} hrs total
            </span>
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
            <span className="text-[10px] uppercase text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1.5">
              <Flame size={12} className="text-emerald-500" />
              Milestones Done
            </span>
            <span className="mt-1 block text-lg font-bold text-foreground tabular-nums">
              {completedDaysCount} / {planDays.length} days
            </span>
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
            <span className="text-[10px] uppercase text-amber-700 dark:text-amber-300 font-semibold flex items-center gap-1.5">
              <Target size={12} className="text-amber-500" />
              Chapters Queued
            </span>
            <span className="mt-1 block text-lg font-bold text-foreground tabular-nums">
              {selectedChapters.length} units
            </span>
          </div>
        </div>

        {/* Vibrant Recovery Horizon Switcher */}
        <div className="pt-4 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
              <Calendar size={12} className="text-sky-500" />
              Switch Recovery Horizon
            </span>
            <span className="text-[11px] font-mono text-muted-foreground">
              Active Track: <strong className="text-foreground">{currentDuration} {currentDuration === 1 ? 'Day' : 'Days'}</strong>
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {PLAN_DURATION_OPTIONS.map((opt) => {
              const active = currentDuration === opt.days;
              const isRescue = opt.days === 1;

              return (
                <button
                  key={opt.days}
                  type="button"
                  onClick={() => switchPlanDuration(opt.days)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition flex items-center gap-1.5 border font-semibold cursor-pointer ${
                    active ? getHorizonActiveStyles(opt.days) : getHorizonStyles(opt.days)
                  }`}
                  data-testid={`button-plan-duration-${opt.days}`}
                >
                  {isRescue && <ShieldAlert size={12} />}
                  <span>{opt.days}D</span>
                  <span className="text-[10px] opacity-85 font-normal">· {opt.badge}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Interactive Visual Milestone Jump Strip */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-2xs">
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Compass size={13} className="text-emerald-500" />
            Route Stops — Click any day to jump directly
          </span>
          <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
            {completedCount} of {allTasks.length} blocks checked
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {planDays.map((day) => {
            const dTasks = Array.isArray(day?.tasks) ? day.tasks : [];
            const done = dTasks.length > 0 && dTasks.every((t) => completed.has(t.id));
            const partial = dTasks.some((t) => completed.has(t.id)) && !done;
            const isCurrent = day.day === currentStopDay;
            return (
              <button
                key={day.day}
                type="button"
                onClick={() => jumpToDay(day.day)}
                className={`shrink-0 flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-mono transition cursor-pointer ${
                  done
                    ? 'border-emerald-500/40 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 font-bold'
                    : isCurrent
                    ? 'border-sky-500 bg-sky-500/15 text-sky-700 dark:text-sky-300 font-bold ring-1 ring-sky-500/30'
                    : partial
                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                    : 'border-border bg-muted/25 text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                    done
                      ? 'bg-emerald-500 text-white'
                      : isCurrent
                      ? 'bg-sky-500 text-white'
                      : 'bg-background border border-border text-foreground'
                  }`}
                >
                  {done ? <Check size={11} strokeWidth={3} /> : day.day}
                </span>
                <span className="truncate max-w-[110px]">
                  Day {day.day} · {(day.subject || 'Core').slice(0, 4)}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Main Connected Vertical Journey + Sticky Route Guide */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <div className="min-w-0">
          {planDays.map((day, idx) => (
            <DayMilestoneCard
              key={day.day}
              day={day}
              isCurrentStop={day.day === currentStopDay}
              isLast={idx === planDays.length - 1}
              completed={completed}
              forceExpanded={focusedDay === day.day}
              onToggle={toggleTask}
            />
          ))}
        </div>

        {/* Sticky Sidebar: Route Insights & Chapter Launchpad */}
        <aside className="space-y-4 lg:sticky lg:top-20 font-sans">
          <section
            className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-2xs"
            data-testid="card-progress"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
                  Route Progress
                </span>
                <span className="font-mono tabular-nums text-2xl font-extrabold text-foreground">
                  {progress}%
                </span>
              </div>
              <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">
                {completedCount}/{allTasks.length} steps
              </span>
            </div>

            <div className="h-2 w-full bg-muted overflow-hidden rounded-full">
              <div
                className="h-full bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-500 transition-all duration-500 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {progress === 100
                ? 'You cleared every stop on this recovery route!'
                : progress > 0
                ? `Currently on Day ${currentStopDay}. Check off blocks as you finish in the Focus Room.`
                : 'Open Day 1 below and finish your first learning sprint.'}
            </p>
          </section>

          {/* Ordering Logic */}
          <section className="rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.04] p-4 space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-bold block">
              Why This Sequence Works
            </span>
            <p className="text-xs text-foreground/90 leading-relaxed">{plan.orderReason}</p>
          </section>

          {/* Queued Chapters Quick Focus Launchpad */}
          <section className="rounded-2xl border border-border bg-card p-4 space-y-2.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold block">
              Units on This Route ({selectedChapters.length})
            </span>
            <div className="divide-y divide-border/50 max-h-64 overflow-y-auto pr-1">
              {selectedChapters.map((chapter) => {
                const accent = getSubjectAccent(chapter.subject);
                return (
                  <Link
                    key={chapter.id}
                    href={`/study?chapter=${chapter.id}`}
                    className="group flex items-center justify-between gap-2 py-2 text-xs hover:text-sky-600 dark:hover:text-sky-400 transition"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className={`h-2 w-2 rounded-full shrink-0 ${accent.dot}`} />
                      <span className="truncate font-medium text-foreground group-hover:text-sky-600 dark:group-hover:text-sky-400">
                        {chapter.title}
                      </span>
                    </span>
                    <ArrowRight size={12} className="shrink-0 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
                  </Link>
                );
              })}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
