-- ==============================================================================
-- BacklogOS — Production Supabase PostgreSQL Schema & Security Architecture
--
-- Covers:
-- 1. Core tables: student_profiles, study_plans (UUID PK), subjects, chapters,
--    backlog_items, completed_tasks, study_sessions, chapter_notes,
--    migration_receipts.
-- 2. Dynamic cleanup of ALL legacy / duplicate RLS policies on private tables.
-- 3. Strict owner-only RLS (TO authenticated, ZERO USING (true), ZERO anon read).
-- 4. Idempotent Realtime publication across all 6 workspace tables.
-- 5. Safe aggregate community impact RPC (no PII).
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. STUDENT PROFILES (student_profiles)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    board TEXT NOT NULL DEFAULT 'CBSE',
    grade TEXT NOT NULL DEFAULT '11',
    stream TEXT DEFAULT 'pcm',
    subjects TEXT[] NOT NULL DEFAULT ARRAY['Physics', 'Chemistry', 'Mathematics'],
    selected_chapter_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    goal TEXT DEFAULT 'Complete CBSE Backlog Recovery',
    priority TEXT DEFAULT 'backlog recovery',
    confidence TEXT DEFAULT 'mixed',
    exam_date TEXT DEFAULT '',
    minutes_per_day INTEGER NOT NULL DEFAULT 180,
    workspace_state JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS grade TEXT DEFAULT '11';
ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS stream TEXT DEFAULT 'pcm';
ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS selected_chapter_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS workspace_state JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.student_profiles ALTER COLUMN goal SET DEFAULT 'Complete CBSE Backlog Recovery';
ALTER TABLE public.student_profiles ALTER COLUMN priority SET DEFAULT 'backlog recovery';
ALTER TABLE public.student_profiles ALTER COLUMN confidence SET DEFAULT 'mixed';
ALTER TABLE public.student_profiles ALTER COLUMN exam_date SET DEFAULT '';
ALTER TABLE public.student_profiles ALTER COLUMN minutes_per_day SET DEFAULT 180;

-- ------------------------------------------------------------------------------
-- 2. STUDY PLANS (study_plans) — Multi-Plan Workspace Keyed by Stable UUID `id`
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.study_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    name TEXT NOT NULL DEFAULT 'Primary Recovery Plan',
    is_active BOOLEAN NOT NULL DEFAULT true,
    board TEXT NOT NULL DEFAULT 'CBSE',
    goal TEXT DEFAULT 'Complete CBSE Backlog Recovery',
    priority TEXT DEFAULT 'backlog recovery',
    confidence TEXT DEFAULT 'mixed',
    exam_date TEXT DEFAULT '',
    minutes_per_day INTEGER NOT NULL DEFAULT 180,
    subjects TEXT[] NOT NULL DEFAULT ARRAY['Physics', 'Chemistry', 'Mathematics'],
    chapter_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    planned_chapter_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    prerequisite_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    order_reason TEXT NOT NULL DEFAULT '',
    coverage_note TEXT NOT NULL DEFAULT '',
    days JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Drop any legacy single-plan UNIQUE(user_id) constraint and align PK cleanly on `id`
ALTER TABLE public.study_plans DROP CONSTRAINT IF EXISTS study_plans_user_id_key;
ALTER TABLE public.study_plans ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
UPDATE public.study_plans SET id = gen_random_uuid() WHERE id IS NULL;
ALTER TABLE public.study_plans ALTER COLUMN id SET NOT NULL;
ALTER TABLE public.study_plans ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'Primary Recovery Plan';
ALTER TABLE public.study_plans ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.study_plans ADD COLUMN IF NOT EXISTS prerequisite_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE public.study_plans ADD COLUMN IF NOT EXISTS order_reason TEXT NOT NULL DEFAULT '';
ALTER TABLE public.study_plans ADD COLUMN IF NOT EXISTS coverage_note TEXT NOT NULL DEFAULT '';
ALTER TABLE public.study_plans ALTER COLUMN order_reason SET DEFAULT '';
ALTER TABLE public.study_plans ALTER COLUMN coverage_note SET DEFAULT '';
ALTER TABLE public.study_plans ALTER COLUMN exam_date SET DEFAULT '';
ALTER TABLE public.study_plans ALTER COLUMN confidence SET DEFAULT 'mixed';
ALTER TABLE public.study_plans ADD COLUMN IF NOT EXISTS client_id TEXT;

