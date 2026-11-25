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
  ShieldCheck,
  Sparkles,
  Target,
  Timer,
  X,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'wouter';
import {
  buildDefaultPlanName,
  isPlanTaskCompleted,
  kindLabels,
  makePlan,
  PLAN_DURATION_OPTIONS,
  resolveChapterById,
  resolvePlanTaskId,
  type Chapter,
  type PlanDay,
  type PlanDuration,
  type PlanTask,
  type StudentPlan,
  type TaskKind,
} from '@/lib/backlog-data';
import {
  clearStoredPlan,
  readCompleted,
  readPlan,
  readVerifiedTasks,
  saveCompleted,
  savePlan,
  saveVerifiedTasks,
} from '@/lib/storage';
import { ChapterTopicsInline } from '@/components/ChapterSubtopicsCard';
import { BaxContextualSlot } from '@/components/bax/BaxMascot';
import { getChapterSubtopics, readClearedSubtopics } from '@/lib/ncert-subtopics';
import { VerificationQuizRunner } from '@/components/VerificationQuizRunner';
import { triggerGrandCelebration, triggerTaskCelebration } from '@/lib/celebration';
import { useAuth } from '@/lib/auth-context';
import { useEnginesWorkspace } from '@/hooks/use-engines-workspace';
import {
  addDaysToIsoDate,
  formatIsoDate,
  isoTimestampToLocalDate,
} from '@/lib/engines/planning-engine';
import type { ChapterMasteryStatus } from '@/lib/engines/types';
import {
  clearAllCompletedTasksDirect,
  deleteStudyPlanDirect,
  emitSyncStatus,
  removeCompletedTaskDirect,
  saveCompletedTaskDirect,
  saveStudyPlanDirect,
  saveWorkspaceStateDirect,
} from '@/lib/supabase-service';


function resolveDayTaskChapterContext(
  day: PlanDay,
  task: PlanTask
): { chapterId: string; chapterTitle: string } {
  if (
    day.secondaryChapterId &&
    day.secondarySubject &&
    task.subject.toLowerCase() === day.secondarySubject.toLowerCase()
  ) {
    return {
      chapterId: day.secondaryChapterId,
      chapterTitle: day.secondaryChapterTitle || day.chapterTitle,
    };
  }
  return {
    chapterId: day.chapterId,
    chapterTitle: day.chapterTitle,
  };
}

function getDayDeadlineMs(scheduledIso: string): number {
  const [y, m, d] = scheduledIso.split('-').map((n) => Number(n));
  if (!y || !m || !d) return Date.now();
  return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
}

function formatDayCountdown(msLeft: number): {
  expired: boolean;
  days: number;
  hours: string;
  minutes: string;
  seconds: string;
  compact: string;
} {
  if (msLeft <= 0) {
    return { expired: true, days: 0, hours: '00', minutes: '00', seconds: '00', compact: '0m left' };
  }
  const totalSec = Math.floor(msLeft / 1000);
  const days = Math.floor(totalSec / 86400);
  const hrs = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  const hStr = String(hrs).padStart(2, '0');
  const mStr = String(mins).padStart(2, '0');
  const sStr = String(secs).padStart(2, '0');
  const compact =
    days > 0 ? `${days}d ${hrs}h` : hrs > 0 ? `${hrs}h ${mStr}m` : `${mins}m ${sStr}s`;
  return { expired: false, days, hours: hStr, minutes: mStr, seconds: sStr, compact };
}

function formatScheduleDayHint(scheduledIso: string, todayIso: string): string {
  if (scheduledIso === todayIso) return 'Ends Today · 11:59 PM';
  if (scheduledIso === addDaysToIsoDate(todayIso, 1)) return 'Ends Tomorrow · 11:59 PM';
  const [y, m, d] = scheduledIso.split('-').map((n) => Number(n));
  if (!y || !m || !d) return scheduledIso;
  const dt = new Date(y, m - 1, d, 12, 0, 0);
  return `Ends ${dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · 11:59 PM`;
}

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
      iconWrap: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25',
      labelColor: 'text-blue-700 dark:text-blue-400',
      blockSurface: 'border-border bg-card hover:border-blue-500/40',
      typeName: 'Learning',
    };
  }
  if (kind === 'practice') {
    return {
      icon: Zap,
      iconWrap: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/25',
      labelColor: 'text-violet-700 dark:text-violet-400',
      blockSurface: 'border-border bg-slate-50/70 dark:bg-slate-900/40 hover:border-violet-500/40',
      typeName: 'Practice',
    };
  }
  return {
    icon: Sparkles,
    iconWrap: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/25',
    labelColor: 'text-indigo-700 dark:text-indigo-400',
    blockSurface: 'border-border bg-card hover:border-indigo-500/40',
    typeName: 'Recall',
  };
}

function formatChapterMasteryLabel(status?: ChapterMasteryStatus): {
  label: string;
  tone: string;
} {
  switch (status) {
    case 'MASTERED':
      return { label: 'Mastered', tone: 'text-indigo-700 dark:text-indigo-300' };
    case 'STUDY_COMPLETE':
    case 'MASTERY_PENDING':
      return { label: 'Studied · Unverified', tone: 'text-blue-700 dark:text-blue-300' };
    case 'NEEDS_REVISION':
      return { label: 'Needs Revision', tone: 'text-amber-700 dark:text-amber-400' };
    case 'IN_PROGRESS':
      return { label: 'In Progress', tone: 'text-foreground/75' };
    default:
      return { label: 'Queued', tone: 'text-muted-foreground' };
  }
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
        Choose the chapters, daily focus window, and exam runway that fit your week. BacklogOS turns them into a visual day-by-day route.
      </p>
      <div className="mt-6 flex justify-center gap-3 font-mono text-xs">
        <Link
          href="/onboarding?reset=true"
          className="focus-ring inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 font-bold text-white transition shadow-sm"
          data-testid="link-empty-create-plan"
        >
          Create Recovery Plan <ArrowRight size={14} />
        </Link>
        <Link
          href="/plans"
          className="focus-ring inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 font-semibold text-foreground hover:bg-muted transition"
          data-testid="link-empty-view-plans"
        >
          All Plans
        </Link>
      </div>
    </div>
  );
}

function ProgressRing({
  progress,
  allVerified,
  isEmergency,
}: {
  progress: number;
  allVerified: boolean;
  isEmergency: boolean;
}) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  const strokeColor = allVerified
    ? 'stroke-indigo-600'
    : isEmergency
    ? 'stroke-rose-500'
    : 'stroke-blue-600';

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
          className={`${strokeColor} transition-all duration-500 ease-out`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-mono tabular-nums text-lg font-extrabold text-foreground leading-none">
          {progress}%
        </span>
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mt-0.5">
          {allVerified ? 'Mastered' : 'Studied'}
        </span>
      </div>
    </div>
  );
}

