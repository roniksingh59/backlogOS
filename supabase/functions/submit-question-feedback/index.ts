import { handleCorsPreflight, jsonResponse } from '../_shared/cors.ts';
import { createServiceRoleClient, requireAuthenticatedUser } from '../_shared/supabase-admin.ts';

interface FeedbackBody {
  questionId?: string;
  assessmentSetId?: string | null;
  reason?: string;
  comment?: string;
}

const ALLOWED_REASONS = new Set([
  'ambiguous',
  'incorrect_answer',
  'out_of_syllabus',
  'duplicate',
  'typo',
  'other',
]);

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

  let body: FeedbackBody = {};
  try {
    body = (await req.json()) as FeedbackBody;
  } catch {
    return jsonResponse(req, { success: false, error: 'Invalid JSON request body' }, 400);
  }

  const questionId = String(body.questionId || '').trim();
  const reason = String(body.reason || 'other').trim().toLowerCase();
  const comment = String(body.comment || '').trim().slice(0, 1000);

  if (!questionId) {
    return jsonResponse(req, { success: false, error: 'questionId is required' }, 400);
  }
  if (!ALLOWED_REASONS.has(reason)) {
    return jsonResponse(req, { success: false, error: 'Invalid feedback reason' }, 400);
  }

  const admin = createServiceRoleClient();

  try {
    const { data: qRow, error: qErr } = await admin
      .from('questions')
      .select('id, assessment_set_id, user_id')
      .eq('id', questionId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (qErr || !qRow) {
      return jsonResponse(req, { success: false, error: 'Question not found for user' }, 404);
    }

    const { data: saved, error: fbErr } = await admin
      .from('question_feedback')
      .upsert(
        {
          user_id: user.id,
          question_id: qRow.id,
          assessment_set_id: body.assessmentSetId || qRow.assessment_set_id,
          reason,
          comment,
          status: 'open',
        },
        { onConflict: 'user_id,question_id' }
      )
      .select('*')
      .single();

    if (fbErr) {
      throw new Error(fbErr.message);
    }

    return jsonResponse(req, { success: true, feedback: saved });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to save question feedback';
    return jsonResponse(req, { success: false, error: message }, 500);
  }
});
