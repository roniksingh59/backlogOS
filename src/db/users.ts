import { db } from './index.ts';
import { users, plans, completedChapters, studySessions, notes, practiceChecks } from './schema.ts';
import { eq, and } from 'drizzle-orm';

export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName?: string | null,
  photoUrl?: string | null
) {
  try {
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
      result[r.chapterId] = r.note;
    }
    return result;
  } catch (error) {
    console.error('Error fetching notes:', error);
    return {};
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
