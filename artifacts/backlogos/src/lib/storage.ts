import type { StudentPlan } from './backlog-data';

const PLAN_KEY = 'backlogos-plan-v1';
const DONE_KEY = 'backlogos-completed-v1';

export function readPlan(): StudentPlan | null {
  try {
    const raw = localStorage.getItem(PLAN_KEY);
    return raw ? (JSON.parse(raw) as StudentPlan) : null;
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