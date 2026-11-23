import {
  supabase,
  isSupabaseConfigured,
  isValidUUID,
  UUID_REGEX,
  getOrCreateStableGuestId,
  clearStableGuestId,
} from './supabase';
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
  readStoredBacklogItemsRaw,
  saveBacklogItems,
  addBacklogItem,
  readStudySessions,
  saveStudySession,
  readSmartDailyPlan,
  saveSmartDailyPlan,
  readSpacedRevisions,
  saveSpacedRevisions,
  readRestDates,
  saveRestDates,
  readRecoveryModeActive,
  setRecoveryModeActive,
  readMissedDayRecovery,
  saveMissedDayRecovery,
  type StudySession,
} from './storage';
import { type BacklogItem, type BacklogStatus, type BacklogDifficulty, type BacklogConfidence, type ExamRelevance } from './backlog-items';
import { generatePlanId, buildDefaultPlanName, type StudentPlan } from './backlog-data';
import { readProgression, saveProgressionLocalOnly } from './progression/progression-service';
import {
  fromLegacyStudentPlan,
  syncNormalizedPlanToSupabase,
  syncBacklogToStudentBacklogTable,
  loadV2WorkspaceFromSupabase,
} from './engines';


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

export interface ChapterNote {
  id?: string;
  userId?: string;
  chapterId: string;
  note: string;
  updatedAt: string;
}

export interface SyncState {
  status: 'synced' | 'syncing' | 'offline' | 'error';
  lastSyncedAt: Date | null;
  errorMessage: string | null;
}

export function emitSyncStatus(
  status: 'synced' | 'syncing' | 'offline' | 'error',
  errorMessage: string | null = null
): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('backlogos-sync-status', {
      detail: { status, errorMessage },
    })
  );
}

export { isValidUUID, UUID_REGEX, getOrCreateStableGuestId, clearStableGuestId };

// ---------------------------------------------------------------------------
// NORMALIZERS & MERGERS
// ---------------------------------------------------------------------------

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

function isBrowserOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
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

// ---------------------------------------------------------------------------
// OFFLINE SYNC QUEUE (ONLY USED WHEN BROWSER IS OFFLINE OR EXPLICITLY RETRYING)
// ---------------------------------------------------------------------------

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
    }
  | {
      id: string;
      type: 'study_plan_upsert';
      plan: StudentPlan;
      shouldActivate: boolean;
      createdAt: string;
    }
  | {
      id: string;
      type: 'chapter_note';
      chapterId: string;
      note: string;
      createdAt: string;
    };

function getPendingSyncKey(userId: string): string {
  return `backlogos_pending_sync_v1_${userId}`;
}

export function readPendingSyncOps(userId: string): PendingSyncOp[] {
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
  const filtered = existing.filter((item) => {
    if (op.type === 'completed_task' && item.type === 'completed_task') {
      return item.taskId !== op.taskId;
    }
    if (op.type === 'chapter_note' && item.type === 'chapter_note') {
      return item.chapterId !== op.chapterId;
    }
    if (op.type === 'study_plan_upsert' && item.type === 'study_plan_upsert') {
      return item.plan.id !== op.plan.id;
    }
    return true;
  });
  writePendingSyncOps(userId, [...filtered, op]);
}

function buildStudyPlanRow(plan: StudentPlan, userId: string, shouldActivate: boolean): Record<string, any> {
  return {
    id: plan.id && isValidUUID(plan.id) ? plan.id : generatePlanId(),
    user_id: userId,
    name: plan.name && plan.name.trim() ? plan.name.trim() : buildDefaultPlanName(plan),
    is_active: shouldActivate,
    board: plan.board || 'CBSE',
    subjects: plan.subjects || ['Physics', 'Chemistry', 'Mathematics'],
    goal: plan.goal || 'Complete CBSE Backlog Recovery',
    priority: plan.priority || 'backlog recovery',
    confidence: normalizeDbConfidence(plan.confidence),
    exam_date: normalizeDbExamDate(plan.examDate),
    minutes_per_day: Math.max(30, Number(plan.minutesPerDay) || 180),
    chapter_ids: plan.chapterIds || [],
    planned_chapter_ids: plan.plannedChapterIds || plan.chapterIds || [],
    prerequisite_ids: plan.prerequisiteIds || [],
    order_reason: plan.orderReason || '',
    coverage_note: plan.coverageNote || '',
    days: plan.days || [],
    updated_at: plan.updatedAt || new Date().toISOString(),
  };
}

export async function flushPendingSyncQueue(
  explicitUserId?: string
): Promise<{ flushed: number; remaining: number; lastError?: string }> {
  const userId = await resolveAuthenticatedUserId(explicitUserId);
  if (!userId) return { flushed: 0, remaining: 0 };
  if (isBrowserOffline()) {
    return { flushed: 0, remaining: readPendingSyncOps(userId).length };
  }

  const queue = readPendingSyncOps(userId);
  if (queue.length === 0) return { flushed: 0, remaining: 0 };

  const remaining: PendingSyncOp[] = [];
  let flushed = 0;
  let lastError: string | undefined;

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
      } else if (op.type === 'study_plan_upsert') {
        const upsertRes = await upsertStudyPlanRowResilient(op.plan, userId, op.shouldActivate);
        if (!upsertRes.success) throw new Error(upsertRes.error || 'Study plan sync failed');
        flushed += 1;
      } else if (op.type === 'chapter_note') {
        const { error } = await supabase
          .from('chapter_notes')
          .upsert(
            {
              user_id: userId,
              chapter_id: op.chapterId,
              note: op.note,
              updated_at: op.createdAt,
            },
            { onConflict: 'user_id,chapter_id' }
          );
        if (error) throw error;
        flushed += 1;
      }
    } catch (err: any) {
      lastError = err?.message || 'Queue flush error';
      remaining.push(op);
    }
  }

  writePendingSyncOps(userId, remaining);
  if (remaining.length > 0 && lastError) {
    emitSyncStatus('error', lastError);
  }
  return { flushed, remaining: remaining.length, lastError };
}

