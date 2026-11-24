import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { ThinkingLevel, Type } from '@google/genai';
import { getGeminiClient } from './gemini.ts';
import { isServerSupabaseConfigured, supabaseServer } from './supabase-server.ts';
import {
  computeAdaptiveReviewSchedule,
  gradeAssessmentSubmission,
  normalizeConceptCoverageThreshold,
  normalizePassThreshold,
  normalizeTargetQuestionCount,
  sanitizeQuestionsForClient,
  validateQuestionSetBatch,
  type AssessmentType,
  type ExistingConceptMasteryState,
  type ExistingReviewScheduleState,
  type GeneratedQuestionCandidate,
  type StoredAnswerKey,
  type SyllabusConceptInput,
  type ValidatedQuestionRecord,
} from '../../supabase/functions/_shared/validation.ts';

const CANDIDATE_VERIFICATION_MODELS = [
  'gemini-4-hydrogen',
  'gemini-3.8-flash',
  'gemini-3.1-flash-lite',
];

const QUESTION_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          conceptId: {
            type: Type.STRING,
            description: 'Exact concept ID from the provided syllabus concepts list.',
          },
          conceptLabel: {
            type: Type.STRING,
            description: 'Exact title of the syllabus concept tested by this question.',
          },
          questionType: {
            type: Type.STRING,
            description: 'One of: mcq, assertion_reason',
          },
          difficulty: {
            type: Type.STRING,
            description: 'One of: easy, medium, hard',
          },
          cognitiveLevel: {
            type: Type.STRING,
            description: 'One of: conceptual, application, analysis',
          },
          prompt: {
            type: Type.STRING,
            description: 'Clear, unambiguous, self-contained CBSE/NCERT academic question stem.',
          },
          options: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING, description: 'A, B, C, or D' },
                text: { type: Type.STRING, description: 'Distinct choice text' },
              },
              required: ['id', 'text'],
            },
          },
          correctOptionId: {
            type: Type.STRING,
            description: 'Exact single winning option ID: A, B, C, or D',
          },
          explanation: {
            type: Type.STRING,
            description:
              'Step-by-step conceptual reasoning verifying why correctOptionId is right and distractors fail.',
          },
          syllabusAlignmentNote: {
            type: Type.STRING,
            description: 'How this question aligns strictly with NCERT CBSE syllabus.',
          },
          selfCheckPassed: {
            type: Type.BOOLEAN,
            description:
              'True only after verifying mathematical/factual correctness and single unambiguous answer.',
          },
        },
        required: [
          'conceptId',
          'conceptLabel',
          'questionType',
          'difficulty',
          'cognitiveLevel',
          'prompt',
          'options',
          'correctOptionId',
          'explanation',
          'selfCheckPassed',
        ],
      },
    },
  },
  required: ['questions'],
};

interface StoredSetQuestion extends ValidatedQuestionRecord {
  id: string;
}

interface StoredAssessmentSet {
  id: string;
  user_id: string;
  assessment_type: AssessmentType;
  chapter_id: string;
  objective_id: string | null;
  concept_ids: string[];
  title: string;
  question_count: number;
  pass_threshold_percent: number;
  required_concept_coverage_percent: number;
  status: string;
  created_at: string;
  questions: StoredSetQuestion[];
  answerKeysByQuestionId: Record<string, StoredAnswerKey>;
}

interface StoredAttempt {
  id: string;
  user_id: string;
  assessment_set_id: string;
  assessment_type: AssessmentType;
  chapter_id: string;
  objective_id: string | null;
  attempt_number: number;
  status: 'in_progress' | 'submitted' | 'abandoned';
  total_questions: number;
  correct_count: number;
  score_percent: number;
  concept_coverage_percent: number;
  passed: boolean;
  started_at: string;
  submitted_at: string | null;
  resultCache?: Record<string, unknown>;
}

