import { handleCorsPreflight, jsonResponse } from '../_shared/cors.ts';
import { createServiceRoleClient, requireAuthenticatedUser } from '../_shared/supabase-admin.ts';
import { sanitizeQuestionsForClient } from '../_shared/validation.ts';

interface StartAssessmentBody {
  assessmentSetId?: string;
  forceNewAttempt?: boolean;
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

  let body: StartAssessmentBody = {};
  try {
    body = (await req.json()) as StartAssessmentBody;
  } catch {
    return jsonResponse(req, { success: false, error: 'Invalid JSON request body' }, 400);
  }

  const assessmentSetId = String(body.assessmentSetId || '').trim();
  if (!assessmentSetId) {
    return jsonResponse(req, { success: false, error: 'assessmentSetId is required' }, 400);
  }

  const admin = createServiceRoleClient();

  try {
    const { data: setRow, error: setErr } = await admin
      .from('assessment_sets')
      .select('*')
      .eq('id', assessmentSetId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (setErr || !setRow) {
      return jsonResponse(req, { success: false, error: 'Assessment set not found' }, 404);
    }

    const { data: questionRows, error: qErr } = await admin
      .from('questions')
      .select('id, question_order, concept_id, concept_label, question_type, difficulty, cognitive_level, prompt, options')
      .eq('assessment_set_id', setRow.id)
      .eq('user_id', user.id)
      .order('question_order', { ascending: true });

    if (qErr || !questionRows || questionRows.length === 0) {
      return jsonResponse(req, { success: false, error: 'No validated questions found for this assessment' }, 404);
    }

    // Reuse an active in_progress attempt for this set unless caller requests a fresh attempt
    if (!body.forceNewAttempt) {
      const { data: openAttempt } = await admin
        .from('assessment_attempts')
        .select('*')
        .eq('user_id', user.id)
        .eq('assessment_set_id', setRow.id)
        .eq('status', 'in_progress')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (openAttempt) {
        return jsonResponse(req, {
          success: true,
          resumed: true,
          attempt: openAttempt,
          assessmentSet: setRow,
          questions: sanitizeQuestionsForClient(questionRows),
        });
      }
    }

    const { count: priorAttempts } = await admin
      .from('assessment_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('assessment_set_id', setRow.id);

    const nextAttemptNumber = (priorAttempts || 0) + 1;

    const { data: newAttempt, error: attErr } = await admin
      .from('assessment_attempts')
      .insert({
        user_id: user.id,
        assessment_set_id: setRow.id,
        assessment_type: setRow.assessment_type,
        chapter_id: setRow.chapter_id,
        objective_id: setRow.objective_id,
        attempt_number: nextAttemptNumber,
        status: 'in_progress',
        total_questions: questionRows.length,
      })
      .select('*')
      .single();

    if (attErr || !newAttempt) {
      throw new Error(attErr?.message || 'Unable to start assessment attempt');
    }

    return jsonResponse(req, {
      success: true,
      resumed: false,
      attempt: newAttempt,
      assessmentSet: setRow,
      questions: sanitizeQuestionsForClient(questionRows),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to start assessment';
    return jsonResponse(req, { success: false, error: message }, 500);
  }
});
