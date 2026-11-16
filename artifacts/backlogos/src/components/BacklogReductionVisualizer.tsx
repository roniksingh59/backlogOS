import { useMemo } from 'react';
import { type BacklogItem, calculateBacklogMetrics } from '@/lib/backlog-items';

interface BacklogReductionVisualizerProps {
  items: BacklogItem[];
  dailyHoursTarget?: number;
  examDateStr?: string;
  plan?: { days?: { tasks?: { id: string; chapterId?: string; minutes?: number }[] }[] } | null;
  completedIds?: string[];
}

export function BacklogReductionVisualizer({
  items,
  dailyHoursTarget = 3.5,
  examDateStr,
  plan,
  completedIds = [],
}: BacklogReductionVisualizerProps) {
  const metrics = useMemo(
    () => calculateBacklogMetrics(items, dailyHoursTarget, plan, completedIds),
    [items, dailyHoursTarget, plan, completedIds]
  );

  const totalCh = metrics.totalChapters;
  const remainingCh = metrics.remainingChapters;
  const completedCh = metrics.completedChapters;

  // Milestone trajectory steps down to 0 chapters pending
  const milestones = useMemo(() => {
    const s1 = totalCh;
    const s2 = Math.max(0, Math.round(totalCh * 0.75));
    const s3 = Math.max(0, Math.round(totalCh * 0.5));
    const s4 = Math.max(0, Math.round(totalCh * 0.25));
    const s5 = 0;
    return [
      { count: s1, label: `${s1} ch baseline` },
      { count: s2, label: `${s2} ch milestone` },
      { count: s3, label: `${s3} ch halfway` },
      { count: s4, label: `${s4} ch final sprint` },
      { count: s5, label: '0 ch exam ready' },
    ];
  }, [totalCh]);

  return (
    <section
      className="border border-border bg-card p-5 sm:p-6 card-hover-lift rounded-lg shadow-xs"
      data-testid="section-backlog-reduction"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3.5">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block">
            Trajectory · Backlog Reduction
          </span>
          <h3 className="font-display text-lg sm:text-xl font-bold tracking-tight text-foreground mt-0.5">
            Clearance Curve to Exam Day
          </h3>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-muted-foreground">
            Current: <strong className="text-foreground">{remainingCh} ch left</strong>
          </span>
          <span className="text-border">·</span>
          <span className="text-muted-foreground">
            Cleared: <strong className="text-emerald-600 dark:text-emerald-400">{completedCh} ch ({metrics.percentageCompleted}%)</strong>
          </span>
        </div>
      </div>

      {/* Trajectory Stepper */}
      <div className="py-5 border-b border-border">
        <div className="flex items-center justify-between text-xs font-mono mb-2 text-muted-foreground">
          <span>PROGRESS TRAJECTORY</span>
          <span>TARGET: 0 CHAPTERS LEFT</span>
        </div>

        {/* Milestone Steps Bar */}
        <div className="grid grid-cols-5 gap-1 sm:gap-2 text-center font-mono">
          {milestones.map((m, idx) => {
            const isPassed = remainingCh <= m.count;
            const isCurrent =
              (idx === 0 && remainingCh >= m.count) ||
              (idx > 0 && remainingCh <= milestones[idx - 1].count && remainingCh > m.count) ||
              (m.count === 0 && remainingCh === 0);

            return (
              <div
                key={idx}
                className={`border p-1.5 sm:p-2.5 transition-all duration-200 card-hover-lift rounded text-left ${
                  isCurrent
                    ? 'border-foreground bg-foreground text-background font-bold shadow-xs'
                    : isPassed
                    ? 'border-emerald-500/40 bg-emerald-500/5 text-foreground'
                    : 'border-border bg-muted/20 text-muted-foreground'
                }`}
              >
                <div className="flex items-center justify-between text-[9px] sm:text-[10px] uppercase">
                  <span>0{idx + 1}</span>
                  {isPassed && !isCurrent && <span className="text-emerald-600 dark:text-emerald-400">✓</span>}
                  {isCurrent && <span className="text-[10px] sm:text-xs">▶</span>}
                </div>
                <div className="text-xs sm:text-base font-bold mt-0.5 sm:mt-1 tracking-tight">
                  {m.count} ch
                </div>
                <div className="text-[9px] sm:text-[10px] opacity-75 truncate mt-0.5 hidden xs:block">
                  {m.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Continuous Linear Progress Bar */}
        <div className="mt-3">
          <div className="h-1.5 w-full bg-muted overflow-hidden">
            <div
              className="h-full bg-foreground transition-all duration-500"
              style={{ width: `${metrics.percentageCompleted}%` }}
            />
          </div>
        </div>
      </div>

      {/* High-Density Subject Breakdown */}
      <div className="pt-4 space-y-3">
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
          Subject Backlog Clearance Density
        </span>

        <div className="space-y-2.5 font-mono text-xs">
          {Object.keys(metrics.subjectMetrics)
            .filter((sub) => metrics.subjectMetrics[sub].count > 0 || ['Physics', 'Chemistry', 'Mathematics'].includes(sub))
            .map((sub) => {
            const data = metrics.subjectMetrics[sub];
            const pct = data.chaptersTotal > 0 ? Math.round((data.chaptersCompleted / data.chaptersTotal) * 100) : 0;
            const filledBlocks = Math.round((pct / 100) * 12);
            const emptyBlocks = 12 - filledBlocks;
            const asciiBar = '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);

            return (
              <div
                key={sub}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-1.5 px-2 hover:bg-muted/30 transition border-b border-border/40 last:border-0 gap-1.5"
              >
                <div className="flex items-center gap-3 sm:w-64 shrink-0">
                  <span className="font-bold text-foreground w-28 truncate">{sub}</span>
                  <span className="text-muted-foreground text-[11px]">
                    {data.chaptersPending} ch left
                  </span>
                </div>

                <div className="flex items-center gap-3 min-w-0 flex-1 justify-between sm:justify-end">
                  <span className="text-muted-foreground tracking-widest hidden md:inline text-[11px]">
                    {asciiBar}
                  </span>

                  <div className="w-24 sm:w-32 h-1.5 bg-muted overflow-hidden shrink-0">
                    <div
                      className="h-full bg-foreground transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <span className="text-xs font-bold text-foreground w-12 text-right shrink-0">
                    {pct}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