function TaskBlock({
  task,
  chapterId,
  done,
  verified,
  isActiveTask,
  topicSummary,
  onToggle,
  onVerifyNow,
  attachedTopics,
}: {
  task: PlanTask;
  chapterId: string;
  done: boolean;
  verified: boolean;
  isActiveTask: boolean;
  topicSummary?: { cleared: number; total: number } | null;
  onToggle: () => void;
  onVerifyNow: () => void;
  attachedTopics?: ReactNode;
}) {
  const kindMeta = getKindVisual(task.kind);
  const KindIcon = kindMeta.icon;
  const subjectAccent = getSubjectAccent(task.subject);
  const [expanded, setExpanded] = useState<boolean>(
    () => isActiveTask || (!done && task.kind === 'learning')
  );

  useEffect(() => {
    if (isActiveTask && !done) {
      setExpanded(true);
    } else if (done) {
      setExpanded(false);
    }
  }, [isActiveTask, done]);

  return (
    <div
      className={`group rounded-xl border transition-all duration-150 ${
        isActiveTask && !done
          ? 'border-indigo-500/50 bg-card ring-1 ring-indigo-500/15 shadow-xs'
          : done
          ? 'border-border/70 bg-muted/25'
          : kindMeta.blockSurface
      }`}
      data-testid={`task-row-${task.id}`}
    >
      <div className="flex min-w-0 items-start gap-3 p-4">
        <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={done}
            onChange={onToggle}
            className="sr-only"
            data-testid={`checkbox-task-${task.id}`}
          />
          <span
            className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors duration-150 ${
              done
                ? verified
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-blue-600 bg-blue-600 text-white'
                : 'border-border bg-background group-hover:border-indigo-500'
            }`}
          >
            {done && <Check size={12} strokeWidth={3} />}
          </span>

          <div
            className={`hidden sm:flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${kindMeta.iconWrap}`}
          >
            <KindIcon size={15} />
          </div>

          <span className="min-w-0 flex-1 space-y-1">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
              <span className={`font-semibold ${kindMeta.labelColor}`}>
                {kindLabels[task.kind] || kindMeta.typeName}
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="inline-flex items-center gap-1.5 font-medium text-foreground/80">
                <span className={`h-1.5 w-1.5 rounded-full ${subjectAccent.dot}`} />
                {task.subject}
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-foreground/75 tabular-nums">
                <Clock size={11} className="text-blue-600 dark:text-blue-400" />
                {task.minutes} min
              </span>
              {topicSummary && topicSummary.total > 0 && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">
                    {topicSummary.cleared}/{topicSummary.total} topics
                  </span>
                </>
              )}
              {isActiveTask && !done && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                    Up Next
                  </span>
                </>
              )}
              {task.isPrerequisite && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="font-medium text-amber-700 dark:text-amber-400">
                    Foundation First
                  </span>
                </>
              )}
              {typeof task.rescheduledFromDay === 'number' && !done && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="font-medium text-amber-700 dark:text-amber-400">
                    Merged from Day {task.rescheduledFromDay}
                  </span>
                </>
              )}
              {done && verified && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-indigo-700 dark:text-indigo-300">
                    <ShieldCheck size={12} />
                    Verified Mastery
                  </span>
                </>
              )}
              {done && !verified && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="font-medium text-blue-700 dark:text-blue-300">
                    Studied (Unverified)
                  </span>
                </>
              )}
            </span>

            <span
              className={`block text-[15px] font-semibold leading-snug ${
                done ? 'line-through text-muted-foreground' : 'text-foreground'
              }`}
            >
              {task.label}
            </span>
          </span>
        </label>

        <div className="flex items-center gap-2 shrink-0 self-start">
          {!done && isActiveTask && (
            <Link
              href={`/study?chapter=${chapterId}`}
              className="hidden sm:inline-flex items-center gap-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white transition whitespace-nowrap"
            >
              <Play size={11} className="fill-current" />
              <span>Study</span>
            </Link>
          )}

          {done && !verified && (
            <button
              type="button"
              onClick={onVerifyNow}
              className="rounded-lg border border-indigo-500/35 bg-indigo-500/8 hover:bg-indigo-500/15 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 transition cursor-pointer whitespace-nowrap"
              data-testid={`button-verify-task-${task.id}`}
            >
              Verify
            </button>
          )}

          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
            aria-label={expanded ? 'Collapse block' : 'Expand block'}
            data-testid={`button-toggle-block-${task.id}`}
            className="rounded-lg border border-border/80 bg-background/70 hover:bg-muted p-1.5 text-muted-foreground hover:text-foreground transition cursor-pointer"
          >
            <ChevronDown
              size={15}
              className={`transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border/60">
          <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-2 bg-muted/15">
            <p className="text-[13px] text-foreground/80 leading-relaxed">
              {task.detail}
            </p>
            {!done && (
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/study?chapter=${chapterId}`}
                  className="sm:hidden inline-flex items-center gap-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-2.5 py-1 text-xs font-semibold text-white transition whitespace-nowrap"
                >
                  <Play size={11} className="fill-current" />
                  <span>Study</span>
                </Link>
                <button
                  type="button"
                  onClick={onVerifyNow}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-card hover:bg-muted px-2.5 py-1 text-xs font-medium text-foreground transition cursor-pointer whitespace-nowrap"
                >
                  <ShieldCheck size={12} className="text-indigo-600 dark:text-indigo-400" />
                  <span>Verify Understanding</span>
                </button>
              </div>
            )}
          </div>
          {attachedTopics}
        </div>
      )}
    </div>
  );
}

function DayMilestoneCard({
  day,
  scheduledDate,
  nowMs,
  planId,
  userId,
  allowLegacyUnscoped,
  isCurrentStop,
  isMissedDay,
  activeTaskId,
  isLast,
  completed,
  verifiedSet,
  forceExpanded,
  rescheduleBusy,
  onRestoreDayOne,
  onTaskClick,
  onVerifyTask,
}: {
  day: PlanDay;
  scheduledDate: string;
  nowMs: number;
  planId?: string;
  userId?: string;
  allowLegacyUnscoped: boolean;
  isCurrentStop: boolean;
  isMissedDay: boolean;
  activeTaskId?: string | null;
  isLast: boolean;
  completed: Set<string>;
  verifiedSet: Set<string>;
  forceExpanded?: boolean;
  rescheduleBusy?: boolean;
  onRestoreDayOne?: () => void;
  onTaskClick: (day: PlanDay, task: PlanTask) => void;
  onVerifyTask: (day: PlanDay, task: PlanTask, initialStep?: 'choose' | 'quiz') => void;
}) {
  const [open, setOpen] = useState(isCurrentStop || day.day === 1);
  const [filterHighYield, setFilterHighYield] = useState(false);
  const [collapsedTopics, setCollapsedTopics] = useState<Record<string, boolean>>({});
  const [clearedMap, setClearedMap] = useState<Record<string, string[]>>(() =>
    readClearedSubtopics(userId)
  );

  useEffect(() => {
    setClearedMap(readClearedSubtopics(userId));
    const onSubtopicsUpdate = () => setClearedMap(readClearedSubtopics(userId));
    window.addEventListener('backlogos-subtopics-updated', onSubtopicsUpdate);
    window.addEventListener('storage', onSubtopicsUpdate);
    return () => {
      window.removeEventListener('backlogos-subtopics-updated', onSubtopicsUpdate);
      window.removeEventListener('storage', onSubtopicsUpdate);
    };
  }, [userId]);

  useEffect(() => {
    if (forceExpanded) setOpen(true);
  }, [forceExpanded]);

  const dayTasks = Array.isArray(day.tasks) ? day.tasks : [];
  const doneCount = dayTasks.filter((task) =>
    isPlanTaskCompleted(completed, planId, task.id, allowLegacyUnscoped)
  ).length;
  const verifiedDayCount = dayTasks.filter((task) =>
    isPlanTaskCompleted(verifiedSet, planId, task.id, allowLegacyUnscoped)
  ).length;
  const totalCount = dayTasks.length;
  const isMergedForwardDay = totalCount === 0;
  const dayComplete = totalCount > 0 && doneCount === totalCount;
  const dayFullyVerified = totalCount > 0 && verifiedDayCount === totalCount;
  const dayPercent = isMergedForwardDay
    ? 100
    : totalCount > 0
    ? Math.round((doneCount / totalCount) * 100)
    : 0;
  const dayTotalMins = dayTasks.reduce((sum, t) => sum + (Number(t.minutes) || 0), 0);
  const dayRemainingMins = dayTasks
    .filter((t) => !isPlanTaskCompleted(completed, planId, t.id, allowLegacyUnscoped))
    .reduce((sum, t) => sum + (Number(t.minutes) || 0), 0);
  const deadlineMs = getDayDeadlineMs(scheduledDate);
  const dayCountdown = formatDayCountdown(deadlineMs - nowMs);

  const dayChapters = useMemo(() => {
    const items: Array<{ chapterId: string; chapterTitle: string; subject: string }> = [
      { chapterId: day.chapterId, chapterTitle: day.chapterTitle, subject: day.subject },
    ];
    if (
      day.secondaryChapterId &&
      day.secondaryChapterTitle &&
      day.secondaryChapterId !== day.chapterId
    ) {
      items.push({
        chapterId: day.secondaryChapterId,
        chapterTitle: day.secondaryChapterTitle,
        subject: day.secondarySubject || 'Secondary Focus',
      });
    }
    return items;
  }, [
    day.chapterId,
    day.chapterTitle,
    day.subject,
    day.secondaryChapterId,
    day.secondaryChapterTitle,
    day.secondarySubject,
  ]);

  const { dayTotalTopics, dayClearedTopics } = useMemo(() => {
    let totalTopics = 0;
    let clearedTopics = 0;
    for (const ch of dayChapters) {
      const subs = getChapterSubtopics(ch.chapterId);
      const cleared = new Set(clearedMap[ch.chapterId] || []);
      totalTopics += subs.length;
      clearedTopics += subs.filter((s) => cleared.has(s.id)).length;
    }
    return { dayTotalTopics: totalTopics, dayClearedTopics: clearedTopics };
  }, [dayChapters, clearedMap]);

  const primaryAccent = getSubjectAccent(day.subject);
  const secondaryAccent = day.secondarySubject ? getSubjectAccent(day.secondarySubject) : null;

  return (
    <div id={`roadmap-day-${day.day}`} className="relative flex gap-3.5 sm:gap-5">
      {/* Left Vertical Milestone Rail */}
      <div className="flex flex-col items-center pt-5">
        <div
          className={`relative z-10 flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full border-2 font-mono text-xs font-bold transition-colors ${
            dayFullyVerified
              ? 'border-indigo-600 bg-indigo-600 text-white'
              : dayComplete || isMergedForwardDay
              ? 'border-blue-600 bg-blue-600 text-white'
              : isCurrentStop
              ? 'border-indigo-600 bg-indigo-600 text-white ring-4 ring-indigo-500/15'
              : isMissedDay
              ? 'border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300'
              : 'border-border bg-card text-muted-foreground'
          }`}
        >
          {dayComplete || isMergedForwardDay ? (
            <Check size={16} strokeWidth={3} />
          ) : (
            `${day.day}`.padStart(2, '0')
          )}
        </div>

        {!isLast && (
          <div
            className={`mt-2 w-[2px] flex-1 rounded-full ${
              dayComplete || isMergedForwardDay
                ? 'bg-blue-500/35'
                : isCurrentStop
                ? 'bg-indigo-500/40'
                : 'bg-border/70'
            }`}
          />
        )}
      </div>

      {/* Milestone Card */}
      <article
        className={`flex-1 min-w-0 mb-5 rounded-xl border transition-all duration-150 ${
          dayComplete || isMergedForwardDay
            ? 'border-border bg-card/75'
            : isCurrentStop
            ? 'border-indigo-500/45 bg-card shadow-sm ring-1 ring-indigo-500/10'
            : isMissedDay
            ? 'border-amber-500/45 bg-card'
            : 'border-border bg-card hover:border-foreground/25'
        }`}
        data-testid={`card-day-${day.day}`}
      >
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="focus-ring flex w-full min-w-0 items-start sm:items-center justify-between gap-4 p-4 sm:p-5 text-left cursor-pointer"
          aria-expanded={open}
          data-testid={`button-toggle-day-${day.day}`}
        >
          <div className="min-w-0 flex-1 space-y-2">
            {/* Typographic Metadata Line */}
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs font-mono">
              <span
                className={`font-semibold uppercase tracking-wider ${
                  dayFullyVerified
                    ? 'text-indigo-700 dark:text-indigo-300'
                    : dayComplete || isMergedForwardDay
                    ? 'text-blue-700 dark:text-blue-300'
                    : isMissedDay
                    ? 'text-amber-700 dark:text-amber-400'
                    : isCurrentStop
                    ? 'text-indigo-700 dark:text-indigo-300'
                    : 'text-muted-foreground'
                }`}
              >
                {dayFullyVerified
                  ? '✓ Mastered'
                  : dayComplete
                  ? '✓ Studied'
                  : isMergedForwardDay
                  ? 'Carried Forward'
                  : isMissedDay
                  ? 'Missed · Overdue'
                  : isCurrentStop
                  ? 'Active Mission'
                  : `Day ${day.day}`}
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">
                {day.dayOfWeekLabel ? `${day.dayOfWeekLabel} · ` : ''}Day {day.day}
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="text-foreground/80 font-medium tabular-nums">
                {isMergedForwardDay
                  ? 'Merged to upcoming days'
                  : dayComplete
                  ? `${dayTotalMins} min total`
                  : `${dayRemainingMins} min study left`}
              </span>
              {!dayComplete && !isMergedForwardDay && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span
                    className={`inline-flex items-center gap-1 font-semibold tabular-nums ${
                      dayCountdown.expired
                        ? 'text-amber-700 dark:text-amber-400'
                        : dayCountdown.days === 0
                        ? 'text-blue-700 dark:text-blue-300'
                        : 'text-muted-foreground'
                    }`}
                  >
                    <Timer size={11} />
                    <span>
                      {dayCountdown.expired ? 'Window ended' : `${dayCountdown.compact} left`}
                    </span>
                  </span>
                </>
              )}
              {day.isPrerequisite && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-amber-700 dark:text-amber-400 font-semibold">
                    Prerequisite First
                  </span>
                </>
              )}
              {day.isRecap && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-violet-700 dark:text-violet-400 font-semibold">
                    Consolidation
                  </span>
                </>
              )}
            </div>

            {/* Day Title */}
            <h2 className="font-display text-base sm:text-lg font-bold tracking-tight text-foreground leading-snug">
              {day.theme}
            </h2>

            {/* Subject Pairing + Progress Bar */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-0.5">
              <div className="flex flex-wrap items-center gap-2 text-[13px]">
                <span className={`inline-flex items-center gap-1.5 font-medium ${primaryAccent.text}`}>
                  <span className={`h-2 w-2 rounded-full ${primaryAccent.dot}`} />
                  <span>
                    {day.subject}: {day.chapterTitle}
                  </span>
                </span>
                {day.secondaryChapterTitle && secondaryAccent && (
                  <>
                    <span className="text-muted-foreground">+</span>
                    <span className={`inline-flex items-center gap-1.5 font-medium ${secondaryAccent.text}`}>
                      <span className={`h-2 w-2 rounded-full ${secondaryAccent.dot}`} />
                      <span>
                        {day.secondarySubject}: {day.secondaryChapterTitle}
                      </span>
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2.5 ml-auto shrink-0">
                <div className="w-24 sm:w-28 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      dayFullyVerified
                        ? 'bg-indigo-600'
                        : dayComplete
                        ? 'bg-blue-600'
                        : 'bg-indigo-600'
                    }`}
                    style={{ width: `${dayPercent}%` }}
                  />
                </div>
                <span className="font-mono tabular-nums text-xs font-semibold text-foreground/80">
                  {doneCount}/{totalCount}
                </span>
              </div>
            </div>
          </div>

          <ChevronDown
            size={18}
            className={`shrink-0 mt-1 sm:mt-0 text-muted-foreground transition-transform duration-150 ${
              open ? 'rotate-180 text-foreground' : ''
            }`}
          />
        </button>

        {open && (
          <div className="px-4 pb-5 sm:px-5 sm:pb-6 space-y-4 border-t border-border/70 pt-4 animate-in fade-in duration-150">
            {/* Chapter Focus Room Quick Launch Strip */}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/study?chapter=${day.chapterId}`}
                  className={`focus-ring inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition hover:opacity-90 ${primaryAccent.chipBg}`}
                  data-testid={`link-study-day-${day.day}`}
                >
                  <Play size={11} className="fill-current" />
                  <span>
                    Study {day.subject}: {day.chapterTitle}
                  </span>
                </Link>

                {day.secondaryChapterId &&
                  day.secondaryChapterTitle &&
                  day.secondaryChapterId !== day.chapterId && (
                    <Link
                      href={`/study?chapter=${day.secondaryChapterId}`}
                      className={`focus-ring inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition hover:opacity-90 ${
                        secondaryAccent?.chipBg || 'border-border bg-muted/40 text-foreground'
                      }`}
                      data-testid={`link-secondary-study-day-${day.day}`}
                    >
                      <Play size={11} className="fill-current" />
                      <span>
                        Study {day.secondarySubject || 'Next'}: {day.secondaryChapterTitle}
                      </span>
                    </Link>
                  )}
              </div>

              {day.rhythmBadge && (
                <span className="text-xs text-muted-foreground font-medium">
                  {day.rhythmBadge}
                </span>
              )}
            </div>

            {/* Merged Recovery Blocks + Topic-by-Topic NCERT Checklist */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs">
                  <span className="font-semibold uppercase tracking-wider text-foreground/75">
                    Recovery Blocks &amp; Topics
                  </span>
                  <span className="text-muted-foreground">·</span>
                  <span className="font-mono text-muted-foreground tabular-nums">
                    {doneCount}/{totalCount} blocks
                    {verifiedDayCount > 0 ? ` (${verifiedDayCount} verified)` : ''}
                    {dayTotalTopics > 0 ? ` · ${dayClearedTopics}/${dayTotalTopics} topics` : ''}
                  </span>
                </div>

                {dayTotalTopics > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilterHighYield((prev) => !prev)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition cursor-pointer whitespace-nowrap shrink-0 ${
                      filterHighYield
                        ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                        : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                    data-testid={`button-filter-high-yield-day-${day.day}`}
                  >
                    <Flame
                      size={12}
                      className={filterHighYield ? 'text-amber-500' : 'text-muted-foreground'}
                    />
                    <span>High-Yield Only</span>
                  </button>
                )}
              </div>

              {(() => {
                const attachedChapters = new Set<string>();
                const getChapterTopicCounts = (chapterId: string) => {
                  const subs = getChapterSubtopics(chapterId);
                  if (subs.length === 0) return null;
                  const clearedIds = new Set(clearedMap[chapterId] || []);
                  const clearedNum = subs.filter((s) => clearedIds.has(s.id)).length;
                  return { cleared: clearedNum, total: subs.length };
                };

                const renderTopicsDrawer = (
                  chapterId: string,
                  chapterTitle: string,
                  subject: string
                ) => {
                  const counts = getChapterTopicCounts(chapterId);
                  if (!counts) return null;
                  const isCollapsed = Boolean(collapsedTopics[chapterId]);

                  return (
                    <div className="border-t border-border/60 bg-muted/15 px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs">
                          <span className="font-semibold text-foreground">
                            Topics: {chapterTitle}
                          </span>
                          <span className="text-muted-foreground">·</span>
                          <span className="font-mono text-muted-foreground tabular-nums">
                            {counts.cleared}/{counts.total} studied
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setCollapsedTopics((prev) => ({
                              ...prev,
                              [chapterId]: !prev[chapterId],
                            }))
                          }
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <span>{isCollapsed ? 'Show topics' : 'Hide topics'}</span>
                          <ChevronDown
                            size={13}
                            className={`transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
                          />
                        </button>
                      </div>

                      {!isCollapsed && (
                        <div className="mt-2.5">
                          <ChapterTopicsInline
                            chapterId={chapterId}
                            chapterTitle={chapterTitle}
                            subject={subject}
                            filterHighYield={filterHighYield}
                            onClearedChange={() => setClearedMap(readClearedSubtopics(userId))}
                          />
                        </div>
                      )}
                    </div>
                  );
                };

                return (
                  <div className="space-y-3">
                    {dayTasks.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-[13px] text-muted-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <span>
                          All uncompleted tasks from Day {day.day} were merged into upcoming days so your daily schedule stays balanced.
                        </span>
                        {onRestoreDayOne && (
                          <button
                            type="button"
                            disabled={rescheduleBusy}
                            onClick={onRestoreDayOne}
                            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition cursor-pointer disabled:opacity-50 whitespace-nowrap"
                            data-testid={`button-restore-day-card-${day.day}`}
                          >
                            <RotateCcw size={12} />
                            <span>{rescheduleBusy ? 'Restoring...' : 'Restore Day 1 Today'}</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      dayTasks.map((task) => {
                      const ctx = resolveDayTaskChapterContext(day, task);
                      let attachedTopics: ReactNode = null;
                      let topicSummary: { cleared: number; total: number } | null = null;
                      if (!attachedChapters.has(ctx.chapterId)) {
                        attachedChapters.add(ctx.chapterId);
                        topicSummary = getChapterTopicCounts(ctx.chapterId);
                        attachedTopics = renderTopicsDrawer(
                          ctx.chapterId,
                          ctx.chapterTitle,
                          task.subject
                        );
                      }

                      return (
                        <TaskBlock
                          key={task.id}
                          task={task}
                          chapterId={ctx.chapterId}
                          done={isPlanTaskCompleted(completed, planId, task.id, allowLegacyUnscoped)}
                          verified={isPlanTaskCompleted(
                            verifiedSet,
                            planId,
                            task.id,
                            allowLegacyUnscoped
                          )}
                          isActiveTask={task.id === activeTaskId}
                          topicSummary={topicSummary}
                          onToggle={() => onTaskClick(day, task)}
                          onVerifyNow={() => onVerifyTask(day, task, 'choose')}
                          attachedTopics={attachedTopics}
                        />
                      );
                    })
                    )}

                    {dayChapters
                      .filter((ch) => !attachedChapters.has(ch.chapterId))
                      .map((ch) => {
                        const subs = getChapterSubtopics(ch.chapterId);
                        if (subs.length === 0) return null;
                        return (
                          <div
                            key={ch.chapterId}
                            className="rounded-xl border border-border/80 bg-card overflow-hidden"
                          >
                            {renderTopicsDrawer(ch.chapterId, ch.chapterTitle, ch.subject)}
                          </div>
                        );
                      })}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </article>
    </div>
  );
}

export function Roadmap() {
  const { user, activePlan, plans: contextPlans, deletePlan } = useAuth();
  const [plan, setPlan] = useState<StudentPlan | null>(() => activePlan || readPlan(user?.uid));
  const [completedIds, setCompletedIds] = useState<string[]>(() => readCompleted(user?.uid));
  const [verifiedIds, setVerifiedIds] = useState<string[]>(() => readVerifiedTasks(user?.uid));
  const [focusedDay, setFocusedDay] = useState<number | null>(null);
  const [selectedTimerDay, setSelectedTimerDay] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const autoMergedSignatureRef = useRef<string>('');
  const [completionFeedback, setCompletionFeedback] = useState<{
    kind: 'studied' | 'verified' | 'rescheduled';
    message: string;
    canUndo?: boolean;
    day?: PlanDay;
    task?: PlanTask;
  } | null>(null);
  const [rescheduleBusy, setRescheduleBusy] = useState(false);
  const [verifyModal, setVerifyModal] = useState<{
    day: PlanDay;
    task: PlanTask;
    chapterId: string;
    chapterTitle: string;
    objectiveId: string | null;
    step: 'choose' | 'quiz';
  } | null>(null);

  const {
    activeNormalizedPlan,
    objectives,
    chapterMasteryByChapterId,
    applyAssessmentSubmission,
    reschedulePlanMissedDays,
    restorePlanToDayOne,
  } = useEnginesWorkspace(plan);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setPlan(activePlan || readPlan(user?.uid));
    setCompletedIds(readCompleted(user?.uid));
    setVerifiedIds(readVerifiedTasks(user?.uid));
  }, [user?.uid, activePlan]);

  useEffect(() => {
    const handleUpdate = () => {
      setPlan(readPlan(user?.uid));
      setCompletedIds(readCompleted(user?.uid));
      setVerifiedIds(readVerifiedTasks(user?.uid));
    };
    window.addEventListener('backlogos-plan-updated', handleUpdate);
    window.addEventListener('backlogos-plans-updated', handleUpdate);
    window.addEventListener('backlogos-completed-updated', handleUpdate);
    window.addEventListener('backlogos-verified-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('backlogos-plan-updated', handleUpdate);
      window.removeEventListener('backlogos-plans-updated', handleUpdate);
      window.removeEventListener('backlogos-completed-updated', handleUpdate);
      window.removeEventListener('backlogos-verified-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [user?.uid]);

  const examDaysLeft = useMemo(() => {
    if (!plan?.examDate) return null;
    const parsed = new Date(plan.examDate);
    if (Number.isNaN(parsed.getTime())) return null;
    return Math.ceil((parsed.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }, [plan?.examDate]);

  const allowLegacyUnscoped = contextPlans.length <= 1;
  const completed = useMemo(() => new Set(completedIds), [completedIds]);
  const verifiedSet = useMemo(() => {
    const set = new Set(verifiedIds);
    for (const obj of objectives) {
      if (obj.state === 'VERIFIED' && obj.legacyTaskKey) {
        set.add(obj.legacyTaskKey);
      }
    }
    return set;
  }, [verifiedIds, objectives]);

  const planDays = Array.isArray(plan?.days) ? plan.days : [];
  const allTasks = planDays.flatMap((day) => (Array.isArray(day?.tasks) ? day.tasks : []));
  const completedTasksInPlan = allTasks.filter((task) =>
    isPlanTaskCompleted(completed, plan?.id, task.id, allowLegacyUnscoped)
  );
  const verifiedTasksInPlan = allTasks.filter((task) =>
    isPlanTaskCompleted(verifiedSet, plan?.id, task.id, allowLegacyUnscoped)
  );
  const completedCount = completedTasksInPlan.length;
  const verifiedCount = verifiedTasksInPlan.length;
  const progress = allTasks.length ? Math.round((completedCount / allTasks.length) * 100) : 0;
  const verifiedPercent = allTasks.length ? Math.round((verifiedCount / allTasks.length) * 100) : 0;

  const setTaskCompletion = (rawId: string, shouldComplete: boolean, markVerified = false) => {
    const scopedId = resolvePlanTaskId(plan?.id, rawId);

    let next: string[];
    if (shouldComplete) {
      next = completedIds.includes(scopedId) ? completedIds : [...completedIds, scopedId];
    } else {
      next = completedIds.filter(
        (taskId) => taskId !== scopedId && !(allowLegacyUnscoped && taskId === rawId)
      );
    }

    setCompletedIds(next);
    saveCompleted(next, user?.uid);

    if (markVerified) {
      const nextVerified = saveVerifiedTasks([...verifiedIds, scopedId], user?.uid);
      setVerifiedIds(nextVerified);
      if (user?.uid && !user.isGuest) {
        saveWorkspaceStateDirect({ verifiedTasks: nextVerified }, user.uid).catch((err) =>
          console.warn('[Roadmap] saveWorkspaceStateDirect verifiedTasks error:', err)
        );
      }
    } else if (!shouldComplete) {
      const nextVerified = saveVerifiedTasks(
        verifiedIds.filter(
          (taskId) => taskId !== scopedId && !(allowLegacyUnscoped && taskId === rawId)
        ),
        user?.uid
      );
      setVerifiedIds(nextVerified);
      if (user?.uid && !user.isGuest) {
        saveWorkspaceStateDirect({ verifiedTasks: nextVerified }, user.uid).catch((err) =>
          console.warn('[Roadmap] saveWorkspaceStateDirect verifiedTasks error:', err)
        );
      }
    }

    if (user?.uid && !user.isGuest) {
      if (shouldComplete) {
        saveCompletedTaskDirect(scopedId, user.uid).catch((err) =>
          console.warn('[Roadmap] saveCompletedTaskDirect error:', err)
        );
      } else {
        removeCompletedTaskDirect(scopedId, user.uid).catch((err) =>
          console.warn('[Roadmap] removeCompletedTaskDirect error:', err)
        );
        if (allowLegacyUnscoped && rawId !== scopedId && completedIds.includes(rawId)) {
          removeCompletedTaskDirect(rawId, user.uid).catch((err) =>
            console.warn('[Roadmap] legacy removeCompletedTaskDirect error:', err)
          );
        }
      }
    }

    if (shouldComplete) {
      const nextSet = new Set(next);
      const nextDoneCount = allTasks.filter((t) =>
        isPlanTaskCompleted(nextSet, plan?.id, t.id, allowLegacyUnscoped)
      ).length;
      if (allTasks.length > 0 && nextDoneCount === allTasks.length) {
        triggerGrandCelebration();
      } else {
        triggerTaskCelebration();
      }
    }
  };

  const openVerificationGate = (
    day: PlanDay,
    task: PlanTask,
    initialStep: 'choose' | 'quiz' = 'choose'
  ) => {
    const { chapterId, chapterTitle } = resolveDayTaskChapterContext(day, task);
    const scopedKey = resolvePlanTaskId(plan?.id, task.id);
    const matchedObjective = objectives.find(
      (o) =>
        o.legacyTaskKey === scopedKey ||
        o.legacyTaskKey === task.id ||
        (o.chapterId === chapterId && o.title === task.label)
    );
    setVerifyModal({
      day,
      task,
      chapterId,
      chapterTitle,
      objectiveId: matchedObjective?.id || null,
      step: initialStep,
    });
  };

  const handleTaskCheckClick = (day: PlanDay, task: PlanTask) => {
    const currentlyCompleted = isPlanTaskCompleted(
      completed,
      plan?.id,
      task.id,
      allowLegacyUnscoped
    );
    if (currentlyCompleted) {
      setTaskCompletion(task.id, false, false);
      setCompletionFeedback(null);
    } else {
      openVerificationGate(day, task, 'choose');
    }
  };

  const [confirmModal, setConfirmModal] = useState<'reset' | 'delete' | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const resetProgress = () => {
    setConfirmModal('reset');
  };

  const executeResetProgress = async () => {
    setConfirmBusy(true);
    try {
      setCompletedIds([]);
      setVerifiedIds([]);
      saveVerifiedTasks([], user?.uid);
      if (user?.uid && !user.isGuest) {
        await saveWorkspaceStateDirect({ verifiedTasks: [] }, user.uid).catch((err) =>
          console.warn('[Roadmap] reset verifiedTasks cloud error:', err)
        );
      }
      await clearAllCompletedTasksDirect(user?.uid);
      setCompletionFeedback(null);
      setConfirmModal(null);
    } finally {
      setConfirmBusy(false);
    }
  };

  const startOver = () => {
    setConfirmModal('delete');
  };

  const executeStartOver = async () => {
    setConfirmBusy(true);
    try {
      if (plan?.id) {
        await deletePlan(plan.id);
        const nextPlan = readPlan(user?.uid);
        setPlan(nextPlan);
      } else {
        clearStoredPlan(user?.uid);
        if (user?.uid && !user.isGuest) {
          await deleteStudyPlanDirect(user.uid).catch((err) =>
            console.warn('[Roadmap] deleteStudyPlanDirect error:', err)
          );
        }
        setPlan(null);
      }
      setCompletedIds(readCompleted(user?.uid));
      setCompletionFeedback(null);
      setConfirmModal(null);
    } finally {
      setConfirmBusy(false);
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
      id: plan.id,
      name: plan.name,
      createdAt: plan.createdAt,
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
      saveStudyPlanDirect(updated, user.uid)
        .then((res) => {
          if (!res.success && !res.offline) {
            emitSyncStatus('error', res.error || 'Could not sync updated plan duration.');
          }
        })
        .catch((err) => {
          console.warn('[Roadmap] saveStudyPlanDirect duration error:', err);
          emitSyncStatus('error', err?.message || 'Could not sync updated plan duration.');
        });
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
    .map((id) => resolveChapterById(id))
    .filter((chapter): chapter is Chapter => Boolean(chapter));

  const currentDuration = plan.planDuration || (planDays.length as PlanDuration) || 7;
  const isEmergency = currentDuration === 1;

  // Determine first incomplete day ("Active Mission") and next recommended objective
  const currentStopDay =
    planDays.find((d) =>
      (Array.isArray(d?.tasks) ? d.tasks : []).some(
        (t) => !isPlanTaskCompleted(completed, plan?.id, t.id, allowLegacyUnscoped)
      )
    )?.day ?? planDays[0]?.day ?? 1;
  const currentStopObj = planDays.find((d) => d.day === currentStopDay) || planDays[0];
  const currentDayTasks = Array.isArray(currentStopObj?.tasks) ? currentStopObj.tasks : [];
  const nextObjectiveTask =
    currentDayTasks.find(
      (t) => !isPlanTaskCompleted(completed, plan?.id, t.id, allowLegacyUnscoped)
    ) ||
    currentDayTasks[0] ||
    null;
  const nextObjectiveCtx =
    currentStopObj && nextObjectiveTask
      ? resolveDayTaskChapterContext(currentStopObj, nextObjectiveTask)
      : null;

  const remainingDayTasks = currentDayTasks.filter(
    (t) => !isPlanTaskCompleted(completed, plan?.id, t.id, allowLegacyUnscoped)
  );
  const remainingMinutesToday = remainingDayTasks.reduce(
    (sum, t) => sum + (Number(t.minutes) || 0),
    0
  );

  // Resolve each day's scheduled date and detect expired missed windows
  const todayIso = formatIsoDate(new Date(nowMs));
  const planStartIso =
    plan.days?.[0]?.scheduledDate ||
    activeNormalizedPlan?.startDate ||
    isoTimestampToLocalDate(plan.createdAt);

  const dayScheduleMap = new Map<number, string>();
  const missedDayNumbers: number[] = [];
  let missedTaskCount = 0;

  for (let idx = 0; idx < planDays.length; idx++) {
    const day = planDays[idx];
    const normDay = activeNormalizedPlan?.days.find((nd) => nd.dayNumber === day.day);
    const scheduledIso =
      day.scheduledDate ||
      normDay?.scheduledDate ||
      addDaysToIsoDate(planStartIso, (Number(day.day) || idx + 1) - 1);
    dayScheduleMap.set(day.day, scheduledIso);

    if (scheduledIso >= todayIso) continue;
    const incompleteInDay = (Array.isArray(day.tasks) ? day.tasks : []).filter(
      (t) => !isPlanTaskCompleted(completed, plan?.id, t.id, allowLegacyUnscoped)
    );
    if (incompleteInDay.length > 0) {
      missedDayNumbers.push(day.day);
      missedTaskCount += incompleteInDay.length;
    }
  }
  const missedDaySet = new Set(missedDayNumbers);

  const hasCarriedForwardState =
    (activeNormalizedPlan?.rescheduleCount || 0) > 0 ||
    missedDayNumbers.length > 0 ||
    planDays.some((d) => {
      const dTasks = Array.isArray(d?.tasks) ? d.tasks : [];
      if (dTasks.length === 0) return true;
      return dTasks.some((t) => {
        if (typeof t.rescheduledFromDay === 'number' && t.rescheduledFromDay !== d.day) {
          return true;
        }
        const m = typeof t.id === 'string' ? t.id.match(/(?:^|::)day-(\d+)-task-/) : null;
        return Boolean(m && Number(m[1]) !== d.day);
      });
    });

  const handleRescheduleMissed = async (isAutomatic = false) => {
    if (missedDayNumbers.length === 0 || rescheduleBusy) return;
    setRescheduleBusy(true);
    try {
      const res = await reschedulePlanMissedDays(missedDayNumbers);
      if (res && res.movedObjectives.length > 0) {
        setCompletionFeedback({
          kind: 'rescheduled',
          canUndo: true,
          message: isAutomatic
            ? `Timer expired — ${res.summaryMessage}`
            : res.summaryMessage,
        });
      }
    } finally {
      setRescheduleBusy(false);
    }
  };

  const handleRestoreDayOne = async () => {
    if (rescheduleBusy) return;
    setRescheduleBusy(true);
    try {
      const restored = await restorePlanToDayOne();
      if (restored) {
        autoMergedSignatureRef.current = '';
        setSelectedTimerDay(1);
        setFocusedDay(1);
        setCompletionFeedback({
          kind: 'rescheduled',
          canUndo: false,
          message:
            'Restored to Day 1 today. Carried-forward tasks are back on their original days with all study and verification progress intact.',
        });
      }
    } finally {
      setRescheduleBusy(false);
    }
  };

  // Auto-merge unfinished tasks when any day's window timer expires
  const missedSignature =
    missedDayNumbers.length > 0
      ? `${plan.id || 'guest'}:${missedDayNumbers.join(',')}:${missedTaskCount}`
      : '';

  useEffect(() => {
    if (!missedSignature || rescheduleBusy) return;
    if (autoMergedSignatureRef.current === missedSignature) return;
    autoMergedSignatureRef.current = missedSignature;
    void handleRescheduleMissed(true);
  }, [missedSignature]);

  const activeTimerDayNum =
    selectedTimerDay && planDays.some((d) => d.day === selectedTimerDay)
      ? selectedTimerDay
      : currentStopDay;
  const activeTimerDayObj =
    planDays.find((d) => d.day === activeTimerDayNum) || planDays[0];
  const activeTimerScheduledIso = activeTimerDayObj
    ? dayScheduleMap.get(activeTimerDayObj.day) || todayIso
    : todayIso;
  const activeTimerDeadlineMs = getDayDeadlineMs(activeTimerScheduledIso);
  const activeTimerCountdown = formatDayCountdown(activeTimerDeadlineMs - nowMs);
  const activeTimerDayTasks = Array.isArray(activeTimerDayObj?.tasks)
    ? activeTimerDayObj.tasks
    : [];
  const activeTimerRemainingTasks = activeTimerDayTasks.filter(
    (t) => !isPlanTaskCompleted(completed, plan?.id, t.id, allowLegacyUnscoped)
  );
  const activeTimerRemainingMins = activeTimerRemainingTasks.reduce(
    (sum, t) => sum + (Number(t.minutes) || 0),
    0
  );
  const activeTimerDayCleared =
    activeTimerDayTasks.length > 0 && activeTimerRemainingTasks.length === 0;
  const activeTimerWindowPercent = activeTimerCountdown.expired
    ? 0
    : activeTimerCountdown.days > 0
    ? 100
    : Math.max(
        2,
        Math.min(100, Math.round(((activeTimerDeadlineMs - nowMs) / 86400000) * 100))
      );

  const completedDaysCount = planDays.filter((d) => {
    const tasks = Array.isArray(d?.tasks) ? d.tasks : [];
    return (
      tasks.length > 0 &&
      tasks.every((t) => isPlanTaskCompleted(completed, plan?.id, t.id, allowLegacyUnscoped))
    );
  }).length;
  // Honest Capacity & Burnout Guard based on chapters per sprint horizon
  const maxComfortableChapters = Math.max(3, Math.round(currentDuration * 1.5));

  const isChapterOverloaded = selectedChapters.length > maxComfortableChapters;
  const isRunwayTight = examDaysLeft !== null && examDaysLeft > 0 && currentDuration > examDaysLeft;

  const applyHighYieldTrim = () => {
    if (!plan || selectedChapters.length <= maxComfortableChapters) return;
    const ranked = [...selectedChapters].sort((a, b) => {
      const score = (ch: Chapter) => {
        if (ch.tag === 'Start here') return 0;
        if (ch.tag === 'Foundation') return 1;
        if (ch.tag === 'Core') return 2;
        return 3;
      };
      const diff = score(a) - score(b);
      return diff !== 0 ? diff : a.order - b.order;
    });
    const trimmedIds = ranked.slice(0, maxComfortableChapters).map((c) => c.id);
    const updated = makePlan({
      id: plan.id,
      name: plan.name,
      createdAt: plan.createdAt,
      board: plan.board || 'CBSE Class 12',
      subjects: plan.subjects || ['Physics', 'Chemistry', 'Mathematics'],
      chapterIds: trimmedIds,
      minutesPerDay: plan.minutesPerDay || 180,
      goal: plan.goal || 'High-Yield Backlog Triage',
      priority: 'high weightage',
      confidence: plan.confidence || 'mixed',
      examDate: plan.examDate || '',
      planDuration: currentDuration,
    });
    setPlan(updated);
    savePlan(updated, user?.uid);
    if (user?.uid && !user.isGuest) {
      saveStudyPlanDirect(updated, user.uid)
        .then((res) => {
          if (!res.success && !res.offline) {
            emitSyncStatus('error', res.error || 'Could not sync trimmed plan.');
          }
        })
        .catch((err) => {
          console.warn('[Roadmap] saveStudyPlanDirect trim error:', err);
          emitSyncStatus('error', err?.message || 'Could not sync trimmed plan.');
        });
    }
  };

  const jumpToDay = (dayNum: number) => {
    setFocusedDay(dayNum);
    const el = document.getElementById(`roadmap-day-${dayNum}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="mx-auto max-w-[1360px] px-4 py-6 sm:px-6 lg:px-8 sm:py-8 space-y-6 font-sans animate-page-enter">
      {/* Minimalist Mission Header */}
      <section
        className={`rounded-2xl border bg-card p-5 sm:p-7 shadow-2xs ${
          isEmergency ? 'border-rose-500/40' : 'border-border'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-5 border-b border-border/70">
          {/* Left: Progress Ring + Headline */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <ProgressRing
              progress={progress}
              allVerified={allTasks.length > 0 && verifiedCount === allTasks.length}
              isEmergency={isEmergency}
            />

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-mono">
                <span
                  className="rounded-md border border-indigo-500/25 bg-indigo-500/8 px-2 py-0.5 font-semibold text-indigo-700 dark:text-indigo-300"
                  data-testid="badge-roadmap-plan-name"
                >
                  {plan.name || buildDefaultPlanName(plan)}
                </span>
                <span className={`font-semibold ${isEmergency ? 'text-rose-600' : 'text-blue-700 dark:text-blue-400'}`}>
                  {isEmergency ? '1-Day Emergency Triage' : `${currentDuration}-Day Recovery Route`}
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">{plan.board}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">{plan.goal}</span>
              </div>

              <h1 className="font-display text-2xl sm:text-[28px] font-bold tracking-tight text-foreground leading-tight">
                {isEmergency
                  ? 'Emergency Triage: High-Yield Finish'
                  : progress === 100
                  ? verifiedCount === allTasks.length
                    ? 'Recovery Route Completed & Verified'
                    : 'All Study Blocks Checked — Verify Mastery Next'
                  : 'Your Syllabus Recovery Mission'}
              </h1>

              <p className="text-sm text-foreground/75 max-w-3xl leading-relaxed">
                {plan.coverageNote || 'Every day pairs focused learning and practice sprints so you clear backlog steadily without burnout.'}
              </p>
            </div>
          </div>

          {/* Right: Plan Controls */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium shrink-0 self-start lg:self-center">
            <Link
              href="/plans"
              className="rounded-lg border border-border bg-background px-3 py-2 text-foreground hover:bg-muted transition"
              data-testid="link-roadmap-plans"
            >
              Switch Plan
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg border border-border bg-background px-3 py-2 text-foreground hover:bg-muted transition inline-flex items-center gap-1"
              data-testid="link-roadmap-dashboard"
            >
              <span>Dashboard</span>
              <ArrowRight size={12} />
            </Link>
            <Link
              href="/onboarding?reset=true"
              className="rounded-lg border border-border bg-background px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted transition"
              data-testid="link-edit-plan"
            >
              Edit Plan
            </Link>
            <button
              type="button"
              onClick={resetProgress}
              className="rounded-lg border border-border bg-background px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted transition inline-flex items-center gap-1.5 cursor-pointer"
              data-testid="button-reset-progress"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
            <button
              type="button"
              onClick={startOver}
              className="rounded-lg border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-rose-700 dark:text-rose-400 hover:bg-rose-500/12 transition cursor-pointer"
              data-testid="button-start-over"
            >
              Start over
            </button>
          </div>
        </div>

        {/* Prominent Current Mission & Next Recommended Action Strip */}
        {currentStopObj && nextObjectiveTask && nextObjectiveCtx && (
          <div
            className="mt-5 rounded-xl border border-indigo-500/25 bg-indigo-500/[0.03] p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
            data-testid="card-next-mission"
          >
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs font-mono">
                <span className="font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                  Next Recommended Action · Day {currentStopDay}
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="text-foreground/80 font-medium">
                  {nextObjectiveTask.subject}: {nextObjectiveCtx.chapterTitle}
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="font-semibold text-blue-700 dark:text-blue-300 tabular-nums">
                  {remainingMinutesToday > 0
                    ? `${remainingMinutesToday} min remaining today`
                    : 'Today’s blocks complete'}
                </span>
              </div>
              <p className="text-base font-bold text-foreground leading-snug">
                {nextObjectiveTask.label}
              </p>
              <p className="text-[13px] text-foreground/75 leading-relaxed">
                {nextObjectiveTask.detail}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <Link
                href={`/study?chapter=${nextObjectiveCtx.chapterId}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition whitespace-nowrap"
                data-testid="button-mission-start-study"
              >
                <Play size={12} className="fill-current" />
                <span>Start Objective ({nextObjectiveTask.minutes}m)</span>
              </Link>
              {!isPlanTaskCompleted(completed, plan?.id, nextObjectiveTask.id, allowLegacyUnscoped) && (
                <button
                  type="button"
                  onClick={() => openVerificationGate(currentStopObj, nextObjectiveTask, 'quiz')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/35 bg-card hover:bg-muted px-3.5 py-2.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 transition cursor-pointer whitespace-nowrap"
                  data-testid="button-mission-verify-next"
                >
                  <ShieldCheck size={13} />
                  <span>Verify &amp; Check Off</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Separated Mission Telemetry Tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 py-5 border-b border-border/70">
          <div className="rounded-xl border border-border bg-background/60 p-3.5">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Clock size={13} className="text-blue-600 dark:text-blue-400" />
              Remaining Today
            </span>
            <span className="mt-1 block font-mono text-xl font-bold text-foreground tabular-nums">
              {remainingMinutesToday} min
            </span>
            <span className="block text-xs text-muted-foreground tabular-nums">
              {remainingDayTasks.length} of {currentDayTasks.length} blocks left · {plan.minutesPerDay}m daily pace
            </span>
          </div>

          <div className="rounded-xl border border-border bg-background/60 p-3.5">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Zap size={13} className="text-blue-600 dark:text-blue-400" />
              Study Clearance
            </span>
            <span className="mt-1 block font-mono text-xl font-bold text-foreground tabular-nums">
              {completedCount} / {allTasks.length} blocks
            </span>
            <span
              className="block text-xs text-muted-foreground tabular-nums"
              data-testid="text-roadmap-cleared-minutes"
            >
              {progress}% studied · backlog checklist
            </span>
          </div>

          <div className="rounded-xl border border-border bg-background/60 p-3.5">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-indigo-600 dark:text-indigo-400" />
              Verified Mastery
            </span>
            <span className="mt-1 block font-mono text-xl font-bold text-foreground tabular-nums">
              {verifiedCount} / {allTasks.length} blocks
            </span>
            <span className="block text-xs text-muted-foreground tabular-nums">
              {verifiedPercent}% quiz-verified mastery
            </span>
          </div>

          <div className="rounded-xl border border-border bg-background/60 p-3.5">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Target size={13} className="text-violet-600 dark:text-violet-400" />
              Route Progress
            </span>
            <span className="mt-1 block font-mono text-xl font-bold text-foreground tabular-nums">
              {completedDaysCount} / {planDays.length} days
            </span>
            <span className="block text-xs text-muted-foreground tabular-nums">
              {selectedChapters.length} chapters queued
            </span>
          </div>
        </div>

        {/* Recovery Horizon Switcher */}
        <div className="pt-4 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Calendar size={13} className="text-blue-600 dark:text-blue-400" />
              Switch Recovery Horizon
            </span>
            <span className="text-xs font-mono text-muted-foreground">
              Active Track:{' '}
              <strong className="text-foreground">
                {currentDuration} {currentDuration === 1 ? 'Day' : 'Days'}
              </strong>
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
                  <span className="text-[11px] opacity-85 font-normal">· {opt.badge}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Honest Capacity Reality Check & 80/20 Triage */}
        {(isChapterOverloaded || isRunwayTight) && (
          <div
            data-testid="banner-overload-triage"
            className="mt-4 rounded-xl border border-amber-500/35 bg-amber-500/8 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex items-start gap-2.5 text-[13px]">
              <ShieldAlert size={17} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="font-semibold text-amber-800 dark:text-amber-300">
                  Schedule Capacity Check: {selectedChapters.length} chapters queued across a {currentDuration}-day horizon
                </div>
                <p className="text-xs sm:text-[13px] text-foreground/75 leading-relaxed">
                  {isRunwayTight
                    ? `Your target exam is in ${examDaysLeft} days, which is shorter than this ${currentDuration}-day track. `
                    : ''}
                  {isChapterOverloaded
                    ? `To master concepts deeply without rushing, ~${maxComfortableChapters} high-yield chapters fit comfortably in a ${currentDuration}-day track.`
                    : ''}
                </p>
              </div>
            </div>

            {isChapterOverloaded && (
              <button
                type="button"
                onClick={applyHighYieldTrim}
                className="shrink-0 rounded-lg border border-amber-500/40 bg-amber-500/15 hover:bg-amber-500/25 px-3.5 py-2 text-xs font-semibold text-amber-800 dark:text-amber-200 transition cursor-pointer"
              >
                Apply 80/20 Trim ({maxComfortableChapters} Units)
              </button>
            )}
          </div>
        )}
      </section>

      {/* Missed Tasks Detection & One-Click Reschedule Banner */}
      {missedDayNumbers.length > 0 && (
        <section
          className="rounded-xl border border-amber-500/40 bg-amber-500/8 px-4 py-3.5 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          data-testid="banner-missed-tasks"
        >
          <div className="flex items-start gap-3">
            <ShieldAlert size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-foreground">
                {missedTaskCount} missed {missedTaskCount === 1 ? 'block' : 'blocks'} from{' '}
                {missedDayNumbers.map((d) => `Day ${d}`).join(', ')}
              </p>
              <p className="text-xs sm:text-[13px] text-foreground/75">
                Move overdue tasks into upcoming open capacity or a recovery day without overloading tomorrow.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={rescheduleBusy}
            onClick={() => void handleRescheduleMissed()}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 text-xs font-semibold transition cursor-pointer disabled:opacity-50 whitespace-nowrap"
            data-testid="button-reschedule-missed"
          >
            <RotateCcw size={13} />
            <span>
              {rescheduleBusy ? 'Rescheduling...' : `Reschedule Missed (${missedTaskCount})`}
            </span>
          </button>
        </section>
      )}

      {/* Post-Completion & Reschedule Feedback Banner */}
      {completionFeedback && (
        <section
          role="status"
          className={`rounded-xl border px-4 py-3.5 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            completionFeedback.kind === 'verified'
              ? 'border-indigo-500/35 bg-indigo-500/8'
              : 'border-blue-500/35 bg-blue-500/8'
          }`}
          data-testid="banner-completion-feedback"
        >
          <div className="flex items-start gap-2.5 text-[13px]">
            <ShieldCheck
              size={17}
              className={`shrink-0 mt-0.5 ${
                completionFeedback.kind === 'verified'
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-blue-600 dark:text-blue-400'
              }`}
            />
            <p className="font-medium text-foreground leading-relaxed">
              {completionFeedback.message}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {completionFeedback.kind === 'rescheduled' &&
              completionFeedback.canUndo !== false && (
                <button
                  type="button"
                  disabled={rescheduleBusy}
                  onClick={() => void handleRestoreDayOne()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/40 bg-background px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-500/10 transition cursor-pointer disabled:opacity-50 whitespace-nowrap"
                  data-testid="button-undo-carry-forward"
                >
                  <RotateCcw size={12} />
                  <span>{rescheduleBusy ? 'Restoring...' : 'Undo · Restore Day 1'}</span>
                </button>
              )}
            {completionFeedback.kind === 'studied' &&
              completionFeedback.day &&
              completionFeedback.task && (
                <button
                  type="button"
                  onClick={() =>
                    openVerificationGate(
                      completionFeedback.day!,
                      completionFeedback.task!,
                      'quiz'
                    )
                  }
                  className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white transition cursor-pointer whitespace-nowrap"
                >
                  Verify Understanding Now
                </button>
              )}
            <button
              type="button"
              onClick={() => setCompletionFeedback(null)}
              aria-label="Dismiss message"
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>
        </section>
      )}

      {/* Live Day Window Countdown Timer Above Roadmap */}
      {activeTimerDayObj && (
        <section
          className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-2xs space-y-4"
          data-testid="card-day-timer"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs font-mono">
                <span className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                  <Timer size={13} />
                  <span>Day {activeTimerDayObj.day} Countdown Window</span>
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="text-foreground/80">
                  {formatScheduleDayHint(activeTimerScheduledIso, todayIso)}
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground tabular-nums">
                  {activeTimerDayTasks.length === 0
                    ? 'Merged forward'
                    : activeTimerDayCleared
                    ? 'All blocks studied'
                    : `${activeTimerRemainingTasks.length}/${activeTimerDayTasks.length} tasks (${activeTimerRemainingMins}m) left`}
                </span>
              </div>

              <p className="text-xs sm:text-[13px] text-muted-foreground leading-relaxed">
                Miss a task before Day {activeTimerDayObj.day} ends and it merges into Day{' '}
                {activeTimerDayObj.day + 1}. Miss an entire day and tasks spread gently across multiple upcoming days so tomorrow never gets overloaded.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div
                className={`rounded-xl border px-4 py-2.5 font-mono tabular-nums text-right ${
                  activeTimerDayCleared
                    ? 'border-blue-500/35 bg-blue-500/8 text-blue-700 dark:text-blue-300'
                    : activeTimerCountdown.expired
                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300'
                    : activeTimerCountdown.days === 0 && Number(activeTimerCountdown.hours) < 2
                    ? 'border-amber-500/40 bg-amber-500/8 text-amber-700 dark:text-amber-300'
                    : 'border-indigo-500/30 bg-indigo-500/5 text-foreground'
                }`}
                data-testid="text-day-timer-readout"
              >
                <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">
                  {activeTimerDayCleared
                    ? `Day ${activeTimerDayObj.day} Cleared`
                    : activeTimerCountdown.expired
                    ? 'Window Ended'
                    : `Time Left · Day ${activeTimerDayObj.day}`}
                </span>
                <span className="text-lg sm:text-xl font-extrabold tracking-tight">
                  {activeTimerDayCleared
                    ? 'Complete'
                    : activeTimerCountdown.expired
                    ? '00h : 00m : 00s'
                    : activeTimerCountdown.days > 0
                    ? `${activeTimerCountdown.days}d ${activeTimerCountdown.hours}h : ${activeTimerCountdown.minutes}m : ${activeTimerCountdown.seconds}s`
                    : `${activeTimerCountdown.hours}h : ${activeTimerCountdown.minutes}m : ${activeTimerCountdown.seconds}s`}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  activeTimerDayCleared
                    ? 'bg-blue-600'
                    : activeTimerCountdown.expired
                    ? 'bg-amber-500'
                    : 'bg-indigo-600'
                }`}
                style={{ width: `${activeTimerDayCleared ? 100 : activeTimerWindowPercent}%` }}
              />
            </div>

            {/* Per-Day Countdown Selector Pills for Day 1, Day 2, Day 3... */}
            <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
              {planDays.map((day) => {
                const dTasks = Array.isArray(day?.tasks) ? day.tasks : [];
                const dDone =
                  dTasks.length > 0 &&
                  dTasks.every((t) =>
                    isPlanTaskCompleted(completed, plan?.id, t.id, allowLegacyUnscoped)
                  );
                const dMergedEmpty = dTasks.length === 0;
                const dIso = dayScheduleMap.get(day.day) || todayIso;
                const dCountdown = formatDayCountdown(getDayDeadlineMs(dIso) - nowMs);
                const isSelected = day.day === activeTimerDayObj.day;

                return (
                  <button
                    key={day.day}
                    type="button"
                    onClick={() => {
                      setSelectedTimerDay(day.day);
                      jumpToDay(day.day);
                    }}
                    data-testid={`button-timer-day-${day.day}`}
                    className={`shrink-0 flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-mono transition cursor-pointer ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-semibold'
                        : dDone || dMergedEmpty
                        ? 'border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-300'
                        : dCountdown.expired
                        ? 'border-amber-500/35 bg-amber-500/8 text-amber-800 dark:text-amber-300'
                        : 'border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <span className="font-semibold">Day {day.day}</span>
                    <span className="text-[11px] opacity-85 tabular-nums">
                      {dMergedEmpty
                        ? '· Merged'
                        : dDone
                        ? '· Cleared'
                        : dCountdown.expired
                        ? '· Ended'
                        : `· ${dCountdown.compact}`}
                    </span>
                  </button>
                );
              })}
            </div>

            {hasCarriedForwardState && (
              <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/6 px-3.5 py-2.5 text-xs">
                <span className="text-foreground/85 font-medium">
                  Accidentally carried forward or started past Day 1? Reset your schedule to start fresh on Day 1 today without losing completed work.
                </span>
                <button
                  type="button"
                  disabled={rescheduleBusy}
                  onClick={() => void handleRestoreDayOne()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/45 bg-background px-3 py-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-500/10 transition cursor-pointer disabled:opacity-50 whitespace-nowrap"
                  data-testid="button-restore-day-1"
                >
                  <RotateCcw size={12} />
                  <span>{rescheduleBusy ? 'Restoring...' : 'Restore Day 1 Today'}</span>
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Interactive Milestone Jump Strip */}
      <section className="rounded-xl border border-border bg-card p-4 shadow-2xs">
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Compass size={14} className="text-indigo-600 dark:text-indigo-400" />
            Route Stops — Jump to Any Day
          </span>
          <span className="text-xs font-mono text-muted-foreground tabular-nums">
            {completedCount} of {allTasks.length} studied · {verifiedCount} verified
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {planDays.map((day) => {
            const dTasks = Array.isArray(day?.tasks) ? day.tasks : [];
            const done =
              dTasks.length > 0 &&
              dTasks.every((t) => isPlanTaskCompleted(completed, plan?.id, t.id, allowLegacyUnscoped));
            const partial =
              dTasks.some((t) => isPlanTaskCompleted(completed, plan?.id, t.id, allowLegacyUnscoped)) &&
              !done;
            const isCurrent = day.day === currentStopDay;
            const isMissed = missedDaySet.has(day.day) && !done;
            return (
              <button
                key={day.day}
                type="button"
                onClick={() => jumpToDay(day.day)}
                className={`shrink-0 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-mono transition cursor-pointer ${
                  done
                    ? 'border-blue-500/35 bg-blue-500/8 text-blue-700 dark:text-blue-300 font-semibold'
                    : isCurrent
                    ? 'border-indigo-600 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-semibold'
                    : isMissed
                    ? 'border-amber-500/45 bg-amber-500/10 text-amber-800 dark:text-amber-300 font-semibold'
                    : partial
                    ? 'border-indigo-500/30 bg-indigo-500/5 text-foreground'
                    : 'border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                    done
                      ? 'bg-blue-600 text-white'
                      : isCurrent
                      ? 'bg-indigo-600 text-white'
                      : isMissed
                      ? 'bg-amber-500 text-white'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  {done ? <Check size={11} strokeWidth={3} /> : day.day}
                </span>
                <span className="truncate max-w-[125px]">
                  Day {day.day} · {(day.subject || 'Core').slice(0, 4)}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Main Connected Vertical Journey + Sticky Mission Guide */}
      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="min-w-0">
          {planDays.map((day, idx) => (
            <DayMilestoneCard
              key={day.day}
              day={day}
              scheduledDate={dayScheduleMap.get(day.day) || todayIso}
              nowMs={nowMs}
              planId={plan?.id}
              userId={user?.uid}
              allowLegacyUnscoped={allowLegacyUnscoped}
              isCurrentStop={day.day === currentStopDay}
              isMissedDay={missedDaySet.has(day.day)}
              activeTaskId={
                day.day === currentStopDay && nextObjectiveTask
                  ? nextObjectiveTask.id
                  : null
              }
              isLast={idx === planDays.length - 1}
              completed={completed}
              verifiedSet={verifiedSet}
              forceExpanded={focusedDay === day.day}
              rescheduleBusy={rescheduleBusy}
              onRestoreDayOne={
                (Array.isArray(day.tasks) ? day.tasks.length === 0 : true)
                  ? () => void handleRestoreDayOne()
                  : undefined
              }
              onTaskClick={handleTaskCheckClick}
              onVerifyTask={(d, t, step = 'choose') => openVerificationGate(d, t, step)}
            />
          ))}
        </div>

        {/* Sticky Sidebar: Study vs Mastery + Route Units */}
        <aside className="space-y-5 lg:sticky lg:top-20 font-sans">
          <BaxContextualSlot
            slot="recovery_route"
            size="md"
            expression={
              verifiedPercent === 100 && allTasks.length > 0
                ? 'celebrating'
                : missedDaySet.size > 0
                ? 'confused'
                : 'explaining'
            }
            pose={
              verifiedPercent === 100 && allTasks.length > 0
                ? 'cheering'
                : missedDaySet.size > 0
                ? 'idle'
                : 'pointing'
            }
            message={
              verifiedPercent === 100 && allTasks.length > 0
                ? 'Every block on your Recovery Route is quiz-verified!'
                : missedDaySet.size > 0
                ? `${missedDaySet.size} overdue day${missedDaySet.size === 1 ? '' : 's'} detected—tap Reschedule Missed to spread tasks safely.`
                : 'Plan. Complete. Verify concepts before checking off your next milestone.'
            }
            className="w-full"
          />

          <section
            className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-2xs"
            data-testid="card-progress"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <span className="text-xs font-medium text-muted-foreground block">
                  Study Clearance
                </span>
                <span className="font-mono tabular-nums text-2xl font-extrabold text-foreground">
                  {progress}%
                </span>
              </div>
              <span className="text-xs font-mono text-blue-700 dark:text-blue-300 font-semibold tabular-nums">
                {completedCount}/{allTasks.length} studied
              </span>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Blocks Studied</span>
                  <span className="font-mono font-semibold text-foreground tabular-nums">
                    {progress}%
                  </span>
                </div>
                <div className="h-2 w-full bg-muted overflow-hidden rounded-full">
                  <div
                    className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Verified Mastery</span>
                  <span className="font-mono font-semibold text-indigo-700 dark:text-indigo-300 tabular-nums">
                    {verifiedPercent}% ({verifiedCount}/{allTasks.length})
                  </span>
                </div>
                <div className="h-2 w-full bg-muted overflow-hidden rounded-full">
                  <div
                    className="h-full bg-indigo-600 transition-all duration-300 rounded-full"
                    style={{ width: `${verifiedPercent}%` }}
                  />
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed border-t border-border/60 pt-3">
              Checking off a block logs study completion only. Pass the verification quiz to mark concepts mastered.
            </p>
          </section>

          {/* Queued Chapters with Separate Mastery Status */}
          <section className="rounded-xl border border-border bg-card p-5 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Units on This Route ({selectedChapters.length})
              </span>
            </div>
            <div className="divide-y divide-border/60 max-h-72 overflow-y-auto pr-1">
              {selectedChapters.map((chapter) => {
                const accent = getSubjectAccent(chapter.subject);
                const masteryRec = chapterMasteryByChapterId.get(chapter.id);
                const masteryDisplay = formatChapterMasteryLabel(masteryRec?.status);

                return (
                  <Link
                    key={chapter.id}
                    href={`/study?chapter=${chapter.id}`}
                    className="group flex items-center justify-between gap-3 py-2.5 text-[13px] hover:text-indigo-700 dark:hover:text-indigo-300 transition"
                  >
                    <span className="min-w-0 flex-1 space-y-0.5">
                      <span className="flex items-center gap-2 min-w-0">
                        <span className={`h-2 w-2 rounded-full shrink-0 ${accent.dot}`} />
                        <span className="truncate font-medium text-foreground group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                          {chapter.title}
                        </span>
                      </span>
                      <span className="block pl-4 text-xs">
                        <span className="text-muted-foreground">{chapter.subject}</span>
                        <span className="text-muted-foreground"> · </span>
                        <span className={`font-medium ${masteryDisplay.tone}`}>
                          {masteryDisplay.label}
                        </span>
                      </span>
                    </span>
                    <ArrowRight
                      size={13}
                      className="shrink-0 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition"
                    />
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Ordering Logic */}
          <section className="rounded-xl border border-border bg-card p-5 space-y-1.5 shadow-2xs">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 block">
              Why This Sequence Works
            </span>
            <p className="text-[13px] text-foreground/80 leading-relaxed">{plan.orderReason}</p>
          </section>
        </aside>
      </div>

      {/* Verify Before Checking Tick Gate Modal */}
      {verifyModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Verify understanding before checking off"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150"
          data-testid="modal-verify-before-tick"
        >
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
              <div className="space-y-1 min-w-0">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  <ShieldCheck size={13} />
                  Verify Before Checking Off
                </span>
                <h3 className="font-display text-lg sm:text-xl font-bold text-foreground truncate">
                  {verifyModal.task.label}
                </h3>
                <p className="text-xs font-mono text-muted-foreground">
                  Day {verifyModal.day.day} · {verifyModal.task.subject} · {verifyModal.chapterTitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVerifyModal(null)}
                aria-label="Close verification dialog"
                className="rounded-lg border border-border bg-background p-1.5 text-muted-foreground hover:text-foreground transition cursor-pointer shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            {verifyModal.step === 'choose' ? (
              <div className="space-y-4">
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Want to confirm you truly understand this topic before ticking it off? Passing a quick 3–5 question check automatically checks off and verifies this block.
                </p>

                <div className="rounded-xl border border-indigo-500/40 bg-indigo-500/10 p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Sparkles size={15} className="text-indigo-600 dark:text-indigo-400" />
                      Verify Understanding with Questions
                    </span>
                    <span className="rounded bg-indigo-600 px-2 py-0.5 text-[10px] font-mono font-bold uppercase text-white">
                      Recommended
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Answer 4 CBSE conceptual questions from {verifyModal.chapterTitle}. Passing marks this task checked &amp; verified.
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setVerifyModal((prev) => (prev ? { ...prev, step: 'quiz' } : null))
                    }
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 text-xs font-mono font-bold transition cursor-pointer shadow-xs"
                    data-testid="button-verify-before-tick-start"
                  >
                    <Sparkles size={13} />
                    <span>Ask Verification Questions</span>
                    <ArrowRight size={13} />
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 p-4">
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-foreground">
                      Already revised it elsewhere?
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Mark as studied only — you can verify understanding anytime later.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const targetDay = verifyModal.day;
                      const targetTask = verifyModal.task;
                      setTaskCompletion(targetTask.id, true, false);
                      setVerifyModal(null);
                      setCompletionFeedback({
                        kind: 'studied',
                        message: `Marked "${targetTask.label}" as Studied. Pass a short verification check anytime to earn Verified Mastery.`,
                        day: targetDay,
                        task: targetTask,
                      });
                    }}
                    className="shrink-0 rounded-lg border border-border bg-background hover:bg-muted px-3.5 py-2 text-xs font-mono font-semibold text-foreground transition cursor-pointer whitespace-nowrap"
                    data-testid="button-mark-studied-unverified"
                  >
                    Mark Studied Only (Verify Later)
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <VerificationQuizRunner
                  defaultType="OBJECTIVE"
                  autoStart
                  chapterId={verifyModal.chapterId}
                  chapterTitle={verifyModal.chapterTitle}
                  subjectName={verifyModal.task.subject}
                  objectiveId={verifyModal.objectiveId}
                  objectiveTitle={verifyModal.task.label}
                  chapterMastery={chapterMasteryByChapterId.get(verifyModal.chapterId) || null}
                  passContinueLabel="Done · Back to Recovery Route"
                  onPassContinue={() => setVerifyModal(null)}
                  onCompleted={async (res, ctx) => {
                    await applyAssessmentSubmission(res, ctx);
                    if (res.summary.passed) {
                      setTaskCompletion(verifyModal.task.id, true, true);
                      setCompletionFeedback({
                        kind: 'verified',
                        message: `Verified Mastery earned for "${verifyModal.task.label}" (${res.summary.scorePercent}% score).`,
                      });
                    }
                  }}
                />

                <div className="flex items-center justify-between border-t border-border pt-3 text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      setVerifyModal((prev) => (prev ? { ...prev, step: 'choose' } : null))
                    }
                    className="font-mono text-muted-foreground hover:text-foreground transition cursor-pointer"
                  >
                    ← Back to options
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const targetDay = verifyModal.day;
                      const targetTask = verifyModal.task;
                      setTaskCompletion(targetTask.id, true, false);
                      setVerifyModal(null);
                      setCompletionFeedback({
                        kind: 'studied',
                        message: `Marked "${targetTask.label}" as Studied. Pass a short verification check anytime to earn Verified Mastery.`,
                        day: targetDay,
                        task: targetTask,
                      });
                    }}
                    className="font-mono text-muted-foreground hover:text-foreground underline underline-offset-4 transition cursor-pointer"
                  >
                    Mark studied only (verify later)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Clean In-App Confirmation Modal (replaces native window.confirm) */}
      {confirmModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={confirmModal === 'reset' ? 'Reset checkmarks' : 'Delete plan'}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <h3 className="font-display text-lg font-bold text-foreground">
              {confirmModal === 'reset' ? 'Reset checkmarks for this plan?' : 'Delete this plan from history?'}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {confirmModal === 'reset'
                ? 'This clears your task checkmarks both on this device and in your cloud account so you can start fresh.'
                : 'This permanently deletes the active plan from your saved plan history. Any other saved plans will remain safe.'}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={confirmBusy}
                onClick={() => setConfirmModal(null)}
                className="rounded-lg border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirmBusy}
                onClick={confirmModal === 'reset' ? executeResetProgress : executeStartOver}
                className="rounded-lg bg-rose-600 hover:bg-rose-500 px-4 py-2 text-xs font-semibold text-white transition cursor-pointer disabled:opacity-50"
                data-testid="button-confirm-roadmap-action"
              >
                {confirmBusy
                  ? 'Working...'
                  : confirmModal === 'reset'
                  ? 'Yes, Reset Checkmarks'
                  : 'Yes, Delete Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
