import { supabase, isSupabaseConfigured } from './supabase';
import {
  readPlan,
  savePlan,
  readCompleted,
  saveCompleted,
  readBacklogItems,
  saveBacklogItems,
  addBacklogItem,
  readStudySessions,
  saveStudySession,
  readNotes,
  saveNote,
  type StudySession,
} from './storage';
import { type BacklogItem, type BacklogStatus, type BacklogDifficulty, type BacklogConfidence, type ExamRelevance } from './backlog-items';
import { type StudentPlan } from './backlog-data';

export interface StudentProfileData {
  user_id: string;
  board: string;
  subjects: string[];
  goal?: string;
  priority?: string;
  confidence?: string;
  exam_date?: string;
  minutes_per_day: number;
  created_at?: string;
  updated_at?: string;
}

export interface SyncState {
  status: 'synced' | 'syncing' | 'offline' | 'error';
  lastSyncedAt: Date | null;
  errorMessage: string | null;
}

/**
 * Returns the currently authenticated Supabase user ID, or null.
 * Never falls back to 'default-student' or guest strings for authenticated database writes.
 */
export async function getAuthenticatedUserId(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) return user.id;

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) return session.user.id;

    return null;
  } catch (err) {
    console.warn('[supabase-service] Error getting auth user:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// 1. STUDENT PROFILE (student_profiles)
// ---------------------------------------------------------------------------

export async function saveStudentProfileDirect(
  profile: Partial<StudentProfileData>,
  explicitUserId?: string
): Promise<{ success: boolean; error?: string }> {
  const userId = explicitUserId || (await getAuthenticatedUserId());
  if (!userId) {
    return { success: false, error: 'User is not authenticated with Supabase' };
  }

  const payload = {
    user_id: userId,
    board: profile.board || 'CBSE',
    subjects: profile.subjects || ['Physics', 'Chemistry', 'Mathematics'],
    goal: profile.goal || 'Complete CBSE Backlog Recovery',
    priority: profile.priority || 'backlog recovery',
    confidence: profile.confidence || 'mixed',
    exam_date: profile.exam_date || '',
    minutes_per_day: profile.minutes_per_day || 180,
    updated_at: new Date().toISOString(),
  };

  try {
    const { error } = await supabase
      .from('student_profiles')
      .upsert(payload, { onConflict: 'user_id' });

    if (error) {
      console.error('[supabase-service] saveStudentProfileDirect error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[supabase-service] saveStudentProfileDirect caught error:', err);
    return { success: false, error: err?.message || 'Database error' };
  }
}

export async function loadStudentProfileDirect(
  explicitUserId?: string
): Promise<StudentProfileData | null> {
  const userId = explicitUserId || (await getAuthenticatedUserId());
  if (!userId) return null;

  try {
    const { data, error } = await supabase
      .from('student_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('[supabase-service] loadStudentProfileDirect error:', error.message);
      return null;
    }

    return data as StudentProfileData | null;
  } catch (err) {
    console.warn('[supabase-service] loadStudentProfileDirect caught error:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// 2. STUDY PLANS (study_plans)
// ---------------------------------------------------------------------------

export async function saveStudyPlanDirect(
  plan: StudentPlan,
  explicitUserId?: string
): Promise<{ success: boolean; plan?: StudentPlan; error?: string }> {
  const userId = explicitUserId || (await getAuthenticatedUserId());
  if (!userId) {
    // Offline local fallback
    savePlan(plan);
    return { success: true, plan };
  }

  const payload = {
    user_id: userId,
    board: plan.board || 'CBSE',
    subjects: plan.subjects || ['Physics', 'Chemistry', 'Mathematics'],
    goal: plan.goal || 'Complete CBSE Backlog Recovery',
    priority: plan.priority || 'backlog recovery',
    confidence: plan.confidence || 'mixed',
    exam_date: plan.examDate || '',
    minutes_per_day: plan.minutesPerDay || 180,
    chapter_ids: plan.chapterIds || [],
    planned_chapter_ids: plan.plannedChapterIds || plan.chapterIds || [],
    days: plan.days || [],
    updated_at: new Date().toISOString(),
  };

  try {
    const { error } = await supabase
      .from('study_plans')
      .upsert(payload, { onConflict: 'user_id' });

    if (error) {
      console.error('[supabase-service] saveStudyPlanDirect error:', error);
      return { success: false, error: error.message };
    }

    // Update local cache as mirror
    savePlan(plan, userId);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('backlogos-plan-updated', { detail: plan }));
    }

    return { success: true, plan };
  } catch (err: any) {
    console.error('[supabase-service] saveStudyPlanDirect caught error:', err);
    return { success: false, error: err?.message || 'Database error' };
  }
}

export async function loadActiveStudyPlanDirect(
  explicitUserId?: string
): Promise<StudentPlan | null> {
  const userId = explicitUserId || (await getAuthenticatedUserId());
  if (!userId) {
    // If unauthenticated or offline, use local storage cache
    return readPlan();
  }

  try {
    const { data, error } = await supabase
      .from('study_plans')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('[supabase-service] loadActiveStudyPlanDirect error:', error.message);
      return readPlan(userId);
    }

    if (data) {
      const plan: StudentPlan = {
        board: data.board || 'CBSE',
        subjects: Array.isArray(data.subjects) ? data.subjects : ['Physics', 'Chemistry', 'Mathematics'],
        goal: data.goal || 'Complete CBSE Backlog Recovery',
        priority: data.priority || 'backlog recovery',
        confidence: data.confidence || 'mixed',
        examDate: data.exam_date || '',
        minutesPerDay: data.minutes_per_day || 180,
        planDuration: Array.isArray(data.days) ? data.days.length : 7,
        chapterIds: Array.isArray(data.chapter_ids) ? data.chapter_ids : [],
        plannedChapterIds: Array.isArray(data.planned_chapter_ids)
          ? data.planned_chapter_ids
          : Array.isArray(data.chapter_ids)
          ? data.chapter_ids
          : [],
        days: Array.isArray(data.days) ? data.days : [],
      };

      // Update local storage cache
      savePlan(plan, userId);
      return plan;
    }

    // No record in Supabase yet, check local cache
    return readPlan(userId);
  } catch (err) {
    console.warn('[supabase-service] loadActiveStudyPlanDirect caught error:', err);
    return readPlan(userId);
  }
}

export async function deleteStudyPlanDirect(
  explicitUserId?: string
): Promise<{ success: boolean; error?: string }> {
  const userId = explicitUserId || (await getAuthenticatedUserId());
  if (!userId) {
    savePlan(null as any);
    return { success: true };
  }

  try {
    const { error } = await supabase
      .from('study_plans')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('[supabase-service] deleteStudyPlanDirect error:', error);
      return { success: false, error: error.message };
    }

    savePlan(null as any, userId);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('backlogos-plan-updated', { detail: null }));
    }

    return { success: true };
  } catch (err: any) {
    console.error('[supabase-service] deleteStudyPlanDirect caught error:', err);
    return { success: false, error: err?.message };
  }
}

