import { Check, Clock3, FileText, Pause, Play, RotateCcw, Compass, Loader2 } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { Link } from 'wouter';
import { chapters, getChapterOverview, type StudentPlan, type Subject } from '@/lib/backlog-data';
import { readPlan, saveStudySession } from '@/lib/storage';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { saveStudySessionDirect } from '@/lib/supabase-service';
import { AIChapterGuide } from '@/components/AIChapterGuide';
import { ChapterSubtopicsCard } from '@/components/ChapterSubtopicsCard';
import { ResourceDiscoverySection } from '@/components/resources/ResourceDiscoverySection';
import { MindMapModal } from '@/components/resources/MindMapModal';
import { triggerGrandCelebration } from '@/lib/celebration';
import { useAuth } from '@/lib/auth-context';
import { useBacklogItems } from '@/hooks/use-backlog-items';


type StudyTab = 'learn' | 'videos' | 'subtopics' | 'ai_guide';

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
          className="focus-ring inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2 font-bold text-background hover:bg-foreground/90 transition shadow-2xs"
          data-testid="link-study-open-dashboard"
        >
          Open Dashboard
        </Link>
        <Link
          href="/onboarding"
          className="focus-ring inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 font-medium text-foreground hover:bg-muted transition"
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
  onChapterChange,
}: {
  chapterId: string;
  defaultMinutes: number;
  userId?: string;
  onChapterChange?: (newChapterId: string) => void;
}) {
  const currentChapter = chapters.find((c) => c.id === chapterId) || chapters[0];
  const [selectedSubject, setSelectedSubject] = useState<Subject>(currentChapter.subject);
  const [selectedChapterId, setSelectedChapterId] = useState<string>(chapterId);
  const [selectedTask, setSelectedTask] = useState<string>('Practice Questions & PYQs');

  const [duration, setDuration] = useState(25);
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [logged, setLogged] = useState(false);
  const [loggedMsg, setLoggedMsg] = useState<string | null>(null);
  const { items: selectedBacklogItems, loading: selectedBacklogLoading } = useBacklogItems(
    userId,
    selectedChapterId,
  );

  useEffect(() => {
    setSelectedChapterId(chapterId);
    const ch = chapters.find((c) => c.id === chapterId);
    if (ch) setSelectedSubject(ch.subject);
  }, [chapterId]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  const handleRecordCompletedSession = (mins: number) => {
    saveStudySession({
      id: `${Date.now()}-${selectedChapterId}`,
      chapterId: selectedChapterId,
      minutes: mins,
      completedAt: new Date().toISOString(),
      mode: 'focus',
      taskId: selectedTask,
    }, userId);

    if (userId && !userId.startsWith('guest-')) {
      saveStudySessionDirect({
        chapterId: selectedChapterId,
        minutes: mins,
        mode: 'focus',
      }, userId).catch(() => {});
    }

    setLogged(true);
    setLoggedMsg(`Logged ${mins}m for ${selectedTask}! Backlog updated.`);
    triggerGrandCelebration();
    setTimeout(() => setLoggedMsg(null), 4000);
  };

  useEffect(() => {
    if (seconds === 0 && running) {
      setRunning(false);
      handleRecordCompletedSession(duration);
    }
  }, [seconds, running, duration, selectedChapterId, selectedTask]);

  const setTimer = (minutes: number) => {
    setDuration(minutes);
    setSeconds(minutes * 60);
    setRunning(false);
    setLogged(false);
  };

  const reset = () => {
    setSeconds(duration * 60);
    setRunning(false);
  };

  const minutes = `${Math.floor(seconds / 60)}`.padStart(2, '0');
  const secs = `${seconds % 60}`.padStart(2, '0');

  const logSession = () => {
    handleRecordCompletedSession(duration);
  };

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
                setSelectedSubject(sub);
                const first = chapters.find((c) => c.subject === sub);
                if (first) {
                  setSelectedChapterId(first.id);
                  if (onChapterChange) onChapterChange(first.id);
                }
              }}
              className="w-full rounded border border-border bg-background text-foreground px-2 py-1 text-xs font-mono focus:outline-hidden"
            >
              <option value="Physics">Physics</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Mathematics">Mathematics</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase text-muted-foreground block mb-0.5">
              Chapter
            </label>
            <select
              value={selectedChapterId}
              onChange={(e) => {
                setSelectedChapterId(e.target.value);
                if (onChapterChange) onChapterChange(e.target.value);
              }}
              className="w-full rounded border border-border bg-background text-foreground px-2 py-1 text-xs font-mono focus:outline-hidden"
            >
              {chapters
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
            onChange={(e) => setSelectedTask(e.target.value)}
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
          onClick={() => setRunning((value) => !value)}
          className={`focus-ring inline-flex items-center gap-2 rounded px-5 py-2 text-xs font-mono font-bold text-background shadow-xs hover:bg-foreground/90 transition btn-press ${
            running ? 'bg-amber-600 dark:bg-amber-500' : 'bg-foreground'
          }`}
          data-testid="button-timer-toggle"
        >
          {running ? <Pause size={14} /> : <Play size={14} className="fill-current" />}
          {running ? 'Pause' : seconds === 0 ? 'Restart' : 'START FOCUS'}
        </button>

        <button
          type="button"
          onClick={reset}
          className="focus-ring grid h-8 w-8 place-items-center rounded border border-border bg-card text-muted-foreground hover:text-foreground btn-press"
          aria-label="Reset timer"
          data-testid="button-timer-reset"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      <button
        type="button"
        onClick={logSession}
        disabled={logged}
        className="focus-ring mx-auto mt-3.5 flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground disabled:cursor-default disabled:opacity-50 hover:text-foreground transition"
        data-testid="button-log-session"
      >
        {logged ? <Check size={13} className="text-emerald-500" /> : <Clock3 size={13} />}
        {logged ? 'Study block logged to backlog' : `Log ${duration}m block to backlog`}
      </button>

      {loggedMsg && (
        <div className="mt-3 border border-emerald-500/30 bg-emerald-500/10 p-2 text-center text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
          {loggedMsg}
        </div>
      )}

      <p className="mt-3 text-center text-[11px] text-primary-foreground/60">
        Suggested pace: {defaultMinutes} min/day · Auto-updates BacklogOS metrics
      </p>
    </section>
  );
}

