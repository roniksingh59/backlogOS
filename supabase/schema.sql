-- ==============================================================================
-- BacklogOS Schema for Supabase PostgreSQL
-- Project: thkorqmtazbhbrbkqhaj (BacklogOS)
-- Copy and run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/thkorqmtazbhbrbkqhaj/sql/new
-- ==============================================================================

-- 1. Users Table (Maps Supabase Auth user or guest to BacklogOS student record)
CREATE TABLE IF NOT EXISTS public.users (
    id SERIAL PRIMARY KEY,
    uid TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    display_name TEXT,
    photo_url TEXT,
    phone TEXT,
    grade TEXT DEFAULT '11',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Idempotent column migrations if table already exists
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS grade TEXT DEFAULT '11';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_users_uid ON public.users(uid);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- 2. Study Plans Table (Board, goals, minutes per day, selected chapters, schedules)
CREATE TABLE IF NOT EXISTS public.plans (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    board TEXT NOT NULL,
    goal TEXT,
    priority TEXT,
    confidence TEXT,
    exam_date TEXT,
    minutes_per_day INTEGER NOT NULL DEFAULT 120,
    subjects TEXT NOT NULL,          -- JSON string of selected subjects
    chapter_ids TEXT NOT NULL,       -- JSON string of chapter IDs
    planned_chapter_ids TEXT,        -- JSON string of planned chapters
    days TEXT,                       -- JSON string of day-by-day study roadmap
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plans_user_id ON public.plans(user_id);

-- 3. Completed Chapters Table (Tracks finished syllabus chapters)
CREATE TABLE IF NOT EXISTS public.completed_chapters (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    chapter_id TEXT NOT NULL,
    completed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_completed_chapters_user_chapter ON public.completed_chapters(user_id, chapter_id);

-- 4. Study Sessions Table (Pomodoro, sprints, and logged study intervals)
CREATE TABLE IF NOT EXISTS public.study_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    chapter_id TEXT NOT NULL,
    minutes INTEGER NOT NULL,
    mode TEXT NOT NULL,              -- 'pomodoro', 'sprint', 'revision'
    completed_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_study_sessions_user ON public.study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_session ON public.study_sessions(session_id);

-- 5. Student Notes Table (Chapter-specific revision takeaways and formula notes)
CREATE TABLE IF NOT EXISTS public.notes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    chapter_id TEXT NOT NULL,
    note TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_user_chapter ON public.notes(user_id, chapter_id);

-- 6. Practice Checks Table (Mastery checklists: Theory, NCERT, PYQs)
CREATE TABLE IF NOT EXISTS public.practice_checks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    chapter_id TEXT NOT NULL,
    theory BOOLEAN NOT NULL DEFAULT FALSE,
    ncert BOOLEAN NOT NULL DEFAULT FALSE,
    pyq BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_practice_checks_user_chapter ON public.practice_checks(user_id, chapter_id);

-- 7. User Resources Table (Curated video lectures, NCERT exemplar notes, and saved materials)
CREATE TABLE IF NOT EXISTS public.user_resources (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    resource_id TEXT NOT NULL,
    subject TEXT,
    chapter_id TEXT,
    chapter_title TEXT,
    topic TEXT,
    resource_type TEXT NOT NULL,
    title TEXT NOT NULL,
    provider TEXT NOT NULL,
    url TEXT,
    thumbnail_url TEXT,
    duration TEXT,
    duration_minutes INTEGER,
    difficulty TEXT,
    language TEXT,
    description TEXT,
    recommendation_reason TEXT,
    estimated_minutes INTEGER,
    is_saved BOOLEAN NOT NULL DEFAULT FALSE,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_resources_user ON public.user_resources(user_id);
CREATE INDEX IF NOT EXISTS idx_user_resources_lookup ON public.user_resources(user_id, resource_id);

-- 8. Subjects Table
CREATE TABLE IF NOT EXISTS public.subjects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    grade TEXT NOT NULL DEFAULT '11',
    code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Chapters Table
CREATE TABLE IF NOT EXISTS public.chapters (
    id TEXT PRIMARY KEY,
    subject_id TEXT NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 1,
    estimated_hours INTEGER NOT NULL DEFAULT 5,
    difficulty TEXT DEFAULT 'medium',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chapters_subject_id ON public.chapters(subject_id);

-- 10. Backlog Items Table
CREATE TABLE IF NOT EXISTS public.backlog_items (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    subject_id TEXT REFERENCES public.subjects(id) ON DELETE SET NULL,
    chapter_id TEXT NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    estimated_hours INTEGER NOT NULL DEFAULT 5,
    hours_spent INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'incomplete', 'not_started', 'in_progress', 'completed'
    difficulty TEXT DEFAULT 'medium',
    confidence TEXT DEFAULT 'medium',
    exam_relevance TEXT DEFAULT 'high',
    deadline TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_backlog_items_user_id ON public.backlog_items(user_id);
CREATE INDEX IF NOT EXISTS idx_backlog_items_chapter_id ON public.backlog_items(chapter_id);
CREATE INDEX IF NOT EXISTS idx_backlog_items_status ON public.backlog_items(status);

-- ==============================================================================
-- 11. Row Level Security (RLS) & Permissions
-- ==============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.completed_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backlog_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Allow all access to users') THEN
        CREATE POLICY "Allow all access to users" ON public.users FOR ALL USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'plans' AND policyname = 'Allow all access to plans') THEN
        CREATE POLICY "Allow all access to plans" ON public.plans FOR ALL USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'completed_chapters' AND policyname = 'Allow all access to completed_chapters') THEN
        CREATE POLICY "Allow all access to completed_chapters" ON public.completed_chapters FOR ALL USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'study_sessions' AND policyname = 'Allow all access to study_sessions') THEN
        CREATE POLICY "Allow all access to study_sessions" ON public.study_sessions FOR ALL USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notes' AND policyname = 'Allow all access to notes') THEN
        CREATE POLICY "Allow all access to notes" ON public.notes FOR ALL USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'practice_checks' AND policyname = 'Allow all access to practice_checks') THEN
        CREATE POLICY "Allow all access to practice_checks" ON public.practice_checks FOR ALL USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_resources' AND policyname = 'Allow all access to user_resources') THEN
        CREATE POLICY "Allow all access to user_resources" ON public.user_resources FOR ALL USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subjects' AND policyname = 'Allow all access to subjects') THEN
        CREATE POLICY "Allow all access to subjects" ON public.subjects FOR ALL USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chapters' AND policyname = 'Allow all access to chapters') THEN
        CREATE POLICY "Allow all access to chapters" ON public.chapters FOR ALL USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'backlog_items' AND policyname = 'Allow all access to backlog_items') THEN
        CREATE POLICY "Allow all access to backlog_items" ON public.backlog_items FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

