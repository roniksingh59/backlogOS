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
    photoUrl: row.photo_url,
    phone: row.phone || null,
    grade: row.grade || '11',
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
  };
}

export async function updateUserProfile(
  userId: number,
  updates: { displayName?: string; grade?: string; phone?: string; photoUrl?: string }
) {
  await checkColumns();
  try {
    const setClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (updates.displayName !== undefined) {
      setClauses.push(`display_name = $${idx++}`);
      values.push(updates.displayName);
    }
    if (_hasGradeCol && updates.grade !== undefined) {
      setClauses.push(`grade = $${idx++}`);
      values.push(updates.grade);
    }
    if (_hasPhoneCol && updates.phone !== undefined) {
      setClauses.push(`phone = $${idx++}`);
      values.push(updates.phone);
    }
    if (updates.photoUrl !== undefined) {
      setClauses.push(`photo_url = $${idx++}`);
      values.push(updates.photoUrl);
    }
    if (_hasUpdatedAtCol) {
      setClauses.push('updated_at = NOW()');
    }

    if (setClauses.length === 0) {
      const current = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
      return formatUserRow(current.rows[0]);
    }

    values.push(userId);
    const query = `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`;
    const res = await pool.query(query, values);
    return formatUserRow(res.rows[0]);
  } catch (error) {
    console.error('Error in updateUserProfile:', error);
    throw new Error('Database profile update failed', { cause: error });
  }
}

export async function getUserPlan(userId: number) {
  try {
    const res = await pool.query('SELECT * FROM plans WHERE user_id = $1 LIMIT 1', [userId]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      userId: r.user_id,
      board: r.board,
      goal: r.goal,
      priority: r.priority,
      confidence: r.confidence,
      examDate: r.exam_date,
      minutesPerDay: r.minutes_per_day,
      subjects: r.subjects,
      chapterIds: r.chapter_ids,
      plannedChapterIds: r.planned_chapter_ids,
      days: r.days,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  } catch (error) {
    console.error('Error fetching plan:', error);
    throw new Error('Database query failed', { cause: error });
  }
}

export async function saveUserPlan(userId: number, planData: any) {
  try {
    const existing = await pool.query('SELECT id FROM plans WHERE user_id = $1 LIMIT 1', [userId]);
    const subjects = JSON.stringify(planData.subjects || []);
    const chapterIds = JSON.stringify(planData.chapterIds || []);
    const plannedChapterIds = JSON.stringify(planData.plannedChapterIds || []);
    const days = JSON.stringify(planData.days || []);

    if (existing.rows.length > 0) {
      const updateQuery = `
        UPDATE plans SET
          board = $1,
          goal = $2,
          priority = $3,
          confidence = $4,
          exam_date = $5,
          minutes_per_day = $6,
          subjects = $7,
          chapter_ids = $8,
          planned_chapter_ids = $9,
          days = $10,
          updated_at = NOW()
        WHERE user_id = $11
        RETURNING *
      `;
      const res = await pool.query(updateQuery, [
        planData.board || 'CBSE',
        planData.goal || '',
        planData.priority || 'backlog recovery',
        planData.confidence || 'mixed',
        planData.examDate || '',
        planData.minutesPerDay || 120,
        subjects,
        chapterIds,
        plannedChapterIds,
        days,
        userId,
      ]);
      return res.rows[0];
    } else {
      const insertQuery = `
        INSERT INTO plans (
          user_id, board, goal, priority, confidence, exam_date,
          minutes_per_day, subjects, chapter_ids, planned_chapter_ids, days
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      const res = await pool.query(insertQuery, [
        userId,
        planData.board || 'CBSE',
        planData.goal || '',
        planData.priority || 'backlog recovery',
        planData.confidence || 'mixed',
        planData.examDate || '',
        planData.minutesPerDay || 120,
        subjects,
        chapterIds,
        plannedChapterIds,
        days,
      ]);
      return res.rows[0];
    }
  } catch (error) {
    console.error('Error saving plan:', error);
    throw new Error('Database save failed', { cause: error });
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

export async function getUserNotes(userId: number): Promise<Record<string, string>> {
  try {
    const res = await pool.query(
      `SELECT chapter_id, note FROM notes WHERE user_id = $1 AND NOT chapter_id LIKE '__%'`,
      [userId]
    );
    const result: Record<string, string> = {};
    for (const r of res.rows) {
      result[r.chapter_id] = r.note;
    }
    return result;
  } catch (error) {
    console.error('Error fetching notes:', error);
    return {};
  }
}

export async function getUserProgression(userId: number): Promise<any | null> {
  try {
    const res = await pool.query(
      `SELECT note FROM notes WHERE user_id = $1 AND chapter_id = '__user_progression__' LIMIT 1`,
      [userId]
    );
    if (res.rows.length > 0 && res.rows[0].note) {
      return JSON.parse(res.rows[0].note);
    }
    return null;
  } catch (error) {
    console.error('Error fetching progression from db:', error);
    return null;
  }
}

export async function saveUserProgression(userId: number, progressionData: any): Promise<any | null> {
  try {
    const noteText = JSON.stringify(progressionData);
    await pool.query(
      `DELETE FROM notes WHERE user_id = $1 AND chapter_id = '__user_progression__'`,
      [userId]
    );
    await pool.query(
      `INSERT INTO notes (user_id, chapter_id, note, updated_at) VALUES ($1, '__user_progression__', $2, NOW())`,
      [userId, noteText]
    );
    return progressionData;
  } catch (error) {
    console.error('Error saving progression to db:', error);
    return null;
  }
}

export async function setUserNote(userId: number, chapterId: string, noteText: string) {
  try {
    await pool.query('DELETE FROM notes WHERE user_id = $1 AND chapter_id = $2', [userId, chapterId]);
    if (noteText.trim()) {
      await pool.query(
        'INSERT INTO notes (user_id, chapter_id, note, updated_at) VALUES ($1, $2, $3, NOW())',
        [userId, chapterId, noteText]
      );
    }
  } catch (error) {
    console.error('Error setting note:', error);
    throw new Error('Database update failed', { cause: error });
  }
}

export async function getUserPracticeChecks(
  userId: number
): Promise<Record<string, { theory: boolean; ncert: boolean; pyq: boolean }>> {
  try {
    const res = await pool.query('SELECT chapter_id, theory, ncert, pyq FROM practice_checks WHERE user_id = $1', [userId]);
    const result: Record<string, { theory: boolean; ncert: boolean; pyq: boolean }> = {};
    for (const r of res.rows) {
      result[r.chapter_id] = {
        theory: Boolean(r.theory),
        ncert: Boolean(r.ncert),
        pyq: Boolean(r.pyq),
      };
    }
    return result;
  } catch (error) {
    console.error('Error fetching practice checks:', error);
    return {};
  }
}

export async function setUserPracticeCheck(
  userId: number,
  chapterId: string,
  checks: { theory: boolean; ncert: boolean; pyq: boolean }
) {
  try {
    await pool.query('DELETE FROM practice_checks WHERE user_id = $1 AND chapter_id = $2', [userId, chapterId]);
    await pool.query(
      `INSERT INTO practice_checks (user_id, chapter_id, theory, ncert, pyq, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [userId, chapterId, checks.theory ?? false, checks.ncert ?? false, checks.pyq ?? false]
    );
  } catch (error) {
    console.error('Error setting practice checks:', error);
    throw new Error('Database update failed', { cause: error });
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
