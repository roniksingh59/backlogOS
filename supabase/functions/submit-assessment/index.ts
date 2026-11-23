import { handleCorsPreflight, jsonResponse } from '../_shared/cors.ts';
import { createServiceRoleClient, requireAuthenticatedUser } from '../_shared/supabase-admin.ts';
import {
  computeAdaptiveReviewSchedule,
  gradeAssessmentSubmission,
  type AssessmentType,
  type ExistingConceptMasteryState,
  type ExistingReviewScheduleState,
  type StoredAnswerKey,
  type SubmissionAnswerInput,
} from '../_shared/validation.ts';

interface SubmitAssessmentBody {
  attemptId?: string;
  answers?: SubmissionAnswerInput[];
  durationSeconds?: number;
  reviewScheduleId?: string | null;
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

  let body: SubmitAssessmentBody = {};
  try {
    body = (await req.json()) as SubmitAssessmentBody;
  } catch {
    return jsonResponse(req, { success: false, error: 'Invalid JSON request body' }, 400);
  }

  const attemptId = String(body.attemptId || '').trim();
  if (!attemptId) {
    return jsonResponse(req, { success: false, error: 'attemptId is required' }, 400);
  }

  const submittedAnswers = Array.isArray(body.answers) ? body.answers : [];
  const admin = createServiceRoleClient();