function LearnTab({ chapterId }: { chapterId: string }) {
  const content = getChapterOverview(chapterId);
  const chapter = chapters.find((item) => item.id === chapterId);

  return (
    <div className="space-y-6">
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

      {/* Visual & Context-Aware Resource Discovery with Embedded YouTube Player */}
      <ResourceDiscoverySection
        chapterId={chapterId}
        chapterTitle={chapter?.title}
        subject={chapter?.subject}
      />
    </div>
  );
}

export function Study() {
  const { user } = useAuth();
  const [plan, setPlan] = useState<StudentPlan | null>(() => readPlan(user?.uid));
  const [chapterId, setChapterId] = useState(() => (plan ? getInitialChapter(plan) : ''));
  const [tab, setTab] = useState<StudyTab>('learn');
  const [mindMapOpen, setMindMapOpen] = useState(false);

  useEffect(() => {
    const updated = readPlan(user?.uid);
    setPlan(updated);
    if (updated) {
      setChapterId((prev) => (prev && updated.plannedChapterIds.includes(prev) ? prev : getInitialChapter(updated)));
    }
  }, [user?.uid]);

  useEffect(() => {
    const handlePlanUpdate = () => {
      const updated = readPlan(user?.uid);
      setPlan(updated);
      if (updated) {
        setChapterId((prev) => (prev && updated.plannedChapterIds.includes(prev) ? prev : getInitialChapter(updated)));
      }
    };
    window.addEventListener('backlogos-plan-updated', handlePlanUpdate);
    window.addEventListener('storage', handlePlanUpdate);
    return () => {
      window.removeEventListener('backlogos-plan-updated', handlePlanUpdate);
      window.removeEventListener('storage', handlePlanUpdate);
    };
  }, [user?.uid]);

  if (!plan) return <EmptyStudy />;

  // Resolve active chapter dynamically from curriculum or plan without hardcoded fallbacks
  const chapter = useMemo(() => {
    return chapters.find((c) => c.id === chapterId) ||
      chapters.find((c) => plan.plannedChapterIds?.includes(c.id)) ||
      chapters[0];
  }, [chapterId, plan.plannedChapterIds]);

  const activeChapterId = chapter.id;

  // Requirement 1: Clean lifecycle refetch from Supabase using .eq('chapter_id', activeChapterId)
  const [chapterBacklogItems, setChapterBacklogItems] = useState<any[]>([]);
  const [isFetchingChapterData, setIsFetchingChapterData] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    async function refetchChapterData() {
      if (!activeChapterId) return;
      setIsFetchingChapterData(true);
      try {
        if (isSupabaseConfigured) {
          const { data, error } = await supabase
            .from('backlog_items')
            .select('*')
            .eq('chapter_id', activeChapterId);

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
  }, [activeChapterId]);

  const tabs: { value: StudyTab; label: string }[] = [
    { value: 'learn', label: 'Learn' },
    { value: 'videos', label: '📚 Resources & Videos' },
    { value: 'subtopics', label: '📑 NCERT Topics' },
    { value: 'ai_guide', label: '✨ Ask Bax' },
  ];

  return (
    <div className="human-layout mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-16 animate-page-enter">
      <div className="flex flex-col gap-4 border-b border-border/70 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-primary">Study room</p>
          <h1 className="font-display mt-3 text-4xl leading-tight tracking-[-.03em] sm:text-6xl">
            Study one chapter properly.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
            Master the core idea, watch curated lectures, verify formulas with Bax, and clear every NCERT subtopic in order.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="focus-ring inline-flex items-center gap-2 self-start rounded-lg border border-border bg-card px-4 py-3 text-sm font-bold hover:bg-muted"
          data-testid="link-study-dashboard"
        >
          <FileText size={16} /> Back to dashboard
        </Link>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <div className="border-y border-border py-4 sm:py-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-[.16em] text-primary">
                Choose a chapter
              </label>
              {isFetchingChapterData && (
                <span className="flex items-center gap-1 text-[11px] font-mono text-sky-500 animate-pulse">
                  <Loader2 size={12} className="animate-spin" />
                  <span>Syncing with Supabase...</span>
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
              {/* Physics */}
              <optgroup label="Physics">
                {chapters
                  .filter((c) => c.subject === 'Physics')
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      Physics · {item.title}
                    </option>
                  ))}
              </optgroup>

              {/* Chemistry */}
              <optgroup label="Chemistry">
                {chapters
                  .filter((c) => c.subject === 'Chemistry')
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      Chemistry · {item.title}
                    </option>
                  ))}
              </optgroup>

              {/* Mathematics */}
              <optgroup label="Mathematics">
                {chapters
                  .filter((c) => c.subject === 'Mathematics')
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      Mathematics · {item.title}
                    </option>
                  ))}
              </optgroup>
            </select>


            {/* Quick Action Button for Visual Mind Map */}
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setMindMapOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-mono font-bold text-primary hover:bg-primary/20 transition shadow-2xs"
                title="Open Interactive Visual Mind Map"
              >
                <Compass size={13} />
                <span>🧠 Interactive Mind Map</span>
              </button>
            </div>

            <div className="mt-4 flex items-center gap-1 overflow-x-auto border-b border-border -mb-px">
              {tabs.map((item) => (
                <button
                  type="button"
                  key={item.value}
                  onClick={() => setTab(item.value)}
                  className={`focus-ring shrink-0 px-3.5 py-2 text-xs sm:text-[13px] font-medium transition-colors border-b-2 -mb-px ${
                    tab === item.value
                      ? 'border-foreground text-foreground font-semibold'
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
            {tab === 'learn' && <LearnTab chapterId={activeChapterId} />}
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
            defaultMinutes={plan.minutesPerDay}
            userId={user?.uid}
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