// ---------------------------------------------------------------------------
// 3. BACKLOG ITEMS (backlog_items)
// ---------------------------------------------------------------------------

export async function loadBacklogItemsDirect(
  explicitUserId?: string
): Promise<BacklogItem[]> {
  const userId = explicitUserId || (await getAuthenticatedUserId());
  if (!userId) {
    return readBacklogItems();
  }

  try {
    const { data, error } = await supabase
      .from('backlog_items')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.warn('[supabase-service] loadBacklogItemsDirect error:', error.message);
      return readBacklogItems(userId);
    }

    if (Array.isArray(data) && data.length > 0) {
      const mapped: BacklogItem[] = data.map((d: any) => ({
        id: String(d.id),
        chapterId: String(d.chapter_id || ''),
        subject: (d.subject_id || 'Physics') as any,
        topic: String(d.topic || 'Chapter Topic'),
        estimatedHours: Number(d.estimated_hours || 5),
        hoursSpent: Number(d.hours_spent || 0),
        status: (d.status || 'not_started') as BacklogStatus,
        difficulty: (d.difficulty || 'medium') as BacklogDifficulty,
        confidence: (d.confidence || 'medium') as BacklogConfidence,
        examRelevance: (d.exam_relevance || 'high') as ExamRelevance,
        deadline: d.deadline,
        notes: d.notes,
        createdAt: d.created_at || new Date().toISOString(),
      }));

      // Cache locally
      saveBacklogItems(mapped, userId);
      return mapped;
    }

    return readBacklogItems(userId);
  } catch (err) {
    console.warn('[supabase-service] loadBacklogItemsDirect caught error:', err);
    return readBacklogItems(userId);
  }
}

