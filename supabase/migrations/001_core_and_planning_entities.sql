-- ==============================================================================
-- BacklogOS — Phase 2 Migration 001: Core, Curriculum Concepts & Planning Entities
--
-- Entities covered:
--   - profiles (adapted/expanded from legacy student_profiles)
--   - subjects (non-destructive expansion)
--   - chapters (non-destructive expansion)
--   - concepts (new normalized syllabus concept catalog)
--   - student_subjects (normalized subject enrollment & priority)
--   - student_backlog (normalized backlog chapter items)
--   - plans (normalized multi-horizon plans: 3, 7, 21, 30 days)
--   - plan_days (normalized daily schedules & capacity tracking)
--   - objectives (normalized learning objectives with 6-state lifecycle)
--   - study_sessions (non-destructive expansion with objective/day links)
--
-- Non-destructive guarantee: Legacy tables (student_profiles, study_plans,
-- backlog_items, completed_tasks, study_sessions, chapter_notes, migration_receipts)
-- are preserved intact.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Shared updated_at trigger helper
CREATE OR REPLACE FUNCTION public.backlogos_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- ------------------------------------------------------------------------------
-- 1. PROFILES (profiles)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    display_name TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    board TEXT NOT NULL DEFAULT 'CBSE',
    grade TEXT NOT NULL DEFAULT '11',
    academic_session TEXT NOT NULL DEFAULT '2026-27',
    stream TEXT DEFAULT 'pcm',
    goal TEXT NOT NULL DEFAULT 'Complete CBSE Backlog Recovery',
    priority TEXT NOT NULL DEFAULT 'backlog recovery',
    confidence TEXT NOT NULL DEFAULT 'mixed',
    exam_date TEXT NOT NULL DEFAULT '',
    minutes_per_day INTEGER NOT NULL DEFAULT 180 CHECK (minutes_per_day BETWEEN 15 AND 960),
    selected_chapter_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    learning_preferences JSONB NOT NULL DEFAULT '{"focusInterval": 25, "breakInterval": 5, "dailyGoalMinutes": 180}'::jsonb,
    workspace_state JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.backlogos_set_updated_at();

-- ------------------------------------------------------------------------------
-- 2. SUBJECTS & CHAPTERS (Non-destructive expansion of public reference catalog)
-- ------------------------------------------------------------------------------
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'compulsory';
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS academic_session TEXT NOT NULL DEFAULT '2026-27';
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS stream_relevance TEXT[] NOT NULL DEFAULT ARRAY['pcm', 'pcb', 'pcmb'];

ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS unit_number INTEGER;
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS unit_name TEXT;
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(5, 1) NOT NULL DEFAULT 5.0;
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS exam_weightage TEXT NOT NULL DEFAULT 'high';
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS difficulty TEXT NOT NULL DEFAULT 'medium';
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS prerequisites TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS in_cbse_syllabus BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';

