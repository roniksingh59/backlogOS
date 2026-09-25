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
import { auth } from './firebase';

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

async function syncWithServer(url: string, body: any) {
  try {
    const user = auth.currentUser;
    if (!user) return;
    const token = await user.getIdToken();
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

export function readPlan(): StudentPlan | null {
  try {
    const raw = localStorage.getItem(PLAN_KEY);
    if (!raw) return null;

    const saved = JSON.parse(raw) as Partial<StudentPlan> & StudentPlanInput;
    if (Array.isArray(saved.plannedChapterIds) && Array.isArray(saved.days)) {
      return {
        ...saved,
        confidence: saved.confidence ?? 'mixed',
        examDate: saved.examDate ?? '',
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
      saveCompleted([]);
      savePlan(migrated);
      return migrated;
    }

    return null;
  } catch {
    return null;
  }
}

export function savePlan(plan: StudentPlan) {
  localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
  syncWithServer('/api/plan', plan);
}

export function readCompleted(): string[] {
  try {
    const raw = localStorage.getItem(DONE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function saveCompleted(ids: string[]) {
  localStorage.setItem(DONE_KEY, JSON.stringify(ids));
  syncWithServer('/api/completed', { chapterIds: ids });
}

export function clearStoredPlan() {
  localStorage.removeItem(PLAN_KEY);
  localStorage.removeItem(DONE_KEY);
  localStorage.removeItem(SESSIONS_KEY);
  localStorage.removeItem(NOTES_KEY);
  localStorage.removeItem(REST_DATES_KEY);
  localStorage.removeItem('backlogos-draft-v1');
  localStorage.removeItem(BACKLOG_ITEMS_KEY);
  localStorage.removeItem(DAILY_PLAN_KEY);
  localStorage.removeItem(RECOVERY_PLAN_KEY);
  localStorage.removeItem(REVISIONS_KEY);
  localStorage.removeItem(TEST_LOGS_KEY);
  localStorage.removeItem(RECOVERY_MODE_ACTIVE_KEY);
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

export function readStudySessions(): StudySession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? (JSON.parse(raw) as StudySession[]) : [];
  } catch {
    return [];
  }
}

export function saveStudySession(session: StudySession) {
  const next = [session, ...readStudySessions()].slice(0, 150);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(next));
  syncWithServer('/api/sessions', session);

  // Directly update backlog item progress if linked
  if (session.chapterId) {
    const items = readBacklogItems();
    const itemIndex = items.findIndex((i) => i.chapterId === session.chapterId);
    if (itemIndex >= 0) {
      const target = items[itemIndex];
      const addedHours = Math.round((session.minutes / 60) * 10) / 10;
      target.hoursSpent = Math.round((target.hoursSpent + addedHours) * 10) / 10;
      if (target.status === 'not_started') {
        target.status = 'learning';
      }
      saveBacklogItems(items);
    }
  }
}

export function readNotes(): Record<string, string> {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function saveNote(chapterId: string, note: string) {
  const notes = readNotes();
  if (note.trim()) notes[chapterId] = note;
  else delete notes[chapterId];
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  syncWithServer('/api/notes', { chapterId, note });
}

export function readRestDates(): string[] {
  try {
    const raw = localStorage.getItem(REST_DATES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function toggleRestDate(date: string) {
  const dates = readRestDates();
  const next = dates.includes(date) ? dates.filter((item) => item !== date) : [...dates, date];
  localStorage.setItem(REST_DATES_KEY, JSON.stringify(next));
  return next;
}

// ----------------------------------------------------------------------
// SMART BACKLOG ITEMS STORAGE
// ----------------------------------------------------------------------

export function readBacklogItems(): BacklogItem[] {
  try {
    const raw = localStorage.getItem(BACKLOG_ITEMS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as BacklogItem[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }

    // Auto-seed from existing plan if available, or generate starter backlog
    const currentPlan = readPlan();
    const defaultItems = generateDefaultBacklogItems(
      currentPlan?.chapterIds && currentPlan.chapterIds.length > 0
        ? currentPlan.chapterIds
        : undefined
    );

    // Sync any existing completed chapters
    const completedIds = new Set(readCompleted());
    defaultItems.forEach((item) => {
      if (completedIds.has(item.chapterId)) {
        item.status = 'completed';
        item.hoursSpent = item.estimatedHours;
      }
    });

    localStorage.setItem(BACKLOG_ITEMS_KEY, JSON.stringify(defaultItems));
    return defaultItems;
  } catch {
    return generateDefaultBacklogItems();
  }
}

export function saveBacklogItems(items: BacklogItem[]) {
  localStorage.setItem(BACKLOG_ITEMS_KEY, JSON.stringify(items));
  syncWithServer('/api/backlog', { items });

  // Sync completed chapters list
  const completedIds = items
    .filter((item) => item.status === 'completed')
    .map((item) => item.chapterId);
  saveCompleted(completedIds);
}

export function addBacklogItem(item: BacklogItem): BacklogItem[] {
  const items = readBacklogItems();
  const updated = [item, ...items];
  saveBacklogItems(updated);
  return updated;
}

export function updateBacklogItem(id: string, updates: Partial<BacklogItem>): BacklogItem[] {
  const items = readBacklogItems();
  const updated = items.map((item) => {
    if (item.id === id) {
      const wasCompleted = item.status === 'completed';
      const isNowCompleted = updates.status === 'completed';

      const merged = { ...item, ...updates };

      // If transitioning to completed, auto-schedule spaced revisions
      if (!wasCompleted && isNowCompleted) {
        merged.completedAt = new Date().toISOString();
        const newRevisions = generateSpacedRevisions(merged.chapterId, new Date());
        saveSpacedRevisions([...readSpacedRevisions(), ...newRevisions]);
      }

      return merged;
    }
    return item;
  });

  saveBacklogItems(updated);
  return updated;
}

export function deleteBacklogItem(id: string): BacklogItem[] {
  const items = readBacklogItems();
  const updated = items.filter((item) => item.id !== id);
  saveBacklogItems(updated);
  return updated;
}

// ----------------------------------------------------------------------
// SMART DAILY PLAN STORAGE
// ----------------------------------------------------------------------

export function readSmartDailyPlan(): SmartDailyPlan | null {
  try {
    const raw = localStorage.getItem(DAILY_PLAN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSmartDailyPlan(plan: SmartDailyPlan | null) {
  if (!plan) {
    localStorage.removeItem(DAILY_PLAN_KEY);
    return;
  }
  localStorage.setItem(DAILY_PLAN_KEY, JSON.stringify(plan));
}

// ----------------------------------------------------------------------
// MISSED DAY RECOVERY STORAGE
// ----------------------------------------------------------------------

export function readMissedDayRecovery(): MissedDayRecoveryPlan | null {
  try {
    const raw = localStorage.getItem(RECOVERY_PLAN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveMissedDayRecovery(plan: MissedDayRecoveryPlan | null) {
  if (!plan) {
    localStorage.removeItem(RECOVERY_PLAN_KEY);
    return;
  }
  localStorage.setItem(RECOVERY_PLAN_KEY, JSON.stringify(plan));
}

// ----------------------------------------------------------------------
// SPACED REVISIONS STORAGE
// ----------------------------------------------------------------------

export function readSpacedRevisions(): SpacedRevision[] {
  try {
    const raw = localStorage.getItem(REVISIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSpacedRevisions(revisions: SpacedRevision[]) {
  localStorage.setItem(REVISIONS_KEY, JSON.stringify(revisions));
}

export function completeSpacedRevision(revisionId: string, confidence: 'strong' | 'shaky' | 'forgotten' = 'strong') {
  const revisions = readSpacedRevisions();
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
  saveSpacedRevisions(updated);
  return updated;
}

// ----------------------------------------------------------------------
// TEST AND ERROR LOGS STORAGE
// ----------------------------------------------------------------------

export function readTestLogs(): TestLog[] {
  try {
    const raw = localStorage.getItem(TEST_LOGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveTestLog(log: TestLog): TestLog[] {
  const logs = readTestLogs();
  const updated = [log, ...logs];
  localStorage.setItem(TEST_LOGS_KEY, JSON.stringify(updated));
  syncWithServer('/api/tests', log);
  return updated;
}

export function deleteTestLog(id: string): TestLog[] {
  const logs = readTestLogs();
  const updated = logs.filter((l) => l.id !== id);
  localStorage.setItem(TEST_LOGS_KEY, JSON.stringify(updated));
  return updated;
}

// ----------------------------------------------------------------------
// BACKLOG RECOVERY MODE TOGGLE
// ----------------------------------------------------------------------

export function readRecoveryModeActive(): boolean {
  try {
    return localStorage.getItem(RECOVERY_MODE_ACTIVE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setRecoveryModeActive(active: boolean) {
  localStorage.setItem(RECOVERY_MODE_ACTIVE_KEY, active ? 'true' : 'false');
}