interface VerificationStoreSnapshot {
  sets: Record<string, StoredAssessmentSet>;
  attempts: Record<string, StoredAttempt>;
  conceptMastery: Record<string, ExistingConceptMasteryState>;
  chapterState: Record<
    string,
    { status: string; studyCompleted: boolean; firstMasteredAt: string | null; bestScore: number }
  >;
  reviewSchedules: Record<string, ExistingReviewScheduleState>;
  feedback: Array<Record<string, unknown>>;
}

const STORE_FILE_PATH = '/tmp/backlogos-verification-store.json';

let memoryStore: VerificationStoreSnapshot | null = null;

function getStore(): VerificationStoreSnapshot {
  if (memoryStore) return memoryStore;
  try {
    if (fs.existsSync(STORE_FILE_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(STORE_FILE_PATH, 'utf8'));
      memoryStore = {
        sets: parsed.sets || {},
        attempts: parsed.attempts || {},
        conceptMastery: parsed.conceptMastery || {},
        chapterState: parsed.chapterState || {},
        reviewSchedules: parsed.reviewSchedules || {},
        feedback: Array.isArray(parsed.feedback) ? parsed.feedback : [],
      };
      return memoryStore;
    }
  } catch {
    // fallback cleanly to fresh store
  }
  memoryStore = {
    sets: {},
    attempts: {},
    conceptMastery: {},
    chapterState: {},
    reviewSchedules: {},
    feedback: [],
  };
  return memoryStore;
}

function persistStore(): void {
  if (!memoryStore) return;
  try {
    // Keep store bounded so /tmp never grows unboundedly across long uptime
    const setIds = Object.keys(memoryStore.sets);
    if (setIds.length > 250) {
      const sorted = setIds.sort(
        (a, b) =>
          Date.parse(memoryStore!.sets[a].created_at) -
          Date.parse(memoryStore!.sets[b].created_at)
      );
      for (const oldId of sorted.slice(0, setIds.length - 200)) {
        delete memoryStore.sets[oldId];
      }
    }
    const attemptIds = Object.keys(memoryStore.attempts);
    if (attemptIds.length > 500) {
      const sorted = attemptIds.sort(
        (a, b) =>
          Date.parse(memoryStore!.attempts[a].started_at) -
          Date.parse(memoryStore!.attempts[b].started_at)
      );
      for (const oldId of sorted.slice(0, attemptIds.length - 400)) {
        delete memoryStore.attempts[oldId];
      }
    }
    fs.mkdirSync(path.dirname(STORE_FILE_PATH), { recursive: true });
    fs.writeFileSync(STORE_FILE_PATH, JSON.stringify(memoryStore), 'utf8');
  } catch {
    // Ignore /tmp disk write failures gracefully
  }
}

