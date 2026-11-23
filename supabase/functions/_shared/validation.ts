// Pure TypeScript Validation, Quality Gate & Server-Side Grading Engine
// Shared by Supabase Edge Functions and automated unit verification tests.

export type AssessmentType = 'OBJECTIVE' | 'CHAPTER_MASTERY' | 'REVISION';
export type OptionId = 'A' | 'B' | 'C' | 'D';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type CognitiveLevel = 'recall' | 'conceptual' | 'application' | 'analysis';
export type QuestionType = 'mcq' | 'assertion_reason';

export interface QuestionOption {
  id: OptionId;
  text: string;
}

export interface SyllabusConceptInput {
  id: string;
  title: string;
  keyConcepts?: string[];
  inCbseSyllabus?: boolean;
}

export interface GeneratedQuestionCandidate {
  conceptId?: string;
  conceptLabel?: string;
  questionType?: string;
  difficulty?: string;
  cognitiveLevel?: string;
  prompt: string;
  options: Array<{ id?: string; text: string }>;
  correctOptionId: string;
  explanation: string;
  syllabusAlignmentNote?: string;
  selfCheckPassed?: boolean;
}

export interface ValidatedQuestionRecord {
  questionOrder: number;
  conceptId: string | null;
  conceptLabel: string;
  questionType: QuestionType;
  difficulty: DifficultyLevel;
  cognitiveLevel: CognitiveLevel;
  prompt: string;
  options: QuestionOption[];
  correctOptionId: OptionId;
  explanation: string;
  validationNotes: {
    formatValid: boolean;
    answerConsistent: boolean;
    syllabusRelevant: boolean;
    conceptAligned: boolean;
    uniqueStem: boolean;
    unambiguous: boolean;
  };
}

export interface ValidationContext {
  assessmentType: AssessmentType;
  subjectName: string;
  chapterTitle: string;
  grade: string;
  allowedConcepts: SyllabusConceptInput[];
  excludedConceptTitles?: string[];
  existingPrompts?: string[];
}

export interface QuestionValidationResult {
  valid: boolean;
  reasons: string[];
  normalized?: Omit<ValidatedQuestionRecord, 'questionOrder'>;
}

const VALID_OPTION_IDS: OptionId[] = ['A', 'B', 'C', 'D'];

export const INITIAL_REVIEW_INTERVALS_DAYS = [1, 3, 7, 14, 30] as const;

export function normalizeTargetQuestionCount(
  assessmentType: AssessmentType,
  requested?: number
): number {
  const n = Number(requested);
  if (assessmentType === 'OBJECTIVE') {
    if (!Number.isFinite(n)) return 4;
    return Math.min(5, Math.max(3, Math.round(n)));
  }
  if (assessmentType === 'CHAPTER_MASTERY') {
    if (!Number.isFinite(n)) return 18;
    return Math.min(25, Math.max(15, Math.round(n)));
  }
  // REVISION
  if (!Number.isFinite(n)) return 6;
  return Math.min(10, Math.max(5, Math.round(n)));
}

export function normalizePassThreshold(
  assessmentType: AssessmentType,
  requested?: number
): number {
  const n = Number(requested);
  if (Number.isFinite(n) && n >= 50 && n <= 100) {
    return Number(n.toFixed(2));
  }
  if (assessmentType === 'CHAPTER_MASTERY') return 75;
  return 70;
}

export function normalizeConceptCoverageThreshold(
  assessmentType: AssessmentType,
  requested?: number
): number {
  if (assessmentType !== 'CHAPTER_MASTERY') return 50;
  const n = Number(requested);
  if (Number.isFinite(n) && n >= 40 && n <= 100) {
    return Number(n.toFixed(2));
  }
  return 70;
}

function normalizeText(value: unknown): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeForSimilarity(text: string): Set<string> {
  const cleaned = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
  return new Set(cleaned);
}