export async function saveAllBacklogItemsDirect(
  items: BacklogItem[],
  explicitUserId?: string
): Promise<{ success: boolean; error?: string }> {
  const userId = explicitUserId || (await getAuthenticatedUserId());
  if (!userId) {
    saveBacklogItems(items);
    return { success: true };
  }

  const payload = items.map((item) => ({
    id: item.id,
    user_id: userId,
    chapter_id: item.chapterId,
    topic: item.topic,
    estimated_hours: item.estimatedHours,
    hours_spent: item.hoursSpent || 0,
    status: item.status || 'not_started',
    difficulty: item.difficulty || 'medium',
    confidence: item.confidence || 'medium',
    exam_relevance: item.examRelevance || 'high',
    deadline: item.deadline,
    notes: item.notes,
    created_at: item.createdAt || new Date().toISOString(),
    completed_at: item.status === 'completed' ? new Date().toISOString() : null,
  }));

  try {
    const { error } = await supabase
      .from('backlog_items')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.error('[supabase-service] saveAllBacklogItemsDirect error:', error);
      return { success: false, error: error.message };
    }

    saveBacklogItems(items, userId);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('backlogos-backlog-updated', { detail: items }));
    }

    return { success: true };
  } catch (err: any) {
    console.error('[supabase-service] saveAllBacklogItemsDirect caught error:', err);
    return { success: false, error: err?.message };
  }
}

export async function createBacklogItemDirect(
  item: BacklogItem,
  explicitUserId?: string
): Promise<{ success: boolean; item?: BacklogItem; error?: string }> {
  const userId = explicitUserId || (await getAuthenticatedUserId());
  if (!userId) {
    addBacklogItem(item);
    return { success: true, item };
  }

  const payload = {
    id: item.id || `item-${Date.now()}-${item.chapterId}`,
    user_id: userId,
    chapter_id: item.chapterId,
    subject: item.subject || 'Physics',
    topic: item.topic,
    estimated_hours: item.estimatedHours || 5,
    hours_spent: item.hoursSpent || 0,
    status: item.status || 'not_started',
    difficulty: item.difficulty || 'medium',
    confidence: item.confidence || 'medium',
    exam_relevance: item.examRelevance || 'high',
    prerequisites: item.prerequisites || [],
    deadline: item.deadline || null,
    notes: item.notes || null,
    created_at: item.createdAt || new Date().toISOString(),
    completed_at: item.status === 'completed' ? new Date().toISOString() : null,
  };

  try {
    const { error } = await supabase
      .from('backlog_items')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.error('[supabase-service] createBacklogItemDirect error:', error);
      return { success: false, error: error.message };
    }

    addBacklogItem(item, userId);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('backlogos-backlog-updated'));
    }

    return { success: true, item };
  } catch (err: any) {
    console.error('[supabase-service] createBacklogItemDirect caught error:', err);
    return { success: false, error: err?.message };
  }
}