function buildAssessmentPrompt(params: {
  assessmentType: AssessmentType;
  board: string;
  grade: string;
  subjectName: string;
  chapterTitle: string;
  objectiveTitle?: string;
  neededCount: number;
  allowedConcepts: SyllabusConceptInput[];
  excludedConceptTitles: string[];
  coveredConceptIds: Set<string>;
  avoidStems: string[];
}): string {
  const activeConcepts = params.allowedConcepts.filter((c) => c.inCbseSyllabus !== false);
  const conceptLines =
    activeConcepts.length > 0
      ? activeConcepts
          .map((c) => {
            const mark = params.coveredConceptIds.has(c.id)
              ? '[already covered]'
              : '[PRIORITY TO COVER]';
            const keys = (c.keyConcepts || []).slice(0, 4).join('; ');
            return `- ID="${c.id}" | Title="${c.title}" ${mark}${keys ? ` | Core Points: ${keys}` : ''}`;
          })
          .join('\n')
      : `- ID="core-concept" | Title="${params.chapterTitle} Core Concepts"`;

  const excludedBlock =
    params.excludedConceptTitles.length > 0
      ? `\nDO NOT TEST excluded/rationalized out-of-syllabus topics: ${params.excludedConceptTitles.join(', ')}.`
      : '';

  const avoidBlock =
    params.avoidStems.length > 0
      ? `\nDO NOT repeat or paraphrase any of these existing prompts:\n${params.avoidStems
          .slice(-12)
          .map((s, i) => `${i + 1}. ${s.slice(0, 140)}`)
          .join('\n')}`
      : '';

  const focusDirective =
    params.assessmentType === 'OBJECTIVE'
      ? `Generate ${params.neededCount} conceptual and application-based CBSE/NCERT MCQ questions verifying the student's learning objective: "${
          params.objectiveTitle || params.chapterTitle
        }". Avoid superficial trivia.`
      : params.assessmentType === 'CHAPTER_MASTERY'
      ? `Generate ${params.neededCount} comprehensive chapter mastery MCQ questions spanning the priority concepts listed below across easy, medium, and hard levels with conceptual, application, and analysis thinking.`
      : `Generate ${params.neededCount} high-yield active-recall spaced revision MCQ questions testing conceptual retention and common exam traps.`;

  return `${focusDirective}

Academic Context:
- Board: ${params.board} (Session 2026-27)
- Grade: Class ${params.grade}
- Subject: ${params.subjectName}
- Chapter: ${params.chapterTitle}

Allowed Syllabus Concepts (set conceptId and conceptLabel directly from this list):
${conceptLines}
${excludedBlock}
${avoidBlock}

Strict Quality Rules:
1. Return strictly ${params.neededCount} questions in the JSON object under "questions".
2. Exactly 4 mutually exclusive options with ids "A", "B", "C", "D" per question.
3. Never combine "All of the above" and "None of the above".
4. Solve each question step-by-step internally before setting correctOptionId and explanation. Never contradict correctOptionId inside explanation.
5. Set selfCheckPassed=true only when calculations, units, signs, and CBSE facts are 100% verified.`;
}

function formatCleanAiError(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('503') || lower.includes('unavailable') || lower.includes('high demand')) {
    return 'AI question generator is experiencing temporary high traffic. Please click Retry in a few seconds.';
  }
  if (lower.includes('429') || lower.includes('resource_exhausted') || lower.includes('quota')) {
    return 'AI generation rate limit reached temporarily. Please wait a few seconds and click Retry.';
  }
  if (lower.includes('permission_denied') || lower.includes('api_key_invalid') || lower.includes('403')) {
    return 'AI service credentials could not be authorized. Please check your key in Settings > Secrets.';
  }
  if (lower.includes('not_found') || lower.includes('404')) {
    return 'Selected AI assessment model was unavailable. Please click Retry.';
  }
  return raw.length > 220 ? 'Question generation timed out temporarily. Please click Retry.' : raw;
}

async function generateGeminiBatch(prompt: string): Promise<{
  candidates: GeneratedQuestionCandidate[];
  modelUsed: string;
}> {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error(
      'AI verification key (GEMINI_API_KEY) is not configured on the server.'
    );
  }

  let lastError = 'Gemini did not return valid assessment JSON.';
  const maxPasses = 2;

  for (let pass = 0; pass < maxPasses; pass++) {
    for (const model of CANDIDATE_VERIFICATION_MODELS) {
      try {
        const config: Record<string, any> = {
          systemInstruction:
            'You are an exacting CBSE/NCERT Senior Academic Assessment Author & Validator. Return strictly valid JSON matching the schema.',
          responseMimeType: 'application/json',
          responseSchema: QUESTION_RESPONSE_SCHEMA,
          abortSignal: AbortSignal.timeout(18000),
        };
        if (model === 'gemini-4-hydrogen') {
          config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
        }

        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config,
        });

        const rawText = (response.text ?? '').trim();
        if (!rawText) {
          lastError = `Empty response from ${model}`;
          continue;
        }

        const parsed = JSON.parse(rawText) as { questions?: GeneratedQuestionCandidate[] };
        if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
          return { candidates: parsed.questions, modelUsed: model };
        }
        lastError = `No questions array returned by ${model}`;
      } catch (err: any) {
        lastError = err?.message || String(err);
        console.warn(`[VerificationServer] Model ${model} failed:`, lastError.slice(0, 140));
      }
    }

    if (pass + 1 < maxPasses) {
      const delayMs = 700 * (pass + 1);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  throw new Error(formatCleanAiError(lastError));
}