// ---------------------------------------------------------------------------
// AUTH USER RESOLUTION
// ---------------------------------------------------------------------------

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
  let existingProfile: Partial<StudentProfileData> | null = null;
  const isPartialUpdate =
    profile.exam_date === undefined ||
    profile.grade === undefined ||
    profile.stream === undefined ||
    profile.selected_chapter_ids === undefined;

  if (isPartialUpdate) {
    existingProfile = await loadStudentProfileDirect(userId);
  }

  let localEduGrade: string | undefined;
  let localEduStream: string | undefined;
  if (typeof window !== 'undefined') {
    try {
      const rawEdu = window.localStorage.getItem(`backlogos-education-profile-v1:${userId}`);
      if (rawEdu) {
        const parsedEdu = JSON.parse(rawEdu);
        localEduGrade = parsedEdu?.grade;
        localEduStream = parsedEdu?.stream;
      }
    } catch {}
  }

  const formattedExamDate =
    profile.exam_date !== undefined
      ? normalizeDbExamDate(profile.exam_date)
      : normalizeDbExamDate(existingProfile?.exam_date ?? activePlan?.examDate);

  const payload: Record<string, any> = {
    user_id: userId,
    board: profile.board || existingProfile?.board || activePlan?.board || 'CBSE',
    grade: profile.grade || existingProfile?.grade || localEduGrade || '11',
    stream: profile.stream || existingProfile?.stream || localEduStream || 'pcm',
    subjects:
      profile.subjects && profile.subjects.length > 0
        ? profile.subjects
        : existingProfile?.subjects && existingProfile.subjects.length > 0
        ? existingProfile.subjects
        : activePlan?.subjects || ['Physics', 'Chemistry', 'Mathematics'],
    selected_chapter_ids: Array.isArray(profile.selected_chapter_ids)
      ? profile.selected_chapter_ids
      : Array.isArray(existingProfile?.selected_chapter_ids)
      ? existingProfile!.selected_chapter_ids
      : activePlan?.chapterIds || [],
    goal: profile.goal || existingProfile?.goal || activePlan?.goal || 'Complete CBSE Backlog Recovery',
    priority: profile.priority || existingProfile?.priority || activePlan?.priority || 'backlog recovery',
    confidence: normalizeDbConfidence(profile.confidence || existingProfile?.confidence || activePlan?.confidence),
    exam_date: formattedExamDate,
    minutes_per_day: Math.max(
      30,
      Number(profile.minutes_per_day || existingProfile?.minutes_per_day || activePlan?.minutesPerDay) || 180
    ),
    updated_at: new Date().toISOString(),
  };

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
      emitSyncStatus('error', error.message);
      return { success: false, error: error.message };
    }

    emitSyncStatus('synced', null);
    return { success: true };
  } catch (err: any) {
    const message = err?.message || 'Database error';
    console.error('[supabase-service] saveStudentProfileDirect caught error:', err);
    emitSyncStatus('error', message);
    return { success: false, error: message };
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
): Promise<{ success: boolean; error?: string }> {
  const userId = await resolveAuthenticatedUserId(explicitUserId);
  if (!userId) return { success: false, error: 'Not authenticated' };

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
      return { success: false, error: readErr.message };
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
        return { success: false, error: updateErr.message };
      }
      return { success: true };
    }

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
      return { success: false, error: upsertErr.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Workspace state write failed' };
  }
}

// ---------------------------------------------------------------------------
// 2. STUDY PLANS (study_plans — Strict UUID `id` Primary Key Multi-Plan)
// ---------------------------------------------------------------------------

let legacyMultiPlanSchemaDetected = false;

export function isLegacyMultiPlanSchemaDetected(): boolean {
  return legacyMultiPlanSchemaDetected;
}

const OPTIONAL_STUDY_PLAN_COLUMNS = new Set([
  'name',
  'is_active',
  'planned_chapter_ids',
  'prerequisite_ids',
  'order_reason',
  'coverage_note',
  'exam_date',
  'updated_at',
  'goal',
  'priority',
  'confidence',
  'minutes_per_day',
  'board',
  'subjects',
  'client_id',
]);

