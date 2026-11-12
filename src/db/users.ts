import { createPool } from './index.ts';

const pool = createPool();

// Cached schema column availability to avoid querying information_schema repeatedly
let _hasPhoneCol: boolean | null = null;
let _hasGradeCol: boolean | null = null;
let _hasUpdatedAtCol: boolean | null = null;
let _hasUserResourcesTable: boolean | null = null;

async function checkColumns() {
  if (_hasPhoneCol !== null && _hasGradeCol !== null && _hasUpdatedAtCol !== null) {
    return;
  }
  try {
    const res = await pool.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_schema = 'public' AND table_name = 'users' 
       AND column_name IN ('phone', 'grade', 'updated_at')`
    );
    const cols = new Set(res.rows.map((r: any) => r.column_name));
    _hasPhoneCol = cols.has('phone');
    _hasGradeCol = cols.has('grade');
    _hasUpdatedAtCol = cols.has('updated_at');
  } catch (err) {
    _hasPhoneCol = false;
    _hasGradeCol = false;
    _hasUpdatedAtCol = false;
  }
}

async function checkUserResourcesTable(): Promise<boolean> {
  if (_hasUserResourcesTable !== null) return _hasUserResourcesTable;
  try {
    const res = await pool.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public' AND table_name = 'user_resources'`
    );
    _hasUserResourcesTable = res.rows.length > 0;
  } catch {
    _hasUserResourcesTable = false;
  }
  return _hasUserResourcesTable;
}