/**
 * Best-effort persistence to Supabase v2 tables when service-role + v2 schema exist.
 * Never crashes local/preview verification if remote v2 tables aren't migrated yet.
 */
async function tryPersistSetToSupabase(set: StoredAssessmentSet, isUuidUser: boolean): Promise<void> {
  if (!isServerSupabaseConfigured || !isUuidUser || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return;
  }
  try {
    const { error: setErr } = await supabaseServer.from('assessment_sets').upsert({
      id: set.id,
      user_id: set.user_id,
      assessment_type: set.assessment_type,
      chapter_id: set.chapter_id,
      objective_id: set.objective_id,
      concept_ids: set.concept_ids,
      title: set.title,
      question_count: set.question_count,
      pass_threshold_percent: set.pass_threshold_percent,
      required_concept_coverage_percent: set.required_concept_coverage_percent,
      status: 'ready',
      syllabus_version: 'CBSE-2026-27',
    });
    if (setErr) return;

    const qRows = set.questions.map((q) => ({
      id: q.id,
      assessment_set_id: set.id,
      user_id: set.user_id,
      chapter_id: set.chapter_id,
      concept_id: null,
      concept_label: q.conceptLabel,
      question_order: q.questionOrder,
      question_type: q.questionType,
      difficulty: q.difficulty,
      cognitive_level: q.cognitiveLevel,
      prompt: q.prompt,
      options: q.options,
      is_validated: true,
      validation_notes: q.validationNotes,
    }));
    const { error: qErr } = await supabaseServer.from('questions').upsert(qRows);
    if (qErr) return;

    const keyRows = set.questions.map((q) => {
      const k = set.answerKeysByQuestionId[q.id];
      return {
        question_id: q.id,
        correct_option_id: k.correctOptionId,
        acceptable_answers: [k.correctOptionId],
        explanation: k.explanation,
        grading_rubric: { conceptId: q.conceptId, conceptLabel: q.conceptLabel },
      };
    });
    await supabaseServer.from('question_answer_keys').upsert(keyRows);
  } catch {
    // Non-fatal fallback; authoritative server store retains full set
  }
}