async function upsertStudyPlanRowResilient(
  plan: StudentPlan,
  userId: string,
  shouldActivate: boolean
): Promise<{ success: boolean; usedLegacySingleRow?: boolean; deactivatedSupported?: boolean; error?: string }> {
  const workingMulti = buildStudyPlanRow(plan, userId, shouldActivate);
  let error: any = null;

  for (let attempt = 0; attempt < 8; attempt++) {
    const res = await supabase
      .from('study_plans')
      .upsert(workingMulti, { onConflict: 'id' });
    error = res.error;
    if (!error) {
      return {
        success: true,
        usedLegacySingleRow: false,
        deactivatedSupported: 'is_active' in workingMulti,
      };
    }

    const missingCol = extractMissingColumnFromError(error);
    if (
      (error.code === 'PGRST204' || error.code === '42703') &&
      missingCol &&
      OPTIONAL_STUDY_PLAN_COLUMNS.has(missingCol) &&
      missingCol in workingMulti
    ) {
      delete workingMulti[missingCol];
      continue;
    }
    break;
  }

  const errMsg = String(error?.message || '').toLowerCase();
  const isConstraintMismatch =
    error?.code === '23505' ||
    error?.code === '42P10' ||
    errMsg.includes('study_plans_user_id_key') ||
    errMsg.includes('no unique or exclusion constraint');

  if (isConstraintMismatch) {
    legacyMultiPlanSchemaDetected = true;
    const legacyRow = { ...workingMulti };
    // Preserve active cloud row when saving a secondary non-active copy on a single-row legacy table
    if (!shouldActivate) {
      const { data: existingRows } = await supabase
        .from('study_plans')
        .select('id')
        .eq('user_id', userId)
        .limit(1);
      if (Array.isArray(existingRows) && existingRows.length > 0 && existingRows[0]?.id !== legacyRow.id) {
        return {
          success: false,
          usedLegacySingleRow: true,
          error:
            'Legacy single-plan unique constraint on study_plans(user_id) blocked saving a second plan row. Re-run supabase/schema.sql in Supabase SQL Editor.',
        };
      }
    }

    let legacyErr: any = null;
    for (let attempt = 0; attempt < 8; attempt++) {
      const res = await supabase
        .from('study_plans')
        .upsert(legacyRow, { onConflict: 'user_id' });
      legacyErr = res.error;
      if (!legacyErr) {
        return {
          success: true,
          usedLegacySingleRow: true,
          deactivatedSupported: false,
        };
      }
      const missingCol = extractMissingColumnFromError(legacyErr);
      if (
        (legacyErr.code === 'PGRST204' || legacyErr.code === '42703') &&
        missingCol &&
        OPTIONAL_STUDY_PLAN_COLUMNS.has(missingCol) &&
        missingCol in legacyRow
      ) {
        delete legacyRow[missingCol];
        continue;
      }
      break;
    }
    return {
      success: false,
      usedLegacySingleRow: true,
      error: legacyErr?.message || error?.message || 'Study plan upsert constraint error',
    };
  }

  return {
    success: false,
    error: error?.message || 'Database error saving study plan',
  };
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

export async function saveStudyPlanDirect(
  plan: StudentPlan,
  explicitUserId?: string,
  options?: { preserveActiveFlag?: boolean }
): Promise<{ success: boolean; plan?: StudentPlan; plans?: StudentPlan[]; offline?: boolean; error?: string }> {
  const shouldActivate = options?.preserveActiveFlag ? Boolean(plan.isActive) : true;
  const normalizedPlan: StudentPlan = {
    ...plan,
    id: plan.id && isValidUUID(plan.id) ? plan.id : generatePlanId(),
    name: plan.name && plan.name.trim() ? plan.name.trim() : buildDefaultPlanName(plan),
    isActive: shouldActivate,
    createdAt: plan.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const userId = await resolveAuthenticatedUserId(explicitUserId);
  if (!userId) {
    const updatedHistory = upsertPlanInHistory(normalizedPlan, undefined, shouldActivate);
    return { success: true, plan: normalizedPlan, plans: updatedHistory };
  }

  if (isBrowserOffline()) {
    const offlineHistory = upsertPlanInHistory(normalizedPlan, userId, shouldActivate);
    enqueuePendingSyncOp(userId, {
      id: `${Date.now()}-${normalizedPlan.id}`,
      type: 'study_plan_upsert',
      plan: normalizedPlan,
      shouldActivate,
      createdAt: normalizedPlan.updatedAt || new Date().toISOString(),
    });
    emitSyncStatus('offline', null);
    return {
      success: false,
      offline: true,
      plan: normalizedPlan,
      plans: offlineHistory,
      error: 'Offline: study plan queued for cloud sync',
    };
  }

  emitSyncStatus('syncing', null);

  try {
    const upsertRes = await upsertStudyPlanRowResilient(normalizedPlan, userId, shouldActivate);

    if (!upsertRes.success) {
      const message = upsertRes.error || 'Failed to save study plan to Supabase';
      console.error('[supabase-service] saveStudyPlanDirect error:', message);
      emitSyncStatus('error', message);
      return { success: false, error: message };
    }

    if (shouldActivate && upsertRes.deactivatedSupported !== false) {
      await supabase
        .from('study_plans')
        .update({ is_active: false })
        .eq('user_id', userId)
        .neq('id', normalizedPlan.id!);
    }

    // Commit localStorage cache and workspace mirror ONLY AFTER confirmed cloud write
    const committedHistory = upsertPlanInHistory(normalizedPlan, userId, shouldActivate);
    await saveWorkspaceStateDirect({ studyPlans: committedHistory }, userId);
    const completedSnapshot = readCompleted(userId);
    await syncNormalizedPlanToSupabase(
      fromLegacyStudentPlan(normalizedPlan, completedSnapshot),
      userId
    ).catch((err) => console.warn('[supabase-service] v2 plan mirror notice:', err));
    emitSyncStatus('synced', null);

    return { success: true, plan: normalizedPlan, plans: committedHistory };
  } catch (err: any) {
    const message = err?.message || 'Database error';
    console.error('[supabase-service] saveStudyPlanDirect caught error:', err);
    emitSyncStatus('error', message);
    return { success: false, error: message };
  }
}

export async function fetchCloudStudyPlansRaw(
  explicitUserId?: string
): Promise<{ plans: StudentPlan[]; fromCloud: boolean; error?: string }> {
  const userId = await resolveAuthenticatedUserId(explicitUserId);
  if (!userId) return { plans: [], fromCloud: false };

  try {
    const [orderedRes, ws] = await Promise.all([
      supabase
        .from('study_plans')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false }),
      loadWorkspaceStateDirect(userId),
    ]);

    let data = orderedRes.data;
    let error = orderedRes.error;

    if (
      error &&
      (error.code === '42703' ||
        error.code === 'PGRST204' ||
        String(error.message || '').toLowerCase().includes('updated_at'))
    ) {
      const unorderedRes = await supabase
        .from('study_plans')
        .select('*')
        .eq('user_id', userId);
      data = unorderedRes.data;
      error = unorderedRes.error;
    }

    const deletedSet = new Set(readDeletedPlanIds(userId));
    const sortedRows = !error && Array.isArray(data)
      ? [...data].sort((a: any, b: any) => {
          const tA = new Date(a?.updated_at || a?.created_at || 0).getTime();
          const tB = new Date(b?.updated_at || b?.created_at || 0).getTime();
          return tB - tA;
        })
      : [];

    const dbPlans = sortedRows
      .map((row, idx) => mapDbRowToStudentPlan(row, idx === 0))
      .filter((p) => !p.id || !deletedSet.has(p.id));
    const wsPlans = Array.isArray(ws?.studyPlans)
      ? ws!.studyPlans.filter((p) => p && (!p.id || !deletedSet.has(p.id)))
      : [];

    if (error) {
      console.warn('[supabase-service] fetchCloudStudyPlansRaw error:', error.message);
      return {
        plans: wsPlans.length > 0 ? mergeStudyPlanArrays([], wsPlans, deletedSet) : [],
        fromCloud: false,
        error: error.message,
      };
    }

    const merged = mergeStudyPlanArrays(dbPlans, wsPlans, deletedSet);
    return { plans: merged, fromCloud: true };
  } catch (err: any) {
    console.warn('[supabase-service] fetchCloudStudyPlansRaw caught error:', err);
    return { plans: [], fromCloud: false, error: err?.message || 'Network error' };
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
    if (!fromCloud && cloudPlans.length === 0) return localHistory;

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

      const effectiveActiveId =
        (dbPlans.find((p) => p.isActive) || (localActive && dbIds.has(localActive.id) ? localActive : dbPlans[0]))?.id;

      const merged = [
        ...dbPlans.map((dp) => ({ ...dp, isActive: dp.id === effectiveActiveId })),
        ...extras.map((ep) => ({ ...ep, isActive: false })),
      ];

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
): Promise<{ plans: StudentPlan[]; activePlan: StudentPlan | null; error?: string }> {
  const userId = await resolveAuthenticatedUserId(explicitUserId);
  if (!userId) {
    return switchActivePlanInHistory(planId);
  }

  if (!isValidUUID(planId)) {
    const localResult = switchActivePlanInHistory(planId, userId);
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
      emitSyncStatus('error', activateErr.message);
      const current = readPlanHistory(userId);
      return {
        plans: current,
        activePlan: current.find((p) => p.isActive) || current[0] || null,
        error: activateErr.message,
      };
    }

    if (!activatedRows || activatedRows.length === 0) {
      const targetLocal = readPlanHistory(userId).find((p) => p.id === planId);
      if (targetLocal) {
        const saved = await saveStudyPlanDirect({ ...targetLocal, isActive: true }, userId);
        return {
          plans: saved.plans || readPlanHistory(userId),
          activePlan: saved.plan || targetLocal,
          error: saved.error,
        };
      }
    }

    const { error: deactivateErr } = await supabase
      .from('study_plans')
      .update({ is_active: false })
      .eq('user_id', userId)
      .neq('id', planId);

    if (deactivateErr) {
      emitSyncStatus('error', deactivateErr.message);
    } else {
      emitSyncStatus('synced', null);
    }

    const localResult = switchActivePlanInHistory(planId, userId);
    saveWorkspaceStateDirect({ studyPlans: localResult.plans }, userId).catch((err) =>
      console.warn('[supabase-service] workspace mirror studyPlans error:', err)
    );
    return localResult;
  } catch (err: any) {
    const message = err?.message || 'Failed to switch active plan';
    emitSyncStatus('error', message);
    const current = readPlanHistory(userId);
    return {
      plans: current,
      activePlan: current.find((p) => p.isActive) || current[0] || null,
      error: message,
    };
  }
}

