import { db } from './index.ts';
import { users, plans, completedChapters, studySessions, notes, practiceChecks, userResources } from './schema.ts';
import { eq, and } from 'drizzle-orm';

export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName?: string | null,
  photoUrl?: string | null
) {
  try {
    // 1. Check if user already exists by UID (Supabase user ID)
    const existingByUid = await db.select().from(users).where(eq(users.uid, uid));
    if (existingByUid.length > 0) {
      if (displayName || photoUrl) {
        await db
          .update(users)
          .set({
            email: email || existingByUid[0].email,
            displayName: displayName || existingByUid[0].displayName,
            photoUrl: photoUrl || existingByUid[0].photoUrl,
          })
          .where(eq(users.id, existingByUid[0].id));
      }
      return existingByUid[0];
    }

    // 2. MIGRATION RECONCILIATION: Check if user exists by email from earlier session
    if (email && email.trim()) {
      const existingByEmail = await db
        .select()
        .from(users)
        .where(eq(users.email, email.trim()));
      if (existingByEmail.length > 0) {
        // Preserve all plans, sessions, notes, and progression by linking to new Supabase UID
        await db
          .update(users)
          .set({
            uid,
            displayName: displayName || existingByEmail[0].displayName,
            photoUrl: photoUrl || existingByEmail[0].photoUrl,
          })
          .where(eq(users.id, existingByEmail[0].id));

        const updated = await db
          .select()
          .from(users)
          .where(eq(users.id, existingByEmail[0].id));
        return updated[0];
      }
    }

    // 3. New user registration
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        displayName: displayName || null,
        photoUrl: photoUrl || null,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          displayName: displayName || null,
          photoUrl: photoUrl || null,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Error in getOrCreateUser:', error);
    throw new Error('Database user sync failed', { cause: error });
  }
}

export async function getUserPlan(userId: number) {
  try {
    const records = await db.select().from(plans).where(eq(plans.userId, userId));
    return records[0] || null;
  } catch (error) {
    console.error('Error fetching plan:', error);
    throw new Error('Database query failed', { cause: error });
  }
}

export async function saveUserPlan(userId: number, planData: any) {
  try {
    const existing = await db.select().from(plans).where(eq(plans.userId, userId));
    if (existing.length > 0) {
      const updated = await db
        .update(plans)
        .set({
          board: planData.board,
          goal: planData.goal || '',
          priority: planData.priority || 'backlog recovery',
          confidence: planData.confidence || 'mixed',
          examDate: planData.examDate || '',
          minutesPerDay: planData.minutesPerDay,
          subjects: JSON.stringify(planData.subjects || []),
          chapterIds: JSON.stringify(planData.chapterIds || []),
          plannedChapterIds: JSON.stringify(planData.plannedChapterIds || []),
          days: JSON.stringify(planData.days || []),
          updatedAt: new Date(),
        })
        .where(eq(plans.userId, userId))
        .returning();
      return updated[0];
    } else {
      const inserted = await db
        .insert(plans)
        .values({
          userId,
          board: planData.board,
          goal: planData.goal || '',
          priority: planData.priority || 'backlog recovery',
          confidence: planData.confidence || 'mixed',
          examDate: planData.examDate || '',
          minutesPerDay: planData.minutesPerDay,
          subjects: JSON.stringify(planData.subjects || []),
          chapterIds: JSON.stringify(planData.chapterIds || []),
          plannedChapterIds: JSON.stringify(planData.plannedChapterIds || []),
          days: JSON.stringify(planData.days || []),
        })
        .returning();
      return inserted[0];
    }
  } catch (error) {
    console.error('Error saving plan:', error);
    throw new Error('Database save failed', { cause: error });
  }
}

export async function getUserCompleted(userId: number): Promise<string[]> {
  try {
    const rows = await db
      .select({ chapterId: completedChapters.chapterId })
      .from(completedChapters)
      .where(eq(completedChapters.userId, userId));
    return rows.map((r) => r.chapterId);
  } catch (error) {
    console.error('Error fetching completed chapters:', error);
    return [];
  }
}

export async function setUserCompleted(userId: number, chapterIds: string[]) {
  try {
    await db.delete(completedChapters).where(eq(completedChapters.userId, userId));
    if (chapterIds.length > 0) {
      await db.insert(completedChapters).values(
        chapterIds.map((cid) => ({
          userId,
          chapterId: cid,
        }))
      );
    }
    return chapterIds;
  } catch (error) {
    console.error('Error updating completed chapters:', error);
    throw new Error('Database update failed', { cause: error });
  }
}

export async function getUserSessions(userId: number) {
  try {
    return await db.select().from(studySessions).where(eq(studySessions.userId, userId));
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return [];
  }
}

export async function addUserSession(userId: number, session: any) {
  try {
    const inserted = await db
      .insert(studySessions)
      .values({
        userId,
        sessionId: session.id,
        chapterId: session.chapterId,
        minutes: session.minutes,
        mode: session.mode,
        completedAt: session.completedAt,
      })
      .returning();
    return inserted[0];
  } catch (error) {
    console.error('Error saving session:', error);
    throw new Error('Database save failed', { cause: error });
  }
}