export async function updateBacklogItemDirect(
  id: string,
  updates: Partial<BacklogItem>,
  explicitUserId?: string
): Promise<{ success: boolean; error?: string }> {
  const userId = explicitUserId || (await getAuthenticatedUserId());

  const dbUpdates: any = {};
  if (updates.status !== undefined) {
    dbUpdates.status = updates.status;
    if (updates.status === 'completed') {
      dbUpdates.completed_at = new Date().toISOString();
    }
  }
  if (updates.estimatedHours !== undefined) dbUpdates.estimated_hours = updates.estimatedHours;
  if (updates.hoursSpent !== undefined) dbUpdates.hours_spent = updates.hoursSpent;
  if (updates.topic !== undefined) dbUpdates.topic = updates.topic;
  if (updates.difficulty !== undefined) dbUpdates.difficulty = updates.difficulty;
  if (updates.confidence !== undefined) dbUpdates.confidence = updates.confidence;
  if (updates.examRelevance !== undefined) dbUpdates.exam_relevance = updates.examRelevance;
  if (updates.deadline !== undefined) dbUpdates.deadline = updates.deadline;
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

  if (userId) {
    try {
      const { error } = await supabase
        .from('backlog_items')
        .update(dbUpdates)
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        console.error('[supabase-service] updateBacklogItemDirect error:', error);
        return { success: false, error: error.message };
      }

      // If status toggled to completed, sync completed_tasks
      if (updates.status === 'completed' && updates.chapterId) {
        await saveCompletedTaskDirect(updates.chapterId, true, userId);
      }
    } catch (err: any) {
      console.error('[supabase-service] updateBacklogItemDirect caught error:', err);
      return { success: false, error: err?.message };
    }
  }

  // Update local cache
  const local = readBacklogItems(userId || undefined);
  const updatedLocal = local.map((i) => (i.id === id ? { ...i, ...updates } : i));
  saveBacklogItems(updatedLocal, userId || undefined);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('backlogos-backlog-updated'));
  }

  return { success: true };
}

export async function deleteBacklogItemDirect(
  id: string,
  explicitUserId?: string
): Promise<{ success: boolean; error?: string }> {
  const userId = explicitUserId || (await getAuthenticatedUserId());

  if (userId) {
    try {
      const { error } = await supabase
        .from('backlog_items')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        console.error('[supabase-service] deleteBacklogItemDirect error:', error);
        return { success: false, error: error.message };
      }
    } catch (err: any) {
      console.error('[supabase-service] deleteBacklogItemDirect caught error:', err);
      return { success: false, error: err?.message };
    }
  }

  const local = readBacklogItems(userId || undefined);
  const updatedLocal = local.filter((i) => i.id !== id);
  saveBacklogItems(updatedLocal, userId || undefined);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('backlogos-backlog-updated'));
  }

  return { success: true };
}

// ---------------------------------------------------------------------------
// 4. COMPLETED TASKS & CHAPTERS (completed_tasks)
// ---------------------------------------------------------------------------

export async function loadCompletedTasksDirect(
  explicitUserId?: string
): Promise<string[]> {
  const userId = explicitUserId || (await getAuthenticatedUserId());
  if (!userId) {
    return readCompleted();
  }

  try {
    const { data, error } = await supabase
      .from('completed_tasks')
      .select('task_id')
      .eq('user_id', userId);

    if (error) {
      console.warn('[supabase-service] loadCompletedTasksDirect error:', error.message);
      return readCompleted(userId);
    }

    if (Array.isArray(data)) {
      const taskIds = data.map((d: any) => String(d.task_id));
      saveCompleted(taskIds, userId);
      return taskIds;
    }

    return readCompleted(userId);
  } catch (err) {
    console.warn('[supabase-service] loadCompletedTasksDirect caught error:', err);
    return readCompleted(userId);
  }
}

export async function saveCompletedTaskDirect(
  taskId: string,
  isCompletedOrUserId: boolean | string = true,
  explicitUserId?: string
): Promise<{ success: boolean; error?: string }> {
  const isCompleted = typeof isCompletedOrUserId === 'boolean' ? isCompletedOrUserId : true;
  const targetUserId = typeof isCompletedOrUserId === 'string' ? isCompletedOrUserId : explicitUserId;
  const userId = targetUserId || (await getAuthenticatedUserId());

  if (userId) {
    try {
      if (isCompleted) {
        const { error } = await supabase
          .from('completed_tasks')
          .insert({
            user_id: userId,
            task_id: taskId,
            completed_at: new Date().toISOString(),
          });
        if (error && !error.message.includes('duplicate')) {
          console.error('[supabase-service] saveCompletedTaskDirect error:', error);
          return { success: false, error: error.message };
        }
      } else {
        const { error } = await supabase
          .from('completed_tasks')
          .delete()
          .eq('user_id', userId)
          .eq('task_id', taskId);
        if (error) {
          console.error('[supabase-service] delete completed_tasks error:', error);
          return { success: false, error: error.message };
        }
      }
    } catch (err: any) {
      console.error('[supabase-service] saveCompletedTaskDirect caught error:', err);
      return { success: false, error: err?.message };
    }
  }

  // Update local cache
  const local = readCompleted(userId || undefined);
  let updated = local;
  if (isCompleted && !local.includes(taskId)) {
    updated = [...local, taskId];
  } else if (!isCompleted && local.includes(taskId)) {
    updated = local.filter((id) => id !== taskId);
  }
  saveCompleted(updated, userId || undefined);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('backlogos-task-completed', { detail: { taskId, isCompleted } }));
  }

  return { success: true };
}