export async function handleGenerateVerificationAssessment(
  userId: string,
  isUuidUser: boolean,
  body: {
    assessmentType?: AssessmentType;
    chapterId?: string;
    chapterTitle?: string;
    subjectName?: string;
    grade?: string;
    board?: string;
    objectiveId?: string | null;
    objectiveTitle?: string;
    questionCount?: number;
    passThresholdPercent?: number;
    requiredConceptCoveragePercent?: number;
    forceRegenerate?: boolean;
    fallbackConcepts?: Array<{
      id: string;
      title: string;
      keyConcepts?: string[];
      inCbseSyllabus?: boolean;
    }>;
  }
) {
  const assessmentType = body.assessmentType || 'OBJECTIVE';
  if (
    assessmentType !== 'OBJECTIVE' &&
    assessmentType !== 'CHAPTER_MASTERY' &&
    assessmentType !== 'REVISION'
  ) {
    throw new Error('Invalid assessmentType');
  }

  const chapterId = String(body.chapterId || '').trim();
  if (!chapterId) {
    throw new Error('chapterId is required');
  }

  const store = getStore();
  const objectiveId = body.objectiveId ? String(body.objectiveId).trim() : null;
  const objectiveTitle = String(body.objectiveTitle || '').trim();
  const targetCount = normalizeTargetQuestionCount(assessmentType, body.questionCount);
  const passThresholdPercent = normalizePassThreshold(assessmentType, body.passThresholdPercent);
  const requiredConceptCoveragePercent = normalizeConceptCoverageThreshold(
    assessmentType,
    body.requiredConceptCoveragePercent
  );

  // Reuse ready set if same user + chapter + assessmentType + objectiveId + matching targetCount
  if (!body.forceRegenerate) {
    const existing = Object.values(store.sets)
      .filter(
        (s) =>
          s.user_id === userId &&
          s.assessment_type === assessmentType &&
          s.chapter_id === chapterId &&
          (s.objective_id || null) === (objectiveId || null) &&
          s.questions.length >= targetCount &&
          s.status === 'ready'
      )
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];

    if (existing) {
      return {
        success: true,
        reused: true,
        assessmentSet: {
          id: existing.id,
          assessment_type: existing.assessment_type,
          chapter_id: existing.chapter_id,
          objective_id: existing.objective_id,
          concept_ids: existing.concept_ids,
          title: existing.title,
          question_count: existing.question_count,
          pass_threshold_percent: existing.pass_threshold_percent,
          required_concept_coverage_percent: existing.required_concept_coverage_percent,
          status: existing.status,
          created_at: existing.created_at,
        },
        questions: sanitizeQuestionsForClient(existing.questions as unknown as Array<Record<string, unknown>>),
      };
    }
  }

  const board = String(body.board || 'CBSE');
  const grade = String(body.grade || '11');
  const subjectName = String(body.subjectName || 'Science');
  const chapterTitle = String(body.chapterTitle || chapterId);

  let allowedConcepts: SyllabusConceptInput[] = (body.fallbackConcepts || []).map((c) => ({
    id: String(c.id),
    title: String(c.title),
    keyConcepts: Array.isArray(c.keyConcepts) ? c.keyConcepts.map(String) : [],
    inCbseSyllabus: c.inCbseSyllabus !== false,
  }));

  if (allowedConcepts.length === 0) {
    allowedConcepts = [
      {
        id: `${chapterId}-core`,
        title: objectiveTitle || chapterTitle,
        keyConcepts: [chapterTitle, objectiveTitle || subjectName],
        inCbseSyllabus: true,
      },
    ];
  }

  const excludedConceptTitles = allowedConcepts
    .filter((c) => c.inCbseSyllabus === false)
    .map((c) => c.title);

  // Avoid duplicate stems from previous sets of this chapter
  const priorPrompts = Object.values(store.sets)
    .filter((s) => s.user_id === userId && s.chapter_id === chapterId)
    .flatMap((s) => s.questions.map((q) => q.prompt))
    .slice(-15);

  const accepted: ValidatedQuestionRecord[] = [];
  const rejectedReasons: Array<{ prompt: string; reasons: string[] }> = [];
  const coveredConceptIds = new Set<string>();
  const seenPrompts = [...priorPrompts];

  let attempts = 0;
  let lastModelUsed = '';

  while (accepted.length < targetCount && attempts < 3) {
    attempts += 1;
    const deficit = targetCount - accepted.length;
    const requestBatchCount = Math.min(25, Math.max(deficit, deficit + Math.ceil(deficit * 0.25)));

    const prompt = buildAssessmentPrompt({
      assessmentType,
      board,
      grade,
      subjectName,
      chapterTitle,
      objectiveTitle,
      neededCount: requestBatchCount,
      allowedConcepts,
      excludedConceptTitles,
      coveredConceptIds,
      avoidStems: seenPrompts,
    });

    const batch = await generateGeminiBatch(prompt);
    lastModelUsed = batch.modelUsed;

    const validated = validateQuestionSetBatch(
      batch.candidates,
      {
        assessmentType,
        subjectName,
        chapterTitle,
        grade,
        allowedConcepts,
        excludedConceptTitles,
        existingPrompts: seenPrompts,
      },
      deficit,
      requiredConceptCoveragePercent
    );

    for (const q of validated.accepted) {
      seenPrompts.push(q.prompt);
      if (q.conceptId) coveredConceptIds.add(q.conceptId);
      accepted.push({
        ...q,
        questionOrder: accepted.length + 1,
      });
    }
    rejectedReasons.push(...validated.rejected);
  }

  const minAcceptable =
    assessmentType === 'OBJECTIVE' ? 3 : assessmentType === 'CHAPTER_MASTERY' ? 12 : 4;
  if (accepted.length < minAcceptable) {
    throw new Error(
      `Only ${accepted.length} questions passed validation (reasons: ${rejectedReasons
        .slice(0, 2)
        .map((r) => r.reasons.join(', '))
        .join('; ') || 'insufficient count'}). Please click retry.`
    );
  }

  const setId = crypto.randomUUID();
  const nowIso = new Date().toISOString();
  const questionsWithIds: StoredSetQuestion[] = [];
  const answerKeysByQuestionId: Record<string, StoredAnswerKey> = {};

  for (const q of accepted) {
    const qId = crypto.randomUUID();
    questionsWithIds.push({ ...q, id: qId });
    answerKeysByQuestionId[qId] = {
      questionId: qId,
      correctOptionId: q.correctOptionId,
      explanation: q.explanation,
    };
  }

  const setTitle =
    assessmentType === 'OBJECTIVE'
      ? `Objective Verification: ${objectiveTitle || chapterTitle}`
      : assessmentType === 'CHAPTER_MASTERY'
      ? `Chapter Mastery Assessment: ${chapterTitle}`
      : `Spaced Recall Check: ${chapterTitle}`;

  const conceptIdsCovered = Array.from(
    new Set(questionsWithIds.map((q) => q.conceptId).filter((v): v is string => Boolean(v)))
  );

  const storedSet: StoredAssessmentSet = {
    id: setId,
    user_id: userId,
    assessment_type: assessmentType,
    chapter_id: chapterId,
    objective_id: objectiveId,
    concept_ids: conceptIdsCovered,
    title: setTitle,
    question_count: questionsWithIds.length,
    pass_threshold_percent: passThresholdPercent,
    required_concept_coverage_percent: requiredConceptCoveragePercent,
    status: 'ready',
    created_at: nowIso,
    questions: questionsWithIds,
    answerKeysByQuestionId,
  };

  store.sets[setId] = storedSet;
  persistStore();
  void tryPersistSetToSupabase(storedSet, isUuidUser);

  return {
    success: true,
    reused: false,
    model: lastModelUsed,
    assessmentSet: {
      id: storedSet.id,
      assessment_type: storedSet.assessment_type,
      chapter_id: storedSet.chapter_id,
      objective_id: storedSet.objective_id,
      concept_ids: storedSet.concept_ids,
      title: storedSet.title,
      question_count: storedSet.question_count,
      pass_threshold_percent: storedSet.pass_threshold_percent,
      required_concept_coverage_percent: storedSet.required_concept_coverage_percent,
      status: storedSet.status,
      created_at: storedSet.created_at,
    },
    questions: sanitizeQuestionsForClient(
      storedSet.questions as unknown as Array<Record<string, unknown>>
    ),
  };
}

