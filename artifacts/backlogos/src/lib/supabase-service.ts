import { supabase, isSupabaseConfigured, isValidUUID, UUID_REGEX } from './supabase';
import {
  readPlan,
  savePlan,
  readPlanHistory,
  savePlanHistory,
  upsertPlanInHistory,
  switchActivePlanInHistory,
  renamePlanInHistory,
  removePlanFromHistory,
  readCompleted,
  saveCompleted,
  readBacklogItems,
  saveBacklogItems,
  addBacklogItem,
  readStudySessions,
  saveStudySession,
  type StudySession,
} from './storage';
import { type BacklogItem, type BacklogStatus, type BacklogDifficulty, type BacklogConfidence, type ExamRelevance } from './backlog-items';
import { generatePlanId, buildDefaultPlanName, type StudentPlan } from './backlog-data';

export { isValidUUID, UUID_REGEX };

export interface StudentProfileData {
  user_id: string;
  board: string;
  grade?: string;
  stream?: string;
  subjects: string[];
  goal?: string;
  priority?: string;
  confidence?: string;
  exam_date?: string | null;
  minutes_per_day: number;
  workspace_state?: WorkspaceStatePayload;
  created_at?: string;
  updated_at?: string;
}

export interface WorkspaceStatePayload {
  progression?: any;
  dailyPlan?: any;
  revisions?: any[];
  recoveryMode?: boolean;
  missedRecovery?: any;
  restDates?: string[];
  updatedAt?: string;
}

export interface SyncState {
  status: 'synced' | 'syncing' | 'offline' | 'error';
  lastSyncedAt: Date | null;
  errorMessage: string | null;
}

/**
 * Returns the currently authenticated Supabase user ID, or null.
 * Strictly verifies that the returned ID is a genuine RFC4122 UUID.
 * Never falls back to 'default-student' or custom email-derived strings.
 */
export async function getAuthenticatedUserId(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id && isValidUUID(user.id)) return user.id;

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id && isValidUUID(session.user.id)) return session.user.id;

    return null;
  } catch (err) {
    console.warn('[supabase-service] Error getting auth user:', err);
    return null;
  }
}

/**
 * Resolves a valid authenticated Supabase UUID.
 * If explicitUserId is provided AND is a valid UUID, it is used.
 * If explicitUserId is a non-UUID (e.g. 'google-s8452543_gmail_com' or 'default-student'),
 * it is discarded and the genuine authenticated user ID is retrieved from supabase.auth.getUser().
 */
export async function resolveAuthenticatedUserId(explicitUserId?: string | null): Promise<string | null> {
  if (explicitUserId && isValidUUID(explicitUserId)) {
    return explicitUserId.trim();
  }
  return await getAuthenticatedUserId();
}

// ---------------------------------------------------------------------------
// 1. STUDENT PROFILE (student_profiles)
// ---------------------------------------------------------------------------

