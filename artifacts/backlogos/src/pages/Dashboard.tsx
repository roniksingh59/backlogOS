import { useState, useMemo } from 'react';
import {
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  Check,
  Flame,
  Play,
  RotateCcw,
  TimerReset,
  GitFork,
  ClipboardCheck,
  Zap,
  BarChart3,
  Layers,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/lib/auth-context';
import { chapters, type PlanDay, type StudentPlan } from '@/lib/backlog-data';
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
  readTestLogs,
  saveTestLog,
  deleteTestLog,
  readMissedDayRecovery,
  saveMissedDayRecovery,
  readRecoveryModeActive,
  setRecoveryModeActive,
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
import { TestErrorLogModal } from '@/components/TestErrorLogModal';
import { PrerequisiteMapModal } from '@/components/PrerequisiteMapModal';
import { MissedDayRecoveryModal } from '@/components/MissedDayRecoveryModal';
import { ProgressAnalyticsCard } from '@/components/ProgressAnalyticsCard';
import { BacklogReductionVisualizer } from '@/components/BacklogReductionVisualizer';
import { AcademicProgressionStrip } from '@/components/AcademicProgressionStrip';
import { SubjectManagementModal } from '@/components/SubjectManagementModal';
import { readEducationProfile } from '@/lib/curriculum/user-profile-storage';
import { Settings, BookOpen } from 'lucide-react';

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
  const plan = readPlan();
  const [restDates, setRestDates] = useState(readRestDates);

  // BacklogOS Core State
  const [backlogItems, setBacklogItems] = useState<BacklogItem[]>(readBacklogItems);
  const [dailyPlan, setDailyPlan] = useState<SmartDailyPlan | null>(readSmartDailyPlan);
  const [revisions, setRevisions] = useState(readSpacedRevisions);
  const [testLogs, setTestLogs] = useState(readTestLogs);
  const [isRecoveryMode, setIsRecoveryMode] = useState(readRecoveryModeActive);

  // Modals state
  const [isPrereqMapOpen, setIsPrereqMapOpen] = useState(false);
  const [isTestLogOpen, setIsTestLogOpen] = useState(false);
  const [isMissedRecoveryOpen, setIsMissedRecoveryOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'backlog' | 'daily' | 'analytics'>('overview');

  // Daily target hours
  const [dailyHoursTarget, setDailyHoursTarget] = useState<number>(() => {
    return plan?.minutesPerDay ? Math.round((plan.minutesPerDay / 60) * 10) / 10 : 3.5;
  });

  const completed = new Set(readCompleted());
  const sessions = readStudySessions();

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

  // Handlers for Backlog Items
  const handleAddItem = (item: BacklogItem) => {
    const updated = addBacklogItem(item);
    setBacklogItems(updated);
  };

  const handleUpdateItem = (id: string, updates: Partial<BacklogItem>) => {
    const updated = updateBacklogItem(id, updates);
    setBacklogItems(updated);
    setRevisions(readSpacedRevisions()); // in case spaced revisions auto-triggered
  };

  const handleDeleteItem = (id: string) => {
    const updated = deleteBacklogItem(id);
    setBacklogItems(updated);
  };

  // Handlers for Daily Plan
  const handleUpdateDailyPlan = (newPlan: SmartDailyPlan) => {
    setDailyPlan(newPlan);
    saveSmartDailyPlan(newPlan);
  };

  const handleToggleDailySlot = (slotId: string) => {
    if (!dailyPlan) return;
    const updatedSlots = dailyPlan.slots.map((s) =>
      s.id === slotId ? { ...s, completed: !s.completed } : s
    );
    const updatedPlan = { ...dailyPlan, slots: updatedSlots };
    setDailyPlan(updatedPlan);
    saveSmartDailyPlan(updatedPlan);
  };

  // Handlers for Revisions
  const handleCompleteRevision = (
    revisionId: string,
    confidence: 'strong' | 'shaky' | 'forgotten'
  ) => {
    const updated = completeSpacedRevision(revisionId, confidence);
    setRevisions(updated);
  };

  // Handlers for Test Logs
  const handleSaveTestLog = (log: any) => {
    const updated = saveTestLog(log);
    setTestLogs(updated);
  };

  const handleDeleteTestLog = (id: string) => {
    const updated = deleteTestLog(id);
    setTestLogs(updated);
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

  const { user } = useAuth();
  const userName = user?.displayName ? user.displayName.split(' ')[0] : 'Ronik';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const [isManageSubjectsOpen, setIsManageSubjectsOpen] = useState(false);
  const educationProfile = useMemo(() => readEducationProfile(), [isManageSubjectsOpen]);

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
      {/* Top Academic Command Header */}
      <div className="border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-border pb-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block">
              CBSE CLASS {educationProfile.grade} {educationProfile.stream !== 'none' ? `· ${educationProfile.stream.toUpperCase()}` : ''} · SESSION {educationProfile.academicSession}
            </span>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-0.5">
              {greeting}, {userName}
            </h1>
          </div>

          {/* Quick Technical Actions */}
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
            <Link
              href="/curriculum"
              className="rounded border border-border bg-card px-2.5 py-1 text-muted-foreground hover:text-foreground transition flex items-center gap-1.5"
              data-testid="link-dashboard-curriculum"
            >
              <BookOpen size={12} />
              <span>CBSE Syllabus</span>
            </Link>

            {plan && (
              <Link
                href="/roadmap"
                className="rounded border border-sky-400/30 bg-sky-500/10 text-sky-500 hover:bg-sky-500/20 transition flex items-center gap-1.5 font-bold"
                data-testid="link-dashboard-syllabus-map"
              >
                <CalendarDays size={12} />
                <span>Syllabus Map ({plan.planDuration || plan.days.length}D)</span>
              </Link>
            )}

            <button
              type="button"
              onClick={() => setIsManageSubjectsOpen(true)}
              className="rounded border border-border bg-card px-2.5 py-1 text-muted-foreground hover:text-foreground transition flex items-center gap-1.5"
              data-testid="button-dashboard-manage-subjects"
            >
              <Settings size={12} />
              <span>Subjects</span>
            </button>

            <button
              type="button"
              onClick={() => setIsRecoveryMode(!isRecoveryMode)}
              className={`rounded border px-2.5 py-1 transition flex items-center gap-1.5 ${
                isRecoveryMode
                  ? 'border-rose-500 bg-rose-500 text-white font-bold'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground'
              }`}
              data-testid="button-toggle-recovery-banner"
            >
              <Flame size={12} />
              <span>{isRecoveryMode ? 'Exit Recovery' : 'Recovery Mode'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPrereqMapOpen(true)}
              className="rounded border border-border bg-card px-2.5 py-1 text-muted-foreground hover:text-foreground transition flex items-center gap-1.5"
              data-testid="button-dashboard-prereq-map"
            >
              <GitFork size={12} />
              <span>Prerequisites</span>
            </button>

            <button
              type="button"
              onClick={() => setIsTestLogOpen(true)}
              className="rounded border border-border bg-card px-2.5 py-1 text-muted-foreground hover:text-foreground transition flex items-center gap-1.5"
              data-testid="button-dashboard-test-log"
            >
              <ClipboardCheck size={12} />
              <span>Error Log</span>
            </button>

            <button
              type="button"
              onClick={() => setIsMissedRecoveryOpen(true)}
              className="rounded border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition flex items-center gap-1"
              data-testid="button-dashboard-missed-recovery"
            >
              <RotateCcw size={12} />
              <span>Missed Day?</span>
            </button>
          </div>
        </div>

        {/* Prominent Backlog and Pace Section */}
        <div className="pt-4 grid grid-cols-1 lg:grid-cols-5 gap-4 items-center">
          {/* Main Backlog Number */}
          <div className="lg:col-span-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block">
              REMAINING BACKLOG
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="font-mono text-3xl sm:text-5xl font-bold tracking-tight text-foreground">
                {metrics.remainingHours}h
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono font-bold border ${
                  paceAnalysis.isOnTrack
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : paceAnalysis.statusCategory === 'critical_behind'
                    ? 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    : 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    paceAnalysis.isOnTrack
                      ? 'bg-emerald-500'
                      : paceAnalysis.statusCategory === 'critical_behind'
                      ? 'bg-rose-500'
                      : 'bg-amber-500'
                  }`}
                />
                {paceAnalysis.isOnTrack
                  ? 'ON TRACK'
                  : paceAnalysis.statusCategory === 'critical_behind'
                  ? 'CRITICALLY BEHIND'
                  : 'AT RISK'}
              </span>
            </div>
          </div>

          {/* Runway Figures */}
          <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-xs font-mono border-t lg:border-t-0 lg:border-l border-border pt-3 lg:pt-0 lg:pl-4">
            <div>
              <span className="text-muted-foreground text-[10px] block uppercase">Exam Date</span>
              <span className="font-bold text-foreground text-xs block mt-0.5 truncate">
                {examDateStr ? examDateStr : 'Feb 28, 2027'}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {daysToExam !== null ? `${daysToExam}d runway` : 'Standard'}
              </span>
            </div>

            <div>
              <span className="text-muted-foreground text-[10px] block uppercase">Required Pace</span>
              <span className="font-bold text-foreground text-xs block mt-0.5">
                {paceAnalysis.requiredPaceHoursPerDay}h/day
              </span>
              <span className="text-[10px] text-muted-foreground">To finish on time</span>
            </div>

            <div>
              <span className="text-muted-foreground text-[10px] block uppercase">Current Pace</span>
              <span
                className={`font-bold text-xs block mt-0.5 ${
                  paceAnalysis.isOnTrack
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                {paceAnalysis.currentPaceHoursPerDay}h/day
              </span>
              <span className="text-[10px] text-muted-foreground">Logged velocity</span>
            </div>

            <div>
              <span className="text-muted-foreground text-[10px] block uppercase">Est. Completion</span>
              <span className="font-bold text-foreground text-xs block mt-0.5 truncate">
                {paceAnalysis.estimatedCompletionDate || 'On Pace'}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {paceAnalysis.isOnTrack ? `+${paceAnalysis.bufferDays ?? 0}d buffer` : 'Behind pace'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* GAMIFICATION & PROGRESSION STRIP (Level, XP, Streak, Backlog Reduction, Recovery) */}
      <AcademicProgressionStrip />

      {/* SIGNATURE FEATURE: BACKLOG RECOVERY MODE (When Activated or Behind) */}
      {isRecoveryMode && (
        <BacklogRecoveryMode
          backlogItems={backlogItems}
          isActive={isRecoveryMode}
          onToggleActive={handleToggleRecoveryMode}
          onStartSprint={(chId) => setLocation(`/study?chapter=${chId}`)}
          dailyHours={dailyHoursTarget}
        />
      )}

      {/* NOTION-STYLE DASHBOARD VIEW SWITCHER TABS */}
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto text-xs whitespace-nowrap">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-1.5 px-3.5 py-2 -mb-px border-b-2 font-medium transition ${
            activeTab === 'overview'
              ? 'border-foreground text-foreground font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
          }`}
          data-testid="tab-dashboard-overview"
        >
          <BookOpenCheck size={14} className={activeTab === 'overview' ? 'text-foreground' : 'text-muted-foreground'} />
          <span>Daily Plan & Focus</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('backlog')}
          className={`flex items-center gap-1.5 px-3.5 py-2 -mb-px border-b-2 font-medium transition ${
            activeTab === 'backlog'
              ? 'border-foreground text-foreground font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
          }`}
          data-testid="tab-dashboard-backlog"
        >
          <Layers size={14} className={activeTab === 'backlog' ? 'text-foreground' : 'text-muted-foreground'} />
          <span>Smart Backlog</span>
          <span className="ml-1 rounded px-1.5 py-0.2 border border-border bg-muted/50 text-[10px] font-mono">
            {backlogItems.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-1.5 px-3.5 py-2 -mb-px border-b-2 font-medium transition ${
            activeTab === 'analytics'
              ? 'border-foreground text-foreground font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
          }`}
          data-testid="tab-dashboard-analytics"
        >
          <BarChart3 size={14} className={activeTab === 'analytics' ? 'text-foreground' : 'text-muted-foreground'} />
          <span>Velocity & Analytics</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW & TODAY'S PLAN */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-page-enter">
          {/* Central Backlog Reduction Trajectory */}
          <BacklogReductionVisualizer
            items={backlogItems}
            dailyHoursTarget={dailyHoursTarget}
            examDateStr={examDateStr}
          />

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
              <section className="border border-border bg-card p-4 space-y-2.5 font-mono text-xs" data-testid="card-quick-actions">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">
                  Quick Actions
                </span>
                <div className="grid gap-1.5">
                  <Link
                    href="/study"
                    className="focus-ring flex items-center justify-between rounded bg-foreground text-background px-3 py-2 text-xs font-bold hover:bg-foreground/90 transition shadow-xs"
                    data-testid="link-quick-study"
                  >
                    <span>Start Focus Session</span>
                    <Play size={12} className="fill-current" />
                  </Link>

                  <button
                    type="button"
                    onClick={() => setIsPrereqMapOpen(true)}
                    className="flex items-center justify-between rounded border border-border px-3 py-1.5 text-xs text-foreground hover:bg-muted text-left"
                  >
                    <span>Prerequisite Map</span>
                    <GitFork size={12} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsTestLogOpen(true)}
                    className="flex items-center justify-between rounded border border-border px-3 py-1.5 text-xs text-foreground hover:bg-muted text-left"
                  >
                    <span>Record Test Mistakes</span>
                    <ClipboardCheck size={12} />
                  </button>
                </div>
              </section>

              {/* Factual Diagnostic Insights */}
              <section className="border border-border bg-card p-4 space-y-2.5 font-mono text-xs">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">
                  Diagnostic Status
                </span>
                <div className="space-y-2 text-[11px] text-muted-foreground">
                  <div className="border-l-2 border-primary pl-2.5 py-0.5">
                    <p className="text-foreground font-medium">
                      Physics is currently your largest backlog ({metrics.subjectMetrics.Physics.remaining}h remaining).
                    </p>
                  </div>

                  <div className="border-l-2 border-amber-500 pl-2.5 py-0.5">
                    <p className="text-foreground font-medium">
                      {dueRevs.length > 0
                        ? `${dueRevs.length} revisions are due today.`
                        : '0 revisions due today.'}
                    </p>
                  </div>

                  <div className="border-l-2 border-emerald-500 pl-2.5 py-0.5">
                    <p className="text-foreground font-medium">
                      {paceAnalysis.isOnTrack
                        ? `Your current pace is enough to finish ${paceAnalysis.bufferDays ?? 12} days before the exam.`
                        : `You require an additional ${paceAnalysis.additionalHoursNeededPerDay}h/day to clear backlog before the exam.`}
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
        <div className="animate-page-enter">
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

      {/* Test Error Log Modal */}
      <TestErrorLogModal
        isOpen={isTestLogOpen}
        onClose={() => setIsTestLogOpen(false)}
        logs={testLogs}
        onSaveLog={handleSaveTestLog}
        onDeleteLog={handleDeleteTestLog}
        onSelectChapterForStudy={(chId) => {
          setIsTestLogOpen(false);
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