export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName?: string | null,
  photoUrl?: string | null,
  phone?: string | null,
  grade?: string | null
) {
  await checkColumns();

  try {
    // 1. Look up user by UID (Supabase Auth UID)
    const existing = await pool.query('SELECT * FROM users WHERE uid = $1 LIMIT 1', [uid]);
    if (existing.rows.length > 0) {
      const user = existing.rows[0];
      const updates: string[] = [];
      const values: any[] = [];
      let idx = 1;

      if (email && email !== user.email) {
        updates.push(`email = $${idx++}`);
        values.push(email);
      }
      if (displayName && displayName !== user.display_name) {
        updates.push(`display_name = $${idx++}`);
        values.push(displayName);
      }
      if (photoUrl && photoUrl !== user.photo_url) {
        updates.push(`photo_url = $${idx++}`);
        values.push(photoUrl);
      }
      if (_hasPhoneCol && phone && phone !== user.phone) {
        updates.push(`phone = $${idx++}`);
        values.push(phone);
      }
      if (_hasGradeCol && grade && grade !== user.grade) {
        updates.push(`grade = $${idx++}`);
        values.push(grade);
      }
      if (_hasUpdatedAtCol) {
        updates.push(`updated_at = NOW()`);
      }

      if (updates.length > 0) {
        values.push(user.id);
        const updateQuery = `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`;
        const updated = await pool.query(updateQuery, values);
        return formatUserRow(updated.rows[0]);
      }

      return formatUserRow(user);
    }

    // 2. Reconciliation by email if registered in prior session
    if (email && email.trim()) {
      const byEmail = await pool.query('SELECT * FROM users WHERE email = $1 LIMIT 1', [email.trim()]);
      if (byEmail.rows.length > 0) {
        const user = byEmail.rows[0];
        const updates = ['uid = $1'];
        const values: any[] = [uid];
        let idx = 2;

        if (displayName) {
          updates.push(`display_name = $${idx++}`);
          values.push(displayName);
        }
        if (photoUrl) {
          updates.push(`photo_url = $${idx++}`);
          values.push(photoUrl);
        }
        if (_hasPhoneCol && phone) {
          updates.push(`phone = $${idx++}`);
          values.push(phone);
        }
        if (_hasGradeCol && grade) {
          updates.push(`grade = $${idx++}`);
          values.push(grade);
        }
        if (_hasUpdatedAtCol) {
          updates.push('updated_at = NOW()');
        }

        values.push(user.id);
        const updateQuery = `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`;
        const updated = await pool.query(updateQuery, values);
        return formatUserRow(updated.rows[0]);
      }
    }

    // 3. New User Registration
    const cols = ['uid', 'email', 'display_name', 'photo_url'];
    const vals = [uid, email || '', displayName || null, photoUrl || null];
    const placeholders = ['$1', '$2', '$3', '$4'];
    let cIdx = 5;

    if (_hasPhoneCol) {
      cols.push('phone');
      vals.push(phone || null);
      placeholders.push(`$${cIdx++}`);
    }
    if (_hasGradeCol) {
      cols.push('grade');
      vals.push(grade || '11');
      placeholders.push(`$${cIdx++}`);
    }

    const insertQuery = `INSERT INTO users (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
    const res = await pool.query(insertQuery, vals);
    return formatUserRow(res.rows[0]);
  } catch (error) {
    console.error('Error in getOrCreateUser:', error);
    throw new Error('Database user sync failed', { cause: error });
  }
}

function formatUserRow(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    uid: row.uid,
    email: row.email,
    displayName: row.display_name,
    preferredName: row.preferred_name || null,
    schoolName: row.school_name || null,
    photoUrl: row.photo_url,
    phone: row.phone || null,
    grade: row.grade || '11',
    board: row.board || 'CBSE',
    academicSession: row.academic_session || '2026-27',
    stream: row.stream || 'pcm',
    additionalSubjects: typeof row.additional_subjects === 'string' ? JSON.parse(row.additional_subjects) : (row.additional_subjects || []),
    backlogInfo: typeof row.backlog_info === 'string' ? JSON.parse(row.backlog_info) : (row.backlog_info || {}),
    learningPreferences: typeof row.learning_preferences === 'string' ? JSON.parse(row.learning_preferences) : (row.learning_preferences || {}),
    onboardingCompleted: row.onboarding_completed ?? false,
    onboardingStep: row.onboarding_step || 1,
    onboardingDraft: typeof row.onboarding_draft === 'string' ? JSON.parse(row.onboarding_draft) : (row.onboarding_draft || null),
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
  };
}

export async function updateUserProfile(
  userId: number,
  updates: {
    displayName?: string;
    preferredName?: string | null;
    grade?: string;
    schoolName?: string | null;
    phone?: string | null;
    photoUrl?: string | null;
    board?: string;
    academicSession?: string;
    stream?: string;
    additionalSubjects?: any;
    backlogInfo?: any;
    learningPreferences?: any;
    onboardingCompleted?: boolean;
    onboardingStep?: number;
    onboardingDraft?: any;
  }
) {
  try {
    const setClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (updates.displayName !== undefined) {
      setClauses.push(`display_name = $${idx++}`);
      values.push(updates.displayName);
    }
    if (updates.preferredName !== undefined) {
      setClauses.push(`preferred_name = $${idx++}`);
      values.push(updates.preferredName);
    }
    if (updates.grade !== undefined) {
      setClauses.push(`grade = $${idx++}`);
      values.push(updates.grade);
    }
    if (updates.schoolName !== undefined) {
      setClauses.push(`school_name = $${idx++}`);
      values.push(updates.schoolName);
    }
    if (updates.phone !== undefined) {
      setClauses.push(`phone = $${idx++}`);
      values.push(updates.phone);
    }
    if (updates.photoUrl !== undefined) {
      setClauses.push(`photo_url = $${idx++}`);
      values.push(updates.photoUrl);
    }
    if (updates.board !== undefined) {
      setClauses.push(`board = $${idx++}`);
      values.push(updates.board);
    }
    if (updates.academicSession !== undefined) {
      setClauses.push(`academic_session = $${idx++}`);
      values.push(updates.academicSession);
    }
    if (updates.stream !== undefined) {
      setClauses.push(`stream = $${idx++}`);
      values.push(updates.stream);
    }
    if (updates.additionalSubjects !== undefined) {
      setClauses.push(`additional_subjects = $${idx++}`);
      values.push(JSON.stringify(updates.additionalSubjects));
    }
    if (updates.backlogInfo !== undefined) {
      setClauses.push(`backlog_info = $${idx++}`);
      values.push(JSON.stringify(updates.backlogInfo));
    }
    if (updates.learningPreferences !== undefined) {
      setClauses.push(`learning_preferences = $${idx++}`);
      values.push(JSON.stringify(updates.learningPreferences));
    }
    if (updates.onboardingCompleted !== undefined) {
      setClauses.push(`onboarding_completed = $${idx++}`);
      values.push(Boolean(updates.onboardingCompleted));
    }
    if (updates.onboardingStep !== undefined) {
      setClauses.push(`onboarding_step = $${idx++}`);
      values.push(Number(updates.onboardingStep));
    }
    if (updates.onboardingDraft !== undefined) {
      setClauses.push(`onboarding_draft = $${idx++}`);
      values.push(updates.onboardingDraft ? JSON.stringify(updates.onboardingDraft) : null);
    }

    setClauses.push('updated_at = NOW()');

    if (setClauses.length === 1) {
      const current = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
      return formatUserRow(current.rows[0]);
    }

    values.push(userId);
    const query = `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`;
    const res = await pool.query(query, values);
    return formatUserRow(res.rows[0]);
  } catch (error) {
    console.error('Error in updateUserProfile:', error);
    // Fallback basic update
    try {
      const basicClauses: string[] = [];
      const bVals: any[] = [];
      let bIdx = 1;
      if (updates.displayName !== undefined) {
        basicClauses.push(`display_name = $${bIdx++}`);
        bVals.push(updates.displayName);
      }
      if (updates.grade !== undefined) {
        basicClauses.push(`grade = $${bIdx++}`);
        bVals.push(updates.grade);
      }
      if (basicClauses.length > 0) {
        bVals.push(userId);
        const fbRes = await pool.query(`UPDATE users SET ${basicClauses.join(', ')} WHERE id = $${bIdx} RETURNING *`, bVals);
        return formatUserRow(fbRes.rows[0]);
      }
    } catch {}
    throw new Error('Database profile update failed', { cause: error });
  }
}

function formatPlanRow(r: any) {
  if (!r) return null;
  return {
    id: r.id,
    userId: r.user_id,
    name: r.name || 'Primary Study Plan',
    isActive: r.is_active ?? true,
    board: r.board || 'CBSE',
    goal: r.goal || '',
    priority: r.priority || 'backlog recovery',
    confidence: r.confidence || 'mixed',
    examDate: r.exam_date || '',
    minutesPerDay: r.minutes_per_day || 120,
    targetScore: r.target_score || 90,
    planDuration: r.plan_duration || 7,
    subjects: typeof r.subjects === 'string' ? JSON.parse(r.subjects) : (r.subjects || []),
    chapterIds: typeof r.chapter_ids === 'string' ? JSON.parse(r.chapter_ids) : (r.chapter_ids || []),
    plannedChapterIds: typeof r.planned_chapter_ids === 'string' ? JSON.parse(r.planned_chapter_ids) : (r.planned_chapter_ids || []),
    days: typeof r.days === 'string' ? JSON.parse(r.days) : (r.days || []),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function getUserPlan(userId: number) {
  try {
    const res = await pool.query('SELECT * FROM plans WHERE user_id = $1 ORDER BY is_active DESC NULLS LAST, id DESC LIMIT 1', [userId]);
    if (res.rows.length === 0) return null;
    return formatPlanRow(res.rows[0]);
  } catch (error) {
    console.error('Error fetching plan:', error);
    try {
      const fallback = await pool.query('SELECT * FROM plans WHERE user_id = $1 LIMIT 1', [userId]);
      if (fallback.rows.length === 0) return null;
      return formatPlanRow(fallback.rows[0]);
    } catch {
      return null;
    }
  }
}

export async function getUserPlans(userId: number) {
  try {
    const res = await pool.query('SELECT * FROM plans WHERE user_id = $1 ORDER BY id DESC', [userId]);
    return res.rows.map(formatPlanRow);
  } catch (error) {
    console.error('Error fetching user plans:', error);
    return [];
  }
}

export async function setActiveUserPlan(userId: number, planId: number) {
  try {
    await pool.query('UPDATE plans SET is_active = false WHERE user_id = $1', [userId]);
    const res = await pool.query('UPDATE plans SET is_active = true WHERE user_id = $1 AND id = $2 RETURNING *', [userId, planId]);
    return res.rows.length > 0 ? formatPlanRow(res.rows[0]) : null;
  } catch (error) {
    console.error('Error activating plan:', error);
    return null;
  }
}

export async function deleteUserPlan(userId: number, planId: number) {
  try {
    await pool.query('DELETE FROM plans WHERE user_id = $1 AND id = $2', [userId, planId]);
    return true;
  } catch (error) {
    console.error('Error deleting plan:', error);
    return false;
  }
}

export async function saveUserPlan(userId: number, planData: any) {
  try {
    const name = planData.name || 'Primary Study Plan';
    const isActive = planData.isActive !== undefined ? Boolean(planData.isActive) : true;
    const targetScore = planData.targetScore || 90;
    const planDuration = planData.planDuration || 7;
    const subjects = JSON.stringify(planData.subjects || []);
    const chapterIds = JSON.stringify(planData.chapterIds || []);
    const plannedChapterIds = JSON.stringify(planData.plannedChapterIds || planData.chapterIds || []);
    const days = JSON.stringify(planData.days || []);

    if (isActive) {
      try {
        await pool.query('UPDATE plans SET is_active = false WHERE user_id = $1', [userId]);
      } catch {}
    }

    if (planData.id) {
      const updateQuery = `
        UPDATE plans SET
          name = COALESCE($1, name),
          is_active = $2,
          board = $3,
          goal = $4,
          priority = $5,
          confidence = $6,
          exam_date = $7,
          minutes_per_day = $8,
          target_score = $9,
          plan_duration = $10,
          subjects = $11,
          chapter_ids = $12,
          planned_chapter_ids = $13,
          days = $14,
          updated_at = NOW()
        WHERE user_id = $15 AND id = $16
        RETURNING *
      `;
      const res = await pool.query(updateQuery, [
        name,
        isActive,
        planData.board || 'CBSE',
        planData.goal || '',
        planData.priority || 'backlog recovery',
        planData.confidence || 'mixed',
        planData.examDate || '',
        planData.minutesPerDay || 120,
        targetScore,
        planDuration,
        subjects,
        chapterIds,
        plannedChapterIds,
        days,
        userId,
        planData.id,
      ]);
      return formatPlanRow(res.rows[0]);
    } else {
      const insertQuery = `
        INSERT INTO plans (
          user_id, name, is_active, board, goal, priority, confidence, exam_date,
          minutes_per_day, target_score, plan_duration, subjects, chapter_ids, planned_chapter_ids, days
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
      `;
      const res = await pool.query(insertQuery, [
        userId,
        name,
        isActive,
        planData.board || 'CBSE',
        planData.goal || '',
        planData.priority || 'backlog recovery',
        planData.confidence || 'mixed',
        planData.examDate || '',
        planData.minutesPerDay || 120,
        targetScore,
        planDuration,
        subjects,
        chapterIds,
        plannedChapterIds,
        days,
      ]);
      return formatPlanRow(res.rows[0]);
    }
  } catch (error) {
    console.error('Error saving plan:', error);
    // Fallback without newer columns if table has not been altered yet
    try {
      const fallbackQuery = `
        INSERT INTO plans (
          user_id, board, goal, priority, confidence, exam_date,
          minutes_per_day, subjects, chapter_ids, planned_chapter_ids, days
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      const res = await pool.query(fallbackQuery, [
        userId,
        planData.board || 'CBSE',
        planData.goal || '',
        planData.priority || 'backlog recovery',
        planData.confidence || 'mixed',
        planData.examDate || '',
        planData.minutesPerDay || 120,
        JSON.stringify(planData.subjects || []),
        JSON.stringify(planData.chapterIds || []),
        JSON.stringify(planData.plannedChapterIds || []),
        JSON.stringify(planData.days || []),
      ]);
      return formatPlanRow(res.rows[0]);
    } catch (fbErr) {
      throw new Error('Database save failed', { cause: fbErr });
    }
  }
}


export async function getUserCompleted(userId: number): Promise<string[]> {
  try {
    const res = await pool.query('SELECT chapter_id FROM completed_chapters WHERE user_id = $1', [userId]);
    return res.rows.map((r: any) => r.chapter_id);
  } catch (error) {
    console.error('Error fetching completed chapters:', error);
    return [];
  }
}

export async function setUserCompleted(userId: number, chapterIds: string[]) {
  try {
    await pool.query('DELETE FROM completed_chapters WHERE user_id = $1', [userId]);
    if (chapterIds.length > 0) {
      for (const cid of chapterIds) {
        await pool.query(
          'INSERT INTO completed_chapters (user_id, chapter_id, completed_at) VALUES ($1, $2, NOW())',
          [userId, cid]
        );
      }
    }
    return chapterIds;
  } catch (error) {
    console.error('Error updating completed chapters:', error);
    throw new Error('Database update failed', { cause: error });
  }
}

export async function getUserSessions(userId: number) {
  try {
    const res = await pool.query('SELECT * FROM study_sessions WHERE user_id = $1 ORDER BY id DESC', [userId]);
    return res.rows.map((s: any) => ({
      id: s.id,
      userId: s.user_id,
      sessionId: s.session_id,
      chapterId: s.chapter_id,
      minutes: s.minutes,
      mode: s.mode,
      completedAt: s.completed_at,
    }));
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return [];
  }
}

export async function addUserSession(userId: number, session: any) {
  try {
    const res = await pool.query(
      `INSERT INTO study_sessions (user_id, session_id, chapter_id, minutes, mode, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        userId,
        session.id || session.sessionId,
        session.chapterId,
        session.minutes,
        session.mode || 'focus',
        session.completedAt || new Date().toISOString(),
      ]
    );
    return res.rows[0];
  } catch (error) {
    console.error('Error saving session:', error);
    throw new Error('Database save failed', { cause: error });
  }
}

export async function getUserProgression(userId: number): Promise<any | null> {
  try {
    const res = await pool.query(
      `SELECT learning_preferences FROM users WHERE id = $1 LIMIT 1`,
      [userId]
    );
    const raw = res.rows[0]?.learning_preferences;
    if (!raw) return null;
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return parsed?._progression ?? null;
  } catch (error) {
    console.error('Error fetching progression from db:', error);
    return null;
  }
}

export async function saveUserProgression(userId: number, progressionData: any): Promise<any | null> {
  try {
    const existingRes = await pool.query(
      `SELECT learning_preferences FROM users WHERE id = $1 LIMIT 1`,
      [userId]
    );
    let prefs: Record<string, any> = {};
    const raw = existingRes.rows[0]?.learning_preferences;
    if (raw) {
      try {
        prefs = typeof raw === 'string' ? JSON.parse(raw) : { ...raw };
      } catch {
        prefs = {};
      }
    }
    prefs._progression = progressionData;
    await pool.query(
      `UPDATE users SET learning_preferences = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(prefs), userId]
    );
    return progressionData;
  } catch (error) {
    console.error('Error saving progression to db:', error);
    return null;
  }
}