export async function removeCompletedTaskDirect(
  taskId: string,
  explicitUserId?: string
): Promise<{ success: boolean; error?: string }> {
  return saveCompletedTaskDirect(taskId, false, explicitUserId);
}

// ---------------------------------------------------------------------------
// 5. STUDY SESSIONS (study_sessions)
// ---------------------------------------------------------------------------

export async function saveStudySessionDirect(
  session: { chapterId: string; minutes: number; mode: string },
  explicitUserId?: string
): Promise<{ success: boolean; error?: string }> {
  const userId = explicitUserId || (await getAuthenticatedUserId());

  if (userId) {
    try {
      const { error } = await supabase
        .from('study_sessions')
        .insert({
          user_id: userId,
          chapter_id: session.chapterId,
          minutes: session.minutes,
          mode: session.mode,
          completed_at: new Date().toISOString(),
        });

      if (error) {
        console.error('[supabase-service] saveStudySessionDirect error:', error);
        return { success: false, error: error.message };
      }
    } catch (err: any) {
      console.error('[supabase-service] saveStudySessionDirect caught error:', err);
      return { success: false, error: err?.message };
    }
  }

  // Update local cache
  saveStudySession(
    {
      id: `${Date.now()}-${session.chapterId}`,
      chapterId: session.chapterId,
      minutes: session.minutes,
      mode: session.mode as any,
      completedAt: new Date().toISOString(),
    },
    userId || undefined
  );

  return { success: true };
}

export async function loadStudySessionsDirect(
  explicitUserId?: string
): Promise<StudySession[]> {
  const userId = explicitUserId || (await getAuthenticatedUserId());
  if (!userId) {
    return readStudySessions();
  }

  try {
    const { data, error } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.warn('[supabase-service] loadStudySessionsDirect error:', error.message);
      return readStudySessions(userId);
    }

    if (Array.isArray(data)) {
      const sessions: StudySession[] = data.map((d: any) => ({
        id: String(d.id),
        chapterId: d.chapter_id,
        minutes: Number(d.minutes || 0),
        mode: d.mode,
        completedAt: d.completed_at,
      }));
      return sessions;
    }

    return readStudySessions(userId);
  } catch (err) {
    console.warn('[supabase-service] loadStudySessionsDirect caught error:', err);
    return readStudySessions(userId);
  }
}

// ---------------------------------------------------------------------------
// 6. CHAPTER NOTES (chapter_notes)
// ---------------------------------------------------------------------------

export async function saveChapterNoteDirect(
  chapterId: string,
  note: string,
  explicitUserId?: string
): Promise<{ success: boolean; error?: string }> {
  const userId = explicitUserId || (await getAuthenticatedUserId());

  if (userId) {
    try {
      const { error } = await supabase
        .from('chapter_notes')
        .upsert(
          {
            user_id: userId,
            chapter_id: chapterId,
            note: note,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,chapter_id' }
        );

      if (error) {
        console.error('[supabase-service] saveChapterNoteDirect error:', error);
        return { success: false, error: error.message };
      }
    } catch (err: any) {
      console.error('[supabase-service] saveChapterNoteDirect caught error:', err);
      return { success: false, error: err?.message };
    }
  }

  saveNote(chapterId, note, userId || undefined);
  return { success: true };
}

export async function loadChapterNotesDirect(
  explicitUserId?: string
): Promise<Record<string, string>> {
  const userId = explicitUserId || (await getAuthenticatedUserId());
  if (!userId) {
    return readNotes();
  }

  try {
    const { data, error } = await supabase
      .from('chapter_notes')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.warn('[supabase-service] loadChapterNotesDirect error:', error.message);
      return readNotes(userId);
    }

    if (Array.isArray(data)) {
      const notesMap: Record<string, string> = {};
      data.forEach((d: any) => {
        if (d.chapter_id) {
          notesMap[d.chapter_id] = d.note || '';
        }
      });
      return notesMap;
    }

    return readNotes(userId);
  } catch (err) {
    console.warn('[supabase-service] loadChapterNotesDirect caught error:', err);
    return readNotes(userId);
  }
}