export async function saveStudentProfileDirect(
  profile: Partial<StudentProfileData>,
  explicitUserId?: string
): Promise<{ success: boolean; error?: string }> {
  const userId = await resolveAuthenticatedUserId(explicitUserId);
  if (!userId) {
    return { success: false, error: 'User is not authenticated with a valid Supabase UUID' };
  }

  // Handle exam_date correctly: send null when no date is selected if the database column permits NULL
  const formattedExamDate =
    profile.exam_date && typeof profile.exam_date === 'string' && profile.exam_date.trim()
      ? profile.exam_date.trim()
      : null;

  const payload = {
    user_id: userId,
    board: profile.board || 'CBSE',
    subjects: profile.subjects || ['Physics', 'Chemistry', 'Mathematics'],
    goal: profile.goal || 'Complete CBSE Backlog Recovery',
    priority: profile.priority || 'backlog recovery',
    confidence: profile.confidence || 'mixed',
    exam_date: formattedExamDate,
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
  const userId = await resolveAuthenticatedUserId(explicitUserId);
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

function isMissingWorkspaceColumnError(error: any): boolean {
  const msg = String(error?.message || '').toLowerCase();
  const code = String(error?.code || '');
  return code === '42703' || code === 'PGRST204' || msg.includes('workspace_state');
}

export async function loadWorkspaceStateDirect(
  explicitUserId?: string
): Promise<WorkspaceStatePayload | null> {
  const userId = await resolveAuthenticatedUserId(explicitUserId);
  if (!userId) return null;

  try {
    const { data, error } = await supabase
      .from('student_profiles')
      .select('workspace_state')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      if (!isMissingWorkspaceColumnError(error)) {
        console.warn('[supabase-service] loadWorkspaceStateDirect notice:', error.message);
      }
      return null;
    }

    if (data && data.workspace_state && typeof data.workspace_state === 'object') {
      return data.workspace_state as WorkspaceStatePayload;
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveWorkspaceStateDirect(
  partialState: WorkspaceStatePayload,
  explicitUserId?: string
): Promise<{ success: boolean }> {
  const userId = await resolveAuthenticatedUserId(explicitUserId);
  if (!userId) return { success: false };

  try {
    const existing = await loadWorkspaceStateDirect(userId);
    const merged: WorkspaceStatePayload = {
      ...(existing || {}),
      ...partialState,
      updatedAt: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('student_profiles')
      .upsert(
        {
          user_id: userId,
          workspace_state: merged,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (error) {
      if (!isMissingWorkspaceColumnError(error)) {
        console.warn('[supabase-service] saveWorkspaceStateDirect notice:', error.message);
      }
      return { success: false };
    }

    return { success: true };
  } catch {
    return { success: false };
  }
}

// ---------------------------------------------------------------------------
// 2. STUDY PLANS (study_plans — Multi-Plan History + Safe Legacy Fallback)
// ---------------------------------------------------------------------------

function mapDbRowToStudentPlan(row: any, fallbackActive = false): StudentPlan {
  const days = Array.isArray(row.days) ? row.days : [];
  const duration = (days.length || 7) as StudentPlan['planDuration'];
  const subjects = Array.isArray(row.subjects) ? row.subjects : ['Physics', 'Chemistry', 'Mathematics'];
  const chapterIds = Array.isArray(row.chapter_ids) ? row.chapter_ids : [];
  const plannedChapterIds = Array.isArray(row.planned_chapter_ids)
    ? row.planned_chapter_ids
    : chapterIds;

  return {
    id: isValidUUID(row.id) ? row.id : generatePlanId(),
    name:
      typeof row.name === 'string' && row.name.trim()
        ? row.name.trim()
        : buildDefaultPlanName({ subjects, planDuration: duration, days }),
    isActive: typeof row.is_active === 'boolean' ? row.is_active : fallbackActive,
    board: row.board || 'CBSE',
    subjects,
    goal: row.goal || 'Complete CBSE Backlog Recovery',
    priority: row.priority || 'backlog recovery',
    confidence: row.confidence || 'mixed',
    examDate: row.exam_date || '',
    minutesPerDay: row.minutes_per_day || 180,
    planDuration: duration,
    chapterIds,
    plannedChapterIds,
    prerequisiteIds: [],
    orderReason: '',
    coverageNote: '',
    days,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
  };
}

function isLegacySchemaError(error: any): boolean {
  const msg = String(error?.message || '').toLowerCase();
  const code = String(error?.code || '');
  return (
    code === '42703' ||
    code === '42P10' ||
    msg.includes('is_active') ||
    msg.includes('column "name"') ||
    msg.includes('column "id"') ||
    msg.includes('no unique or exclusion constraint matching the on conflict')
  );
}

export async function saveStudyPlanDirect(
  plan: StudentPlan,
  explicitUserId?: string
): Promise<{ success: boolean; plan?: StudentPlan; plans?: StudentPlan[]; error?: string }> {
  const normalizedPlan: StudentPlan = {
    ...plan,
    id: plan.id && isValidUUID(plan.id) ? plan.id : generatePlanId(),
    name:
      plan.name && plan.name.trim()
        ? plan.name.trim()
        : buildDefaultPlanName(plan),
    isActive: true,
    createdAt: plan.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const userId = await resolveAuthenticatedUserId(explicitUserId);
  if (!userId) {
    const updatedHistory = upsertPlanInHistory(normalizedPlan, undefined, true);
    return { success: true, plan: normalizedPlan, plans: updatedHistory };
  }

  // Optimistically save into multi-plan local history immediately
  const localHistory = upsertPlanInHistory(normalizedPlan, userId, true);

  const formattedExamDate =
    normalizedPlan.examDate && typeof normalizedPlan.examDate === 'string' && normalizedPlan.examDate.trim()
      ? normalizedPlan.examDate.trim()
      : null;

  const multiPayload = {
    id: normalizedPlan.id,
    user_id: userId,
    name: normalizedPlan.name,
    is_active: true,
    board: normalizedPlan.board || 'CBSE',
    subjects: normalizedPlan.subjects || ['Physics', 'Chemistry', 'Mathematics'],
    goal: normalizedPlan.goal || 'Complete CBSE Backlog Recovery',
    priority: normalizedPlan.priority || 'backlog recovery',
    confidence: normalizedPlan.confidence || 'mixed',
    exam_date: formattedExamDate,
    minutes_per_day: normalizedPlan.minutesPerDay || 180,
    chapter_ids: normalizedPlan.chapterIds || [],
    planned_chapter_ids: normalizedPlan.plannedChapterIds || normalizedPlan.chapterIds || [],
    days: normalizedPlan.days || [],
    updated_at: normalizedPlan.updatedAt,
  };

  try {
    // Mark previous cloud plans inactive before activating this one
    await supabase
      .from('study_plans')
      .update({ is_active: false })
      .eq('user_id', userId)
      .neq('id', normalizedPlan.id!);

    const { error } = await supabase
      .from('study_plans')
      .upsert(multiPayload, { onConflict: 'id' });

    if (error) {
      if (isLegacySchemaError(error)) {
        // Graceful fallback if user hasn't run the multi-plan SQL upgrade yet
        const legacyPayload = {
          user_id: userId,
          board: multiPayload.board,
          subjects: multiPayload.subjects,
          goal: multiPayload.goal,
          priority: multiPayload.priority,
          confidence: multiPayload.confidence,
          exam_date: multiPayload.exam_date,
          minutes_per_day: multiPayload.minutes_per_day,
          chapter_ids: multiPayload.chapter_ids,
          planned_chapter_ids: multiPayload.planned_chapter_ids,
          days: multiPayload.days,
          updated_at: multiPayload.updated_at,
        };
        const { error: legacyErr } = await supabase
          .from('study_plans')
          .upsert(legacyPayload, { onConflict: 'user_id' });

        if (legacyErr) {
          console.error('[supabase-service] legacy saveStudyPlanDirect fallback error:', legacyErr);
          return { success: false, error: legacyErr.message };
        }
        return { success: true, plan: normalizedPlan, plans: localHistory };
      }

      console.error('[supabase-service] saveStudyPlanDirect error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, plan: normalizedPlan, plans: localHistory };
  } catch (err: any) {
    console.error('[supabase-service] saveStudyPlanDirect caught error:', err);
    return { success: false, error: err?.message || 'Database error' };
  }
}

export async function loadAllStudyPlansDirect(
  explicitUserId?: string
): Promise<StudentPlan[]> {
  const userId = await resolveAuthenticatedUserId(explicitUserId);
  if (!userId) {
    return readPlanHistory();
  }

  try {
    const { data, error } = await supabase
      .from('study_plans')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.warn('[supabase-service] loadAllStudyPlansDirect error:', error.message);
      return readPlanHistory(userId);
    }

    const localHistory = readPlanHistory(userId);

    if (Array.isArray(data) && data.length > 0) {
      const dbPlans = data.map((row, idx) => mapDbRowToStudentPlan(row, idx === 0));
      // Preserve any locally created plans not yet flushed in legacy 1-row DB mode
      const dbIds = new Set(dbPlans.map((p) => p.id));
      const extras = data.length === 1 && !('is_active' in data[0])
        ? localHistory.filter((lp) => lp.id && !dbIds.has(lp.id)).map((lp) => ({ ...lp, isActive: false }))
        : [];
      const merged = [...dbPlans, ...extras];
      return savePlanHistory(merged, userId);
    }

    return localHistory;
  } catch (err) {
    console.warn('[supabase-service] loadAllStudyPlansDirect caught error:', err);
    return readPlanHistory(userId);
  }
}

export async function loadActiveStudyPlanDirect(
  explicitUserId?: string
): Promise<StudentPlan | null> {
  const allPlans = await loadAllStudyPlansDirect(explicitUserId);
  if (allPlans.length > 0) {
    return allPlans.find((p) => p.isActive) || allPlans[0];
  }
  return explicitUserId ? readPlan(explicitUserId) : readPlan();
}

export async function setActiveStudyPlanDirect(
  planId: string,
  explicitUserId?: string
): Promise<{ plans: StudentPlan[]; activePlan: StudentPlan | null }> {
  const userId = await resolveAuthenticatedUserId(explicitUserId);
  const localResult = switchActivePlanInHistory(planId, userId || explicitUserId);

  if (!userId || !isValidUUID(planId)) {
    return localResult;
  }

  try {
    const { error: resetErr } = await supabase
      .from('study_plans')
      .update({ is_active: false })
      .eq('user_id', userId);

    if (!resetErr) {
      await supabase
        .from('study_plans')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('id', planId);
    } else if (isLegacySchemaError(resetErr) && localResult.activePlan) {
      await saveStudyPlanDirect(localResult.activePlan, userId);
    }
  } catch (err) {
    console.warn('[supabase-service] setActiveStudyPlanDirect error:', err);
  }

  return localResult;
}

export async function renameStudyPlanDirect(
  planId: string,
  newName: string,
  explicitUserId?: string
): Promise<StudentPlan[]> {
  const userId = await resolveAuthenticatedUserId(explicitUserId);
  const updated = renamePlanInHistory(planId, newName, userId || explicitUserId);

  if (!userId || !isValidUUID(planId)) {
    return updated;
  }

  try {
    await supabase
      .from('study_plans')
      .update({ name: newName.trim(), updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('id', planId);
  } catch (err) {
    console.warn('[supabase-service] renameStudyPlanDirect error:', err);
  }

  return updated;
}

export async function deleteStudyPlanDirect(
  explicitUserId?: string,
  planId?: string
): Promise<{ success: boolean; plans?: StudentPlan[]; nextActive?: StudentPlan | null; error?: string }> {
  const userId = await resolveAuthenticatedUserId(explicitUserId);

  if (planId) {
    const { plans, nextActive } = removePlanFromHistory(planId, userId || explicitUserId);
    if (!userId) {
      return { success: true, plans, nextActive };
    }

    try {
      const { error } = await supabase
        .from('study_plans')
        .delete()
        .eq('user_id', userId)
        .eq('id', planId);

      if (error && !isLegacySchemaError(error)) {
        console.error('[supabase-service] deleteStudyPlanDirect error:', error);
        return { success: false, plans, nextActive, error: error.message };
      }

      if (nextActive?.id && isValidUUID(nextActive.id)) {
        await supabase
          .from('study_plans')
          .update({ is_active: true })
          .eq('user_id', userId)
          .eq('id', nextActive.id);
      }

      return { success: true, plans, nextActive };
    } catch (err: any) {
      console.error('[supabase-service] deleteStudyPlanDirect caught error:', err);
      return { success: false, plans, nextActive, error: err?.message };
    }
  }

  if (!userId) {
    savePlan(null as any);
    savePlanHistory([]);
    return { success: true, plans: [], nextActive: null };
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
    savePlanHistory([], userId);

    return { success: true, plans: [], nextActive: null };
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
  const userId = await resolveAuthenticatedUserId(explicitUserId);
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
        subject: (d.subject || d.subject_id || 'Physics') as any,
        topic: String(d.topic || 'Chapter Topic'),
        estimatedHours: Number(d.estimated_hours || 5),
        hoursSpent: Number(d.hours_spent || 0),
        status: (d.status || 'not_started') as BacklogStatus,
        difficulty: (d.difficulty || 'medium') as BacklogDifficulty,
        confidence: (d.confidence || 'medium') as BacklogConfidence,
        examRelevance: (d.exam_relevance || 'high') as ExamRelevance,
        prerequisites: Array.isArray(d.prerequisites) ? d.prerequisites : [],
        deadline: d.deadline,
        notes: d.notes,
        createdAt: d.created_at || new Date().toISOString(),
        completedAt: d.completed_at || undefined,
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
  const userId = await resolveAuthenticatedUserId(explicitUserId);
  if (!userId) {
    saveBacklogItems(items);
    return { success: true };
  }

  const payload = items.map((item) => ({
    id: item.id,
    user_id: userId,
    chapter_id: item.chapterId,
    subject: item.subject || 'Physics',
    topic: item.topic,
    estimated_hours: item.estimatedHours,
    hours_spent: item.hoursSpent || 0,
    status: item.status || 'not_started',
    difficulty: item.difficulty || 'medium',
    confidence: item.confidence || 'medium',
    exam_relevance: item.examRelevance || 'high',
    prerequisites: Array.isArray(item.prerequisites) ? item.prerequisites : [],
    deadline: item.deadline || null,
    notes: item.notes || null,
    created_at: item.createdAt || new Date().toISOString(),
    completed_at: item.status === 'completed' ? (item.completedAt || new Date().toISOString()) : null,
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
  const userId = await resolveAuthenticatedUserId(explicitUserId);
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
  const userId = await resolveAuthenticatedUserId(explicitUserId);

  const dbUpdates: any = {};
  if (updates.status !== undefined) {
    dbUpdates.status = updates.status;
    dbUpdates.completed_at = updates.status === 'completed' ? new Date().toISOString() : null;
  }
  if (updates.subject !== undefined) dbUpdates.subject = updates.subject;
  if (updates.prerequisites !== undefined) dbUpdates.prerequisites = updates.prerequisites;
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
  const userId = await resolveAuthenticatedUserId(explicitUserId);

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
  const userId = await resolveAuthenticatedUserId(explicitUserId);
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
  const userId = await resolveAuthenticatedUserId(targetUserId);

  if (userId) {
    try {
      if (isCompleted) {
        const { error } = await supabase
          .from('completed_tasks')
          .upsert(
            {
              user_id: userId,
              task_id: taskId,
              completed_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,task_id' }
          );
        if (error) {
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

export async function clearAllCompletedTasksDirect(
  explicitUserId?: string
): Promise<{ success: boolean; error?: string }> {
  const userId = await resolveAuthenticatedUserId(explicitUserId);

  if (userId) {
    try {
      const { error } = await supabase
        .from('completed_tasks')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('[supabase-service] clearAllCompletedTasksDirect error:', error);
        return { success: false, error: error.message };
      }
    } catch (err: any) {
      console.error('[supabase-service] clearAllCompletedTasksDirect caught error:', err);
      return { success: false, error: err?.message };
    }
  }

  saveCompleted([], userId || undefined);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('backlogos-task-completed', { detail: { resetAll: true } }));
    window.dispatchEvent(new CustomEvent('backlogos-plan-updated'));
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
  session: { chapterId: string; minutes: number; mode: string; skipLocalCache?: boolean },
  explicitUserId?: string
): Promise<{ success: boolean; error?: string }> {
  const userId = await resolveAuthenticatedUserId(explicitUserId);

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

  // Update local cache unless explicitly skipped (e.g. during initial local->cloud upload)
  if (!session.skipLocalCache) {
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
  }

  return { success: true };
}

export async function loadStudySessionsDirect(
  explicitUserId?: string
): Promise<StudySession[]> {
  const userId = await resolveAuthenticatedUserId(explicitUserId);
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
// 6. DASHBOARD METRICS CALCULATION (Zero Math.random())
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
  }
) {
  if (!isSupabaseConfigured || !userId || !isValidUUID(userId)) return () => {};

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

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.log(`[supabase-service] Subscribed to Realtime changes for user ${userId}`);
    }
  });

  return () => {
    supabase.removeChannel(channel);
  };
}