export async function getUserSavedResources(userId: number) {
  const hasTable = await checkUserResourcesTable();
  if (!hasTable) return [];
  try {
    const res = await pool.query('SELECT * FROM user_resources WHERE user_id = $1', [userId]);
    return res.rows;
  } catch (error) {
    console.error('Error fetching user resources:', error);
    return [];
  }
}

export async function saveUserResourceItem(userId: number, item: any) {
  const hasTable = await checkUserResourcesTable();
  if (!hasTable) return null;
  try {
    const resId = item.id || item.resourceId;
    const existing = await pool.query(
      'SELECT id FROM user_resources WHERE user_id = $1 AND resource_id = $2 LIMIT 1',
      [userId, resId]
    );
    if (existing.rows.length > 0) {
      await pool.query(
        'UPDATE user_resources SET is_saved = true, updated_at = NOW() WHERE id = $1',
        [existing.rows[0].id]
      );
      return existing.rows[0];
    } else {
      const res = await pool.query(
        `INSERT INTO user_resources (
          user_id, resource_id, subject, chapter_id, chapter_title,
          topic, resource_type, title, provider, url, thumbnail_url,
          duration, duration_minutes, difficulty, language, description,
          recommendation_reason, estimated_minutes, is_saved, is_completed
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        RETURNING *`,
        [
          userId,
          resId,
          item.subject || null,
          item.chapterId || null,
          item.chapterTitle || null,
          item.topic || null,
          item.resourceType || 'other',
          item.title || '',
          item.provider || item.channel || 'Educational Resource',
          item.url || null,
          item.thumbnail || item.thumbnailUrl || null,
          item.duration || null,
          item.durationMinutes || 0,
          item.difficulty || null,
          item.language || null,
          item.description || null,
          item.recommendationReason || item.relevanceLabel || null,
          item.estimatedMinutes || item.durationMinutes || 0,
          true,
          Boolean(item.completed || item.isCompleted),
        ]
      );
      return res.rows[0];
    }
  } catch (error) {
    console.error('Error saving user resource:', error);
    return null;
  }
}

export async function deleteUserResourceItem(userId: number, resourceId: string) {
  const hasTable = await checkUserResourcesTable();
  if (!hasTable) return false;
  try {
    await pool.query('DELETE FROM user_resources WHERE user_id = $1 AND resource_id = $2', [userId, resourceId]);
    return true;
  } catch (error) {
    console.error('Error deleting user resource:', error);
    return false;
  }
}

export async function completeUserResourceItem(userId: number, resourceId: string, isCompleted: boolean) {
  const hasTable = await checkUserResourcesTable();
  if (!hasTable) return false;
  try {
    await pool.query(
      `UPDATE user_resources 
       SET is_completed = $1, completed_at = $2, updated_at = NOW() 
       WHERE user_id = $3 AND resource_id = $4`,
      [isCompleted, isCompleted ? new Date() : null, userId, resourceId]
    );
    return true;
  } catch (error) {
    console.error('Error completing user resource:', error);
    return false;
  }
}
