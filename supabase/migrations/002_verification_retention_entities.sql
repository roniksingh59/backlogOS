-- ==============================================================================
-- BacklogOS — Phase 2 Migration 002: Verification, Mastery & Retention Entities
--
-- Entities covered:
--   - assessment_sets
--   - questions (sanitized client-readable prompts & options ONLY)
--   - question_answer_keys (SERVER-ONLY answer keys; zero browser read access)
--   - assessment_attempts
--   - attempt_answers
--   - concept_mastery
--   - chapter_mastery (NOT_STARTED, IN_PROGRESS, STUDY_COMPLETE, MASTERY_PENDING, MASTERED, NEEDS_REVISION)
--   - mastery_history (append-only historical mastery log)
--   - review_schedule (spaced repetition intervals: 1, 3, 7, 14, 30 days)
--   - review_attempts
--   - ai_generation_jobs
--   - question_feedback
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ASSESSMENT SETS (assessment_sets)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assessment_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    assessment_type TEXT NOT NULL
        CHECK (assessment_type IN ('OBJECTIVE', 'CHAPTER_MASTERY', 'REVISION')),
    chapter_id TEXT NOT NULL,
    objective_id UUID REFERENCES public.objectives(id) ON DELETE SET NULL,
    concept_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    title TEXT NOT NULL,
    question_count INTEGER NOT NULL CHECK (question_count BETWEEN 1 AND 50),
    pass_threshold_percent NUMERIC(5, 2) NOT NULL DEFAULT 70.00 CHECK (pass_threshold_percent BETWEEN 1 AND 100),
    required_concept_coverage_percent NUMERIC(5, 2) NOT NULL DEFAULT 60.00 CHECK (required_concept_coverage_percent BETWEEN 0 AND 100),
    status TEXT NOT NULL DEFAULT 'ready'
        CHECK (status IN ('generating', 'ready', 'archived', 'failed')),
    syllabus_version TEXT NOT NULL DEFAULT 'CBSE-2026-27',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assessment_sets_user_chapter ON public.assessment_sets(user_id, chapter_id, assessment_type);
CREATE INDEX IF NOT EXISTS idx_assessment_sets_user_objective ON public.assessment_sets(user_id, objective_id);

DROP TRIGGER IF EXISTS trg_assessment_sets_updated_at ON public.assessment_sets;
CREATE TRIGGER trg_assessment_sets_updated_at
    BEFORE UPDATE ON public.assessment_sets
    FOR EACH ROW EXECUTE FUNCTION public.backlogos_set_updated_at();

-- ------------------------------------------------------------------------------
-- 2. QUESTIONS (questions) — Sanitized Pre-Submission Question Prompts & Options
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_set_id UUID NOT NULL REFERENCES public.assessment_sets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    chapter_id TEXT NOT NULL,
    concept_id TEXT REFERENCES public.concepts(id) ON DELETE SET NULL,
    concept_label TEXT NOT NULL DEFAULT '',
    question_order INTEGER NOT NULL DEFAULT 1 CHECK (question_order >= 1),
    question_type TEXT NOT NULL DEFAULT 'mcq'
        CHECK (question_type IN ('mcq', 'multi_select', 'numerical', 'short_conceptual', 'assertion_reason')),
    difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    cognitive_level TEXT NOT NULL DEFAULT 'application'
        CHECK (cognitive_level IN ('recall', 'conceptual', 'application', 'analysis')),
    prompt TEXT NOT NULL,
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_validated BOOLEAN NOT NULL DEFAULT true,
    validation_notes JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT questions_set_order_unique UNIQUE (assessment_set_id, question_order)
);

CREATE INDEX IF NOT EXISTS idx_questions_set_order ON public.questions(assessment_set_id, question_order);
CREATE INDEX IF NOT EXISTS idx_questions_user_chapter ON public.questions(user_id, chapter_id);