export function handleStartVerificationAttempt(
  userId: string,
  assessmentSetId: string,
  forceNewAttempt = false
) {
  const store = getStore();
  const set = store.sets[assessmentSetId];
  if (!set || set.user_id !== userId) {
    throw new Error('Assessment set not found or expired. Generate a fresh question set.');
  }

  if (!forceNewAttempt) {
    const openAttempt = Object.values(store.attempts).find(
      (a) =>
        a.user_id === userId &&
        a.assessment_set_id === assessmentSetId &&
        a.status === 'in_progress'
    );
    if (openAttempt) {
      return {
        success: true,
        resumed: true,
        attempt: openAttempt,
        assessmentSet: {
          id: set.id,
          assessment_type: set.assessment_type,
          chapter_id: set.chapter_id,
          objective_id: set.objective_id,
          concept_ids: set.concept_ids,
          title: set.title,
          question_count: set.question_count,
          pass_threshold_percent: set.pass_threshold_percent,
          required_concept_coverage_percent: set.required_concept_coverage_percent,
          status: set.status,
          created_at: set.created_at,
        },
        questions: sanitizeQuestionsForClient(
          set.questions as unknown as Array<Record<string, unknown>>
        ),
      };
    }
  }

  const priorCount = Object.values(store.attempts).filter(
    (a) => a.user_id === userId && a.assessment_set_id === assessmentSetId
  ).length;

  const attemptId = crypto.randomUUID();
  const attempt: StoredAttempt = {
    id: attemptId,
    user_id: userId,
    assessment_set_id: set.id,
    assessment_type: set.assessment_type,
    chapter_id: set.chapter_id,
    objective_id: set.objective_id,
    attempt_number: priorCount + 1,
    status: 'in_progress',
    total_questions: set.questions.length,
    correct_count: 0,
    score_percent: 0,
    concept_coverage_percent: 0,
    passed: false,
    started_at: new Date().toISOString(),
    submitted_at: null,
  };

  store.attempts[attemptId] = attempt;
  persistStore();

  return {
    success: true,
    resumed: false,
    attempt,
    assessmentSet: {
      id: set.id,
      assessment_type: set.assessment_type,
      chapter_id: set.chapter_id,
      objective_id: set.objective_id,
      concept_ids: set.concept_ids,
      title: set.title,
      question_count: set.question_count,
      pass_threshold_percent: set.pass_threshold_percent,
      required_concept_coverage_percent: set.required_concept_coverage_percent,
      status: set.status,
      created_at: set.created_at,
    },
    questions: sanitizeQuestionsForClient(
      set.questions as unknown as Array<Record<string, unknown>>
    ),
  };
}