export function computeStemSimilarity(a: string, b: string): number {
  const normA = a.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normB = b.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!normA || !normB) return 0;
  if (normA === normB) return 1;

  const setA = tokenizeForSimilarity(a);
  const setB = tokenizeForSimilarity(b);
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function resolveConceptMatch(
  candidate: GeneratedQuestionCandidate,
  allowedConcepts: SyllabusConceptInput[]
): { conceptId: string | null; conceptLabel: string; aligned: boolean } {
  const inSyllabus = allowedConcepts.filter((c) => c.inCbseSyllabus !== false);
  const pool = inSyllabus.length > 0 ? inSyllabus : allowedConcepts;

  if (pool.length === 0) {
    const label = normalizeText(candidate.conceptLabel);
    return {
      conceptId: null,
      conceptLabel: label || 'Core Concept',
      aligned: label.length >= 2,
    };
  }

  const rawId = normalizeText(candidate.conceptId);
  const rawLabel = normalizeText(candidate.conceptLabel).toLowerCase();

  if (rawId) {
    const byId = pool.find((c) => c.id === rawId);
    if (byId) {
      return { conceptId: byId.id, conceptLabel: byId.title, aligned: true };
    }
  }

  if (rawLabel) {
    const exactTitle = pool.find((c) => c.title.toLowerCase() === rawLabel);
    if (exactTitle) {
      return { conceptId: exactTitle.id, conceptLabel: exactTitle.title, aligned: true };
    }

    // Fuzzy word overlap match against concept title & key concepts
    let bestConcept: SyllabusConceptInput | null = null;
    let bestScore = 0;
    for (const c of pool) {
      const targetText = [c.title, ...(c.keyConcepts || [])].join(' ');
      const score = computeStemSimilarity(rawLabel, targetText);
      if (score > bestScore) {
        bestScore = score;
        bestConcept = c;
      }
    }
    if (bestConcept && bestScore >= 0.2) {
      return { conceptId: bestConcept.id, conceptLabel: bestConcept.title, aligned: true };
    }
  }

  // Fallback check against question prompt itself
  const promptText = normalizeText(candidate.prompt);
  let bestFromPrompt: SyllabusConceptInput | null = null;
  let bestPromptScore = 0;
  for (const c of pool) {
    const targetText = [c.title, ...(c.keyConcepts || [])].join(' ');
    const score = computeStemSimilarity(promptText, targetText);
    if (score > bestPromptScore) {
      bestPromptScore = score;
      bestFromPrompt = c;
    }
  }

  if (bestFromPrompt && bestPromptScore >= 0.12) {
    return { conceptId: bestFromPrompt.id, conceptLabel: bestFromPrompt.title, aligned: true };
  }

  return {
    conceptId: null,
    conceptLabel: normalizeText(candidate.conceptLabel) || 'Unaligned',
    aligned: false,
  };
}

function detectInternalContradiction(
  correctOptionId: OptionId,
  options: QuestionOption[],
  explanation: string
): string | null {
  const lowerExp = explanation.toLowerCase();
  const explicitMatches = [...lowerExp.matchAll(/\bcorrect (?:answer|option) is(?:\s+option)?\s*\(?([a-d])\)?\b/gi)];
  for (const m of explicitMatches) {
    const mentioned = m[1].toUpperCase();
    if (mentioned !== correctOptionId) {
      return `Explanation states correct option is ${mentioned}, contradicting correctOptionId ${correctOptionId}`;
    }
  }

  const chosen = options.find((o) => o.id === correctOptionId);
  if (!chosen || !chosen.text) {
    return 'Chosen correctOptionId does not correspond to a populated option';
  }

  return null;
}

function detectAmbiguity(prompt: string, options: QuestionOption[]): string | null {
  const lowerPrompt = prompt.toLowerCase();
  if (
    /\b(all|both)\s+of\s+the\s+correct\s+options\b/i.test(lowerPrompt) ||
    /\bselect all that apply\b/i.test(lowerPrompt)
  ) {
    return 'Prompt asks for multiple selections in a single-choice question';
  }

  if (/TBD|TODO|lorem ipsum|placeholder|insert option/i.test(prompt)) {
    return 'Prompt contains placeholder text';
  }

  const normalizedTexts = options.map((o) => o.text.toLowerCase().replace(/\s+/g, ' ').trim());
  const uniqueTexts = new Set(normalizedTexts);
  if (uniqueTexts.size < options.length) {
    return 'Duplicate option texts introduce ambiguity';
  }

  for (const opt of options) {
    if (/^(option\s+[a-d]|choice\s+[a-d]|placeholder|n\/a)$/i.test(opt.text.trim())) {
      return `Ambiguous placeholder option detected: "${opt.text}"`;
    }
  }

  const hasAllOfAbove = normalizedTexts.some((t) => t.includes('all of the above') || t.includes('all of these'));
  const hasNoneOfAbove = normalizedTexts.some((t) => t.includes('none of the above') || t.includes('none of these'));
  if (hasAllOfAbove && hasNoneOfAbove) {
    return 'Combining both "All of the above" and "None of the above" causes ambiguity';
  }

  return null;
}