export async function getUserNotes(userId: number): Promise<Record<string, string>> {
  try {
    const rows = await db.select().from(notes).where(eq(notes.userId, userId));
    const result: Record<string, string> = {};
    for (const r of rows) {
      if (!r.chapterId.startsWith('__')) {
        result[r.chapterId] = r.note;
      }
    }
    return result;
  } catch (error) {
    console.error('Error fetching notes:', error);
    return {};
  }
}

export async function getUserProgression(userId: number): Promise<any | null> {
  try {
    const rows = await db
      .select()
      .from(notes)
      .where(and(eq(notes.userId, userId), eq(notes.chapterId, '__user_progression__')));
    if (rows.length > 0 && rows[0].note) {
      return JSON.parse(rows[0].note);
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
    await db
      .delete(notes)
      .where(and(eq(notes.userId, userId), eq(notes.chapterId, '__user_progression__')));
    await db.insert(notes).values({
      userId,
      chapterId: '__user_progression__',
      note: noteText,
    });
    return progressionData;
  } catch (error) {
    console.error('Error saving progression to db:', error);
    return null;
  }
}

export async function setUserNote(userId: number, chapterId: string, noteText: string) {
  try {
    await db.delete(notes).where(and(eq(notes.userId, userId), eq(notes.chapterId, chapterId)));
    if (noteText.trim()) {
      await db.insert(notes).values({
        userId,
        chapterId,
        note: noteText,
      });
    }
  } catch (error) {
    console.error('Error setting note:', error);
    throw new Error('Database update failed', { cause: error });
  }
}

export async function getUserPracticeChecks(userId: number): Promise<Record<string, { theory: boolean; ncert: boolean; pyq: boolean }>> {
  try {
    const rows = await db.select().from(practiceChecks).where(eq(practiceChecks.userId, userId));
    const result: Record<string, { theory: boolean; ncert: boolean; pyq: boolean }> = {};
    for (const r of rows) {
      result[r.chapterId] = {
        theory: r.theory,
        ncert: r.ncert,
        pyq: r.pyq,
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
    await db.delete(practiceChecks).where(and(eq(practiceChecks.userId, userId), eq(practiceChecks.chapterId, chapterId)));
    await db.insert(practiceChecks).values({
      userId,
      chapterId,
      theory: checks.theory ?? false,
      ncert: checks.ncert ?? false,
      pyq: checks.pyq ?? false,
    });
  } catch (error) {
    console.error('Error setting practice checks:', error);
    throw new Error('Database update failed', { cause: error });
  }
}

export async function getUserSavedResources(userId: number) {
  try {
    return await db.select().from(userResources).where(eq(userResources.userId, userId));
  } catch (error) {
    console.error('Error fetching user resources:', error);
    return [];
  }
}

export async function saveUserResourceItem(userId: number, item: any) {
  try {
    const existing = await db
      .select()
      .from(userResources)
      .where(and(eq(userResources.userId, userId), eq(userResources.resourceId, item.id || item.resourceId)));

    if (existing.length > 0) {
      await db
        .update(userResources)
        .set({
          isSaved: true,
          updatedAt: new Date(),
        })
        .where(eq(userResources.id, existing[0].id));
      return existing[0];
    } else {
      const inserted = await db
        .insert(userResources)
        .values({
          userId,
          resourceId: item.id || item.resourceId,
          subject: item.subject || null,
          chapterId: item.chapterId || null,
          chapterTitle: item.chapterTitle || null,
          topic: item.topic || null,
          resourceType: item.resourceType || 'other',
          title: item.title || '',
          provider: item.provider || item.channel || 'Educational Resource',
          url: item.url || null,
          thumbnailUrl: item.thumbnail || item.thumbnailUrl || null,
          duration: item.duration || null,
          durationMinutes: item.durationMinutes || 0,
          difficulty: item.difficulty || null,
          language: item.language || null,
          description: item.description || null,
          recommendationReason: item.recommendationReason || item.relevanceLabel || null,
          estimatedMinutes: item.estimatedMinutes || item.durationMinutes || 0,
          isSaved: true,
          isCompleted: Boolean(item.completed || item.isCompleted),
        })
        .returning();
      return inserted[0];
    }
  } catch (error) {
    console.error('Error saving user resource:', error);
    return null;
  }
}

export async function deleteUserResourceItem(userId: number, resourceId: string) {
  try {
    await db
      .delete(userResources)
      .where(and(eq(userResources.userId, userId), eq(userResources.resourceId, resourceId)));
    return true;
  } catch (error) {
    console.error('Error deleting user resource:', error);
    return false;
  }
}

export async function completeUserResourceItem(userId: number, resourceId: string, isCompleted: boolean) {
  try {
    const existing = await db
      .select()
      .from(userResources)
      .where(and(eq(userResources.userId, userId), eq(userResources.resourceId, resourceId)));

    if (existing.length > 0) {
      await db
        .update(userResources)
        .set({
          isCompleted,
          completedAt: isCompleted ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(userResources.id, existing[0].id));
    }
    return true;
  } catch (error) {
    console.error('Error completing user resource:', error);
    return false;
  }
}