export async function renameStudyPlanDirect(
  planId: string,
  newName: string,
  explicitUserId?: string
): Promise<StudentPlan[]> {
  const userId = await resolveAuthenticatedUserId(explicitUserId);
  if (!userId) {
    return renamePlanInHistory(planId, newName);
  }

  if (!isValidUUID(planId)) {
    return renamePlanInHistory(planId, newName, userId);
  }

  try {
    const { error } = await supabase
      .from('study_plans')
      .update({ name: newName.trim(), updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('id', planId);

    if (error) {
      emitSyncStatus('error', error.message);
      return readPlanHistory(userId);
    }

    const updated = renamePlanInHistory(planId, newName, userId);
    await saveWorkspaceStateDirect({ studyPlans: updated }, userId).catch((err) =>
      console.warn('[supabase-service] workspace mirror rename studyPlans error:', err)
    );
    emitSyncStatus('synced', null);
    return updated;
  } catch (err: any) {
    emitSyncStatus('error', err?.message || 'Failed to rename plan');
    return readPlanHistory(userId);
  }
}

export async function deleteStudyPlanDirect(
  explicitUserId?: string,
  planId?: string
): Promise<{ success: boolean; plans?: StudentPlan[]; nextActive?: StudentPlan | null; error?: string }> {
  const userId = await resolveAuthenticatedUserId(explicitUserId);

  if (planId) {
    if (!userId) {
      const { plans, nextActive } = removePlanFromHistory(planId);
      return { success: true, plans, nextActive };
    }

    try {
      if (isValidUUID(planId)) {
        const { error: deleteErr } = await supabase
          .from('study_plans')
          .delete()
          .eq('user_id', userId)
          .eq('id', planId);

        if (deleteErr) {
          emitSyncStatus('error', deleteErr.message);
          return { success: false, error: deleteErr.message };
        }
      }

      const { plans, nextActive } = removePlanFromHistory(planId, userId);
      await saveWorkspaceStateDirect({ studyPlans: plans }, userId).catch((err) =>
        console.warn('[supabase-service] workspace mirror delete studyPlans error:', err)
      );

      if (nextActive?.id && isValidUUID(nextActive.id)) {
        await supabase
          .from('study_plans')
          .update({ is_active: true })
          .eq('user_id', userId)
          .eq('id', nextActive.id);
      }

      emitSyncStatus('synced', null);
      return { success: true, plans, nextActive };
    } catch (err: any) {
      const message = err?.message || 'Failed to delete study plan';
      emitSyncStatus('error', message);
      return { success: false, error: message };
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
      emitSyncStatus('error', error.message);
      return { success: false, error: error.message };
    }

    await saveWorkspaceStateDirect({ studyPlans: [] }, userId).catch((err) =>
      console.warn('[supabase-service] workspace mirror clear studyPlans error:', err)
    );
    savePlan(null as any, userId);
    savePlanHistory([], userId);
    emitSyncStatus('synced', null);

    return { success: true, plans: [], nextActive: null };
  } catch (err: any) {
    const message = err?.message || 'Failed to delete plans';
    emitSyncStatus('error', message);
    return { success: false, error: message };
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

    if (error) {
      console.warn('[supabase-service] fetchCloudBacklogItemsRaw error:', error.message);
      return {
        items: wsItems.length > 0 ? wsItems : [],
        fromCloud: false,
        error: error.message,
      };
    }

    const merged = mergeBacklogArrays(dbItems, wsItems);
    return { items: merged, fromCloud: true };
  } catch (err: any) {
    console.warn('[supabase-service] fetchCloudBacklogItemsRaw caught error:', err);
    return { items: [], fromCloud: false, error: err?.message || 'Network error' };
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
    if (fromCloud) {
      if (cloudItems.length > 0) {
        saveBacklogItems(cloudItems, userId, { skipProgression: true });
      }
      return cloudItems.length > 0 ? cloudItems : readBacklogItems(userId);
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

  const existingLocal = readStoredBacklogItemsRaw(userId);
  const fullList = mergeBacklogArrays(items, existingLocal);

  if (isBrowserOffline()) {
    saveBacklogItems(fullList, userId, { skipProgression: true });
    emitSyncStatus('offline', null);
    return { success: false, error: 'Offline: backlog items saved locally' };
  }

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
      console.error('[supabase-service] saveAllBacklogItemsDirect error:', error);
      emitSyncStatus('error', error.message);
      return { success: false, error: error.message };
    }

    // Commit localStorage cache and workspace mirror ONLY AFTER confirmed DB write
    saveBacklogItems(fullList, userId, { skipProgression: true });
    await saveWorkspaceStateDirect({ backlogItems: fullList }, userId).catch((err) =>
      console.warn('[supabase-service] workspace mirror backlogItems error:', err)
    );
    await syncBacklogToStudentBacklogTable(fullList, userId).catch((err) =>
      console.warn('[supabase-service] v2 student_backlog mirror notice:', err)
    );
    emitSyncStatus('synced', null);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('backlogos-backlog-updated', { detail: fullList }));
    }

    return { success: true };
  } catch (err: any) {
    const message = err?.message || 'Database error';
    console.error('[supabase-service] saveAllBacklogItemsDirect caught error:', err);
    emitSyncStatus('error', message);
    return { success: false, error: message };
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

  if (isBrowserOffline()) {
    addBacklogItem(item, userId);
    emitSyncStatus('offline', null);
    return { success: false, item, error: 'Offline: backlog item saved locally' };
  }

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

    if (error) {
      console.error('[supabase-service] createBacklogItemDirect error:', error);
      emitSyncStatus('error', error.message);
      return { success: false, error: error.message };
    }

    const updatedLocal = addBacklogItem(item, userId);
    await saveWorkspaceStateDirect({ backlogItems: updatedLocal }, userId).catch((err) =>
      console.warn('[supabase-service] workspace mirror create backlogItem error:', err)
    );
    emitSyncStatus('synced', null);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('backlogos-backlog-updated'));
    }

    return { success: true, item };
  } catch (err: any) {
    const message = err?.message || 'Database error';
    console.error('[supabase-service] createBacklogItemDirect caught error:', err);
    emitSyncStatus('error', message);
    return { success: false, error: message };
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

  const applyLocalUpdate = () => {
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
    return updatedLocal;
  };

  if (!userId) {
    applyLocalUpdate();
    return { success: true };
  }

  const queueFallback = () => {
    enqueuePendingSyncOp(userId, {
      id: `${Date.now()}-${id}`,
      type: 'backlog_update',
      itemId: id,
      updates,
      createdAt: new Date().toISOString(),
    });
  };

  if (isBrowserOffline()) {
    applyLocalUpdate();
    queueFallback();
    emitSyncStatus('offline', null);
    return { success: true };
  }

  try {
    const scopedId = toDbBacklogItemId(id, userId);
    const { error } = await supabase
      .from('backlog_items')
      .update(dbUpdates)
      .in('id', [scopedId, id])
      .eq('user_id', userId);

    if (error) {
      console.warn('[supabase-service] updateBacklogItemDirect error:', error.message);
      emitSyncStatus('error', error.message);
      return { success: false, error: error.message };
    }

    const updatedLocal = applyLocalUpdate();
    await saveWorkspaceStateDirect({ backlogItems: updatedLocal }, userId).catch((err) =>
      console.warn('[supabase-service] workspace mirror update backlogItem error:', err)
    );
    await syncBacklogToStudentBacklogTable(updatedLocal, userId).catch((err) =>
      console.warn('[supabase-service] v2 student_backlog update mirror notice:', err)
    );

    if (updates.status === 'completed' && updates.chapterId) {
      await saveCompletedTaskDirect(updates.chapterId, true, userId);
    }

    emitSyncStatus('synced', null);
    return { success: true };
  } catch (err: any) {
    const message = err?.message || 'Database error';
    console.warn('[supabase-service] updateBacklogItemDirect caught error:', message);
    emitSyncStatus('error', message);
    return { success: false, error: message };
  }
}

