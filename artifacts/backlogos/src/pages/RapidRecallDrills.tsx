import { useState, useEffect, useMemo } from 'react';
import {
  Zap,
  RotateCcw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Trophy,
  ArrowRight,
  Flame,
  Shuffle,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Award,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Timer,
  Pause,
  Play,
  Lightbulb,
} from 'lucide-react';
import {
  DERIVATIONS_LIST,
  FORMULA_BLITZ_ITEMS,
  type InteractiveDerivation,
  type DerivationStep,
  type FormulaBlitzItem,
} from '@/lib/derivations-data';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';

const STORAGE_DERIVATIONS_COMPLETED_KEY = 'backlogos-completed-derivations';
const STORAGE_BLITZ_HIGHSCORE_KEY = 'backlogos-blitz-highscore';

export function RapidRecallDrills() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'blitz' | 'sequencer'>('blitz');

  // --- TAB 1: 60-SECOND FORMULA BLITZ STATE ---
  const [blitzSubject, setBlitzSubject] = useState<'All' | 'Physics' | 'Chemistry' | 'Mathematics'>('All');
  const [blitzItems, setBlitzItems] = useState<FormulaBlitzItem[]>([]);
  const [currentBlitzIndex, setCurrentBlitzIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [blitzScore, setBlitzScore] = useState(0);
  const [blitzStreak, setBlitzStreak] = useState(0);
  const [blitzFinished, setBlitzFinished] = useState(false);
  const [highScore, setHighScore] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem(STORAGE_BLITZ_HIGHSCORE_KEY) || '0', 10);
    } catch {
      return 0;
    }
  });

  // Filter and shuffle blitz items
  const filteredBlitzPool = useMemo(() => {
    if (blitzSubject === 'All') return FORMULA_BLITZ_ITEMS;
    return FORMULA_BLITZ_ITEMS.filter((item) => item.subject === blitzSubject);
  }, [blitzSubject]);

  const startBlitz = () => {
    const shuffled = [...filteredBlitzPool].sort(() => Math.random() - 0.5);
    setBlitzItems(shuffled);
    setCurrentBlitzIndex(0);
    setRevealed(false);
    setTimeLeft(60);
    setIsTimerRunning(true);
    setBlitzScore(0);
    setBlitzStreak(0);
    setBlitzFinished(false);
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            setBlitzFinished(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timeLeft]);

  const handleBlitzAnswer = (correct: boolean) => {
    if (correct) {
      const newScore = blitzScore + 1;
      const newStreak = blitzStreak + 1;
      setBlitzScore(newScore);
      setBlitzStreak(newStreak);
      if (newScore > highScore) {
        setHighScore(newScore);
        try {
          localStorage.setItem(STORAGE_BLITZ_HIGHSCORE_KEY, newScore.toString());
        } catch {
          // ignore
        }
      }
    } else {
      setBlitzStreak(0);
    }

    if (currentBlitzIndex + 1 < blitzItems.length) {
      setCurrentBlitzIndex((prev) => prev + 1);
      setRevealed(false);
    } else {
      // Loop or finish
      setBlitzFinished(true);
      setIsTimerRunning(false);
    }
  };

  const currentItem = blitzItems[currentBlitzIndex] || filteredBlitzPool[0];

  // --- TAB 2: DERIVATION SEQUENCER STATE ---
  const [selectedDerivationId, setSelectedDerivationId] = useState<string>(DERIVATIONS_LIST[0]?.id || '');
  const [scrambledSteps, setScrambledSteps] = useState<DerivationStep[]>([]);
  const [isSequenceChecked, setIsSequenceChecked] = useState(false);
  const [isSequenceCorrect, setIsSequenceCorrect] = useState(false);
  const [completedDerivations, setCompletedDerivations] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_DERIVATIONS_COMPLETED_KEY);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const activeDerivation = useMemo(() => {
    return DERIVATIONS_LIST.find((d) => d.id === selectedDerivationId) || DERIVATIONS_LIST[0];
  }, [selectedDerivationId]);

  // Scramble steps on derivation change
  useEffect(() => {
    if (activeDerivation) {
      const original = [...activeDerivation.steps];
      // Random shuffle ensuring not trivially in order
      const shuffled = [...original].sort(() => Math.random() - 0.5);
      setScrambledSteps(shuffled);
      setIsSequenceChecked(false);
      setIsSequenceCorrect(false);
    }
  }, [activeDerivation]);

  const moveStep = (index: number, direction: 'up' | 'down') => {
    if (isSequenceChecked) setIsSequenceChecked(false);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= scrambledSteps.length) return;

    const copy = [...scrambledSteps];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;
    setScrambledSteps(copy);
  };

  const checkSequence = () => {
    const isCorrect = scrambledSteps.every((step, idx) => step.stepNumber === idx + 1);
    setIsSequenceChecked(true);
    setIsSequenceCorrect(isCorrect);

    if (isCorrect) {
      const next = new Set(completedDerivations);
      next.add(activeDerivation.id);
      setCompletedDerivations(next);
      try {
        localStorage.setItem(STORAGE_DERIVATIONS_COMPLETED_KEY, JSON.stringify(Array.from(next)));
      } catch {
        // ignore
      }
      toast({
        title: 'Mastered 5-Mark Derivation! 🎯',
        description: 'Sequence perfectly arranged. You have verified all intermediate step boundaries!',
      });
    } else {
      toast({
        title: 'Sequence Mismatch',
        description: 'Review the step logic highlights below to identify where the boundary was violated.',
        variant: 'destructive',
      });
    }
  };

  const resetCurrentDerivation = () => {
    if (activeDerivation) {
      const shuffled = [...activeDerivation.steps].sort(() => Math.random() - 0.5);
      setScrambledSteps(shuffled);
      setIsSequenceChecked(false);
      setIsSequenceCorrect(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider text-amber-500">
              <Zap size={12} /> Rapid Recall Engine
            </span>
            <span className="font-mono text-xs text-muted-foreground">CBSE Board Exam Weapon</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl font-display">
            Formula Blitz & Derivation Sequencer
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Active retrieval for high-stakes formulas, SI units, and guaranteed 5-mark board derivations.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1 self-start rounded-md border border-border bg-card p-1 sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('blitz')}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition ${
              activeTab === 'blitz'
                ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Timer size={14} />
            <span>60s Formula Blitz</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sequencer')}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition ${
              activeTab === 'sequencer'
                ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sparkles size={14} />
            <span>Derivation Sequencer ({completedDerivations.size}/{DERIVATIONS_LIST.length})</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: 60-SECOND FORMULA BLITZ */}
      {/* ============================================================== */}
      {activeTab === 'blitz' && (
        <div className="mt-8 space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subject:</span>
              {(['All', 'Physics', 'Chemistry', 'Mathematics'] as const).map((sub) => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => {
                    setBlitzSubject(sub);
                    setIsTimerRunning(false);
                    setBlitzFinished(false);
                  }}
                  className={`rounded px-2.5 py-1 text-xs font-medium transition ${
                    blitzSubject === sub
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border bg-background text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-xs">
                <Trophy size={14} className="text-amber-500" />
                <span className="text-muted-foreground">High Score:</span>
                <span className="font-mono font-bold text-foreground">{highScore}</span>
              </div>
              {blitzStreak > 1 && (
                <div className="flex items-center gap-1 rounded bg-orange-500/10 px-2 py-0.5 text-xs font-bold text-orange-500">
                  <Flame size={13} /> {blitzStreak} Streak!
                </div>
              )}
            </div>
          </div>

          {/* Active Flashcard Screen */}
          {!isTimerRunning && !blitzFinished ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
                <Timer size={32} />
              </div>
              <h3 className="mt-4 text-xl font-bold text-foreground">Ready for 60-Second Formula Blitz?</h3>
              <p className="mt-2 max-w-md text-xs text-muted-foreground sm:text-sm">
                Recall board formulas, SI units, and examiner application traps in a 60-second rapid-fire drill. Test active retrieval without looking at notes.
              </p>
              <button
                type="button"
                onClick={startBlitz}
                className="mt-6 flex items-center gap-2 rounded-md bg-amber-500 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-black shadow-md hover:bg-amber-400 transition"
              >
                <Play size={16} fill="currentColor" /> Start 60-Second Drill
              </button>
            </div>
          ) : blitzFinished ? (
            /* Results Screen */
            <div className="rounded-xl border border-border bg-card p-6 text-center sm:p-10">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Trophy size={32} />
              </div>
              <h3 className="mt-4 text-2xl font-bold text-foreground font-display">Time's Up! Drill Complete</h3>
              <p className="mt-1 text-sm text-muted-foreground">Here is your rapid recall summary</p>

              <div className="mx-auto mt-6 grid max-w-sm grid-cols-2 gap-4">
                <div className="rounded-lg border border-border bg-muted/40 p-4">
                  <div className="text-2xl font-black font-mono text-primary">{blitzScore}</div>
                  <div className="text-xs text-muted-foreground">Formulas Recalled</div>
                </div>
                <div className="rounded-lg border border-border bg-muted/40 p-4">
                  <div className="text-2xl font-black font-mono text-amber-500">{highScore}</div>
                  <div className="text-xs text-muted-foreground">Personal Best</div>
                </div>
              </div>

              <div className="mt-8 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={startBlitz}
                  className="flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition shadow-xs"
                >
                  <RotateCcw size={14} /> Practice Again
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('sequencer')}
                  className="flex items-center gap-2 rounded-md border border-border bg-card px-5 py-2 text-xs font-semibold text-foreground hover:bg-muted transition"
                >
                  Go to Derivations <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ) : (
            /* Active Live Drill Card */
            <div className="space-y-4">
              {/* Timer & Progress Bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1 font-mono text-xs font-bold ${
                      timeLeft <= 10
                        ? 'bg-red-500/20 text-red-500 animate-pulse'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    <Timer size={14} />
                    <span>{timeLeft}s remaining</span>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">
                    Question {currentBlitzIndex + 1} of {blitzItems.length}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsTimerRunning((v) => !v)}
                    className="flex items-center gap-1 rounded border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {isTimerRunning ? <Pause size={12} /> : <Play size={12} />}
                    {isTimerRunning ? 'Pause' : 'Resume'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsTimerRunning(false);
                      setBlitzFinished(true);
                    }}
                    className="rounded border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Finish Early
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-amber-500 transition-all duration-300"
                  style={{ width: `${(timeLeft / 60) * 100}%` }}
                />
              </div>

              {/* Formula Blitz Flash Card */}
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm transition-all sm:p-8">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-sky-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-sky-500 uppercase">
                      {currentItem.subject}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">{currentItem.chapter}</span>
                  </div>
                  <span className="font-mono text-xs font-semibold text-foreground">{currentItem.conceptName}</span>
                </div>

                {/* Prompt */}
                <div className="py-6">
                  <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Formula Query:</p>
                  <h4 className="mt-2 text-lg sm:text-xl font-semibold text-foreground leading-relaxed">
                    "{currentItem.formulaPrompt}"
                  </h4>
                </div>

                {/* Reveal Answer Area */}
                {!revealed ? (
                  <div className="border-t border-border pt-4 text-center">
                    <button
                      type="button"
                      onClick={() => setRevealed(true)}
                      className="inline-flex items-center gap-2 rounded-md bg-muted px-6 py-2.5 text-xs font-bold text-foreground hover:bg-muted/80 transition"
                    >
                      <Sparkles size={14} className="text-amber-500" />
                      Reveal Target Formula & Model Answer
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 border-t border-border pt-4 animate-in fade-in duration-150">
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                      <p className="text-[11px] font-mono uppercase tracking-wider text-primary font-bold">
                        Target Formula (CBSE Standard):
                      </p>
                      <div className="mt-1 font-mono text-lg sm:text-xl font-bold text-foreground">
                        {currentItem.formulaAnswer}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <div>
                          <strong className="text-foreground">SI Units:</strong> {currentItem.siUnits}
                        </div>
                        <div>
                          <strong className="text-foreground">Exam Context:</strong> {currentItem.examApplication}
                        </div>
                      </div>
                    </div>

                    {currentItem.trickTip && (
                      <div className="flex items-start gap-2 rounded-md border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-muted-foreground">
                        <Lightbulb size={16} className="text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-amber-500">Examiner Trap / Shortcut:</span>{' '}
                          {currentItem.trickTip}
                        </div>
                      </div>
                    )}

                    {/* Self-Score Buttons */}
                    <div className="flex items-center justify-between pt-2">
                      <p className="text-xs text-muted-foreground">Did you recall this formula correctly?</p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleBlitzAnswer(false)}
                          className="flex items-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-500 hover:bg-red-500/20 transition"
                        >
                          <XCircle size={14} /> Missed It
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBlitzAnswer(true)}
                          className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition shadow-xs"
                        >
                          <CheckCircle2 size={14} /> Got It Right! (+1)
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: DERIVATION SEQUENCER */}
      {/* ============================================================== */}
      {activeTab === 'sequencer' && (
        <div className="mt-8 space-y-6">
          {/* Derivation Selector Bar */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-bold">
                  Select Board Derivation:
                </span>
                <p className="text-xs text-muted-foreground">Guaranteed 3M and 5M derivations with strict step-marking.</p>
              </div>

              <select
                value={selectedDerivationId}
                onChange={(e) => setSelectedDerivationId(e.target.value)}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {DERIVATIONS_LIST.map((d) => (
                  <option key={d.id} value={d.id}>
                    {completedDerivations.has(d.id) ? '✓ ' : ''}[{d.subject}] {d.title} ({d.boardImportance})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Derivation Challenge Card */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-3 border-b border-border/80 pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-sky-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-sky-500 uppercase">
                    {activeDerivation.subject} Class {activeDerivation.classNum}
                  </span>
                  <span className="rounded bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-500">
                    {activeDerivation.boardImportance}
                  </span>
                  {completedDerivations.has(activeDerivation.id) && (
                    <span className="flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-500">
                      <CheckCircle2 size={11} /> Mastered
                    </span>
                  )}
                </div>
                <h3 className="mt-2 text-xl sm:text-2xl font-bold text-foreground font-display">
                  {activeDerivation.title}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Chapter: <strong className="text-foreground">{activeDerivation.chapter}</strong>
                </p>
              </div>

              <div className="rounded-lg border border-border bg-muted/40 p-3 text-right">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
                  Target Proof Result:
                </span>
                <span className="font-mono text-sm font-bold text-foreground block mt-0.5">
                  {activeDerivation.finalFormula}
                </span>
              </div>
            </div>

            {/* Prerequisites */}
            <div className="my-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Prerequisites:</span>
              {activeDerivation.prerequisites.map((p, i) => (
                <span key={i} className="rounded bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                  {p}
                </span>
              ))}
            </div>

            {/* Instruction Banner */}
            <div className="rounded-md border border-sky-400/20 bg-sky-500/5 p-3 text-xs text-muted-foreground flex items-center justify-between">
              <span>
                Arrange the scrambled mathematical steps below into the exact chronological derivation sequence required by CBSE marking schemes.
              </span>
              <button
                type="button"
                onClick={resetCurrentDerivation}
                className="flex items-center gap-1 text-[11px] font-mono text-sky-500 hover:underline shrink-0 ml-2"
              >
                <RotateCcw size={11} /> Re-shuffle
              </button>
            </div>

            {/* Scrambled Steps List */}
            <div className="mt-6 space-y-3">
              {scrambledSteps.map((step, idx) => {
                const isCorrectPosition = step.stepNumber === idx + 1;
                return (
                  <div
                    key={step.id}
                    className={`rounded-lg border p-4 transition-all ${
                      isSequenceChecked
                        ? isCorrectPosition
                          ? 'border-emerald-500/50 bg-emerald-500/5'
                          : 'border-amber-500/50 bg-amber-500/5'
                        : 'border-border bg-background/50 hover:border-border/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-mono text-xs font-bold ${
                            isSequenceChecked
                              ? isCorrectPosition
                                ? 'bg-emerald-500 text-white'
                                : 'bg-amber-500 text-white'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {idx + 1}
                        </div>

                        <div>
                          <p className="text-xs sm:text-sm font-medium text-foreground">{step.text}</p>
                          {step.mathExpression && (
                            <div className="mt-2 inline-block rounded bg-muted/60 px-2.5 py-1 font-mono text-xs font-bold text-foreground">
                              {step.mathExpression}
                            </div>
                          )}

                          {isSequenceChecked && (
                            <div className="mt-2 text-xs">
                              {isCorrectPosition ? (
                                <span className="font-semibold text-emerald-500 flex items-center gap-1">
                                  <CheckCircle2 size={12} /> Correct Step {idx + 1}: {step.rationale}
                                </span>
                              ) : (
                                <span className="font-semibold text-amber-500 flex items-center gap-1">
                                  <AlertCircle size={12} /> This is Step {step.stepNumber} in official marking: {step.rationale}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Move Up/Down Controls */}
                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => moveStep(idx, 'up')}
                          disabled={idx === 0}
                          aria-label="Move step up"
                          className="rounded border border-border p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveStep(idx, 'down')}
                          disabled={idx === scrambledSteps.length - 1}
                          aria-label="Move step down"
                          className="rounded border border-border p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                        >
                          <ArrowDown size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Check Sequence CTA */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4">
              <div className="text-xs text-muted-foreground">
                {isSequenceChecked ? (
                  isSequenceCorrect ? (
                    <span className="font-semibold text-emerald-500">
                      ✓ All steps in perfect order! 5 full marks secured.
                    </span>
                  ) : (
                    <span className="font-semibold text-amber-500">
                      Check step highlights above and rearrange.
                    </span>
                  )
                ) : (
                  <span>Ensure boundary conditions and intermediate terms cancel properly.</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={checkSequence}
                  className="flex items-center gap-1.5 rounded-md bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition shadow-xs"
                >
                  <CheckCircle2 size={14} /> Check Derivation Sequence
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
