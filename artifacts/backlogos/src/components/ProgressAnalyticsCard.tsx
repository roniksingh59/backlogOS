import { useMemo } from 'react';
import { computeSeparatedAnalytics } from '@/lib/engines/analytics-engine';
import {
  readCachedChapterMastery,
  readCachedConceptMastery,
  readCachedNormalizedPlans,
  readCachedReviewSchedules,
} from '@/lib/engines/v2-sync-service';
import { getActiveUserId } from '@/lib/supabase';
import type { AnalyticsDashboardMetrics } from '@/lib/engines/types';
import type { BacklogItem } from '@/lib/backlog-items';
import type { StudySession } from '@/lib/storage';

interface ProgressAnalyticsCardProps {
  items: BacklogItem[];
  sessions: StudySession[];
  dailyHoursTarget?: number;
  plan?: { id?: string; days?: { tasks?: { id: string; chapterId?: string; minutes?: number }[] }[] } | null;
  completedIds?: string[];
  analytics?: AnalyticsDashboardMetrics;
}

export function ProgressAnalyticsCard({
  items,
  sessions,
  plan,
  analytics: explicitAnalytics,
}: ProgressAnalyticsCardProps) {
  const userId = getActiveUserId();

  const metrics = useMemo(() => {
    if (explicitAnalytics) return explicitAnalytics;
    const normalizedPlans = readCachedNormalizedPlans(userId);
    const activeNorm =
      (plan?.id ? normalizedPlans.find((p) => p.id === plan.id) : null) ||
      normalizedPlans.find((p) => p.isActive) ||
      normalizedPlans[0] ||
      null;
    const objectives = activeNorm ? activeNorm.days.flatMap((d) => d.objectives) : [];

    return computeSeparatedAnalytics({
      backlogItems: items,
      objectives,
      chapterMastery: readCachedChapterMastery(userId),
      conceptMastery: readCachedConceptMastery(userId),
      reviewSchedules: readCachedReviewSchedules(userId),
      studySessions: sessions,
    });
  }, [explicitAnalytics, items, plan?.id, sessions, userId]);

  const weeklyHours = Math.round(
    (metrics.weeklyActivity.reduce((sum, pt) => sum + pt.minutesStudied, 0) / 60) * 10
  ) / 10;

  const maxWeeklyMinutes = Math.max(
    30,
    ...metrics.weeklyActivity.map((pt) => pt.minutesStudied)
  );

  return (
    <section
      className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-6"
      data-testid="card-progress-analytics"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block">
            Separated Academic Diagnostics
          </span>
          <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight text-foreground mt-0.5">
            Backlog Clearance vs Learning Mastery
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-mono tabular-nums">
          <span className="text-muted-foreground">
            7-Day Study Logged:{' '}
            <strong className="text-foreground">{weeklyHours}h</strong>
          </span>
          <span className="text-border">·</span>
          <span className="text-muted-foreground">
            Verified Objectives:{' '}
            <strong className="text-emerald-600 dark:text-emerald-400">
              {metrics.verifiedObjectivesCount}/{metrics.totalObjectivesCount}
            </strong>
          </span>
        </div>
      </div>

      {/* Three Strictly Separated Top Bars */}
      <div className="grid gap-3 md:grid-cols-3 font-mono text-xs tabular-nums">
        <div className="rounded-lg border border-border bg-background p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Backlog Clearance
            </span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">
              {metrics.backlogClearancePercent}%
            </span>
          </div>
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-300"
              style={{ width: `${metrics.backlogClearancePercent}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            {metrics.studyCompletedChaptersCount} of {metrics.totalBacklogChapters} chapters studied
          </p>
        </div>

        <div className="rounded-lg border border-border bg-background p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Concept Mastery
            </span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {metrics.hasAssessmentData ? `${metrics.conceptMasteryPercent}%` : 'Unassessed'}
            </span>
          </div>
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${metrics.hasAssessmentData ? metrics.conceptMasteryPercent : 0}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            {metrics.masteredChaptersCount} mastered chapters · {metrics.weakConcepts.length} weak concepts
          </p>
        </div>

        <div className="rounded-lg border border-border bg-background p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Retention Health
            </span>
            <span className="font-bold text-amber-600 dark:text-amber-400">
              {metrics.hasRetentionData ? `${metrics.retentionHealthPercent}%` : 'Pending'}
            </span>
          </div>
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all duration-300"
              style={{ width: `${metrics.hasRetentionData ? metrics.retentionHealthPercent : 0}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            {metrics.pendingRevisionsCount} pending reviews ({metrics.overdueRevisionsCount} overdue)
          </p>
        </div>
      </div>

      {/* Subject-Wise Separated Clearance vs Mastery Breakdown */}
      {metrics.subjectBreakdown.length > 0 && (
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-3">
            Subject Clearance vs Concept Mastery
          </span>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {metrics.subjectBreakdown.map((sub) => (
              <div
                key={sub.subject}
                className="rounded-lg border border-border bg-background p-3.5 space-y-2.5 font-mono text-xs tabular-nums"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">{sub.subject}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {sub.studyCompletedChapters}/{sub.totalChapters} studied · {sub.masteredChapters} mastered
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Backlog Clearance</span>
                    <span className="font-bold text-foreground">{sub.backlogClearancePercent}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500"
                      style={{ width: `${sub.backlogClearancePercent}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Concept Mastery ({sub.assessedConceptsCount} concepts)</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {sub.assessedConceptsCount > 0 ? `${sub.conceptMasteryPercent}%` : '—'}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500"
                      style={{
                        width: `${sub.assessedConceptsCount > 0 ? sub.conceptMasteryPercent : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Real 7-Day Focus & Verification Activity Chart */}
      <div className="rounded-lg border border-border bg-background p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 font-mono text-xs">
          <span className="font-bold text-foreground">
            7-Day Persistent Study &amp; Verification Activity
          </span>
          <span className="text-muted-foreground text-[11px] tabular-nums">
            Total logged: {metrics.totalFocusMinutesLogged}m · Streak: {metrics.activeStudyStreakDays}d
          </span>
        </div>

        <div className="h-32 w-full flex items-end justify-between gap-3 pt-3 px-1 border-b border-border font-mono tabular-nums">
          {metrics.weeklyActivity.map((pt) => {
            const heightPct =
              pt.minutesStudied > 0
                ? Math.min(100, Math.max(12, Math.round((pt.minutesStudied / maxWeeklyMinutes) * 100)))
                : 4;
            return (
              <div
                key={pt.date}
                className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end"
                title={`${pt.date}: ${pt.minutesStudied}m studied, ${pt.objectivesStudied} studied, ${pt.objectivesVerified} verified`}
              >
                <span className="text-[10px] text-muted-foreground">
                  {pt.minutesStudied > 0 ? `${pt.minutesStudied}m` : '0m'}
                </span>
                <div
                  className={`w-full rounded-t transition-all ${
                    pt.objectivesVerified > 0
                      ? 'bg-emerald-500'
                      : pt.minutesStudied > 0
                      ? 'bg-indigo-500'
                      : 'bg-muted'
                  }`}
                  style={{ height: `${heightPct}%` }}
                />
                <span className="text-[10px] text-muted-foreground mt-1">{pt.dayLabel}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
