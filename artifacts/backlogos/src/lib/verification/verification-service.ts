import {
  getActiveUserId,
  getCurrentSessionToken,
  isSupabaseConfigured,
  supabase,
} from '../supabase';
import { getChapterSubtopics } from '../ncert-subtopics';
import { getCurriculumChapterById } from '../curriculum/chapters-index';

export type AssessmentType = 'OBJECTIVE' | 'CHAPTER_MASTERY' | 'REVISION';

export interface VerificationOption {
  id: 'A' | 'B' | 'C' | 'D';
  text: string;
}

export interface VerificationQuestion {
  id: string;
  questionOrder: number;
  conceptId: string | null;
  conceptLabel: string;
  questionType: string;
  difficulty: 'easy' | 'medium' | 'hard' | string;
  cognitiveLevel: string;
  prompt: string;
  options: VerificationOption[];
}

export interface AssessmentSetSummary {
  id: string;
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
}

export interface AssessmentAttemptSummary {
  id: string;
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
}

export interface GradedAnswerItem {
  questionId: string;
  conceptId: string | null;
  conceptLabel: string;
  submittedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string;
  timeSpentSeconds: number;
}

export interface ConceptMasteryResult {
  conceptId: string;
  conceptTitle: string;
  sessionTotal: number;
  sessionCorrect: number;
  sessionScore: number;
  attemptsCount: number;
  correctCount: number;
  masteryScore: number;
  status: 'WEAK' | 'DEVELOPING' | 'MASTERED' | 'NEEDS_REVISION';
}

export interface SubmitAssessmentResponse {
  success: boolean;
  alreadySubmitted?: boolean;
  attempt: AssessmentAttemptSummary;
  summary: {
    totalQuestions: number;
    correctCount: number;
    scorePercent: number;
    conceptCoveragePercent: number;
    passed: boolean;
    nextObjectiveState: string | null;
    nextChapterStatus: string;
    weakConcepts: string[];
  };
  gradedAnswers: GradedAnswerItem[];
  conceptResults: ConceptMasteryResult[];
  reviewSchedule: Record<string, unknown> | null;
}

export interface GenerateAssessmentInput {
  assessmentType: AssessmentType;
  chapterId: string;
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
}

const ENDPOINT_MAP: Record<
  'generate-assessment' | 'start-assessment' | 'submit-assessment' | 'submit-question-feedback',
  string
> = {
  'generate-assessment': '/api/ai/verification/generate',
  'start-assessment': '/api/ai/verification/start',
  'submit-assessment': '/api/ai/verification/submit',
  'submit-question-feedback': '/api/ai/verification/feedback',
};

async function invokeVerificationEdge<T>(
  fnName: 'generate-assessment' | 'start-assessment' | 'submit-assessment' | 'submit-question-feedback',
  payload: Record<string, unknown>
): Promise<T> {
  const token = await getCurrentSessionToken();
  const activeUid = getActiveUserId();
  const endpoint = ENDPOINT_MAP[fnName];

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-guest-uid': activeUid,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: globalThis.Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  } catch (networkErr: any) {
    throw new Error(
      networkErr?.message || 'Unable to reach verification server. Please check your connection and try again.'
    );
  }

  const data = (await response.json().catch(() => null)) as
    | (T & { success?: boolean; error?: string })
    | null;

  if (!response.ok || !data || data.success === false) {
    throw new Error(
      data?.error || `Verification service returned HTTP ${response.status}. Please try again.`
    );
  }

  return data;
}

export async function generateAssessmentSet(input: GenerateAssessmentInput): Promise<{
  reused: boolean;
  assessmentSet: AssessmentSetSummary;
  questions: VerificationQuestion[];
}> {
  const curriculumCh = getCurriculumChapterById(input.chapterId);
  const subtopics = getChapterSubtopics(
    input.chapterId,
    input.chapterTitle || curriculumCh?.title,
    input.subjectName || curriculumCh?.subjectName
  );

  const fallbackConcepts =
    curriculumCh?.topics && curriculumCh.topics.length > 0
      ? curriculumCh.topics.map((t) => ({
          id: t.id,
          title: t.name,
          keyConcepts: [t.name],
          inCbseSyllabus: t.inCbseSyllabus !== false,
        }))
      : subtopics.map((s) => ({
          id: s.id,
          title: s.title,
          keyConcepts: s.coreConcepts,
          inCbseSyllabus: true,
        }));

  return invokeVerificationEdge('generate-assessment', {
    ...input,
    chapterTitle: input.chapterTitle || curriculumCh?.title || input.chapterId,
    subjectName: input.subjectName || curriculumCh?.subjectName || 'Physics',
    grade: input.grade || curriculumCh?.class || '11',
    board: input.board || 'CBSE',
    fallbackConcepts,
  });
}

export async function startAssessmentAttempt(
  assessmentSetId: string,
  forceNewAttempt = false
): Promise<{
  resumed: boolean;
  attempt: AssessmentAttemptSummary;
  assessmentSet: AssessmentSetSummary;
  questions: VerificationQuestion[];
}> {
  return invokeVerificationEdge('start-assessment', {
    assessmentSetId,
    forceNewAttempt,
  });
}

export async function submitAssessmentAttempt(input: {
  attemptId: string;
  answers: Array<{ questionId: string; selectedOptionId: string; timeSpentSeconds?: number }>;
  durationSeconds: number;
  reviewScheduleId?: string | null;
}): Promise<SubmitAssessmentResponse> {
  return invokeVerificationEdge('submit-assessment', input);
}

export async function submitQuestionFeedback(input: {
  questionId: string;
  assessmentSetId?: string | null;
  reason: 'ambiguous' | 'incorrect_answer' | 'out_of_syllabus' | 'duplicate' | 'typo' | 'other';
  comment?: string;
}): Promise<{ success: boolean }> {
  return invokeVerificationEdge('submit-question-feedback', input);
}

export async function fetchChapterMasteryList(userId: string) {
  if (!isSupabaseConfigured || !userId) return [];
  const { data, error } = await supabase
    .from('chapter_mastery')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.warn('[verification-service] fetchChapterMasteryList error:', error.message);
    return [];
  }
  return data || [];
}

export async function fetchConceptMasteryForChapter(userId: string, chapterId: string) {
  if (!isSupabaseConfigured || !userId || !chapterId) return [];
  const { data, error } = await supabase
    .from('concept_mastery')
    .select('*')
    .eq('user_id', userId)
    .eq('chapter_id', chapterId)
    .order('mastery_score', { ascending: true });

  if (error) {
    console.warn('[verification-service] fetchConceptMasteryForChapter error:', error.message);
    return [];
  }
  return data || [];
}

export async function fetchRecentAttemptsForUser(userId: string, limit = 20) {
  if (!isSupabaseConfigured || !userId) return [];
  const { data, error } = await supabase
    .from('assessment_attempts')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'submitted')
    .order('submitted_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('[verification-service] fetchRecentAttemptsForUser error:', error.message);
    return [];
  }
  return data || [];
}