function detectOutOfSyllabusLeak(
  prompt: string,
  explanation: string,
  excludedConceptTitles: string[]
): string | null {
  if (!excludedConceptTitles || excludedConceptTitles.length === 0) return null;
  const combined = `${prompt} ${explanation}`.toLowerCase();

  for (const title of excludedConceptTitles) {
    const clean = title.toLowerCase().trim();
    if (clean.length >= 6 && combined.includes(clean)) {
      return `References dropped/non-CBSE concept: "${title}"`;
    }
  }
  return null;
}

export function validateGeneratedQuestion(
  candidate: GeneratedQuestionCandidate,
  context: ValidationContext
): QuestionValidationResult {
  const reasons: string[] = [];

  const prompt = normalizeText(candidate.prompt);
  if (prompt.length < 15 || prompt.length > 1500) {
    reasons.push('Format: question prompt length out of valid range (15-1500 chars)');
  }

  const rawOptions = Array.isArray(candidate.options) ? candidate.options : [];
  if (rawOptions.length !== 4) {
    reasons.push(`Format: expected exactly 4 options, received ${rawOptions.length}`);
  }

  const normalizedOptions: QuestionOption[] = rawOptions.slice(0, 4).map((opt, idx) => ({
    id: VALID_OPTION_IDS[idx],
    text: normalizeText(opt?.text),
  }));

  if (normalizedOptions.length === 4 && normalizedOptions.some((o) => o.text.length === 0)) {
    reasons.push('Format: all 4 options must be non-empty');
  }

  const rawCorrect = normalizeText(candidate.correctOptionId).toUpperCase();
  const correctOptionId = VALID_OPTION_IDS.includes(rawCorrect as OptionId)
    ? (rawCorrect as OptionId)
    : null;
  if (!correctOptionId) {
    reasons.push(`Format: invalid correctOptionId "${candidate.correctOptionId}"`);
  }

  const explanation = normalizeText(candidate.explanation);
  if (explanation.length < 15) {
    reasons.push('Answer verification: explanation is missing or too brief');
  }

  if (candidate.selfCheckPassed === false) {
    reasons.push('Answer verification: generator flagged selfCheckPassed=false');
  }

  if (correctOptionId && normalizedOptions.length === 4) {
    const contradiction = detectInternalContradiction(correctOptionId, normalizedOptions, explanation);
    if (contradiction) reasons.push(`Answer verification: ${contradiction}`);
  }

  const syllabusLeak = detectOutOfSyllabusLeak(
    prompt,
    explanation,
    context.excludedConceptTitles || []
  );
  if (syllabusLeak) {
    reasons.push(`Syllabus relevance: ${syllabusLeak}`);
  }

  const conceptMatch = resolveConceptMatch(candidate, context.allowedConcepts);
  if (!conceptMatch.aligned) {
    reasons.push('Concept alignment: question could not be mapped to target chapter concepts');
  }

  if (normalizedOptions.length === 4) {
    const ambiguity = detectAmbiguity(prompt, normalizedOptions);
    if (ambiguity) {
      reasons.push(`Ambiguity: ${ambiguity}`);
    }
  }

  for (const existing of context.existingPrompts || []) {
    const similarity = computeStemSimilarity(prompt, existing);
    if (similarity >= 0.68) {
      reasons.push(`Duplicate: stem similarity ${similarity.toFixed(2)} exceeds threshold`);
      break;
    }
  }

  const rawDifficulty = normalizeText(candidate.difficulty).toLowerCase();
  const difficulty: DifficultyLevel =
    rawDifficulty === 'easy' || rawDifficulty === 'hard' ? rawDifficulty : 'medium';

  const rawCog = normalizeText(candidate.cognitiveLevel).toLowerCase();
  const cognitiveLevel: CognitiveLevel =
    rawCog === 'recall' || rawCog === 'conceptual' || rawCog === 'analysis'
      ? rawCog
      : 'application';

  const rawQType = normalizeText(candidate.questionType).toLowerCase();
  const questionType: QuestionType =
    rawQType === 'assertion_reason' ? 'assertion_reason' : 'mcq';

  if (reasons.length > 0 || !correctOptionId || normalizedOptions.length !== 4) {
    return { valid: false, reasons };
  }

  return {
    valid: true,
    reasons: [],
    normalized: {
      conceptId: conceptMatch.conceptId,
      conceptLabel: conceptMatch.conceptLabel,
      questionType,
      difficulty,
      cognitiveLevel,
      prompt,
      options: normalizedOptions,
      correctOptionId,
      explanation,
      validationNotes: {
        formatValid: true,
        answerConsistent: true,
        syllabusRelevant: true,
        conceptAligned: true,
        uniqueStem: true,
        unambiguous: true,
      },
    },
  };
}

