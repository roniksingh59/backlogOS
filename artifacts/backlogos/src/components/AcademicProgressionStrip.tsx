import { useMemo } from 'react';
import { Link } from 'wouter';
import { Flame, ArrowRight, TrendingDown, Target } from 'lucide-react';
import { useProgression } from '@/hooks/use-progression';
import { getAcademicRankTitle } from '@/lib/progression/levels';

export function AcademicProgressionStrip() {
  const { stats } = useProgression();
  const { levelInfo, progression, hoursCleared, currentBacklogHours, startingBacklogHours, percentageRecovered, activeStreak, longestStreak } = stats;

  const rank = useMemo(() => getAcademicRankTitle(levelInfo.level), [levelInfo.level]);

  return (
    <div
      className="rounded-lg border border-border bg-card p-3.5 sm:p-4 font-sans"
      data-testid="academic-progression-strip"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Level and XP Section */}
        <div className="flex items-center gap-3 min-w-[240px]">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded border border-border bg-background font-mono font-bold text-xs text-foreground shadow-2xs">
            L{levelInfo.level}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-foreground truncate">
                Level {levelInfo.level} <span className="text-muted-foreground font-normal">· {rank}</span>
              </span>
              <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                {levelInfo.currentXp.toLocaleString()} / {levelInfo.nextLevelXp.toLocaleString()} XP
              </span>
            </div>

            {/* Progress bar towards next level */}
            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-foreground transition-all duration-300"
                style={{ width: `${levelInfo.progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Core Progression Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border-t lg:border-t-0 lg:border-l border-border pt-3 lg:pt-0 lg:pl-5 text-xs font-mono">
          {/* 1. Study Streak */}
          <div className="flex items-center gap-2">
            <Flame size={14} className="text-foreground shrink-0" />
            <div>
              <span className="text-[10px] text-muted-foreground uppercase block leading-none">
                Streak
              </span>
              <span className="font-bold text-foreground text-xs mt-0.5 block">
                {activeStreak > 0 ? `${activeStreak} days` : '0 days'}
              </span>
            </div>
          </div>

          {/* 2. Backlog Reduction */}
          <div className="flex items-center gap-2">
            <TrendingDown size={14} className="text-foreground shrink-0" />
            <div>
              <span className="text-[10px] text-muted-foreground uppercase block leading-none">
                Cleared
              </span>
              <span className="font-bold text-foreground text-xs mt-0.5 block">
                {hoursCleared}h of {startingBacklogHours}h
              </span>
            </div>
          </div>

          {/* 3. Recovery Progress */}
          <div className="col-span-2 sm:col-span-1 flex items-center gap-2">
            <Target size={14} className="text-foreground shrink-0" />
            <div>
              <span className="text-[10px] text-muted-foreground uppercase block leading-none">
                Recovered
              </span>
              <span className="font-bold text-foreground text-xs mt-0.5 block">
                {percentageRecovered}% complete
              </span>
            </div>
          </div>
        </div>

        {/* View Full Progression Link */}
        <div className="shrink-0 flex items-center justify-end">
          <Link
            href="/progress"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground hover:underline transition"
            data-testid="link-view-progression"
          >
            <span>Full XP breakdown</span>
            <ArrowRight size={11} />
          </Link>
        </div>
      </div>
    </div>
  );
}