-- ------------------------------------------------------------------------------
-- 3. SERVER-ONLY ANSWER KEYS (question_answer_keys)
--    Strictly isolated from browser clients; evaluated only by Edge Functions.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.question_answer_keys (
    question_id UUID PRIMARY KEY REFERENCES public.questions(id) ON DELETE CASCADE,
    correct_option_id TEXT,
    acceptable_answers JSONB NOT NULL DEFAULT '[]'::jsonb,
    explanation TEXT NOT NULL DEFAULT '',
    grading_rubric JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 4. ASSESSMENT ATTEMPTS (assessment_attempts)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assessment_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    assessment_set_id UUID NOT NULL REFERENCES public.assessment_sets(id) ON DELETE CASCADE,
    assessment_type TEXT NOT NULL
        CHECK (assessment_type IN ('OBJECTIVE', 'CHAPTER_MASTERY', 'REVISION')),
    chapter_id TEXT NOT NULL,
    objective_id UUID REFERENCES public.objectives(id) ON DELETE SET NULL,
    attempt_number INTEGER NOT NULL DEFAULT 1 CHECK (attempt_number >= 1),
    status TEXT NOT NULL DEFAULT 'in_progress'
        CHECK (status IN ('in_progress', 'submitted', 'abandoned')),
    total_questions INTEGER NOT NULL DEFAULT 0 CHECK (total_questions >= 0),
    correct_count INTEGER NOT NULL DEFAULT 0 CHECK (correct_count >= 0),
    score_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (score_percent BETWEEN 0 AND 100),
    concept_coverage_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (concept_coverage_percent BETWEEN 0 AND 100),
    passed BOOLEAN NOT NULL DEFAULT false,
    duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
    feedback_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_assessment_attempts_user_set ON public.assessment_attempts(user_id, assessment_set_id);
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_user_chapter ON public.assessment_attempts(user_id, chapter_id, submitted_at DESC);

-- ------------------------------------------------------------------------------
-- 5. ATTEMPT ANSWERS (attempt_answers)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attempt_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES public.assessment_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    submitted_answer TEXT,
    submitted_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_correct BOOLEAN NOT NULL DEFAULT false,
    score_awarded NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    revealed_correct_answer TEXT,
    revealed_explanation TEXT,
    time_spent_seconds INTEGER NOT NULL DEFAULT 0 CHECK (time_spent_seconds >= 0),
    answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT attempt_answers_attempt_question_unique UNIQUE (attempt_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_attempt_answers_attempt ON public.attempt_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_attempt_answers_user ON public.attempt_answers(user_id);

-- ------------------------------------------------------------------------------
-- 6. CONCEPT MASTERY (concept_mastery)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.concept_mastery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    chapter_id TEXT NOT NULL,
    concept_id TEXT NOT NULL,
    catalog_concept_id TEXT REFERENCES public.concepts(id) ON DELETE SET NULL,
    concept_title TEXT NOT NULL DEFAULT '',
    mastery_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (mastery_score BETWEEN 0 AND 100),
    attempts_count INTEGER NOT NULL DEFAULT 0 CHECK (attempts_count >= 0),
    correct_count INTEGER NOT NULL DEFAULT 0 CHECK (correct_count >= 0),
    status TEXT NOT NULL DEFAULT 'UNASSESSED'
        CHECK (status IN ('UNASSESSED', 'WEAK', 'DEVELOPING', 'MASTERED', 'NEEDS_REVISION')),
    last_assessed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT concept_mastery_user_concept_unique UNIQUE (user_id, chapter_id, concept_id)
);

CREATE INDEX IF NOT EXISTS idx_concept_mastery_user_status ON public.concept_mastery(user_id, status);
CREATE INDEX IF NOT EXISTS idx_concept_mastery_user_chapter ON public.concept_mastery(user_id, chapter_id);

DROP TRIGGER IF EXISTS trg_concept_mastery_updated_at ON public.concept_mastery;
CREATE TRIGGER trg_concept_mastery_updated_at
    BEFORE UPDATE ON public.concept_mastery
    FOR EACH ROW EXECUTE FUNCTION public.backlogos_set_updated_at();

-- ------------------------------------------------------------------------------
-- 7. CHAPTER MASTERY (chapter_mastery)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chapter_mastery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    chapter_id TEXT NOT NULL,
    subject_id TEXT REFERENCES public.subjects(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'NOT_STARTED'
        CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'STUDY_COMPLETE', 'MASTERY_PENDING', 'MASTERED', 'NEEDS_REVISION')),
    study_completed BOOLEAN NOT NULL DEFAULT false,
    mastery_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (mastery_score BETWEEN 0 AND 100),
    best_mastery_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (best_mastery_score BETWEEN 0 AND 100),
    concept_coverage_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (concept_coverage_percent BETWEEN 0 AND 100),
    attempts_count INTEGER NOT NULL DEFAULT 0 CHECK (attempts_count >= 0),
    last_assessment_attempt_id UUID REFERENCES public.assessment_attempts(id) ON DELETE SET NULL,
    study_completed_at TIMESTAMPTZ,
    first_mastered_at TIMESTAMPTZ,
    last_mastered_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chapter_mastery_user_chapter_unique UNIQUE (user_id, chapter_id)
);

