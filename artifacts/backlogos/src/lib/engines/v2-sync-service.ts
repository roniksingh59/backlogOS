import { getActiveUserId, isSupabaseConfigured, isValidUUID, supabase } from '../supabase';
import type { BacklogItem } from '../backlog-items';
import { getCurriculumChapterById } from '../curriculum/chapters-index';
import type {
  ChapterMasteryRecord,
  ConceptMasteryRecord,
  MasteryHistoryEvent,
  NormalizedPlan,
  NormalizedPlanDay,
  PlanObjective,
  ReviewAttemptRecord,
  ReviewScheduleRecord,
} from './types';

const V2_PLANS_CACHE_KEY = 'backlogos-v2-plans-cache';
const V2_CHAPTER_MASTERY_CACHE_KEY = 'backlogos-v2-chapter-mastery';
const V2_CONCEPT_MASTERY_CACHE_KEY = 'backlogos-v2-concept-mastery';
const V2_MASTERY_HISTORY_CACHE_KEY = 'backlogos-v2-mastery-history';
const V2_REVIEW_SCHEDULE_CACHE_KEY = 'backlogos-v2-review-schedule';
const V2_REVIEW_ATTEMPTS_CACHE_KEY = 'backlogos-v2-review-attempts';

function scopedKey(base: string, userId?: string): string {
  return `${base}:${userId || getActiveUserId()}`;
}

function readJsonCache<T>(base: string, fallback: T, userId?: string): T {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(scopedKey(base, userId));
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJsonCache<T>(base: string, value: T, userId?: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(scopedKey(base, userId), JSON.stringify(value));
  } catch {
    // ignore storage quota errors
  }
}

export function isV2SchemaMissingError(error: any): boolean {
  const code = String(error?.code || '');
  const msg = String(error?.message || '').toLowerCase();
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    msg.includes('could not find the table') ||
    (msg.includes('relation') && msg.includes('does not exist'))
  );
}

// ---------------------------------------------------------------------------
// LOCAL PER-USER MIRROR CACHE ACCESSORS
// ---------------------------------------------------------------------------

export function readCachedNormalizedPlans(userId?: string): NormalizedPlan[] {
  return readJsonCache<NormalizedPlan[]>(V2_PLANS_CACHE_KEY, [], userId);
}

export function saveCachedNormalizedPlans(plans: NormalizedPlan[], userId?: string): void {
  writeJsonCache(V2_PLANS_CACHE_KEY, plans, userId);
}

export function upsertCachedNormalizedPlan(plan: NormalizedPlan, userId?: string): NormalizedPlan[] {
  const existing = readCachedNormalizedPlans(userId).filter((p) => p.id !== plan.id);
  const next = plan.isActive
    ? [plan, ...existing.map((p) => ({ ...p, isActive: false }))]
    : [plan, ...existing];
  saveCachedNormalizedPlans(next, userId);
  return next;
}

export function readCachedChapterMastery(userId?: string): ChapterMasteryRecord[] {
  return readJsonCache<ChapterMasteryRecord[]>(V2_CHAPTER_MASTERY_CACHE_KEY, [], userId);
}

export function saveCachedChapterMastery(records: ChapterMasteryRecord[], userId?: string): void {
  writeJsonCache(V2_CHAPTER_MASTERY_CACHE_KEY, records, userId);
}

export function upsertCachedChapterMastery(record: ChapterMasteryRecord, userId?: string): ChapterMasteryRecord[] {
  const current = readCachedChapterMastery(userId).filter((r) => r.chapterId !== record.chapterId);
  const next = [record, ...current];
  saveCachedChapterMastery(next, userId);
  return next;
}

export function readCachedConceptMastery(userId?: string): ConceptMasteryRecord[] {
  return readJsonCache<ConceptMasteryRecord[]>(V2_CONCEPT_MASTERY_CACHE_KEY, [], userId);
}

export function saveCachedConceptMastery(records: ConceptMasteryRecord[], userId?: string): void {
  writeJsonCache(V2_CONCEPT_MASTERY_CACHE_KEY, records, userId);
}

