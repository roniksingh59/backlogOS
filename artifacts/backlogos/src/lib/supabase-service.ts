import { supabase, isSupabaseConfigured, isValidUUID, UUID_REGEX } from './supabase';
import {
  readPlan,
  savePlan,
  readPlanHistory,
  savePlanHistory,
  readDeletedPlanIds,
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
  selected_chapter_ids?: string[];
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
  backlogItems?: BacklogItem[];
  studyPlans?: StudentPlan[];
  updatedAt?: string;
}

function normalizeDbConfidence(val?: string | null): 'low' | 'medium' | 'high' | 'mixed' {
  const c = String(val || '').trim().toLowerCase();
  if (c === 'low' || c === 'medium' || c === 'high' || c === 'mixed') return c;
  return 'mixed';
}

function normalizeDbExamDate(val?: string | null): string {
  return val && typeof val === 'string' && val.trim() ? val.trim() : '';
}

function extractMissingColumnFromError(error: any): string | null {
  const msg = String(error?.message || '');
  const pgrstMatch = msg.match(/Could not find the '([^']+)' column/i);
  if (pgrstMatch?.[1]) return pgrstMatch[1];
  const pgMatch = msg.match(/column "([^"]+)"(?: of relation "[^"]+")? does not exist/i);
  if (pgMatch?.[1]) return pgMatch[1];
  return null;
}

function mergeBacklogArrays(primary: BacklogItem[], secondary: BacklogItem[]): BacklogItem[] {
  const byKey = new Map<string, BacklogItem>();
  const rank = (s?: string) => (s === 'completed' ? 3 : s === 'learning' ? 2 : 1);

  for (const raw of [...secondary, ...primary]) {
    if (!raw || (!raw.chapterId && !raw.id)) continue;
    const key = raw.chapterId || raw.id;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, raw);
      continue;
    }
    const status = (rank(raw.status) >= rank(prev.status) ? raw.status : prev.status) as BacklogStatus;
    byKey.set(key, {
      ...prev,
      ...raw,
      status,
      hoursSpent: Math.max(Number(prev.hoursSpent || 0), Number(raw.hoursSpent || 0)),
      completedAt: raw.completedAt || prev.completedAt,
      notes: raw.notes || prev.notes,
      prerequisites:
        Array.isArray(raw.prerequisites) && raw.prerequisites.length > 0
          ? raw.prerequisites
          : prev.prerequisites || [],
    });
  }
  return Array.from(byKey.values());
}

function mergeStudyPlanArrays(primary: StudentPlan[], secondary: StudentPlan[], deletedIds: Set<string>): StudentPlan[] {
  const byId = new Map<string, StudentPlan>();
  for (const plan of [...secondary, ...primary]) {
    if (!plan || !plan.id || deletedIds.has(plan.id)) continue;
    const prev = byId.get(plan.id);
    if (!prev) {
      byId.set(plan.id, plan);
      continue;
    }
    const prevTime = new Date(prev.updatedAt || prev.createdAt || 0).getTime();
    const nextTime = new Date(plan.updatedAt || plan.createdAt || 0).getTime();
    byId.set(plan.id, nextTime >= prevTime ? { ...prev, ...plan } : { ...plan, ...prev });
  }
  const merged = Array.from(byId.values()).sort((a, b) => {
    if (Boolean(a.isActive) !== Boolean(b.isActive)) return a.isActive ? -1 : 1;
    const tA = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const tB = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return tB - tA;
  });
  if (merged.length > 0 && !merged.some((p) => p.isActive)) {
    merged[0] = { ...merged[0], isActive: true };
  }
  return merged;
}

export interface SyncState {
  status: 'synced' | 'syncing' | 'offline' | 'error';
  lastSyncedAt: Date | null;
  errorMessage: string | null;
}

type PendingSyncOp =
  | { id: string; type: 'completed_task'; taskId: string; isCompleted: boolean; createdAt: string }
  | {
      id: string;
      type: 'study_session';
      chapterId: string;
      minutes: number;
      mode: string;
      completedAt: string;
      createdAt: string;
    }
  | {
      id: string;
      type: 'backlog_update';
      itemId: string;
      updates: Partial<BacklogItem>;
      createdAt: string;
    };

function getPendingSyncKey(userId: string): string {
  return `backlogos_pending_sync_v1_${userId}`;
}

