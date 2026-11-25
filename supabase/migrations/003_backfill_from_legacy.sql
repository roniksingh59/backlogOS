-- ==============================================================================
-- BacklogOS — Phase 2 Migration 003: Idempotent Non-Destructive Legacy Backfill
--
-- Migrates existing student data cleanly into the normalized v2 schema while
-- preserving all legacy tables intact.
--
-- Critical Integrity Rules:
--   1. Legacy completed backlog items map to STUDY_COMPLETE (never MASTERED).
--   2. Legacy completed day slots map to STUDIED (never VERIFIED).
--   3. Safe to run multiple times (ON CONFLICT DO NOTHING / DO UPDATE).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. BACKFILL PROFILES FROM student_profiles
-- ------------------------------------------------------------------------------
INSERT INTO public.profiles (
    user_id,
    board,
    grade,
    stream,
    goal,
    priority,
    confidence,
    exam_date,
    minutes_per_day,
    selected_chapter_ids,
    workspace_state,
    created_at,
    updated_at
)
SELECT
    u.id,
    COALESCE(NULLIF(sp.board::text, ''), 'CBSE'),
    COALESCE(NULLIF(sp.grade::text, ''), '11'),
    COALESCE(sp.stream::text, 'pcm'),
    COALESCE(NULLIF(sp.goal::text, ''), 'Complete CBSE Backlog Recovery'),
    COALESCE(NULLIF(sp.priority::text, ''), 'backlog recovery'),
    COALESCE(NULLIF(sp.confidence::text, ''), 'mixed'),
    COALESCE(sp.exam_date::text, ''),
    GREATEST(15, LEAST(960, COALESCE(sp.minutes_per_day, 180))),
    COALESCE(
        ARRAY(
            SELECT elem
            FROM jsonb_array_elements_text(
                CASE
                    WHEN jsonb_typeof(to_jsonb(sp.selected_chapter_ids)) = 'array'
                    THEN to_jsonb(sp.selected_chapter_ids)
                    ELSE '[]'::jsonb
                END
            ) AS elem
        ),
        ARRAY[]::TEXT[]
    ),
    CASE
        WHEN sp.workspace_state IS NULL THEN '{}'::jsonb
        WHEN jsonb_typeof(to_jsonb(sp.workspace_state)) = 'object' THEN to_jsonb(sp.workspace_state)
        ELSE '{}'::jsonb
    END,
    COALESCE(sp.created_at, NOW()),
    COALESCE(sp.updated_at, NOW())
FROM public.student_profiles sp
JOIN auth.users u
  ON u.id::text = sp.user_id::text
