import { useState, useMemo, useEffect } from 'react';
import {
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  Play,
  RotateCcw,
  TimerReset,
  GitFork,
  Settings,
  Plus,
  Compass,
  Loader2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/lib/auth-context';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useBacklogMetrics } from '@/hooks/use-backlog-metrics';
import { CommunityImpactBanner } from '@/components/CommunityImpactBanner';
import { PlanHistoryModal } from '@/components/PlanHistoryModal';
import { resolveChapterById } from '@/lib/backlog-data';
import { computeBacklogEstimates } from '@/lib/backlog-estimator';
import {
  fetchCloudStudyPlansRaw,
  loadBacklogItemsDirect,
  loadCompletedTasksDirect,
  saveWorkspaceStateDirect,
} from '@/lib/supabase-service';

import {
  readCompleted,
  readPlan,
  readRestDates,
  readStudySessions,
  toggleRestDate,
  readBacklogItems,
  mergeBacklogItems,
  getScopedBacklogItemsForPlan,
  readSmartDailyPlan,
  saveSmartDailyPlan,
  readSpacedRevisions,
  completeSpacedRevision,
  saveMissedDayRecovery,
  readRecoveryModeActive,
  setRecoveryModeActive,
  saveCompleted,
  type StudySession,
} from '@/lib/storage';
import {
  type BacklogItem,
  calculateBacklogMetrics,
  computeRecoveryProgressSummary,
} from '@/lib/backlog-items';
import {
  type SmartDailyPlan,
  computeMissedDayRecovery,
  calculateWillIFinish,
} from '@/lib/smart-planner';
import { DailyPlanCard } from '@/components/DailyPlanCard';
import { BacklogRecoveryMode } from '@/components/BacklogRecoveryMode';
import { SpacedRevisionCard } from '@/components/SpacedRevisionCard';
import { PrerequisiteMapModal } from '@/components/PrerequisiteMapModal';
import { MissedDayRecoveryModal } from '@/components/MissedDayRecoveryModal';
import { SubjectManagementModal } from '@/components/SubjectManagementModal';
import { PWAInstallButton } from '@/components/PWAInstallButton';
import { readEducationProfile } from '@/lib/curriculum/user-profile-storage';
import { triggerTaskCelebration, triggerGrandCelebration } from '@/lib/celebration';

function dayKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getStreak(sessions: StudySession[]) {
  const days = new Set(
    (sessions || [])
      .filter((s) => s && s.completedAt)
      .map((session) => {
        try {
          const d = new Date(session.completedAt);
          return !Number.isNaN(d.getTime()) ? dayKey(d) : '';
        } catch {
          return '';
        }
      })
      .filter(Boolean)
  );
  let cursor = new Date();
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// Streak helper defined above

function RestDayCard({ onUndo }: { onUndo: () => void }) {
  return (
    <section className="border-y border-accent/50 bg-accent/10 py-6 sm:py-8" data-testid="card-rest-day">
      <p className="text-xs font-bold uppercase tracking-[.16em] text-primary">Today’s plan</p>
      <h2 className="font-display mt-2 text-3xl font-bold">Recovery day, on purpose.</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
        Your next study focus has not disappeared. It moves forward when you are ready, so one difficult day does not turn into a lost week.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/study"
          className="focus-ring inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
          data-testid="link-rest-day-light-review"
        >
          <BookOpenCheck size={16} /> Do a light review
        </Link>
        <button
          type="button"
          onClick={onUndo}
          className="focus-ring inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold"
          data-testid="button-undo-rest-day"
        >
          <RotateCcw size={15} /> Use today as planned
        </button>
      </div>
    </section>
  );
}

export function Dashboard() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading, hydratedUserId, syncStatus, plans, activePlan, setActivePlan, refreshPlans, syncDataNow } = useAuth();
  const [planRefreshKey, setPlanRefreshKey] = useState(0);

  const plan = activePlan || readPlan(user?.uid);
  const isHydratingAuth = Boolean(
    user && !user.isGuest && (syncStatus === 'syncing' || hydratedUserId !== user.uid)
  );
  const [restDates, setRestDates] = useState(() => readRestDates(user?.uid));
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState<boolean>(() =>
    Boolean(user && !user.isGuest && !activePlan && !readPlan(user?.uid))
  );
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);

  // BacklogOS Core State scoped to user
  const [backlogItems, setBacklogItems] = useState<BacklogItem[]>(() => readBacklogItems(user?.uid));
  const [dailyPlan, setDailyPlan] = useState<SmartDailyPlan | null>(() => readSmartDailyPlan(user?.uid));
  const [revisions, setRevisions] = useState(() => readSpacedRevisions(user?.uid));
  const [isRecoveryMode, setIsRecoveryMode] = useState(() => readRecoveryModeActive(user?.uid));

  // Refresh upon plan, backlog, or recovery task completion changes
  useEffect(() => {
    const handleUpdate = () => {
      setPlanRefreshKey((k) => k + 1);
      setBacklogItems(readBacklogItems(user?.uid));
      setDailyPlan(readSmartDailyPlan(user?.uid));
      setRevisions(readSpacedRevisions(user?.uid));
      setRestDates(readRestDates(user?.uid));
      setIsRecoveryMode(readRecoveryModeActive(user?.uid));
    };
    handleUpdate();
    window.addEventListener('backlogos-plan-updated', handleUpdate);
    window.addEventListener('backlogos-plans-updated', handleUpdate);
    window.addEventListener('backlogos-completed-updated', handleUpdate);
    window.addEventListener('backlogos-backlog-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('backlogos-plan-updated', handleUpdate);
      window.removeEventListener('backlogos-plans-updated', handleUpdate);
      window.removeEventListener('backlogos-completed-updated', handleUpdate);
      window.removeEventListener('backlogos-backlog-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [user?.uid]);

  // Direct Supabase database sync on mount for authenticated students (preserves switched active plan)
  useEffect(() => {
    const uid = user?.uid;
    if (!uid || user?.isGuest) {
      setIsLoadingWorkspace(false);
      setWorkspaceError(null);
      return;
    }
    let isCancelled = false;

    async function loadDirectData() {
      setIsLoadingWorkspace(true);
      setWorkspaceError(null);
      try {
        const [cloudPlanProbe, , directItems, directCompleted] = await Promise.all([
          fetchCloudStudyPlansRaw(uid),
          refreshPlans(),
          loadBacklogItemsDirect(uid),
          loadCompletedTasksDirect(uid),
        ]);

        if (isCancelled) return;

        if (cloudPlanProbe.error && !cloudPlanProbe.fromCloud) {
          setWorkspaceError(cloudPlanProbe.error);
        }

        if (directItems && directItems.length > 0) {
          const merged = mergeBacklogItems(directItems, uid, { skipProgression: true });
          setBacklogItems(merged);
        }
        if (directCompleted && directCompleted.length > 0) {
          const existingCompleted = readCompleted(uid);
          const mergedCompleted = Array.from(new Set([...existingCompleted, ...directCompleted]));
          saveCompleted(mergedCompleted, uid, { skipProgression: true });
        }
        setPlanRefreshKey((k) => k + 1);
      } catch (err: any) {
        if (!isCancelled) {
          setWorkspaceError(err?.message || 'Unable to load workspace from Supabase.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingWorkspace(false);
        }
      }
    }

    loadDirectData();
    return () => {
      isCancelled = true;
    };
  }, [user?.uid, user?.isGuest]);

  // Modals state
  const [isPrereqMapOpen, setIsPrereqMapOpen] = useState(false);
  const [isMissedRecoveryOpen, setIsMissedRecoveryOpen] = useState(false);
  const [isPlanHistoryOpen, setIsPlanHistoryOpen] = useState(false);

  // Daily target hours
  const [dailyHoursTarget, setDailyHoursTarget] = useState<number>(() => {
    return plan?.minutesPerDay ? Math.round((plan.minutesPerDay / 60) * 10) / 10 : 3.5;
  });

  useEffect(() => {
    if (plan?.minutesPerDay) {
      setDailyHoursTarget(Math.round((plan.minutesPerDay / 60) * 10) / 10);
    }
  }, [plan?.id, plan?.minutesPerDay]);

  const scopedBacklogItems = useMemo(
    () => getScopedBacklogItemsForPlan(backlogItems, plan),
    [backlogItems, plan]
  );

  const completedIdsArray = useMemo(() => readCompleted(user?.uid), [user?.uid, planRefreshKey]);
  const completed = useMemo(() => new Set(completedIdsArray), [completedIdsArray]);
  const recoverySummary = useMemo(
    () => computeRecoveryProgressSummary(plan, completedIdsArray),
    [plan, completedIdsArray]
  );
  const sessions = useMemo(() => readStudySessions(user?.uid), [user?.uid, planRefreshKey]);

  const streak = getStreak(sessions);

  const examDateStr = plan?.examDate;
  const examDate = examDateStr ? new Date(`${examDateStr}T12:00:00`) : null;
  const daysToExam =
    examDate && !Number.isNaN(examDate.getTime())
      ? Math.ceil((examDate.getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000)
      : null;

  const todayStr = dayKey(new Date());
  const todayIsRest = restDates.includes(todayStr);

  // Requirement 2: Dedicated calculation hook aggregating from Supabase/state + Recovery Route tasks
  const {
    pendingItemsCount,
    completedItemsCount,
    totalItemsCount,
    chapterProgressPercent,
    recoveryCompletedTasks,
    recoveryTotalTasks,
  } = useBacklogMetrics(user?.uid);


  const handleToggleRestToday = () => {
    const nextRest = toggleRestDate(todayStr, user?.uid);
    setRestDates(nextRest);
    if (isSupabaseConfigured && user?.uid && !user.isGuest) {
      saveWorkspaceStateDirect({ restDates: nextRest }, user.uid).catch(() => {});
    }
  };

  // Handlers for Daily Plan
  const handleUpdateDailyPlan = (newPlan: SmartDailyPlan) => {
    setDailyPlan(newPlan);
    saveSmartDailyPlan(newPlan, user?.uid);
    if (isSupabaseConfigured && user?.uid && !user.isGuest) {
      saveWorkspaceStateDirect({ dailyPlan: newPlan }, user.uid).catch(() => {});
    }
  };

  const handleToggleDailySlot = (slotId: string) => {
    if (!dailyPlan) return;
    const target = dailyPlan.slots.find((s) => s.id === slotId);
    const willBeCompleted = target ? !target.completed : false;
    const updatedSlots = dailyPlan.slots.map((s) =>
      s.id === slotId ? { ...s, completed: !s.completed } : s
    );
    const updatedPlan = { ...dailyPlan, slots: updatedSlots };
    setDailyPlan(updatedPlan);
    saveSmartDailyPlan(updatedPlan, user?.uid);
    if (isSupabaseConfigured && user?.uid && !user.isGuest) {
      saveWorkspaceStateDirect({ dailyPlan: updatedPlan }, user.uid).catch(() => {});
    }
    if (willBeCompleted) {
      const allDone = updatedSlots.length > 0 && updatedSlots.every((s) => s.completed);
      if (allDone) {
        triggerGrandCelebration();
      } else {
        triggerTaskCelebration();
      }
    }
  };

  // Handlers for Revisions
  const handleCompleteRevision = (
    revisionId: string,
    confidence: 'strong' | 'shaky' | 'forgotten'
  ) => {
    const updated = completeSpacedRevision(revisionId, confidence, user?.uid);
    setRevisions(updated);
    if (isSupabaseConfigured && user?.uid && !user.isGuest) {
      saveWorkspaceStateDirect({ revisions: updated }, user.uid).catch(() => {});
    }
    if (confidence === 'strong' || confidence === 'shaky') {
      triggerTaskCelebration();
    }
  };

  // Handlers for Recovery Mode
  const handleToggleRecoveryMode = (active: boolean) => {
    setIsRecoveryMode(active);
    setRecoveryModeActive(active, user?.uid);
    if (isSupabaseConfigured && user?.uid && !user.isGuest) {
      saveWorkspaceStateDirect({ recoveryMode: active }, user.uid).catch(() => {});
    }
  };

  // Handlers for Missed-Day Recovery
  const missedRecoveryPlan = useMemo(() => {
    return computeMissedDayRecovery(4, dailyHoursTarget, 'Yesterday');
  }, [dailyHoursTarget]);

  const handleAcceptRecoveryPlan = (p: any) => {
    saveMissedDayRecovery(p, user?.uid);
    setDailyHoursTarget(p.newDailyHours);
    if (isSupabaseConfigured && user?.uid && !user.isGuest) {
      saveWorkspaceStateDirect({ missedRecovery: p }, user.uid).catch(() => {});
    }
  };

  const dueRevs = useMemo(() => {
    return revisions
      .filter((r) => r.status === 'due' || r.status === 'overdue')
      .map((r) => ({ chapterId: r.chapterId, title: r.chapterTitle, subject: r.subject }));
  }, [revisions]);

  const completedChapterIds = useMemo(
    () => scopedBacklogItems.filter((i) => i.status === 'completed').map((i) => i.chapterId),
    [scopedBacklogItems]
  );

  const userName = user?.preferredName || (user?.displayName ? user.displayName.split(' ')[0] : 'Student');
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const [isManageSubjectsOpen, setIsManageSubjectsOpen] = useState(false);
  const educationProfile = useMemo(() => readEducationProfile(user?.uid), [isManageSubjectsOpen, user?.uid]);

  // Unified Intelligent Backlog Estimator calculation scoped to the active plan
  const estimatorResult = useMemo(() => {
    const rawList = scopedBacklogItems.length > 0 ? scopedBacklogItems : (plan?.chapterIds || []).map((chId: string) => ({
      id: chId,
      chapterId: chId,
      topic: chId,
      subject: 'Science',
      estimatedHours: 5,
      difficulty: 'medium',
      status: 'not_started',
      hoursSpent: 0,
      confidence: 'medium',
      examRelevance: 'high',
      prerequisites: [],
      createdAt: new Date().toISOString(),
    }));

    const chapterInputs = rawList.map((item: BacklogItem) => {
      const chId = item.chapterId || item.id;
      const recoveryHoursForChapter = (recoverySummary.minutesByChapter[chId] || 0) / 60;
      const isDone =
        item.status === 'completed' ||
        completed.has(chId) ||
        recoverySummary.fullyCompletedChapterIds.has(chId);
      return {
        id: chId,
        title: item.topic || 'Chapter',
        subject: item.subject || 'Science',
        estimatedHours: item.estimatedHours || 5,
        hoursSpent: (Number(item.hoursSpent) || 0) + recoveryHoursForChapter,
        difficulty: item.difficulty || 'medium',
        status: item.status || 'not_started',
        isCompleted: isDone,
      };
    });

    return computeBacklogEstimates(chapterInputs, {
      dailyTargetHours: dailyHoursTarget,
      targetExamDate: examDateStr,
      completedChapterIds: [
        ...Array.from(completed),
        ...Array.from(recoverySummary.fullyCompletedChapterIds),
      ],
    });
  }, [scopedBacklogItems, plan, completed, recoverySummary, dailyHoursTarget, examDateStr]);

  const paceAnalysis = useMemo(
    () => calculateWillIFinish(scopedBacklogItems, sessions, dailyHoursTarget, examDateStr, plan, completedIdsArray),
    [scopedBacklogItems, sessions, dailyHoursTarget, examDateStr, plan, completedIdsArray]
  );

  const metrics = useMemo(
    () => calculateBacklogMetrics(scopedBacklogItems, dailyHoursTarget, plan, completedIdsArray),
    [scopedBacklogItems, dailyHoursTarget, plan, completedIdsArray]
  );

  const primarySubjectPulse = useMemo(() => {
    const entries = Object.entries(metrics.subjectMetrics || {})
      .filter(([, m]) => m && (m.chaptersTotal > 0 || m.chaptersPending > 0))
      .sort((a, b) => b[1].chaptersPending - a[1].chaptersPending);
    if (entries.length > 0) {
      return { subject: entries[0][0], pendingChapters: entries[0][1].chaptersPending };
    }
    const fallbackSubject = plan?.subjects?.[0] || 'Physics';
    return { subject: fallbackSubject, pendingChapters: pendingItemsCount };
  }, [metrics.subjectMetrics, plan?.subjects, pendingItemsCount]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 space-y-6 animate-page-enter">
      {/* Unified Workspace Command Header (shown only when a plan is generated) */}
      {plan && (
        <div className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-5">
          {/* Top Plan Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-4 text-xs font-mono">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-muted-foreground">Active Plan:</span>
              {plans && plans.length > 1 ? (
                <select
                  value={activePlan?.id || plan?.id || ''}
                  onChange={(e) => setActivePlan(e.target.value)}
                  className="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-mono font-semibold text-foreground focus:outline-hidden"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name || 'Study Plan'} {p.isActive ? '★' : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="font-semibold text-foreground">
                  {plan.name || 'Primary Study Plan'}
                </span>
              )}
              <span className="text-muted-foreground">
                · {plan.days?.length || plan.planDuration || 7}-Day Route
              </span>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Link
                href="/plans"
                data-testid="link-dashboard-all-plans"
                className="text-muted-foreground hover:text-foreground hover:underline transition"
              >
                All Plans ({plans?.length || 1})
              </Link>
              <span aria-hidden="true" className="text-border">|</span>
              <button
                type="button"
                onClick={() => setIsPlanHistoryOpen(true)}
                data-testid="button-plan-history"
                className="text-muted-foreground hover:text-foreground hover:underline transition cursor-pointer"
              >
                Quick Switch
              </button>
              <Link
                href="/onboarding?reset=true"
                className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 hover:bg-muted px-2.5 py-1 text-xs font-semibold text-foreground transition"
              >
                <Plus size={12} />
                <span>New Plan</span>
              </Link>
            </div>
          </div>

          {/* Hero Metric & Primary Actions */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div className="space-y-1.5">
              <p className="text-xs font-mono text-muted-foreground">
                {greeting}, {userName} · CBSE Class {educationProfile.grade || '11'}
                {educationProfile.stream !== 'none' ? ` ${String(educationProfile.stream || 'pcm').toUpperCase()}` : ''}
              </p>

              <div className="flex items-baseline gap-3 flex-wrap">
                <span
                  className="font-mono tabular-nums text-4xl sm:text-5xl font-bold tracking-tight text-foreground"
                  data-testid="text-dashboard-remaining-hours"
                >
                  {pendingItemsCount}
                </span>
                <span className="text-sm font-medium text-muted-foreground">
                  {pendingItemsCount === 1 ? 'chapter pending' : 'chapters pending'}
                </span>
                <span
                  className={`text-xs font-mono font-bold ${
                    pendingItemsCount > 12
                      ? 'text-rose-600 dark:text-rose-400'
                      : pendingItemsCount > 5
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {pendingItemsCount > 12 ? 'Heavy backlog' : pendingItemsCount > 5 ? 'Active recovery' : 'On track'}
                </span>
              </div>

              <div className="text-xs font-mono text-muted-foreground flex flex-wrap items-center gap-2 tabular-nums">
                <span>
                  {completedItemsCount} of {totalItemsCount || estimatorResult.totalChapters} chapters completed
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  {totalItemsCount > 0 ? chapterProgressPercent : estimatorResult.progressPercent}% cleared
                </span>
                {recoveryTotalTasks > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <Link
                      href="/roadmap"
                      className="text-sky-600 dark:text-sky-400 hover:underline font-semibold"
                      data-testid="text-dashboard-recovery-deducted"
                    >
                      Recovery Route: {recoveryCompletedTasks}/{recoveryTotalTasks} tasks
                    </Link>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 font-mono text-xs shrink-0">
              <Link
                href="/roadmap"
                className="rounded-lg bg-foreground text-background hover:opacity-90 px-4 py-2 transition flex items-center gap-1.5 font-bold btn-press"
                data-testid="link-dashboard-syllabus-map"
              >
                <CalendarDays size={13} />
                <span>Recovery Route ({plan.planDuration || plan.days?.length || 7}D)</span>
              </Link>

              <button
                type="button"
                onClick={() => setIsMissedRecoveryOpen(true)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-foreground hover:bg-muted transition flex items-center gap-1.5 font-medium btn-press"
                data-testid="button-dashboard-missed-recovery"
              >
                <RotateCcw size={13} className="text-muted-foreground" />
                <span>Missed a Day?</span>
              </button>

              <button
                type="button"
                onClick={() => setIsManageSubjectsOpen(true)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-foreground hover:bg-muted transition flex items-center gap-1.5 btn-press"
                data-testid="button-dashboard-manage-subjects"
              >
                <Settings size={13} className="text-muted-foreground" />
                <span>Subjects</span>
              </button>
            </div>
          </div>

          {/* Quiet Unboxed Runway Metadata Line */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/70 pt-3 text-xs font-mono text-muted-foreground tabular-nums">
            <span>
              Daily routine: <strong className="text-foreground">{dailyHoursTarget}h/day</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Sprint: <strong className="text-foreground">{plan.planDuration || plan.days?.length || 7}-Day Route</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Exam: <strong className="text-foreground">{examDateStr || 'CBSE 2027'}</strong>
              {daysToExam !== null ? ` (${daysToExam}d left)` : ''}
            </span>
            {streak > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  Streak: <strong className="text-foreground">{streak}d</strong>
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* PWA App Install Banner (auto-hides if unsupported or installed) */}
      <PWAInstallButton variant="banner" />

      {/* BACKLOG RECOVERY MODE */}
      {plan && isRecoveryMode && (
        <BacklogRecoveryMode
          backlogItems={scopedBacklogItems}
          isActive={isRecoveryMode}
          onToggleActive={handleToggleRecoveryMode}
          onStartSprint={(chId) => setLocation(`/study?chapter=${chId}`)}
          dailyHours={dailyHoursTarget}
        />
      )}

      {/* TODAY'S FOCUS SECTION */}
      <section className="space-y-4" aria-labelledby="heading-todays-focus">
        <div className="flex items-center justify-between border-b border-border pb-2.5">
          <div className="flex items-center gap-2">
            <BookOpenCheck size={16} className="text-foreground" />
            <h1 id="heading-todays-focus" className="text-sm font-semibold tracking-tight text-foreground">
              Today&apos;s Focus
            </h1>
          </div>
          {!plan && (
            <Link
              href="/onboarding?reset=true"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              data-testid="button-create-first-plan"
            >
              <span>Create Recovery Plan</span>
              <ArrowRight size={13} />
            </Link>
          )}
        </div>

        {/* Explicit Loading / Error / Empty / Active Focus States */}
        {(authLoading || ((isLoadingWorkspace || isHydratingAuth) && !plan)) ? (
          <div
            className="rounded-xl border border-border bg-card/50 py-14 px-6 text-center space-y-2"
            data-testid="banner-workspace-loading"
          >
            <Loader2 size={20} className="mx-auto animate-spin text-primary" />
            <p className="text-sm font-medium text-foreground">Loading your workspace from cloud...</p>
            <p className="text-xs text-muted-foreground">Fetching your saved study plans and chapter progress.</p>
          </div>
        ) : workspaceError && !plan ? (
          <div
            className="rounded-xl border border-rose-500/30 bg-rose-500/5 py-10 px-6 text-center space-y-3"
            data-testid="banner-workspace-error"
          >
            <AlertTriangle size={22} className="mx-auto text-rose-500" />
            <p className="text-sm font-semibold text-foreground">Could not load your saved workspace</p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">{workspaceError}</p>
            <div className="pt-1 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setWorkspaceError(null);
                  setIsLoadingWorkspace(true);
                  void syncDataNow().finally(() => setIsLoadingWorkspace(false));
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-foreground text-background px-4 py-2 text-xs font-semibold hover:opacity-90 transition"
              >
                <RefreshCw size={13} />
                <span>Retry Sync</span>
              </button>
            </div>
          </div>
        ) : !plan ? (
          <div
            className="rounded-xl border border-dashed border-border bg-card/40 py-14 px-6 text-center space-y-3"
            data-testid="banner-no-plan"
          >
            <p className="text-sm font-medium text-foreground">
              Nothing scheduled for today
            </p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Generate a recovery plan to populate your daily study focus.
            </p>
            <div className="pt-1">
              <Link
                href="/onboarding?reset=true"
                className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground font-semibold px-4 py-2 text-xs hover:opacity-90 transition"
              >
                <span>Create Your Recovery Plan</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
            <div className="space-y-5">
              {/* Rest Day Card or Smart Daily Plan */}
              {todayIsRest ? (
                <RestDayCard onUndo={handleToggleRestToday} />
              ) : (
                <DailyPlanCard
                  plan={dailyPlan}
                  backlogItems={scopedBacklogItems}
                  dueRevisionChapters={dueRevs}
                  examDateStr={examDateStr}
                  onGeneratePlan={handleUpdateDailyPlan}
                  onToggleSlotComplete={handleToggleDailySlot}
                />
              )}

              {/* Only expand Spaced Revision Card if revisions are due */}
              {dueRevs.length > 0 && (
                <SpacedRevisionCard
                  revisions={revisions}
                  onCompleteRevision={handleCompleteRevision}
                />
              )}

              {/* Rest day toggle */}
              {!todayIsRest && (
                <button
                  type="button"
                  onClick={handleToggleRestToday}
                  className="focus-ring inline-flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-foreground"
                  data-testid="button-take-rest-day"
                >
                  <RotateCcw size={13} />
                  <span>Need a deliberate rest day? Shift today&apos;s schedule forward without penalty.</span>
                </button>
              )}
            </div>

            {/* Right Sidebar: 2 Calm Cards Only */}
            <aside className="space-y-5">
              <section className="rounded-xl border border-border bg-card p-4 space-y-3 font-mono text-xs" data-testid="card-quick-actions">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold block">
                  Quick Launch
                </span>

                <div className="grid gap-2">
                  <Link
                    href="/study"
                    className="focus-ring flex items-center justify-between rounded-lg bg-foreground text-background hover:opacity-90 px-3.5 py-2.5 text-xs font-bold transition shadow-xs"
                    data-testid="link-quick-study"
                  >
                    <span>Start Focus Session</span>
                    <Play size={13} className="fill-current" />
                  </Link>

                  <Link
                    href="/roadmap"
                    className="flex items-center justify-between rounded-lg border border-border bg-background hover:bg-muted px-3 py-2 text-xs text-foreground font-medium transition"
                  >
                    <span>Open Recovery Route</span>
                    <Compass size={13} className="text-muted-foreground" />
                  </Link>

                  <button
                    type="button"
                    onClick={() => setIsPrereqMapOpen(true)}
                    className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground hover:bg-muted text-left transition"
                  >
                    <span>Prerequisite Map</span>
                    <GitFork size={13} className="text-muted-foreground" />
                  </button>
                </div>

                {/* Concise single pace note */}
                <div className="border-t border-border/70 pt-3 font-sans text-xs">
                  <p className="text-foreground font-medium leading-snug">
                    {primarySubjectPulse.subject}:{' '}
                    <strong className="font-mono tabular-nums">
                      {primarySubjectPulse.pendingChapters}{' '}
                      {primarySubjectPulse.pendingChapters === 1 ? 'chapter' : 'chapters'}
                    </strong>{' '}
                    pending ·{' '}
                    {paceAnalysis.isOnTrack
                      ? `${paceAnalysis.bufferDays ?? 12}d exam runway`
                      : `target ${paceAnalysis.requiredChaptersPerWeek} ch/wk`}
                  </p>
                </div>
              </section>

              {/* Recent Sessions */}
              <section className="rounded-xl border border-border bg-card p-4 space-y-2.5 font-mono text-xs" data-testid="card-recent-sessions">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                    Recent Blocks
                  </span>
                  <TimerReset size={13} className="text-muted-foreground" />
                </div>

                {sessions.slice(0, 4).length > 0 ? (
                  <div className="space-y-2 divide-y divide-border/40">
                    {sessions.slice(0, 4).map((s, index) => {
                      const ch = resolveChapterById(s.chapterId);
                      const displayDate =
                        s.completedAt && !Number.isNaN(new Date(s.completedAt).getTime())
                          ? new Date(s.completedAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'Recent';
                      return (
                        <div
                          key={s.id ? `recent-${s.id}-${index}` : `recent-${index}`}
                          className="pt-1.5 first:pt-0 flex items-center justify-between text-xs"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="truncate font-medium text-foreground">
                              {ch?.title ?? 'Focused Session'}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {displayDate} · {s.mode || 'focus'}
                            </p>
                          </div>
                          <span className="font-bold text-foreground shrink-0 tabular-nums">
                            {s.minutes}m
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground font-sans">
                    No sessions logged yet. Start a focus block in the Study Room to track your pace.
                  </p>
                )}
              </section>
            </aside>
          </div>
        )}
      </section>

      {/* Quiet Community Footer */}
      <div className="border-t border-border/70 pt-6 pb-2">
        <CommunityImpactBanner />
      </div>

      {/* Prerequisite Map Modal */}
      <PrerequisiteMapModal
        isOpen={isPrereqMapOpen}
        onClose={() => setIsPrereqMapOpen(false)}
        backlogItems={scopedBacklogItems}
        completedChapterIds={completedChapterIds}
        onSelectChapter={(chId) => {
          setIsPrereqMapOpen(false);
          setLocation(`/study?chapter=${chId}`);
        }}
      />

      {/* Missed-Day Recovery Modal */}
      <MissedDayRecoveryModal
        isOpen={isMissedRecoveryOpen}
        onClose={() => setIsMissedRecoveryOpen(false)}
        recoveryPlan={missedRecoveryPlan}
        onAcceptRecoveryPlan={handleAcceptRecoveryPlan}
      />

      {/* Subject Management Modal */}
      {isManageSubjectsOpen && (
        <SubjectManagementModal
          onClose={() => setIsManageSubjectsOpen(false)}
          onProfileUpdated={() => setBacklogItems(readBacklogItems(user?.uid))}
        />
      )}

      {/* Multi-Plan History Modal */}
      <PlanHistoryModal
        isOpen={isPlanHistoryOpen}
        onClose={() => setIsPlanHistoryOpen(false)}
      />
    </div>
  );
}