CREATE INDEX IF NOT EXISTS idx_chapter_mastery_user_status ON public.chapter_mastery(user_id, status);

DROP TRIGGER IF EXISTS trg_chapter_mastery_updated_at ON public.chapter_mastery;
CREATE TRIGGER trg_chapter_mastery_updated_at
    BEFORE UPDATE ON public.chapter_mastery
    FOR EACH ROW EXECUTE FUNCTION public.backlogos_set_updated_at();

-- ------------------------------------------------------------------------------
-- 8. MASTERY HISTORY (mastery_history) — Immutable Historical Mastery Records
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mastery_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    chapter_id TEXT NOT NULL,
    concept_id TEXT,
    event_type TEXT NOT NULL
        CHECK (event_type IN (
            'STUDY_COMPLETED',
            'OBJECTIVE_VERIFIED',
            'OBJECTIVE_FAILED',
            'CHAPTER_MASTERED',
            'CHAPTER_FAILED',
            'REVISION_PASSED',
            'REVISION_DECAYED'
        )),
    previous_status TEXT,
    new_status TEXT NOT NULL,
    score_percent NUMERIC(5, 2),
    attempt_id UUID REFERENCES public.assessment_attempts(id) ON DELETE SET NULL,
    notes TEXT NOT NULL DEFAULT '',
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mastery_history_user_time ON public.mastery_history(user_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_mastery_history_user_chapter ON public.mastery_history(user_id, chapter_id);

-- ------------------------------------------------------------------------------
-- 9. REVIEW SCHEDULE (review_schedule) — Spaced Repetition (1, 3, 7, 14, 30 days)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.review_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    chapter_id TEXT NOT NULL,
    concept_id TEXT,
    interval_step INTEGER NOT NULL DEFAULT 1 CHECK (interval_step >= 1),
    interval_days INTEGER NOT NULL DEFAULT 1 CHECK (interval_days >= 1),
    ease_factor NUMERIC(4, 2) NOT NULL DEFAULT 2.50 CHECK (ease_factor BETWEEN 1.30 AND 4.00),
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'SCHEDULED'
        CHECK (status IN ('SCHEDULED', 'DUE', 'OVERDUE', 'COMPLETED', 'PAUSED')),
    retention_health_score NUMERIC(5, 2) NOT NULL DEFAULT 100.00 CHECK (retention_health_score BETWEEN 0 AND 100),
    last_reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_schedule_user_due ON public.review_schedule(user_id, due_date, status);
CREATE INDEX IF NOT EXISTS idx_review_schedule_user_chapter ON public.review_schedule(user_id, chapter_id);

DROP TRIGGER IF EXISTS trg_review_schedule_updated_at ON public.review_schedule;
CREATE TRIGGER trg_review_schedule_updated_at
    BEFORE UPDATE ON public.review_schedule
    FOR EACH ROW EXECUTE FUNCTION public.backlogos_set_updated_at();

-- ------------------------------------------------------------------------------
-- 10. REVIEW ATTEMPTS (review_attempts)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.review_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_schedule_id UUID NOT NULL REFERENCES public.review_schedule(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    chapter_id TEXT NOT NULL,
    assessment_attempt_id UUID REFERENCES public.assessment_attempts(id) ON DELETE SET NULL,
    recall_quality INTEGER NOT NULL CHECK (recall_quality BETWEEN 1 AND 5),
    score_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (score_percent BETWEEN 0 AND 100),
    passed BOOLEAN NOT NULL DEFAULT false,
    previous_interval_days INTEGER NOT NULL DEFAULT 1,
    next_interval_days INTEGER NOT NULL DEFAULT 1,
    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_attempts_schedule ON public.review_attempts(review_schedule_id);
CREATE INDEX IF NOT EXISTS idx_review_attempts_user ON public.review_attempts(user_id, reviewed_at DESC);

-- ------------------------------------------------------------------------------
-- 11. AI GENERATION JOBS (ai_generation_jobs)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_generation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    job_type TEXT NOT NULL
        CHECK (job_type IN ('OBJECTIVE_QUIZ', 'CHAPTER_MASTERY_QUIZ', 'REVISION_QUIZ')),
    assessment_set_id UUID REFERENCES public.assessment_sets(id) ON DELETE SET NULL,
    chapter_id TEXT NOT NULL,
    objective_id UUID REFERENCES public.objectives(id) ON DELETE SET NULL,
    model_name TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'running', 'validated', 'failed')),
    validation_report JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_message TEXT,
    prompt_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_generation_jobs_user_created ON public.ai_generation_jobs(user_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- 12. QUESTION FEEDBACK (question_feedback)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.question_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    assessment_set_id UUID REFERENCES public.assessment_sets(id) ON DELETE CASCADE,
    reason TEXT NOT NULL
        CHECK (reason IN ('ambiguous', 'incorrect_answer', 'out_of_syllabus', 'duplicate', 'typo', 'other')),
    comment TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'resolved', 'dismissed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT question_feedback_user_question_unique UNIQUE (user_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_question_feedback_question ON public.question_feedback(question_id);

-- ==============================================================================
-- ROW LEVEL SECURITY & ANON LOCKDOWN (Migration 002 Tables)
-- ==============================================================================

ALTER TABLE public.assessment_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_answer_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempt_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concept_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapter_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastery_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_feedback ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.assessment_sets FROM anon;
REVOKE ALL ON TABLE public.questions FROM anon;
REVOKE ALL ON TABLE public.question_answer_keys FROM anon, authenticated;
REVOKE ALL ON TABLE public.assessment_attempts FROM anon;
REVOKE ALL ON TABLE public.attempt_answers FROM anon;
REVOKE ALL ON TABLE public.concept_mastery FROM anon;
REVOKE ALL ON TABLE public.chapter_mastery FROM anon;
REVOKE ALL ON TABLE public.mastery_history FROM anon;
REVOKE ALL ON TABLE public.review_schedule FROM anon;
REVOKE ALL ON TABLE public.review_attempts FROM anon;
REVOKE ALL ON TABLE public.ai_generation_jobs FROM anon;
REVOKE ALL ON TABLE public.question_feedback FROM anon;

GRANT SELECT ON TABLE public.assessment_sets TO authenticated;
GRANT SELECT ON TABLE public.questions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.assessment_attempts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.attempt_answers TO authenticated;
GRANT SELECT ON TABLE public.concept_mastery TO authenticated;
GRANT SELECT ON TABLE public.chapter_mastery TO authenticated;
GRANT SELECT, INSERT ON TABLE public.mastery_history TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.review_schedule TO authenticated;
GRANT SELECT ON TABLE public.review_attempts TO authenticated;
GRANT SELECT ON TABLE public.ai_generation_jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.question_feedback TO authenticated;

DO $$
DECLARE
    tbl TEXT;
    pol RECORD;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'assessment_sets',
        'questions',
        'question_answer_keys',
        'assessment_attempts',
        'attempt_answers',
        'concept_mastery',
        'chapter_mastery',
        'mastery_history',
        'review_schedule',
        'review_attempts',
        'ai_generation_jobs',
        'question_feedback'
    ] LOOP
        FOR pol IN
            SELECT policyname
            FROM pg_policies
            WHERE schemaname = 'public' AND tablename = tbl
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
        END LOOP;
    END LOOP;
END $$;

-- Read-only client view of generated assessment sets & sanitized questions (server Edge Functions write sets & keys)
CREATE POLICY "Users read own assessment sets"
ON public.assessment_sets FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users read own sanitized questions"
ON public.questions FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Intentionally ZERO client policies on public.question_answer_keys (service_role only)

CREATE POLICY "Users manage own assessment attempts"
ON public.assessment_attempts FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users manage own attempt answers"
ON public.attempt_answers FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users read own concept mastery"
ON public.concept_mastery FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users read own chapter mastery"
ON public.chapter_mastery FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Append-only history for clients: SELECT + INSERT allowed, no client UPDATE/DELETE
CREATE POLICY "Users read own mastery history"
ON public.mastery_history FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users insert own mastery history"
ON public.mastery_history FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users manage own review schedule"
ON public.review_schedule FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users read own review attempts"
ON public.review_attempts FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users read own ai generation jobs"
ON public.ai_generation_jobs FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users manage own question feedback"
ON public.question_feedback FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
