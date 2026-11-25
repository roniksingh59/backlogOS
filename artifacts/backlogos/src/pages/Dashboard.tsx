import { useState, useMemo, useEffect } from 'react';
import {
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  Compass,
  Flame,
  GitFork,
  Layers,
  ListChecks,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Settings,
  Table as TableIcon,
  TimerReset,
  AlertTriangle,
  BarChart3,
  BrainCircuit,
  CheckSquare,
  ShieldCheck,
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/lib/auth-context';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useBacklogMetrics } from '@/hooks/use-backlog-metrics';
import { useEnginesWorkspace } from '@/hooks/use-engines-workspace';
import { CommunityImpactBanner } from '@/components/CommunityImpactBanner';
import { PlanHistoryModal } from '@/components/PlanHistoryModal';
import { resolveChapterById } from '@/lib/backlog-data';
import { computeBacklogEstimates } from '@/lib/backlog-estimator';
import {
  fetchCloudStudyPlansRaw,
  loadBacklogItemsDirect,
  loadCompletedTasksDirect,
  saveCompletedTaskDirect,
  saveWorkspaceStateDirect,
  updateBacklogItemDirect,
  createBacklogItemDirect,
} from '@/lib/supabase-service';

import {
  readCompleted,
  readPlan,
  readRestDates,
  readStudySessions,
  toggleRestDate,
  readBacklogItems,
  mergeBacklogItems,
  saveBacklogItems,
  getScopedBacklogItemsForPlan,
  readSmartDailyPlan,
  saveSmartDailyPlan,
  readSpacedRevisions,
  completeSpacedRevision,
  saveMissedDayRecovery,
  readRecoveryModeActive,
  setRecoveryModeActive,
  saveCompleted,
  updateBacklogItem,
  type StudySession,
} from '@/lib/storage';
import {
  type BacklogItem,
  type BacklogStatus,
  calculateBacklogMetrics,
  computeRecoveryProgressSummary,
  STATUS_LABELS,
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
import { BaxMascot, BaxContextualSlot } from '@/components/bax/BaxMascot';

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

function getSubjectBarColor(subject: string): { bar: string; text: string } {
  const s = (subject || '').toLowerCase();
  if (s.includes('phys')) return { bar: 'bg-sky-500', text: 'text-sky-600 dark:text-sky-400' };
  if (s.includes('chem')) return { bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' };
  if (s.includes('math')) return { bar: 'bg-indigo-500', text: 'text-indigo-600 dark:text-indigo-400' };
  if (s.includes('bio')) return { bar: 'bg-teal-500', text: 'text-teal-600 dark:text-teal-400' };
  return { bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' };
}

function RestDayCard({ onUndo }: { onUndo: () => void }) {
  return (
    <section
      className="rounded-xl border border-border bg-card p-6 space-y-3"
      data-testid="card-rest-day"
    >
      <div className="flex items-center gap-3">
        <BaxMascot
          expression="sleepy"
          pose="resting"
          size="md"
          showBubble={false}
          data-testid="bax-rest-day-mascot"
        />
        <div>
          <p className="text-xs font-mono font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Scheduled Recovery Day
          </p>
          <h2 className="font-display text-2xl font-bold text-foreground">
            Recovery day, on purpose.
          </h2>
        </div>
      </div>
      <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
        Your backlog queue stays intact and shifts forward smoothly so one breather day never turns into an overwhelming pile-up.
      </p>
      <div className="pt-2 flex flex-wrap gap-3">
        <Link
          href="/study"
          className="focus-ring inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-semibold text-white transition"
          data-testid="link-rest-day-light-review"
        >
          <BookOpenCheck size={15} /> Light Revision Session
        </Link>
        <button
          type="button"
          onClick={onUndo}
          className="focus-ring inline-flex items-center gap-2 rounded-lg border border-border bg-background hover:bg-muted px-4 py-2 text-xs font-semibold text-foreground transition"
          data-testid="button-undo-rest-day"
        >
          <RotateCcw size={14} /> Resume Today&apos;s Schedule
        </button>
      </div>
    </section>
  );
}

export function Dashboard() {
  const [, setLocation] = useLocation();
  const {
    user,
    loading: authLoading,
    hydratedUserId,
    syncStatus,
    plans,
    activePlan,
    setActivePlan,
    refreshPlans,
    syncDataNow,
  } = useAuth();
  const [planRefreshKey, setPlanRefreshKey] = useState(0);

  const plan = activePlan || readPlan(user?.uid);
  const {
    analytics,
    chapterMasteryByChapterId,
    reschedulePlanMissedDays,
  } = useEnginesWorkspace(plan);
  const isHydratingAuth = Boolean(
    user && !user.isGuest && (syncStatus === 'syncing' || hydratedUserId !== user.uid)
  );
  const [restDates, setRestDates] = useState(() => readRestDates(user?.uid));
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState<boolean>(() =>
    Boolean(user && !user.isGuest && !activePlan && !readPlan(user?.uid))
  );
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);

  // Notion-style workspace view tabs: Today's Study Plan vs Backlog Chapters Database
  const [workspaceView, setWorkspaceView] = useState<'today' | 'chapters'>('today');
  const [chapterSubjectFilter, setChapterSubjectFilter] = useState<string>('All');

  // Core state scoped to active user
  const [backlogItems, setBacklogItems] = useState<BacklogItem[]>(() => readBacklogItems(user?.uid));
  const [dailyPlan, setDailyPlan] = useState<SmartDailyPlan | null>(() => readSmartDailyPlan(user?.uid));
  const [revisions, setRevisions] = useState(() => readSpacedRevisions(user?.uid));
  const [isRecoveryMode, setIsRecoveryMode] = useState(() => readRecoveryModeActive(user?.uid));

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

  // Direct Supabase database sync on mount for authenticated students
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

  const [isPrereqMapOpen, setIsPrereqMapOpen] = useState(false);
  const [isMissedRecoveryOpen, setIsMissedRecoveryOpen] = useState(false);
  const [isPlanHistoryOpen, setIsPlanHistoryOpen] = useState(false);

  const [dailyHoursTarget, setDailyHoursTarget] = useState<number>(() => {
    return plan?.minutesPerDay ? Math.round((plan.minutesPerDay / 60) * 10) / 10 : 3.5;
  });

  useEffect(() => {
    if (plan?.minutesPerDay) {
      setDailyHoursTarget(Math.round((plan.minutesPerDay / 60) * 10) / 10);
    }
    setChapterSubjectFilter('All');
  }, [plan?.id, plan?.minutesPerDay]);

  const completedIdsArray = useMemo(() => readCompleted(user?.uid), [user?.uid, planRefreshKey]);
  const completed = useMemo(() => new Set(completedIdsArray), [completedIdsArray]);

  const scopedBacklogItems = useMemo(
    () => getScopedBacklogItemsForPlan(backlogItems, plan, completedIdsArray),
    [backlogItems, plan, completedIdsArray]
  );

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

  // Scoped metrics strictly matched to active plan's selected chapters
  const {
    remainingBacklogHours,
    pendingItemsCount,
    completedItemsCount,
    totalItemsCount,
    chapterProgressPercent,
    recoveryCompletedTasks,
    recoveryTotalTasks,
  } = useBacklogMetrics(user?.uid, plan);

  const handleToggleRestToday = () => {
    const nextRest = toggleRestDate(todayStr, user?.uid);
    setRestDates(nextRest);
    if (isSupabaseConfigured && user?.uid && !user.isGuest) {
      saveWorkspaceStateDirect({ restDates: nextRest }, user.uid).catch((err) =>
        console.warn('[Dashboard] restDates sync error:', err)
      );
    }
  };

  const handleUpdateDailyPlan = (newPlan: SmartDailyPlan) => {
    setDailyPlan(newPlan);
    saveSmartDailyPlan(newPlan, user?.uid);
    if (isSupabaseConfigured && user?.uid && !user.isGuest) {
      saveWorkspaceStateDirect({ dailyPlan: newPlan }, user.uid).catch((err) =>
        console.warn('[Dashboard] dailyPlan sync error:', err)
      );
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
      saveWorkspaceStateDirect({ dailyPlan: updatedPlan }, user.uid).catch((err) =>
        console.warn('[Dashboard] dailyPlan slot sync error:', err)
      );
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

  const handleCompleteRevision = (
    revisionId: string,
    confidence: 'strong' | 'shaky' | 'forgotten'
  ) => {
    const updated = completeSpacedRevision(revisionId, confidence, user?.uid);
    setRevisions(updated);
    if (isSupabaseConfigured && user?.uid && !user.isGuest) {
      saveWorkspaceStateDirect({ revisions: updated }, user.uid).catch((err) =>
        console.warn('[Dashboard] revisions sync error:', err)
      );
    }
    if (confidence === 'strong' || confidence === 'shaky') {
      triggerTaskCelebration();
    }
  };

  const handleToggleRecoveryMode = (active: boolean) => {
    setIsRecoveryMode(active);
    setRecoveryModeActive(active, user?.uid);
    if (isSupabaseConfigured && user?.uid && !user.isGuest) {
      saveWorkspaceStateDirect({ recoveryMode: active }, user.uid).catch((err) =>
        console.warn('[Dashboard] recoveryMode sync error:', err)
      );
    }
  };

  const missedRecoveryPlan = useMemo(() => {
    return computeMissedDayRecovery(4, dailyHoursTarget, 'Yesterday');
  }, [dailyHoursTarget]);

  const handleAcceptRecoveryPlan = (p: any) => {
    saveMissedDayRecovery(p, user?.uid);
    setDailyHoursTarget(p.newDailyHours);
    if (isSupabaseConfigured && user?.uid && !user.isGuest) {
      saveWorkspaceStateDirect({ missedRecovery: p }, user.uid).catch((err) =>
        console.warn('[Dashboard] missedRecovery sync error:', err)
      );
    }
    void reschedulePlanMissedDays();
  };

  // Inline Notion Chapter Table status updater (persists locally + Supabase cloud)
  const handleChangeChapterStatus = async (item: BacklogItem, nextStatus: BacklogStatus) => {
    const uid = user?.uid;
    const existingAll = readBacklogItems(uid);
    const existsInStore = existingAll.some((b) => b.id === item.id || b.chapterId === item.chapterId);

    const updatedItem: BacklogItem = {
      ...item,
      status: nextStatus,
      hoursSpent: nextStatus === 'completed' ? item.estimatedHours : item.hoursSpent,
      completedAt: nextStatus === 'completed' ? new Date().toISOString() : undefined,
    };

    if (existsInStore) {
      const targetStored = existingAll.find((b) => b.id === item.id || b.chapterId === item.chapterId);
      const nextList = updateBacklogItem(
        targetStored?.id || item.id,
        {
          status: nextStatus,
          hoursSpent: updatedItem.hoursSpent,
          completedAt: updatedItem.completedAt,
        },
        uid
      );
      setBacklogItems(nextList);
    } else {
      const nextList = [updatedItem, ...existingAll];
      saveBacklogItems(nextList, uid);
      setBacklogItems(nextList);
    }

    // Keep completedIds in sync accurately when toggling away from / to completed
    const currentCompleted = readCompleted(uid);
    const isNowDone = nextStatus === 'completed';
    const nextCompleted = isNowDone
      ? Array.from(new Set([...currentCompleted, item.chapterId]))
      : currentCompleted.filter((id) => id !== item.chapterId);
    saveCompleted(nextCompleted, uid, { skipProgression: true });
    setPlanRefreshKey((k) => k + 1);

    if (isNowDone) {
      triggerTaskCelebration();
    }

    if (isSupabaseConfigured && uid && !user?.isGuest) {
      if (existsInStore) {
        updateBacklogItemDirect(item.id, { status: nextStatus, hoursSpent: updatedItem.hoursSpent }, uid).catch((err) =>
          console.warn('[Dashboard] updateBacklogItemDirect error:', err)
        );
      } else {
        createBacklogItemDirect(updatedItem, uid).catch((err) =>
          console.warn('[Dashboard] createBacklogItemDirect error:', err)
        );
      }
      saveCompletedTaskDirect(item.chapterId, isNowDone, uid).catch((err) =>
        console.warn('[Dashboard] saveCompletedTaskDirect error:', err)
      );
    }
  };

  const dueRevs = useMemo(() => {
    return revisions
      .filter((r) => r.status === 'due' || r.status === 'overdue')
      .map((r) => ({ chapterId: r.chapterId, title: r.chapterTitle, subject: r.subject }));
  }, [revisions]);

  const completedChapterIds = useMemo(
    () =>
      scopedBacklogItems
        .filter((i) => i.status === 'completed' || completed.has(i.chapterId) || recoverySummary.fullyCompletedChapterIds.has(i.chapterId))
        .map((i) => i.chapterId),
    [scopedBacklogItems, completed, recoverySummary.fullyCompletedChapterIds]
  );

  const userName = user?.preferredName || (user?.displayName ? user.displayName.split(' ')[0] : 'Student');
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const [isManageSubjectsOpen, setIsManageSubjectsOpen] = useState(false);
  const educationProfile = useMemo(() => readEducationProfile(user?.uid), [isManageSubjectsOpen, user?.uid]);

  const estimatorResult = useMemo(() => {
    const rawList = scopedBacklogItems;
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
  }, [scopedBacklogItems, completed, recoverySummary, dailyHoursTarget, examDateStr]);

  const paceAnalysis = useMemo(
    () => calculateWillIFinish(scopedBacklogItems, sessions, dailyHoursTarget, examDateStr, plan, completedIdsArray),
    [scopedBacklogItems, sessions, dailyHoursTarget, examDateStr, plan, completedIdsArray]
  );

  const metrics = useMemo(
    () => calculateBacklogMetrics(scopedBacklogItems, dailyHoursTarget, plan, completedIdsArray),
    [scopedBacklogItems, dailyHoursTarget, plan, completedIdsArray]
  );

  const subjectBreakdownList = useMemo(() => {
    return Object.entries(metrics.subjectMetrics || {})
      .filter(([, m]) => m && m.chaptersTotal > 0)
      .map(([subject, m]) => ({
        subject,
        total: m.chaptersTotal,
        completed: m.chaptersCompleted,
        pending: m.chaptersPending,
        percent: m.chaptersTotal > 0 ? Math.round((m.chaptersCompleted / m.chaptersTotal) * 100) : 0,
        hoursLeft: Math.round(m.remaining * 10) / 10,
      }))
      .sort((a, b) => b.pending - a.pending || b.total - a.total);
  }, [metrics.subjectMetrics]);

  const primarySubjectPulse = useMemo(() => {
    if (subjectBreakdownList.length > 0) {
      return {
        subject: subjectBreakdownList[0].subject,
        pendingChapters: subjectBreakdownList[0].pending,
      };
    }
    const fallbackSubject = plan?.subjects?.[0] || 'Physics';
    return { subject: fallbackSubject, pendingChapters: pendingItemsCount };
  }, [subjectBreakdownList, plan?.subjects, pendingItemsCount]);

  const nextChapterTarget = useMemo(() => {
    const firstPending = scopedBacklogItems.find(
      (i) =>
        i.status !== 'completed' &&
        !completed.has(i.chapterId) &&
        !recoverySummary.fullyCompletedChapterIds.has(i.chapterId)
    );
    return firstPending || scopedBacklogItems[0] || null;
  }, [scopedBacklogItems, completed, recoverySummary.fullyCompletedChapterIds]);

  const filteredTableItems = useMemo(() => {
    if (chapterSubjectFilter === 'All') return scopedBacklogItems;
    return scopedBacklogItems.filter((i) => i.subject === chapterSubjectFilter);
  }, [scopedBacklogItems, chapterSubjectFilter]);

  const advisoryPrereqCount = useMemo(() => {
    if (!plan?.prerequisiteIds?.length) return 0;
    const selectedSet = new Set(plan.chapterIds || []);
    return plan.prerequisiteIds.filter((id: string) => !selectedSet.has(id)).length;
  }, [plan]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 space-y-6 animate-page-enter">
      {/* PW x Notion Student Command Workspace Header */}
      {plan && (
        <section className="rounded-xl border border-border bg-card overflow-hidden">
          {/* Top Notion Breadcrumb & Plan Switcher Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border bg-muted/25 px-5 py-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap font-mono">
              <span className="text-muted-foreground">Workspace</span>
              <span className="text-muted-foreground">/</span>
              <span className="font-semibold text-foreground">Dashboard</span>
              <span className="text-muted-foreground">·</span>
              {plans && plans.length > 1 ? (
                <select
                  value={activePlan?.id || plan?.id || ''}
                  onChange={(e) => setActivePlan(e.target.value)}
                  className="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-mono font-semibold text-foreground focus:outline-hidden"
                  aria-label="Switch active study plan"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name || 'Study Plan'} {p.isActive ? '★' : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  {plan.name || 'Primary Study Plan'}
                </span>
              )}
              <span className="text-muted-foreground tabular-nums">
                · {plan.days?.length || plan.planDuration || 7}-Day Sprint
              </span>
            </div>

            <div className="flex items-center gap-3 flex-wrap font-mono">
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
                className="inline-flex items-center gap-1 rounded-md border border-border bg-background hover:bg-muted px-2.5 py-1 text-xs font-semibold text-foreground transition"
              >
                <Plus size={12} />
                <span>New Plan</span>
              </Link>
            </div>
          </div>

          {/* Core Sprint Overview + Hero Backlog Count */}
          <div className="p-5 sm:p-6 space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
              <div className="space-y-2">
                <p className="text-xs font-mono text-muted-foreground">
                  {greeting}, {userName} · CBSE Class {educationProfile.grade || '11'}
                  {educationProfile.stream
                    ? ` ${String(educationProfile.stream).toUpperCase()}`
                    : ' PCM'}
                </p>

                <div className="flex items-baseline gap-3 flex-wrap">
                  <span
                    className="font-mono tabular-nums text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground"
                    data-testid="text-dashboard-remaining-hours"
                  >
                    {pendingItemsCount}
                  </span>
                  <span className="text-base font-semibold text-muted-foreground">
                    {pendingItemsCount === 1 ? 'chapter left to finish' : 'chapters left to finish'}
                  </span>
                  <span
                    className={`text-xs font-mono font-bold ${
                      pendingItemsCount === 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : pendingItemsCount > 12
                        ? 'text-rose-600 dark:text-rose-400'
                        : pendingItemsCount > 5
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {pendingItemsCount === 0
                      ? 'Backlog Cleared'
                      : pendingItemsCount > 12
                      ? 'Heavy backlog'
                      : pendingItemsCount > 5
                      ? 'Active recovery'
                      : 'On track'}
                  </span>
                </div>

                {/* Progress Bar + Exact Selected Chapter Summary */}
                <div className="max-w-lg space-y-1.5">
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 dark:bg-indigo-500 progress-bar-smooth"
                      style={{
                        width: `${totalItemsCount > 0 ? chapterProgressPercent : estimatorResult.progressPercent}%`,
                      }}
                    />
                  </div>
                  <div className="text-xs font-mono text-muted-foreground flex flex-wrap items-center gap-2 tabular-nums">
                    <span>
                      {completedItemsCount} of {totalItemsCount} selected {totalItemsCount === 1 ? 'chapter' : 'chapters'} finished
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      {totalItemsCount > 0 ? chapterProgressPercent : estimatorResult.progressPercent}% cleared
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{Math.round(remainingBacklogHours * 10) / 10}h study load left</span>
                    {recoveryTotalTasks > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <Link
                          href="/roadmap"
                          className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                          data-testid="text-dashboard-recovery-deducted"
                        >
                          Route: {recoveryCompletedTasks}/{recoveryTotalTasks} tasks
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons: High-clarity Primary CTA + Secondary Tools */}
              <div className="flex flex-wrap items-center gap-2 font-mono text-xs shrink-0">
                <Link
                  href="/roadmap"
                  className="rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 transition flex items-center gap-1.5 font-bold shadow-xs btn-press whitespace-nowrap shrink-0"
                  data-testid="link-dashboard-syllabus-map"
                >
                  <CalendarDays size={13} />
                  <span>Recovery Route ({plan.planDuration || plan.days?.length || 7}D)</span>
                </Link>

                <Link
                  href={nextChapterTarget ? `/study?chapter=${nextChapterTarget.chapterId}` : '/study'}
                  className="rounded-lg border border-indigo-500/35 bg-indigo-500/10 px-3.5 py-2.5 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20 transition flex items-center gap-1.5 font-semibold btn-press whitespace-nowrap shrink-0"
                >
                  <Play size={13} className="fill-current" />
                  <span>Learn &amp; Test</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setIsMissedRecoveryOpen(true)}
                  className="rounded-lg border border-border bg-background px-3 py-2.5 text-foreground hover:bg-muted transition flex items-center gap-1.5 font-medium btn-press whitespace-nowrap shrink-0"
                  data-testid="button-dashboard-missed-recovery"
                >
                  <RotateCcw size={13} className="text-muted-foreground" />
                  <span>Missed a Day?</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsManageSubjectsOpen(true)}
                  className="rounded-lg border border-border bg-background px-3 py-2.5 text-foreground hover:bg-muted transition flex items-center gap-1.5 btn-press whitespace-nowrap shrink-0"
                  data-testid="button-dashboard-manage-subjects"
                >
                  <Settings size={13} className="text-muted-foreground" />
                  <span>Subjects</span>
                </button>
              </div>
            </div>

            {/* Strictly Separated Engine Metrics: Clearance vs Mastery vs Retention */}
            <div
              className="grid grid-cols-2 lg:grid-cols-4 gap-3 border-t border-border pt-4"
              data-testid="grid-dashboard-separated-metrics"
            >
              <div className="rounded-lg border border-border bg-muted/20 px-3.5 py-2.5">
                <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  <span>Backlog Clearance</span>
                  <CheckSquare size={12} className="text-sky-500" />
                </div>
                <p className="mt-1 font-mono text-xl font-bold text-foreground tabular-nums">
                  {analytics.backlogClearancePercent}%
                </p>
                <p className="text-[11px] font-mono text-muted-foreground tabular-nums">
                  {analytics.completedObjectivesCount}/{analytics.totalObjectivesCount} studied objectives
                </p>
              </div>

              <div className="rounded-lg border border-border bg-muted/20 px-3.5 py-2.5">
                <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  <span>Concept Mastery</span>
                  <ShieldCheck size={12} className="text-emerald-500" />
                </div>
                <p className="mt-1 font-mono text-xl font-bold text-foreground tabular-nums">
                  {analytics.conceptMasteryPercent}%
                </p>
                <p className="text-[11px] font-mono text-muted-foreground tabular-nums">
                  {analytics.verifiedObjectivesCount} verified · {analytics.masteredChaptersCount}/{analytics.totalBacklogChapters} mastered
                </p>
              </div>

              <Link
                href="/revision"
                className="rounded-lg border border-border bg-muted/20 hover:bg-muted/40 px-3.5 py-2.5 transition"
              >
                <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  <span>Retention Health</span>
                  <RotateCcw size={12} className="text-amber-500" />
                </div>
                <p className="mt-1 font-mono text-xl font-bold text-foreground tabular-nums">
                  {analytics.retentionHealthPercent}%
                </p>
                <p className="text-[11px] font-mono text-muted-foreground tabular-nums">
                  {analytics.pendingRevisionsCount} pending {analytics.pendingRevisionsCount === 1 ? 'revision' : 'revisions'}
                </p>
              </Link>

              <Link
                href="/analytics"
                className="rounded-lg border border-border bg-muted/20 hover:bg-muted/40 px-3.5 py-2.5 transition"
              >
                <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  <span>Weak Concepts</span>
                  <BrainCircuit size={12} className="text-rose-500" />
                </div>
                <p className="mt-1 font-mono text-xl font-bold text-foreground tabular-nums">
                  {analytics.weakConcepts.length}
                </p>
                <p className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400">
                  Open Analytics →
                </p>
              </Link>
            </div>

            {/* PW-Style Subject-Wise Backlog Breakdown Strip (Flat grid inside hairline dividers) */}
            {subjectBreakdownList.length > 0 && (
              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                    Subject Backlog Progress
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setChapterSubjectFilter('All');
                      setWorkspaceView('chapters');
                    }}
                    className="text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    Manage all {totalItemsCount} chapters →
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {subjectBreakdownList.map((item) => {
                    const colors = getSubjectBarColor(item.subject);
                    return (
                      <button
                        key={item.subject}
                        type="button"
                        onClick={() => {
                          setChapterSubjectFilter(item.subject);
                          setWorkspaceView('chapters');
                        }}
                        className="group text-left py-1.5 px-2 -mx-2 rounded-lg hover:bg-muted/40 transition cursor-pointer"
                      >
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className={`font-semibold ${colors.text}`}>{item.subject}</span>
                          <span className="font-mono tabular-nums text-[11px] text-muted-foreground">
                            <strong className="text-foreground">{item.pending}</strong>/{item.total} left
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full ${colors.bar} progress-bar-smooth`}
                            style={{ width: `${item.percent}%` }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quiet Unboxed Runway Metadata Strip */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border pt-3 text-xs font-mono text-muted-foreground tabular-nums">
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
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <Flame size={12} className="text-amber-500" />
                Streak: <strong className="text-foreground">{streak}d</strong>
              </span>
            </div>
          </div>
        </section>
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

      {/* WORKSPACE MAIN STAGE */}
      <section className="space-y-4" aria-labelledby="heading-todays-focus">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-2.5">
          <div className="flex items-center gap-4">
            <h1 id="heading-todays-focus" className="text-sm font-semibold tracking-tight text-foreground sr-only">
              Dashboard Study Workspace
            </h1>

            {plan ? (
              <div className="flex items-center gap-1" role="tablist" aria-label="Workspace view switcher">
                <button
                  type="button"
                  role="tab"
                  aria-selected={workspaceView === 'today'}
                  onClick={() => setWorkspaceView('today')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                    workspaceView === 'today'
                      ? 'bg-indigo-600/12 text-indigo-700 dark:text-indigo-300'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <ListChecks size={14} />
                  <span>Today&apos;s Study Plan</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={workspaceView === 'chapters'}
                  onClick={() => setWorkspaceView('chapters')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition cursor-pointer tabular-nums ${
                    workspaceView === 'chapters'
                      ? 'bg-indigo-600/12 text-indigo-700 dark:text-indigo-300'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <TableIcon size={14} />
                  <span>Backlog Chapters ({totalItemsCount})</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <BookOpenCheck size={16} className="text-foreground" />
                <span className="text-sm font-semibold text-foreground">Today&apos;s Focus</span>
              </div>
            )}
          </div>

          {!plan && (
            <Link
              href="/onboarding?reset=true"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
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
            <Loader2 size={20} className="mx-auto animate-spin text-indigo-500" />
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
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 text-white px-4 py-2 text-xs font-semibold hover:bg-indigo-500 transition"
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
            <p className="text-sm font-semibold text-foreground">
              Nothing scheduled yet — build your backlog recovery plan
            </p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Pick the exact chapters in your backlog and set your daily hours to generate your personalized study plan.
            </p>
            <div className="pt-1">
              <Link
                href="/onboarding?reset=true"
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2 text-xs transition"
              >
                <span>Create Your Recovery Plan</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_310px] lg:items-start">
            <div className="space-y-5 min-w-0">
              {workspaceView === 'today' ? (
                <>
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

                  {dueRevs.length > 0 && (
                    <SpacedRevisionCard
                      revisions={revisions}
                      onCompleteRevision={handleCompleteRevision}
                    />
                  )}

                  {!todayIsRest && (
                    <button
                      type="button"
                      onClick={handleToggleRestToday}
                      className="focus-ring inline-flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-foreground cursor-pointer"
                      data-testid="button-take-rest-day"
                    >
                      <RotateCcw size={13} />
                      <span>Need a deliberate rest day? Shift today&apos;s schedule forward without penalty.</span>
                    </button>
                  )}
                </>
              ) : (
                /* Notion-Style Database Table View of Exact Selected Backlog Chapters */
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/25 px-4 py-3">
                    <div className="flex items-center gap-1.5 overflow-x-auto">
                      {['All', ...subjectBreakdownList.map((s) => s.subject)].map((sub) => (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => setChapterSubjectFilter(sub)}
                          className={`rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                            chapterSubjectFilter === sub
                              ? 'bg-foreground text-background font-semibold'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          }`}
                        >
                          {sub}
                        </button>
                      ))}
                    </div>

                    <span className="font-mono tabular-nums text-[11px] text-muted-foreground">
                      Showing {filteredTableItems.length} of {totalItemsCount} selected
                    </span>
                  </div>

                  {filteredTableItems.length === 0 ? (
                    <div className="py-10 px-4 text-center text-xs text-muted-foreground">
                      No chapters match this subject filter.
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {filteredTableItems.map((item, idx) => {
                        const isDone =
                          item.status === 'completed' ||
                          completed.has(item.chapterId) ||
                          recoverySummary.fullyCompletedChapterIds.has(item.chapterId);
                        const resolvedStatus: BacklogStatus = isDone ? 'completed' : item.status;
                        const subColors = getSubjectBarColor(item.subject);
                        const masteryRec = chapterMasteryByChapterId.get(item.chapterId);
                        const masteryStatus = masteryRec?.status || (isDone ? 'STUDY_COMPLETE' : 'NOT_STARTED');

                        return (
                          <div
                            key={item.chapterId || item.id}
                            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 text-xs transition ${
                              isDone ? 'bg-muted/15 opacity-90' : 'hover:bg-muted/20'
                            }`}
                          >
                            <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={() =>
                                  handleChangeChapterStatus(
                                    item,
                                    isDone ? 'not_started' : 'completed'
                                  )
                                }
                                className="mt-0.5 sm:mt-0 text-muted-foreground hover:text-indigo-600 transition shrink-0 cursor-pointer"
                                aria-label={isDone ? 'Mark chapter incomplete' : 'Mark chapter complete'}
                              >
                                {isDone ? (
                                  <CheckCircle2 size={17} className="text-emerald-600 dark:text-emerald-400" />
                                ) : (
                                  <span className="inline-flex h-4 w-4 items-center justify-center rounded border border-border font-mono text-[10px]">
                                    {idx + 1}
                                  </span>
                                )}
                              </button>

                              <div className="min-w-0 flex-1">
                                <p
                                  className={`font-semibold text-sm truncate ${
                                    isDone ? 'line-through text-muted-foreground' : 'text-foreground'
                                  }`}
                                >
                                  {item.topic}
                                </p>
                                <div className="font-mono tabular-nums text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
                                  <span className={`font-semibold ${subColors.text}`}>
                                    {item.subject}
                                  </span>
                                  <span>·</span>
                                  <span>{item.estimatedHours || 5}h est.</span>
                                  <span>·</span>
                                  <span className="capitalize">{item.difficulty || 'medium'}</span>
                                  <span>·</span>
                                  <span
                                    className={`font-semibold ${
                                      masteryStatus === 'MASTERED'
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : masteryStatus === 'NEEDS_REVISION'
                                        ? 'text-rose-600 dark:text-rose-400'
                                        : masteryStatus === 'STUDY_COMPLETE'
                                        ? 'text-amber-600 dark:text-amber-400'
                                        : 'text-muted-foreground'
                                    }`}
                                  >
                                    {masteryStatus.replaceAll('_', ' ')}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                              <select
                                value={resolvedStatus}
                                onChange={(e) =>
                                  handleChangeChapterStatus(item, e.target.value as BacklogStatus)
                                }
                                className="rounded-md border border-border bg-background px-2 py-1 text-xs font-mono text-foreground focus:outline-hidden"
                                aria-label={`Status for ${item.topic}`}
                              >
                                {Object.entries(STATUS_LABELS).map(([val, label]) => (
                                  <option key={val} value={val}>
                                    {label}
                                  </option>
                                ))}
                              </select>

                              <Link
                                href={`/study?chapter=${item.chapterId}`}
                                className="inline-flex items-center gap-1 rounded-md border border-indigo-600/30 bg-indigo-600/10 hover:bg-indigo-600 hover:text-white text-indigo-700 dark:text-indigo-300 px-2.5 py-1 text-xs font-mono font-semibold transition whitespace-nowrap"
                              >
                                <span>Study</span>
                                <Play size={10} className="fill-current" />
                              </Link>

                              <Link
                                href={`/study?chapter=${item.chapterId}&tab=verify`}
                                className="inline-flex items-center gap-1 rounded-md border border-emerald-600/30 bg-emerald-600/10 hover:bg-emerald-600 hover:text-white text-emerald-700 dark:text-emerald-300 px-2.5 py-1 text-xs font-mono font-semibold transition whitespace-nowrap"
                              >
                                <span>Verify</span>
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {advisoryPrereqCount > 0 && (
                    <div className="border-t border-border bg-muted/20 px-4 py-2.5 flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        +{advisoryPrereqCount} recommended prerequisite {advisoryPrereqCount === 1 ? 'foundation' : 'foundations'} available (kept separate from your {totalItemsCount} backlog {totalItemsCount === 1 ? 'chapter' : 'chapters'}).
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsPrereqMapOpen(true)}
                        className="font-mono font-semibold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 ml-2 cursor-pointer"
                      >
                        View Map
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Sidebar: Study Launchpad & Recent Study Blocks */}
            <aside className="space-y-5">
              <section
                className="rounded-xl border border-border bg-card p-4 space-y-3 font-mono text-xs"
                data-testid="card-quick-actions"
              >
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold block">
                  Study Launchpad
                </span>

                <div className="grid gap-2">
                  <Link
                    href={nextChapterTarget ? `/study?chapter=${nextChapterTarget.chapterId}` : '/study'}
                    className="focus-ring flex items-center justify-between rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2.5 text-xs font-bold transition shadow-xs"
                    data-testid="link-quick-study"
                  >
                    <span>Open Learn &amp; Test</span>
                    <Play size={13} className="fill-current" />
                  </Link>

                  <Link
                    href="/roadmap"
                    className="flex items-center justify-between rounded-lg border border-border bg-background hover:bg-muted px-3 py-2 text-xs text-foreground font-medium transition"
                  >
                    <span>Recovery Route Roadmap</span>
                    <Compass size={13} className="text-emerald-500" />
                  </Link>

                  <Link
                    href="/revision"
                    className="flex items-center justify-between rounded-lg border border-border bg-background hover:bg-muted px-3 py-2 text-xs text-foreground font-medium transition tabular-nums"
                  >
                    <span>
                      Spaced Revision
                      {analytics.pendingRevisionsCount > 0
                        ? ` (${analytics.pendingRevisionsCount} due)`
                        : ''}
                    </span>
                    <RotateCcw size={13} className="text-amber-500" />
                  </Link>

                  <Link
                    href="/analytics"
                    className="flex items-center justify-between rounded-lg border border-border bg-background hover:bg-muted px-3 py-2 text-xs text-foreground font-medium transition"
                  >
                    <span>Analytics &amp; Weak Concepts</span>
                    <BarChart3 size={13} className="text-violet-500" />
                  </Link>

                  <Link
                    href="/plans"
                    className="flex items-center justify-between rounded-lg border border-border bg-background hover:bg-muted px-3 py-2 text-xs text-foreground font-medium transition"
                  >
                    <span>Manage Study Plans</span>
                    <Layers size={13} className="text-muted-foreground" />
                  </Link>

                  <button
                    type="button"
                    onClick={() => setIsPrereqMapOpen(true)}
                    className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground hover:bg-muted text-left transition cursor-pointer"
                  >
                    <span>Prerequisite Dependency Map</span>
                    <GitFork size={13} className="text-muted-foreground" />
                  </button>
                </div>

                {/* Single Clean Exam Pace Insight */}
                <div className="border-t border-border pt-3 font-sans text-xs space-y-1">
                  <p className="text-foreground font-semibold leading-snug">
                    {primarySubjectPulse.subject}:{' '}
                    <span className="font-mono tabular-nums">
                      {primarySubjectPulse.pendingChapters}{' '}
                      {primarySubjectPulse.pendingChapters === 1 ? 'chapter' : 'chapters'}
                    </span>{' '}
                    pending
                  </p>
                  <p className="text-[11px] font-mono text-muted-foreground tabular-nums">
                    {paceAnalysis.isOnTrack
                      ? `On track · ${paceAnalysis.bufferDays ?? 12}d buffer before exam`
                      : `Target pace: ${paceAnalysis.requiredChaptersPerWeek} ch/week`}
                  </p>
                </div>
              </section>

              <BaxContextualSlot
                slot="dashboard"
                size="md"
                expression={
                  todayIsRest
                    ? 'sleepy'
                    : pendingItemsCount === 0
                    ? 'celebrating'
                    : !paceAnalysis.isOnTrack
                    ? 'determined'
                    : 'happy'
                }
                pose={
                  todayIsRest
                    ? 'resting'
                    : pendingItemsCount === 0
                    ? 'cheering'
                    : 'pointing'
                }
                message={
                  todayIsRest
                    ? 'Taking a breather day keeps burnout away. Resume whenever ready.'
                    : pendingItemsCount === 0
                    ? 'Every selected chapter is cleared! Head to Revision to lock your mastery.'
                    : !paceAnalysis.isOnTrack
                    ? `Focus on one block right now—${primarySubjectPulse.subject} has ${primarySubjectPulse.pendingChapters} chapters pending.`
                    : 'Your study hub is on track. Clear today’s queue block by block.'
                }
                className="w-full"
              />

              {/* Recent Focus Sessions */}
              <section
                className="rounded-xl border border-border bg-card p-4 space-y-2.5 font-mono text-xs"
                data-testid="card-recent-sessions"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                    Recent Study Blocks
                  </span>
                  <TimerReset size={13} className="text-muted-foreground" />
                </div>

                {sessions.slice(0, 4).length > 0 ? (
                  <div className="space-y-2 divide-y divide-border/50">
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
                  <p className="text-[11px] text-muted-foreground font-sans leading-relaxed">
                    No focus blocks logged yet. Start one 25-minute block in the Focus Room to build momentum.
                  </p>
                )}
              </section>
            </aside>
          </div>
        )}
      </section>

      {/* Quiet Community Footer */}
      <div className="border-t border-border pt-6 pb-2">
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