export function readCachedMasteryHistory(userId?: string): MasteryHistoryEvent[] {
  return readJsonCache<MasteryHistoryEvent[]>(V2_MASTERY_HISTORY_CACHE_KEY, [], userId);
}

export function appendCachedMasteryHistory(event: MasteryHistoryEvent, userId?: string): MasteryHistoryEvent[] {
  const existing = readCachedMasteryHistory(userId).filter((e) => e.id !== event.id);
  const next = [event, ...existing].slice(0, 250);
  writeJsonCache(V2_MASTERY_HISTORY_CACHE_KEY, next, userId);
  return next;
}

export function readCachedReviewSchedules(userId?: string): ReviewScheduleRecord[] {
  return readJsonCache<ReviewScheduleRecord[]>(V2_REVIEW_SCHEDULE_CACHE_KEY, [], userId);
}

export function saveCachedReviewSchedules(schedules: ReviewScheduleRecord[], userId?: string): void {
  writeJsonCache(V2_REVIEW_SCHEDULE_CACHE_KEY, schedules, userId);
}

export function readCachedReviewAttempts(userId?: string): ReviewAttemptRecord[] {
  return readJsonCache<ReviewAttemptRecord[]>(V2_REVIEW_ATTEMPTS_CACHE_KEY, [], userId);
}

export function appendCachedReviewAttempt(attempt: ReviewAttemptRecord, userId?: string): void {
  const existing = readCachedReviewAttempts(userId).filter((a) => a.id !== attempt.id);
  writeJsonCache(V2_REVIEW_ATTEMPTS_CACHE_KEY, [attempt, ...existing].slice(0, 250), userId);
}

// ---------------------------------------------------------------------------
// SUPABASE V2 RELATIONAL PERSISTENCE (Authenticated UUID Users Only)
// ---------------------------------------------------------------------------

export interface V2SyncResult {
  success: boolean;
  v2SchemaReady: boolean;
  error?: string;
}

/**
 * Persists a NormalizedPlan into public.plans, public.plan_days, and public.objectives.
 */
