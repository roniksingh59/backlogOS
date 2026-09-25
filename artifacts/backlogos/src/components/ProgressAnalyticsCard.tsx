import { useMemo } from 'react';
import {
  TrendingUp,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Flame,
  Award,
} from 'lucide-react';
import { type BacklogItem, calculateBacklogMetrics } from '@/lib/backlog-items';
import type { StudySession } from '@/lib/storage';

interface ProgressAnalyticsCardProps {
  items: BacklogItem[];
  sessions: StudySession[];
  dailyHoursTarget?: number;
}

export function ProgressAnalyticsCard({
  items,
  sessions,
  dailyHoursTarget = 3.5,
}: ProgressAnalyticsCardProps) {
  const metrics = useMemo(
    () => calculateBacklogMetrics(items, dailyHoursTarget),
    [items, dailyHoursTarget]
  );

  // Time calculations
  const now = Date.now();
  const weekAgo = now - 7 * 86400000;
  const monthAgo = now - 30 * 86400000;

  const weeklyMinutes = sessions
    .filter((s) => new Date(s.completedAt).getTime() >= weekAgo)
    .reduce((sum, s) => sum + s.minutes, 0);

  const monthlyMinutes = sessions
    .filter((s) => new Date(s.completedAt).getTime() >= monthAgo)
    .reduce((sum, s) => sum + s.minutes, 0);

  const weeklyHours = Math.round((weeklyMinutes / 60) * 10) / 10;
  const monthlyHours = Math.round((monthlyMinutes / 60) * 10) / 10;

  const completedChaptersCount = items.filter((i) => i.status === 'completed').length;

  // Backlog reduction trajectory over past 7 days (simulated curve based on cumulative session hours)
  const chartPoints = useMemo(() => {
    const points: { dayLabel: string; remaining: number }[] = [];
    let cumulativeHours = 0;

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * 86400000);
      const dayStr = d.toLocaleDateString('en-US', { weekday: 'narrow' });
      // approximate reduction point
      const simulatedReduction = Math.min(
        metrics.completedHours,
        Math.round((metrics.completedHours * (7 - i) / 7) * 10) / 10
      );
      const remainingAtThatPoint = Math.max(
        0,
        Math.round((metrics.totalBacklogHours - simulatedReduction) * 10) / 10
      );
      points.push({ dayLabel: dayStr, remaining: remainingAtThatPoint });
    }
    return points;
  }, [now, metrics]);

  const maxVal = Math.max(10, metrics.totalBacklogHours);
  const minVal = Math.max(0, metrics.remainingHours - 5);

  return (
    <section
      className="border border-border bg-card p-5 sm:p-6 space-y-6"
      data-testid="card-progress-analytics"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block">
            Velocity & Volume Diagnostics
          </span>
          <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight text-foreground mt-0.5 flex items-center gap-2">
            Progress Analytics
            <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.2 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {metrics.percentageCompleted}% Backlog Cleared
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-muted-foreground">
            7-Day Volume:{' '}
            <strong className="text-foreground">{weeklyHours}h</strong>
          </span>
          <span className="text-border">·</span>
          <span className="text-muted-foreground">
            30-Day Volume:{' '}
            <strong className="text-foreground">{monthlyHours}h</strong>
          </span>
        </div>
      </div>

      {/* Subject-Wise Progress Breakdown */}
      <div>
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-3">
          Subject Completion Breakdown
        </span>
        <div className="grid gap-3 sm:grid-cols-3">
          {(['Physics', 'Chemistry', 'Mathematics'] as const).map((sub) => {
            const data = metrics.subjectMetrics[sub];
            const pct = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
            return (
              <div
                key={sub}
                className="border border-border bg-background p-3.5 space-y-2 font-mono"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground">{sub}</span>
                  <span className="font-bold text-foreground">{pct}%</span>
                </div>
                <div className="h-1.5 w-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-foreground transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>{data.completed}h done</span>
                  <span>{data.remaining}h left</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Visual Reduction Trajectory Chart */}
      <div className="border border-border bg-background p-4">
        <div className="flex items-center justify-between mb-4 font-mono text-xs">
          <span className="font-bold text-foreground">Rolling 7-Day Backlog Clearance (Hours Remaining)</span>
          <span className="text-muted-foreground text-[11px]">
            {metrics.remainingHours}h remaining / {metrics.totalBacklogHours}h total
          </span>
        </div>

        {/* Monospaced Bar chart */}
        <div className="h-32 w-full flex items-end justify-between gap-3 pt-3 px-1 border-b border-border font-mono">
          {chartPoints.map((pt, i) => {
            const heightPct = Math.min(100, Math.max(15, (pt.remaining / maxVal) * 100));
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                <span className="text-[10px] text-muted-foreground">
                  {pt.remaining}h
                </span>
                <div
                  className="w-full bg-foreground hover:opacity-80 transition-all"
                  style={{ height: `${heightPct}%` }}
                />
                <span className="text-[10px] text-muted-foreground mt-1">
                  {pt.dayLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
