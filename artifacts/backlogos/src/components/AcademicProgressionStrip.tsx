import { useMemo } from 'react';
import { Link } from 'wouter';
import { Flame, Award, ArrowRight, TrendingDown, Target, Zap } from 'lucide-react';
import { useProgression } from '@/hooks/use-progression';
import { getAcademicRankTitle } from '@/lib/progression/levels';

export function AcademicProgressionStrip() {
  const { stats } = useProgression();
  const { levelInfo, progression, hoursCleared, currentBacklogHours, startingBacklogHours, percentageRecovered, activeStreak, longestStreak } = stats;

  const rank = useMemo(() => getAcademicRankTitle(levelInfo.level), [levelInfo.level]);

  return (
    <div
      className="border border-border bg-card p-4 sm:p-5 rounded-none font-sans"
      data-testid="academic-progression-strip"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Level and XP Section */}
        <div className="flex items-center gap-3.5 min-w-[260px]">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded bg-foreground text-background font-mono font-bold text-sm">
            L{levelInfo.level}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-foreground truncate">
                Level {levelInfo.level} · <span className="text-muted-foreground font-normal">{rank}</span>
              </span>
              <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                {levelInfo.currentXp.toLocaleString()} / {levelInfo.nextLevelXp.toLocaleString()} XP
              </span>
            </div>

            {/* Progress bar towards next level */}
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-foreground transition-all duration-500 ease-out"
                style={{ width: `${levelInfo.progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-0.5 font-mono">
              <span>{levelInfo.progressPercent}% to L{levelInfo.level + 1}</span>
              <span>+{levelInfo.xpNeededForNextLevel - levelInfo.xpIntoCurrentLevel} XP needed</span>
            </div>
          </div>
        </div>

        {/* Core Progression Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border-t lg:border-t-0 lg:border-l border-border pt-3 lg:pt-0 lg:pl-5 text-xs font-mono">
          {/* 1. Study Streak */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
              <Flame size={15} />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase block leading-none">
                Study Streak
              </span>
              <span className="font-bold text-foreground text-xs mt-0.5 block">
                {activeStreak > 0 ? `${activeStreak}-day streak` : '0 days active'}
              </span>
              <span className="text-[10px] text-muted-foreground block leading-tight">
                Best: {longestStreak}d
              </span>
            </div>
          </div>

          {/* 2. Backlog Reduction */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <TrendingDown size={15} />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase block leading-none">
                Backlog Cleared
              </span>
              <span className="font-bold text-foreground text-xs mt-0.5 block">
                {startingBacklogHours}h → {currentBacklogHours}h
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block leading-tight font-medium">
                {hoursCleared}h cleared
              </span>
            </div>
          </div>

          {/* 3. Recovery Progress */}
          <div className="col-span-2 sm:col-span-1 flex items-center gap-2">
            <div className="p-1.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
              <Target size={15} />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase block leading-none">
                Recovery Progress
              </span>
              <span className="font-bold text-foreground text-xs mt-0.5 block">
                {percentageRecovered}% recovered
              </span>
              <span className="text-[10px] text-muted-foreground block leading-tight">
                {progression.unlockedMilestoneIds.length} milestones
              </span>
            </div>
          </div>
        </div>

        {/* View Full Progression Link */}
        <div className="shrink-0 flex items-center justify-end">
          <Link
            href="/progress"
            className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-muted-foreground hover:text-foreground hover:bg-muted px-2.5 py-1.5 rounded transition border border-transparent hover:border-border"
            data-testid="link-view-progression"
          >
            <span>Progress & Milestones</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}