export async function syncNormalizedPlanToSupabase(
  plan: NormalizedPlan,
  explicitUserId?: string
): Promise<V2SyncResult> {
  upsertCachedNormalizedPlan(plan, explicitUserId);

  if (!isSupabaseConfigured) {
    return { success: true, v2SchemaReady: false };
  }

  const userId = explicitUserId && isValidUUID(explicitUserId) ? explicitUserId : null;
  if (!userId) {
    return { success: true, v2SchemaReady: true };
  }

  const planId = isValidUUID(plan.id) ? plan.id : null;
  if (!planId) {
    return { success: false, v2SchemaReady: true, error: 'Plan ID must be a valid UUID for cloud persistence.' };
  }

  try {
    if (plan.isActive) {
      await supabase
        .from('plans')
        .update({ is_active: false })
        .eq('user_id', userId)
        .neq('id', planId);
    }

    const { error: planErr } = await supabase.from('plans').upsert(
      {
        id: planId,
        user_id: userId,
        name: plan.name,
        plan_horizon_days: plan.planHorizonDays,
        is_active: plan.isActive,
        status: plan.status || 'active',
        board: plan.board,
        goal: plan.goal,
        priority: plan.priority,
        confidence: plan.confidence,
        exam_date: plan.examDate || '',
        start_date: plan.startDate,
        minutes_per_day: plan.minutesPerDay,
        subjects: plan.subjects,
        selected_chapter_ids: plan.selectedChapterIds,
        prerequisite_chapter_ids: plan.prerequisiteChapterIds,
        order_reason: plan.orderReason,
        coverage_note: plan.coverageNote,
        reschedule_count: plan.rescheduleCount || 0,
        last_rescheduled_at: plan.lastRescheduledAt || null,
        legacy_study_plan_id: planId,
      },
      { onConflict: 'id' }
    );

    if (planErr) {
      if (isV2SchemaMissingError(planErr)) {
        console.warn('[v2-sync] Normalized plans table not yet deployed in Supabase:', planErr.message);
        return { success: false, v2SchemaReady: false, error: planErr.message };
      }
      return { success: false, v2SchemaReady: true, error: planErr.message };
    }

    if (plan.days.length > 0) {
      const dayRows = plan.days.map((d) => ({
        id: d.id,
        plan_id: planId,
        user_id: userId,
        day_number: d.dayNumber,
        scheduled_date: d.scheduledDate,
        title: d.title,
        focus_theme: d.focusTheme,
        allocated_minutes: d.allocatedMinutes,
        max_capacity_minutes: d.maxCapacityMinutes,
        is_recovery_day: d.isRecoveryDay,
      }));

      const { error: daysErr } = await supabase
        .from('plan_days')
        .upsert(dayRows, { onConflict: 'plan_id,day_number' });

      if (daysErr) {
        return { success: false, v2SchemaReady: true, error: daysErr.message };
      }

      // Fetch persisted day UUIDs so objectives reference exact foreign keys
      const { data: persistedDays } = await supabase
        .from('plan_days')
        .select('id, day_number')
        .eq('plan_id', planId)
        .eq('user_id', userId);

      const dayIdByNumber = new Map<number, string>();
      if (Array.isArray(persistedDays)) {
        for (const row of persistedDays) {
          dayIdByNumber.set(Number(row.day_number), String(row.id));
        }
      }

      const objectiveRows = plan.days.flatMap((d) =>
        d.objectives.map((obj) => ({
          id: obj.id,
          plan_id: planId,
          plan_day_id: dayIdByNumber.get(d.dayNumber) || d.id,
          user_id: userId,
          chapter_id: obj.chapterId,
          concept_id: obj.conceptId || null,
          subject_name: obj.subjectName,
          title: obj.title,
          description: obj.description,
          kind: obj.kind,
          state: obj.state,
          priority_score: obj.priorityScore,
          estimated_minutes: obj.estimatedMinutes,
          actual_minutes: obj.actualMinutes,
          sequence_order: obj.sequenceOrder,
          scheduled_date: d.scheduledDate,
          missed_count: obj.missedCount || 0,
          rescheduled_from_day_id: obj.rescheduledFromDayId || null,
          legacy_task_key: obj.legacyTaskKey,
          studied_at: obj.studiedAt || null,
          verified_at: obj.verifiedAt || null,
        }))
      );

      if (objectiveRows.length > 0) {
        const { error: objErr } = await supabase
          .from('objectives')
          .upsert(objectiveRows, { onConflict: 'user_id,legacy_task_key' });
        if (objErr) {
          return { success: false, v2SchemaReady: true, error: objErr.message };
        }
      }
    }

    return { success: true, v2SchemaReady: true };
  } catch (err: any) {
    return {
      success: false,
      v2SchemaReady: !isV2SchemaMissingError(err),
      error: err?.message || 'Failed syncing normalized plan',
    };
  }
}

/**
 * Updates a single objective row state (e.g. PENDING -> IN_PROGRESS -> STUDIED -> VERIFICATION_PENDING).
 * Note: Passing objective verification requires the Edge Function `submit-assessment` to grant VERIFIED.
 */