export function handleSubmitVerificationAttempt(
  userId: string,
  body: {
    attemptId?: string;
    answers?: Array<{ questionId: string; selectedOptionId: string; timeSpentSeconds?: number }>;
    durationSeconds?: number;
    reviewScheduleId?: string | null;
  }
) {
  const store = getStore();
  const attemptId = String(body.attemptId || '').trim();
  const attempt = store.attempts[attemptId];
  if (!attempt || attempt.user_id !== userId) {
    throw new Error('Assessment attempt not found. Please start a fresh check.');
  }

  if (attempt.status === 'submitted' && attempt.resultCache) {
    return {
      ...attempt.resultCache,
      alreadySubmitted: true,
    };
  }

  const set = store.sets[attempt.assessment_set_id];
  if (!set) {
    throw new Error('Assessment set missing for this attempt.');
  }

  const chapterKey = `${userId}::${set.chapter_id}`;
  const prevChapter = store.chapterState[chapterKey];

  const existingConceptMap: Record<string, ExistingConceptMasteryState> = {};
  for (const q of set.questions) {
    if (q.conceptId) {
      const ck = `${userId}::${set.chapter_id}::${q.conceptId}`;
      if (store.conceptMastery[ck]) {
        existingConceptMap[q.conceptId] = store.conceptMastery[ck];
      }
    }
  }

  const graded = gradeAssessmentSubmission({
    assessmentType: set.assessment_type,
    passThresholdPercent: set.pass_threshold_percent,
    requiredConceptCoveragePercent: set.required_concept_coverage_percent,
    targetConceptIds: set.concept_ids,
    questions: set.questions.map((q) => ({
      id: q.id,
      conceptId: q.conceptId,
      conceptLabel: q.conceptLabel,
      prompt: q.prompt,
    })),
    answerKeysByQuestionId: set.answerKeysByQuestionId,
    submittedAnswers: Array.isArray(body.answers) ? body.answers : [],
    existingConceptMastery: existingConceptMap,
    existingStudyCompleted: prevChapter?.studyCompleted ?? true,
    existingChapterStatus: prevChapter?.status || 'STUDY_COMPLETE',
    existingFirstMasteredAt: prevChapter?.firstMasteredAt || null,
    existingBestScore: prevChapter?.bestScore || 0,
  });

  const nowIso = new Date().toISOString();
  attempt.status = 'submitted';
  attempt.correct_count = graded.correctCount;
  attempt.score_percent = graded.scorePercent;
  attempt.concept_coverage_percent = graded.conceptCoveragePercent;
  attempt.passed = graded.passed;
  attempt.submitted_at = nowIso;

  // Update server concept mastery memory
  for (const cr of graded.conceptResults) {
    const ck = `${userId}::${set.chapter_id}::${cr.conceptId}`;
    store.conceptMastery[ck] = {
      conceptId: cr.conceptId,
      attemptsCount: cr.attemptsCount,
      correctCount: cr.correctCount,
      masteryScore: cr.masteryScore,
    };
  }

  // Update server chapter state
  store.chapterState[chapterKey] = {
    status: graded.nextChapterStatus,
    studyCompleted:
      Boolean(prevChapter?.studyCompleted) ||
      graded.nextChapterStatus === 'STUDY_COMPLETE' ||
      graded.nextChapterStatus === 'MASTERY_PENDING' ||
      graded.nextChapterStatus === 'MASTERED' ||
      graded.nextChapterStatus === 'NEEDS_REVISION',
    firstMasteredAt:
      prevChapter?.firstMasteredAt ||
      (set.assessment_type === 'CHAPTER_MASTERY' && graded.passed ? nowIso : null),
    bestScore: graded.bestMasteryScore,
  };

  let reviewSchedule: Record<string, unknown> | null = null;
  if (
    set.assessment_type === 'REVISION' ||
    (set.assessment_type === 'CHAPTER_MASTERY' && graded.passed)
  ) {
    const revKey = `${userId}::${set.chapter_id}`;
    const existingRev = store.reviewSchedules[revKey];
    const decision = computeAdaptiveReviewSchedule({
      passed: graded.passed,
      scorePercent: graded.scorePercent,
      existing: existingRev,
    });
    store.reviewSchedules[revKey] = {
      id: existingRev?.id || crypto.randomUUID(),
      intervalStep: decision.intervalStep,
      intervalDays: decision.intervalDays,
      easeFactor: decision.easeFactor,
    };
    reviewSchedule = {
      id: store.reviewSchedules[revKey].id,
      chapter_id: set.chapter_id,
      interval_step: decision.intervalStep,
      interval_days: decision.intervalDays,
      ease_factor: decision.easeFactor,
      due_date: decision.dueDate,
      status: decision.status,
      retention_health_score: decision.retentionHealthScore,
      last_reviewed_at: nowIso,
      created_at: nowIso,
      updated_at: nowIso,
    };
  }

  const { resultCache: _discardedCache, ...attemptSnapshot } = attempt;

  const responsePayload = {
    success: true,
    attempt: attemptSnapshot,
    summary: {
      totalQuestions: graded.totalQuestions,
      correctCount: graded.correctCount,
      scorePercent: graded.scorePercent,
      conceptCoveragePercent: graded.conceptCoveragePercent,
      passed: graded.passed,
      nextObjectiveState: graded.nextObjectiveState,
      nextChapterStatus: graded.nextChapterStatus,
      weakConcepts: graded.weakConcepts,
    },
    gradedAnswers: graded.gradedAnswers,
    conceptResults: graded.conceptResults,
    reviewSchedule,
  };

  attempt.resultCache = responsePayload;
  persistStore();

  return responsePayload;
}

export function handleRecordQuestionFeedback(
  userId: string,
  body: {
    questionId?: string;
    assessmentSetId?: string | null;
    reason?: string;
    comment?: string;
  }
) {
  const store = getStore();
  store.feedback.push({
    id: crypto.randomUUID(),
    userId,
    questionId: body.questionId || '',
    assessmentSetId: body.assessmentSetId || null,
    reason: body.reason || 'other',
    comment: body.comment || '',
    createdAt: new Date().toISOString(),
  });
  persistStore();
  return { success: true };
}