ON CONFLICT (user_id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 2. BACKFILL STUDENT SUBJECTS FROM student_profiles.subjects + public.subjects
-- ------------------------------------------------------------------------------
INSERT INTO public.student_subjects (
    user_id,
    subject_id,
    is_active,
    is_archived,
    priority_rank
)
SELECT
    u.id,
    sub.id,
    true,
    false,
    ROW_NUMBER() OVER (PARTITION BY u.id ORDER BY sub.id)
FROM public.student_profiles sp
JOIN auth.users u
  ON u.id::text = sp.user_id::text
CROSS JOIN LATERAL jsonb_array_elements_text(
    CASE
        WHEN jsonb_typeof(to_jsonb(sp.subjects)) = 'array'
        THEN to_jsonb(sp.subjects)
        ELSE '[]'::jsonb
    END
) WITH ORDINALITY AS s(name_or_id, ord)
JOIN public.subjects sub
  ON LOWER(sub.id) = LOWER(s.name_or_id)
  OR (
      LOWER(sub.name) = LOWER(s.name_or_id)
      AND sub.grade = COALESCE(NULLIF(sp.grade::text, ''), '11')
  )
ON CONFLICT (user_id, subject_id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 3. BACKFILL STUDENT BACKLOG & CHAPTER MASTERY FROM backlog_items
--    Note: Legacy 'completed'/'mastered'/'done' maps ONLY to 'STUDY_COMPLETE'.
-- ------------------------------------------------------------------------------
INSERT INTO public.student_backlog (
    user_id,
    chapter_id,
    catalog_chapter_id,
    subject_id,
    subject_name,
    chapter_title,
    status,
    priority,
    difficulty,
    confidence,
    exam_relevance,
    estimated_minutes,
    minutes_spent,
    prerequisite_chapter_ids,
    deadline,
    notes,
    legacy_backlog_item_id,
    client_id,
    created_at,
    updated_at
)
SELECT
    u.id AS user_id,
    bi.chapter_id,
    c.id AS catalog_chapter_id,
    c.subject_id,
    COALESCE(NULLIF(bi.subject, ''), 'Physics'),
    COALESCE(NULLIF(bi.topic, ''), c.title, bi.chapter_id),
    CASE
        WHEN LOWER(COALESCE(bi.status, '')) IN ('completed', 'mastered', 'done', 'study_complete') THEN 'STUDY_COMPLETE'
        WHEN LOWER(COALESCE(bi.status, '')) IN ('learning', 'in_progress') THEN 'IN_PROGRESS'
        ELSE 'NOT_STARTED'
    END,
    CASE
        WHEN LOWER(COALESCE(bi.exam_relevance, '')) IN ('critical', 'high', 'medium', 'low') THEN LOWER(bi.exam_relevance)
        ELSE 'high'
    END,
    CASE
        WHEN LOWER(COALESCE(bi.difficulty, '')) IN ('easy', 'medium', 'hard') THEN LOWER(bi.difficulty)
        ELSE 'medium'
    END,
    COALESCE(NULLIF(bi.confidence, ''), 'medium'),
    COALESCE(NULLIF(bi.exam_relevance, ''), 'high'),
    GREATEST(0, ROUND(COALESCE(bi.estimated_hours, 5.0) * 60)::INTEGER),
    GREATEST(0, ROUND(COALESCE(bi.hours_spent, 0.0) * 60)::INTEGER),
    COALESCE(
        ARRAY(
            SELECT elem
            FROM jsonb_array_elements_text(
                CASE
                    WHEN jsonb_typeof(to_jsonb(bi.prerequisites)) = 'array'
                    THEN to_jsonb(bi.prerequisites)
                    ELSE '[]'::jsonb
                END
            ) AS elem
        ),
        ARRAY[]::TEXT[]
    ),
    bi.deadline,
    bi.notes,
    bi.id,
    bi.client_id,
    COALESCE(bi.created_at, NOW()),
    COALESCE(bi.completed_at, bi.created_at, NOW())
FROM public.backlog_items bi
JOIN auth.users u
  ON u.id::text = bi.user_id::text
LEFT JOIN public.chapters c
  ON c.id = bi.chapter_id
ON CONFLICT (user_id, chapter_id) DO NOTHING;

INSERT INTO public.chapter_mastery (
    user_id,
    chapter_id,
    subject_id,
    status,
    study_completed,
    mastery_score,
    best_mastery_score,
    concept_coverage_percent,
    attempts_count,
    study_completed_at
)
SELECT
    sb.user_id,
    sb.chapter_id,
    sb.subject_id,
    CASE
        WHEN sb.status = 'STUDY_COMPLETE' THEN 'STUDY_COMPLETE'
        WHEN sb.status = 'IN_PROGRESS' THEN 'IN_PROGRESS'
        ELSE 'NOT_STARTED'
    END,
    (sb.status = 'STUDY_COMPLETE'),
    0.00,
    0.00,
    0.00,
    0,
    CASE WHEN sb.status = 'STUDY_COMPLETE' THEN sb.updated_at ELSE NULL END
FROM public.student_backlog sb
ON CONFLICT (user_id, chapter_id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 4. BACKFILL PLANS FROM study_plans (Preserving Exact Plan UUIDs)
-- ------------------------------------------------------------------------------
INSERT INTO public.plans (
    id,
    user_id,
    name,
    plan_horizon_days,
    is_active,
    status,
    board,
    goal,
    priority,
    confidence,
    exam_date,
    minutes_per_day,
    subjects,
    selected_chapter_ids,
    prerequisite_chapter_ids,
    order_reason,
    coverage_note,
    legacy_study_plan_id,
    client_id,
    created_at,
    updated_at
)
SELECT
    sp.id,
    u.id,
    COALESCE(NULLIF(sp.name::text, ''), 'Primary Recovery Plan'),
    GREATEST(
        1,
        LEAST(
            365,
            CASE
                WHEN jsonb_typeof(to_jsonb(sp.days)) = 'array' THEN jsonb_array_length(to_jsonb(sp.days))
                ELSE 7
            END
        )
    ),
    COALESCE(sp.is_active, true),
    CASE WHEN COALESCE(sp.is_active, true) THEN 'active' ELSE 'archived' END,
    COALESCE(NULLIF(sp.board::text, ''), 'CBSE'),
    COALESCE(NULLIF(sp.goal::text, ''), 'Complete CBSE Backlog Recovery'),
    COALESCE(NULLIF(sp.priority::text, ''), 'backlog recovery'),
    COALESCE(NULLIF(sp.confidence::text, ''), 'mixed'),
    COALESCE(sp.exam_date::text, ''),
    GREATEST(15, LEAST(960, COALESCE(sp.minutes_per_day, 180))),
    COALESCE(
        ARRAY(
            SELECT elem
            FROM jsonb_array_elements_text(
                CASE
                    WHEN jsonb_typeof(to_jsonb(sp.subjects)) = 'array' THEN to_jsonb(sp.subjects)
                    ELSE '[]'::jsonb
                END
            ) AS elem
        ),
        ARRAY[]::TEXT[]
    ),
    COALESCE(
        ARRAY(
            SELECT elem
            FROM jsonb_array_elements_text(
                CASE
                    WHEN jsonb_typeof(to_jsonb(sp.chapter_ids)) = 'array' THEN to_jsonb(sp.chapter_ids)
                    ELSE '[]'::jsonb
                END
            ) AS elem
        ),
        ARRAY[]::TEXT[]
    ),
    COALESCE(
        ARRAY(
            SELECT elem
            FROM jsonb_array_elements_text(
                CASE
                    WHEN jsonb_typeof(to_jsonb(sp.prerequisite_ids)) = 'array' THEN to_jsonb(sp.prerequisite_ids)
                    ELSE '[]'::jsonb
                END
            ) AS elem
        ),
        ARRAY[]::TEXT[]
    ),
    COALESCE(sp.order_reason::text, ''),
    COALESCE(sp.coverage_note::text, ''),
    sp.id,
    sp.client_id,
    COALESCE(sp.created_at, NOW()),
    COALESCE(sp.updated_at, NOW())
FROM public.study_plans sp
JOIN auth.users u
  ON u.id::text = sp.user_id::text
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 5. BACKFILL PLAN DAYS & OBJECTIVES FROM study_plans.days JSONB + completed_tasks
--    Matches actual PlanDay JSON (`day`, `theme`, `tasks` / fallback `slots`).
--    Legacy completed tasks map ONLY to 'STUDIED' (never 'VERIFIED').
-- ------------------------------------------------------------------------------
INSERT INTO public.plan_days (
    plan_id,
    user_id,
    day_number,
    scheduled_date,
    title,
    focus_theme,
    allocated_minutes,
    max_capacity_minutes,
    is_recovery_day
)
SELECT
    sp.id AS plan_id,
    u.id AS user_id,
    COALESCE(
        NULLIF(day_elem.val->>'day', '')::INTEGER,
        NULLIF(day_elem.val->>'dayNumber', '')::INTEGER,
        day_elem.ord::INTEGER
    ) AS day_number,
    CASE
        WHEN (day_elem.val->>'date') ~ '^\d{4}-\d{2}-\d{2}' THEN (day_elem.val->>'date')::DATE
        ELSE (COALESCE(sp.created_at::DATE, CURRENT_DATE) + (
            COALESCE(
                NULLIF(day_elem.val->>'day', '')::INTEGER,
                NULLIF(day_elem.val->>'dayNumber', '')::INTEGER,
                day_elem.ord::INTEGER
            ) - 1
        ))
    END AS scheduled_date,
    COALESCE(
        NULLIF(day_elem.val->>'chapterTitle', ''),
        NULLIF(day_elem.val->>'title', ''),
        'Day ' || COALESCE(NULLIF(day_elem.val->>'day', ''), day_elem.ord::TEXT)
    ) AS title,
    COALESCE(
        NULLIF(day_elem.val->>'theme', ''),
        NULLIF(day_elem.val->>'focusTheme', ''),
        NULLIF(day_elem.val->>'rhythmBadge', ''),
        ''
    ) AS focus_theme,
    COALESCE(
        (
            SELECT SUM(GREATEST(0, COALESCE(NULLIF(t->>'minutes', '')::INTEGER, NULLIF(t->>'durationMinutes', '')::INTEGER, 0)))
            FROM jsonb_array_elements(
                CASE
                    WHEN jsonb_typeof(day_elem.val->'tasks') = 'array' AND jsonb_array_length(day_elem.val->'tasks') > 0
                        THEN day_elem.val->'tasks'
                    ELSE COALESCE(day_elem.val->'slots', '[]'::jsonb)
                END
            ) AS t
        ),
        GREATEST(15, COALESCE(sp.minutes_per_day, 180))
    ) AS allocated_minutes,
    GREATEST(15, COALESCE(sp.minutes_per_day, 180)) AS max_capacity_minutes,
    COALESCE((day_elem.val->>'isRecap')::BOOLEAN, false) AS is_recovery_day
FROM public.study_plans sp
JOIN auth.users u
  ON u.id::text = sp.user_id::text
CROSS JOIN LATERAL jsonb_array_elements(
    CASE
        WHEN jsonb_typeof(to_jsonb(sp.days)) = 'array' THEN to_jsonb(sp.days)
        ELSE '[]'::jsonb
    END
) WITH ORDINALITY AS day_elem(val, ord)
ON CONFLICT (plan_id, day_number) DO NOTHING;

INSERT INTO public.objectives (
    plan_id,
    plan_day_id,
    user_id,
    chapter_id,
    subject_name,
    title,
    description,
    kind,
    state,
    estimated_minutes,
    sequence_order,
    scheduled_date,
    legacy_task_key,
    studied_at
)
SELECT
    sp.id AS plan_id,
    pd.id AS plan_day_id,
    u.id AS user_id,
    COALESCE(NULLIF(task_elem.val->>'chapterId', ''), NULLIF(day_elem.val->>'chapterId', ''), 'unknown-chapter') AS chapter_id,
    COALESCE(NULLIF(task_elem.val->>'subject', ''), NULLIF(day_elem.val->>'subject', ''), 'Physics') AS subject_name,
    COALESCE(
        NULLIF(task_elem.val->>'label', ''),
        NULLIF(task_elem.val->>'title', ''),
        NULLIF(task_elem.val->>'chapterTitle', ''),
        'Study Objective'
    ) AS title,
    COALESCE(
        NULLIF(task_elem.val->>'detail', ''),
        NULLIF(task_elem.val->>'objective', ''),
        NULLIF(task_elem.val->>'reason', ''),
        ''
    ) AS description,
    CASE
        WHEN LOWER(COALESCE(task_elem.val->>'kind', '')) IN ('learning', 'learn') THEN 'learn'
        WHEN LOWER(COALESCE(task_elem.val->>'kind', '')) = 'practice' THEN 'practice'
        WHEN LOWER(COALESCE(task_elem.val->>'kind', '')) IN ('revision', 'revise') THEN 'revise'
        WHEN LOWER(COALESCE(task_elem.val->>'kind', '')) IN ('test', 'verify') THEN 'verify'
        WHEN LOWER(COALESCE(task_elem.val->>'kind', '')) = 'recovery' THEN 'recovery'
        ELSE 'learn'
    END AS kind,
    CASE
        WHEN COALESCE((task_elem.val->>'completed')::BOOLEAN, false)
          OR EXISTS (
              SELECT 1
              FROM public.completed_tasks ct
              WHERE ct.user_id::text = u.id::text
                AND (
                    ct.task_id = COALESCE(NULLIF(task_elem.val->>'id', ''), sp.id::text || '::day-' || pd.day_number::text || '-task-' || task_elem.ord::text)
                    OR ct.task_id = sp.id::text || '::day-' || pd.day_number::text || '-task-' || task_elem.ord::text
                    OR ct.task_id = 'day-' || pd.day_number::text || '-task-' || task_elem.ord::text
                )
          )
        THEN 'STUDIED'
        ELSE 'PENDING'
    END AS state,
    GREATEST(0, COALESCE(NULLIF(task_elem.val->>'minutes', '')::INTEGER, NULLIF(task_elem.val->>'durationMinutes', '')::INTEGER, 45)) AS estimated_minutes,
    task_elem.ord::INTEGER AS sequence_order,
    pd.scheduled_date,
    CASE
        WHEN NULLIF(task_elem.val->>'id', '') IS NOT NULL AND position('::' in (task_elem.val->>'id')) > 0
            THEN task_elem.val->>'id'
        ELSE sp.id::text || '::' || COALESCE(NULLIF(task_elem.val->>'id', ''), 'day-' || pd.day_number::text || '-task-' || task_elem.ord::text)
    END AS legacy_task_key,
    CASE
        WHEN COALESCE((task_elem.val->>'completed')::BOOLEAN, false)
          OR EXISTS (
              SELECT 1
              FROM public.completed_tasks ct
              WHERE ct.user_id::text = u.id::text
                AND (
                    ct.task_id = COALESCE(NULLIF(task_elem.val->>'id', ''), sp.id::text || '::day-' || pd.day_number::text || '-task-' || task_elem.ord::text)
                    OR ct.task_id = sp.id::text || '::day-' || pd.day_number::text || '-task-' || task_elem.ord::text
                    OR ct.task_id = 'day-' || pd.day_number::text || '-task-' || task_elem.ord::text
                )
          )
        THEN COALESCE(sp.updated_at, NOW())
        ELSE NULL
    END AS studied_at
FROM public.study_plans sp
JOIN auth.users u
  ON u.id::text = sp.user_id::text
CROSS JOIN LATERAL jsonb_array_elements(
    CASE
        WHEN jsonb_typeof(to_jsonb(sp.days)) = 'array' THEN to_jsonb(sp.days)
        ELSE '[]'::jsonb
    END
) WITH ORDINALITY AS day_elem(val, ord)
JOIN public.plan_days pd
  ON pd.plan_id = sp.id
 AND pd.day_number = COALESCE(
        NULLIF(day_elem.val->>'day', '')::INTEGER,
        NULLIF(day_elem.val->>'dayNumber', '')::INTEGER,
        day_elem.ord::INTEGER
    )
CROSS JOIN LATERAL jsonb_array_elements(
    CASE
        WHEN jsonb_typeof(day_elem.val->'tasks') = 'array' AND jsonb_array_length(day_elem.val->'tasks') > 0
            THEN day_elem.val->'tasks'
        ELSE COALESCE(day_elem.val->'slots', '[]'::jsonb)
    END
) WITH ORDINALITY AS task_elem(val, ord)
ON CONFLICT (user_id, legacy_task_key) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 6. BACKFILL INITIAL STUDY HISTORY RECORDS (mastery_history)
--    Records STUDY_COMPLETED events for legacy completed chapters without
--    claiming verified mastery.
-- ------------------------------------------------------------------------------
INSERT INTO public.mastery_history (
    user_id,
    chapter_id,
    event_type,
    previous_status,
    new_status,
    notes,
    recorded_at
)
SELECT
    cm.user_id,
    cm.chapter_id,
    'STUDY_COMPLETED',
    'NOT_STARTED',
    'STUDY_COMPLETE',
    'Backfilled from legacy backlog study completion; chapter mastery assessment pending.',
    COALESCE(cm.study_completed_at, NOW())
FROM public.chapter_mastery cm
WHERE cm.study_completed = true
  AND NOT EXISTS (
      SELECT 1
      FROM public.mastery_history mh
      WHERE mh.user_id = cm.user_id
        AND mh.chapter_id = cm.chapter_id
        AND mh.event_type = 'STUDY_COMPLETED'
  );