DO $$
DECLARE
    pk_name TEXT;
    pk_cols TEXT;
BEGIN
    SELECT tc.constraint_name, string_agg(kcu.column_name, ',')
    INTO pk_name, pk_cols
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'study_plans'
      AND tc.constraint_type = 'PRIMARY KEY'
    GROUP BY tc.constraint_name;

    IF pk_name IS NULL THEN
        ALTER TABLE public.study_plans ADD PRIMARY KEY (id);
    ELSIF pk_cols <> 'id' THEN
        EXECUTE format('ALTER TABLE public.study_plans DROP CONSTRAINT %I', pk_name);
        ALTER TABLE public.study_plans ADD PRIMARY KEY (id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_study_plans_user_id ON public.study_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_study_plans_user_active ON public.study_plans(user_id, is_active);

-- ------------------------------------------------------------------------------
-- 3. CBSE SUBJECTS & CHAPTERS (Public Reference Catalog)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subjects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    grade TEXT NOT NULL DEFAULT '11',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chapters (
    id TEXT PRIMARY KEY,
    subject_id TEXT REFERENCES public.subjects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    chapter_number INTEGER DEFAULT 1,
    grade TEXT DEFAULT '11',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chapters_subject_id ON public.chapters(subject_id);

-- ------------------------------------------------------------------------------
-- 4. BACKLOG ITEMS (backlog_items)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.backlog_items (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL DEFAULT auth.uid()::text,
    chapter_id TEXT NOT NULL,
    subject TEXT NOT NULL DEFAULT 'Physics',
    topic TEXT NOT NULL,
    estimated_hours NUMERIC(5, 1) NOT NULL DEFAULT 5.0,
    hours_spent NUMERIC(5, 1) NOT NULL DEFAULT 0.0,
    status TEXT NOT NULL DEFAULT 'not_started',
    difficulty TEXT DEFAULT 'medium',
    confidence TEXT DEFAULT 'medium',
    exam_relevance TEXT DEFAULT 'high',
    prerequisites TEXT[] DEFAULT ARRAY[]::TEXT[],
    deadline TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

ALTER TABLE public.backlog_items DROP CONSTRAINT IF EXISTS backlog_items_chapter_id_fkey;

CREATE INDEX IF NOT EXISTS idx_backlog_items_user_id ON public.backlog_items(user_id);
CREATE INDEX IF NOT EXISTS idx_backlog_items_chapter_id ON public.backlog_items(chapter_id);
CREATE INDEX IF NOT EXISTS idx_backlog_items_status ON public.backlog_items(status);
ALTER TABLE public.backlog_items ADD COLUMN IF NOT EXISTS plan_id UUID;
ALTER TABLE public.backlog_items ADD COLUMN IF NOT EXISTS client_id TEXT;
CREATE INDEX IF NOT EXISTS idx_backlog_items_user_plan ON public.backlog_items(user_id, plan_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_backlog_items_user_client ON public.backlog_items(user_id, client_id) WHERE client_id IS NOT NULL;

-- ------------------------------------------------------------------------------
-- 5. COMPLETED TASKS & CHAPTERS (completed_tasks)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.completed_tasks (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    task_id TEXT NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT completed_tasks_user_task_unique UNIQUE (user_id, task_id)
);

CREATE INDEX IF NOT EXISTS idx_completed_tasks_user_id ON public.completed_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_completed_tasks_lookup ON public.completed_tasks(user_id, task_id);

-- ------------------------------------------------------------------------------
-- 6. FOCUS STUDY SESSIONS (study_sessions)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.study_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    chapter_id TEXT NOT NULL,
    minutes INTEGER NOT NULL,
    mode TEXT NOT NULL DEFAULT 'focus',
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON public.study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_completed ON public.study_sessions(completed_at);
ALTER TABLE public.study_sessions ADD COLUMN IF NOT EXISTS plan_id UUID;
ALTER TABLE public.study_sessions ADD COLUMN IF NOT EXISTS client_id TEXT;
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_plan ON public.study_sessions(user_id, plan_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_study_sessions_user_client ON public.study_sessions(user_id, client_id) WHERE client_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_study_plans_user_client ON public.study_plans(user_id, client_id) WHERE client_id IS NOT NULL;

-- ------------------------------------------------------------------------------
-- 7. CHAPTER NOTES (chapter_notes)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chapter_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    chapter_id TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chapter_notes_user_chapter_unique UNIQUE (user_id, chapter_id)
);

CREATE INDEX IF NOT EXISTS idx_chapter_notes_user_id ON public.chapter_notes(user_id);

-- ------------------------------------------------------------------------------
-- 8. GUEST-TO-ACCOUNT MIGRATION RECEIPTS (migration_receipts)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.migration_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    guest_uid TEXT NOT NULL,
    batch_key TEXT NOT NULL DEFAULT 'guest_migration_v1',
    migrated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT migration_receipts_user_guest_batch_unique UNIQUE (user_id, guest_uid, batch_key)
);

CREATE INDEX IF NOT EXISTS idx_migration_receipts_user_id ON public.migration_receipts(user_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) & PRIVILEGES — CLEANUP + STRICT OWNER ISOLATION
-- ==============================================================================

-- Enable RLS on every table
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backlog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.completed_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapter_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;

-- Revoke anonymous privileges on all private student tables
REVOKE ALL ON TABLE public.student_profiles FROM anon;
REVOKE ALL ON TABLE public.study_plans FROM anon;
REVOKE ALL ON TABLE public.backlog_items FROM anon;
REVOKE ALL ON TABLE public.completed_tasks FROM anon;
REVOKE ALL ON TABLE public.study_sessions FROM anon;
REVOKE ALL ON TABLE public.chapter_notes FROM anon;
REVOKE ALL ON TABLE public.migration_receipts FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.student_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.study_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.backlog_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.completed_tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.study_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.chapter_notes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.migration_receipts TO authenticated;

-- Dynamically drop ALL existing policies across private & catalog tables (removes any duplicates or USING (true))
DO $$
DECLARE
    tbl TEXT;
    pol RECORD;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'student_profiles',
        'study_plans',
        'backlog_items',
        'completed_tasks',
        'study_sessions',
        'chapter_notes',
        'migration_receipts',
        'subjects',
        'chapters'
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

-- Strictly ONE authenticated owner policy per private table
CREATE POLICY "Users manage own profile"
ON public.student_profiles
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users manage own study plans"
ON public.study_plans
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- backlog_items.user_id is TEXT; controlled explicit cast to auth.uid()::text
CREATE POLICY "Users manage own backlog items"
ON public.backlog_items
FOR ALL
TO authenticated
USING (user_id = auth.uid()::text)
WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users manage own completed tasks"
ON public.completed_tasks
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users manage own study sessions"
ON public.study_sessions
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users manage own chapter notes"
ON public.chapter_notes
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users manage own migration receipts"
ON public.migration_receipts
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Public Read-Only Reference Catalog
CREATE POLICY "Allow read access to subjects"
ON public.subjects
FOR SELECT
TO authenticated, anon
USING (true);

CREATE POLICY "Allow read access to chapters"
ON public.chapters
FOR SELECT
TO authenticated, anon
USING (true);

-- ==============================================================================
-- REALTIME PUBLICATION FOR ALL 6 WORKSPACE TABLES
-- ==============================================================================
DO $$
DECLARE
    rt_table TEXT;
BEGIN
    FOREACH rt_table IN ARRAY ARRAY[
        'student_profiles',
        'study_plans',
        'backlog_items',
        'completed_tasks',
        'study_sessions',
        'chapter_notes'
    ] LOOP
        BEGIN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', rt_table);
        EXCEPTION WHEN duplicate_object THEN
            NULL;
        END;
    END LOOP;
END $$;

-- ==============================================================================
-- SAFE AGGREGATE RPC FOR COMMUNITY IMPACT BANNER (ZERO PII EXPOSED)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_community_impact()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    total_students BIGINT := 0;
    cleared_chapters BIGINT := 0;
    cleared_hours NUMERIC := 0;
BEGIN
    SELECT COUNT(*) INTO total_students FROM public.student_profiles;
    SELECT COUNT(*), COALESCE(SUM(estimated_hours), 0)
    INTO cleared_chapters, cleared_hours
    FROM public.backlog_items
    WHERE LOWER(status) IN ('completed', 'mastered', 'done');

    RETURN json_build_object(
        'student_count', total_students,
        'cleared_chapters', cleared_chapters,
        'cleared_hours', ROUND(cleared_hours, 1)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_community_impact() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_community_impact() TO anon, authenticated;