function readPendingSyncOps(userId: string): PendingSyncOp[] {
  if (typeof window === 'undefined' || !userId) return [];
  try {
    const raw = window.localStorage.getItem(getPendingSyncKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writePendingSyncOps(userId: string, ops: PendingSyncOp[]): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    if (ops.length === 0) {
      window.localStorage.removeItem(getPendingSyncKey(userId));
    } else {
      window.localStorage.setItem(getPendingSyncKey(userId), JSON.stringify(ops.slice(-100)));
    }
  } catch {
    // ignore storage errors
  }
}

function enqueuePendingSyncOp(userId: string, op: PendingSyncOp): void {
  const existing = readPendingSyncOps(userId);
  // Coalesce repeated toggles of the same task or updates to the same backlog item
  const filtered = existing.filter((item) => {
    if (op.type === 'completed_task' && item.type === 'completed_task') {
      return item.taskId !== op.taskId;
    }
    return true;
  });
  writePendingSyncOps(userId, [...filtered, op]);
}

export async function flushPendingSyncQueue(explicitUserId?: string): Promise<{ flushed: number; remaining: number }> {
  const userId = await resolveAuthenticatedUserId(explicitUserId);
  if (!userId) return { flushed: 0, remaining: 0 };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { flushed: 0, remaining: readPendingSyncOps(userId).length };
  }

  const queue = readPendingSyncOps(userId);
  if (queue.length === 0) return { flushed: 0, remaining: 0 };

  const remaining: PendingSyncOp[] = [];
  let flushed = 0;

  for (const op of queue) {
    try {
      if (op.type === 'completed_task') {
        if (op.isCompleted) {
          const { error } = await supabase
            .from('completed_tasks')
            .upsert(
              { user_id: userId, task_id: op.taskId, completed_at: op.createdAt },
              { onConflict: 'user_id,task_id' }
            );
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('completed_tasks')
            .delete()
            .eq('user_id', userId)
            .eq('task_id', op.taskId);
          if (error) throw error;
        }
        flushed += 1;
      } else if (op.type === 'study_session') {
        const { error } = await supabase
          .from('study_sessions')
          .insert({
            user_id: userId,
            chapter_id: op.chapterId,
            minutes: op.minutes,
            mode: op.mode || 'focus',
            completed_at: op.completedAt,
          });
        if (error) throw error;
        flushed += 1;
      } else if (op.type === 'backlog_update') {
        const dbUpdates: Record<string, any> = {};
        const u = op.updates;
        if (u.status !== undefined) {
          dbUpdates.status = u.status;
          dbUpdates.completed_at = u.status === 'completed' ? op.createdAt : null;
        }
        if (u.hoursSpent !== undefined) dbUpdates.hours_spent = u.hoursSpent;
        if (u.estimatedHours !== undefined) dbUpdates.estimated_hours = u.estimatedHours;
        if (u.notes !== undefined) dbUpdates.notes = u.notes;
        if (u.confidence !== undefined) dbUpdates.confidence = u.confidence;
        if (Object.keys(dbUpdates).length > 0) {
          const scopedId = toDbBacklogItemId(op.itemId, userId);
          const { error } = await supabase
            .from('backlog_items')
            .update(dbUpdates)
            .in('id', [scopedId, op.itemId])
            .eq('user_id', userId);
          if (error) throw error;
        }
        flushed += 1;
      }
    } catch {
      remaining.push(op);
    }
  }

  writePendingSyncOps(userId, remaining);
  return { flushed, remaining: remaining.length };
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

  const activePlan = readPlan(userId);
  const formattedExamDate = normalizeDbExamDate(profile.exam_date);

  const payload: Record<string, any> = {
    user_id: userId,
    board: profile.board || activePlan?.board || 'CBSE',
    subjects:
      profile.subjects && profile.subjects.length > 0
        ? profile.subjects
        : activePlan?.subjects || ['Physics', 'Chemistry', 'Mathematics'],
    selected_chapter_ids: Array.isArray(profile.selected_chapter_ids)
      ? profile.selected_chapter_ids
      : activePlan?.chapterIds || [],
    goal: profile.goal || activePlan?.goal || 'Complete CBSE Backlog Recovery',
    priority: profile.priority || activePlan?.priority || 'backlog recovery',
    confidence: normalizeDbConfidence(profile.confidence || activePlan?.confidence),
    exam_date: formattedExamDate,
    minutes_per_day: Math.max(30, Number(profile.minutes_per_day || activePlan?.minutesPerDay) || 180),
    updated_at: new Date().toISOString(),
  };
  if (profile.grade) payload.grade = profile.grade;
  if (profile.stream) payload.stream = profile.stream;

  try {
    let workingPayload: Record<string, any> = { ...payload };
    let error: any = null;

    for (let attempt = 0; attempt < 5; attempt++) {
      const res = await supabase
        .from('student_profiles')
        .upsert(workingPayload, { onConflict: 'user_id' });
      error = res.error;
      if (!error) break;

      if (error.code === 'PGRST204' || error.code === '42703') {
        const missingCol = extractMissingColumnFromError(error);
        if (missingCol && missingCol in workingPayload) {
          delete workingPayload[missingCol];
          continue;
        }
        if ('grade' in workingPayload || 'stream' in workingPayload || 'selected_chapter_ids' in workingPayload) {
          delete workingPayload.grade;
          delete workingPayload.stream;
          delete workingPayload.selected_chapter_ids;
          continue;
        }
      }
      break;
    }

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
    const { data: existingRow, error: readErr } = await supabase
      .from('student_profiles')
      .select('user_id, workspace_state')
      .eq('user_id', userId)
      .maybeSingle();

    if (readErr) {
      if (!isMissingWorkspaceColumnError(readErr)) {
        console.warn('[supabase-service] saveWorkspaceStateDirect read notice:', readErr.message);
      }
      return { success: false };
    }

    const existing =
      existingRow?.workspace_state && typeof existingRow.workspace_state === 'object'
        ? (existingRow.workspace_state as WorkspaceStatePayload)
        : null;

    const merged: WorkspaceStatePayload = {
      ...(existing || {}),
      ...partialState,
      updatedAt: new Date().toISOString(),
    };

    const existingProg = existing?.progression;
    const incomingProg = partialState.progression;
    if (
      existingProg &&
      typeof existingProg.xp === 'number' &&
      existingProg.xp > 0 &&
      incomingProg &&
      typeof incomingProg.xp === 'number' &&
      incomingProg.xp < existingProg.xp
    ) {
      merged.progression = existingProg;
    }

    if (existingRow) {
      const { error: updateErr } = await supabase
        .from('student_profiles')
        .update({
          workspace_state: merged,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateErr) {
        if (!isMissingWorkspaceColumnError(updateErr)) {
          console.warn('[supabase-service] saveWorkspaceStateDirect update notice:', updateErr.message);
        }
        return { success: false };
      }
      return { success: true };
    }

    // Row does not exist yet: supply all non-null default profile columns required by live DB constraints
    const activePlan = readPlan(userId);
    const fullInsertPayload: Record<string, any> = {
      user_id: userId,
      board: activePlan?.board || 'CBSE',
      subjects: activePlan?.subjects || ['Physics', 'Chemistry', 'Mathematics'],
      selected_chapter_ids: activePlan?.chapterIds || [],
      goal: activePlan?.goal || 'Complete CBSE Backlog Recovery',
      priority: activePlan?.priority || 'backlog recovery',
      confidence: normalizeDbConfidence(activePlan?.confidence),
      exam_date: normalizeDbExamDate(activePlan?.examDate),
      minutes_per_day: Math.max(30, Number(activePlan?.minutesPerDay) || 180),
      workspace_state: merged,
      updated_at: new Date().toISOString(),
    };

    let upsertErr: any = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      const res = await supabase
        .from('student_profiles')
        .upsert(fullInsertPayload, { onConflict: 'user_id' });
      upsertErr = res.error;
      if (!upsertErr) break;
      if (upsertErr.code === 'PGRST204' || upsertErr.code === '42703') {
        const missingCol = extractMissingColumnFromError(upsertErr);
        if (missingCol && missingCol !== 'workspace_state' && missingCol in fullInsertPayload) {
          delete fullInsertPayload[missingCol];
          continue;
        }
      }
      break;
    }

    if (upsertErr) {
      if (!isMissingWorkspaceColumnError(upsertErr)) {
        console.warn('[supabase-service] saveWorkspaceStateDirect insert notice:', upsertErr.message);
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

let legacyMultiPlanSchemaDetected = false;
export function isLegacyMultiPlanSchemaDetected(): boolean {
  return legacyMultiPlanSchemaDetected;
}

function mapDbRowToStudentPlan(row: any, fallbackActive = false): StudentPlan {
  const days = Array.isArray(row.days) ? row.days : [];
  const duration = (days.length || 7) as StudentPlan['planDuration'];
  const subjects = Array.isArray(row.subjects) ? row.subjects : ['Physics', 'Chemistry', 'Mathematics'];
  const chapterIds = Array.isArray(row.chapter_ids) ? row.chapter_ids : [];
  const plannedChapterIds = Array.isArray(row.planned_chapter_ids)
    ? row.planned_chapter_ids
    : chapterIds;

  return {
    id: isValidUUID(row.id) ? row.id : `legacy-${row.user_id || 'plan'}`,
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
    prerequisiteIds: Array.isArray(row.prerequisite_ids) ? row.prerequisite_ids : [],
    orderReason: typeof row.order_reason === 'string' ? row.order_reason : '',
    coverageNote: typeof row.coverage_note === 'string' ? row.coverage_note : '',
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
    code === 'PGRST204' ||
    code === '23505' ||
    msg.includes('is_active') ||
    msg.includes('column "name"') ||
    msg.includes("'name'") ||
    msg.includes('column "id"') ||
    msg.includes("'id'") ||
    msg.includes('unique constraint') ||
    msg.includes('no unique or exclusion constraint matching the on conflict')
  );
}

export async function saveStudyPlanDirect(
  plan: StudentPlan,
  explicitUserId?: string,
  options?: { preserveActiveFlag?: boolean }
): Promise<{ success: boolean; plan?: StudentPlan; plans?: StudentPlan[]; legacyFallback?: boolean; error?: string }> {
  const shouldActivate = options?.preserveActiveFlag ? Boolean(plan.isActive) : true;
  const normalizedPlan: StudentPlan = {
    ...plan,
    id: plan.id && isValidUUID(plan.id) ? plan.id : generatePlanId(),
    name:
      plan.name && plan.name.trim()
        ? plan.name.trim()
        : buildDefaultPlanName(plan),
    isActive: shouldActivate,
    createdAt: plan.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const userId = await resolveAuthenticatedUserId(explicitUserId);
  if (!userId) {
    const updatedHistory = upsertPlanInHistory(normalizedPlan, undefined, shouldActivate);
    return { success: true, plan: normalizedPlan, plans: updatedHistory };
  }

  // Optimistically save into multi-plan local history immediately
  const localHistory = upsertPlanInHistory(normalizedPlan, userId, shouldActivate);

  // Mirror full study plans list to student_profiles.workspace_state so multi-device sync is guaranteed
  const wsPromise = saveWorkspaceStateDirect({ studyPlans: localHistory }, userId);

  const formattedExamDate = normalizeDbExamDate(normalizedPlan.examDate);

  const multiPayload: Record<string, any> = {
    id: normalizedPlan.id,
    user_id: userId,
    name: normalizedPlan.name,
    is_active: shouldActivate,
    board: normalizedPlan.board || 'CBSE',
    subjects: normalizedPlan.subjects || ['Physics', 'Chemistry', 'Mathematics'],
    goal: normalizedPlan.goal || 'Complete CBSE Backlog Recovery',
    priority: normalizedPlan.priority || 'backlog recovery',
    confidence: normalizeDbConfidence(normalizedPlan.confidence),
    exam_date: formattedExamDate,
    minutes_per_day: Math.max(30, Number(normalizedPlan.minutesPerDay) || 180),
    chapter_ids: normalizedPlan.chapterIds || [],
    planned_chapter_ids: normalizedPlan.plannedChapterIds || normalizedPlan.chapterIds || [],
    prerequisite_ids: normalizedPlan.prerequisiteIds || [],
    order_reason: normalizedPlan.orderReason || '',
    coverage_note: normalizedPlan.coverageNote || '',
    days: normalizedPlan.days || [],
    updated_at: normalizedPlan.updatedAt,
  };

  try {
    if (shouldActivate) {
      await supabase
        .from('study_plans')
        .update({ is_active: false })
        .eq('user_id', userId)
        .neq('id', normalizedPlan.id!);
    }

    let workingMulti = { ...multiPayload };
    let error: any = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      const res = await supabase
        .from('study_plans')
        .upsert(workingMulti, { onConflict: 'id' });
      error = res.error;
      if (!error) break;
      const missingCol = extractMissingColumnFromError(error);
      if (
        (error.code === 'PGRST204' || error.code === '42703') &&
        missingCol &&
        ['prerequisite_ids', 'order_reason', 'coverage_note'].includes(missingCol)
      ) {
        delete workingMulti[missingCol];
        continue;
      }
      break;
    }

    const wsRes = await wsPromise;

    if (error) {
      if (isLegacySchemaError(error)) {
        legacyMultiPlanSchemaDetected = true;
        if (!shouldActivate) {
          return { success: true, plan: normalizedPlan, plans: localHistory, legacyFallback: true };
        }

        const legacyPayload: Record<string, any> = {
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
          prerequisite_ids: multiPayload.prerequisite_ids,
          order_reason: multiPayload.order_reason,
          coverage_note: multiPayload.coverage_note,
          days: multiPayload.days,
          updated_at: multiPayload.updated_at,
        };

        let legacyErr: any = null;
        for (let attempt = 0; attempt < 4; attempt++) {
          const res = await supabase
            .from('study_plans')
            .upsert(legacyPayload, { onConflict: 'user_id' });
          legacyErr = res.error;
          if (!legacyErr) break;
          const missingCol = extractMissingColumnFromError(legacyErr);
          if (
            (legacyErr.code === 'PGRST204' || legacyErr.code === '42703') &&
            missingCol &&
            ['prerequisite_ids', 'order_reason', 'coverage_note'].includes(missingCol)
          ) {
            delete legacyPayload[missingCol];
            continue;
          }
          break;
        }

        if (legacyErr && !wsRes.success) {
          console.error('[supabase-service] legacy saveStudyPlanDirect fallback error:', legacyErr);
          return { success: false, legacyFallback: true, error: legacyErr.message };
        }
        return { success: true, plan: normalizedPlan, plans: localHistory, legacyFallback: true };
      }

      if (wsRes.success) {
        console.warn('[supabase-service] study_plans notice (mirrored via workspace_state):', error.message);
        return { success: true, plan: normalizedPlan, plans: localHistory };
      }

      console.error('[supabase-service] saveStudyPlanDirect error:', error);
      return { success: false, error: error.message };
    }

    legacyMultiPlanSchemaDetected = false;
    return { success: true, plan: normalizedPlan, plans: localHistory };
  } catch (err: any) {
    const wsRes = await wsPromise.catch(() => ({ success: false }));
    if (wsRes.success) {
      return { success: true, plan: normalizedPlan, plans: localHistory };
    }
    console.error('[supabase-service] saveStudyPlanDirect caught error:', err);
    return { success: false, error: err?.message || 'Database error' };
  }
}

export async function fetchCloudStudyPlansRaw(
  explicitUserId?: string
): Promise<{ plans: StudentPlan[]; fromCloud: boolean; error?: string }> {
  const userId = await resolveAuthenticatedUserId(explicitUserId);
  if (!userId) return { plans: [], fromCloud: false };

  try {
    const [{ data, error }, ws] = await Promise.all([
      supabase
        .from('study_plans')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false }),
      loadWorkspaceStateDirect(userId),
    ]);

    const deletedSet = new Set(readDeletedPlanIds(userId));
    const dbPlans =
      !error && Array.isArray(data)
        ? data
            .map((row, idx) => mapDbRowToStudentPlan(row, idx === 0))
            .filter((p) => !p.id || !deletedSet.has(p.id))
        : [];
    const wsPlans = Array.isArray(ws?.studyPlans)
      ? ws!.studyPlans.filter((p) => p && (!p.id || !deletedSet.has(p.id)))
      : [];

    if (error && wsPlans.length === 0) {
      console.warn('[supabase-service] fetchCloudStudyPlansRaw error:', error.message);
      return { plans: [], fromCloud: false, error: error.message };
    }

    const merged = mergeStudyPlanArrays(dbPlans, wsPlans, deletedSet);
    return { plans: merged, fromCloud: true };
  } catch (err: any) {
    console.warn('[supabase-service] fetchCloudStudyPlansRaw caught error:', err);
    return { plans: [], fromCloud: false, error: err?.message };
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
    const { plans: cloudPlans, fromCloud } = await fetchCloudStudyPlansRaw(userId);
    const localHistory = readPlanHistory(userId);
    if (!fromCloud) return localHistory;

    const localActive = localHistory.find((p) => p.isActive) || localHistory[0] || null;
    const deletedSet = new Set(readDeletedPlanIds(userId));

    if (cloudPlans.length > 0) {
      const dbPlans = cloudPlans.map((dp) => {
        if (dp.id?.startsWith('legacy-') && localHistory.length > 0) {
          const sig = `${(dp.subjects || []).join('|')}::${(dp.chapterIds || []).join('|')}`;
          const matchedLocal = localHistory.find(
            (lp) => `${(lp.subjects || []).join('|')}::${(lp.chapterIds || []).join('|')}` === sig
          );
          if (matchedLocal?.id) {
            return { ...dp, id: matchedLocal.id, name: matchedLocal.name || dp.name };
          }
        }
        return dp;
      });

      const dbIds = new Set(dbPlans.map((p) => p.id));
      const extras = localHistory.filter((lp) => lp.id && !dbIds.has(lp.id) && !deletedSet.has(lp.id));

      const localActiveInExtras = localActive && extras.some((e) => e.id === localActive.id);
      const dbHasActive = dbPlans.some((p) => p.isActive);

      let merged: StudentPlan[];
      if (localActiveInExtras && (!dbHasActive || legacyMultiPlanSchemaDetected || dbPlans.length <= 1)) {
        merged = [
          ...dbPlans.map((dp) => ({ ...dp, isActive: false })),
          ...extras.map((ep) => ({ ...ep, isActive: ep.id === localActive?.id })),
        ];
      } else {
        const effectiveActiveId =
          (dbPlans.find((p) => p.isActive) || (localActive && dbIds.has(localActive.id) ? localActive : dbPlans[0]))?.id;
        merged = [
          ...dbPlans.map((dp) => ({ ...dp, isActive: dp.id === effectiveActiveId })),
          ...extras.map((ep) => ({ ...ep, isActive: false })),
        ];
      }

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

  if (!userId) {
    return localResult;
  }

  saveWorkspaceStateDirect({ studyPlans: localResult.plans }, userId).catch(() => {});

  if (!isValidUUID(planId)) {
    return localResult;
  }

  try {
    const { data: activatedRows, error: activateErr } = await supabase
      .from('study_plans')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('id', planId)
      .select('id');

    if (activateErr) {
      if (isLegacySchemaError(activateErr) && localResult.activePlan) {
        legacyMultiPlanSchemaDetected = true;
        await saveStudyPlanDirect(localResult.activePlan, userId);
      }
      return localResult;
    }

    if (!activatedRows || activatedRows.length === 0) {
      if (localResult.activePlan) {
        await saveStudyPlanDirect(localResult.activePlan, userId);
      }
      return localResult;
    }

    await supabase
      .from('study_plans')
      .update({ is_active: false })
      .eq('user_id', userId)
      .neq('id', planId);
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

  if (!userId) {
    return updated;
  }

  saveWorkspaceStateDirect({ studyPlans: updated }, userId).catch(() => {});

  if (!isValidUUID(planId)) {
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

    await saveWorkspaceStateDirect({ studyPlans: plans }, userId).catch(() => {});

    try {
      let deleteErr: any = null;
      if (isValidUUID(planId)) {
        const { error } = await supabase
          .from('study_plans')
          .delete()
          .eq('user_id', userId)
          .eq('id', planId);
        deleteErr = error;
      }

      if (deleteErr && isLegacySchemaError(deleteErr)) {
        legacyMultiPlanSchemaDetected = true;
        if (plans.length === 0) {
          await supabase.from('study_plans').delete().eq('user_id', userId);
        } else if (nextActive) {
          await saveStudyPlanDirect(nextActive, userId);
        }
        return { success: true, plans, nextActive };
      }

      if (deleteErr) {
        console.warn('[supabase-service] deleteStudyPlanDirect notice:', deleteErr.message);
        return { success: true, plans, nextActive };
      }

      if (nextActive?.id && isValidUUID(nextActive.id)) {
        const { data: updatedNext } = await supabase
          .from('study_plans')
          .update({ is_active: true })
          .eq('user_id', userId)
          .eq('id', nextActive.id)
          .select('id');
        if (!updatedNext || updatedNext.length === 0) {
          await saveStudyPlanDirect(nextActive, userId);
        }
      }

      return { success: true, plans, nextActive };
    } catch (err: any) {
      console.warn('[supabase-service] deleteStudyPlanDirect caught notice:', err?.message);
      return { success: true, plans, nextActive };
    }
  }

  if (!userId) {
    savePlan(null as any);
    savePlanHistory([]);
    return { success: true, plans: [], nextActive: null };
  }

  try {
    await saveWorkspaceStateDirect({ studyPlans: [] }, userId).catch(() => {});
    const { error } = await supabase
      .from('study_plans')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.warn('[supabase-service] deleteStudyPlanDirect notice:', error.message);
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
// 3. BACKLOG ITEMS (backlog_items + workspace_state.backlogItems mirror)
// ---------------------------------------------------------------------------

export function toDbBacklogItemId(id: string, userId?: string | null): string {
  const cleanId = String(id || '').trim();
  if (!userId || !isValidUUID(userId)) return cleanId;
  const prefix = `${userId}:`;
  return cleanId.startsWith(prefix) ? cleanId : `${prefix}${cleanId}`;
}

export function fromDbBacklogItemId(dbId: string, userId?: string | null): string {
  const cleanId = String(dbId || '').trim();
  if (!userId) return cleanId;
  const prefix = `${userId}:`;
  return cleanId.startsWith(prefix) ? cleanId.slice(prefix.length) : cleanId;
}

function mapDbRowToBacklogItem(d: any, userId?: string): BacklogItem {
  return {
    id: fromDbBacklogItemId(String(d.id), userId),
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
  };
}

export async function fetchCloudBacklogItemsRaw(
  explicitUserId?: string
): Promise<{ items: BacklogItem[]; fromCloud: boolean; error?: string }> {
  const userId = await resolveAuthenticatedUserId(explicitUserId);
  if (!userId) return { items: [], fromCloud: false };

  try {
    const [{ data, error }, ws] = await Promise.all([
      supabase
        .from('backlog_items')
        .select('*')
        .eq('user_id', userId),
      loadWorkspaceStateDirect(userId),
    ]);

    const dbItems = !error && Array.isArray(data) ? data.map((d) => mapDbRowToBacklogItem(d, userId)) : [];
    const wsItems = Array.isArray(ws?.backlogItems) ? ws!.backlogItems : [];

    if (error && wsItems.length === 0) {
      console.warn('[supabase-service] fetchCloudBacklogItemsRaw error:', error.message);
      return { items: [], fromCloud: false, error: error.message };
    }

    const merged = mergeBacklogArrays(dbItems, wsItems);
    return { items: merged, fromCloud: true };
  } catch (err: any) {
    console.warn('[supabase-service] fetchCloudBacklogItemsRaw caught error:', err);
    return { items: [], fromCloud: false, error: err?.message };
  }
}

export async function loadBacklogItemsDirect(
  explicitUserId?: string
): Promise<BacklogItem[]> {
  const userId = await resolveAuthenticatedUserId(explicitUserId);
  if (!userId) {
    return readBacklogItems();
  }

  try {
    const { items: cloudItems, fromCloud } = await fetchCloudBacklogItemsRaw(userId);
    if (fromCloud && cloudItems.length > 0) {
      saveBacklogItems(cloudItems, userId, { skipProgression: true });
      return cloudItems;
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
  if (!Array.isArray(items) || items.length === 0) {
    return { success: true };
  }

  // Merge incoming list with any existing local/cloud items so partial sync writes never drop items
  const existingLocal = readBacklogItems(userId);
  const fullList = mergeBacklogArrays(items, existingLocal);

  saveBacklogItems(fullList, userId, { skipProgression: true });
  const wsRes = await saveWorkspaceStateDirect({ backlogItems: fullList }, userId);

  const deduped = new Map<string, BacklogItem>();
  for (const item of fullList) {
    const scopedId = toDbBacklogItemId(item.id || `item-${item.chapterId}`, userId);
    deduped.set(scopedId, item);
  }

  const payload = Array.from(deduped.entries()).map(([scopedId, item]) => ({
    id: scopedId,
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
      if (wsRes.success) {
        // FK constraint (23503) or legacy schema safely backed up in workspace_state
        if (error.code !== '23503') {
          console.warn('[supabase-service] backlog_items notice (synced via workspace_state):', error.message);
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('backlogos-backlog-updated', { detail: fullList }));
        }
        return { success: true };
      }
      console.error('[supabase-service] saveAllBacklogItemsDirect error:', error);
      return { success: false, error: error.message };
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('backlogos-backlog-updated', { detail: fullList }));
    }

    return { success: true };
  } catch (err: any) {
    if (wsRes.success) {
      return { success: true };
    }
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

  const updatedLocal = addBacklogItem(item, userId);
  const wsRes = await saveWorkspaceStateDirect({ backlogItems: updatedLocal }, userId);

  const rawId = item.id || `item-${Date.now()}-${item.chapterId}`;
  const scopedId = toDbBacklogItemId(rawId, userId);

  const payload = {
    id: scopedId,
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

    if (error && !wsRes.success) {
      console.error('[supabase-service] createBacklogItemDirect error:', error);
      return { success: false, error: error.message };
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('backlogos-backlog-updated'));
    }

    return { success: true, item };
  } catch (err: any) {
    if (wsRes.success) {
      return { success: true, item };
    }
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

  const local = readBacklogItems(userId || undefined);
  const updatedLocal = local.map((i) =>
    i.id === id
      ? {
          ...i,
          ...updates,
          completedAt:
            updates.status === 'completed'
              ? updates.completedAt || i.completedAt || new Date().toISOString()
              : i.completedAt,
        }
      : i
  );
  saveBacklogItems(updatedLocal, userId || undefined);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('backlogos-backlog-updated'));
  }

  if (userId) {
    const queueFallback = () => {
      enqueuePendingSyncOp(userId, {
        id: `${Date.now()}-${id}`,
        type: 'backlog_update',
        itemId: id,
        updates,
        createdAt: new Date().toISOString(),
      });
    };

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      queueFallback();
      return { success: true };
    }

    const wsRes = await saveWorkspaceStateDirect({ backlogItems: updatedLocal }, userId);

    try {
      const scopedId = toDbBacklogItemId(id, userId);
      const { error } = await supabase
        .from('backlog_items')
        .update(dbUpdates)
        .in('id', [scopedId, id])
        .eq('user_id', userId);

      if (error && !wsRes.success) {
        console.warn('[supabase-service] updateBacklogItemDirect queued for retry:', error.message);
        queueFallback();
        return { success: false, error: error.message };
      }

      if (updates.status === 'completed' && updates.chapterId) {
        await saveCompletedTaskDirect(updates.chapterId, true, userId);
      }
    } catch (err: any) {
      if (!wsRes.success) {
        console.warn('[supabase-service] updateBacklogItemDirect queued after error:', err?.message);
        queueFallback();
        return { success: false, error: err?.message };
      }
    }
  }

  return { success: true };
}

export async function deleteBacklogItemDirect(
  id: string,
  explicitUserId?: string
): Promise<{ success: boolean; error?: string }> {
  const userId = await resolveAuthenticatedUserId(explicitUserId);

  const local = readBacklogItems(userId || undefined);
  const updatedLocal = local.filter((i) => i.id !== id);
  saveBacklogItems(updatedLocal, userId || undefined);

  if (userId) {
    const wsRes = await saveWorkspaceStateDirect({ backlogItems: updatedLocal }, userId);
    try {
      const scopedId = toDbBacklogItemId(id, userId);
      const { error } = await supabase
        .from('backlog_items')
        .delete()
        .in('id', [scopedId, id])
        .eq('user_id', userId);

      if (error && !wsRes.success) {
        console.error('[supabase-service] deleteBacklogItemDirect error:', error);
        return { success: false, error: error.message };
      }
    } catch (err: any) {
      if (!wsRes.success) {
        console.error('[supabase-service] deleteBacklogItemDirect caught error:', err);
        return { success: false, error: err?.message };
      }
    }
  }

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
      saveCompleted(taskIds, userId, { skipProgression: true });
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

  // Always update local cache immediately so offline task toggles persist
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

  if (userId) {
    const queueFallback = () => {
      enqueuePendingSyncOp(userId, {
        id: `${Date.now()}-${taskId}`,
        type: 'completed_task',
        taskId,
        isCompleted,
        createdAt: new Date().toISOString(),
      });
    };

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      queueFallback();
      return { success: true };
    }

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
          console.warn('[supabase-service] saveCompletedTaskDirect queued for retry:', error.message);
          queueFallback();
          return { success: false, error: error.message };
        }
      } else {
        const { error } = await supabase
          .from('completed_tasks')
          .delete()
          .eq('user_id', userId)
          .eq('task_id', taskId);
        if (error) {
          console.warn('[supabase-service] delete completed_tasks queued for retry:', error.message);
          queueFallback();
          return { success: false, error: error.message };
        }
      }
    } catch (err: any) {
      console.warn('[supabase-service] saveCompletedTaskDirect queued after error:', err?.message);
      queueFallback();
      return { success: false, error: err?.message };
    }
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

  saveCompleted([], userId || undefined, { skipProgression: true });

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
  session: { chapterId: string; minutes: number; mode: string; completedAt?: string; skipLocalCache?: boolean },
  explicitUserId?: string
): Promise<{ success: boolean; error?: string }> {
  const userId = await resolveAuthenticatedUserId(explicitUserId);
  const completedAtIso = session.completedAt || new Date().toISOString();

  if (!session.skipLocalCache) {
    saveStudySession(
      {
        id: `${Date.now()}-${session.chapterId}`,
        chapterId: session.chapterId,
        minutes: session.minutes,
        mode: (session.mode || 'focus') as any,
        completedAt: completedAtIso,
      },
      userId || undefined
    );
    if (userId && session.chapterId) {
      const updatedItems = readBacklogItems(userId);
      if (updatedItems.length > 0) {
        saveWorkspaceStateDirect({ backlogItems: updatedItems }, userId).catch(() => {});
      }
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('backlogos-progression-updated'));
    window.dispatchEvent(new CustomEvent('backlogos-backlog-updated'));
  }

  if (userId) {
    const queueFallback = () => {
      enqueuePendingSyncOp(userId, {
        id: `${Date.now()}-${session.chapterId}`,
        type: 'study_session',
        chapterId: session.chapterId,
        minutes: session.minutes,
        mode: session.mode || 'focus',
        completedAt: completedAtIso,
        createdAt: completedAtIso,
      });
    };

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      queueFallback();
      return { success: true };
    }

    try {
      const { error } = await supabase
        .from('study_sessions')
        .insert({
          user_id: userId,
          chapter_id: session.chapterId,
          minutes: session.minutes,
          mode: session.mode || 'focus',
          completed_at: completedAtIso,
        });

      if (error) {
        console.warn('[supabase-service] saveStudySessionDirect queued for retry:', error.message);
        queueFallback();
        return { success: false, error: error.message };
      }
    } catch (err: any) {
      console.warn('[supabase-service] saveStudySessionDirect queued after error:', err?.message);
      queueFallback();
      return { success: false, error: err?.message };
    }
  }

  return { success: true };
}

export async function fetchCloudStudySessionsRaw(
  explicitUserId?: string
): Promise<{ sessions: StudySession[]; fromCloud: boolean; error?: string }> {
  const userId = await resolveAuthenticatedUserId(explicitUserId);
  if (!userId) return { sessions: [], fromCloud: false };

  try {
    const { data, error } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });

    if (error) {
      console.warn('[supabase-service] fetchCloudStudySessionsRaw error:', error.message);
      return { sessions: [], fromCloud: false, error: error.message };
    }

    const sessions: StudySession[] = Array.isArray(data)
      ? data.map((d: any) => ({
          id: String(d.id),
          chapterId: d.chapter_id,
          minutes: Number(d.minutes || 0),
          mode: d.mode,
          completedAt: d.completed_at,
        }))
      : [];
    return { sessions, fromCloud: true };
  } catch (err: any) {
    console.warn('[supabase-service] fetchCloudStudySessionsRaw caught error:', err);
    return { sessions: [], fromCloud: false, error: err?.message };
  }
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
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });

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