export function validateQuestionSetBatch(
  candidates: GeneratedQuestionCandidate[],
  context: ValidationContext,
  targetCount: number,
  requiredConceptCoveragePercent: number
): {
  accepted: ValidatedQuestionRecord[];
  rejected: Array<{ prompt: string; reasons: string[] }>;
  conceptCoveragePercent: number;
  coverageMet: boolean;
} {
  const accepted: ValidatedQuestionRecord[] = [];
  const rejected: Array<{ prompt: string; reasons: string[] }> = [];
  const seenPrompts = [...(context.existingPrompts || [])];

  for (const cand of candidates) {
    if (accepted.length >= targetCount) break;
    const res = validateGeneratedQuestion(cand, {
      ...context,
      existingPrompts: seenPrompts,
    });
    if (res.valid && res.normalized) {
      seenPrompts.push(res.normalized.prompt);
      accepted.push({
        ...res.normalized,
        questionOrder: accepted.length + 1,
      });
    } else {
      rejected.push({
        prompt: normalizeText(cand?.prompt).slice(0, 120) || '(empty prompt)',
        reasons: res.reasons,
      });
    }
  }

  const inSyllabusConcepts = context.allowedConcepts.filter((c) => c.inCbseSyllabus !== false);
  const coveredConceptIds = new Set(accepted.map((q) => q.conceptId).filter(Boolean));
  const denominator =
    context.assessmentType === 'CHAPTER_MASTERY' && inSyllabusConcepts.length > 0
      ? Math.min(inSyllabusConcepts.length, accepted.length)
      : Math.max(1, coveredConceptIds.size);

  const conceptCoveragePercent =
    context.assessmentType === 'CHAPTER_MASTERY' && inSyllabusConcepts.length > 0
      ? Number(((coveredConceptIds.size / denominator) * 100).toFixed(2))
      : accepted.length > 0
      ? 100
      : 0;

  const coverageMet =
    context.assessmentType !== 'CHAPTER_MASTERY' ||
    inSyllabusConcepts.length <= 1 ||
    conceptCoveragePercent >= Math.min(100, requiredConceptCoveragePercent);

  return {
    accepted,
    rejected,
    conceptCoveragePercent,
    coverageMet,
  };
}

export interface ClientSafeQuestion {
  id: string;
  questionOrder: number;
  conceptId: string | null;
  conceptLabel: string;
  questionType: string;
  difficulty: string;
  cognitiveLevel: string;
  prompt: string;
  options: QuestionOption[];
}

export function sanitizeQuestionsForClient(
  rows: Array<Record<string, unknown>>
): ClientSafeQuestion[] {
  return rows.map((row) => ({
    id: String(row.id),
    questionOrder: Number(row.question_order ?? row.questionOrder ?? 1),
    conceptId: row.concept_id ? String(row.concept_id) : null,
    conceptLabel: String(row.concept_label ?? row.conceptLabel ?? ''),
    questionType: String(row.question_type ?? row.questionType ?? 'mcq'),
    difficulty: String(row.difficulty ?? 'medium'),
    cognitiveLevel: String(row.cognitive_level ?? row.cognitiveLevel ?? 'application'),
    prompt: String(row.prompt ?? ''),
    options: Array.isArray(row.options) ? (row.options as QuestionOption[]) : [],
  }));
}

export interface SubmissionAnswerInput {
  questionId: string;
  selectedOptionId: string;
  timeSpentSeconds?: number;
}

export interface StoredQuestionForGrading {
  id: string;
  conceptId: string | null;
  conceptLabel: string;
  prompt: string;
}

export interface StoredAnswerKey {
  questionId: string;
  correctOptionId: string;
  explanation: string;
}

export interface ExistingConceptMasteryState {
  conceptId: string;
  attemptsCount: number;
  correctCount: number;
  masteryScore: number;
}

export interface ExistingReviewScheduleState {
  id?: string;
  intervalStep: number;
  intervalDays: number;
  easeFactor: number;
}

export interface AdaptiveReviewDecision {
  intervalStep: number;
  intervalDays: number;
  easeFactor: number;
  dueDate: string;
  status: 'SCHEDULED' | 'DUE';
  retentionHealthScore: number;
  recallQuality: number;
}

