import { makePlan, chapters, type StudentPlan, type StudentPlanInput } from './backlog-data';
import {
  type BacklogItem,
  generateDefaultBacklogItems,
} from './backlog-items';
import {
  type SpacedRevision,
  generateSpacedRevisions,
  DEFAULT_REVISION_SETTINGS,
} from './revisions';
import { type TestLog } from './test-log';
import { type SmartDailyPlan, type MissedDayRecoveryPlan } from './smart-planner';
import { getCurrentSessionToken, getActiveUserId } from './supabase';
import { recordAcademicAction } from './progression/progression-service';

const PLAN_KEY = 'backlogos-plan-v1';
const DONE_KEY = 'backlogos-completed-v1';
const REST_DATES_KEY = 'backlogos-rest-dates-v1';
const SESSIONS_KEY = 'backlogos-study-sessions-v1';
const NOTES_KEY = 'backlogos-notes-v1';

// Enhanced BacklogOS storage keys
const BACKLOG_ITEMS_KEY = 'backlogos-backlog-items-v2';
const DAILY_PLAN_KEY = 'backlogos-smart-daily-plan-v2';
const RECOVERY_PLAN_KEY = 'backlogos-missed-recovery-v2';
const REVISIONS_KEY = 'backlogos-spaced-revisions-v2';
const TEST_LOGS_KEY = 'backlogos-test-logs-v2';
const RECOVERY_MODE_ACTIVE_KEY = 'backlogos-recovery-mode-active-v2';

function getScopedKey(baseKey: string, specificUserId?: string): string {
  const uid = specificUserId || getActiveUserId();
  return `${baseKey}:${uid}`;
}

export function getStoredItem(baseKey: string, specificUserId?: string): string | null {
  const scopedKey = getScopedKey(baseKey, specificUserId);
  const scopedVal = localStorage.getItem(scopedKey);
  if (scopedVal !== null) return scopedVal;

  // Legacy single-user backward-compatible fallback for the initial active user only
  const activeUid = specificUserId || getActiveUserId();
  if (activeUid !== 'default-student' && !activeUid.startsWith('guest-')) {
    const legacyVal = localStorage.getItem(baseKey);
    if (legacyVal !== null) {
      localStorage.setItem(scopedKey, legacyVal);
      return legacyVal;
    }
  }
  return null;
}

export function setStoredItem(baseKey: string, value: string, specificUserId?: string) {
  const scopedKey = getScopedKey(baseKey, specificUserId);
  localStorage.setItem(scopedKey, value);
}

export function removeStoredItem(baseKey: string, specificUserId?: string) {
  const scopedKey = getScopedKey(baseKey, specificUserId);
  localStorage.removeItem(scopedKey);
}

async function syncWithServer(url: string, body: any) {
  try {
    const token = await getCurrentSessionToken();
    if (!token) return;
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    // Offline or network error - local storage is authoritative
  }
}

