import { useEffect, useMemo, useState } from 'react';
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
} from 'lucide-react';
import { useProgression } from '@/hooks/use-progression';
import { useEnginesWorkspace } from '@/hooks/use-engines-workspace';
import { getAcademicRankTitle } from '@/lib/progression/levels';
import { chapters } from '@/lib/backlog-data';
import { ProgressAnalyticsCard } from '@/components/ProgressAnalyticsCard';
import { readPlan, readCompleted } from '@/lib/storage';
import { computeRecoveryProgressSummary } from '@/lib/backlog-items';
import { useAuth } from '@/lib/auth-context';
import { BaxContextualSlot } from '@/components/bax/BaxMascot';

export function Progress() {
  const { user, activePlan } = useAuth();
  const { stats } = useProgression();
  const {
    analytics,
    backlogItems,
    studySessions,
  } = useEnginesWorkspace();
  const {
    levelInfo,
    totalBacklogChaptersCount,
    completedBacklogChaptersCount,
    remainingBacklogChaptersCount,
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
  const [backlogRefreshKey, setBacklogRefreshKey] = useState(0);
  const rankTitle = useMemo(() => getAcademicRankTitle(levelInfo.level), [levelInfo.level]);
  const plan = useMemo(() => activePlan || readPlan(user?.uid), [activePlan, user?.uid, backlogRefreshKey]);
  const completedIds = useMemo(() => readCompleted(user?.uid), [user?.uid, backlogRefreshKey]);
  const recoverySummary = useMemo(
    () => computeRecoveryProgressSummary(plan, completedIds),
    [plan, completedIds]
  );

  useEffect(() => {
    const refresh = () => setBacklogRefreshKey((value) => value + 1);
    window.addEventListener('backlogos-backlog-updated', refresh);
    window.addEventListener('backlogos-progression-updated', refresh);
    window.addEventListener('backlogos-completed-updated', refresh);
    window.addEventListener('backlogos-plan-updated', refresh);
    window.addEventListener('backlogos-plans-updated', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('backlogos-backlog-updated', refresh);
      window.removeEventListener('backlogos-progression-updated', refresh);
      window.removeEventListener('backlogos-completed-updated', refresh);
      window.removeEventListener('backlogos-plan-updated', refresh);
      window.removeEventListener('backlogos-plans-updated', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

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
              <div className="grid h-16 w-16 place-items-center rounded-xl bg-indigo-600 text-white font-mono font-bold text-xl shadow-sm">
                L{levelInfo.level}
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white text-[10px]">
                ✓
              </span>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-600 dark:text-indigo-400 font-bold block">
                Current Standing
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
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs font-mono tabular-nums">
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
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  (+{levelInfo.xpNeededForNextLevel - levelInfo.xpIntoCurrentLevel} XP left)
                </span>
              </div>
            </div>

            <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-gradient-to-r from-indigo-600 to-emerald-500 transition-all duration-500"
                style={{ width: `${levelInfo.progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
              <span>{levelInfo.progressPercent}% progress into Level {levelInfo.level}</span>
              <span>Transparent syllabus scaling</span>
            </div>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-border/70">
          <BaxContextualSlot
            slot="analytics"
            size="md"
            expression={
              analytics.weakConcepts.length > 0
                ? 'thinking'
                : analytics.conceptMasteryPercent >= 70
                ? 'celebrating'
                : 'explaining'
            }
            pose={analytics.conceptMasteryPercent >= 70 ? 'cheering' : 'pointing'}
            message={
              analytics.weakConcepts.length > 0
                ? `${analytics.weakConcepts.length} weak concept${analytics.weakConcepts.length === 1 ? '' : 's'} flagged from quizzes—review those before moving ahead.`
                : analytics.hasAssessmentData
                ? `${analytics.conceptMasteryPercent}% verified mastery vs. ${analytics.backlogClearancePercent}% backlog studied—keep both rising together.`
                : 'Complete a verification quiz in Learn & Test or Recovery Route to unlock live mastery & weak-concept insights.'
            }
            className="w-full"
          />
        </div>
      </div>

      {/* Separated Analytics Engine Overview (Never merges clearance & mastery) */}
      <section className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-5" data-testid="section-separated-analytics">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-600 dark:text-indigo-400 font-bold block">
              Analytics Engine · Finish the Backlog, Actually Learn the Syllabus
            </span>
            <h3 className="font-display text-xl font-bold tracking-tight text-foreground mt-0.5">
              Separated Clearance, Mastery &amp; Retention
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono tabular-nums">
            <Link
              href="/revision"
              className="rounded border border-amber-500/35 bg-amber-500/10 px-2.5 py-1 text-amber-700 dark:text-amber-300 font-bold hover:bg-amber-500/20 transition"
            >
              {analytics.pendingRevisionsCount} Pending Revisions
            </Link>
          </div>
        </div>

        {/* 6 Separated Core DB-Backed Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs font-mono tabular-nums">
          <div className="rounded-lg border border-border bg-background p-3.5">
            <span className="text-[10px] uppercase text-muted-foreground block">
              Backlog Clearance
            </span>
            <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1 block">
              {analytics.backlogClearancePercent}%
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">
              {analytics.studyCompletedChaptersCount}/{analytics.totalBacklogChapters} studied
            </span>
          </div>

          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3.5">
            <span className="text-[10px] uppercase text-emerald-700 dark:text-emerald-300 font-semibold block">
              Concept Mastery
            </span>
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
              {analytics.hasAssessmentData ? `${analytics.conceptMasteryPercent}%` : '—'}
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">
              Verified quizzes
            </span>
          </div>

          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3.5">
            <span className="text-[10px] uppercase text-amber-700 dark:text-amber-300 font-semibold block">
              Retention Health
            </span>
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1 block">
              {analytics.hasRetentionData ? `${analytics.retentionHealthPercent}%` : '—'}
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">
              {analytics.pendingRevisionsCount} due reviews
            </span>
          </div>

          <div className="rounded-lg border border-border bg-background p-3.5">
            <span className="text-[10px] uppercase text-muted-foreground block">
              Studied Objectives
            </span>
            <span className="text-2xl font-bold text-foreground mt-1 block">
              {analytics.completedObjectivesCount}
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">
              of {analytics.totalObjectivesCount} scheduled
            </span>
          </div>

          <div className="rounded-lg border border-border bg-background p-3.5">
            <span className="text-[10px] uppercase text-muted-foreground block">
              Verified Objectives
            </span>
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
              {analytics.verifiedObjectivesCount}
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">
              Assessment-passed
            </span>
          </div>

          <div className="rounded-lg border border-border bg-background p-3.5">
            <span className="text-[10px] uppercase text-muted-foreground block">
              Mastered Chapters
            </span>
            <span
              className="text-2xl font-bold text-foreground mt-1 block"
              data-testid="text-progress-hours-cleared"
            >
              {analytics.masteredChaptersCount} ch
            </span>
            <span
              className="text-[10px] text-muted-foreground mt-0.5 block"
              data-testid="text-progress-remaining-hours"
            >
              {remainingBacklogChaptersCount} ch backlog left
            </span>
          </div>
        </div>
      </section>

      {/* Weak Concepts Diagnostic Panel */}
      <section className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-3" data-testid="section-weak-concepts">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-rose-600 dark:text-rose-400 font-bold block">
              Concept Mastery Diagnostics
            </span>
            <h3 className="font-display text-lg font-bold text-foreground">
              Weak Concepts Requiring Reinforcement ({analytics.weakConcepts.length})
            </h3>
          </div>
          <Link
            href="/study?tab=verify"
            className="text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Open Verification Runner →
          </Link>
        </div>

        {analytics.weakConcepts.length === 0 ? (
          <p className="py-4 text-xs font-mono text-muted-foreground">
            {analytics.hasAssessmentData
              ? 'No weak concepts flagged right now — all assessed concepts score 60% or above.'
              : 'No assessments graded yet. Complete an Objective Check or Chapter Mastery exam in Learn & Test to map strong vs weak concepts.'}
          </p>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {analytics.weakConcepts.map((wc) => (
              <div
                key={`${wc.chapterId}-${wc.conceptId}`}
                className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">{wc.conceptTitle}</p>
                  <p className="font-mono text-[10px] text-muted-foreground truncate">
                    {wc.subject} · {wc.chapterTitle}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 font-mono">
                  <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                    {wc.masteryScore}%
                  </span>
                  <Link
                    href={`/study?chapter=${wc.chapterId}&tab=verify`}
                    className="rounded border border-border bg-background px-2 py-1 text-[10px] font-semibold hover:bg-muted transition"
                  >
                    Re-Verify
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Real Separated Subject Comparison + 7-Day Activity Chart (Zero Mock Data) */}
      <ProgressAnalyticsCard
        items={backlogItems}
        sessions={studySessions}
        plan={plan}
        analytics={analytics}
      />

      {/* Primary Academic Metrics Summary */}
      <section className="border border-border bg-card p-5 sm:p-6" data-testid="section-academic-metrics">
        <h3 className="font-display text-lg font-bold tracking-tight text-foreground border-b border-border pb-3">
          Academic Activity Breakdown
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-4 text-xs font-mono">
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
              <span className="text-[10px] text-muted-foreground uppercase">Logged Focus Time</span>
            </div>
            <span
              className="text-xl font-bold text-foreground block"
              data-testid="text-progress-study-hours"
            >
              {totalHoursStudied}h
            </span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">
              {totalSessionsCount} focus · {recoverySummary.completedTaskCount} roadmap tasks
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
              { id: 'hours', label: 'Focus Time' },
              { id: 'streak', label: 'Streak' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveCategoryFilter(f.id)}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  activeCategoryFilter === f.id
                    ? 'bg-indigo-600 text-white font-bold'
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
                <span><strong>Backlog Chapter Cleared:</strong> 100 XP per backlog chapter cleared + 150 XP chapter mastery bonus</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500">▶</span>
                <span><strong>Spaced Revision Completed:</strong> 75 XP for concept retention cycle</span>
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
