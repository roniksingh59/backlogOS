import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flag,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Target,
  XCircle,
} from 'lucide-react';
import { Link } from 'wouter';
import { useAuth } from '@/lib/auth-context';
import {
  generateAssessmentSet,
  startAssessmentAttempt,
  submitAssessmentAttempt,
  submitQuestionFeedback,
  type AssessmentAttemptSummary,
  type AssessmentSetSummary,
  type AssessmentType,
  type SubmitAssessmentResponse,
  type VerificationQuestion,
} from '@/lib/verification/verification-service';
import type { ChapterMasteryRecord, ChapterMasteryStatus, ConceptMasteryRecord } from '@/lib/engines/types';

interface VerificationQuizRunnerProps {
  chapterId: string;
  chapterTitle: string;
  subjectName: string;
  defaultType?: AssessmentType;
  objectiveId?: string | null;
  objectiveTitle?: string;
  reviewScheduleId?: string | null;
  chapterMastery?: ChapterMasteryRecord | null;
  conceptMastery?: ConceptMasteryRecord[];
  onCompleted?: (
    response: SubmitAssessmentResponse,
    context: { chapterId: string; objectiveId?: string | null; reviewScheduleId?: string | null }
  ) => Promise<void> | void;
  onClose?: () => void;
}

const CHAPTER_STATUS_COPY: Record<
  ChapterMasteryStatus,
  { label: string; tone: string; hint: string }
> = {
  NOT_STARTED: {
    label: 'Not Started',
    tone: 'text-muted-foreground border-border bg-muted/30',
    hint: 'Study chapter concepts before attempting mastery verification.',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    tone: 'text-sky-700 dark:text-sky-300 border-sky-500/30 bg-sky-500/10',
    hint: 'Objectives are underway. Complete objectives or test understanding anytime.',
  },
  STUDY_COMPLETE: {
    label: 'Study Complete (Unverified)',
    tone: 'text-amber-700 dark:text-amber-300 border-amber-500/35 bg-amber-500/10',
    hint: 'Objectives studied, but chapter is NOT MASTERED until Chapter Mastery assessment passes.',
  },
  MASTERY_PENDING: {
    label: 'Mastery Pending',
    tone: 'text-indigo-700 dark:text-indigo-300 border-indigo-500/35 bg-indigo-500/10',
    hint: 'Pass the 15–25 question Chapter Mastery exam with required concept coverage.',
  },
  MASTERED: {
    label: 'Mastered',
    tone: 'text-emerald-700 dark:text-emerald-300 border-emerald-500/35 bg-emerald-500/10',
    hint: 'Server-verified chapter mastery achieved. Spaced retention intervals active.',
  },
  NEEDS_REVISION: {
    label: 'Needs Revision',
    tone: 'text-rose-700 dark:text-rose-300 border-rose-500/35 bg-rose-500/10',
    hint: 'Prior study & peak score preserved. Pass a targeted revision check to restore full retention health.',
  },
};

