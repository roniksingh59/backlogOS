import { makePlan, type StudentPlan, type StudentPlanInput } from './backlog-data';

const PLAN_KEY = 'backlogos-plan-v1';
const DONE_KEY = 'backlogos-completed-v1';

export function readPlan(): StudentPlan | null {
  try {
    const raw = localStorage.getItem(PLAN_KEY);
    if (!raw) return null;

    const saved = JSON.parse(raw) as Partial<StudentPlan> & StudentPlanInput;
    if (Array.isArray(saved.plannedChapterIds) && Array.isArray(saved.days)) {
      return saved as StudentPlan;
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
}