-- ------------------------------------------------------------------------------
-- 3. CONCEPTS (concepts) — Public Reference Syllabus Topics & Subtopics
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.concepts (
    id TEXT PRIMARY KEY,
    chapter_id TEXT NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
    subject_id TEXT REFERENCES public.subjects(id) ON DELETE CASCADE,
    code TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    key_concepts TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    key_formula TEXT,
    high_yield BOOLEAN NOT NULL DEFAULT false,
    in_cbse_syllabus BOOLEAN NOT NULL DEFAULT true,
    sequence_order INTEGER NOT NULL DEFAULT 1 CHECK (sequence_order >= 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_concepts_chapter_order ON public.concepts(chapter_id, sequence_order);
CREATE INDEX IF NOT EXISTS idx_concepts_subject_id ON public.concepts(subject_id);

-- ------------------------------------------------------------------------------
-- 4. STUDENT SUBJECTS (student_subjects)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    subject_id TEXT NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    priority_rank INTEGER NOT NULL DEFAULT 1 CHECK (priority_rank >= 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT student_subjects_user_subject_unique UNIQUE (user_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_student_subjects_user_active ON public.student_subjects(user_id, is_active, is_archived);

DROP TRIGGER IF EXISTS trg_student_subjects_updated_at ON public.student_subjects;
CREATE TRIGGER trg_student_subjects_updated_at
    BEFORE UPDATE ON public.student_subjects
    FOR EACH ROW EXECUTE FUNCTION public.backlogos_set_updated_at();

-- ------------------------------------------------------------------------------
-- 5. STUDENT BACKLOG (student_backlog)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_backlog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    chapter_id TEXT NOT NULL,
    catalog_chapter_id TEXT REFERENCES public.chapters(id) ON DELETE SET NULL,
    subject_id TEXT REFERENCES public.subjects(id) ON DELETE SET NULL,
    subject_name TEXT NOT NULL DEFAULT 'Physics',
    chapter_title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'NOT_STARTED'
        CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'STUDY_COMPLETE', 'MASTERY_PENDING', 'MASTERED', 'NEEDS_REVISION')),
    priority TEXT NOT NULL DEFAULT 'high'
        CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    priority_score NUMERIC(6, 2) NOT NULL DEFAULT 50.00,
    difficulty TEXT NOT NULL DEFAULT 'medium'
        CHECK (difficulty IN ('easy', 'medium', 'hard')),
    confidence TEXT NOT NULL DEFAULT 'medium',
    exam_relevance TEXT NOT NULL DEFAULT 'high',
    estimated_minutes INTEGER NOT NULL DEFAULT 300 CHECK (estimated_minutes >= 0),
    minutes_spent INTEGER NOT NULL DEFAULT 0 CHECK (minutes_spent >= 0),
    prerequisite_chapter_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    deadline TEXT,
    notes TEXT,
    legacy_backlog_item_id TEXT,
    client_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT student_backlog_user_chapter_unique UNIQUE (user_id, chapter_id)
);

CREATE INDEX IF NOT EXISTS idx_student_backlog_user_status ON public.student_backlog(user_id, status);
CREATE INDEX IF NOT EXISTS idx_student_backlog_user_priority ON public.student_backlog(user_id, priority_score DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_backlog_user_client ON public.student_backlog(user_id, client_id) WHERE client_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_student_backlog_updated_at ON public.student_backlog;
CREATE TRIGGER trg_student_backlog_updated_at
    BEFORE UPDATE ON public.student_backlog
    FOR EACH ROW EXECUTE FUNCTION public.backlogos_set_updated_at();

-- ------------------------------------------------------------------------------
-- 6. PLANS (plans) — Multi-Horizon Roadmaps (3, 7, 21, 30 days)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    name TEXT NOT NULL DEFAULT 'Primary Recovery Plan',
    plan_horizon_days INTEGER NOT NULL DEFAULT 7 CHECK (plan_horizon_days BETWEEN 1 AND 365),
    is_active BOOLEAN NOT NULL DEFAULT true,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),
    board TEXT NOT NULL DEFAULT 'CBSE',
    goal TEXT NOT NULL DEFAULT 'Complete CBSE Backlog Recovery',
    priority TEXT NOT NULL DEFAULT 'backlog recovery',
    confidence TEXT NOT NULL DEFAULT 'mixed',
    exam_date TEXT NOT NULL DEFAULT '',
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    minutes_per_day INTEGER NOT NULL DEFAULT 180 CHECK (minutes_per_day BETWEEN 15 AND 960),
    subjects TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    selected_chapter_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    prerequisite_chapter_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    order_reason TEXT NOT NULL DEFAULT '',
    coverage_note TEXT NOT NULL DEFAULT '',
    reschedule_count INTEGER NOT NULL DEFAULT 0 CHECK (reschedule_count >= 0),
    last_rescheduled_at TIMESTAMPTZ,
    legacy_study_plan_id UUID,
    client_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plans_user_active ON public.plans(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_plans_user_created ON public.plans(user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_plans_user_client ON public.plans(user_id, client_id) WHERE client_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_plans_updated_at ON public.plans;
CREATE TRIGGER trg_plans_updated_at
    BEFORE UPDATE ON public.plans
    FOR EACH ROW EXECUTE FUNCTION public.backlogos_set_updated_at();

-- ------------------------------------------------------------------------------
-- 7. PLAN DAYS (plan_days)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.plan_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    day_number INTEGER NOT NULL CHECK (day_number >= 1),
    scheduled_date DATE,
    title TEXT NOT NULL DEFAULT '',
    focus_theme TEXT NOT NULL DEFAULT '',
    allocated_minutes INTEGER NOT NULL DEFAULT 0 CHECK (allocated_minutes >= 0),
    max_capacity_minutes INTEGER NOT NULL DEFAULT 180 CHECK (max_capacity_minutes >= 0),
    is_recovery_day BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT plan_days_plan_day_unique UNIQUE (plan_id, day_number)
);

CREATE INDEX IF NOT EXISTS idx_plan_days_plan_order ON public.plan_days(plan_id, day_number);
CREATE INDEX IF NOT EXISTS idx_plan_days_user_date ON public.plan_days(user_id, scheduled_date);

DROP TRIGGER IF EXISTS trg_plan_days_updated_at ON public.plan_days;
CREATE TRIGGER trg_plan_days_updated_at
    BEFORE UPDATE ON public.plan_days
    FOR EACH ROW EXECUTE FUNCTION public.backlogos_set_updated_at();

-- ------------------------------------------------------------------------------
-- 8. OBJECTIVES (objectives) — Execution Engine 6-State Lifecycle
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.objectives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
    plan_day_id UUID NOT NULL REFERENCES public.plan_days(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    chapter_id TEXT NOT NULL,
    concept_id TEXT REFERENCES public.concepts(id) ON DELETE SET NULL,
    subject_name TEXT NOT NULL DEFAULT 'Physics',
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    kind TEXT NOT NULL DEFAULT 'learn'
        CHECK (kind IN ('learn', 'practice', 'revise', 'verify', 'recovery')),
    state TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (state IN ('PENDING', 'IN_PROGRESS', 'STUDIED', 'VERIFICATION_PENDING', 'VERIFIED', 'NEEDS_RELEARNING')),
    priority_score NUMERIC(6, 2) NOT NULL DEFAULT 50.00,
    estimated_minutes INTEGER NOT NULL DEFAULT 45 CHECK (estimated_minutes >= 0),
    actual_minutes INTEGER NOT NULL DEFAULT 0 CHECK (actual_minutes >= 0),
    sequence_order INTEGER NOT NULL DEFAULT 1 CHECK (sequence_order >= 1),
    scheduled_date DATE,
    missed_count INTEGER NOT NULL DEFAULT 0 CHECK (missed_count >= 0),
    rescheduled_from_day_id UUID REFERENCES public.plan_days(id) ON DELETE SET NULL,
    legacy_task_key TEXT,
    studied_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT objectives_user_legacy_key_unique UNIQUE (user_id, legacy_task_key)
);

CREATE INDEX IF NOT EXISTS idx_objectives_user_state ON public.objectives(user_id, state);
CREATE INDEX IF NOT EXISTS idx_objectives_day_order ON public.objectives(plan_day_id, sequence_order);
CREATE INDEX IF NOT EXISTS idx_objectives_user_date ON public.objectives(user_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_objectives_user_chapter ON public.objectives(user_id, chapter_id);

DROP TRIGGER IF EXISTS trg_objectives_updated_at ON public.objectives;
CREATE TRIGGER trg_objectives_updated_at
    BEFORE UPDATE ON public.objectives
    FOR EACH ROW EXECUTE FUNCTION public.backlogos_set_updated_at();

-- ------------------------------------------------------------------------------
-- 9. STUDY SESSIONS (study_sessions) — Non-Destructive Relational Link Expansion
-- ------------------------------------------------------------------------------
ALTER TABLE public.study_sessions ADD COLUMN IF NOT EXISTS plan_day_id UUID REFERENCES public.plan_days(id) ON DELETE SET NULL;
ALTER TABLE public.study_sessions ADD COLUMN IF NOT EXISTS objective_id UUID REFERENCES public.objectives(id) ON DELETE SET NULL;
ALTER TABLE public.study_sessions ADD COLUMN IF NOT EXISTS concept_id TEXT REFERENCES public.concepts(id) ON DELETE SET NULL;
ALTER TABLE public.study_sessions ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE public.study_sessions ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE INDEX IF NOT EXISTS idx_study_sessions_user_objective ON public.study_sessions(user_id, objective_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_chapter ON public.study_sessions(user_id, chapter_id);

-- ==============================================================================
-- ROW LEVEL SECURITY & ANON LOCKDOWN (Migration 001 Tables)
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_backlog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objectives ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.profiles FROM anon;
REVOKE ALL ON TABLE public.student_subjects FROM anon;
REVOKE ALL ON TABLE public.student_backlog FROM anon;
REVOKE ALL ON TABLE public.plans FROM anon;
REVOKE ALL ON TABLE public.plan_days FROM anon;
REVOKE ALL ON TABLE public.objectives FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.student_subjects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.student_backlog TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.plan_days TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.objectives TO authenticated;
GRANT SELECT ON TABLE public.concepts TO anon, authenticated;

DO $$
DECLARE
    tbl TEXT;
    pol RECORD;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'profiles',
        'concepts',
        'student_subjects',
        'student_backlog',
        'plans',
        'plan_days',
        'objectives'
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

CREATE POLICY "Users manage own profile v2"
ON public.profiles FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users manage own student subjects"
ON public.student_subjects FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users manage own student backlog"
ON public.student_backlog FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users manage own plans"
ON public.plans FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users manage own plan days"
ON public.plan_days FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users manage own objectives"
ON public.objectives FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Public read-only syllabus concept catalog
CREATE POLICY "Allow read access to concepts"
ON public.concepts FOR SELECT TO authenticated, anon
USING (true);