// ---------------------------------------------------------------------------
// 7. DASHBOARD METRICS CALCULATION (Zero Math.random())
// ---------------------------------------------------------------------------

export interface DashboardMetrics {
  remainingBacklogHours: number;
  totalBacklogHours: number;
  completedBacklogHours: number;
  remainingChapters: number;
  totalChapters: number;
  completedChapters: number;
  progressPercentage: number;
  urgencyLevel: 'demanding' | 'critical' | 'on_track';
}

export function calculateDashboardMetrics(
  backlogItems: BacklogItem[],
  dailyHoursTarget: number = 3.5
): DashboardMetrics {
  let remainingHours = 0;
  let totalHours = 0;
  let completedHours = 0;
  let remainingCount = 0;
  let completedCount = 0;

  for (const item of backlogItems) {
    const hours = Number(item.estimatedHours) || 0;
    totalHours += hours;

    const st = (item.status || '').toLowerCase().trim();
    const isCompleted = st === 'completed' || st === 'mastered' || st === 'done';

    if (isCompleted) {
      completedHours += hours;
      completedCount += 1;
    } else {
      remainingHours += hours;
      remainingCount += 1;
    }
  }

  const pct =
    totalHours > 0
      ? Math.round((completedHours / totalHours) * 100)
      : backlogItems.length > 0 && completedCount === backlogItems.length
      ? 100
      : 0;

  const urgency =
    remainingHours > 45 ? 'critical' : remainingHours > 20 ? 'demanding' : 'on_track';

  return {
    remainingBacklogHours: Math.round(remainingHours * 10) / 10,
    totalBacklogHours: Math.round(totalHours * 10) / 10,
    completedBacklogHours: Math.round(completedHours * 10) / 10,
    remainingChapters: remainingCount,
    totalChapters: backlogItems.length,
    completedChapters: completedCount,
    progressPercentage: Math.min(100, Math.max(0, pct)),
    urgencyLevel: urgency,
  };
}

// ---------------------------------------------------------------------------
// 8. SUPABASE REALTIME SUBSCRIPTIONS
// ---------------------------------------------------------------------------

export function subscribeToStudentChanges(
  userId: string,
  callbacks: {
    onPlanChange?: () => void;
    onBacklogChange?: () => void;
    onTaskChange?: () => void;
    onSessionChange?: () => void;
    onNotesChange?: () => void;
  }
) {
  if (!isSupabaseConfigured || !userId) return () => {};

  const channel = supabase.channel(`student_sync_${userId}`);

  // 1. study_plans
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'study_plans', filter: `user_id=eq.${userId}` },
    () => callbacks.onPlanChange?.()
  );

  // 2. backlog_items
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'backlog_items', filter: `user_id=eq.${userId}` },
    () => callbacks.onBacklogChange?.()
  );

  // 3. completed_tasks
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'completed_tasks', filter: `user_id=eq.${userId}` },
    () => callbacks.onTaskChange?.()
  );

  // 4. study_sessions
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'study_sessions', filter: `user_id=eq.${userId}` },
    () => callbacks.onSessionChange?.()
  );

  // 5. chapter_notes
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'chapter_notes', filter: `user_id=eq.${userId}` },
    () => callbacks.onNotesChange?.()
  );

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.log(`[supabase-service] Subscribed to Realtime changes for user ${userId}`);
    }
  });

  return () => {
    supabase.removeChannel(channel);
  };
}