export function computeAdaptiveReviewSchedule(input: {
  passed: boolean;
  scorePercent: number;
  existing?: ExistingReviewScheduleState | null;
  todayIso?: string;
}): AdaptiveReviewDecision {
  const baseDate = input.todayIso ? new Date(`${input.todayIso}T00:00:00Z`) : new Date();
  const prevStep = input.existing?.intervalStep ?? 0;
  const prevDays = input.existing?.intervalDays ?? 1;
  const prevEase = input.existing?.easeFactor ?? 2.5;

  let recallQuality = 3;
  if (input.scorePercent >= 90) recallQuality = 5;
  else if (input.scorePercent >= 80) recallQuality = 4;
  else if (input.scorePercent >= 65) recallQuality = 3;
  else if (input.scorePercent >= 45) recallQuality = 2;
  else recallQuality = 1;

  let nextStep = 1;
  let nextDays = 1;
  let nextEase = prevEase;
  let retentionHealthScore = input.scorePercent;

  if (!input.passed) {
    nextStep = 1;
    nextDays = INITIAL_REVIEW_INTERVALS_DAYS[0]; // Reset to 1-day recovery interval
    nextEase = Math.max(1.3, Number((prevEase - 0.25).toFixed(2)));
    retentionHealthScore = Math.max(20, Math.min(65, Math.round(input.scorePercent)));
  } else {
    nextStep = Math.max(1, prevStep + 1);
    if (nextStep <= INITIAL_REVIEW_INTERVALS_DAYS.length) {
      nextDays = INITIAL_REVIEW_INTERVALS_DAYS[nextStep - 1];
    } else {
      nextDays = Math.min(60, Math.max(30, Math.round(prevDays * prevEase)));
    }

    if (recallQuality >= 5) {
      nextEase = Math.min(3.2, Number((prevEase + 0.1).toFixed(2)));
    } else if (recallQuality === 3) {
      nextEase = Math.max(1.3, Number((prevEase - 0.05).toFixed(2)));
    }

    retentionHealthScore = Math.min(100, Math.max(70, Math.round(input.scorePercent * 0.7 + 30)));
  }

  const due = new Date(baseDate.getTime() + nextDays * 86_400_000);
  const dueDate = due.toISOString().slice(0, 10);

  return {
    intervalStep: nextStep,
    intervalDays: nextDays,
    easeFactor: nextEase,
    dueDate,
    status: 'SCHEDULED',
    retentionHealthScore,
    recallQuality,
  };
}

