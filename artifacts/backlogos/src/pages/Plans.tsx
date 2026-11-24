import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Compass,
  Copy,
  Eye,
  EyeOff,
  History,
  Layers,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useEnginesWorkspace } from '@/hooks/use-engines-workspace';
import {
  buildDefaultPlanName,
  generatePlanId,
  isPlanTaskCompleted,
  resolveChapterById,
  type StudentPlan,
} from '@/lib/backlog-data';
import { computeRecoveryProgressSummary } from '@/lib/backlog-items';
import { readCompleted, readPlanHistory } from '@/lib/storage';
import { formatIsoDate } from '@/lib/engines/planning-engine';
import { isLegacyMultiPlanSchemaDetected, saveStudyPlanDirect } from '@/lib/supabase-service';

type PlanFilter = 'all' | 'active' | 'sprint' | 'extended';

export function Plans() {
  const [, setLocation] = useLocation();
  const {
    user,
    plans: contextPlans,
    activePlan,
    syncStatus,
    setActivePlan,
    renamePlan,
    deletePlan,
    refreshPlans,
    syncDataNow,
  } = useAuth();

  const [refreshTick, setRefreshTick] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<PlanFilter>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const bump = () => setRefreshTick((t) => t + 1);
    window.addEventListener('backlogos-plan-updated', bump);
    window.addEventListener('backlogos-plans-updated', bump);
    window.addEventListener('backlogos-completed-updated', bump);
    window.addEventListener('storage', bump);
    return () => {
      window.removeEventListener('backlogos-plan-updated', bump);
      window.removeEventListener('backlogos-plans-updated', bump);
      window.removeEventListener('backlogos-completed-updated', bump);
      window.removeEventListener('storage', bump);
    };
  }, []);

  const plans: StudentPlan[] = useMemo(() => {
    const localHistory = readPlanHistory(user?.uid);
    if (Array.isArray(contextPlans) && contextPlans.length > 0) {
      return contextPlans;
    }
    return localHistory;
  }, [contextPlans, user?.uid, refreshTick]);

  const showLegacySchemaTip = isLegacyMultiPlanSchemaDetected() || refreshTick >= 0 && isLegacyMultiPlanSchemaDetected();

  const completedIds = useMemo(
    () => readCompleted(user?.uid),
    [user?.uid, refreshTick]
  );

  const currentActivePlan = useMemo(
    () => plans.find((p) => p.isActive) || activePlan || plans[0] || null,
    [plans, activePlan]
  );

  const {
    activeNormalizedPlan,
    analytics,
    reschedulePlanMissedDays,
    refreshFromCloud,
  } = useEnginesWorkspace(currentActivePlan);

  const overdueUnstudiedCount = useMemo(() => {
    if (!activeNormalizedPlan) return 0;
    const todayIso = formatIsoDate(new Date());
    return activeNormalizedPlan.days
      .filter((d) => d.scheduledDate < todayIso)
      .flatMap((d) => d.objectives)
      .filter((o) => o.state === 'PENDING' || o.state === 'IN_PROGRESS' || o.state === 'NEEDS_RELEARNING').length;
  }, [activeNormalizedPlan]);

  // Aggregate overview stats across all plans
  const overviewStats = useMemo(() => {
    const uniqueChapters = new Set<string>();
    let totalCompletedTasks = 0;
    let totalPlannedTasks = 0;

    for (const p of plans) {
      const chIds = p.chapterIds?.length ? p.chapterIds : p.plannedChapterIds || [];
      chIds.forEach((id) => uniqueChapters.add(id));
      const summary = computeRecoveryProgressSummary(p, completedIds);
      totalCompletedTasks += summary.completedTaskCount;
      totalPlannedTasks += summary.totalTaskCount;
    }

    const activeSummary = currentActivePlan
      ? computeRecoveryProgressSummary(currentActivePlan, completedIds)
      : null;
    const activePercent =
      activeSummary && activeSummary.totalTaskCount > 0
        ? Math.round((activeSummary.completedTaskCount / activeSummary.totalTaskCount) * 100)
        : 0;

    return {
      totalPlans: plans.length,
      uniqueChaptersCount: uniqueChapters.size,
      totalCompletedTasks,
      totalPlannedTasks,
      activeSummary,
      activePercent,
    };
  }, [plans, completedIds, currentActivePlan]);

  const filteredPlans = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return plans.filter((p) => {
      const duration = p.planDuration || p.days?.length || 7;
      const isCurrent = Boolean(p.isActive || (currentActivePlan?.id && currentActivePlan.id === p.id));

      if (filterMode === 'active' && !isCurrent) return false;
      if (filterMode === 'sprint' && duration > 7) return false;
      if (filterMode === 'extended' && duration <= 7) return false;

      if (!q) return true;
      const name = (p.name || buildDefaultPlanName(p)).toLowerCase();
      const subjects = (p.subjects || []).join(' ').toLowerCase();
      const goal = (p.goal || '').toLowerCase();
      return name.includes(q) || subjects.includes(q) || goal.includes(q);
    });
  }, [plans, searchQuery, filterMode, currentActivePlan]);

  const showToastMessage = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusBanner({ type, text });
    setTimeout(() => setStatusBanner(null), type === 'error' ? 5000 : 3500);
  };

  const handleSyncCloud = async () => {
    setIsSyncing(true);
    try {
      const res = await syncDataNow();
      await refreshPlans();
      await refreshFromCloud();
      setRefreshTick((t) => t + 1);
      if (res.success) {
        showToastMessage('Plans synced with Supabase cloud.', 'success');
      } else {
        showToastMessage(res.error || 'Could not sync plans with Supabase cloud.', 'error');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRebalanceMissed = async () => {
    setBusyId('rebalance');
    try {
      const result = await reschedulePlanMissedDays();
      if (!result || result.movedObjectives.length === 0) {
        showToastMessage('No overdue unstudied objectives needed rescheduling.');
      } else {
        showToastMessage(
          `Rebalanced ${result.movedObjectives.length} missed objective(s) cleanly without overloading tomorrow.`
        );
      }
    } finally {
      setBusyId(null);
    }
  };

  const startRename = (plan: StudentPlan) => {
    setEditingId(plan.id || null);
    setDraftName(plan.name || buildDefaultPlanName(plan));
  };

  const commitRename = async (planId: string) => {
    if (draftName.trim()) {
      setBusyId(planId);
      await renamePlan(planId, draftName.trim());
      setBusyId(null);
      showToastMessage('Plan renamed.');
    }
    setEditingId(null);
  };

  const handleActivate = async (plan: StudentPlan) => {
    if (!plan.id) return;
    setBusyId(plan.id);
    await setActivePlan(plan.id);
    setBusyId(null);
    showToastMessage(`Switched active plan to "${plan.name || buildDefaultPlanName(plan)}".`);
  };

  const handleDuplicate = async (plan: StudentPlan) => {
    const copyId = generatePlanId();
    const baseName = plan.name || buildDefaultPlanName(plan);
    const clonedDays = Array.isArray(plan.days)
      ? plan.days.map((d) => ({
          ...d,
          tasks: Array.isArray(d.tasks)
            ? d.tasks.map((t, tIdx) => {
                const rawSuffix = t.id.includes('::') ? t.id.split('::').slice(1).join('::') : (t.id || `day-${d.day}-task-${tIdx + 1}`);
                return { ...t, id: `${copyId}::${rawSuffix}` };
              })
            : [],
        }))
      : [];
    const clonedPlan: StudentPlan = {
      ...plan,
      id: copyId,
      name: `${baseName} (Copy)`,
      isActive: false,
      days: clonedDays,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setBusyId(plan.id || 'copy');
    const res = await saveStudyPlanDirect(clonedPlan, user?.uid, { preserveActiveFlag: true });
    await refreshPlans();
    setRefreshTick((t) => t + 1);
    setBusyId(null);
    if (res.success) {
      showToastMessage(`Created duplicate plan "${clonedPlan.name}".`, 'success');
    } else {
      showToastMessage(res.error || 'Could not save duplicated plan to cloud.', 'error');
    }
  };

  const handleDeleteConfirm = async (plan: StudentPlan) => {
    if (!plan.id) return;
    setBusyId(plan.id);
    await deletePlan(plan.id);
    setPendingDeleteId(null);
    setBusyId(null);
    showToastMessage('Plan deleted.');
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 space-y-6 animate-page-enter">
      {/* Command Header */}
      <div className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/80 pb-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              <Layers size={13} className="text-sky-500" />
              <span>BacklogOS · Multi-Plan Workspace</span>
              {user && !user.isGuest && (
                <>
                  <span>·</span>
                  <span
                    className={`font-semibold ${
                      syncStatus === 'synced'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : syncStatus === 'syncing'
                        ? 'text-sky-500'
                        : 'text-amber-500'
                    }`}
                  >
                    {syncStatus === 'synced'
                      ? 'Cloud Synced'
                      : syncStatus === 'syncing'
                      ? 'Syncing...'
                      : 'Local Cache'}
                  </span>
                </>
              )}
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1">
              Your Study Plans Hub
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl">
              View every recovery plan you have built, compare progress across schedules, rename or duplicate roadmaps, and switch active focus anytime.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 font-mono text-xs shrink-0">
            {user && !user.isGuest && (
              <button
                type="button"
                onClick={handleSyncCloud}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 hover:bg-muted px-3 py-2 text-xs font-semibold text-foreground transition disabled:opacity-50 cursor-pointer"
                data-testid="button-plans-sync-cloud"
              >
                <RefreshCw size={13} className={isSyncing ? 'animate-spin text-sky-500' : 'text-sky-500'} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Cloud'}</span>
              </button>
            )}

            <Link
              href="/onboarding?reset=true"
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 text-xs font-bold shadow-xs transition"
              data-testid="link-plans-create-new"
            >
              <Plus size={14} />
              <span>Create New Plan</span>
            </Link>
          </div>
        </div>

        {/* Summary Metrics Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
          <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-3.5">
            <span className="text-[10px] uppercase tracking-wider text-sky-700 dark:text-sky-300 font-semibold block">
              Saved Plans
            </span>
            <span
              className="mt-1 block text-2xl font-bold text-foreground tabular-nums"
              data-testid="text-plans-total-count"
            >
              {overviewStats.totalPlans}
            </span>
            <span className="text-[10px] text-muted-foreground">
              Stored locally & synced
            </span>
          </div>

          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3.5">
            <span className="text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-300 font-semibold block">
              Active Plan Progress
            </span>
            <span className="mt-1 block text-2xl font-bold text-foreground tabular-nums">
              {overviewStats.activePercent}%
            </span>
            <span className="text-[10px] text-muted-foreground truncate block">
              {currentActivePlan ? currentActivePlan.name || buildDefaultPlanName(currentActivePlan) : 'No active plan'}
            </span>
          </div>

          <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-3.5">
            <span className="text-[10px] uppercase tracking-wider text-indigo-700 dark:text-indigo-300 font-semibold block">
              Queued Chapters
            </span>
            <span className="mt-1 block text-2xl font-bold text-foreground tabular-nums">
              {overviewStats.uniqueChaptersCount}
            </span>
            <span className="text-[10px] text-muted-foreground">
              Across all saved plans
            </span>
          </div>

          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3.5">
            <span className="text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-300 font-semibold block">
              Route Blocks Cleared
            </span>
            <span className="mt-1 block text-2xl font-bold text-foreground tabular-nums">
              {overviewStats.totalCompletedTasks}
            </span>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              Of {overviewStats.totalPlannedTasks} scheduled blocks
            </span>
          </div>
        </div>

        {statusBanner && (
          <div
            className={`rounded-lg border px-3.5 py-2 text-xs font-mono flex items-center gap-2 ${
              statusBanner.type === 'error'
                ? 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
            }`}
          >
            <CheckCircle2 size={14} />
            <span>{statusBanner.text}</span>
          </div>
        )}

        {showLegacySchemaTip && plans.length > 1 && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
            <strong>Multi-plan cloud sync tip:</strong> Your plans are saved safely on this device, while your Supabase{' '}
            <code className="font-mono">study_plans</code> table currently allows one row per account. Re-run the updated{' '}
            <code className="font-mono">supabase/schema.sql</code> in Supabase SQL Editor to store every plan in the cloud simultaneously.
          </div>
        )}
      </div>

      {/* Empty State */}
      {plans.length === 0 ? (
        <div
          className="rounded-2xl border border-dashed border-border bg-card p-10 text-center space-y-4"
          data-testid="empty-plans-state"
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-500">
            <History size={22} />
          </div>
          <div className="space-y-1.5">
            <h2 className="font-display text-xl font-bold text-foreground">
              You haven&apos;t created a study plan yet
            </h2>
            <p className="mx-auto max-w-md text-sm text-muted-foreground">
              Select your CBSE subjects and pending backlog chapters to generate a step-by-step recovery schedule. Every plan you build will appear here.
            </p>
          </div>
          <Link
            href="/onboarding?reset=true"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-5 py-2.5 text-xs font-mono font-bold text-white shadow-sm hover:opacity-95 transition"
          >
            <Sparkles size={14} />
            <span>Build Your First Study Plan</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <>
          {/* Active Plan Spotlight */}
          {currentActivePlan && (
            <section
              className="rounded-xl border border-sky-500/35 bg-gradient-to-br from-sky-500/[0.07] via-card to-emerald-500/[0.06] p-5 sm:p-6 shadow-xs space-y-4"
              data-testid="card-active-plan-spotlight"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 size={11} />
                      CURRENTLY ACTIVE PLAN
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {currentActivePlan.board || 'CBSE'} · {currentActivePlan.planDuration || currentActivePlan.days?.length || 7}-Day Schedule
                    </span>
                  </div>
                  <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground truncate">
                    {currentActivePlan.name || buildDefaultPlanName(currentActivePlan)}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Subjects: <span className="text-foreground font-medium">{(currentActivePlan.subjects || []).join(', ')}</span>
                    {' · '}Pace: <span className="text-foreground font-medium">{Math.round(((currentActivePlan.minutesPerDay || 180) / 60) * 10) / 10}h/day</span>
                    {currentActivePlan.examDate ? ` · Target: ${currentActivePlan.examDate}` : ''}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 font-mono text-xs shrink-0">
                  <button
                    type="button"
                    onClick={() => setLocation('/roadmap')}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 font-bold transition cursor-pointer whitespace-nowrap"
                    data-testid="button-spotlight-recovery-route"
                  >
                    <Compass size={13} />
                    <span>Recovery Route</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocation('/dashboard')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 px-3.5 py-2 font-semibold transition cursor-pointer whitespace-nowrap"
                  >
                    <ArrowRight size={13} />
                    <span>Dashboard</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocation('/study')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/35 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20 px-3.5 py-2 font-semibold transition cursor-pointer whitespace-nowrap"
                  >
                    <Play size={13} />
                    <span>Learn &amp; Test</span>
                  </button>
                  {overdueUnstudiedCount > 0 && (
                    <button
                      type="button"
                      disabled={busyId === 'rebalance'}
                      onClick={() => void handleRebalanceMissed()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 px-3.5 py-2 font-semibold transition cursor-pointer disabled:opacity-50 whitespace-nowrap"
                      data-testid="button-plans-rebalance-missed"
                    >
                      <RotateCcw size={13} />
                      <span>Rebalance Missed ({overdueUnstudiedCount})</span>
                    </button>
                  )}
                </div>
              </div>

              {overviewStats.activeSummary && (
                <div className="space-y-2 pt-1">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono tabular-nums">
                    <span className="text-muted-foreground">
                      Studied Objectives: <strong className="text-foreground">{analytics.completedObjectivesCount}/{analytics.totalObjectivesCount}</strong>
                      {' · '}Verified Understanding: <strong className="text-emerald-600 dark:text-emerald-400">{analytics.verifiedObjectivesCount}/{analytics.totalObjectivesCount}</strong>
                    </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {overviewStats.activePercent}% route cleared · {analytics.conceptMasteryPercent}% mastery
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/80">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-all duration-500"
                      style={{ width: `${overviewStats.activePercent}%` }}
                    />
                  </div>
                  {activeNormalizedPlan?.prerequisiteWarnings && activeNormalizedPlan.prerequisiteWarnings.length > 0 && (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-800 dark:text-amber-200 flex items-start gap-2">
                      <AlertTriangle size={13} className="shrink-0 mt-0.5 text-amber-500" />
                      <span>
                        <strong>Prerequisite Awareness:</strong> {activeNormalizedPlan.prerequisiteWarnings[0]}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search plans by name, subject, or goal..."
                className="w-full rounded-lg border border-border bg-card pl-9 pr-3 py-2 text-xs font-sans text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:border-sky-500"
                data-testid="input-plans-search"
              />
            </div>

            <div className="flex items-center gap-1.5 font-mono text-xs overflow-x-auto">
              {(
                [
                  { id: 'all', label: `All (${plans.length})` },
                  { id: 'active', label: 'Active' },
                  { id: 'sprint', label: '1D – 7D' },
                  { id: 'extended', label: '14D – 30D' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterMode(tab.id)}
                  className={`rounded-lg border px-3 py-1.5 font-medium transition cursor-pointer shrink-0 ${
                    filterMode === tab.id
                      ? 'border-sky-500/40 bg-sky-500/12 text-sky-700 dark:text-sky-300 font-bold'
                      : 'border-border bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Plans Grid */}
          {filteredPlans.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              No saved plans match your current search or filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPlans.map((p, idx) => {
                const planId = p.id || `plan-${idx}`;
                const isCurrent = Boolean(p.isActive || (currentActivePlan?.id && currentActivePlan.id === p.id));
                const displayName = p.name || buildDefaultPlanName(p);
                const allowLegacyUnscoped = plans.length <= 1;
                const summary = computeRecoveryProgressSummary(p, completedIds, allowLegacyUnscoped);
                const pct =
                  summary.totalTaskCount > 0
                    ? Math.round((summary.completedTaskCount / summary.totalTaskCount) * 100)
                    : 0;
                const chapterCount = p.chapterIds?.length || p.plannedChapterIds?.length || 0;
                const durationDays = p.planDuration || p.days?.length || 7;
                const hoursPerDay = Math.round(((p.minutesPerDay || 180) / 60) * 10) / 10;
                const createdLabel = p.createdAt
                  ? new Date(p.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'Saved';
                const isEditing = editingId === planId;
                const isBusy = busyId === planId;
                const isExpanded = expandedPlanId === planId;

                return (
                  <article
                    key={planId}
                    data-testid={`plan-card-${idx}`}
                    className={`rounded-xl border bg-card p-5 flex flex-col justify-between gap-4 transition ${
                      isCurrent
                        ? 'border-sky-500/50 shadow-sm ring-1 ring-sky-500/20'
                        : 'border-border hover:border-border/90'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={draftName}
                                onChange={(e) => setDraftName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') void commitRename(planId);
                                  if (e.key === 'Escape') setEditingId(null);
                                }}
                                autoFocus
                                className="h-8 w-full rounded-lg border border-sky-500/50 bg-background px-2.5 text-sm font-semibold text-foreground focus:outline-hidden"
                                placeholder="Enter plan name"
                                data-testid={`input-rename-plan-${idx}`}
                              />
                              <button
                                type="button"
                                onClick={() => void commitRename(planId)}
                                className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 p-1.5 text-emerald-500 hover:bg-emerald-500/25 cursor-pointer"
                                title="Save name"
                              >
                                <Check size={14} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-display text-lg font-bold text-foreground truncate">
                                {displayName}
                              </h3>
                              {isCurrent && (
                                <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                  <CheckCircle2 size={10} />
                                  ACTIVE
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => startRename(p)}
                                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
                                title="Rename plan"
                                data-testid={`button-rename-plan-${idx}`}
                              >
                                <Pencil size={12} />
                              </button>
                            </div>
                          )}
                          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                            {p.goal || 'CBSE Backlog Recovery'}
                          </p>
                        </div>

                        <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                          {createdLabel}
                        </span>
                      </div>

                      {/* Metadata Row */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays size={12} className="text-sky-500" />
                          {durationDays}-Day
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <BookOpen size={12} className="text-indigo-500" />
                          {chapterCount} Chapters
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock3 size={12} className="text-amber-500" />
                          {hoursPerDay}h/day
                        </span>
                        {p.examDate && (
                          <span className="text-foreground/80">Target {p.examDate}</span>
                        )}
                      </div>

                      {/* Subjects List */}
                      {Array.isArray(p.subjects) && p.subjects.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {p.subjects.map((sub) => (
                            <span
                              key={sub}
                              className="rounded border border-border/80 bg-muted/30 px-2 py-0.5 text-[10px] font-mono text-foreground/90"
                            >
                              {sub}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Progress Bar */}
                      <div className="space-y-1 pt-1">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="text-muted-foreground">
                            {summary.completedTaskCount}/{summary.totalTaskCount} blocks completed
                          </span>
                          <span className="font-bold text-foreground tabular-nums">
                            {pct}% cleared
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              pct === 100
                                ? 'bg-emerald-500'
                                : isCurrent
                                ? 'bg-sky-500'
                                : 'bg-indigo-500/80'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      {/* Expandable Schedule Preview */}
                      {isExpanded && Array.isArray(p.days) && p.days.length > 0 && (
                        <div className="rounded-lg border border-border/80 bg-muted/20 p-3 space-y-2 max-h-56 overflow-y-auto">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold block">
                            Schedule Preview ({p.days.length} Days)
                          </span>
                          {p.days.map((day) => {
                            const ch = resolveChapterById(day.chapterId);
                            const tasks = Array.isArray(day.tasks) ? day.tasks : [];
                            const completedSet = new Set(completedIds);
                            const doneCount = tasks.filter((t) =>
                              isPlanTaskCompleted(completedSet, p.id, t.id, allowLegacyUnscoped)
                            ).length;
                            const dayMins = tasks.reduce((acc, t) => acc + (Number(t.minutes) || 0), 0);
                            return (
                              <div
                                key={`${planId}-day-${day.day}`}
                                className="flex items-center justify-between gap-2 border-b border-border/40 last:border-0 pb-1.5 last:pb-0 text-xs"
                              >
                                <div className="min-w-0">
                                  <span className="font-mono text-[10px] font-bold text-sky-600 dark:text-sky-400 mr-1.5">
                                    D{day.day}
                                  </span>
                                  <span className="font-medium text-foreground truncate">
                                    {ch?.title || day.theme}
                                  </span>
                                </div>
                                <span className="font-mono text-[10px] text-muted-foreground shrink-0 tabular-nums">
                                  {doneCount}/{tasks.length} · {dayMins}m
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Card Action Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setExpandedPlanId(isExpanded ? null : planId)}
                          className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/30 hover:bg-muted px-2.5 py-1.5 text-[11px] font-mono font-medium text-foreground transition cursor-pointer"
                          data-testid={`button-preview-plan-${idx}`}
                        >
                          {isExpanded ? <EyeOff size={12} /> : <Eye size={12} />}
                          <span>{isExpanded ? 'Hide Days' : 'Preview'}</span>
                        </button>

                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleDuplicate(p)}
                          className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/30 hover:bg-muted px-2.5 py-1.5 text-[11px] font-mono font-medium text-foreground transition disabled:opacity-50 cursor-pointer"
                          title="Duplicate this plan"
                          data-testid={`button-duplicate-plan-${idx}`}
                        >
                          <Copy size={12} />
                          <span>Duplicate</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {pendingDeleteId === planId ? (
                          <>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void handleDeleteConfirm(p)}
                              className="rounded-lg bg-rose-600 hover:bg-rose-500 px-2.5 py-1.5 text-[11px] font-mono font-bold text-white transition disabled:opacity-50 cursor-pointer"
                              data-testid={`confirm-delete-plan-card-${idx}`}
                            >
                              {isBusy ? 'Deleting...' : 'Confirm Delete'}
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => setPendingDeleteId(null)}
                              className="rounded-lg border border-border bg-card hover:bg-muted px-2.5 py-1.5 text-[11px] font-mono text-foreground transition cursor-pointer"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            {!isCurrent ? (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => void handleActivate(p)}
                                className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-mono font-bold text-white transition active:scale-95 disabled:opacity-50 cursor-pointer"
                                data-testid={`button-activate-plan-${idx}`}
                              >
                                {isBusy ? 'Switching...' : 'Set Active'}
                              </button>
                            ) : (
                              <Link
                                href="/roadmap"
                                className="rounded-lg border border-emerald-500/35 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300 transition"
                              >
                                Open Route →
                              </Link>
                            )}
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => setPendingDeleteId(planId)}
                              className="rounded-lg border border-rose-500/25 bg-rose-500/10 hover:bg-rose-500/20 p-1.5 text-rose-500 transition disabled:opacity-50 cursor-pointer"
                              title="Delete plan"
                              data-testid={`button-delete-plan-card-${idx}`}
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
