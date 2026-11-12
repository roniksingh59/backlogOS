import { useState, useMemo, useEffect } from 'react';
import {
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  Play,
  RotateCcw,
  TimerReset,
  GitFork,
  BarChart3,
  Layers,
  BookOpen,
  Settings,
  Plus,
  Compass,
  Clock3,
  Target,
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/lib/auth-context';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useBacklogMetrics } from '@/hooks/use-backlog-metrics';
import { CommunityImpactBanner } from '@/components/CommunityImpactBanner';
import { chapters, type PlanDay, type StudentPlan } from '@/lib/backlog-data';
import { computeBacklogEstimates } from '@/lib/backlog-estimator';
import {
  loadActiveStudyPlanDirect,
  loadBacklogItemsDirect,
  loadCompletedTasksDirect,
  createBacklogItemDirect,
  updateBacklogItemDirect,
  deleteBacklogItemDirect,
} from '@/lib/supabase-service';

import {
  readCompleted,
  readPlan,
  readRestDates,
  readStudySessions,
  toggleRestDate,
  readBacklogItems,
  saveBacklogItems,
  addBacklogItem,
  updateBacklogItem,
  deleteBacklogItem,
  readSmartDailyPlan,
  saveSmartDailyPlan,
  readSpacedRevisions,
  completeSpacedRevision,
  readMissedDayRecovery,
  saveMissedDayRecovery,
  readRecoveryModeActive,
  setRecoveryModeActive,
  savePlan,
  saveCompleted,
  type StudySession,
} from '@/lib/storage';
import { type BacklogItem, calculateBacklogMetrics } from '@/lib/backlog-items';
import {
  type SmartDailyPlan,
  computeMissedDayRecovery,
  calculateWillIFinish,
} from '@/lib/smart-planner';
import { StudyHeatmap } from '@/components/StudyHeatmap';
import { WillIFinishCalculator } from '@/components/WillIFinishCalculator';
import { SmartBacklogManager } from '@/components/SmartBacklogManager';
import { DailyPlanCard } from '@/components/DailyPlanCard';
import { BacklogRecoveryMode } from '@/components/BacklogRecoveryMode';
import { SpacedRevisionCard } from '@/components/SpacedRevisionCard';
import { PrerequisiteMapModal } from '@/components/PrerequisiteMapModal';
import { MissedDayRecoveryModal } from '@/components/MissedDayRecoveryModal';
import { ProgressAnalyticsCard } from '@/components/ProgressAnalyticsCard';
import { BacklogReductionVisualizer } from '@/components/BacklogReductionVisualizer';
import { AcademicProgressionStrip } from '@/components/AcademicProgressionStrip';
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

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
      <div
        className="h-full bg-primary transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

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
  const { user, plans, activePlan, setActivePlan, syncStatus } = useAuth();
  const [planRefreshKey, setPlanRefreshKey] = useState(0);

  const plan = activePlan || readPlan(user?.uid);
  const [restDates, setRestDates] = useState(() => readRestDates(user?.uid));

  // BacklogOS Core State scoped to user
  const [backlogItems, setBacklogItems] = useState<BacklogItem[]>(() => readBacklogItems(user?.uid));
  const [dailyPlan, setDailyPlan] = useState<SmartDailyPlan | null>(() => readSmartDailyPlan(user?.uid));
  const [revisions, setRevisions] = useState(() => readSpacedRevisions(user?.uid));
  const [isRecoveryMode, setIsRecoveryMode] = useState(() => readRecoveryModeActive(user?.uid));

  // Refresh upon plan changes or account sync
  useEffect(() => {
    const handleUpdate = () => {
      setPlanRefreshKey((k) => k + 1);
      setBacklogItems(readBacklogItems(user?.uid));
      setDailyPlan(readSmartDailyPlan(user?.uid));
      setRevisions(readSpacedRevisions(user?.uid));
    };
    window.addEventListener('backlogos-plan-updated', handleUpdate);
    return () => window.removeEventListener('backlogos-plan-updated', handleUpdate);
  }, [user?.uid]);

  // Direct Supabase database sync on mount for authenticated students
  useEffect(() => {
    if (!user?.uid || user.isGuest) return;
    let isCancelled = false;

    async function loadDirectData() {
      try {
        const [directPlan, directItems, directCompleted] = await Promise.all([
          loadActiveStudyPlanDirect(user?.uid),
          loadBacklogItemsDirect(user?.uid),
          loadCompletedTasksDirect(user?.uid),
        ]);

        if (isCancelled) return;

        if (directPlan) {
          savePlan(directPlan, user.uid);
        }
        if (directItems && directItems.length > 0) {
          setBacklogItems(directItems);
          saveBacklogItems(directItems, user.uid);
        }
        if (directCompleted && directCompleted.length > 0) {
          saveCompleted(directCompleted, user.uid);
        }
        setPlanRefreshKey((k) => k + 1);
      } catch (err) {
        console.warn('[Dashboard] Direct Supabase load notice:', err);
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
  const [activeTab, setActiveTab] = useState<'overview' | 'backlog' | 'daily' | 'analytics'>('overview');

  // Daily target hours
  const [dailyHoursTarget, setDailyHoursTarget] = useState<number>(() => {
    return plan?.minutesPerDay ? Math.round((plan.minutesPerDay / 60) * 10) / 10 : 3.5;
  });

  const completed = useMemo(() => new Set(readCompleted(user?.uid)), [user?.uid, planRefreshKey]);
  const sessions = useMemo(() => readStudySessions(user?.uid), [user?.uid, planRefreshKey]);

  const streak = getStreak(sessions);

  const weekAgo = Date.now() - 7 * 86400000;
  const weeklyMinutes = (sessions || [])
    .filter((session) => {
      if (!session?.completedAt) return false;
      const t = new Date(session.completedAt).getTime();
      return !Number.isNaN(t) && t >= weekAgo;
    })
    .reduce((sum, session) => sum + (Number(session.minutes) || 0), 0);

  const examDateStr = plan?.examDate;
  const examDate = examDateStr ? new Date(`${examDateStr}T12:00:00`) : null;
  const daysToExam =
    examDate && !Number.isNaN(examDate.getTime())
      ? Math.ceil((examDate.getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000)
      : null;

  const todayStr = dayKey(new Date());
  const todayIsRest = restDates.includes(todayStr);

  // Requirement 2: Dedicated calculation hook aggregating from Supabase/state
  const {
    remainingBacklogHours,
    totalBacklogHours,
    completedBacklogHours,
    pendingItemsCount,
    totalItemsCount,
    loading: isMetricsLoading,
    refresh: refreshBacklogMetrics,
  } = useBacklogMetrics(user?.uid);

  // Handlers for Backlog Items with instant optimistic update + Supabase sync
  const handleAddItem = async (item: BacklogItem) => {
    const updated = addBacklogItem(item, user?.uid);
    setBacklogItems(updated);
    window.dispatchEvent(new CustomEvent('backlogos-backlog-updated'));

    if (isSupabaseConfigured && user?.uid && !user.isGuest) {
      await createBacklogItemDirect(item, user.uid);
    }
  };

  const handleUpdateItem = async (id: string, updates: Partial<BacklogItem>) => {
    const updated = updateBacklogItem(id, updates, user?.uid);
    setBacklogItems(updated);
    setRevisions(readSpacedRevisions(user?.uid));
    window.dispatchEvent(new CustomEvent('backlogos-backlog-updated'));

    if (isSupabaseConfigured && user?.uid && !user.isGuest) {
      await updateBacklogItemDirect(id, updates, user.uid);
    }
  };

  const handleDeleteItem = async (id: string) => {
    const updated = deleteBacklogItem(id, user?.uid);
    setBacklogItems(updated);
    window.dispatchEvent(new CustomEvent('backlogos-backlog-updated'));

    if (isSupabaseConfigured && user?.uid && !user.isGuest) {
      await deleteBacklogItemDirect(id, user.uid);
    }
  };


  // Handlers for Daily Plan
  const handleUpdateDailyPlan = (newPlan: SmartDailyPlan) => {
    setDailyPlan(newPlan);
    saveSmartDailyPlan(newPlan);
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
    saveSmartDailyPlan(updatedPlan);
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
    const updated = completeSpacedRevision(revisionId, confidence);
    setRevisions(updated);
    if (confidence === 'strong' || confidence === 'shaky') {
      triggerTaskCelebration();
    }
  };

  // Handlers for Recovery Mode
  const handleToggleRecoveryMode = (active: boolean) => {
    setIsRecoveryMode(active);
    setRecoveryModeActive(active);
  };

  // Handlers for Missed-Day Recovery
  const missedRecoveryPlan = useMemo(() => {
    return computeMissedDayRecovery(4, dailyHoursTarget, 'Yesterday');
  }, [dailyHoursTarget]);

  const handleAcceptRecoveryPlan = (p: any) => {
    saveMissedDayRecovery(p);
    setDailyHoursTarget(p.newDailyHours);
  };

  const dueRevs = useMemo(() => {
    return revisions
      .filter((r) => r.status === 'due' || r.status === 'overdue')
      .map((r) => ({ chapterId: r.chapterId, title: r.chapterTitle, subject: r.subject }));
  }, [revisions]);

  const completedChapterIds = useMemo(
    () => backlogItems.filter((i) => i.status === 'completed').map((i) => i.chapterId),
    [backlogItems]
  );

  const userName = user?.preferredName || (user?.displayName ? user.displayName.split(' ')[0] : 'Student');
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const [isManageSubjectsOpen, setIsManageSubjectsOpen] = useState(false);
  const educationProfile = useMemo(() => readEducationProfile(user?.uid), [isManageSubjectsOpen, user?.uid]);

  // Unified Intelligent Backlog Estimator calculation
  const estimatorResult = useMemo(() => {
    const rawList = backlogItems.length > 0 ? backlogItems : (plan?.chapterIds || []).map((chId: string) => ({
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

    const chapterInputs = rawList.map((item) => ({
      id: item.chapterId || item.id,
      title: item.topic || 'Chapter',
      subject: item.subject || 'Science',
      estimatedHours: item.estimatedHours || 5,
      difficulty: item.difficulty || 'medium',
      status: item.status || 'not_started',
      isCompleted: item.status === 'completed' || completed.has(item.chapterId || item.id),
    }));

    return computeBacklogEstimates(chapterInputs, {
      dailyTargetHours: dailyHoursTarget,
      targetExamDate: examDateStr,
      completedChapterIds: Array.from(completed),
    });
  }, [backlogItems, plan, completed, dailyHoursTarget, examDateStr]);

  const paceAnalysis = useMemo(
    () => calculateWillIFinish(backlogItems, sessions, dailyHoursTarget, examDateStr),
    [backlogItems, sessions, dailyHoursTarget, examDateStr]
  );

  const metrics = useMemo(
    () => calculateBacklogMetrics(backlogItems, dailyHoursTarget),
    [backlogItems, dailyHoursTarget]
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 space-y-6 animate-page-enter">
      {/* Empty State Banner for students without a plan */}
      {!plan && (
        <div className="border border-sky-400/40 bg-sky-500/10 rounded-xl p-6 text-center space-y-3" data-testid="banner-no-plan">
          <div className="inline-flex p-3 rounded-full bg-sky-500/20 text-sky-500">
            <BookOpenCheck size={28} />
          </div>
          <h2 className="text-xl font-bold font-display">Ready to clear your academic backlog?</h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            You haven&apos;t set up a study plan yet. Pick your CBSE subjects and target chapters to calculate your exact recovery timeline.
          </p>
          <div className="pt-2">
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground font-bold px-5 py-2.5 text-sm shadow-md hover:opacity-90 transition"
              data-testid="button-create-first-plan"
            >
              <span>Create Your Recovery Plan</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      )}

      {/* Multiple Study Plans Switcher Bar */}
      {plan && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3 sm:px-4 rounded-lg border border-border shadow-2xs font-mono text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <Layers size={15} className="text-primary shrink-0" />
            <span className="font-bold text-foreground">Active Plan:</span>
            {plans && plans.length > 1 ? (
              <select
                value={activePlan?.id || plan?.id || ''}
                onChange={(e) => setActivePlan(e.target.value)}
                className="rounded border border-border bg-background px-2.5 py-1 text-xs font-mono font-semibold text-foreground focus:outline-hidden"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name || 'Study Plan'} {p.isActive ? '★ (Active)' : ''}
                  </option>
                ))}
              </select>
            ) : (
              <span className="font-bold text-primary px-2 py-0.5 rounded bg-primary/10">
                {plan.name || 'Primary Study Plan'}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground hidden md:inline">
              · {plan.days?.length || plan.planDuration || 7}-Day Schedule
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/onboarding?reset=true"
              className="inline-flex items-center gap-1.5 rounded border border-primary/40 bg-primary/10 hover:bg-primary/20 px-3 py-1 text-xs font-mono font-bold text-primary transition-all active:scale-95 shadow-2xs"
            >
              <Plus size={13} />
              <span>+ New Study Plan</span>
            </Link>
          </div>
        </div>
      )}

      {/* Top Academic Command Header */}
      <div className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/80 pb-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              <img src="/brand/mark-transparent.svg" alt="BacklogOS" className="h-3.5 w-3.5 object-contain" />
              <span>
                CBSE Class {educationProfile.grade || '11'}
                {educationProfile.stream !== 'none' ? ` · ${String(educationProfile.stream || 'pcm').toUpperCase()}` : ''} · {educationProfile.academicSession || '2026-27'}
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1">
              {greeting}, {userName}
            </h1>
          </div>

          {/* Colorful, Uncluttered Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            {plan && (
              <Link
                href="/roadmap"
                className="rounded-lg border border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 px-3 py-1.5 transition flex items-center gap-1.5 font-semibold btn-press"
                data-testid="link-dashboard-syllabus-map"
              >
                <CalendarDays size={13} className="text-emerald-500" />
                <span>Recovery Route ({plan.planDuration || plan.days?.length || 7}D)</span>
              </Link>
            )}

            <button
              type="button"
              onClick={() => setIsMissedRecoveryOpen(true)}
              className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-1.5 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition flex items-center gap-1.5 font-semibold btn-press"
              data-testid="button-dashboard-missed-recovery"
            >
              <RotateCcw size={13} className="text-amber-500" />
              <span>Missed a Day?</span>
            </button>

            <button
              type="button"
              onClick={() => setIsManageSubjectsOpen(true)}
              className="rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-foreground hover:bg-muted transition flex items-center gap-1.5 btn-press"
              data-testid="button-dashboard-manage-subjects"
            >
              <Settings size={13} className="text-muted-foreground" />
              <span>Subjects</span>
            </button>
          </div>
        </div>

        {/* Clean Remaining Load & Runway Strip */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-center">
          <div className="lg:col-span-2 space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block">
              Remaining Backlog Load
            </span>
            <div className="flex items-baseline gap-2.5">
              <span className="font-mono tabular-nums text-3xl sm:text-5xl font-bold tracking-tight text-foreground">
                {remainingBacklogHours}h
              </span>
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-mono font-bold ${
                  remainingBacklogHours > 40
                    ? 'text-rose-600 dark:text-rose-400'
                    : remainingBacklogHours > 15
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    remainingBacklogHours > 40
                      ? 'bg-rose-500'
                      : remainingBacklogHours > 15
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                />
                {remainingBacklogHours > 40 ? 'CRITICAL' : remainingBacklogHours > 15 ? 'DEMANDING' : 'ON TRACK'} PACE
              </span>
            </div>
            <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-2 tabular-nums">
              <span>
                {pendingItemsCount} of {totalItemsCount || estimatorResult.totalChapters} chapters left
              </span>
              <span>·</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                {totalBacklogHours > 0
                  ? Math.round((completedBacklogHours / totalBacklogHours) * 100)
                  : estimatorResult.progressPercent}
                % cleared
              </span>
            </div>
          </div>

          {/* 4 Colorful Runway Tiles */}
          <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
              <span className="text-emerald-700 dark:text-emerald-300 text-[10px] block uppercase font-semibold">Finish Date</span>
              <span className="font-bold text-sm text-foreground block mt-0.5 truncate tabular-nums">
                {estimatorResult.estimatedCompletionDate}
              </span>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                ~{estimatorResult.estimatedDaysToClear}d left
              </span>
            </div>

            <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-3">
              <span className="text-sky-700 dark:text-sky-300 text-[10px] block uppercase font-semibold">Daily Target</span>
              <span className="font-bold text-sm text-foreground block mt-0.5 tabular-nums">
                {estimatorResult.dailyHoursNeeded}h/day
              </span>
              <span className="text-[10px] text-muted-foreground">Recommended</span>
            </div>

            <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-3">
              <span className="text-indigo-700 dark:text-indigo-300 text-[10px] block uppercase font-semibold">Your Pace</span>
              <span className="font-bold text-sm text-foreground block mt-0.5 tabular-nums">
                {paceAnalysis.currentPaceHoursPerDay || dailyHoursTarget}h/day
              </span>
              <span className="text-[10px] text-muted-foreground tabular-nums">Weekly {estimatorResult.weeklyWorkloadHours}h</span>
            </div>

            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <span className="text-amber-700 dark:text-amber-300 text-[10px] block uppercase font-semibold">Exam Target</span>
              <span className="font-bold text-sm text-foreground block mt-0.5 truncate tabular-nums">
                {examDateStr || 'CBSE 2027'}
              </span>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {daysToExam !== null ? `${daysToExam}d runway` : 'Standard runway'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* PWA App Install Banner */}
      <PWAInstallButton variant="banner" />

      {/* GAMIFICATION & PROGRESSION STRIP */}
      <AcademicProgressionStrip />

      {/* BACKLOG RECOVERY MODE */}
      {isRecoveryMode && (
        <BacklogRecoveryMode
          backlogItems={backlogItems}
          isActive={isRecoveryMode}
          onToggleActive={handleToggleRecoveryMode}
          onStartSprint={(chId) => setLocation(`/study?chapter=${chId}`)}
          dailyHours={dailyHoursTarget}
        />
      )}

      {/* COLORFUL DASHBOARD VIEW SWITCHER TABS */}
      <div className="flex items-center gap-1.5 border-b border-border overflow-x-auto text-xs whitespace-nowrap">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 -mb-px border-b-2 font-medium transition ${
            activeTab === 'overview'
              ? 'border-sky-500 text-sky-700 dark:text-sky-300 font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
          }`}
          data-testid="tab-dashboard-overview"
        >
          <BookOpenCheck size={14} className={activeTab === 'overview' ? 'text-sky-500' : 'text-sky-500/70'} />
          <span>Daily Plan &amp; Focus</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('backlog')}
          className={`flex items-center gap-2 px-4 py-2.5 -mb-px border-b-2 font-medium transition ${
            activeTab === 'backlog'
              ? 'border-emerald-500 text-emerald-700 dark:text-emerald-300 font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
          }`}
          data-testid="tab-dashboard-backlog"
        >
          <Layers size={14} className={activeTab === 'backlog' ? 'text-emerald-500' : 'text-emerald-500/70'} />
          <span>Smart Backlog</span>
          <span className="font-mono text-[11px] tabular-nums opacity-75">({backlogItems.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-4 py-2.5 -mb-px border-b-2 font-medium transition ${
            activeTab === 'analytics'
              ? 'border-violet-500 text-violet-700 dark:text-violet-300 font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
          }`}
          data-testid="tab-dashboard-analytics"
        >
          <BarChart3 size={14} className={activeTab === 'analytics' ? 'text-violet-500' : 'text-violet-500/70'} />
          <span>Velocity &amp; Analytics</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW & TODAY'S PLAN */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-page-enter">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-6">
              {/* Rest Day Card or Smart Daily Plan */}
              {todayIsRest ? (
                <RestDayCard onUndo={() => setRestDates(toggleRestDate(todayStr))} />
              ) : (
                <DailyPlanCard
                  plan={dailyPlan}
                  backlogItems={backlogItems}
                  dueRevisionChapters={dueRevs}
                  examDateStr={examDateStr}
                  onGeneratePlan={handleUpdateDailyPlan}
                  onToggleSlotComplete={handleToggleDailySlot}
                />
              )}

              {/* Spaced Revision Engine Card */}
              <SpacedRevisionCard
                revisions={revisions}
                onCompleteRevision={handleCompleteRevision}
              />

              {/* "Will I Finish?" Engine */}
              <WillIFinishCalculator
                backlogItems={backlogItems}
                sessions={sessions}
                defaultDailyHours={dailyHoursTarget}
                examDateStr={examDateStr}
                onOpenRecoveryMode={() => setIsRecoveryMode(true)}
                onUpdateDailyPromise={(h) => setDailyHoursTarget(h)}
              />

              {/* Rest day button */}
              {!todayIsRest && (
                <button
                  type="button"
                  onClick={() => setRestDates(toggleRestDate(todayStr))}
                  className="focus-ring inline-flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-foreground"
                  data-testid="button-take-rest-day"
                >
                  <RotateCcw size={13} />
                  <span>Deliberate rest day? Shift today's schedule forward without penalty.</span>
                </button>
              )}
            </div>

            {/* Right Sidebar: Quick Actions & Factual Diagnostic Insights */}
            <aside className="space-y-6">
              {/* Quick Jump */}
              <section className="rounded-xl border border-border bg-card p-4 space-y-2.5 font-mono text-xs" data-testid="card-quick-actions">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold block">
                  Quick Launch
                </span>
                <div className="grid gap-2">
                  <Link
                    href="/study"
                    className="focus-ring flex items-center justify-between rounded-lg bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white px-3.5 py-2.5 text-xs font-bold transition shadow-xs"
                    data-testid="link-quick-study"
                  >
                    <span>Start Focus Session</span>
                    <Play size={13} className="fill-current" />
                  </Link>

                  <Link
                    href="/roadmap"
                    className="flex items-center justify-between rounded-lg border border-emerald-500/25 bg-emerald-500/8 hover:bg-emerald-500/15 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300 font-semibold transition"
                  >
                    <span>Open Recovery Route</span>
                    <Compass size={13} className="text-emerald-500" />
                  </Link>

                  <button
                    type="button"
                    onClick={() => setIsPrereqMapOpen(true)}
                    className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-foreground hover:bg-muted text-left transition"
                  >
                    <span>Prerequisite Map</span>
                    <GitFork size={13} className="text-amber-500" />
                  </button>
                </div>
              </section>

              {/* Colorful Diagnostic Insights (No border-l-2 stripes) */}
              <section className="rounded-xl border border-border bg-card p-4 space-y-2.5 font-mono text-xs">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold block">
                  Diagnostic Pulse
                </span>
                <div className="space-y-2 text-[11px] font-sans">
                  <div className="flex items-start gap-2.5 rounded-lg border border-sky-500/20 bg-sky-500/8 p-2.5">
                    <Target size={14} className="text-sky-500 shrink-0 mt-0.5" />
                    <p className="text-foreground font-medium leading-snug">
                      Physics has <strong className="tabular-nums">{metrics.subjectMetrics.Physics.remaining}h</strong> pending backlog right now.
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/8 p-2.5">
                    <Clock3 size={14} className="text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-foreground font-medium leading-snug">
                      {dueRevs.length > 0
                        ? `${dueRevs.length} spaced concept reviews due today.`
                        : '0 revisions due today.'}
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/8 p-2.5">
                    <BookOpen size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                    <p className="text-foreground font-medium leading-snug">
                      {paceAnalysis.isOnTrack
                        ? `Current velocity keeps you ${paceAnalysis.bufferDays ?? 12}d ahead of exam day.`
                        : `Add ${paceAnalysis.additionalHoursNeededPerDay}h/day to finish before your target exam.`}
                    </p>
                  </div>
                </div>
              </section>

              {/* Recent Sessions */}
              <section className="border border-border bg-card p-4 space-y-2.5 font-mono text-xs" data-testid="card-recent-sessions">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Recent Blocks
                  </span>
                  <TimerReset size={13} className="text-muted-foreground" />
                </div>

                {sessions.slice(0, 4).length > 0 ? (
                  <div className="space-y-2 divide-y divide-border/40">
                    {sessions.slice(0, 4).map((s, index) => {
                      const ch = chapters.find((c) => c.id === s.chapterId);
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
                          <span className="font-bold text-foreground shrink-0">
                            {s.minutes}m
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    No sessions logged yet. Complete a focus block in the study room to track velocity.
                  </p>
                )}
              </section>
            </aside>
          </div>
        </div>
      )}

      {/* TAB 2: SMART BACKLOG MANAGER */}
      {activeTab === 'backlog' && (
        <div className="animate-page-enter">
          <SmartBacklogManager
            items={backlogItems}
            onAddItem={handleAddItem}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
            onOpenPrerequisiteMap={() => setIsPrereqMapOpen(true)}
            onStartFocusChapter={(chId) => setLocation(`/study?chapter=${chId}`)}
            dailyHoursTarget={dailyHoursTarget}
          />
        </div>
      )}

      {/* TAB 3: PROGRESS ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6 animate-page-enter">
          <BacklogReductionVisualizer
            items={backlogItems}
            dailyHoursTarget={dailyHoursTarget}
            examDateStr={examDateStr}
          />
          <ProgressAnalyticsCard
            items={backlogItems}
            sessions={sessions}
            dailyHoursTarget={dailyHoursTarget}
          />
        </div>
      )}

      {/* Study Heatmap */}
      <div className="border-t border-border/70 pt-8">
        <StudyHeatmap
          sessions={sessions}
          completedCount={backlogItems.filter((i) => i.status === 'completed').length}
        />
      </div>

      {/* Dashboard Community Impact Footer */}
      <div className="border-t border-border/70 pt-6 pb-2">
        <CommunityImpactBanner />
      </div>

      {/* Prerequisite Map Modal */}
      <PrerequisiteMapModal
        isOpen={isPrereqMapOpen}
        onClose={() => setIsPrereqMapOpen(false)}
        backlogItems={backlogItems}
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
          onProfileUpdated={() => setBacklogItems(readBacklogItems())}
        />
      )}
    </div>
  );
}