export async function syncObjectiveStateToSupabase(
  objective: PlanObjective,
  explicitUserId?: string
): Promise<V2SyncResult> {
  if (!isSupabaseConfigured || !explicitUserId || !isValidUUID(explicitUserId)) {
    return { success: true, v2SchemaReady: false };
  }

  try {
    const { error } = await supabase
      .from('objectives')
      .update({
        state: objective.state,
        actual_minutes: objective.actualMinutes,
        studied_at: objective.studiedAt || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', objective.id)
      .eq('user_id', explicitUserId);

    if (error) {
      if (isV2SchemaMissingError(error)) {
        return { success: false, v2SchemaReady: false, error: error.message };
      }
      return { success: false, v2SchemaReady: true, error: error.message };
    }
    return { success: true, v2SchemaReady: true };
  } catch (err: any) {
    return { success: false, v2SchemaReady: true, error: err?.message };
  }
}

/**
 * Maps legacy BacklogItem to normalized student_backlog status safely without ever
 * silently promoting legacy completed chapters to MASTERED.
 */
function toNormalizedBacklogStatus(
  item: BacklogItem,
  masteryRecord?: ChapterMasteryRecord
): string {
  if (masteryRecord?.status) return masteryRecord.status;
  if (item.status === 'completed') return 'STUDY_COMPLETE';
  if (item.status === 'learning' || item.status === 'practicing' || item.status === 'revision') {
    return 'IN_PROGRESS';
  }
  return 'NOT_STARTED';
}

export async function syncBacklogToStudentBacklogTable(
  items: BacklogItem[],
  explicitUserId?: string,
  masteryMap: Map<string, ChapterMasteryRecord> = new Map()
): Promise<V2SyncResult> {
  if (!isSupabaseConfigured || !explicitUserId || !isValidUUID(explicitUserId) || items.length === 0) {
    return { success: true, v2SchemaReady: false };
  }

  try {
    const rows = items.map((item) => {
      const catalog = getCurriculumChapterById(item.chapterId);
      const existingMastery = masteryMap.get(item.chapterId);
      return {
        user_id: explicitUserId,
        chapter_id: item.chapterId,
        catalog_chapter_id: catalog?.id || null,
        subject_id: catalog?.subjectId || null,
        subject_name: item.subject || catalog?.subjectName || 'Physics',
        chapter_title: item.topic || catalog?.title || item.chapterId,
        status: toNormalizedBacklogStatus(item, existingMastery),
        priority: item.examRelevance === 'critical' ? 'critical' : 'high',
        difficulty: item.difficulty || 'medium',
        confidence: item.confidence || 'medium',
        exam_relevance: item.examRelevance || 'high',
        estimated_minutes: Math.max(0, Math.round((Number(item.estimatedHours) || 5) * 60)),
        minutes_spent: Math.max(0, Math.round((Number(item.hoursSpent) || 0) * 60)),
        prerequisite_chapter_ids: Array.isArray(item.prerequisites) ? item.prerequisites : [],
        deadline: item.deadline || null,
        notes: item.notes || null,
        legacy_backlog_item_id: item.id,
      };
    });

    const { error } = await supabase
      .from('student_backlog')
      .upsert(rows, { onConflict: 'user_id,chapter_id' });

    if (error) {
      if (isV2SchemaMissingError(error)) {
        return { success: false, v2SchemaReady: false, error: error.message };
      }
      return { success: false, v2SchemaReady: true, error: error.message };
    }
    return { success: true, v2SchemaReady: true };
  } catch (err: any) {
    return { success: false, v2SchemaReady: true, error: err?.message };
  }
}

export async function appendMasteryHistoryEventToSupabase(
  event: MasteryHistoryEvent,
  explicitUserId?: string
): Promise<V2SyncResult> {
  appendCachedMasteryHistory(event, explicitUserId);

  if (!isSupabaseConfigured || !explicitUserId || !isValidUUID(explicitUserId)) {
    return { success: true, v2SchemaReady: false };
  }

  try {
    const { error } = await supabase.from('mastery_history').insert({
      user_id: explicitUserId,
      chapter_id: event.chapterId,
      concept_id: event.conceptId || null,
      event_type: event.eventType,
      previous_status: event.previousStatus || null,
      new_status: event.newStatus,
      score_percent: event.scorePercent ?? null,
      attempt_id: isValidUUID(event.attemptId || '') ? event.attemptId : null,
      notes: event.notes,
      recorded_at: event.recordedAt,
    });

    if (error) {
      if (isV2SchemaMissingError(error)) {
        return { success: false, v2SchemaReady: false, error: error.message };
      }
      return { success: false, v2SchemaReady: true, error: error.message };
    }
    return { success: true, v2SchemaReady: true };
  } catch (err: any) {
    return { success: false, v2SchemaReady: true, error: err?.message };
  }
}

export async function syncReviewScheduleToSupabase(
  schedule: ReviewScheduleRecord,
  explicitUserId?: string
): Promise<V2SyncResult> {
  const existing = readCachedReviewSchedules(explicitUserId).filter(
    (s) => s.id !== schedule.id
  );
  saveCachedReviewSchedules([schedule, ...existing], explicitUserId);

  if (!isSupabaseConfigured || !explicitUserId || !isValidUUID(explicitUserId)) {
    return { success: true, v2SchemaReady: false };
  }

  try {
    const row: Record<string, any> = {
      user_id: explicitUserId,
      chapter_id: schedule.chapterId,
      concept_id: schedule.conceptId || null,
      interval_step: schedule.intervalStep,
      interval_days: schedule.intervalDays,
      ease_factor: schedule.easeFactor,
      due_date: schedule.dueDate,
      status: schedule.status,
      retention_health_score: schedule.retentionHealthScore,
      last_reviewed_at: schedule.lastReviewedAt || null,
    };

    if (isValidUUID(schedule.id)) {
      row.id = schedule.id;
    }

    const { error } = await supabase.from('review_schedule').upsert(row);
    if (error) {
      if (isV2SchemaMissingError(error)) {
        return { success: false, v2SchemaReady: false, error: error.message };
      }
      return { success: false, v2SchemaReady: true, error: error.message };
    }
    return { success: true, v2SchemaReady: true };
  } catch (err: any) {
    return { success: false, v2SchemaReady: true, error: err?.message };
  }
}

export interface HydratedV2WorkspaceData {
  v2SchemaReady: boolean;
  plans: NormalizedPlan[];
  chapterMastery: ChapterMasteryRecord[];
  conceptMastery: ConceptMasteryRecord[];
  masteryHistory: MasteryHistoryEvent[];
  reviewSchedules: ReviewScheduleRecord[];
  errors: string[];
}

/**
 * Hydrates all normalized Phase 2 tables for an authenticated user directly from Supabase.
 * Gracefully degrades to per-user cached state if v2 SQL migrations are not yet applied remotely.
 */
export async function loadV2WorkspaceFromSupabase(
  explicitUserId?: string
): Promise<HydratedV2WorkspaceData> {
  const userId =
    explicitUserId && isValidUUID(explicitUserId) ? explicitUserId : null;

  if (!isSupabaseConfigured || !userId) {
    return {
      v2SchemaReady: false,
      plans: readCachedNormalizedPlans(explicitUserId),
      chapterMastery: readCachedChapterMastery(explicitUserId),
      conceptMastery: readCachedConceptMastery(explicitUserId),
      masteryHistory: readCachedMasteryHistory(explicitUserId),
      reviewSchedules: readCachedReviewSchedules(explicitUserId),
      errors: [],
    };
  }

  const errors: string[] = [];

  const [
    plansRes,
    daysRes,
    objRes,
    chMasteryRes,
    conMasteryRes,
    historyRes,
    reviewRes,
  ] = await Promise.all([
    supabase
      .from('plans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('plan_days')
      .select('*')
      .eq('user_id', userId)
      .order('day_number', { ascending: true }),
    supabase
      .from('objectives')
      .select('*')
      .eq('user_id', userId)
      .order('sequence_order', { ascending: true }),
    supabase.from('chapter_mastery').select('*').eq('user_id', userId),
    supabase.from('concept_mastery').select('*').eq('user_id', userId),
    supabase
      .from('mastery_history')
      .select('*')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false })
      .limit(150),
    supabase
      .from('review_schedule')
      .select('*')
      .eq('user_id', userId)
      .order('due_date', { ascending: true }),
  ]);

  const anyMissing = [
    plansRes.error,
    daysRes.error,
    objRes.error,
    chMasteryRes.error,
    conMasteryRes.error,
    historyRes.error,
    reviewRes.error,
  ].some((err) => err && isV2SchemaMissingError(err));

  if (anyMissing) {
    return {
      v2SchemaReady: false,
      plans: readCachedNormalizedPlans(userId),
      chapterMastery: readCachedChapterMastery(userId),
      conceptMastery: readCachedConceptMastery(userId),
      masteryHistory: readCachedMasteryHistory(userId),
      reviewSchedules: readCachedReviewSchedules(userId),
      errors: ['V2 schema tables pending migration in Supabase SQL Editor.'],
    };
  }

  for (const res of [
    plansRes,
    daysRes,
    objRes,
    chMasteryRes,
    conMasteryRes,
    historyRes,
    reviewRes,
  ]) {
    if (res.error) errors.push(res.error.message);
  }

  const objByDayId = new Map<string, PlanObjective[]>();
  for (const row of objRes.data || []) {
    const mapped: PlanObjective = {
      id: String(row.id),
      planId: String(row.plan_id),
      planDayId: String(row.plan_day_id),
      userId: String(row.user_id),
      dayNumber: 1,
      chapterId: String(row.chapter_id),
      conceptId: row.concept_id ? String(row.concept_id) : null,
      subjectName: String(row.subject_name || 'Physics'),
      title: String(row.title || ''),
      description: String(row.description || ''),
      kind: (row.kind || 'learn') as any,
      state: (row.state || 'PENDING') as any,
      priorityScore: Number(row.priority_score || 50),
      estimatedMinutes: Number(row.estimated_minutes || 30),
      actualMinutes: Number(row.actual_minutes || 0),
      sequenceOrder: Number(row.sequence_order || 1),
      scheduledDate: row.scheduled_date ? String(row.scheduled_date) : null,
      missedCount: Number(row.missed_count || 0),
      rescheduledFromDayId: row.rescheduled_from_day_id
        ? String(row.rescheduled_from_day_id)
        : null,
      legacyTaskKey: String(row.legacy_task_key || row.id),
      studiedAt: row.studied_at || null,
      verifiedAt: row.verified_at || null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
    if (!objByDayId.has(mapped.planDayId)) {
      objByDayId.set(mapped.planDayId, []);
    }
    objByDayId.get(mapped.planDayId)!.push(mapped);
  }

  const daysByPlanId = new Map<string, NormalizedPlanDay[]>();
  for (const row of daysRes.data || []) {
    const dayId = String(row.id);
    const dayNum = Number(row.day_number || 1);
    const objs = (objByDayId.get(dayId) || []).map((o) => ({
      ...o,
      dayNumber: dayNum,
    }));
    const mappedDay: NormalizedPlanDay = {
      id: dayId,
      planId: String(row.plan_id),
      dayNumber: dayNum,
      scheduledDate: String(row.scheduled_date || ''),
      title: String(row.title || `Day ${dayNum}`),
      focusTheme: String(row.focus_theme || ''),
      dayOfWeekLabel: '',
      rhythmBadge: row.is_recovery_day ? 'Recovery Day' : '',
      allocatedMinutes: Number(row.allocated_minutes || 0),
      maxCapacityMinutes: Number(row.max_capacity_minutes || 180),
      isRecoveryDay: Boolean(row.is_recovery_day),
      isPrerequisiteDay: false,
      isRecap: false,
      primaryChapterId: objs[0]?.chapterId || '',
      secondaryChapterId: objs.find((o) => o.chapterId !== objs[0]?.chapterId)
        ?.chapterId,
      objectives: objs,
    };
    if (!daysByPlanId.has(mappedDay.planId)) {
      daysByPlanId.set(mappedDay.planId, []);
    }
    daysByPlanId.get(mappedDay.planId)!.push(mappedDay);
  }

  const plans: NormalizedPlan[] = (plansRes.data || []).map((row) => ({
    id: String(row.id),
    userId: String(row.user_id),
    name: String(row.name || 'Study Plan'),
    planHorizonDays: Number(row.plan_horizon_days || 7),
    isActive: Boolean(row.is_active),
    status: (row.status || 'active') as any,
    board: String(row.board || 'CBSE'),
    goal: String(row.goal || ''),
    priority: String(row.priority || 'backlog recovery'),
    confidence: (row.confidence || 'mixed') as any,
    examDate: String(row.exam_date || ''),
    startDate: String(row.start_date || ''),
    minutesPerDay: Number(row.minutes_per_day || 180),
    subjects: Array.isArray(row.subjects) ? row.subjects : [],
    selectedChapterIds: Array.isArray(row.selected_chapter_ids)
      ? row.selected_chapter_ids
      : [],
    orderedChapterIds: Array.isArray(row.selected_chapter_ids)
      ? row.selected_chapter_ids
      : [],
    prerequisiteChapterIds: Array.isArray(row.prerequisite_chapter_ids)
      ? row.prerequisite_chapter_ids
      : [],
    prerequisiteWarnings: [],
    orderReason: String(row.order_reason || ''),
    coverageNote: String(row.coverage_note || ''),
    rescheduleCount: Number(row.reschedule_count || 0),
    lastRescheduledAt: row.last_rescheduled_at || null,
    days: daysByPlanId.get(String(row.id)) || [],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }));

  const chapterMastery: ChapterMasteryRecord[] = (chMasteryRes.data || []).map(
    (row) => ({
      id: String(row.id),
      userId: String(row.user_id),
      chapterId: String(row.chapter_id),
      subjectId: row.subject_id ? String(row.subject_id) : null,
      status: (row.status || 'NOT_STARTED') as any,
      studyCompleted: Boolean(row.study_completed),
      masteryScore: Number(row.mastery_score || 0),
      bestMasteryScore: Number(row.best_mastery_score || 0),
      conceptCoveragePercent: Number(row.concept_coverage_percent || 0),
      attemptsCount: Number(row.attempts_count || 0),
      lastAssessmentAttemptId: row.last_assessment_attempt_id || null,
      studyCompletedAt: row.study_completed_at || null,
      firstMasteredAt: row.first_mastered_at || null,
      lastMasteredAt: row.last_mastered_at || null,
      updatedAt: String(row.updated_at),
    })
  );

  const conceptMastery: ConceptMasteryRecord[] = (conMasteryRes.data || []).map(
    (row) => ({
      id: String(row.id),
      userId: String(row.user_id),
      chapterId: String(row.chapter_id),
      conceptId: String(row.concept_id),
      catalogConceptId: row.catalog_concept_id || null,
      conceptTitle: String(row.concept_title || row.concept_id),
      masteryScore: Number(row.mastery_score || 0),
      attemptsCount: Number(row.attempts_count || 0),
      correctCount: Number(row.correct_count || 0),
      status: (row.status || 'UNASSESSED') as any,
      lastAssessedAt: row.last_assessed_at || null,
      updatedAt: String(row.updated_at),
    })
  );

  const masteryHistory: MasteryHistoryEvent[] = (historyRes.data || []).map(
    (row) => ({
      id: String(row.id),
      userId: String(row.user_id),
      chapterId: String(row.chapter_id),
      conceptId: row.concept_id || null,
      eventType: row.event_type as any,
      previousStatus: row.previous_status || null,
      newStatus: String(row.new_status),
      scorePercent:
        row.score_percent !== null && row.score_percent !== undefined
          ? Number(row.score_percent)
          : null,
      attemptId: row.attempt_id || null,
      notes: String(row.notes || ''),
      recordedAt: String(row.recorded_at),
    })
  );

  const reviewSchedules: ReviewScheduleRecord[] = (reviewRes.data || []).map(
    (row) => {
      const ch = getCurriculumChapterById(String(row.chapter_id));
      return {
        id: String(row.id),
        userId: String(row.user_id),
        chapterId: String(row.chapter_id),
        chapterTitle: ch?.title || String(row.chapter_id),
        subjectName: ch?.subjectName || 'Physics',
        conceptId: row.concept_id || null,
        intervalStep: Number(row.interval_step || 1),
        intervalDays: Number(row.interval_days || 1),
        easeFactor: Number(row.ease_factor || 2.5),
        dueDate: String(row.due_date),
        status: (row.status || 'SCHEDULED') as any,
        retentionHealthScore: Number(row.retention_health_score ?? 100),
        lastReviewedAt: row.last_reviewed_at || null,
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
      };
    }
  );

  if (plans.length > 0) saveCachedNormalizedPlans(plans, userId);
  if (chapterMastery.length > 0) saveCachedChapterMastery(chapterMastery, userId);
  if (conceptMastery.length > 0) saveCachedConceptMastery(conceptMastery, userId);
  if (reviewSchedules.length > 0) saveCachedReviewSchedules(reviewSchedules, userId);
  if (masteryHistory.length > 0) writeJsonCache(V2_MASTERY_HISTORY_CACHE_KEY, masteryHistory, userId);

  return {
    v2SchemaReady: true,
    plans,
    chapterMastery,
    conceptMastery,
    masteryHistory,
    reviewSchedules,
    errors,
  };
}