export function VerificationQuizRunner({
  chapterId,
  chapterTitle,
  subjectName,
  defaultType = 'OBJECTIVE',
  objectiveId = null,
  objectiveTitle,
  reviewScheduleId = null,
  chapterMastery,
  conceptMastery = [],
  onCompleted,
  onClose,
}: VerificationQuizRunnerProps) {
  const { user } = useAuth();
  const isGuest = !user || user.isGuest;

  const [assessmentType, setAssessmentType] = useState<AssessmentType>(defaultType);
  const [questionCount, setQuestionCount] = useState<number>(
    defaultType === 'CHAPTER_MASTERY' ? 15 : defaultType === 'REVISION' ? 5 : 4
  );
  const [passThreshold, setPassThreshold] = useState<number>(
    defaultType === 'CHAPTER_MASTERY' ? 75 : 70
  );

  const [phase, setPhase] = useState<'setup' | 'loading' | 'active' | 'submitting' | 'graded' | 'error'>('setup');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [assessmentSet, setAssessmentSet] = useState<AssessmentSetSummary | null>(null);
  const [attempt, setAttempt] = useState<AssessmentAttemptSummary | null>(null);
  const [questions, setQuestions] = useState<VerificationQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, 'A' | 'B' | 'C' | 'D'>>({});
  const [gradedResult, setGradedResult] = useState<SubmitAssessmentResponse | null>(null);

  const [flagQuestionId, setFlagQuestionId] = useState<string | null>(null);
  const [flagReason, setFlagReason] = useState<'ambiguous' | 'incorrect_answer' | 'out_of_syllabus' | 'duplicate' | 'typo' | 'other'>('ambiguous');
  const [flagComment, setFlagComment] = useState('');
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set());
  const [flagBusy, setFlagBusy] = useState(false);

  const startedAtRef = useRef<number>(Date.now());
  const perQuestionStartRef = useRef<number>(Date.now());
  const timeSpentMapRef = useRef<Record<string, number>>({});

  useEffect(() => {
    setAssessmentType(defaultType);
    setQuestionCount(defaultType === 'CHAPTER_MASTERY' ? 15 : defaultType === 'REVISION' ? 5 : 4);
    setPassThreshold(defaultType === 'CHAPTER_MASTERY' ? 75 : 70);
    setPhase('setup');
    setErrorMessage(null);
    setGradedResult(null);
    setSelectedAnswers({});
    setQuestions([]);
    setCurrentIndex(0);
  }, [chapterId, objectiveId, defaultType]);

  const recordQuestionTime = (qId?: string) => {
    if (!qId) return;
    const elapsed = Math.max(1, Math.round((Date.now() - perQuestionStartRef.current) / 1000));
    timeSpentMapRef.current[qId] = (timeSpentMapRef.current[qId] || 0) + elapsed;
    perQuestionStartRef.current = Date.now();
  };

  const handleStartVerification = async (forceRegenerate = false) => {
    setPhase('loading');
    setErrorMessage(null);
    setGradedResult(null);
    setSelectedAnswers({});
    timeSpentMapRef.current = {};

    try {
      const genRes = await generateAssessmentSet({
        assessmentType,
        chapterId,
        chapterTitle,
        subjectName,
        objectiveId: assessmentType === 'OBJECTIVE' ? objectiveId : null,
        objectiveTitle,
        questionCount,
        passThresholdPercent: passThreshold,
        requiredConceptCoveragePercent: assessmentType === 'CHAPTER_MASTERY' ? 70 : 60,
        forceRegenerate,
      });

      const startRes = await startAssessmentAttempt(genRes.assessmentSet.id, forceRegenerate);
      setAssessmentSet(startRes.assessmentSet);
      setAttempt(startRes.attempt);
      setQuestions(startRes.questions);
      setCurrentIndex(0);
      startedAtRef.current = Date.now();
      perQuestionStartRef.current = Date.now();
      setPhase('active');
    } catch (err: any) {
      setErrorMessage(
        err?.message ||
          'Could not start AI verification assessment. Confirm Supabase Edge Functions are deployed and you are signed in.'
      );
      setPhase('error');
    }
  };

  const handleSelectOption = (qId: string, optionId: 'A' | 'B' | 'C' | 'D') => {
    setSelectedAnswers((prev) => ({ ...prev, [qId]: optionId }));
  };

  const handleNavigateQuestion = (nextIdx: number) => {
    recordQuestionTime(questions[currentIndex]?.id);
    setCurrentIndex(nextIdx);
  };

  const handleSubmitAttempt = async () => {
    if (!attempt) return;
    recordQuestionTime(questions[currentIndex]?.id);

    setPhase('submitting');
    setErrorMessage(null);

    try {
      const durationSeconds = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
      const answersPayload = questions.map((q) => ({
        questionId: q.id,
        selectedOptionId: selectedAnswers[q.id] || '',
        timeSpentSeconds: timeSpentMapRef.current[q.id] || 0,
      }));

      const res = await submitAssessmentAttempt({
        attemptId: attempt.id,
        answers: answersPayload,
        durationSeconds,
        reviewScheduleId,
      });

      setGradedResult(res);
      setPhase('graded');
      if (onCompleted) {
        await onCompleted(res, {
          chapterId,
          objectiveId: assessmentType === 'OBJECTIVE' ? objectiveId : null,
          reviewScheduleId,
        });
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to evaluate assessment answers.');
      setPhase('error');
    }
  };

  const handleSendFeedback = async () => {
    if (!flagQuestionId) return;
    setFlagBusy(true);
    try {
      await submitQuestionFeedback({
        questionId: flagQuestionId,
        assessmentSetId: assessmentSet?.id || null,
        reason: flagReason,
        comment: flagComment.trim() || undefined,
      });
      setFlaggedIds((prev) => new Set([...prev, flagQuestionId]));
      setFlagQuestionId(null);
      setFlagComment('');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not record question feedback.');
    } finally {
      setFlagBusy(false);
    }
  };

  const currentChapterStatus: ChapterMasteryStatus = chapterMastery?.status || 'NOT_STARTED';
  const statusMeta = CHAPTER_STATUS_COPY[currentChapterStatus];
  const answeredCount = questions.filter((q) => Boolean(selectedAnswers[q.id])).length;
  const activeQuestion = questions[currentIndex];

  return (
    <section
      className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-5"
      data-testid="panel-verification-runner"
    >
      {/* Header Strip */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-muted-foreground">
            <span className="inline-flex items-center gap-1 font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              <ShieldCheck size={13} />
              Learning Verification Engine
            </span>
            <span aria-hidden="true">·</span>
            <span>{subjectName}</span>
            <span aria-hidden="true">·</span>
            <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-bold ${statusMeta.tone}`}>
              {statusMeta.label}
            </span>
          </div>
          <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight text-foreground truncate">
            {objectiveTitle ? `${chapterTitle} · ${objectiveTitle}` : chapterTitle}
          </h2>
          <p className="text-xs text-muted-foreground">{statusMeta.hint}</p>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-mono text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Close
          </button>
        )}
      </div>

      {/* Mode & Setup Screen */}
      {phase === 'setup' && (
        <div className="space-y-5">
          {isGuest && (
            <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 p-3.5 text-xs text-amber-800 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2">
                <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-500" />
                <span>
                  Sign in with Google or Email so BacklogOS can verify answers securely server-side without exposing answer keys to your browser.
                </span>
              </div>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-md bg-amber-600 px-3 py-1.5 text-xs font-mono font-bold text-white hover:bg-amber-500 transition shrink-0 whitespace-nowrap"
              >
                Sign In to Verify
              </Link>
            </div>
          )}

          {/* Mode Selector Tabs */}
          <div className="grid gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => {
                setAssessmentType('OBJECTIVE');
                setQuestionCount(4);
                setPassThreshold(70);
              }}
              className={`rounded-lg border p-3.5 text-left transition cursor-pointer ${
                assessmentType === 'OBJECTIVE'
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-border bg-background hover:bg-muted/40'
              }`}
              data-testid="button-mode-objective"
            >
              <div className="flex items-center justify-between text-xs font-mono font-bold text-foreground">
                <span>Objective Check</span>
                <span className="tabular-nums text-indigo-600 dark:text-indigo-400">3–5 Q</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Targeted conceptual check for an individual study objective.
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setAssessmentType('CHAPTER_MASTERY');
                setQuestionCount(15);
                setPassThreshold(75);
              }}
              className={`rounded-lg border p-3.5 text-left transition cursor-pointer ${
                assessmentType === 'CHAPTER_MASTERY'
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-border bg-background hover:bg-muted/40'
              }`}
              data-testid="button-mode-chapter-mastery"
            >
              <div className="flex items-center justify-between text-xs font-mono font-bold text-foreground">
                <span>Chapter Mastery Exam</span>
                <span className="tabular-nums text-emerald-600 dark:text-emerald-400">15–25 Q</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Full concept coverage exam required to promote chapter to MASTERED.
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setAssessmentType('REVISION');
                setQuestionCount(5);
                setPassThreshold(70);
              }}
              className={`rounded-lg border p-3.5 text-left transition cursor-pointer ${
                assessmentType === 'REVISION'
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-border bg-background hover:bg-muted/40'
              }`}
              data-testid="button-mode-revision"
            >
              <div className="flex items-center justify-between text-xs font-mono font-bold text-foreground">
                <span>Spaced Recall Quiz</span>
                <span className="tabular-nums text-amber-600 dark:text-amber-400">5 Q</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Verification quiz that dynamically scales your retention interval.
              </p>
            </button>
          </div>

          {/* Controls Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border border-border bg-muted/20 p-4 text-xs font-mono">
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2">
                <span className="text-muted-foreground">Questions:</span>
                <select
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="rounded border border-border bg-background px-2.5 py-1 font-bold text-foreground"
                  data-testid="select-question-count"
                >
                  {assessmentType === 'CHAPTER_MASTERY'
                    ? [15, 20, 25].map((n) => (
                        <option key={n} value={n}>
                          {n} questions
                        </option>
                      ))
                    : [3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          {n} questions
                        </option>
                      ))}
                </select>
              </label>

              {assessmentType === 'CHAPTER_MASTERY' && (
                <label className="flex items-center gap-2">
                  <span className="text-muted-foreground">Mastery Threshold:</span>
                  <select
                    value={passThreshold}
                    onChange={(e) => setPassThreshold(Number(e.target.value))}
                    className="rounded border border-border bg-background px-2.5 py-1 font-bold text-foreground"
                    data-testid="select-pass-threshold"
                  >
                    {[70, 75, 80, 85].map((pct) => (
                      <option key={pct} value={pct}>
                        {pct}% score + 70% concepts
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            <button
              type="button"
              onClick={() => void handleStartVerification(false)}
              disabled={isGuest}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0"
              data-testid="button-start-verification"
            >
              <Sparkles size={13} />
              <span>
                {assessmentType === 'CHAPTER_MASTERY'
                  ? 'Generate & Start Mastery Exam'
                  : assessmentType === 'REVISION'
                  ? 'Start Retention Check'
                  : 'Start Objective Quiz'}
              </span>
            </button>
          </div>

          {/* Concept Mastery Snapshot if any */}
          {conceptMastery.length > 0 && (
            <div className="space-y-2 border-t border-border pt-4">
              <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
                <span>Verified Concept Breakdown ({conceptMastery.length} assessed)</span>
                <span className="tabular-nums">
                  Best Chapter Score: {chapterMastery?.bestMasteryScore || 0}%
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {conceptMastery.slice(0, 6).map((cm) => (
                  <div
                    key={cm.conceptId}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs"
                  >
                    <span className="truncate font-medium text-foreground">{cm.conceptTitle}</span>
                    <span
                      className={`font-mono tabular-nums font-bold shrink-0 ${
                        cm.masteryScore >= 75
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : cm.masteryScore >= 55
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {Math.round(cm.masteryScore)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loading / Submitting Skeleton */}
      {(phase === 'loading' || phase === 'submitting') && (
        <div className="py-12 text-center space-y-3 font-mono">
          <Loader2 size={24} className="mx-auto animate-spin text-indigo-500" />
          <p className="text-sm font-semibold text-foreground">
            {phase === 'loading'
              ? 'Generating validated CBSE syllabus assessment...'
              : 'Evaluating answers server-side & updating concept mastery...'}
          </p>
          <p className="text-xs text-muted-foreground">
            Answer keys remain sealed on the server until you submit.
          </p>
        </div>
      )}

      {/* Error State */}
      {phase === 'error' && (
        <div className="rounded-lg border border-rose-500/35 bg-rose-500/10 p-5 space-y-3 text-xs">
          <div className="flex items-start gap-2.5 text-rose-700 dark:text-rose-300">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Verification session unavailable</p>
              <p className="mt-1 leading-relaxed">{errorMessage}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setPhase('setup')}
              className="rounded-md border border-border bg-background px-3 py-1.5 font-mono font-semibold text-foreground hover:bg-muted cursor-pointer"
            >
              Back to Setup
            </button>
          </div>
        </div>
      )}

      {/* Active Assessment Question Runner */}
      {phase === 'active' && activeQuestion && (
        <div className="space-y-5">
          {/* Progress header */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono tabular-nums">
            <span className="text-muted-foreground">
              Question <strong className="text-foreground">{currentIndex + 1}</strong> of {questions.length}
              <span className="mx-2 text-border">|</span>
              Concept: <strong className="text-foreground">{activeQuestion.conceptLabel}</strong>
              <span className="mx-2 text-border">|</span>
              <span className="capitalize">{activeQuestion.difficulty}</span>
            </span>
            <span className="text-muted-foreground">
              {answeredCount}/{questions.length} answered
            </span>
          </div>

          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all duration-300"
              style={{ width: `${Math.round(((currentIndex + 1) / questions.length) * 100)}%` }}
            />
          </div>

          {/* Question Card */}
          <div className="rounded-lg border border-border bg-background p-4 sm:p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm sm:text-base font-semibold text-foreground leading-relaxed">
                {activeQuestion.prompt}
              </p>
              <button
                type="button"
                onClick={() => setFlagQuestionId(activeQuestion.id)}
                disabled={flaggedIds.has(activeQuestion.id)}
                className="shrink-0 inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-[11px] font-mono text-muted-foreground hover:text-foreground disabled:opacity-50 cursor-pointer"
                title="Report ambiguous or out-of-syllabus question"
              >
                <Flag size={11} />
                <span>{flaggedIds.has(activeQuestion.id) ? 'Flagged' : 'Flag'}</span>
              </button>
            </div>

            <div className="space-y-2">
              {activeQuestion.options.map((opt) => {
                const chosen = selectedAnswers[activeQuestion.id] === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectOption(activeQuestion.id, opt.id)}
                    className={`flex w-full items-start gap-3 rounded-lg border px-3.5 py-3 text-left text-xs sm:text-sm transition cursor-pointer ${
                      chosen
                        ? 'border-indigo-500 bg-indigo-500/12 text-foreground font-semibold'
                        : 'border-border bg-card hover:bg-muted/40 text-foreground'
                    }`}
                    data-testid={`button-option-${opt.id}`}
                  >
                    <span
                      className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border font-mono text-[11px] font-bold ${
                        chosen
                          ? 'border-indigo-500 bg-indigo-600 text-white'
                          : 'border-border bg-background text-muted-foreground'
                      }`}
                    >
                      {opt.id}
                    </span>
                    <span className="leading-relaxed">{opt.text}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Flag Modal Inline */}
          {flagQuestionId && (
            <div className="rounded-lg border border-amber-500/35 bg-amber-500/5 p-3.5 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-foreground">Report Question Issue</span>
                <button
                  type="button"
                  onClick={() => setFlagQuestionId(null)}
                  className="text-muted-foreground hover:text-foreground font-mono"
                >
                  Cancel
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  value={flagReason}
                  onChange={(e) => setFlagReason(e.target.value as any)}
                  className="rounded border border-border bg-background px-2.5 py-1 font-mono text-xs"
                >
                  <option value="ambiguous">Ambiguous wording</option>
                  <option value="incorrect_answer">Incorrect option / answer</option>
                  <option value="out_of_syllabus">Out of CBSE syllabus</option>
                  <option value="duplicate">Duplicate question</option>
                  <option value="typo">Typo / formatting error</option>
                </select>
                <input
                  type="text"
                  value={flagComment}
                  onChange={(e) => setFlagComment(e.target.value)}
                  placeholder="Optional note..."
                  className="flex-1 rounded border border-border bg-background px-2.5 py-1 text-xs"
                />
                <button
                  type="button"
                  onClick={() => void handleSendFeedback()}
                  disabled={flagBusy}
                  className="rounded bg-amber-600 hover:bg-amber-500 text-white px-3 py-1 font-mono font-bold cursor-pointer"
                >
                  {flagBusy ? 'Sending...' : 'Submit Flag'}
                </button>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 font-mono text-xs">
            <button
              type="button"
              onClick={() => handleNavigateQuestion(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-2 text-foreground hover:bg-muted disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft size={14} />
              <span>Previous</span>
            </button>

            <div className="flex items-center gap-1 flex-wrap">
              {questions.map((q, idx) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => handleNavigateQuestion(idx)}
                  className={`h-7 w-7 rounded border text-[11px] font-bold tabular-nums cursor-pointer ${
                    idx === currentIndex
                      ? 'border-indigo-500 bg-indigo-600 text-white'
                      : selectedAnswers[q.id]
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : 'border-border bg-background text-muted-foreground'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>

            {currentIndex < questions.length - 1 ? (
              <button
                type="button"
                onClick={() => handleNavigateQuestion(currentIndex + 1)}
                className="inline-flex items-center gap-1 rounded-lg bg-foreground text-background px-4 py-2 font-bold cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleSubmitAttempt()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 font-bold cursor-pointer"
                data-testid="button-submit-verification"
              >
                <CheckCircle2 size={14} />
                <span>Submit & Grade ({answeredCount}/{questions.length})</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Server-Graded Verification Result Screen */}
      {phase === 'graded' && gradedResult && (
        <div className="space-y-5" data-testid="panel-verification-result">
          <div
            className={`rounded-xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              gradedResult.summary.passed
                ? 'border-emerald-500/40 bg-emerald-500/10'
                : 'border-amber-500/40 bg-amber-500/10'
            }`}
          >
            <div className="flex items-start gap-3">
              {gradedResult.summary.passed ? (
                <Award size={22} className="shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Target size={22} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              )}
              <div>
                <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {gradedResult.summary.passed ? 'Verification Passed' : 'Needs Targeted Reinforcement'}
                </p>
                <h3 className="font-display text-xl font-bold text-foreground">
                  {gradedResult.summary.scorePercent}% Score ·{' '}
                  {gradedResult.summary.correctCount}/{gradedResult.summary.totalQuestions} Correct
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Concept coverage: <strong className="text-foreground tabular-nums">{gradedResult.summary.conceptCoveragePercent}%</strong>
                  {' · '}Chapter Status: <strong className="text-foreground">{gradedResult.summary.nextChapterStatus}</strong>
                  {!gradedResult.summary.passed &&
                    ' (Your completed study logs are fully preserved.)'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 font-mono text-xs shrink-0">
              <button
                type="button"
                onClick={() => void handleStartVerification(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 font-semibold text-foreground hover:bg-muted cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>Retake Fresh Set</span>
              </button>
              <button
                type="button"
                onClick={() => setPhase('setup')}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 font-bold cursor-pointer"
              >
                <span>Done</span>
              </button>
            </div>
          </div>

          {/* Weak concepts if any */}
          {gradedResult.summary.weakConcepts.length > 0 && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3.5 text-xs">
              <span className="font-mono font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider block mb-1">
                Weak Concepts Flagged for Revision
              </span>
              <p className="text-foreground">{gradedResult.summary.weakConcepts.join(' · ')}</p>
            </div>
          )}

          {/* Answer key + explanations revealed ONLY after submission */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-bold block">
              Detailed Explanations &amp; Concept Alignment
            </span>
            {gradedResult.gradedAnswers.map((ans, idx) => {
              const q = questions.find((item) => item.id === ans.questionId);
              return (
                <div
                  key={ans.questionId}
                  className={`rounded-lg border p-3.5 text-xs space-y-1.5 ${
                    ans.isCorrect
                      ? 'border-emerald-500/25 bg-emerald-500/5'
                      : 'border-rose-500/30 bg-rose-500/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-foreground">
                      {idx + 1}. {q?.prompt || ans.conceptLabel}
                    </p>
                    {ans.isCorrect ? (
                      <CheckCircle2 size={15} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <XCircle size={15} className="shrink-0 text-rose-600 dark:text-rose-400" />
                    )}
                  </div>
                  <div className="font-mono text-[11px] text-muted-foreground flex flex-wrap gap-3">
                    <span>Concept: {ans.conceptLabel}</span>
                    <span>Your Answer: <strong className="text-foreground">{ans.submittedAnswer || 'Skipped'}</strong></span>
                    <span>Correct Key: <strong className="text-emerald-600 dark:text-emerald-400">{ans.correctAnswer}</strong></span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed pt-0.5">{ans.explanation}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
