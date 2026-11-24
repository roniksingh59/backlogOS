import {
  BellRing,
  Check,
  Clock3,
  FileText,
  Pause,
  Play,
  RotateCcw,
  Compass,
  Loader2,
  Save,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { Link } from 'wouter';
import {
  chapters,
  getChapterOverview,
  getChaptersForSubjectAndPlan,
  resolveChapterById,
  type Chapter,
  type StudentPlan,
  type Subject,
} from '@/lib/backlog-data';
import { readPlan } from '@/lib/storage';
import { readEducationProfile } from '@/lib/curriculum/user-profile-storage';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  loadChapterNoteDirect,
  saveChapterNoteDirect,
} from '@/lib/supabase-service';
import { AIChapterGuide } from '@/components/AIChapterGuide';
import { ChapterSubtopicsCard } from '@/components/ChapterSubtopicsCard';
import { ResourceDiscoverySection } from '@/components/resources/ResourceDiscoverySection';
import { MindMapModal } from '@/components/resources/MindMapModal';
import { VerificationQuizRunner } from '@/components/VerificationQuizRunner';
import { useAuth } from '@/lib/auth-context';
import { useBacklogItems } from '@/hooks/use-backlog-items';
import { useEnginesWorkspace } from '@/hooks/use-engines-workspace';
import { usePomodoroTimer } from '@/lib/pomodoro-context';


type StudyTab = 'learn' | 'videos' | 'subtopics' | 'ai_guide' | 'verify';

function EmptyStudy() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6 sm:py-28 font-sans">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card p-1.5 shadow-xs">
        <img src="/brand/mark-transparent.svg" alt="BacklogOS" className="h-full w-full object-contain" />
      </div>
      <p className="mt-4 text-xs font-mono uppercase tracking-widest text-muted-foreground">Study Room</p>
      <h1 className="font-display mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
        Give your study plan a focused space.
      </h1>
      <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground leading-relaxed">
        Select a chapter from your backlog or generate a recovery plan to unlock chapter explainers, curated video lectures, interactive mind maps, and the focus timer.
      </p>
      <div className="mt-6 flex justify-center gap-3 font-mono text-xs">
        <Link
          href="/dashboard"
          className="focus-ring inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 font-bold text-white hover:bg-indigo-500 transition shadow-xs"
          data-testid="link-study-open-dashboard"
        >
          Open Dashboard
        </Link>
        <Link
          href="/onboarding?reset=true"
          className="focus-ring inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 font-medium text-foreground hover:bg-muted transition"
          data-testid="link-study-create-plan"
        >
          Build New Plan
        </Link>
      </div>
    </div>
  );
}

function getInitialChapter(plan: StudentPlan) {
  const query = new URLSearchParams(window.location.search).get('chapter');
  return query && plan.plannedChapterIds.includes(query) ? query : plan.plannedChapterIds[0] ?? plan.chapterIds[0];
}

