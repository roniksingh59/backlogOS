import { Check, ChevronLeft, ChevronRight, Clock3, ExternalLink, FileText, Pause, Play, RotateCcw, Save, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { chapters, getStudyContent, type StudentPlan } from '@/lib/backlog-data';
import { readNotes, readPlan, saveNote, saveStudySession } from '@/lib/storage';
import { AIChapterGuide } from '@/components/AIChapterGuide';
import { PracticeTracker } from '@/components/PracticeTracker';
import { ChapterSubtopicsCard } from '@/components/ChapterSubtopicsCard';
import { ResourceDiscoverySection } from '@/components/resources/ResourceDiscoverySection';

type StudyTab = 'learn' | 'videos' | 'subtopics' | 'ai_guide' | 'cards' | 'quiz' | 'notes';

function EmptyStudy() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6 sm:py-28 font-sans">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded border border-border bg-muted/40 text-foreground">
        <Sparkles size={18} />
      </div>
      <p className="mt-4 text-xs font-mono uppercase tracking-widest text-muted-foreground">Study Room</p>
      <h1 className="font-display mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
        Give your study plan a focused space.
      </h1>
      <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground leading-relaxed">
        Select a chapter from your backlog or generate a recovery plan to unlock chapter explainers, curated video lectures, flashcards, and the focus timer.
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
  onChapterChange,
}: {
  chapterId: string;
  defaultMinutes: number;
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
    });
    setLogged(true);
    setLoggedMsg(`Logged ${mins}m for ${selectedTask}! Backlog updated.`);
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
    'Concept Learning & Theory Notes',
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
        <div className="grid grid-cols-2 gap-2">
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
              className="w-full truncate rounded border border-border bg-background text-foreground px-2 py-1 text-xs font-mono focus:outline-hidden"
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

      <p className="mt-5 text-center font-mono text-5xl font-bold tracking-tight text-foreground" data-testid="text-timer">
        {minutes}:{secs}
      </p>

      <div className="mt-4 flex justify-center gap-1.5 font-mono text-xs">
        {[15, 25, 45, 60].map((value) => (
          <button
            type="button"
            key={value}
            onClick={() => setTimer(value)}
            className={`rounded border px-2.5 py-0.5 text-xs transition ${
              duration === value
                ? 'bg-foreground text-background border-foreground font-bold'
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
          className="focus-ring inline-flex items-center gap-2 rounded bg-foreground px-5 py-2 text-xs font-mono font-bold text-background shadow-xs hover:bg-foreground/90 transition"
          data-testid="button-timer-toggle"
        >
          {running ? <Pause size={14} /> : <Play size={14} className="fill-current" />}
          {running ? 'Pause' : seconds === 0 ? 'Restart' : 'START FOCUS'}
        </button>

        <button
          type="button"
          onClick={reset}
          className="focus-ring grid h-8 w-8 place-items-center rounded border border-border bg-card text-muted-foreground hover:text-foreground"
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
  const content = getStudyContent(chapterId);
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

function CardsTab({ chapterId }: { chapterId: string }) {
  const cards = getStudyContent(chapterId).flashcards;
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = cards[index];

  const move = (step: number) => {
    setIndex((value) => (value + step + cards.length) % cards.length);
    setFlipped(false);
  };

  return (
    <section className="rounded-md border border-border bg-card p-5 sm:p-6" data-testid="section-flashcards">
      <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">Active recall</p>
          <h2 className="font-display mt-0.5 text-base sm:text-lg font-bold text-foreground">Flashcards</h2>
        </div>
        <span className="text-xs font-mono text-muted-foreground">{index + 1} / {cards.length}</span>
      </div>
      <button
        type="button"
        onClick={() => setFlipped((value) => !value)}
        className="focus-ring mt-6 min-h-48 w-full rounded-md border border-border bg-muted/20 p-6 text-center transition hover:bg-muted/30"
        data-testid="button-flashcard-flip"
      >
        <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">{flipped ? 'Answer' : 'Prompt'}</p>
        <p className="mx-auto mt-4 max-w-xl font-display text-xl sm:text-2xl font-bold leading-relaxed text-foreground">{flipped ? card.back : card.front}</p>
        <p className="mt-4 text-[11px] font-mono text-muted-foreground">Click to flip card</p>
      </button>
      <div className="mt-5 flex justify-between gap-3 font-mono text-xs">
        <button
          type="button"
          onClick={() => move(-1)}
          className="focus-ring inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 font-medium text-foreground hover:bg-muted"
          data-testid="button-flashcard-previous"
        >
          <ChevronLeft size={14} /> Previous
        </button>
        <button
          type="button"
          onClick={() => move(1)}
          className="focus-ring inline-flex items-center gap-1.5 rounded-md bg-foreground text-background px-3 py-1.5 font-bold hover:bg-foreground/90 transition shadow-2xs"
          data-testid="button-flashcard-next"
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    </section>
  );
}

function QuizTab({ chapterId }: { chapterId: string }) {
  const questions = getStudyContent(chapterId).quiz;
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const answered = Object.keys(answers).length;
  const score = questions.filter((question, index) => answers[index] === question.answer).length;

  return (
    <section className="space-y-4" data-testid="section-quiz">
      <div className="rounded-md border border-border bg-card p-5 sm:p-6">
        <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">Quick check</p>
        <h2 className="font-display mt-0.5 text-base sm:text-lg font-bold text-foreground">Can you retrieve it?</h2>
        <p className="mt-1 text-xs text-muted-foreground">Choose an answer. Instant explanation appears below.</p>
        {questions.map((question, index) => {
          const selected = answers[index];
          const isCorrect = selected === question.answer;
          return (
            <div key={question.question} className="mt-5 border-t border-border pt-4 first:border-0 first:pt-0">
              <p className="text-xs sm:text-sm font-semibold text-foreground leading-relaxed">{index + 1}. {question.question}</p>
              <div className="mt-2.5 grid gap-1.5 font-mono text-xs">
                {question.options.map((option, optionIndex) => (
                  <button
                    type="button"
                    key={option}
                    onClick={() => setAnswers((current) => ({ ...current, [index]: optionIndex }))}
                    className={`focus-ring rounded-md border p-2.5 text-left transition ${
                      selected === optionIndex
                        ? optionIndex === question.answer
                          ? 'border-foreground bg-foreground text-background font-bold'
                          : 'border-destructive bg-destructive/10 text-foreground'
                        : 'border-border bg-card text-foreground hover:bg-muted'
                    }`}
                    data-testid={`button-quiz-${index}-${optionIndex}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              {selected !== undefined && (
                <p className={`mt-2 rounded p-2 text-xs font-mono leading-relaxed ${isCorrect ? 'bg-muted text-foreground' : 'bg-destructive/10 text-foreground'}`}>
                  <strong>{isCorrect ? 'Correct.' : 'Incorrect.'}</strong> {question.explanation}
                </p>
              )}
            </div>
          );
        })}
        <div className="mt-5 rounded border border-border bg-muted/20 p-2.5 text-xs font-mono font-bold text-foreground" data-testid="text-quiz-score">
          {answered === questions.length ? `Final Score: ${score} / ${questions.length}` : `${answered} of ${questions.length} questions answered`}
        </div>
      </div>
    </section>
  );
}

