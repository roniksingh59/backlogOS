import { GoogleGenAI, Type } from 'npm:@google/genai@^2.29.1';
import {
  validateQuestionSetBatch,
  type AssessmentType,
  type GeneratedQuestionCandidate,
  type SyllabusConceptInput,
  type ValidatedQuestionRecord,
} from './validation.ts';

export const VERIFICATION_GEMINI_MODEL = 'gemini-4-hydrogen';

export interface GenerateVerifiedSetParams {
  assessmentType: AssessmentType;
  board: string;
  grade: string;
  subjectName: string;
  chapterTitle: string;
  objectiveTitle?: string;
  targetCount: number;
  requiredConceptCoveragePercent: number;
  allowedConcepts: SyllabusConceptInput[];
  excludedConceptTitles: string[];
  existingPrompts?: string[];
}

export interface GenerateVerifiedSetResult {
  questions: ValidatedQuestionRecord[];
  conceptCoveragePercent: number;
  coverageMet: boolean;
  validationReport: {
    attempts: number;
    rawGenerated: number;
    acceptedCount: number;
    rejectedCount: number;
    rejectedReasons: Array<{ prompt: string; reasons: string[] }>;
    conceptCoveragePercent: number;
    coverageMet: boolean;
  };
  usage: {
    promptTokens: number;
    outputTokens: number;
  };
}

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
            description: 'Step-by-step conceptual reasoning verifying why correctOptionId is right and distractors fail.',
          },
          syllabusAlignmentNote: {
            type: Type.STRING,
            description: 'How this question aligns strictly with NCERT CBSE syllabus.',
          },
          selfCheckPassed: {
            type: Type.BOOLEAN,
            description: 'True only after verifying mathematical/factual correctness and single unambiguous answer.',
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

function createGeminiClient(): GoogleGenAI {
  const apiKey = Deno.env.get('GEMINI_API_KEY') || '';
  if (!apiKey || apiKey.trim().length < 20) {
    throw new Error('GEMINI_API_KEY is not configured in Edge Function secrets.');
  }
  return new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function buildAssessmentPrompt(
  params: GenerateVerifiedSetParams,
  neededCount: number,
  alreadyCoveredConceptIds: Set<string>,
  avoidStems: string[]
): string {
  const activeConcepts = params.allowedConcepts.filter((c) => c.inCbseSyllabus !== false);
  const conceptLines =
    activeConcepts.length > 0
      ? activeConcepts
          .map((c) => {
            const mark = alreadyCoveredConceptIds.has(c.id) ? '[already covered]' : '[PRIORITY TO COVER]';
            const keys = (c.keyConcepts || []).slice(0, 4).join('; ');
            return `- ID="${c.id}" | Title="${c.title}" ${mark}${keys ? ` | Core Points: ${keys}` : ''}`;
          })
          .join('\n')
      : `- ID="" | Title="${params.chapterTitle} Core Concepts"`;

  const excludedBlock =
    params.excludedConceptTitles.length > 0
      ? `\nDO NOT TEST excluded/rationalized out-of-syllabus topics: ${params.excludedConceptTitles.join(', ')}.`
      : '';

  const avoidBlock =
    avoidStems.length > 0
      ? `\nDO NOT repeat or paraphrase any of these existing prompts:\n${avoidStems
          .slice(-12)
          .map((s, i) => `${i + 1}. ${s.slice(0, 140)}`)
          .join('\n')}`
      : '';

  const focusDirective =
    params.assessmentType === 'OBJECTIVE'
      ? `Generate ${neededCount} conceptual and application-based questions verifying the student's learning objective: "${
          params.objectiveTitle || params.chapterTitle
        }". Avoid superficial trivia.`
      : params.assessmentType === 'CHAPTER_MASTERY'
      ? `Generate ${neededCount} comprehensive chapter mastery questions spanning ALL priority concepts listed below across difficulty levels (easy, medium, hard) and conceptual/application/analysis thinking.`
      : `Generate ${neededCount} high-yield active-recall & trap-focused spaced revision questions testing long-term conceptual retention.`;

  return `${focusDirective}

Academic Context:
- Board: ${params.board} (Session 2026-27)
- Grade: Class ${params.grade}
- Subject: ${params.subjectName}
- Chapter: ${params.chapterTitle}

Allowed Syllabus Concepts (map every question's conceptId accurately):
${conceptLines}
${excludedBlock}
${avoidBlock}

Strict Quality Rules:
1. Exactly 4 mutually exclusive options (id: A, B, C, D) per question.
2. Never combine "All of the above" and "None of the above".
3. Never use ambiguous "Both A and B" unless paired thoughtfully without contradictions.
4. Solve each question step-by-step internally before setting correctOptionId and explanation.
5. Set selfCheckPassed=true only when calculations, units, signs, and CBSE syllabus facts are 100% verified.`;
}

export async function generateVerifiedQuestionSet(
  params: GenerateVerifiedSetParams
): Promise<GenerateVerifiedSetResult> {
  const ai = createGeminiClient();
  const accepted: ValidatedQuestionRecord[] = [];
  const rejectedReasons: Array<{ prompt: string; reasons: string[] }> = [];
  const coveredConceptIds = new Set<string>();
  const seenPrompts = [...(params.existingPrompts || [])];

  let attempts = 0;
  let rawGenerated = 0;
  let promptTokens = 0;
  let outputTokens = 0;

  // Up to 3 generation passes so validator drops (duplicates/ambiguity/bad alignment) can be cleanly healed
  while (accepted.length < params.targetCount && attempts < 3) {
    attempts += 1;
    const deficit = params.targetCount - accepted.length;
    const requestBatchCount = Math.min(25, Math.max(deficit, deficit + Math.ceil(deficit * 0.25)));

    const prompt = buildAssessmentPrompt(params, requestBatchCount, coveredConceptIds, seenPrompts);

    const response = await ai.models.generateContent({
      model: VERIFICATION_GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction:
          'You are an exacting CBSE/NCERT Senior Academic Assessment Author & Validator. Return strictly valid JSON matching the schema.',
        responseMimeType: 'application/json',
        responseSchema: QUESTION_RESPONSE_SCHEMA,
      },
    });

    const usageMeta = (response as unknown as { usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number } })?.usageMetadata;
    promptTokens += Number(usageMeta?.promptTokenCount || 0);
    outputTokens += Number(usageMeta?.candidatesTokenCount || 0);

    const rawText = (response.text ?? '{"questions":[]}').trim();
    let parsed: { questions?: GeneratedQuestionCandidate[] } = {};
    try {
      parsed = JSON.parse(rawText);
    } catch {
      rejectedReasons.push({
        prompt: `(attempt ${attempts} JSON parse failure)`,
        reasons: ['Model returned malformed JSON'],
      });
      continue;
    }

    const candidates = Array.isArray(parsed.questions) ? parsed.questions : [];
    rawGenerated += candidates.length;

    const batchResult = validateQuestionSetBatch(
      candidates,
      {
        assessmentType: params.assessmentType,
        subjectName: params.subjectName,
        chapterTitle: params.chapterTitle,
        grade: params.grade,
        allowedConcepts: params.allowedConcepts,
        excludedConceptTitles: params.excludedConceptTitles,
        existingPrompts: seenPrompts,
      },
      deficit,
      params.requiredConceptCoveragePercent
    );

    for (const q of batchResult.accepted) {
      seenPrompts.push(q.prompt);
      if (q.conceptId) coveredConceptIds.add(q.conceptId);
      accepted.push({
        ...q,
        questionOrder: accepted.length + 1,
      });
    }

    rejectedReasons.push(...batchResult.rejected);
  }

  const finalCheck = validateQuestionSetBatch(
    [],
    {
      assessmentType: params.assessmentType,
      subjectName: params.subjectName,
      chapterTitle: params.chapterTitle,
      grade: params.grade,
      allowedConcepts: params.allowedConcepts,
      excludedConceptTitles: params.excludedConceptTitles,
    },
    params.targetCount,
    params.requiredConceptCoveragePercent
  );

  // Recompute coverage over final accepted array cleanly
  const inSyllabusConcepts = params.allowedConcepts.filter((c) => c.inCbseSyllabus !== false);
  const coveredSet = new Set(accepted.map((q) => q.conceptId).filter(Boolean));
  const denom =
    params.assessmentType === 'CHAPTER_MASTERY' && inSyllabusConcepts.length > 0
      ? Math.min(inSyllabusConcepts.length, accepted.length)
      : Math.max(1, coveredSet.size);

  const conceptCoveragePercent =
    params.assessmentType === 'CHAPTER_MASTERY' && inSyllabusConcepts.length > 0
      ? Number(((coveredSet.size / denom) * 100).toFixed(2))
      : accepted.length > 0
      ? 100
      : 0;

  const coverageMet =
    params.assessmentType !== 'CHAPTER_MASTERY' ||
    inSyllabusConcepts.length <= 1 ||
    conceptCoveragePercent >= Math.min(100, params.requiredConceptCoveragePercent);

  void finalCheck;

  return {
    questions: accepted,
    conceptCoveragePercent,
    coverageMet,
    validationReport: {
      attempts,
      rawGenerated,
      acceptedCount: accepted.length,
      rejectedCount: rejectedReasons.length,
      rejectedReasons: rejectedReasons.slice(0, 15),
      conceptCoveragePercent,
      coverageMet,
    },
    usage: {
      promptTokens,
      outputTokens,
    },
  };
}