function FocusTimer({
  chapterId,
  defaultMinutes,
  userId,
  availableChapters,
  onChapterChange,
}: {
  chapterId: string;
  defaultMinutes: number;
  userId?: string;
  availableChapters: Chapter[];
  onChapterChange?: (newChapterId: string) => void;
}) {
  const chapterPool = availableChapters.length > 0 ? availableChapters : chapters;
  const {
    duration,
    seconds,
    running,
    selectedSubject,
    selectedChapterId,
    selectedTask,
    logged,
    loggedMsg,
    alarmActive,
    setSelection,
    syncStudyChapterSelection,
    applyPreferredDefaultMinutes,
    toggleRunning,
    setPresetDuration,
    reset,
    logSession,
    dismissAlarm,
    restartAfterAlarm,
    testAlarmTune,
  } = usePomodoroTimer();

  const { items: selectedBacklogItems, loading: selectedBacklogLoading } = useBacklogItems(
    userId,
    selectedChapterId
  );

  const availableSubjects = useMemo(
    () => Array.from(new Set(chapterPool.map((c) => c.subject))),
    [chapterPool]
  );

  useEffect(() => {
    applyPreferredDefaultMinutes(defaultMinutes);
  }, [applyPreferredDefaultMinutes, defaultMinutes]);

  useEffect(() => {
    syncStudyChapterSelection(chapterId, chapterPool);
  }, [chapterId, chapterPool, syncStudyChapterSelection]);

  const setTimer = (minutes: number) => {
    setPresetDuration(minutes);
  };

  const minutes = `${Math.floor(seconds / 60)}`.padStart(2, '0');
  const secs = `${seconds % 60}`.padStart(2, '0');

  const elapsedSeconds = duration * 60 - seconds;
  const elapsedMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
  const hasElapsedPartial = elapsedSeconds >= 60 && seconds > 0;

  const taskOptions = [
    'Concept Learning & Derivations',
    'NCERT Subtopics & Solved Examples',
    'Practice Questions & PYQs',
    'Formula Sheet Drill',
    'Spaced Retrieval & Revision',
  ];

  return (
    <section className="border border-border bg-card p-5 text-foreground" data-testid="card-focus-timer">
      <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block">
            Focus Block Engine
          </span>
          <h3 className="font-display text-base font-bold text-foreground mt-0.5">
            Backlog-Linked Timer
          </h3>
        </div>
        <Clock3 size={18} className="text-muted-foreground" />
      </div>

      {/* Task & Chapter Selector */}
      <div className="mt-3.5 space-y-2 border border-border bg-muted/20 p-2.5 text-xs font-mono">
        {/* Subject & Chapter */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] uppercase text-muted-foreground block mb-0.5">
              Subject
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => {
                const sub = e.target.value as Subject;
                const first = chapterPool.find((c) => c.subject === sub);
                setSelection({
                  subject: sub,
                  chapterId: first ? first.id : selectedChapterId,
                });
                if (first && onChapterChange) onChapterChange(first.id);
              }}
              className="w-full rounded border border-border bg-background text-foreground px-2 py-1 text-xs font-mono focus:outline-hidden"
            >
              {availableSubjects.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase text-muted-foreground block mb-0.5">
              Chapter
            </label>
            <select
              value={selectedChapterId}
              onChange={(e) => {
                setSelection({ chapterId: e.target.value });
                if (onChapterChange) onChapterChange(e.target.value);
              }}
              className="w-full rounded border border-border bg-background text-foreground px-2 py-1 text-xs font-mono focus:outline-hidden"
            >
              {chapterPool
                .filter((c) => c.subject === selectedSubject)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
            </select>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground" role="status">
          {selectedBacklogLoading
            ? 'Refreshing chapter backlog…'
            : selectedBacklogItems[0]
              ? `Backlog status: ${selectedBacklogItems[0].status.replace('_', ' ')}`
              : 'No saved backlog item for this chapter yet.'}
        </p>

        {/* Task */}
        <div>
          <label className="text-[10px] uppercase text-muted-foreground block mb-0.5">
            Focus Task
          </label>
          <select
            value={selectedTask}
            onChange={(e) => setSelection({ task: e.target.value })}
            className="w-full rounded border border-border bg-background text-foreground px-2 py-1 text-xs font-mono focus:outline-hidden"
          >
            {taskOptions.map((task) => (
              <option key={task} value={task}>
                {task}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="relative my-5 flex items-center justify-center">
        {running && (
          <div className="absolute h-24 w-40 rounded-full border border-sky-400/40 bg-sky-500/5 animate-ring-pulse pointer-events-none" />
        )}
        <p
          className={`font-mono text-5xl font-bold tracking-tight transition-all duration-300 ${
            running ? 'scale-105 text-foreground drop-shadow-sm' : 'text-foreground'
          }`}
          data-testid="text-timer"
        >
          {minutes}:{secs}
        </p>
      </div>

      <div className="mt-4 flex justify-center gap-1.5 font-mono text-xs">
        {[15, 25, 45, 60].map((value) => (
          <button
            type="button"
            key={value}
            onClick={() => setTimer(value)}
            className={`rounded border px-2.5 py-0.5 text-xs transition btn-press ${
              duration === value
                ? 'bg-foreground text-background border-foreground font-bold shadow-2xs'
                : 'border-border bg-card text-muted-foreground hover:text-foreground'
            }`}
            data-testid={`button-timer-${value}`}
          >
            {value}m
          </button>
        ))}
      </div>

      <div className="mt-4 flex justify-center gap-2">
        <button
          type="button"
          onClick={toggleRunning}
          className={`focus-ring inline-flex items-center gap-2 rounded-lg px-5 py-2 text-xs font-mono font-bold text-white shadow-xs transition btn-press cursor-pointer ${
            running ? 'bg-amber-600 hover:bg-amber-500' : 'bg-indigo-600 hover:bg-indigo-500'
          }`}
          data-testid="button-timer-toggle"
        >
          {running ? <Pause size={14} /> : <Play size={14} className="fill-current" />}
          {running ? 'Pause' : seconds === 0 ? 'Restart' : 'START FOCUS'}
        </button>

        <button
          type="button"
          onClick={reset}
          className="focus-ring grid h-8 w-8 place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground btn-press"
          aria-label="Reset timer"
          data-testid="button-timer-reset"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      {alarmActive && (
        <div
          role="alert"
          aria-live="assertive"
          className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-center space-y-2"
          data-testid="card-study-pomodoro-alarm"
        >
          <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300">
            <BellRing size={14} />
            <span>Focus session complete!</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={dismissAlarm}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 text-xs font-semibold transition cursor-pointer"
              data-testid="button-study-stop-alarm"
            >
              <VolumeX size={13} />
              <span>Stop Alarm</span>
            </button>
            <button
              type="button"
              onClick={restartAfterAlarm}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition cursor-pointer"
            >
              <Play size={12} className="fill-current" />
              <span>Restart</span>
            </button>
          </div>
        </div>
      )}

      <div className="mt-3.5 flex flex-wrap items-center justify-center gap-3 text-[11px] font-mono text-muted-foreground">
        <button
          type="button"
          onClick={logSession}
          disabled={logged}
          className="focus-ring flex items-center gap-1.5 disabled:cursor-default disabled:opacity-50 hover:text-foreground transition cursor-pointer"
          data-testid="button-log-session"
        >
          {logged ? <Check size={13} className="text-emerald-500" /> : <Clock3 size={13} />}
          {logged
            ? 'Study block logged to backlog'
            : hasElapsedPartial
            ? `Log ${elapsedMinutes}m elapsed focus time`
            : `Log ${duration}m offline study block`}
        </button>

        <button
          type="button"
          onClick={testAlarmTune}
          className="focus-ring inline-flex items-center gap-1 hover:text-foreground transition cursor-pointer"
          data-testid="button-test-alarm-tune"
        >
          <Volume2 size={12} />
          <span>Test Alarm</span>
        </button>
      </div>

      {loggedMsg && (
        <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-center text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
          {loggedMsg}
        </div>
      )}

      <p className="mt-3 text-center text-[11px] text-muted-foreground">
        Suggested pace: {defaultMinutes} min/day · Stays hovering across tabs while active
      </p>
    </section>
  );
}

function LearnTab({ chapterId, onOpenResources }: { chapterId: string; onOpenResources: () => void }) {
  const { user } = useAuth();
  const userId = user?.uid;
  const isCloudUser = Boolean(userId && !user?.isGuest);
  const content = getChapterOverview(chapterId);

  const [noteText, setNoteText] = useState('');
  const [noteLoading, setNoteLoading] = useState(true);
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteStatus, setNoteStatus] = useState<{ type: 'saved' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setNoteLoading(true);
      setNoteStatus(null);
      const res = await loadChapterNoteDirect(chapterId, userId);
      if (!cancelled) {
        setNoteText(res.note || '');
        setNoteLoading(false);
      }
    }
    if (chapterId) {
      void load();
    } else {
      setNoteLoading(false);
    }

    const onNotesUpdated = () => {
      if (!chapterId) return;
      void loadChapterNoteDirect(chapterId, userId).then((res) => {
        if (!cancelled) setNoteText(res.note || '');
      });
    };
    window.addEventListener('backlogos-notes-updated', onNotesUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener('backlogos-notes-updated', onNotesUpdated);
    };
  }, [chapterId, userId]);

  const handleSaveNote = async () => {
    if (!chapterId) return;
    setNoteSaving(true);
    setNoteStatus(null);
    const res = await saveChapterNoteDirect(chapterId, noteText, userId);
    setNoteSaving(false);
    if (res.success) {
      setNoteStatus({
        type: 'saved',
        text: isCloudUser ? 'Saved to Supabase cloud' : 'Saved locally',
      });
    } else {
      setNoteStatus({
        type: 'error',
        text: res.error || 'Could not save note',
      });
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-md border border-border bg-card p-5 sm:p-6">
        <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">The short version</p>
        <p className="mt-2 text-base leading-relaxed text-foreground">{content.summary}</p>
      </section>
      <div className="grid gap-5 md:grid-cols-2">
        <section className="rounded-md border border-border bg-card p-5">
          <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">By the end, you can</p>
          <ul className="mt-3 space-y-2.5">
            {content.outcomes.map((item) => (
              <li key={item} className="flex gap-2.5 text-xs leading-relaxed text-foreground">
                <Check size={14} className="mt-0.5 shrink-0 text-foreground" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-md border border-border bg-card p-5">
          <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">Keep nearby</p>
          <ul className="mt-3 space-y-2">
            {content.formulaNotes.map((item) => (
              <li key={item} className="rounded border border-border bg-muted/20 px-3 py-2 text-xs font-mono text-foreground leading-relaxed">
                {item}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Personal Chapter Notes (Cloud Synced across devices) */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-3" data-testid="card-chapter-notes">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
              Personal Chapter Notes {isCloudUser ? '· Synced across devices' : '· Guest Local'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Jot down key NCERT derivations, tricky numericals, or formulas to revise later.
            </p>
          </div>
          {noteStatus && (
            <span
              className={`text-xs font-mono font-semibold ${
                noteStatus.type === 'saved'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {noteStatus.text}
            </span>
          )}
        </div>
        {noteLoading ? (
          <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
            <Loader2 size={14} className="animate-spin" />
            <span>Loading chapter notes...</span>
          </div>
        ) : (
          <>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={4}
              placeholder="Write your notes for this chapter..."
              className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/30"
              data-testid="textarea-chapter-notes"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveNote}
                disabled={noteSaving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-mono font-bold text-white hover:bg-indigo-500 transition disabled:opacity-50 cursor-pointer"
                data-testid="button-save-chapter-note"
              >
                {noteSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                <span>{noteSaving ? 'Saving...' : 'Save Note'}</span>
              </button>
            </div>
          </>
        )}
      </section>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border bg-card px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Ready for video lectures or NCERT notes?</p>
          <p className="text-xs text-muted-foreground">Open curated lectures and official CBSE &amp; NCERT resources for this chapter.</p>
        </div>
        <button
          type="button"
          onClick={onOpenResources}
          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-xs font-mono font-bold text-white hover:bg-indigo-500 transition shrink-0 cursor-pointer"
        >
          Open Resources &amp; Videos
        </button>
      </div>
    </div>
  );
}

export function Study() {
  const { user, activePlan } = useAuth();
  const {
    chapterMasteryByChapterId,
    conceptMasteryList,
    applyAssessmentSubmission,
  } = useEnginesWorkspace();
  const [plan, setPlan] = useState<StudentPlan | null>(() => activePlan || readPlan(user?.uid));
  const [chapterId, setChapterId] = useState(() => (plan ? getInitialChapter(plan) : ''));
  const [tab, setTab] = useState<StudyTab>(() => {
    const qTab = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('tab') : null;
    return qTab === 'verify' ? 'verify' : 'learn';
  });
  const [mindMapOpen, setMindMapOpen] = useState(false);

  useEffect(() => {
    const updated = activePlan || readPlan(user?.uid);
    setPlan(updated);
    if (updated) {
      setChapterId((prev) => (prev && updated.plannedChapterIds.includes(prev) ? prev : getInitialChapter(updated)));
    }
  }, [user?.uid, activePlan]);

  useEffect(() => {
    const handlePlanUpdate = () => {
      const updated = readPlan(user?.uid);
      setPlan(updated);
      if (updated) {
        setChapterId((prev) => (prev && updated.plannedChapterIds.includes(prev) ? prev : getInitialChapter(updated)));
      }
    };
    window.addEventListener('backlogos-plan-updated', handlePlanUpdate);
    window.addEventListener('backlogos-plans-updated', handlePlanUpdate);
    window.addEventListener('storage', handlePlanUpdate);
    return () => {
      window.removeEventListener('backlogos-plan-updated', handlePlanUpdate);
      window.removeEventListener('backlogos-plans-updated', handlePlanUpdate);
      window.removeEventListener('storage', handlePlanUpdate);
    };
  }, [user?.uid]);

  const eduProfile = useMemo(() => readEducationProfile(user?.uid), [user?.uid]);
  const availableChapters = useMemo(
    () => (plan ? getChaptersForSubjectAndPlan(plan, user?.grade || eduProfile.grade) : []),
    [plan, user?.grade, eduProfile.grade]
  );

  // Resolve active chapter dynamically from full Class 11 & 12 curriculum or plan without Class 11 PCM fallback
  const chapter = useMemo(() => {
    const firstPlannedId = plan?.plannedChapterIds?.[0] || plan?.chapterIds?.[0];
    return (
      resolveChapterById(chapterId) ||
      availableChapters.find((c) => c.id === chapterId) ||
      (firstPlannedId ? resolveChapterById(firstPlannedId) : undefined) ||
      availableChapters[0] ||
      chapters[0]
    );
  }, [chapterId, plan?.plannedChapterIds, plan?.chapterIds, availableChapters]);

  const activeChapterId = chapter?.id || '';

  const groupedSelectableChapters = useMemo(() => {
    const groups = new Map<string, Chapter[]>();
    for (const ch of availableChapters) {
      const list = groups.get(ch.subject) || [];
      list.push(ch);
      groups.set(ch.subject, list);
    }
    return Array.from(groups.entries());
  }, [availableChapters]);

  // Requirement 1: Clean lifecycle refetch from Supabase using .eq('chapter_id', activeChapterId) + user scope
  const [chapterBacklogItems, setChapterBacklogItems] = useState<any[]>([]);
  const [isFetchingChapterData, setIsFetchingChapterData] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    async function refetchChapterData() {
      if (!plan || !activeChapterId) return;
      setIsFetchingChapterData(true);
      try {
        if (isSupabaseConfigured && user?.uid && !user.isGuest) {
          const { data, error } = await supabase
            .from('backlog_items')
            .select('*')
            .eq('chapter_id', activeChapterId)
            .eq('user_id', user.uid);

          if (!error && !isCancelled && data) {
            setChapterBacklogItems(data);
          }
        }
      } catch (err) {
        console.warn('Error refetching chapter data from Supabase:', err);
      } finally {
        if (!isCancelled) {
          setIsFetchingChapterData(false);
        }
      }
    }

    refetchChapterData();
    return () => {
      isCancelled = true;
    };
  }, [plan, activeChapterId, user?.uid, user?.isGuest]);

  if (!plan) return <EmptyStudy />;

  const activeChapterMastery = chapterMasteryByChapterId.get(activeChapterId) || null;
  const activeConceptMastery = conceptMasteryList.filter((c) => c.chapterId === activeChapterId);

  const tabs: { value: StudyTab; label: string }[] = [
    { value: 'learn', label: 'Concept Overview' },
    { value: 'videos', label: 'Resources & Videos' },
    { value: 'subtopics', label: 'NCERT Subtopics' },
    { value: 'verify', label: 'Verify & Mastery Test' },
    { value: 'ai_guide', label: 'Ask Bax AI' },
  ];

  return (
    <div className="human-layout mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-12 animate-page-enter">
      <div className="flex flex-col gap-4 border-b border-border/80 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-mono font-bold uppercase tracking-[.16em] text-indigo-600 dark:text-indigo-400">
            Learn &amp; Test · Study Room
          </p>
          <h1 className="font-display mt-2 text-3xl sm:text-5xl font-extrabold leading-tight tracking-tight text-foreground">
            Study and verify one chapter properly.
          </h1>
          <p className="mt-2.5 max-w-2xl text-sm leading-6 text-muted-foreground">
            Master the core concepts, watch curated lectures, clear NCERT subtopics, and pass a Chapter Mastery exam to prove retention.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start flex-wrap font-mono text-xs">
          <button
            type="button"
            onClick={() => setTab('verify')}
            className="focus-ring inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 font-bold transition cursor-pointer whitespace-nowrap"
            data-testid="button-study-open-verify"
          >
            <span>Verify Chapter Mastery</span>
          </button>
          <Link
            href="/dashboard"
            className="focus-ring inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 font-semibold hover:bg-muted transition whitespace-nowrap"
            data-testid="link-study-dashboard"
          >
            <FileText size={15} className="text-indigo-600 dark:text-indigo-400" /> Dashboard
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <div className="border-y border-border py-4 sm:py-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-mono font-bold uppercase tracking-[.14em] text-indigo-600 dark:text-indigo-400">
                Choose a chapter
              </label>
              {isFetchingChapterData && (
                <span className="flex items-center gap-1.5 text-[11px] font-mono text-indigo-600 dark:text-indigo-400">
                  <Loader2 size={12} className="animate-spin" />
                  <span>Syncing...</span>
                </span>
              )}
            </div>

            <select
              value={activeChapterId}
              onChange={(event) => {
                const newId = event.target.value;
                setChapterId(newId);
                setTab('learn');
              }}
              className="focus-ring w-full rounded-lg border border-input bg-background px-4 py-3 text-sm font-semibold"
              data-testid="select-study-chapter"
            >
              {groupedSelectableChapters.map(([subjectLabel, items]) => (
                <optgroup key={subjectLabel} label={subjectLabel}>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.subject} · {item.title}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>


            {/* Quick Action Button for Visual Mind Map */}
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setMindMapOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/35 bg-indigo-500/10 px-3 py-1.5 text-xs font-mono font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20 transition cursor-pointer"
                title="Open Interactive Visual Mind Map"
              >
                <Compass size={13} />
                <span>Interactive Mind Map</span>
              </button>
            </div>

            <div className="mt-4 flex items-center gap-1 overflow-x-auto border-b border-border -mb-px">
              {tabs.map((item) => (
                <button
                  type="button"
                  key={item.value}
                  onClick={() => setTab(item.value)}
                  className={`focus-ring shrink-0 px-3.5 py-2 text-xs sm:text-[13px] font-medium transition-colors border-b-2 -mb-px cursor-pointer ${
                    tab === item.value
                      ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400 font-semibold'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                  data-testid={`button-study-tab-${item.value}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 animate-page-enter">
            {tab === 'learn' && (
              <LearnTab chapterId={activeChapterId} onOpenResources={() => setTab('videos')} />
            )}
            {tab === 'videos' && (
              <ResourceDiscoverySection
                chapterId={activeChapterId}
                chapterTitle={chapter?.title}
                subject={chapter?.subject}
              />
            )}
            {tab === 'subtopics' && (
              <ChapterSubtopicsCard
                chapterId={activeChapterId}
                chapterTitle={chapter?.title || 'Active Chapter'}
                subject={chapter?.subject}
                onAskBax={() => setTab('ai_guide')}
              />
            )}
            {tab === 'verify' && (
              <VerificationQuizRunner
                chapterId={activeChapterId}
                chapterTitle={chapter?.title || 'Active Chapter'}
                subjectName={chapter?.subject || 'Physics'}
                defaultType="CHAPTER_MASTERY"
                chapterMastery={activeChapterMastery}
                conceptMastery={activeConceptMastery}
                onCompleted={applyAssessmentSubmission}
              />
            )}
            {tab === 'ai_guide' && (
              <AIChapterGuide
                subject={chapter?.subject || 'PCM'}
                chapterName={chapter?.title || 'Active Chapter'}
              />
            )}
          </div>
        </div>

        <aside className="order-first space-y-5 lg:order-last">
          <FocusTimer
            chapterId={activeChapterId}
            defaultMinutes={user?.learningPreferences?.focusInterval || 25}
            userId={user?.uid}
            availableChapters={availableChapters}
            onChapterChange={(newId) => setChapterId(newId)}
          />

          <section className="border-t border-border pt-5" data-testid="card-study-reminder">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-primary">A useful sequence</p>
            <ol className="mt-4 space-y-3 text-sm leading-6">
              <li>
                <span className="mr-2 font-bold text-primary">01</span>Learn the core idea in one calm block.
              </li>
              <li>
                <span className="mr-2 font-bold text-primary">02</span>Check formulas &amp; mind maps with Bax AI.
              </li>
              <li>
                <span className="mr-2 font-bold text-primary">03</span>Clear each NCERT subtopic inside this chapter.
              </li>
            </ol>
          </section>
        </aside>
      </div>

      {/* Interactive Visual Mind Map Modal */}
      {mindMapOpen && (
        <MindMapModal
          chapterId={activeChapterId}
          chapterTitle={chapter?.title}
          subject={chapter?.subject}
          isOpen={mindMapOpen}
          onClose={() => setMindMapOpen(false)}
        />
      )}
    </div>
  );
}