export function readPlan(userId?: string): StudentPlan | null {
  try {
    const raw = getStoredItem(PLAN_KEY, userId);
    if (!raw) return null;

    const saved = JSON.parse(raw) as Partial<StudentPlan> & StudentPlanInput;
    if (Array.isArray(saved.plannedChapterIds) && Array.isArray(saved.days)) {
      // Auto-purge obsolete 'phy-world' (Physical World) from legacy persisted plans
      const hasObsoletePhyWorld =
        saved.plannedChapterIds.includes('phy-world') ||
        (saved.chapterIds && saved.chapterIds.includes('phy-world')) ||
        saved.days.some((d) => d.chapterId === 'phy-world' || d.theme.toLowerCase().includes('physical world'));

      if (hasObsoletePhyWorld && saved.board && Array.isArray(saved.subjects)) {
        const cleanedChapterIds = (saved.chapterIds || saved.plannedChapterIds).filter((id) => id !== 'phy-world');
        const recomputed = makePlan({
          board: saved.board,
          subjects: saved.subjects,
          chapterIds: cleanedChapterIds.length > 0 ? cleanedChapterIds : ['phy-units'],
          minutesPerDay: saved.minutesPerDay || 60,
          goal: saved.goal ?? '',
          priority: saved.priority ?? 'backlog recovery',
          confidence: saved.confidence ?? 'mixed',
          examDate: saved.examDate ?? '',
        });
        savePlan(recomputed, userId);
        return recomputed;
      }

      const resolvedChapterIds = (saved.chapterIds && Array.isArray(saved.chapterIds) && saved.chapterIds.length > 0)
        ? saved.chapterIds
        : (saved.plannedChapterIds && Array.isArray(saved.plannedChapterIds) && saved.plannedChapterIds.length > 0)
        ? saved.plannedChapterIds
        : (saved.days && Array.isArray(saved.days) ? Array.from(new Set(saved.days.map((d) => d.chapterId))) : ['phy-units']);

      return {
        board: saved.board || 'CBSE Class 12',
        subjects: saved.subjects || ['Physics', 'Chemistry', 'Mathematics'],
        goal: saved.goal || 'Complete Backlog Recovery',
        priority: saved.priority || 'backlog recovery',
        confidence: saved.confidence ?? 'mixed',
        examDate: saved.examDate ?? '',
        ...saved,
        chapterIds: resolvedChapterIds,
        plannedChapterIds: saved.plannedChapterIds || resolvedChapterIds,
        minutesPerDay: saved.minutesPerDay || ((saved as any).hoursPerDay ? (saved as any).hoursPerDay * 60 : 240),
        planDuration: saved.planDuration ?? (saved.days ? (saved.days.length as any) : 7) ?? 7,
      } as StudentPlan;
    }

    if (
      saved.board &&
      Array.isArray(saved.subjects) &&
      Array.isArray(saved.chapterIds) &&
      saved.minutesPerDay
    ) {
      const migrated = makePlan({
        board: saved.board,
        subjects: saved.subjects,
        chapterIds: saved.chapterIds,
        minutesPerDay: saved.minutesPerDay,
        goal: saved.goal ?? '',
        priority: saved.priority ?? 'backlog recovery',
        confidence: saved.confidence ?? 'mixed',
        examDate: saved.examDate ?? '',
      });
      saveCompleted([], userId);
      savePlan(migrated, userId);
      return migrated;
    }

    return null;
  } catch {
    return null;
  }
}

export function savePlan(plan: StudentPlan, userId?: string) {
  setStoredItem(PLAN_KEY, JSON.stringify(plan), userId);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('backlogos-plan-updated', { detail: plan }));
    window.dispatchEvent(new Event('storage'));
  }
  syncWithServer('/api/plan', plan);
}

export function readCompleted(userId?: string): string[] {
  try {
    const raw = getStoredItem(DONE_KEY, userId);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function saveCompleted(ids: string[], userId?: string) {
  const previous = readCompleted(userId);
  const newIds = ids.filter((id) => !previous.includes(id));

  setStoredItem(DONE_KEY, JSON.stringify(ids), userId);
  syncWithServer('/api/completed', { chapterIds: ids });

  // Reward XP for genuinely new chapter completions (anti-gaming deduplication handles repeated completions)
  for (const cid of newIds) {
    const result = recordAcademicAction({ type: 'complete_chapter', chapterId: cid });
    if (result && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('backlogos-academic-achievement', { detail: result }));
    }
  }
}

export function clearStoredPlan(userId?: string) {
  removeStoredItem(PLAN_KEY, userId);
  removeStoredItem(DONE_KEY, userId);
  removeStoredItem(SESSIONS_KEY, userId);
  removeStoredItem(NOTES_KEY, userId);
  removeStoredItem(REST_DATES_KEY, userId);
  removeStoredItem('backlogos-draft-v1', userId);
  removeStoredItem(BACKLOG_ITEMS_KEY, userId);
  removeStoredItem(DAILY_PLAN_KEY, userId);
  removeStoredItem(RECOVERY_PLAN_KEY, userId);
  removeStoredItem(REVISIONS_KEY, userId);
  removeStoredItem(TEST_LOGS_KEY, userId);
  removeStoredItem(RECOVERY_MODE_ACTIVE_KEY, userId);
}

export function clearActiveUserStorage(userId: string) {
  clearStoredPlan(userId);
}

export type StudySession = {
  id: string;
  chapterId: string;
  minutes: number;
  completedAt: string;
  mode: 'focus' | 'review';
  taskId?: string;
  notes?: string;
};

export function readStudySessions(userId?: string): StudySession[] {
  try {
    const raw = getStoredItem(SESSIONS_KEY, userId);
    return raw ? (JSON.parse(raw) as StudySession[]) : [];
  } catch {
    return [];
  }
}

export function saveStudySession(session: StudySession, userId?: string) {
  const next = [session, ...readStudySessions(userId)].slice(0, 150);
  setStoredItem(SESSIONS_KEY, JSON.stringify(next), userId);
  syncWithServer('/api/sessions', session);

  // Directly update backlog item progress if linked
  if (session.chapterId) {
    const items = readBacklogItems(userId);
    const itemIndex = items.findIndex((i) => i.chapterId === session.chapterId);
    if (itemIndex >= 0) {
      const target = items[itemIndex];
      const addedHours = Math.round((session.minutes / 60) * 10) / 10;
      target.hoursSpent = Math.round((target.hoursSpent + addedHours) * 10) / 10;
      if (target.status === 'not_started') {
        target.status = 'learning';
      }
      saveBacklogItems(items, userId);
    }
  }

  // Award XP for completing academic study session & update streak
  const sessionResult = recordAcademicAction({
    type: 'complete_session',
    sessionId: session.id,
    minutes: session.minutes,
    chapterId: session.chapterId,
  });
  if (sessionResult && typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('backlogos-academic-achievement', { detail: sessionResult })
    );
  }
}

