import { handleCorsPreflight, jsonResponse } from '../_shared/cors.ts';
import { createServiceRoleClient, requireAuthenticatedUser } from '../_shared/supabase-admin.ts';
import {
  generateVerifiedQuestionSet,
  VERIFICATION_GEMINI_MODEL,
} from '../_shared/gemini-generator.ts';
import {
  normalizeConceptCoverageThreshold,
  normalizePassThreshold,
  normalizeTargetQuestionCount,
  sanitizeQuestionsForClient,
  type AssessmentType,
  type SyllabusConceptInput,
} from '../_shared/validation.ts';

interface GenerateRequestBody {
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
  fallbackConcepts?: Array<{ id: string; title: string; keyConcepts?: string[]; inCbseSyllabus?: boolean }>;
}

Deno.serve(async (req: Request) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  if (req.method !== 'POST') {
    return jsonResponse(req, { success: false, error: 'Method not allowed' }, 405);
  }

  const { user, error: authError } = await requireAuthenticatedUser(req);
  if (!user) {
    return jsonResponse(req, { success: false, error: authError || 'Unauthorized' }, 401);
  }

  let body: GenerateRequestBody = {};
  try {
    body = (await req.json()) as GenerateRequestBody;
  } catch {
    return jsonResponse(req, { success: false, error: 'Invalid JSON request body' }, 400);
  }

  const assessmentType = body.assessmentType;
  if (
    assessmentType !== 'OBJECTIVE' &&
    assessmentType !== 'CHAPTER_MASTERY' &&
    assessmentType !== 'REVISION'
  ) {
    return jsonResponse(req, { success: false, error: 'Invalid assessmentType' }, 400);
  }

  const chapterId = String(body.chapterId || '').trim();
  if (!chapterId) {
    return jsonResponse(req, { success: false, error: 'chapterId is required' }, 400);
  }

  const admin = createServiceRoleClient();

  try {
    // 1. Validate objective ownership if objectiveId is supplied
    let objectiveTitle = String(body.objectiveTitle || '').trim();
    const objectiveId = body.objectiveId ? String(body.objectiveId).trim() : null;
    if (objectiveId) {
      const { data: objRow, error: objErr } = await admin
        .from('objectives')
        .select('id, user_id, title, state')
        .eq('id', objectiveId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (objErr || !objRow) {
        return jsonResponse(req, { success: false, error: 'Objective not found for user' }, 404);
      }
      if (!objectiveTitle) objectiveTitle = String(objRow.title || '');
    }

    // 2. Reuse existing ready assessment_set unless forceRegenerate is true
    if (!body.forceRegenerate) {
      let existingQuery = admin
        .from('assessment_sets')
        .select('*')
        .eq('user_id', user.id)
        .eq('assessment_type', assessmentType)
        .eq('chapter_id', chapterId)
        .eq('status', 'ready')
        .order('created_at', { ascending: false })
        .limit(1);

      if (objectiveId) {
        existingQuery = existingQuery.eq('objective_id', objectiveId);
      } else {
        existingQuery = existingQuery.is('objective_id', null);
      }

      const { data: existingSets } = await existingQuery;
      const existingSet = existingSets?.[0];
      if (existingSet) {
        const { data: existingQuestions } = await admin
          .from('questions')
          .select('id, question_order, concept_id, concept_label, question_type, difficulty, cognitive_level, prompt, options')
          .eq('assessment_set_id', existingSet.id)
          .eq('user_id', user.id)
          .order('question_order', { ascending: true });

        if (existingQuestions && existingQuestions.length > 0) {
          return jsonResponse(req, {
            success: true,
            reused: true,
            assessmentSet: existingSet,
            questions: sanitizeQuestionsForClient(existingQuestions),
          });
        }
      }
    }

    // 3. Load student profile + authoritative chapter & concept catalog from DB
    const [{ data: profileRow }, { data: chapterRow }, { data: conceptRows }] = await Promise.all([
      admin.from('profiles').select('board, grade').eq('user_id', user.id).maybeSingle(),
      admin.from('chapters').select('id, title, grade, subject_id, subjects(name)').eq('id', chapterId).maybeSingle(),
      admin
        .from('concepts')
        .select('id, title, key_concepts, in_cbse_syllabus, sequence_order')
        .eq('chapter_id', chapterId)
        .order('sequence_order', { ascending: true }),
    ]);

    const board = String(body.board || profileRow?.board || 'CBSE');
    const grade = String(body.grade || chapterRow?.grade || profileRow?.grade || '11');
    const joinedSubject = (chapterRow as unknown as { subjects?: { name?: string } | null })?.subjects?.name;
    const subjectName = String(body.subjectName || joinedSubject || 'Science');
    const chapterTitle = String(body.chapterTitle || chapterRow?.title || chapterId);

    const dbConcepts: SyllabusConceptInput[] = (conceptRows || []).map((c) => ({
      id: String(c.id),
      title: String(c.title),
      keyConcepts: Array.isArray(c.key_concepts) ? c.key_concepts.map(String) : [],
      inCbseSyllabus: c.in_cbse_syllabus !== false,
    }));

    const allowedConcepts: SyllabusConceptInput[] =
      dbConcepts.length > 0
        ? dbConcepts
        : (body.fallbackConcepts || []).map((c) => ({
            id: String(c.id),
            title: String(c.title),
            keyConcepts: Array.isArray(c.keyConcepts) ? c.keyConcepts : [],
            inCbseSyllabus: c.inCbseSyllabus !== false,
          }));

    const excludedConceptTitles = allowedConcepts
      .filter((c) => c.inCbseSyllabus === false)
      .map((c) => c.title);

    const targetCount = normalizeTargetQuestionCount(assessmentType, body.questionCount);
    const passThresholdPercent = normalizePassThreshold(assessmentType, body.passThresholdPercent);
    const requiredConceptCoveragePercent = normalizeConceptCoverageThreshold(
      assessmentType,
      body.requiredConceptCoveragePercent
    );

    // Avoid repeating prompts from the student's recent questions in this chapter
    const { data: recentPrompts } = await admin
      .from('questions')
      .select('prompt')
      .eq('user_id', user.id)
      .eq('chapter_id', chapterId)
      .order('created_at', { ascending: false })
      .limit(20);

    const jobType =
      assessmentType === 'OBJECTIVE'
        ? 'OBJECTIVE_QUIZ'
        : assessmentType === 'CHAPTER_MASTERY'
        ? 'CHAPTER_MASTERY_QUIZ'
        : 'REVISION_QUIZ';

    const { data: jobRow } = await admin
      .from('ai_generation_jobs')
      .insert({
        user_id: user.id,
        job_type: jobType,
        chapter_id: chapterId,
        objective_id: objectiveId,
        model_name: VERIFICATION_GEMINI_MODEL,
        status: 'running',
      })
      .select('id')
      .single();

    const jobId = jobRow?.id;

    let generated;
    try {
      generated = await generateVerifiedQuestionSet({
        assessmentType,
        board,
        grade,
        subjectName,
        chapterTitle,
        objectiveTitle,
        targetCount,
        requiredConceptCoveragePercent,
        allowedConcepts,
        excludedConceptTitles,
        existingPrompts: (recentPrompts || []).map((r) => String(r.prompt || '')),
      });
    } catch (genErr) {
      const msg = genErr instanceof Error ? genErr.message : 'AI generation failed';
      if (jobId) {
        await admin
          .from('ai_generation_jobs')
          .update({ status: 'failed', error_message: msg, completed_at: new Date().toISOString() })
          .eq('id', jobId);
      }
      return jsonResponse(req, { success: false, error: msg }, 502);
    }

    const minAcceptable =
      assessmentType === 'OBJECTIVE' ? 3 : assessmentType === 'CHAPTER_MASTERY' ? 15 : 5;

    if (generated.questions.length < minAcceptable) {
      const errMsg = `Validation passed only ${generated.questions.length}/${minAcceptable} questions. Retry generation.`;
      if (jobId) {
        await admin
          .from('ai_generation_jobs')
          .update({
            status: 'failed',
            error_message: errMsg,
            validation_report: generated.validationReport,
            prompt_tokens: generated.usage.promptTokens,
            output_tokens: generated.usage.outputTokens,
            completed_at: new Date().toISOString(),
          })
          .eq('id', jobId);
      }
      return jsonResponse(
        req,
        {
          success: false,
          error: errMsg,
          validationReport: generated.validationReport,
        },
        422
      );
    }

    // 4. Persist assessment_set + sanitized questions + server-only answer keys
    const setTitle =
      assessmentType === 'OBJECTIVE'
        ? `Objective Verification: ${objectiveTitle || chapterTitle}`
        : assessmentType === 'CHAPTER_MASTERY'
        ? `Chapter Mastery Assessment: ${chapterTitle}`
        : `Spaced Recall Check: ${chapterTitle}`;

    const conceptIdsCovered = Array.from(
      new Set(generated.questions.map((q) => q.conceptId).filter((v): v is string => Boolean(v)))
    );

    const { data: setRow, error: setErr } = await admin
      .from('assessment_sets')
      .insert({
        user_id: user.id,
        assessment_type: assessmentType,
        chapter_id: chapterId,
        objective_id: objectiveId,
        concept_ids: conceptIdsCovered,
        title: setTitle,
        question_count: generated.questions.length,
        pass_threshold_percent: passThresholdPercent,
        required_concept_coverage_percent: requiredConceptCoveragePercent,
        status: 'ready',
        syllabus_version: `${board}-2026-27`,
        metadata: {
          subjectName,
          chapterTitle,
          grade,
          validationReport: generated.validationReport,
        },
      })
      .select('*')
      .single();

    if (setErr || !setRow) {
      throw new Error(setErr?.message || 'Failed to persist assessment set');
    }

    const dbConceptIdSet = new Set(dbConcepts.map((c) => c.id));
    const questionInsertPayload = generated.questions.map((q) => ({
      assessment_set_id: setRow.id,
      user_id: user.id,
      chapter_id: chapterId,
      concept_id: q.conceptId && dbConceptIdSet.has(q.conceptId) ? q.conceptId : null,
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

    const { data: insertedQuestions, error: qErr } = await admin
      .from('questions')
      .insert(questionInsertPayload)
      .select('id, question_order, concept_id, concept_label, question_type, difficulty, cognitive_level, prompt, options');

    if (qErr || !insertedQuestions) {
      throw new Error(qErr?.message || 'Failed to persist questions');
    }

    // Store answer keys exclusively in server-only table `question_answer_keys`
    const orderToValidated = new Map(generated.questions.map((q) => [q.questionOrder, q]));
    const keyInsertPayload = insertedQuestions.map((row) => {
      const matched = orderToValidated.get(Number(row.question_order));
      return {
        question_id: row.id,
        correct_option_id: matched?.correctOptionId || 'A',
        acceptable_answers: [matched?.correctOptionId || 'A'],
        explanation: matched?.explanation || '',
        grading_rubric: {
          conceptId: matched?.conceptId || null,
          conceptLabel: matched?.conceptLabel || '',
        },
      };
    });

    const { error: keyErr } = await admin.from('question_answer_keys').insert(keyInsertPayload);
    if (keyErr) {
      throw new Error(`Failed to isolate server answer keys: ${keyErr.message}`);
    }

    // Update job status + lifecycle pending states safely
    if (jobId) {
      await admin
        .from('ai_generation_jobs')
        .update({
          assessment_set_id: setRow.id,
          status: 'validated',
          validation_report: generated.validationReport,
          prompt_tokens: generated.usage.promptTokens,
          output_tokens: generated.usage.outputTokens,
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId);
    }

    if (objectiveId && assessmentType === 'OBJECTIVE') {
      await admin
        .from('objectives')
        .update({ state: 'VERIFICATION_PENDING' })
        .eq('id', objectiveId)
        .eq('user_id', user.id)
        .neq('state', 'VERIFIED');
    } else if (assessmentType === 'CHAPTER_MASTERY') {
      await admin
        .from('chapter_mastery')
        .update({ status: 'MASTERY_PENDING' })
        .eq('user_id', user.id)
        .eq('chapter_id', chapterId)
        .eq('study_completed', true)
        .not('status', 'in', '("MASTERED","NEEDS_REVISION")');
    }

    return jsonResponse(req, {
      success: true,
      reused: false,
      assessmentSet: setRow,
      questions: sanitizeQuestionsForClient(insertedQuestions),
      validationReport: generated.validationReport,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    return jsonResponse(req, { success: false, error: message }, 500);
  }
});
