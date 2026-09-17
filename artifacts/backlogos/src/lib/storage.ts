import { makePlan, type StudentPlan, type StudentPlanInput } from './backlog-data';

const PLAN_KEY = 'backlogos-plan-v1';
const DONE_KEY = 'backlogos-completed-v1';
const REST_DATES_KEY = 'backlogos-rest-dates-v1';

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
}

export function clearStoredPlan() {
  localStorage.removeItem(PLAN_KEY);
  localStorage.removeItem(DONE_KEY);
  localStorage.removeItem(SESSIONS_KEY);
  localStorage.removeItem(NOTES_KEY);
  localStorage.removeItem(REST_DATES_KEY);
  localStorage.removeItem('backlogos-draft-v1');
}

export type StudySession = {
  id: string;
  chapterId: string;
  minutes: number;
  completedAt: string;
  mode: 'focus' | 'review';
};

const SESSIONS_KEY = 'backlogos-study-sessions-v1';
const NOTES_KEY = 'backlogos-notes-v1';

export function readStudySessions(): StudySession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? (JSON.parse(raw) as StudySession[]) : [];
  } catch {
    return [];
  }
}

export function saveStudySession(session: StudySession) {
  const next = [session, ...readStudySessions()].slice(0, 100);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(next));
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