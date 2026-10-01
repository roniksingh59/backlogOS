import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import {
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  Flame,
  GraduationCap,
  RotateCcw,
  ShieldCheck,
  Target,
  TrendingDown,
  Zap,
  ArrowRight,
  Info,
  Lock,
  Sparkles,
  HelpCircle,
  FileCheck,
} from 'lucide-react';
import { useProgression } from '@/hooks/use-progression';
import { getAcademicRankTitle } from '@/lib/progression/levels';
import { MilestoneCategory } from '@/lib/progression/types';
import { chapters } from '@/lib/backlog-data';
import { BacklogReductionVisualizer } from '@/components/BacklogReductionVisualizer';
import { readBacklogItems } from '@/lib/storage';

export function Progress() {
  const { stats, progression } = useProgression();
  const {
    levelInfo,
    hoursCleared,
    currentBacklogHours,
    startingBacklogHours,
    percentageRecovered,
    activeStreak,
    longestStreak,
    totalHoursStudied,
    totalSessionsCount,
    completedChaptersCount,
    completedSubjectsCount,
    lastActiveDate,
    milestones,
  } = stats;

  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  const rankTitle = useMemo(() => getAcademicRankTitle(levelInfo.level), [levelInfo.level]);
  const backlogItems = useMemo(() => readBacklogItems(), []);

  const filteredMilestones = useMemo(() => {
    if (activeCategoryFilter === 'all') return milestones;
    if (activeCategoryFilter === 'unlocked') return milestones.filter((m) => m.isUnlocked);
    if (activeCategoryFilter === 'in_progress') return milestones.filter((m) => !m.isUnlocked);
    return milestones.filter((m) => m.milestone.category === activeCategoryFilter);
  }, [milestones, activeCategoryFilter]);

  const unlockedCount = useMemo(
    () => milestones.filter((m) => m.isUnlocked).length,
    [milestones]
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 space-y-6 animate-page-enter">
      {/* Top Header */}
      <div className="border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block">
                BacklogOS · Academic Progression Engine
              </span>
              <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                <ShieldCheck size={11} className="text-emerald-500" />
                Anti-Gaming Verified
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1">
              Academic Progress & Mastery
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl leading-relaxed">
              Real academic progress translated into clear progression milestones. XP is awarded exclusively for focused study blocks, verified syllabus coverage, and backlog recovery.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="rounded border border-border bg-card px-3 py-1.5 text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted transition flex items-center gap-1.5"
              data-testid="link-back-dashboard"
            >
              <ArrowRight size={13} className="rotate-180" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </div>

        {/* Level Progression Hero Strip */}
        <div className="pt-5 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Level & Rank Badge */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="grid h-16 w-16 place-items-center rounded bg-foreground text-background font-mono font-bold text-xl shadow-sm">
                L{levelInfo.level}
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white text-[10px]">
                ✓
              </span>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block">
                CURRENT STANDING
              </span>
              <h2 className="font-display text-xl font-bold text-foreground">
                {rankTitle}
              </h2>
              <span className="text-xs font-mono text-muted-foreground">
                Level {levelInfo.level} · Academic Tier
              </span>
            </div>
          </div>

          {/* XP Progress toward next level */}
          <div className="md:col-span-2 space-y-2 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs font-mono">
              <div>
                <span className="text-muted-foreground">Accumulated XP: </span>
                <strong className="text-foreground text-sm">
                  {levelInfo.currentXp.toLocaleString()} XP
                </strong>
              </div>
              <div className="text-muted-foreground text-right">
                Next Level (L{levelInfo.level + 1}):{' '}
                <strong className="text-foreground">
                  {levelInfo.nextLevelXp.toLocaleString()} XP
                </strong>{' '}
                <span className="text-emerald-600 dark:text-emerald-400">
                  (+{levelInfo.xpNeededForNextLevel - levelInfo.xpIntoCurrentLevel} XP left)
                </span>
              </div>
            </div>

            <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-foreground transition-all duration-500"
                style={{ width: `${levelInfo.progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
              <span>{levelInfo.progressPercent}% progress into Level {levelInfo.level}</span>
              <span>Transparent syllabus scaling</span>
            </div>
          </div>
        </div>
      </div>

      {/* CORE MECHANIC: Backlog Reduction Engine */}
      <section className="border border-border bg-card p-5 sm:p-6" data-testid="section-backlog-reduction-engine">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-bold block">
              Core Mechanic · Verified Academic Progress
            </span>
            <h3 className="font-display text-xl font-bold tracking-tight text-foreground mt-0.5">
              Backlog Reduction & Recovery
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="border border-border bg-muted/30 px-2.5 py-1 rounded text-muted-foreground">
              Starting Baseline: <strong className="text-foreground">{startingBacklogHours}h</strong>
            </span>
            <span className="border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 rounded text-emerald-600 dark:text-emerald-400 font-bold">
              {hoursCleared}h Cleared ({percentageRecovered}%)
            </span>
          </div>
        </div>

        {/* Backlog Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-5 border-b border-border">
          <div className="border border-border bg-muted/15 p-3.5">
            <span className="text-[10px] font-mono uppercase text-muted-foreground block">
              Starting Backlog
            </span>
            <span className="text-2xl font-mono font-bold text-foreground mt-1 block">
              {startingBacklogHours}h
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">
              Initial overdue workload
            </span>
          </div>

          <div className="border border-border bg-muted/15 p-3.5">
            <span className="text-[10px] font-mono uppercase text-muted-foreground block">
              Current Remaining
            </span>
            <span className="text-2xl font-mono font-bold text-foreground mt-1 block">
              {currentBacklogHours}h
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">
              Remaining to clear
            </span>
          </div>

          <div className="border border-emerald-500/30 bg-emerald-500/5 p-3.5">
            <span className="text-[10px] font-mono uppercase text-emerald-600 dark:text-emerald-400 block font-semibold">
              Hours Cleared
            </span>
            <span className="text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
              {hoursCleared}h
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">
              {startingBacklogHours > 0 ? `${startingBacklogHours}h → ${currentBacklogHours}h` : 'Clean slate'}
            </span>
          </div>

          <div className="border border-indigo-500/30 bg-indigo-500/5 p-3.5">
            <span className="text-[10px] font-mono uppercase text-indigo-600 dark:text-indigo-400 block font-semibold">
              Recovery Progress
            </span>
            <span className="text-2xl font-mono font-bold text-indigo-600 dark:indigo-400 mt-1 block">
              {percentageRecovered}%
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">
              Overall syllabus recovery
            </span>
          </div>
        </div>

        {/* Visual Backlog Clearance Indicator */}
        <div className="pt-5">
          <div className="flex items-center justify-between text-xs font-mono mb-2">
            <span className="text-muted-foreground">BACKLOG CLEARANCE TRAJECTORY</span>
            <span className="font-bold text-foreground">
              {hoursCleared} of {startingBacklogHours} hours eliminated
            </span>
          </div>

          <div className="h-4 w-full bg-muted/40 rounded overflow-hidden flex border border-border">
            <div
              className="bg-emerald-500 h-full transition-all duration-700 ease-out"
              style={{ width: `${percentageRecovered}%` }}
              title={`Cleared: ${hoursCleared}h (${percentageRecovered}%)`}
            />
            <div
              className="bg-card h-full transition-all duration-700 ease-out flex-1"
              title={`Remaining: ${currentBacklogHours}h`}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground mt-2">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Recovered ({hoursCleared}h)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
              <span>Pending Backlog ({currentBacklogHours}h)</span>
            </span>
          </div>
        </div>
      </section>

      {/* Primary Academic Metrics Summary */}
      <section className="border border-border bg-card p-5 sm:p-6" data-testid="section-academic-metrics">
        <h3 className="font-display text-lg font-bold tracking-tight text-foreground border-b border-border pb-3">
          Academic Activity Breakdown
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-4 text-xs font-mono">
          {/* Streak */}
          <div className="border border-border p-3">
            <div className="flex items-center gap-1.5 text-amber-500 mb-1">
              <Flame size={14} />
              <span className="text-[10px] text-muted-foreground uppercase">Active Streak</span>
            </div>
            <span className="text-xl font-bold text-foreground block">
              {activeStreak} {activeStreak === 1 ? 'day' : 'days'}
            </span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">
              Longest: {longestStreak}d
            </span>
          </div>

          {/* Hours Studied */}
          <div className="border border-border p-3">
            <div className="flex items-center gap-1.5 text-blue-500 mb-1">
              <Clock size={14} />
              <span className="text-[10px] text-muted-foreground uppercase">Study Hours</span>
            </div>
            <span className="text-xl font-bold text-foreground block">
              {totalHoursStudied}h
            </span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">
              {totalSessionsCount} sessions
            </span>
          </div>

          {/* Chapters Completed */}
          <div className="border border-border p-3">
            <div className="flex items-center gap-1.5 text-emerald-500 mb-1">
              <CheckCircle2 size={14} />
              <span className="text-[10px] text-muted-foreground uppercase">Chapters Finished</span>
            </div>
            <span className="text-xl font-bold text-foreground block">
              {completedChaptersCount} / {chapters.length}
            </span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">
              NCERT syllabus
            </span>
          </div>

          {/* Subjects Completed */}
          <div className="border border-border p-3">
            <div className="flex items-center gap-1.5 text-purple-500 mb-1">
              <GraduationCap size={14} />
              <span className="text-[10px] text-muted-foreground uppercase">Subjects 100%</span>
            </div>
            <span className="text-xl font-bold text-foreground block">
              {completedSubjectsCount}
            </span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">
              Full curriculum
            </span>
          </div>

          {/* Spaced Revisions */}
          <div className="border border-border p-3">
            <div className="flex items-center gap-1.5 text-cyan-500 mb-1">
              <RotateCcw size={14} />
              <span className="text-[10px] text-muted-foreground uppercase">Revisions</span>
            </div>
            <span className="text-xl font-bold text-foreground block">
              {milestones.find((m) => m.milestone.id === 'first-revision')?.currentValue || 0}
            </span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">
              Retention cycles
            </span>
          </div>

          {/* Diagnostic Tests */}
          <div className="border border-border p-3">
            <div className="flex items-center gap-1.5 text-rose-500 mb-1">
              <FileCheck size={14} />
              <span className="text-[10px] text-muted-foreground uppercase">Tests Logged</span>
            </div>
            <span className="text-xl font-bold text-foreground block">
              {milestones.find((m) => m.milestone.id === 'first-test')?.currentValue || 0}
            </span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">
              Error analysis
            </span>
          </div>
        </div>

        {/* Study Streak Consistency Notice */}
        <div className="mt-4 p-3 border border-border bg-muted/20 text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Flame className="text-amber-500 shrink-0" size={16} />
            <span>
              <strong>Study Streak Protocol:</strong> Days count only upon completing genuine study activity. Missing a day does not delete any accumulated XP.
            </span>
          </div>
          <span className="text-muted-foreground shrink-0">
            Last Active: {lastActiveDate || 'Today'}
          </span>
        </div>
      </section>

      {/* Academic Milestones Grid */}
      <section className="border border-border bg-card p-5 sm:p-6" data-testid="section-academic-milestones">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block">
                Academic Milestones · {unlockedCount} of {milestones.length} Unlocked
              </span>
            </div>
            <h3 className="font-display text-xl font-bold tracking-tight text-foreground mt-0.5">
              Verified Syllabus Milestones
            </h3>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1 text-xs font-mono">
            {[
              { id: 'all', label: 'All' },
              { id: 'unlocked', label: 'Unlocked' },
              { id: 'in_progress', label: 'In Progress' },
              { id: 'backlog', label: 'Backlog' },
              { id: 'hours', label: 'Hours' },
              { id: 'streak', label: 'Streak' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveCategoryFilter(f.id)}
                className={`px-2.5 py-1 rounded transition ${
                  activeCategoryFilter === f.id
                    ? 'bg-foreground text-background font-bold'
                    : 'border border-border bg-card text-muted-foreground hover:text-foreground'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Milestones Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-5">
          {filteredMilestones.map((item) => {
            const { milestone, isUnlocked, currentValue, targetValue, percent } = item;
            return (
              <div
                key={milestone.id}
                className={`border p-4 transition flex flex-col justify-between ${
                  isUnlocked
                    ? 'border-emerald-500/40 bg-emerald-500/5'
                    : 'border-border bg-card opacity-85 hover:opacity-100'
                }`}
                data-testid={`milestone-card-${milestone.id}`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        isUnlocked
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {isUnlocked ? (
                        <>
                          <CheckCircle2 size={11} />
                          <span>Unlocked</span>
                        </>
                      ) : (
                        <>
                          <Lock size={11} />
                          <span>Locked</span>
                        </>
                      )}
                    </span>

                    <span className="text-[10px] font-mono font-bold text-foreground border border-border bg-muted/30 px-1.5 py-0.5 rounded">
                      +{milestone.xpReward} XP
                    </span>
                  </div>

                  <h4 className="font-bold text-sm text-foreground tracking-tight mt-2">
                    {milestone.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {milestone.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-border">
                  <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-bold text-foreground">
                      {isUnlocked ? `${targetValue}/${targetValue}` : `${Math.min(currentValue, targetValue)}/${targetValue}`} ({percent}%)
                    </span>
                  </div>

                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isUnlocked ? 'bg-emerald-500' : 'bg-foreground'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Academic Integrity & XP Mechanics Guide */}
      <section className="border border-border bg-card p-5 sm:p-6" data-testid="section-xp-integrity-guide">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <ShieldCheck className="text-emerald-600 dark:text-emerald-400" size={18} />
          <h3 className="font-display text-base font-bold text-foreground">
            Academic Integrity & Anti-Gaming Standards
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 text-xs">
          <div className="space-y-2">
            <h4 className="font-mono font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
              How XP is Earned (Transparent Academic Formula)
            </h4>
            <ul className="space-y-1.5 text-muted-foreground font-mono">
              <li className="flex items-start gap-2">
                <span className="text-emerald-500">▶</span>
                <span><strong>Study Session Completed:</strong> 40 XP base + 1 XP/minute (max 120 XP per session block)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500">▶</span>
                <span><strong>Full Chapter Completed:</strong> 150 XP upon verified NCERT syllabus finish</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500">▶</span>
                <span><strong>Backlog Hours Cleared:</strong> 25 XP per hour cleared + 100 XP for topic elimination</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500">▶</span>
                <span><strong>Spaced Revision Completed:</strong> 75 XP for active recall test</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500">▶</span>
                <span><strong>Diagnostic Test Logged:</strong> 100 XP for exam-style assessment evaluation</span>
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-mono font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
              Anti-Gaming & Responsible Gamification Rules
            </h4>
            <ul className="space-y-1.5 text-muted-foreground leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-foreground">✔</span>
                <span><strong>Deduplication Guard:</strong> Actions carry persistent unique IDs so refreshing or repeated clicks cannot duplicate XP.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-foreground">✔</span>
                <span><strong>No Meaningless XP:</strong> Opening the app, idling, or clicking navigation awards 0 XP.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-foreground">✔</span>
                <span><strong>No Punishment or Pressure:</strong> Missing study days gracefully resets streak without deducting previously earned XP or progress.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-foreground">✔</span>
                <span><strong>No Public Leaderboards:</strong> BacklogOS is an individual academic command center, avoiding harmful peer comparison.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
