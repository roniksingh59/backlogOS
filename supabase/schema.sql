-- ==============================================================================
-- BacklogOS — Production Supabase PostgreSQL Schema & Security Architecture
--
-- Fixes applied:
-- 1. Explicit type casting (auth.uid()::text = user_id::text) resolves:
--    "ERROR: 42883: operator does not exist: uuid = text"
-- 2. Idempotent Realtime publication blocks prevent duplicate table errors.
-- 3. Idempotent policy creation allows re-running without conflict.
-- ==============================================================================

-- Enable UUID extension
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
    goal TEXT DEFAULT 'Complete CBSE Backlog Recovery',
    priority TEXT DEFAULT 'backlog recovery',
    confidence TEXT DEFAULT 'mixed',
    exam_date TEXT DEFAULT '',
    minutes_per_day INTEGER NOT NULL DEFAULT 180,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS grade TEXT DEFAULT '11';
ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS stream TEXT DEFAULT 'pcm';
ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ------------------------------------------------------------------------------
-- 2. STUDY PLANS (study_plans)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.study_plans (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    board TEXT NOT NULL DEFAULT 'CBSE',
    goal TEXT DEFAULT 'Complete CBSE Backlog Recovery',
    priority TEXT DEFAULT 'backlog recovery',
    confidence TEXT DEFAULT 'mixed',
    exam_date TEXT DEFAULT '',
    minutes_per_day INTEGER NOT NULL DEFAULT 180,
    subjects TEXT[] NOT NULL DEFAULT ARRAY['Physics', 'Chemistry', 'Mathematics'],
    chapter_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    planned_chapter_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    days JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_plans_user_id ON public.study_plans(user_id);

-- ------------------------------------------------------------------------------
-- 3. CBSE SUBJECTS (Reference Catalog)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subjects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    grade TEXT NOT NULL DEFAULT '11',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 4. CBSE CHAPTERS (Reference Catalog)
-- ------------------------------------------------------------------------------
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
-- 5. BACKLOG ITEMS (backlog_items)
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

CREATE INDEX IF NOT EXISTS idx_backlog_items_user_id ON public.backlog_items(user_id);
CREATE INDEX IF NOT EXISTS idx_backlog_items_chapter_id ON public.backlog_items(chapter_id);
CREATE INDEX IF NOT EXISTS idx_backlog_items_status ON public.backlog_items(status);

-- ------------------------------------------------------------------------------
-- 6. COMPLETED TASKS & CHAPTERS (completed_tasks)
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
-- 7. FOCUS STUDY SESSIONS (study_sessions)
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

-- ------------------------------------------------------------------------------
-- 8. CHAPTER NOTES (chapter_notes)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chapter_notes (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    chapter_id TEXT NOT NULL,
    note TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chapter_notes_user_chapter_unique UNIQUE (user_id, chapter_id)
);

CREATE INDEX IF NOT EXISTS idx_chapter_notes_user_id ON public.chapter_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_chapter_notes_chapter ON public.chapter_notes(user_id, chapter_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES — WITH EXPLICIT TYPE CASTING
-- ==============================================================================

-- 1. Enable RLS on all tables
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backlog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.completed_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapter_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies safely before recreation
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view own profile" ON public.student_profiles;
    DROP POLICY IF EXISTS "Users can insert own profile" ON public.student_profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON public.student_profiles;
    DROP POLICY IF EXISTS "Users can manage own profile" ON public.student_profiles;

    DROP POLICY IF EXISTS "Users can manage own plans" ON public.study_plans;
    DROP POLICY IF EXISTS "Users can manage own backlog items" ON public.backlog_items;
    DROP POLICY IF EXISTS "Users can manage own completed tasks" ON public.completed_tasks;
    DROP POLICY IF EXISTS "Users can manage own study sessions" ON public.study_sessions;
    DROP POLICY IF EXISTS "Users can manage own notes" ON public.chapter_notes;

    DROP POLICY IF EXISTS "Allow read access to subjects" ON public.subjects;
    DROP POLICY IF EXISTS "Allow read access to chapters" ON public.chapters;
END $$;

-- 3. Student Profile Policy (Explicit ::text casting guarantees uuid/text compatibility)
CREATE POLICY "Users can manage own profile"
ON public.student_profiles
FOR ALL
TO authenticated
USING (auth.uid()::text = user_id::text)
WITH CHECK (auth.uid()::text = user_id::text);

-- 4. Study Plans Policy
CREATE POLICY "Users can manage own plans"
ON public.study_plans
FOR ALL
TO authenticated
USING (auth.uid()::text = user_id::text)
WITH CHECK (auth.uid()::text = user_id::text);

-- 5. Backlog Items Policy (Fixes operator does not exist: uuid = text)
CREATE POLICY "Users can manage own backlog items"
ON public.backlog_items
FOR ALL
TO authenticated
USING (auth.uid()::text = user_id::text)
WITH CHECK (auth.uid()::text = user_id::text);

-- 6. Completed Tasks Policy
CREATE POLICY "Users can manage own completed tasks"
ON public.completed_tasks
FOR ALL
TO authenticated
USING (auth.uid()::text = user_id::text)
WITH CHECK (auth.uid()::text = user_id::text);

-- 7. Study Sessions Policy
CREATE POLICY "Users can manage own study sessions"
ON public.study_sessions
FOR ALL
TO authenticated
USING (auth.uid()::text = user_id::text)
WITH CHECK (auth.uid()::text = user_id::text);

-- 8. Chapter Notes Policy
CREATE POLICY "Users can manage own notes"
ON public.chapter_notes
FOR ALL
TO authenticated
USING (auth.uid()::text = user_id::text)
WITH CHECK (auth.uid()::text = user_id::text);

-- 9. Curriculum Catalog Read-Only Policies
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

-- 10. Enable Supabase Realtime Publication Safely
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.student_profiles;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.study_plans;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.backlog_items;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.completed_tasks;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.study_sessions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chapter_notes;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