  try {
    // 1. Verify attempt ownership & prevent duplicate grading of already-submitted attempts
    const { data: attemptRow, error: attErr } = await admin
      .from('assessment_attempts')
      .select('*')
      .eq('id', attemptId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (attErr || !attemptRow) {
      return jsonResponse(req, { success: false, error: 'Assessment attempt not found' }, 404);
    }

    if (attemptRow.status === 'submitted') {
      const { data: priorAnswers } = await admin
        .from('attempt_answers')
        .select('*')
        .eq('attempt_id', attemptRow.id)
        .eq('user_id', user.id);

      return jsonResponse(req, {
        success: true,
        alreadySubmitted: true,
        attempt: attemptRow,
        gradedAnswers: priorAnswers || [],
      });
    }

    // 2. Load assessment_set, sanitized questions, and server-only answer keys
    const [{ data: setRow }, { data: questionRows }] = await Promise.all([
      admin
        .from('assessment_sets')
        .select('*')
        .eq('id', attemptRow.assessment_set_id)
        .eq('user_id', user.id)
        .single(),
      admin
        .from('questions')
        .select('id, concept_id, concept_label, prompt')
        .eq('assessment_set_id', attemptRow.assessment_set_id)
        .eq('user_id', user.id)
        .order('question_order', { ascending: true }),
    ]);

    if (!setRow || !questionRows || questionRows.length === 0) {
      return jsonResponse(req, { success: false, error: 'Assessment data missing' }, 404);
    }

    const questionIds = questionRows.map((q) => String(q.id));
    const { data: keyRows, error: keyErr } = await admin
      .from('question_answer_keys')
      .select('question_id, correct_option_id, explanation')
      .in('question_id', questionIds);

    if (keyErr || !keyRows || keyRows.length === 0) {
      return jsonResponse(req, { success: false, error: 'Server answer keys unavailable' }, 500);
    }

    const answerKeysByQuestionId: Record<string, StoredAnswerKey> = {};
    for (const kr of keyRows) {
      answerKeysByQuestionId[String(kr.question_id)] = {
        questionId: String(kr.question_id),
        correctOptionId: String(kr.correct_option_id || ''),
        explanation: String(kr.explanation || ''),
      };
    }

    // 3. Load existing concept mastery, chapter mastery, backlog status, and chapter catalog concepts
    const [
      { data: existingConcepts },
      { data: existingChapterRow },
      { data: existingBacklogRow },
      { data: catalogConcepts },
    ] = await Promise.all([
      admin
        .from('concept_mastery')
        .select('concept_id, attempts_count, correct_count, mastery_score')
        .eq('user_id', user.id)
        .eq('chapter_id', attemptRow.chapter_id),
      admin
        .from('chapter_mastery')
        .select('*')
        .eq('user_id', user.id)
        .eq('chapter_id', attemptRow.chapter_id)
        .maybeSingle(),
      admin
        .from('student_backlog')
        .select('status')
        .eq('user_id', user.id)
        .eq('chapter_id', attemptRow.chapter_id)
        .maybeSingle(),
      admin
        .from('concepts')
        .select('id')
        .eq('chapter_id', attemptRow.chapter_id)
        .eq('in_cbse_syllabus', true),
    ]);

    const existingConceptMastery: Record<string, ExistingConceptMasteryState> = {};
    for (const cm of existingConcepts || []) {
      existingConceptMastery[String(cm.concept_id)] = {
        conceptId: String(cm.concept_id),
        attemptsCount: Number(cm.attempts_count || 0),
        correctCount: Number(cm.correct_count || 0),
        masteryScore: Number(cm.mastery_score || 0),
      };
    }

    const targetConceptIds =
      Array.isArray(setRow.concept_ids) && setRow.concept_ids.length > 0
        ? setRow.concept_ids.map(String)
        : (catalogConcepts || []).map((c) => String(c.id));

    const inferredStudyCompleted =
      Boolean(existingChapterRow?.study_completed) ||
      ['STUDY_COMPLETE', 'MASTERY_PENDING', 'MASTERED', 'NEEDS_REVISION'].includes(
        String(existingBacklogRow?.status || '')
      );

    const assessmentType = attemptRow.assessment_type as AssessmentType;
    const grading = gradeAssessmentSubmission({
      assessmentType,
      passThresholdPercent: Number(setRow.pass_threshold_percent || 70),
      requiredConceptCoveragePercent: Number(setRow.required_concept_coverage_percent || 60),
      targetConceptIds,
      questions: questionRows.map((q) => ({
        id: String(q.id),
        conceptId: q.concept_id ? String(q.concept_id) : null,
        conceptLabel: String(q.concept_label || ''),
        prompt: String(q.prompt || ''),
      })),
      answerKeysByQuestionId,
      submittedAnswers,
      existingConceptMastery,
      existingStudyCompleted: inferredStudyCompleted,
      existingChapterStatus: existingChapterRow?.status
        ? String(existingChapterRow.status)
        : String(existingBacklogRow?.status || 'IN_PROGRESS'),
      existingFirstMasteredAt: existingChapterRow?.first_mastered_at
        ? String(existingChapterRow.first_mastered_at)
        : null,
      existingBestScore: Number(existingChapterRow?.best_mastery_score || 0),
    });

    const nowIso = new Date().toISOString();

    // 4. Persist attempt_answers (revealing correct answer + explanation post-submission ONLY)
    const attemptAnswerRows = grading.gradedAnswers.map((ga) => ({
      attempt_id: attemptRow.id,
      question_id: ga.questionId,
      user_id: user.id,
      submitted_answer: ga.submittedAnswer || null,
      submitted_payload: { selectedOptionId: ga.submittedAnswer || null },
      is_correct: ga.isCorrect,
      score_awarded: ga.isCorrect ? 1 : 0,
      revealed_correct_answer: ga.correctAnswer,
      revealed_explanation: ga.explanation,
      time_spent_seconds: ga.timeSpentSeconds,
      answered_at: nowIso,
    }));

    const { error: aaErr } = await admin
      .from('attempt_answers')
      .upsert(attemptAnswerRows, { onConflict: 'attempt_id,question_id' });
    if (aaErr) throw new Error(`Failed saving attempt answers: ${aaErr.message}`);

    const feedbackSummary = {
      passed: grading.passed,
      scorePercent: grading.scorePercent,
      conceptCoveragePercent: grading.conceptCoveragePercent,
      weakConcepts: grading.weakConcepts,
      recommendation: grading.passed
        ? 'Mastery verified. Keep reinforcing through scheduled spaced reviews.'
        : 'Study progress is preserved. Review weak concepts highlighted below and re-verify.',
    };

    // 5. Finalize assessment_attempts row
    const { data: finalizedAttempt, error: finErr } = await admin
      .from('assessment_attempts')
      .update({
        status: 'submitted',
        total_questions: grading.totalQuestions,
        correct_count: grading.correctCount,
        score_percent: grading.scorePercent,
        concept_coverage_percent: grading.conceptCoveragePercent,
        passed: grading.passed,
        duration_seconds: Math.max(0, Math.round(Number(body.durationSeconds || 0))),
        feedback_summary: feedbackSummary,
        submitted_at: nowIso,
      })
      .eq('id', attemptRow.id)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (finErr) throw new Error(`Failed finalizing attempt: ${finErr.message}`);

    // 6. Update concept_mastery per tested concept
    const catalogIdSet = new Set((catalogConcepts || []).map((c) => String(c.id)));
    if (grading.conceptResults.length > 0) {
      const conceptUpserts = grading.conceptResults.map((cr) => ({
        user_id: user.id,
        chapter_id: attemptRow.chapter_id,
        concept_id: cr.conceptId,
        catalog_concept_id: catalogIdSet.has(cr.conceptId) ? cr.conceptId : null,
        concept_title: cr.conceptTitle,
        mastery_score: cr.masteryScore,
        attempts_count: cr.attemptsCount,
        correct_count: cr.correctCount,
        status: cr.status,
        last_assessed_at: nowIso,
      }));

      await admin
        .from('concept_mastery')
        .upsert(conceptUpserts, { onConflict: 'user_id,chapter_id,concept_id' });
    }

    // 7. Update Objective or Chapter Mastery + append immutable mastery_history
    if (assessmentType === 'OBJECTIVE' && attemptRow.objective_id && grading.nextObjectiveState) {
      await admin
        .from('objectives')
        .update({
          state: grading.nextObjectiveState,
          verified_at: grading.passed ? nowIso : null,
        })
        .eq('id', attemptRow.objective_id)
        .eq('user_id', user.id);

      await admin.from('mastery_history').insert({
        user_id: user.id,
        chapter_id: attemptRow.chapter_id,
        event_type: grading.passed ? 'OBJECTIVE_VERIFIED' : 'OBJECTIVE_FAILED',
        previous_status: 'VERIFICATION_PENDING',
        new_status: grading.nextObjectiveState,
        score_percent: grading.scorePercent,
        attempt_id: attemptRow.id,
        notes: grading.passed
          ? `Objective verified (${grading.scorePercent}%)`
          : `Objective needs relearning (${grading.scorePercent}%)`,
      });
    }

    let reviewUpdate: Record<string, unknown> | null = null;

    if (assessmentType === 'CHAPTER_MASTERY' || assessmentType === 'REVISION') {
      const prevStatus = existingChapterRow?.status ? String(existingChapterRow.status) : 'NOT_STARTED';
      const firstMasteredAt =
        existingChapterRow?.first_mastered_at ||
        (grading.nextChapterStatus === 'MASTERED' ? nowIso : null);
      const lastMasteredAt =
        grading.nextChapterStatus === 'MASTERED'
          ? nowIso
          : existingChapterRow?.last_mastered_at || null;

      await admin.from('chapter_mastery').upsert(
        {
          user_id: user.id,
          chapter_id: attemptRow.chapter_id,
          status: grading.nextChapterStatus,
          study_completed: Boolean(existingChapterRow?.study_completed),
          mastery_score: grading.scorePercent,
          best_mastery_score: grading.bestMasteryScore,
          concept_coverage_percent: grading.conceptCoveragePercent,
          attempts_count: Number(existingChapterRow?.attempts_count || 0) + 1,
          last_assessment_attempt_id: attemptRow.id,
          study_completed_at: existingChapterRow?.study_completed_at || null,
          first_mastered_at: firstMasteredAt,
          last_mastered_at: lastMasteredAt,
        },
        { onConflict: 'user_id,chapter_id' }
      );

      // Keep student_backlog.status synchronized when a chapter achieves MASTERED or NEEDS_REVISION
      await admin
        .from('student_backlog')
        .update({ status: grading.nextChapterStatus })
        .eq('user_id', user.id)
        .eq('chapter_id', attemptRow.chapter_id);

      const historyEvent =
        assessmentType === 'CHAPTER_MASTERY'
          ? grading.passed
            ? 'CHAPTER_MASTERED'
            : 'CHAPTER_FAILED'
          : grading.passed
          ? 'REVISION_PASSED'
          : 'REVISION_DECAYED';

      await admin.from('mastery_history').insert({
        user_id: user.id,
        chapter_id: attemptRow.chapter_id,
        event_type: historyEvent,
        previous_status: prevStatus,
        new_status: grading.nextChapterStatus,
        score_percent: grading.scorePercent,
        attempt_id: attemptRow.id,
        notes: `${assessmentType} evaluated: ${grading.correctCount}/${grading.totalQuestions} (${grading.scorePercent}%), concept coverage ${grading.conceptCoveragePercent}%`,
      });

      // Spaced retention schedule updates (1, 3, 7, 14, 30 adaptive cadence)
      const { data: existingSchedule } = await admin
        .from('review_schedule')
        .select('id, interval_step, interval_days, ease_factor')
        .eq('user_id', user.id)
        .eq('chapter_id', attemptRow.chapter_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const existingState: ExistingReviewScheduleState | null = existingSchedule
        ? {
            id: String(existingSchedule.id),
            intervalStep: Number(existingSchedule.interval_step || 1),
            intervalDays: Number(existingSchedule.interval_days || 1),
            easeFactor: Number(existingSchedule.ease_factor || 2.5),
          }
        : null;

      if (assessmentType === 'CHAPTER_MASTERY' && grading.passed && !existingState) {
        const initialDecision = computeAdaptiveReviewSchedule({
          passed: true,
          scorePercent: grading.scorePercent,
          existing: { intervalStep: 0, intervalDays: 1, easeFactor: 2.5 },
        });
        const { data: insertedSchedule } = await admin
          .from('review_schedule')
          .insert({
            user_id: user.id,
            chapter_id: attemptRow.chapter_id,
            interval_step: initialDecision.intervalStep,
            interval_days: initialDecision.intervalDays,
            ease_factor: initialDecision.easeFactor,
            due_date: initialDecision.dueDate,
            status: 'SCHEDULED',
            retention_health_score: initialDecision.retentionHealthScore,
            last_reviewed_at: nowIso,
          })
          .select('*')
          .single();
        reviewUpdate = insertedSchedule || null;
      } else if (assessmentType === 'REVISION') {
        const decision = computeAdaptiveReviewSchedule({
          passed: grading.passed,
          scorePercent: grading.scorePercent,
          existing: existingState,
        });

        let scheduleId = existingState?.id || (body.reviewScheduleId ? String(body.reviewScheduleId) : null);
        if (scheduleId) {
          const { data: updatedSched } = await admin
            .from('review_schedule')
            .update({
              interval_step: decision.intervalStep,
              interval_days: decision.intervalDays,
              ease_factor: decision.easeFactor,
              due_date: decision.dueDate,
              status: decision.status,
              retention_health_score: decision.retentionHealthScore,
              last_reviewed_at: nowIso,
            })
            .eq('id', scheduleId)
            .eq('user_id', user.id)
            .select('*')
            .single();
          reviewUpdate = updatedSched || null;
        } else {
          const { data: createdSched } = await admin
            .from('review_schedule')
            .insert({
              user_id: user.id,
              chapter_id: attemptRow.chapter_id,
              interval_step: decision.intervalStep,
              interval_days: decision.intervalDays,
              ease_factor: decision.easeFactor,
              due_date: decision.dueDate,
              status: decision.status,
              retention_health_score: decision.retentionHealthScore,
              last_reviewed_at: nowIso,
            })
            .select('*')
            .single();
          scheduleId = createdSched?.id ? String(createdSched.id) : null;
          reviewUpdate = createdSched || null;
        }

        if (scheduleId) {
          await admin.from('review_attempts').insert({
            review_schedule_id: scheduleId,
            user_id: user.id,
            chapter_id: attemptRow.chapter_id,
            assessment_attempt_id: attemptRow.id,
            recall_quality: decision.recallQuality,
            score_percent: grading.scorePercent,
            passed: grading.passed,
            previous_interval_days: existingState?.intervalDays ?? 1,
            next_interval_days: decision.intervalDays,
            reviewed_at: nowIso,
          });
        }
      }
    }

    return jsonResponse(req, {
      success: true,
      alreadySubmitted: false,
      attempt: finalizedAttempt,
      summary: {
        totalQuestions: grading.totalQuestions,
        correctCount: grading.correctCount,
        scorePercent: grading.scorePercent,
        conceptCoveragePercent: grading.conceptCoveragePercent,
        passed: grading.passed,
        nextObjectiveState: grading.nextObjectiveState,
        nextChapterStatus: grading.nextChapterStatus,
        weakConcepts: grading.weakConcepts,
      },
      gradedAnswers: grading.gradedAnswers,
      conceptResults: grading.conceptResults,
      reviewSchedule: reviewUpdate,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server grading failed';
    return jsonResponse(req, { success: false, error: message }, 500);
  }
});
