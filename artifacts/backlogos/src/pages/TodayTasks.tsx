import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useEnginesWorkspace } from '@/hooks/use-engines-workspace';
import { formatIsoDate } from '@/lib/engines/planning-engine';
import { isObjectiveStudiedOrBeyond } from '@/lib/engines/execution-engine';
import { VerificationQuizRunner } from '@/components/VerificationQuizRunner';
import type { ObjectiveState, PlanObjective, RescheduleResult } from '@/lib/engines/types';
import { resolveChapterById } from '@/lib/backlog-data';

const STATE_BADGE_MAP: Record<
  ObjectiveState,
  { label: string; className: string }
> = {
  PENDING: {
    label: 'Pending',
    className: 'border-border bg-muted/30 text-muted-foreground',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    className: 'border-sky-500/35 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  },
  STUDIED: {
    label: 'Studied (Unverified)',
    className: 'border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  },
  VERIFICATION_PENDING: {
    label: 'Verification Pending',
    className: 'border-indigo-500/35 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
  },
  VERIFIED: {
    label: 'Verified Mastery',
    className: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  },
  NEEDS_RELEARNING: {
    label: 'Needs Relearning',
    className: 'border-rose-500/35 bg-rose-500/10 text-rose-700 dark:text-rose-300',
  },
};

export function TodayTasks() {
  const {
    activeNormalizedPlan,
    chapterMasteryByChapterId,
    conceptMasteryList,
    analytics,
    transitionObjective,
    applyAssessmentSubmission,
    reschedulePlanMissedDays,
  } = useEnginesWorkspace();

  const todayIso = formatIsoDate(new Date());
  const [selectedDayNum, setSelectedDayNum] = useState<number | null>(null);
  const [stateFilter, setStateFilter] = useState<'all' | ObjectiveState>('all');
  const [verifyingObjective, setVerifyingObjective] = useState<PlanObjective | null>(null);
  const [rescheduleResult, setRescheduleResult] = useState<RescheduleResult | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [busyObjId, setBusyObjId] = useState<string | null>(null);

  const days = activeNormalizedPlan?.days || [];

  const overdueObjectives = useMemo(() => {
    return days
      .filter((d) => d.scheduledDate < todayIso)
      .flatMap((d) =>
        d.objectives.filter(
          (o) =>
            o.state === 'PENDING' ||
            o.state === 'IN_PROGRESS' ||
            o.state === 'NEEDS_RELEARNING'
        )
      );
  }, [days, todayIso]);

  const activeDay = useMemo(() => {
    if (days.length === 0) return null;
    if (selectedDayNum !== null) {
      return days.find((d) => d.dayNumber === selectedDayNum) || days[0];
    }
    const matchingToday = days.find((d) => d.scheduledDate === todayIso);
    if (matchingToday) return matchingToday;
    const firstPendingDay = days.find((d) =>
      d.objectives.some((o) => !isObjectiveStudiedOrBeyond(o.state))
    );
    return firstPendingDay || days[0];
  }, [days, selectedDayNum, todayIso]);

  const visibleObjectives = useMemo(() => {
    const list = activeDay?.objectives || [];
    if (stateFilter === 'all') return list;
    return list.filter((o) => o.state === stateFilter);
  }, [activeDay, stateFilter]);

  const handleStateTransition = async (
    obj: PlanObjective,
    nextState: ObjectiveState
  ) => {
    setBusyObjId(obj.id);
    setNoticeMessage(null);
    try {
      const res = await transitionObjective(obj.id, nextState);
      if (res?.needsVerificationPrompt) {
        setNoticeMessage(
          `Marked "${obj.title}" as studied. Pass its short 3–5 question check to promote it to VERIFIED mastery.`
        );
      }
    } catch (err: any) {
      setNoticeMessage(err?.message || 'Could not update objective state.');
    } finally {
      setBusyObjId(null);
    }
  };

  const handleMissedTaskRecovery = async () => {
    setNoticeMessage(null);
    const res = await reschedulePlanMissedDays();
    if (!res) return;
    setRescheduleResult(res);
    setNoticeMessage(res.summaryMessage);
  };

  if (!activeNormalizedPlan) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-card text-indigo-500">
          <Calendar size={22} />
        </div>
        <h1 className="font-display text-2xl font-bold text-foreground">
          No active study roadmap yet
        </h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Build a 3, 7, 21, or 30-day backlog plan to unlock daily objectives with 6-state execution tracking and missed-task recovery.
        </p>
        <Link
          href="/onboarding?reset=true"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-xs font-mono font-bold text-white"
        >
          <span>Create Recovery Plan</span>
          <ArrowRight size={13} />
        </Link>
      </div>
    );
  }

  const dayStudiedCount = (activeDay?.objectives || []).filter((o) =>
    isObjectiveStudiedOrBeyond(o.state)
  ).length;
  const dayVerifiedCount = (activeDay?.objectives || []).filter(
    (o) => o.state === 'VERIFIED'
  ).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 space-y-6 animate-page-enter">
      {/* Command Header */}
      <section className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-muted-foreground">
              <span className="font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Execution Engine · Daily Objectives
              </span>
              <span aria-hidden="true">·</span>
              <span>{activeNormalizedPlan.name}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{activeNormalizedPlan.minutesPerDay}m/day cap</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Today&apos;s Tasks &amp; Objective Execution
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
              Marking an objective studied logs backlog clearance only — true verified understanding requires passing its objective verification quiz.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 font-mono text-xs shrink-0">
            <button
              type="button"
              onClick={() => void handleMissedTaskRecovery()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/35 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 px-3 py-2 font-semibold transition cursor-pointer whitespace-nowrap"
              data-testid="button-rebalance-missed-tasks"
            >
              <RotateCcw size={13} />
              <span>
                Rebalance Missed ({overdueObjectives.length})
              </span>
            </button>

            <Link
              href="/roadmap"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background hover:bg-muted px-3 py-2 font-semibold text-foreground transition whitespace-nowrap"
            >
              <Compass size={13} className="text-emerald-500" />
              <span>Full Route</span>
            </Link>
          </div>
        </div>

        {/* Separated Progress Summary Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono tabular-nums">
          <div className="rounded-lg border border-border bg-background p-3">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">
              Day Studied
            </span>
            <span className="mt-1 block text-xl font-bold text-foreground">
              {dayStudiedCount} / {activeDay?.objectives.length || 0}
            </span>
            <span className="text-[10px] text-muted-foreground">Backlog study blocks</span>
          </div>

          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
            <span className="text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-300 font-semibold block">
              Day Verified
            </span>
            <span className="mt-1 block text-xl font-bold text-foreground">
              {dayVerifiedCount} / {activeDay?.objectives.length || 0}
            </span>
            <span className="text-[10px] text-muted-foreground">Server-verified mastery</span>
          </div>

          <div className="rounded-lg border border-border bg-background p-3">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">
              Day Load / Cap
            </span>
            <span className="mt-1 block text-xl font-bold text-foreground">
              {activeDay?.allocatedMinutes || 0}m / {activeDay?.maxCapacityMinutes || activeNormalizedPlan.minutesPerDay}m
            </span>
            <span className="text-[10px] text-muted-foreground">Protected daily limit</span>
          </div>

          <div className="rounded-lg border border-border bg-background p-3">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">
              Plan Verified Total
            </span>
            <span className="mt-1 block text-xl font-bold text-foreground">
              {analytics.verifiedObjectivesCount} / {analytics.totalObjectivesCount}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {analytics.completedObjectivesCount} studied overall
            </span>
          </div>
        </div>

        {/* Prerequisite Warnings */}
        {activeNormalizedPlan.prerequisiteWarnings.length > 0 && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
            <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-500" />
            <div className="space-y-0.5">
              <p className="font-mono font-bold uppercase text-[10px]">Prerequisite Order Active</p>
              <p>{activeNormalizedPlan.prerequisiteWarnings[0]}</p>
            </div>
          </div>
        )}

        {/* Reschedule / State Transition Feedback */}
        {noticeMessage && (
          <div
            className="rounded-lg border border-indigo-500/35 bg-indigo-500/10 px-4 py-2.5 text-xs font-mono text-indigo-800 dark:text-indigo-200 flex items-center justify-between gap-2"
            data-testid="banner-execution-notice"
          >
            <span>{noticeMessage}</span>
            {rescheduleResult && rescheduleResult.createdOverflowDaysCount > 0 && (
              <span className="font-bold shrink-0">
                +{rescheduleResult.createdOverflowDaysCount} overflow day(s) added
              </span>
            )}
          </div>
        )}
      </section>

      {/* Day Switcher + Status Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {days.map((d) => {
            const isSelected = activeDay?.dayNumber === d.dayNumber;
            const isToday = d.scheduledDate === todayIso;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => setSelectedDayNum(d.dayNumber)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-mono whitespace-nowrap shrink-0 transition cursor-pointer ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-600 text-white font-bold'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground'
                }`}
              >
                Day {d.dayNumber}
                {isToday ? ' · Today' : ''}
                {d.isRecoveryDay ? ' · Recovery' : ''}
              </button>
            );
          })}
        </div>

        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value as any)}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-mono text-foreground"
          aria-label="Filter objectives by state"
        >
          <option value="all">All States ({activeDay?.objectives.length || 0})</option>
          <option value="PENDING">Pending</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="STUDIED">Studied (Unverified)</option>
          <option value="VERIFICATION_PENDING">Verification Pending</option>
          <option value="VERIFIED">Verified Mastery</option>
          <option value="NEEDS_RELEARNING">Needs Relearning</option>
        </select>
      </div>

      {/* Verification Runner Modal/Drawer when triggered from an objective */}
      {verifyingObjective && (
        <VerificationQuizRunner
          chapterId={verifyingObjective.chapterId}
          chapterTitle={
            resolveChapterById(verifyingObjective.chapterId)?.title ||
            verifyingObjective.title
          }
          subjectName={verifyingObjective.subjectName}
          defaultType="OBJECTIVE"
          objectiveId={verifyingObjective.id}
          objectiveTitle={verifyingObjective.title}
          chapterMastery={chapterMasteryByChapterId.get(verifyingObjective.chapterId)}
          conceptMastery={conceptMasteryList.filter(
            (c) => c.chapterId === verifyingObjective.chapterId
          )}
          onCompleted={applyAssessmentSubmission}
          onClose={() => setVerifyingObjective(null)}
        />
      )}

      {/* Objectives Execution List */}
      <section className="rounded-xl border border-border bg-card divide-y divide-border">
        {visibleObjectives.length === 0 ? (
          <div className="py-10 px-4 text-center text-xs font-mono text-muted-foreground">
            No objectives match the selected filter on Day {activeDay?.dayNumber}.
          </div>
        ) : (
          visibleObjectives.map((obj) => {
            const badge = STATE_BADGE_MAP[obj.state];
            const isBusy = busyObjId === obj.id;
            const chTitle = resolveChapterById(obj.chapterId)?.title || obj.chapterId;

            return (
              <div
                key={obj.id}
                className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-muted/15 transition"
                data-testid={`objective-row-${obj.id}`}
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                    <span className="font-bold text-foreground">{obj.subjectName}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground truncate">{chTitle}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="inline-flex items-center gap-1 tabular-nums text-muted-foreground">
                      <Clock size={11} />
                      {obj.estimatedMinutes}m
                    </span>
                    <span
                      className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-bold ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-semibold text-foreground">
                    {obj.title}
                  </h3>

                  {obj.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {obj.description}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 font-mono text-xs shrink-0">
                  <Link
                    href={`/study?chapter=${obj.chapterId}&duration=${obj.estimatedMinutes}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-background hover:bg-muted px-3 py-1.5 font-semibold text-foreground transition whitespace-nowrap"
                  >
                    <BookOpen size={12} />
                    <span>Study</span>
                  </Link>

                  {(obj.state === 'PENDING' || obj.state === 'NEEDS_RELEARNING') && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleStateTransition(obj, 'IN_PROGRESS')}
                      className="inline-flex items-center gap-1 rounded-lg border border-sky-500/35 bg-sky-500/10 hover:bg-sky-500/20 px-3 py-1.5 font-semibold text-sky-700 dark:text-sky-300 transition cursor-pointer whitespace-nowrap"
                    >
                      <Play size={11} />
                      <span>Start</span>
                    </button>
                  )}

                  {obj.state !== 'STUDIED' &&
                    obj.state !== 'VERIFICATION_PENDING' &&
                    obj.state !== 'VERIFIED' && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleStateTransition(obj, 'STUDIED')}
                        className="inline-flex items-center gap-1 rounded-lg border border-amber-500/35 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 font-semibold text-amber-700 dark:text-amber-300 transition cursor-pointer whitespace-nowrap"
                        data-testid={`button-mark-studied-${obj.id}`}
                      >
                        <CheckCircle2 size={12} />
                        <span>Mark Studied</span>
                      </button>
                    )}

                  {obj.state !== 'VERIFIED' && (
                    <button
                      type="button"
                      onClick={() => {
                        setVerifyingObjective(obj);
                        if (obj.state === 'STUDIED') {
                          void handleStateTransition(obj, 'VERIFICATION_PENDING');
                        }
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3.5 py-1.5 font-bold text-white transition cursor-pointer whitespace-nowrap"
                      data-testid={`button-verify-objective-${obj.id}`}
                    >
                      <Sparkles size={12} />
                      <span>Verify Objective</span>
                    </button>
                  )}

                  {obj.state === 'VERIFIED' && (
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold px-2">
                      <ShieldCheck size={14} />
                      <span>Verified</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}

export default TodayTasks;