export async function deleteBacklogItemDirect(
  id: string,
  explicitUserId?: string
): Promise<{ success: boolean; error?: string }> {
  const userId = await resolveAuthenticatedUserId(explicitUserId);

  const applyLocalDelete = () => {
    const local = readBacklogItems(userId || undefined);
    const updatedLocal = local.filter((i) => i.id !== id);
    saveBacklogItems(updatedLocal, userId || undefined);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('backlogos-backlog-updated'));
    }
    return updatedLocal;
  };

  if (!userId) {
    applyLocalDelete();
    return { success: true };
  }

  if (isBrowserOffline()) {
    applyLocalDelete();
    emitSyncStatus('offline', null);
    return { success: false, error: 'Offline: cannot sync delete right now' };
  }

  try {
    const scopedId = toDbBacklogItemId(id, userId);
    const { error } = await supabase
      .from('backlog_items')
      .delete()
      .in('id', [scopedId, id])
      .eq('user_id', userId);

    if (error) {
      console.error('[supabase-service] deleteBacklogItemDirect error:', error);
      emitSyncStatus('error', error.message);
      return { success: false, error: error.message };
    }

    const updatedLocal = applyLocalDelete();
    await saveWorkspaceStateDirect({ backlogItems: updatedLocal }, userId).catch((err) =>
      console.warn('[supabase-service] workspace mirror delete backlogItem error:', err)
    );
    emitSyncStatus('synced', null);
    return { success: true };
  } catch (err: any) {
    const message = err?.message || 'Database error';
    console.error('[supabase-service] deleteBacklogItemDirect caught error:', err);
    emitSyncStatus('error', message);
    return { success: false, error: message };
  }
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

  const applyLocalCompletion = () => {
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
  };

  if (!userId) {
    applyLocalCompletion();
    return { success: true };
  }

  const queueFallback = () => {
    enqueuePendingSyncOp(userId, {
      id: `${Date.now()}-${taskId}`,
      type: 'completed_task',
      taskId,
      isCompleted,
      createdAt: new Date().toISOString(),
    });
  };

  if (isBrowserOffline()) {
    applyLocalCompletion();
    queueFallback();
    emitSyncStatus('offline', null);
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
        console.warn('[supabase-service] saveCompletedTaskDirect error:', error.message);
        emitSyncStatus('error', error.message);
        return { success: false, error: error.message };
      }
    } else {
      const { error } = await supabase
        .from('completed_tasks')
        .delete()
        .eq('user_id', userId)
        .eq('task_id', taskId);
      if (error) {
        console.warn('[supabase-service] delete completed_tasks error:', error.message);
        emitSyncStatus('error', error.message);
        return { success: false, error: error.message };
      }
    }

    applyLocalCompletion();
    emitSyncStatus('synced', null);
    return { success: true };
  } catch (err: any) {
    const message = err?.message || 'Database error';
    console.warn('[supabase-service] saveCompletedTaskDirect caught error:', message);
    emitSyncStatus('error', message);
    return { success: false, error: message };
  }
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
        emitSyncStatus('error', error.message);
        return { success: false, error: error.message };
      }
    } catch (err: any) {
      const message = err?.message || 'Database error';
      console.error('[supabase-service] clearAllCompletedTasksDirect caught error:', err);
      emitSyncStatus('error', message);
      return { success: false, error: message };
    }
  }

  saveCompleted([], userId || undefined, { skipProgression: true });
  if (userId) emitSyncStatus('synced', null);

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

  const applyLocalSession = () => {
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
          saveWorkspaceStateDirect({ backlogItems: updatedItems }, userId).catch((err) =>
            console.warn('[supabase-service] workspace mirror session backlogItems error:', err)
          );
        }
      }
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('backlogos-progression-updated'));
      window.dispatchEvent(new CustomEvent('backlogos-backlog-updated'));
    }
  };

  if (!userId) {
    applyLocalSession();
    return { success: true };
  }

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

  if (isBrowserOffline()) {
    applyLocalSession();
    queueFallback();
    emitSyncStatus('offline', null);
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
      console.warn('[supabase-service] saveStudySessionDirect error:', error.message);
      emitSyncStatus('error', error.message);
      return { success: false, error: error.message };
    }

    applyLocalSession();
    emitSyncStatus('synced', null);
    return { success: true };
  } catch (err: any) {
    const message = err?.message || 'Database error';
    console.warn('[supabase-service] saveStudySessionDirect caught error:', message);
    emitSyncStatus('error', message);
    return { success: false, error: message };
  }
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
    return { sessions: [], fromCloud: false, error: err?.message || 'Network error' };
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
// 6. CHAPTER NOTES (chapter_notes)
// ---------------------------------------------------------------------------

function getChapterNotesCacheKey(userId?: string | null): string {
  return `backlogos-chapter-notes-v1:${userId || 'guest'}`;
}

