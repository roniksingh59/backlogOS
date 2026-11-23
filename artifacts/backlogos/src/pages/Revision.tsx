import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  History,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useEnginesWorkspace } from '@/hooks/use-engines-workspace';
import {
  evaluateReviewScheduleStatus,
  formatReviewDateIso,
  INITIAL_REVIEW_INTERVALS_DAYS,
} from '@/lib/engines/retention-engine';
import { resolveChapterById } from '@/lib/backlog-data';
import { VerificationQuizRunner } from '@/components/VerificationQuizRunner';
import type { ReviewScheduleRecord } from '@/lib/engines/types';

type RevisionTab = 'due' | 'upcoming' | 'completed' | 'history';

export function Revision() {
  const {
    reviewSchedulesList,
    chapterMasteryList,
    chapterMasteryByChapterId,
    conceptMasteryList,
    masteryHistoryList,
    backlogItems,
    analytics,
    submitRetentionReviewOutcome,
    ensureReviewScheduleForChapter,
    applyAssessmentSubmission,
  } = useEnginesWorkspace();

  const todayStr = formatReviewDateIso(new Date());
  const [tab, setTab] = useState<RevisionTab>('due');
  const [activeQuizSchedule, setActiveQuizSchedule] = useState<ReviewScheduleRecord | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const enrichedSchedules = useMemo(() => {
    return reviewSchedulesList.map((s) => {
      const liveStatus = evaluateReviewScheduleStatus(s, todayStr);
      const ch = resolveChapterById(s.chapterId);
      const mastery = chapterMasteryByChapterId.get(s.chapterId);
      return {
        ...s,
        liveStatus,
        chapterTitle: s.chapterTitle || ch?.title || s.chapterId,
        subjectName: s.subjectName || ch?.subject || 'General',
        mastery,
      };
    });
  }, [reviewSchedulesList, todayStr, chapterMasteryByChapterId]);

  const dueSchedules = useMemo(
    () => enrichedSchedules.filter((s) => s.liveStatus === 'DUE' || s.liveStatus === 'OVERDUE'),
    [enrichedSchedules]
  );
  const upcomingSchedules = useMemo(
    () => enrichedSchedules.filter((s) => s.liveStatus === 'SCHEDULED'),
    [enrichedSchedules]
  );
  const completedSchedules = useMemo(
    () => enrichedSchedules.filter((s) => s.liveStatus === 'COMPLETED'),
    [enrichedSchedules]
  );

  // Chapters that finished study/mastery without an active review cycle yet
  const unscheduledEligibleChapters = useMemo(() => {
    const activeChapterSet = new Set(
      enrichedSchedules
        .filter((s) => s.liveStatus !== 'COMPLETED')
        .map((s) => s.chapterId)
    );
    const eligible = new Set<string>();
    for (const cm of chapterMasteryList) {
      if (
        (cm.studyCompleted || cm.status === 'MASTERED' || cm.status === 'STUDY_COMPLETE' || cm.status === 'NEEDS_REVISION') &&
        !activeChapterSet.has(cm.chapterId)
      ) {
        eligible.add(cm.chapterId);
      }
    }
    for (const bi of backlogItems) {
      if (bi.status === 'completed' && !activeChapterSet.has(bi.chapterId)) {
        eligible.add(bi.chapterId);
      }
    }
    return Array.from(eligible)
      .map((id) => resolveChapterById(id))
      .filter(Boolean);
  }, [enrichedSchedules, chapterMasteryList, backlogItems]);

  const handleSelfRecall = async (
    schedule: ReviewScheduleRecord,
    quality: 1 | 3 | 5
  ) => {
    setBusyId(schedule.id);
    setFeedbackMsg(null);
    try {
      const outcome = await submitRetentionReviewOutcome(schedule.id, quality);
      if (outcome) {
        setFeedbackMsg(outcome.historyEvent.notes);
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleScheduleChapter = async (chapterId: string) => {
    setBusyId(chapterId);
    const created = await ensureReviewScheduleForChapter(chapterId);
    setFeedbackMsg(
      `Scheduled 1-day spaced review for ${created.chapterTitle || chapterId} (${INITIAL_REVIEW_INTERVALS_DAYS.join('-')}d cycle).`
    );
    setBusyId(null);
  };

  const visibleList =
    tab === 'due'
      ? dueSchedules
      : tab === 'upcoming'
      ? upcomingSchedules
      : completedSchedules;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 space-y-6 animate-page-enter">
      {/* Header */}
      <section className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-4">
          <div className="space-y-1">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
              Retention Engine · Spaced Repetition ({INITIAL_REVIEW_INTERVALS_DAYS.join(', ')} Days)
            </span>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Spaced Revision &amp; Memory Health
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
              Review intervals adapt automatically based on verified recall performance while permanently preserving historical chapter mastery records.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 font-mono text-xs shrink-0">
            <Link
              href="/study"
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 font-bold transition whitespace-nowrap"
            >
              <Sparkles size={13} />
              <span>Open Learn &amp; Test</span>
            </Link>
            <Link
              href="/analytics"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background hover:bg-muted px-3 py-2 font-semibold text-foreground transition whitespace-nowrap"
            >
              <span>View Analytics</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* Summary Metrics Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono tabular-nums">
          <div className="rounded-lg border border-border bg-background p-3">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">
              Retention Health
            </span>
            <span className="mt-1 block text-2xl font-bold text-foreground">
              {analytics.hasRetentionData ? `${analytics.retentionHealthPercent}%` : 'No data yet'}
            </span>
            <span className="text-[10px] text-muted-foreground">
              Computed from review_schedule
            </span>
          </div>

          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
            <span className="text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-300 font-semibold block">
              Due / Overdue Today
            </span>
            <span className="mt-1 block text-2xl font-bold text-foreground">
              {dueSchedules.length}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {analytics.overdueRevisionsCount} overdue
            </span>
          </div>

          <div className="rounded-lg border border-border bg-background p-3">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">
              Upcoming Reviews
            </span>
            <span className="mt-1 block text-2xl font-bold text-foreground">
              {upcomingSchedules.length}
            </span>
            <span className="text-[10px] text-muted-foreground">
              Scheduled ahead
            </span>
          </div>

          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
            <span className="text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-300 font-semibold block">
              Completed Cycles
            </span>
            <span className="mt-1 block text-2xl font-bold text-foreground">
              {completedSchedules.length}
            </span>
            <span className="text-[10px] text-muted-foreground">
              Historical mastery preserved
            </span>
          </div>
        </div>

        {feedbackMsg && (
          <div
            className="rounded-lg border border-indigo-500/35 bg-indigo-500/10 px-4 py-2.5 text-xs font-mono text-indigo-800 dark:text-indigo-200"
            data-testid="banner-revision-feedback"
          >
            {feedbackMsg}
          </div>
        )}
      </section>

      {/* Active Retention Quiz Panel */}
      {activeQuizSchedule && (
        <VerificationQuizRunner
          chapterId={activeQuizSchedule.chapterId}
          chapterTitle={activeQuizSchedule.chapterTitle || activeQuizSchedule.chapterId}
          subjectName={activeQuizSchedule.subjectName || 'Physics'}
          defaultType="REVISION"
          reviewScheduleId={activeQuizSchedule.id}
          chapterMastery={chapterMasteryByChapterId.get(activeQuizSchedule.chapterId)}
          conceptMastery={conceptMasteryList.filter(
            (c) => c.chapterId === activeQuizSchedule.chapterId
          )}
          onCompleted={async (res, ctx) => {
            await applyAssessmentSubmission(res, ctx);
            setFeedbackMsg(
              res.summary.passed
                ? `Retention check passed (${res.summary.scorePercent}%). Next spaced interval scheduled.`
                : `Recall needs reinforcement (${res.summary.scorePercent}%). Reset to 1-day interval while preserving prior peak mastery.`
            );
          }}
          onClose={() => setActiveQuizSchedule(null)}
        />
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
        {(
          [
            { id: 'due', label: `Due & Overdue (${dueSchedules.length})` },
            { id: 'upcoming', label: `Upcoming (${upcomingSchedules.length})` },
            { id: 'completed', label: `Completed (${completedSchedules.length})` },
            { id: 'history', label: `Mastery History (${masteryHistoryList.length})` },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg border px-3 py-1.5 font-semibold transition cursor-pointer whitespace-nowrap ${
              tab === t.id
                ? 'border-indigo-500 bg-indigo-600 text-white'
                : 'border-border bg-card text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Revision Schedule List or History Log */}
      {tab === 'history' ? (
        <section className="rounded-xl border border-border bg-card divide-y divide-border">
          {masteryHistoryList.length === 0 ? (
            <div className="py-10 px-4 text-center text-xs font-mono text-muted-foreground">
              No mastery or revision audit events recorded yet. Complete objectives, assessments, or spaced reviews to build an immutable log.
            </div>
          ) : (
            masteryHistoryList.slice(0, 40).map((ev) => {
              const ch = resolveChapterById(ev.chapterId);
              return (
                <div
                  key={ev.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">
                        {ev.eventType}
                      </span>
                      <span className="text-muted-foreground">·</span>
                      <span className="font-semibold text-foreground">
                        {ch?.title || ev.chapterId}
                      </span>
                      {ev.scorePercent !== null && ev.scorePercent !== undefined && (
                        <>
                          <span className="text-muted-foreground">·</span>
                          <span className="tabular-nums font-bold">{ev.scorePercent}%</span>
                        </>
                      )}
                    </div>
                    <p className="text-muted-foreground">{ev.notes}</p>
                  </div>

                  <span className="font-mono text-[11px] text-muted-foreground shrink-0 tabular-nums">
                    {new Date(ev.recordedAt).toLocaleDateString()}
                  </span>
                </div>
              );
            })
          )}
        </section>
      ) : (
        <section className="rounded-xl border border-border bg-card divide-y divide-border">
          {visibleList.length === 0 ? (
            <div className="py-10 px-4 text-center space-y-2 text-xs font-mono text-muted-foreground">
              <p className="font-semibold text-foreground">
                {tab === 'due'
                  ? 'No spaced revisions due today.'
                  : tab === 'upcoming'
                  ? 'No upcoming review dates scheduled.'
                  : 'No completed revision cycles recorded yet.'}
              </p>
              <p>
                Pass a Chapter Mastery exam or enroll any completed chapter below to activate 1, 3, 7, 14, 30-day spacing.
              </p>
            </div>
          ) : (
            visibleList.map((sched) => (
              <div
                key={sched.id}
                className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-muted/15 transition"
                data-testid={`revision-row-${sched.id}`}
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                    <span className="font-bold text-foreground">{sched.subjectName}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="tabular-nums text-muted-foreground">
                      Step {sched.intervalStep} ({sched.intervalDays}d interval)
                    </span>
                    <span className="text-muted-foreground">·</span>
                    <span
                      className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-bold ${
                        sched.liveStatus === 'OVERDUE'
                          ? 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                          : sched.liveStatus === 'DUE'
                          ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                          : sched.liveStatus === 'COMPLETED'
                          ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                          : 'border-border bg-muted/30 text-muted-foreground'
                      }`}
                    >
                      {sched.liveStatus === 'OVERDUE'
                        ? `Overdue (${sched.dueDate})`
                        : sched.liveStatus === 'DUE'
                        ? 'Due Today'
                        : sched.liveStatus === 'COMPLETED'
                        ? 'Reviewed'
                        : `Due ${sched.dueDate}`}
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-semibold text-foreground">
                    {sched.chapterTitle}
                  </h3>

                  <div className="text-[11px] font-mono text-muted-foreground flex flex-wrap gap-3 tabular-nums">
                    <span>Health: {sched.retentionHealthScore}%</span>
                    {sched.mastery && (
                      <>
                        <span>·</span>
                        <span>Status: {sched.mastery.status}</span>
                        {sched.mastery.bestMasteryScore > 0 && (
                          <>
                            <span>·</span>
                            <span>Peak Score: {sched.mastery.bestMasteryScore}%</span>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {sched.liveStatus !== 'COMPLETED' && (
                  <div className="flex flex-wrap items-center gap-2 font-mono text-xs shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveQuizSchedule(sched)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 font-bold text-white transition cursor-pointer whitespace-nowrap"
                      data-testid={`button-revision-quiz-${sched.id}`}
                    >
                      <Sparkles size={12} />
                      <span>Verify Recall (Quiz)</span>
                    </button>

                    <button
                      type="button"
                      disabled={busyId === sched.id}
                      onClick={() => void handleSelfRecall(sched, 5)}
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/35 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1.5 font-semibold text-emerald-700 dark:text-emerald-300 transition cursor-pointer whitespace-nowrap"
                    >
                      <CheckCircle2 size={12} />
                      <span>Strong</span>
                    </button>

                    <button
                      type="button"
                      disabled={busyId === sched.id}
                      onClick={() => void handleSelfRecall(sched, 3)}
                      className="inline-flex items-center gap-1 rounded-lg border border-amber-500/35 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1.5 font-semibold text-amber-700 dark:text-amber-300 transition cursor-pointer whitespace-nowrap"
                    >
                      <Clock size={12} />
                      <span>Shaky</span>
                    </button>

                    <button
                      type="button"
                      disabled={busyId === sched.id}
                      onClick={() => void handleSelfRecall(sched, 1)}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-500/35 bg-rose-500/10 hover:bg-rose-500/20 px-2.5 py-1.5 font-semibold text-rose-700 dark:text-rose-300 transition cursor-pointer whitespace-nowrap"
                    >
                      <AlertTriangle size={12} />
                      <span>Lapsed</span>
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </section>
      )}

      {/* Quick Enroll Completed Chapters into Spaced Revision */}
      {unscheduledEligibleChapters.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold block">
                Enroll Completed Chapters
              </span>
              <h2 className="font-display text-base font-bold text-foreground">
                Add Chapters to 1, 3, 7, 14, 30-Day Retention Queue
              </h2>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {unscheduledEligibleChapters.slice(0, 6).map((ch) =>
              ch ? (
                <div
                  key={ch.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{ch.title}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">{ch.subject}</p>
                  </div>
                  <button
                    type="button"
                    disabled={busyId === ch.id}
                    onClick={() => void handleScheduleChapter(ch.id)}
                    className="inline-flex items-center gap-1 rounded border border-indigo-500/35 bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1 font-mono text-[11px] font-bold text-indigo-700 dark:text-indigo-300 shrink-0 cursor-pointer"
                  >
                    <Plus size={11} />
                    <span>Schedule</span>
                  </button>
                </div>
              ) : null
            )}
          </div>
        </section>
      )}
    </div>
  );
}

export default Revision;