export function readNotes(userId?: string): Record<string, string> {
  try {
    const raw = getStoredItem(NOTES_KEY, userId);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function saveNote(chapterId: string, note: string, userId?: string) {
  const notes = readNotes(userId);
  if (note.trim()) notes[chapterId] = note;
  else delete notes[chapterId];
  setStoredItem(NOTES_KEY, JSON.stringify(notes), userId);
  syncWithServer('/api/notes', { chapterId, note });
}

export function readRestDates(userId?: string): string[] {
  try {
    const raw = getStoredItem(REST_DATES_KEY, userId);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function toggleRestDate(date: string, userId?: string) {
  const dates = readRestDates(userId);
  const next = dates.includes(date) ? dates.filter((item) => item !== date) : [...dates, date];
  setStoredItem(REST_DATES_KEY, JSON.stringify(next), userId);
  return next;
}

// ----------------------------------------------------------------------
// SMART BACKLOG ITEMS STORAGE
// ----------------------------------------------------------------------

export function readBacklogItems(userId?: string): BacklogItem[] {
  try {
    const raw = getStoredItem(BACKLOG_ITEMS_KEY, userId);
    if (raw) {
      const parsed = JSON.parse(raw) as BacklogItem[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }

    // Auto-seed from existing plan if student has a plan
    const currentPlan = readPlan(userId);
    if (currentPlan?.chapterIds && currentPlan.chapterIds.length > 0) {
      const defaultItems = generateDefaultBacklogItems(currentPlan.chapterIds);

      // Sync any existing completed chapters
      const completedIds = new Set(readCompleted(userId));
      defaultItems.forEach((item) => {
        if (completedIds.has(item.chapterId)) {
          item.status = 'completed';
          item.hoursSpent = item.estimatedHours;
        }
      });

      setStoredItem(BACKLOG_ITEMS_KEY, JSON.stringify(defaultItems), userId);
      return defaultItems;
    }

    // For new students with no saved plan: do NOT fabricate random hours. Return empty.
    return [];
  } catch {
    return [];
  }
}

export function saveBacklogItems(items: BacklogItem[], userId?: string) {
  setStoredItem(BACKLOG_ITEMS_KEY, JSON.stringify(items), userId);
  syncWithServer('/api/backlog', { items });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('backlogos-backlog-updated', { detail: { userId } }));
  }

  // Sync completed chapters list
  const completedIds = items
    .filter((item) => item.status === 'completed')
    .map((item) => item.chapterId);
  saveCompleted(completedIds, userId);
}

export function addBacklogItem(item: BacklogItem, userId?: string): BacklogItem[] {
  const items = readBacklogItems(userId);
  const updated = [item, ...items];
  saveBacklogItems(updated, userId);
  return updated;
}

export function updateBacklogItem(id: string, updates: Partial<BacklogItem>, userId?: string): BacklogItem[] {
  const items = readBacklogItems(userId);
  const updated = items.map((item) => {
    if (item.id === id) {
      const wasCompleted = item.status === 'completed';
      const isNowCompleted = updates.status === 'completed';

      const merged = { ...item, ...updates };

      // If transitioning to completed, auto-schedule spaced revisions & award completion XP
      if (!wasCompleted && isNowCompleted) {
        merged.completedAt = new Date().toISOString();
        const newRevisions = generateSpacedRevisions(merged.chapterId, new Date());
        saveSpacedRevisions([...readSpacedRevisions(userId), ...newRevisions], userId);

        const chapterRes = recordAcademicAction({
          type: 'complete_chapter',
          chapterId: merged.chapterId,
        });
        const backlogRes = recordAcademicAction({
          type: 'clear_backlog_item',
          chapterId: merged.chapterId,
        });
        if (typeof window !== 'undefined') {
          if (chapterRes) {
            window.dispatchEvent(
              new CustomEvent('backlogos-academic-achievement', { detail: chapterRes })
            );
          }
          if (backlogRes) {
            window.dispatchEvent(
              new CustomEvent('backlogos-academic-achievement', { detail: backlogRes })
            );
          }
        }
      }

      return merged;
    }
    return item;
  });

  saveBacklogItems(updated, userId);
  return updated;
}

export function deleteBacklogItem(id: string, userId?: string): BacklogItem[] {
  const items = readBacklogItems(userId);
  const updated = items.filter((item) => item.id !== id);
  saveBacklogItems(updated, userId);
  return updated;
}

// ----------------------------------------------------------------------
// SMART DAILY PLAN STORAGE
// ----------------------------------------------------------------------

export function readSmartDailyPlan(userId?: string): SmartDailyPlan | null {
  try {
    const raw = getStoredItem(DAILY_PLAN_KEY, userId);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSmartDailyPlan(plan: SmartDailyPlan | null, userId?: string) {
  if (!plan) {
    removeStoredItem(DAILY_PLAN_KEY, userId);
    return;
  }
  setStoredItem(DAILY_PLAN_KEY, JSON.stringify(plan), userId);
}

// ----------------------------------------------------------------------
// MISSED DAY RECOVERY STORAGE
// ----------------------------------------------------------------------

export function readMissedDayRecovery(userId?: string): MissedDayRecoveryPlan | null {
  try {
    const raw = getStoredItem(RECOVERY_PLAN_KEY, userId);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveMissedDayRecovery(plan: MissedDayRecoveryPlan | null, userId?: string) {
  if (!plan) {
    removeStoredItem(RECOVERY_PLAN_KEY, userId);
    return;
  }
  setStoredItem(RECOVERY_PLAN_KEY, JSON.stringify(plan), userId);
}

// ----------------------------------------------------------------------
// SPACED REVISIONS STORAGE
// ----------------------------------------------------------------------

export function readSpacedRevisions(userId?: string): SpacedRevision[] {
  try {
    const raw = getStoredItem(REVISIONS_KEY, userId);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSpacedRevisions(revisions: SpacedRevision[], userId?: string) {
  setStoredItem(REVISIONS_KEY, JSON.stringify(revisions), userId);
}

export function completeSpacedRevision(revisionId: string, confidence: 'strong' | 'shaky' | 'forgotten' = 'strong', userId?: string) {
  const revisions = readSpacedRevisions(userId);
  const updated = revisions.map((rev) => {
    if (rev.id === revisionId) {
      return {
        ...rev,
        status: 'completed' as const,
        completedDate: new Date().toISOString().split('T')[0],
        retentionConfidence: confidence,
      };
    }
    return rev;
  });
  saveSpacedRevisions(updated, userId);

  const revRes = recordAcademicAction({
    type: 'complete_revision',
    revisionId,
  });
  if (revRes && typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('backlogos-academic-achievement', { detail: revRes })
    );
  }

  return updated;
}

// ----------------------------------------------------------------------
// TEST AND ERROR LOGS STORAGE
// ----------------------------------------------------------------------

export function readTestLogs(userId?: string): TestLog[] {
  try {
    const raw = getStoredItem(TEST_LOGS_KEY, userId);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveTestLog(log: TestLog, userId?: string): TestLog[] {
  const logs = readTestLogs(userId);
  const updated = [log, ...logs];
  setStoredItem(TEST_LOGS_KEY, JSON.stringify(updated), userId);
  syncWithServer('/api/tests', log);

  const testRes = recordAcademicAction({
    type: 'log_test',
    testId: log.id,
    testName: log.testName,
  });
  if (testRes && typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('backlogos-academic-achievement', { detail: testRes })
    );
  }

  return updated;
}

export function deleteTestLog(id: string, userId?: string): TestLog[] {
  const logs = readTestLogs(userId);
  const updated = logs.filter((l) => l.id !== id);
  setStoredItem(TEST_LOGS_KEY, JSON.stringify(updated), userId);
  return updated;
}

// ----------------------------------------------------------------------
// BACKLOG RECOVERY MODE TOGGLE
// ----------------------------------------------------------------------

export function readRecoveryModeActive(userId?: string): boolean {
  try {
    return getStoredItem(RECOVERY_MODE_ACTIVE_KEY, userId) === 'true';
  } catch {
    return false;
  }
}

export function setRecoveryModeActive(active: boolean, userId?: string) {
  setStoredItem(RECOVERY_MODE_ACTIVE_KEY, active ? 'true' : 'false', userId);
}