export function readChapterNotesCache(userId?: string | null): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(getChapterNotesCacheKey(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function writeChapterNotesCache(notes: Record<string, string>, userId?: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(getChapterNotesCacheKey(userId), JSON.stringify(notes));
  } catch {
    // ignore storage quota errors
  }
}

export async function loadChapterNotesDirect(
  explicitUserId?: string
): Promise<{ notes: Record<string, string>; fromCloud: boolean; error?: string }> {
  const userId = await resolveAuthenticatedUserId(explicitUserId);
  if (!userId) {
    return { notes: readChapterNotesCache(explicitUserId), fromCloud: false };
  }

  try {
    const { data, error } = await supabase
      .from('chapter_notes')
      .select('chapter_id, note, updated_at')
      .eq('user_id', userId);

    if (error) {
      console.warn('[supabase-service] loadChapterNotesDirect error:', error.message);
      return { notes: readChapterNotesCache(userId), fromCloud: false, error: error.message };
    }

    const notesMap: Record<string, string> = {};
    if (Array.isArray(data)) {
      for (const row of data) {
        if (row?.chapter_id) {
          notesMap[String(row.chapter_id)] = String(row.note || '');
        }
      }
      writeChapterNotesCache(notesMap, userId);
    }

    return { notes: notesMap, fromCloud: true };
  } catch (err: any) {
    return {
      notes: readChapterNotesCache(userId),
      fromCloud: false,
      error: err?.message || 'Failed to load chapter notes',
    };
  }
}

export async function loadChapterNoteDirect(
  chapterId: string,
  explicitUserId?: string
): Promise<{ note: string; updatedAt?: string; fromCloud: boolean; error?: string }> {
  const cleanChapterId = String(chapterId || '').trim();
  if (!cleanChapterId) return { note: '', fromCloud: false };

  const userId = await resolveAuthenticatedUserId(explicitUserId);
  if (!userId) {
    const cache = readChapterNotesCache(explicitUserId);
    return { note: cache[cleanChapterId] || '', fromCloud: false };
  }

  try {
    const { data, error } = await supabase
      .from('chapter_notes')
      .select('note, updated_at')
      .eq('user_id', userId)
      .eq('chapter_id', cleanChapterId)
      .maybeSingle();

    if (error) {
      const cache = readChapterNotesCache(userId);
      return {
        note: cache[cleanChapterId] || '',
        fromCloud: false,
        error: error.message,
      };
    }

    const noteText = data?.note ? String(data.note) : '';
    const cache = readChapterNotesCache(userId);
    if (data) {
      cache[cleanChapterId] = noteText;
      writeChapterNotesCache(cache, userId);
    }
    return {
      note: noteText,
      updatedAt: data?.updated_at || undefined,
      fromCloud: true,
    };
  } catch (err: any) {
    const cache = readChapterNotesCache(userId);
    return {
      note: cache[cleanChapterId] || '',
      fromCloud: false,
      error: err?.message || 'Failed to load note',
    };
  }
}

export async function saveChapterNoteDirect(
  chapterId: string,
  note: string,
  explicitUserId?: string
): Promise<{ success: boolean; offline?: boolean; error?: string }> {
  const cleanChapterId = String(chapterId || '').trim();
  if (!cleanChapterId) return { success: false, error: 'Invalid chapter ID' };

  const userId = await resolveAuthenticatedUserId(explicitUserId);
  const updatedAt = new Date().toISOString();

  const updateCache = () => {
    const targetCacheUid = userId || explicitUserId || 'guest';
    const current = readChapterNotesCache(targetCacheUid);
    current[cleanChapterId] = note;
    writeChapterNotesCache(current, targetCacheUid);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('backlogos-notes-updated', { detail: { chapterId: cleanChapterId, note } })
      );
    }
  };

  if (!userId) {
    updateCache();
    return { success: true };
  }

  if (isBrowserOffline()) {
    updateCache();
    enqueuePendingSyncOp(userId, {
      id: `${Date.now()}-${cleanChapterId}`,
      type: 'chapter_note',
      chapterId: cleanChapterId,
      note,
      createdAt: updatedAt,
    });
    emitSyncStatus('offline', null);
    return { success: false, offline: true, error: 'Offline: note saved locally and queued for sync' };
  }

  try {
    const { error } = await supabase
      .from('chapter_notes')
      .upsert(
        {
          user_id: userId,
          chapter_id: cleanChapterId,
          note,
          updated_at: updatedAt,
        },
        { onConflict: 'user_id,chapter_id' }
      );

    if (error) {
      console.error('[supabase-service] saveChapterNoteDirect error:', error);
      emitSyncStatus('error', error.message);
      return { success: false, error: error.message };
    }

    updateCache();
    emitSyncStatus('synced', null);
    return { success: true };
  } catch (err: any) {
    const message = err?.message || 'Failed to save chapter note';
    emitSyncStatus('error', message);
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// 7. IDEMPOTENT GUEST-TO-ACCOUNT MIGRATION (migration_receipts)
// ---------------------------------------------------------------------------

function getMigrationReceiptLocalKey(targetUid: string, guestUid: string, batchKey: string): string {
  return `backlogos_migrated_guest_v1:${targetUid}:${guestUid}:${batchKey}`;
}

export async function migrateGuestDataToCloud(
  guestUid: string,
  targetUid: string,
  batchKey = 'guest_migration_v1',
  options?: { suppressSyncStatus?: boolean }
): Promise<{ success: boolean; migrated: boolean; alreadyMigrated: boolean; error?: string }> {
  if (!guestUid || !String(guestUid).startsWith('guest-') || !isValidUUID(targetUid)) {
    return { success: true, migrated: false, alreadyMigrated: false };
  }

  if (typeof window === 'undefined') {
    return { success: true, migrated: false, alreadyMigrated: false };
  }

  const guestPlans = readPlanHistory(guestUid);
  const guestSinglePlan = readPlan(guestUid);
  const allGuestPlans =
    guestPlans.length > 0 ? guestPlans : guestSinglePlan ? [guestSinglePlan] : [];
  const guestBacklog = readStoredBacklogItemsRaw(guestUid);
  const guestCompleted = readCompleted(guestUid);
  const guestSessions = readStudySessions(guestUid);
  const guestNotes = readChapterNotesCache(guestUid);
  const guestDaily = readSmartDailyPlan(guestUid);
  const guestRevisions = readSpacedRevisions(guestUid);
  const guestRestDates = readRestDates(guestUid);
  const guestRecoveryMode = readRecoveryModeActive(guestUid);
  const guestMissed = readMissedDayRecovery(guestUid);
  const guestProg = readProgression(guestUid);
  const guestEduProfileRaw = window.localStorage.getItem(`backlogos-education-profile-v1:${guestUid}`);

  const hasAnyGuestPayload =
    allGuestPlans.length > 0 ||
    guestBacklog.length > 0 ||
    guestCompleted.length > 0 ||
    guestSessions.length > 0 ||
    Object.keys(guestNotes).length > 0 ||
    Boolean(guestDaily) ||
    guestRevisions.length > 0 ||
    guestRestDates.length > 0 ||
    guestRecoveryMode ||
    Boolean(guestMissed) ||
    guestProg.xp > 0;

  if (!hasAnyGuestPayload) {
    return { success: true, migrated: false, alreadyMigrated: false };
  }

  const localReceiptKey = getMigrationReceiptLocalKey(targetUid, guestUid, batchKey);
  if (window.localStorage.getItem(localReceiptKey) === 'done') {
    return { success: true, migrated: false, alreadyMigrated: true };
  }

  // 1. Check cloud idempotency receipt when online
  if (isSupabaseConfigured && !isBrowserOffline()) {
    try {
      const { data: existingReceipt, error: receiptCheckErr } = await supabase
        .from('migration_receipts')
        .select('id')
        .eq('user_id', targetUid)
        .eq('guest_uid', guestUid)
        .eq('batch_key', batchKey)
        .maybeSingle();

      if (!receiptCheckErr && existingReceipt) {
        window.localStorage.setItem(localReceiptKey, 'done');
        clearStableGuestId();
        return { success: true, migrated: false, alreadyMigrated: true };
      }
    } catch {
      // Proceed cautiously if receipt check could not run
    }
  }

  if (isBrowserOffline() || !isSupabaseConfigured) {
    if (!options?.suppressSyncStatus) {
      emitSyncStatus('offline', 'Offline: guest progress kept locally until cloud connection is restored');
    }
    return { success: false, migrated: false, alreadyMigrated: false, error: 'Offline during guest migration' };
  }

  try {
    const hasExplicitActiveGuestPlan = allGuestPlans.some((p) => p?.isActive === true);
    const existingCloudPlansRes = await supabase
      .from('study_plans')
      .select('id, is_active')
      .eq('user_id', targetUid);
    const hasExistingActiveCloudPlan =
      !existingCloudPlansRes.error &&
      Array.isArray(existingCloudPlansRes.data) &&
      existingCloudPlansRes.data.some((p: any) => p?.is_active);

    // 2. Persist guest plans cleanly to Supabase under targetUid (preserving UUID or generating one)
    const normalizedMigratedPlans: StudentPlan[] = [];
    for (let i = 0; i < allGuestPlans.length; i++) {
      const gp = allGuestPlans[i];
      const shouldBeActive =
        !hasExistingActiveCloudPlan &&
        (hasExplicitActiveGuestPlan ? Boolean(gp.isActive) : i === 0);
      const normalizedPlan: StudentPlan = {
        ...gp,
        id: gp.id && isValidUUID(gp.id) ? gp.id : generatePlanId(),
        isActive: shouldBeActive,
        updatedAt: gp.updatedAt || new Date().toISOString(),
      };
      normalizedMigratedPlans.push(normalizedPlan);
      const upsertRes = await upsertStudyPlanRowResilient(normalizedPlan, targetUid, shouldBeActive);
      if (!upsertRes.success) throw new Error(`Plans migration failed: ${upsertRes.error}`);
    }

    // 2b. Ensure student_profiles row exists in Supabase if user created plan before logging in
    if (normalizedMigratedPlans.length > 0) {
      const primaryPlan = normalizedMigratedPlans.find((p) => p.isActive) || normalizedMigratedPlans[0];
      let guestEdu: any = null;
      if (guestEduProfileRaw) {
        try {
          guestEdu = JSON.parse(guestEduProfileRaw);
        } catch {}
      }
      const existingProf = await loadStudentProfileDirect(targetUid);
      if (!existingProf) {
        await saveStudentProfileDirect(
          {
            board: primaryPlan.board || guestEdu?.curriculum || 'CBSE',
            grade: guestEdu?.grade || '11',
            stream: guestEdu?.stream || 'pcm',
            subjects: primaryPlan.subjects || ['Physics', 'Chemistry', 'Mathematics'],
            selected_chapter_ids: primaryPlan.chapterIds || [],
            goal: primaryPlan.goal || 'Complete CBSE Backlog Recovery',
            priority: primaryPlan.priority || 'backlog recovery',
            confidence: primaryPlan.confidence || 'mixed',
            exam_date: primaryPlan.examDate || '',
            minutes_per_day: primaryPlan.minutesPerDay || 180,
          },
          targetUid
        );
      }
    }

    // 3. Persist guest backlog items under targetUid
    if (guestBacklog.length > 0) {
      const backlogPayload = guestBacklog.map((item) => ({
        id: toDbBacklogItemId(item.id || `item-${item.chapterId}`, targetUid),
        user_id: targetUid,
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
      const { error } = await supabase.from('backlog_items').upsert(backlogPayload, { onConflict: 'id' });
      if (error) throw new Error(`Backlog migration failed: ${error.message}`);
    }

    // 4. Persist guest completed tasks idempotently
    if (guestCompleted.length > 0) {
      const completedPayload = Array.from(new Set(guestCompleted)).map((taskId) => ({
        user_id: targetUid,
        task_id: taskId,
        completed_at: new Date().toISOString(),
      }));
      const { error } = await supabase
        .from('completed_tasks')
        .upsert(completedPayload, { onConflict: 'user_id,task_id' });
      if (error) throw new Error(`Completed tasks migration failed: ${error.message}`);
    }

    // 5. Persist guest chapter notes idempotently
    const noteEntries = Object.entries(guestNotes);
    if (noteEntries.length > 0) {
      const notesPayload = noteEntries.map(([chapterId, note]) => ({
        user_id: targetUid,
        chapter_id: chapterId,
        note: String(note || ''),
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase
        .from('chapter_notes')
        .upsert(notesPayload, { onConflict: 'user_id,chapter_id' });
      if (error) throw new Error(`Notes migration failed: ${error.message}`);
    }

    // 6. Persist guest study sessions (deduplicated against already existing cloud sessions)
    if (guestSessions.length > 0) {
      const { sessions: existingCloudSessions } = await fetchCloudStudySessionsRaw(targetUid);
      const sessionKey = (s: any) => `${s.chapterId}|${s.minutes}|${String(s.completedAt || '').slice(0, 16)}`;
      const existingKeys = new Set(existingCloudSessions.map(sessionKey));
      const sessionsToInsert = guestSessions
        .filter((s) => !existingKeys.has(sessionKey(s)))
        .slice(0, 50)
        .map((s) => ({
          user_id: targetUid,
          chapter_id: s.chapterId,
          minutes: s.minutes,
          mode: s.mode || 'focus',
          completed_at: s.completedAt || new Date().toISOString(),
        }));
      if (sessionsToInsert.length > 0) {
        const { error } = await supabase.from('study_sessions').insert(sessionsToInsert);
        if (error) throw new Error(`Study sessions migration failed: ${error.message}`);
      }
    }

    // 7. Merge guest workspace state into targetUid
    const wsPatch: WorkspaceStatePayload = {};
    if (guestDaily) wsPatch.dailyPlan = guestDaily;
    if (guestRevisions.length > 0) wsPatch.revisions = guestRevisions;
    if (guestRecoveryMode) wsPatch.recoveryMode = guestRecoveryMode;
    if (guestMissed) wsPatch.missedRecovery = guestMissed;
    if (guestRestDates.length > 0) wsPatch.restDates = guestRestDates;
    if (guestProg.xp > 0) wsPatch.progression = { ...guestProg, userId: targetUid };
    if (Object.keys(wsPatch).length > 0) {
      const wsRes = await saveWorkspaceStateDirect(wsPatch, targetUid);
      if (!wsRes.success && wsRes.error) {
        throw new Error(`Workspace migration failed: ${wsRes.error}`);
      }
    }

    // 8. Record idempotent receipt row in public.migration_receipts
    const { error: receiptErr } = await supabase.from('migration_receipts').upsert(
      {
        user_id: targetUid,
        guest_uid: guestUid,
        batch_key: batchKey,
        migrated_at: new Date().toISOString(),
        metadata: {
          plans_count: normalizedMigratedPlans.length,
          backlog_count: guestBacklog.length,
          completed_count: guestCompleted.length,
          sessions_count: guestSessions.length,
          notes_count: noteEntries.length,
        },
      },
      { onConflict: 'user_id,guest_uid,batch_key' }
    );
    if (receiptErr) {
      throw new Error(`Receipt logging failed: ${receiptErr.message}`);
    }

    // 9. Only AFTER Supabase writes + receipt succeed: copy local keys safely & remove guest keys
    if (normalizedMigratedPlans.length > 0) {
      const existingTargetPlans = readPlanHistory(targetUid);
      const mergedTargetPlans = mergeStudyPlanArrays(
        existingTargetPlans,
        normalizedMigratedPlans,
        new Set(readDeletedPlanIds(targetUid))
      );
      savePlanHistory(mergedTargetPlans, targetUid);
    }
    if (guestBacklog.length > 0 && readStoredBacklogItemsRaw(targetUid).length === 0) {
      saveBacklogItems(guestBacklog, targetUid, { skipProgression: true });
    }
    if (guestCompleted.length > 0) {
      const mergedCompleted = Array.from(new Set([...readCompleted(targetUid), ...guestCompleted]));
      saveCompleted(mergedCompleted, targetUid, { skipProgression: true });
    }
    if (noteEntries.length > 0) {
      const existingNotes = readChapterNotesCache(targetUid);
      writeChapterNotesCache({ ...guestNotes, ...existingNotes }, targetUid);
    }
    if (guestEduProfileRaw && !window.localStorage.getItem(`backlogos-education-profile-v1:${targetUid}`)) {
      window.localStorage.setItem(`backlogos-education-profile-v1:${targetUid}`, guestEduProfileRaw);
    }
    if (guestDaily && !readSmartDailyPlan(targetUid)) {
      saveSmartDailyPlan(guestDaily, targetUid);
    }
    if (guestRevisions.length > 0 && readSpacedRevisions(targetUid).length === 0) {
      saveSpacedRevisions(guestRevisions, targetUid);
    }
    if (guestRestDates.length > 0) {
      saveRestDates(Array.from(new Set([...readRestDates(targetUid), ...guestRestDates])), targetUid);
    }
    if (guestRecoveryMode && !readRecoveryModeActive(targetUid)) {
      setRecoveryModeActive(true, targetUid);
    }
    if (guestMissed && !readMissedDayRecovery(targetUid)) {
      saveMissedDayRecovery(guestMissed, targetUid);
    }
    if (guestProg.xp > readProgression(targetUid).xp) {
      saveProgressionLocalOnly({ ...guestProg, userId: targetUid });
    }

    const scopedBases = [
      'backlogos-plan-v1',
      'backlogos-plan-history-v1',
      'backlogos-deleted-plan-ids-v1',
      'backlogos-completed-v1',
      'backlogos-study-sessions-v1',
      'backlogos-rest-dates-v1',
      'backlogos-backlog-items-v2',
      'backlogos-smart-daily-plan-v2',
      'backlogos-missed-recovery-v2',
      'backlogos-spaced-revisions-v2',
      'backlogos-recovery-mode-active-v2',
      'backlogos-chapter-notes-v1',
      'backlogos-education-profile-v1',
    ];
    for (const base of scopedBases) {
      window.localStorage.removeItem(`${base}:${guestUid}`);
    }
    window.localStorage.removeItem(`backlogos-progression-v2-${guestUid}`);
    window.localStorage.setItem(localReceiptKey, 'done');
    clearStableGuestId();
    if (!options?.suppressSyncStatus) {
      emitSyncStatus('synced', null);
    }

    return { success: true, migrated: true, alreadyMigrated: false };
  } catch (err: any) {
    const message = err?.message || 'Guest migration failed';
    console.error('[supabase-service] migrateGuestDataToCloud error:', message);
    if (!options?.suppressSyncStatus) {
      emitSyncStatus('error', message);
    }
    // Guest keys deliberately preserved so retry succeeds without data loss
    return { success: false, migrated: false, alreadyMigrated: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// 8. DASHBOARD METRICS CALCULATION (Zero Math.random())
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
  _dailyHoursTarget: number = 3.5
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
// 9. COMPLETE SUPABASE REALTIME SUBSCRIPTIONS (ALL 6 WORKSPACE TABLES)
// ---------------------------------------------------------------------------

export function subscribeToStudentChanges(
  userId: string,
  callbacks: {
    onProfileChange?: () => void;
    onPlanChange?: () => void;
    onBacklogChange?: () => void;
    onTaskChange?: () => void;
    onSessionChange?: () => void;
    onNoteChange?: () => void;
  }
) {
  if (!isSupabaseConfigured || !userId || !isValidUUID(userId)) return () => {};

  const channel = supabase.channel(`student_sync_${userId}`);

  // 1. student_profiles
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'student_profiles', filter: `user_id=eq.${userId}` },
    () => callbacks.onProfileChange?.()
  );

  // 2. study_plans
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'study_plans', filter: `user_id=eq.${userId}` },
    () => callbacks.onPlanChange?.()
  );

  // 3. backlog_items
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'backlog_items', filter: `user_id=eq.${userId}` },
    () => callbacks.onBacklogChange?.()
  );

  // 4. completed_tasks
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'completed_tasks', filter: `user_id=eq.${userId}` },
    () => callbacks.onTaskChange?.()
  );

  // 5. study_sessions
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'study_sessions', filter: `user_id=eq.${userId}` },
    () => callbacks.onSessionChange?.()
  );

  // 6. chapter_notes
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'chapter_notes', filter: `user_id=eq.${userId}` },
    () => callbacks.onNoteChange?.()
  );

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.log(`[supabase-service] Subscribed to 6-table Realtime channel for user ${userId}`);
    }
  });

  return () => {
    supabase.removeChannel(channel);
  };
}