function NotesTab({ chapterId }: { chapterId: string }) {
  const [note, setNote] = useState(() => readNotes()[chapterId] ?? '');

  useEffect(() => {
    setNote(readNotes()[chapterId] ?? '');
  }, [chapterId]);

  useEffect(() => {
    const timer = window.setTimeout(() => saveNote(chapterId, note), 350);
    return () => window.clearTimeout(timer);
  }, [chapterId, note]);

  return (
    <section className="rounded-md border border-border bg-card p-5 sm:p-6" data-testid="section-notes">
      <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">Your words</p>
          <h2 className="font-display mt-0.5 text-base sm:text-lg font-bold text-foreground">Chapter notes</h2>
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
          <Save size={12} /> Auto-saved
        </span>
      </div>
      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Record what feels shaky, key formulas, or questions for your next session…"
        className="focus-ring mt-4 min-h-60 w-full resize-y rounded-md border border-border bg-background p-3 text-xs leading-relaxed text-foreground font-mono"
        data-testid="textarea-chapter-notes"
      />
      <p className="mt-2 text-[10px] font-mono text-muted-foreground">{note.length} characters recorded.</p>
    </section>
  );
}

export function Study() {
  const plan = readPlan();
  const [chapterId, setChapterId] = useState(() => (plan ? getInitialChapter(plan) : ''));
  const [tab, setTab] = useState<StudyTab>('learn');

  if (!plan) return <EmptyStudy />;

  const availableChapters = plan.plannedChapterIds
    .map((id) => chapters.find((chapter) => chapter.id === id))
    .filter((chapter) => chapter);
  const chapter = availableChapters.find((item) => item!.id === chapterId) ?? availableChapters[0];
  const activeChapterId = chapter?.id ?? plan.chapterIds[0];

  const tabs: { value: StudyTab; label: string }[] = [
    { value: 'learn', label: 'Learn' },
    { value: 'videos', label: '📚 Resources & Videos' },
    { value: 'subtopics', label: '📑 NCERT Topics' },
    { value: 'ai_guide', label: '✨ Ask Bax' },
    { value: 'cards', label: 'Flashcards' },
    { value: 'quiz', label: 'Quick quiz' },
    { value: 'notes', label: 'Notes' },
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
            Read it, retrieve it, check formulas with AI, practice PYQs, then leave yourself a useful note.
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
            <label className="text-xs font-bold uppercase tracking-[.16em] text-primary">
              Choose a chapter
              <select
                value={activeChapterId}
                onChange={(event) => {
                  setChapterId(event.target.value);
                  setTab('learn');
                }}
                className="focus-ring mt-2 w-full rounded-lg border border-input bg-background px-4 py-3 text-sm font-semibold"
                data-testid="select-study-chapter"
              >
                {availableChapters.map((item) => (
                  <option key={item!.id} value={item!.id}>
                    {item!.subject} · {item!.title}
                  </option>
                ))}
              </select>
            </label>

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
                onInsertNote={(text) => {
                  const currentNotes = readNotes()[activeChapterId] || '';
                  saveNote(activeChapterId, `${currentNotes}\n\n--- AI Study Guide ---\n${text}`.trim());
                  setTab('notes');
                }}
              />
            )}
            {tab === 'cards' && <CardsTab chapterId={activeChapterId} />}
            {tab === 'quiz' && <QuizTab chapterId={activeChapterId} />}
            {tab === 'notes' && <NotesTab chapterId={activeChapterId} />}
          </div>
        </div>

        <aside className="order-first space-y-5 lg:order-last">
          <FocusTimer
            chapterId={activeChapterId}
            defaultMinutes={plan.minutesPerDay}
            onChapterChange={(newId) => setChapterId(newId)}
          />

          {/* 3-Phase Practice & PYQ Tracker */}
          <PracticeTracker
            chapterId={activeChapterId}
            chapterTitle={chapter?.title || ''}
            subject={chapter?.subject}
          />

          <section className="border-t-2 border-foreground/15 pt-5" data-testid="card-study-reminder">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-primary">A useful sequence</p>
            <ol className="mt-4 space-y-3 text-sm leading-6">
              <li>
                <span className="mr-2 font-bold text-primary">01</span>Learn the idea without copying.
              </li>
              <li>
                <span className="mr-2 font-bold text-primary">02</span>Close the page and retrieve with AI/cards.
              </li>
              <li>
                <span className="mr-2 font-bold text-primary">03</span>Practice 10 PYQs you can solve timed.
              </li>
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}