export function gradeAssessmentSubmission(input: {
  assessmentType: AssessmentType;
  passThresholdPercent: number;
  requiredConceptCoveragePercent: number;
  targetConceptIds: string[];
  questions: StoredQuestionForGrading[];
  answerKeysByQuestionId: Record<string, StoredAnswerKey>;
  submittedAnswers: SubmissionAnswerInput[];
  existingConceptMastery?: Record<string, ExistingConceptMasteryState>;
  existingStudyCompleted?: boolean;
  existingChapterStatus?: string;
  existingFirstMasteredAt?: string | null;
  existingBestScore?: number;
}) {
  const answerMap = new Map<string, SubmissionAnswerInput>();
  for (const ans of input.submittedAnswers) {
    if (ans?.questionId) {
      answerMap.set(ans.questionId, ans);
    }
  }

  let correctCount = 0;
  const gradedAnswers: Array<{
    questionId: string;
    conceptId: string | null;
    conceptLabel: string;
    submittedAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    explanation: string;
    timeSpentSeconds: number;
  }> = [];

  const sessionConceptTotals = new Map<
    string,
    { conceptId: string; title: string; total: number; correct: number }
  >();

  for (const q of input.questions) {
    const key = input.answerKeysByQuestionId[q.id];
    if (!key) {
      throw new Error(`Missing server answer key for question ${q.id}`);
    }

    const submitted = answerMap.get(q.id);
    const normalizedSub = normalizeText(submitted?.selectedOptionId).toUpperCase();
    const normalizedCorrect = normalizeText(key.correctOptionId).toUpperCase();
    const isCorrect = normalizedSub.length > 0 && normalizedSub === normalizedCorrect;

    if (isCorrect) correctCount += 1;

    gradedAnswers.push({
      questionId: q.id,
      conceptId: q.conceptId,
      conceptLabel: q.conceptLabel,
      submittedAnswer: normalizedSub,
      correctAnswer: normalizedCorrect,
      isCorrect,
      explanation: key.explanation,
      timeSpentSeconds: Math.max(0, Math.round(Number(submitted?.timeSpentSeconds || 0))),
    });

    const conceptKey = q.conceptId || `label:${q.conceptLabel || q.id}`;
    const prev = sessionConceptTotals.get(conceptKey) || {
      conceptId: q.conceptId || conceptKey,
      title: q.conceptLabel || 'Core Concept',
      total: 0,
      correct: 0,
    };
    prev.total += 1;
    if (isCorrect) prev.correct += 1;
    sessionConceptTotals.set(conceptKey, prev);
  }

  const totalQuestions = input.questions.length;
  const scorePercent =
    totalQuestions > 0 ? Number(((correctCount / totalQuestions) * 100).toFixed(2)) : 0;

  const conceptResults = Array.from(sessionConceptTotals.values()).map((c) => {
    const sessionScore = Number(((c.correct / c.total) * 100).toFixed(2));
    const prior = input.existingConceptMastery?.[c.conceptId];
    const totalAttempts = (prior?.attemptsCount ?? 0) + c.total;
    const totalCorrect = (prior?.correctCount ?? 0) + c.correct;
    // Weighted blend (70% current session performance, 30% cumulative accuracy)
    const cumulativeAccuracy = totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : sessionScore;
    const updatedMasteryScore = Number(
      (prior ? sessionScore * 0.7 + cumulativeAccuracy * 0.3 : sessionScore).toFixed(2)
    );

    let conceptStatus: 'WEAK' | 'DEVELOPING' | 'MASTERED' | 'NEEDS_REVISION' = 'DEVELOPING';
    if (updatedMasteryScore >= 75) conceptStatus = 'MASTERED';
    else if (updatedMasteryScore < 50) conceptStatus = 'WEAK';

    return {
      conceptId: c.conceptId,
      conceptTitle: c.title,
      sessionTotal: c.total,
      sessionCorrect: c.correct,
      sessionScore,
      attemptsCount: totalAttempts,
      correctCount: totalCorrect,
      masteryScore: updatedMasteryScore,
      status: conceptStatus,
    };
  });

  const targetUniverse =
    input.targetConceptIds.length > 0 ? input.targetConceptIds.length : conceptResults.length;
  const demonstratedConcepts = conceptResults.filter((c) => c.sessionScore >= 50).length;
  const conceptCoveragePercent =
    targetUniverse > 0
      ? Number(((Math.min(demonstratedConcepts, targetUniverse) / targetUniverse) * 100).toFixed(2))
      : 100;

  const passed =
    input.assessmentType === 'CHAPTER_MASTERY'
      ? scorePercent >= input.passThresholdPercent &&
        conceptCoveragePercent >= input.requiredConceptCoveragePercent
      : scorePercent >= input.passThresholdPercent;

  // Determine resulting objective & chapter statuses without erasing completed study work
  const nextObjectiveState =
    input.assessmentType === 'OBJECTIVE'
      ? passed
        ? 'VERIFIED'
        : 'NEEDS_RELEARNING'
      : null;

  const wasPreviouslyMastered =
    input.existingChapterStatus === 'MASTERED' || Boolean(input.existingFirstMasteredAt);
  const studyStillCompleted = Boolean(input.existingStudyCompleted);

  let nextChapterStatus = input.existingChapterStatus || 'IN_PROGRESS';
  if (input.assessmentType === 'CHAPTER_MASTERY') {
    if (passed) {
      nextChapterStatus = 'MASTERED';
    } else if (wasPreviouslyMastered) {
      nextChapterStatus = 'NEEDS_REVISION';
    } else if (studyStillCompleted) {
      nextChapterStatus = 'MASTERY_PENDING';
    } else {
      nextChapterStatus = 'IN_PROGRESS';
    }
  } else if (input.assessmentType === 'REVISION') {
    if (passed) {
      nextChapterStatus = 'MASTERED';
    } else if (wasPreviouslyMastered) {
      nextChapterStatus = 'NEEDS_REVISION';
    }
  }

  const weakConcepts = conceptResults
    .filter((c) => c.status === 'WEAK' || c.sessionScore < 60)
    .map((c) => c.conceptTitle);

  return {
    totalQuestions,
    correctCount,
    scorePercent,
    conceptCoveragePercent,
    passed,
    nextObjectiveState,
    nextChapterStatus,
    bestMasteryScore: Math.max(input.existingBestScore ?? 0, scorePercent),
    gradedAnswers,
    conceptResults,
    weakConcepts,
  };
}
