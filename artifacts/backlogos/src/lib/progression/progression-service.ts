import { getActiveUserId, isValidUUID } from '@/lib/supabase';
import { saveWorkspaceStateDirect } from '@/lib/supabase-service';
import {
  UserProgression,
  AcademicMilestone,
  ProgressionStats,
  MilestoneProgressItem,
} from './types';
import { getLevelInfo } from './levels';
import { ACADEMIC_MILESTONES } from './milestones';
import {
  readStudySessions,
  readCompleted,
  readBacklogItems,
  readSpacedRevisions,
  readPlan,
  getScopedBacklogItemsForPlan,
} from '@/lib/storage';
import {
  calculateBacklogMetrics,
  computeRecoveryProgressSummary,
} from '@/lib/backlog-items';
import { chapters } from '@/lib/backlog-data';

const PROGRESSION_STORAGE_PREFIX = 'backlogos-progression-v2-';

function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getYesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentUserId(): string {
  return getActiveUserId();
}

export function getDefaultProgression(userId: string): UserProgression {
  const backlogItems = readBacklogItems(userId);
  const initialBacklogHours = backlogItems.reduce(
    (sum, item) => sum + (item.estimatedHours || 0),
    0
  );

  return {
    userId,
    xp: 0,
    level: 1,
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: null,
    startingBacklogHours: initialBacklogHours > 0 ? initialBacklogHours : 0,
    unlockedMilestoneIds: [],
    processedActionIds: [],
    updatedAt: new Date().toISOString(),
  };
}

export function readProgression(userId: string = getCurrentUserId()): UserProgression {
  try {
    const key = `${PROGRESSION_STORAGE_PREFIX}${userId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as UserProgression;
      if (typeof parsed.xp === 'number') {
        // Ensure startingBacklogHours is initialized
        if (!parsed.startingBacklogHours || parsed.startingBacklogHours <= 0) {
          const backlogItems = readBacklogItems(userId);
          parsed.startingBacklogHours = backlogItems.reduce(
            (sum, item) => sum + (item.estimatedHours || 0),
            0
          ) || 48;
        }
        if (!Array.isArray(parsed.unlockedMilestoneIds)) {
          parsed.unlockedMilestoneIds = [];
        }
        if (!Array.isArray(parsed.processedActionIds)) {
          parsed.processedActionIds = [];
        }
        return parsed;
      }
    }
  } catch {
    // fallback
  }

  const defaultProg = getDefaultProgression(userId);
  saveProgressionLocalOnly(defaultProg);
  return defaultProg;
}

export function saveProgressionLocalOnly(prog: UserProgression): void {
  try {
    const key = `${PROGRESSION_STORAGE_PREFIX}${prog.userId}`;
    localStorage.setItem(key, JSON.stringify(prog));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('backlogos-progression-updated', { detail: prog })
      );
    }
  } catch (e) {
    console.error('Failed to write progression cache:', e);
  }
}

export function saveProgression(prog: UserProgression): void {
  try {
    prog.updatedAt = new Date().toISOString();
    saveProgressionLocalOnly(prog);
    // Sync to Supabase if authenticated with genuine UUID
    syncProgressionWithServer(prog);
  } catch (e) {
    console.error('Failed to save progression:', e);
  }
}

async function syncProgressionWithServer(prog: UserProgression) {
  try {
    if (!prog?.userId || !isValidUUID(prog.userId)) return;
    await saveWorkspaceStateDirect({ progression: prog }, prog.userId);
  } catch {
    // Local cache stays intact if offline
  }
}

export interface ActionResult {
  awardedXp: number;
  newLevel?: number;
  leveledUp: boolean;
  unlockedMilestones: AcademicMilestone[];
  progression: UserProgression;
}

export type AcademicAction =
  | { type: 'complete_session'; sessionId: string; minutes: number; chapterId?: string }
  | { type: 'complete_chapter'; chapterId: string; subject?: string }
  | { type: 'complete_revision'; revisionId: string; subject?: string }
  | { type: 'clear_backlog_hour'; chapterId: string; hoursCleared: number }
  | { type: 'clear_backlog_item'; chapterId: string }
  | { type: 'complete_resource'; resourceId: string; durationMinutes?: number; chapterId?: string; resourceType?: string };

/**
 * Anti-gaming deduplication & meaningful academic reward calculator
 */
export function recordAcademicAction(
  action: AcademicAction,
  userId: string = getCurrentUserId()
): ActionResult | null {
  const prog = readProgression(userId);

  // Generate unique action deduplication key
  let actionKey = '';
  let baseRewardXp = 0;

  switch (action.type) {
    case 'complete_session': {
      actionKey = `session-${action.sessionId}`;
      // Proportional XP: base 40 XP + 1 XP per minute studied (capped at 120 XP per session)
      const durationXp = Math.min(80, Math.floor(Math.max(15, action.minutes)));
      baseRewardXp = 40 + durationXp;
      break;
    }
    case 'complete_chapter': {
      actionKey = `chapter-completed-${action.chapterId}`;
      baseRewardXp = 150; // Meaningful reward for finishing full syllabus chapter
      break;
    }
    case 'complete_revision': {
      actionKey = `revision-${action.revisionId}`;
      baseRewardXp = 75; // Reward for spaced retention practice
      break;
    }
    case 'clear_backlog_hour': {
      // Rounded to integer hour checkpoint to prevent infinite increments
      const hourFloor = Math.floor(action.hoursCleared);
      actionKey = `backlog-hour-${action.chapterId}-${hourFloor}`;
      baseRewardXp = 25 * Math.max(1, hourFloor);
      break;
    }
    case 'clear_backlog_item': {
      actionKey = `backlog-cleared-${action.chapterId}`;
      baseRewardXp = 100;
      break;
    }
    case 'complete_resource': {
      actionKey = `resource-${action.resourceId}`;
      const durationBonus = action.durationMinutes ? Math.min(25, Math.floor(action.durationMinutes / 3)) : 10;
      baseRewardXp = 35 + durationBonus; // Meaningful reward for finishing full academic resource
      break;
    }
  }

  // Anti-gaming: Do NOT reward XP if this exact action was already processed
  if (prog.processedActionIds.includes(actionKey)) {
    return null;
  }

  // Add action key to deduplication list (preserve recent 300 action ids)
  prog.processedActionIds = [actionKey, ...prog.processedActionIds].slice(0, 300);

  // Streak calculation (actual activity completion rule)
  const today = getTodayString();
  const yesterday = getYesterdayString();

  if (prog.lastActiveDate === today) {
    // Already studied today - streak maintained, don't increment multiple times on same day
  } else if (prog.lastActiveDate === yesterday) {
    // Studied yesterday - increment consecutive streak
    prog.currentStreak = (prog.currentStreak || 0) + 1;
    prog.lastActiveDate = today;
  } else {
    // Missed previous days or first session - reset streak gracefully to 1
    prog.currentStreak = 1;
    prog.lastActiveDate = today;
  }

  prog.longestStreak = Math.max(prog.longestStreak || 0, prog.currentStreak);

  // Level & XP progression
  const oldLevelInfo = getLevelInfo(prog.xp);
  let totalAwardedXp = baseRewardXp;
  prog.xp += baseRewardXp;

  // Check and unlock milestones
  const newlyUnlockedMilestones: AcademicMilestone[] = [];
  const allMilestones = ACADEMIC_MILESTONES;
  const currentStats = computeProgressionStats(prog);

  for (const m of allMilestones) {
    if (!prog.unlockedMilestoneIds.includes(m.id)) {
      const isMet = checkMilestoneCondition(m, currentStats);
      if (isMet) {
        prog.unlockedMilestoneIds.push(m.id);
        m.unlockedAt = new Date().toISOString();
        newlyUnlockedMilestones.push(m);
        // Award milestone XP bonus
        prog.xp += m.xpReward;
        totalAwardedXp += m.xpReward;
      }
    }
  }

  const newLevelInfo = getLevelInfo(prog.xp);
  const leveledUp = newLevelInfo.level > oldLevelInfo.level;
  prog.level = newLevelInfo.level;

  saveProgression(prog);

  return {
    awardedXp: totalAwardedXp,
    newLevel: newLevelInfo.level,
    leveledUp,
    unlockedMilestones: newlyUnlockedMilestones,
    progression: prog,
  };
}

function checkMilestoneCondition(
  m: AcademicMilestone,
  stats: ProgressionStats
): boolean {
  switch (m.id) {
    case 'first-session':
      return stats.totalSessionsCount >= 1;
    case 'first-chapter':
      return stats.completedChaptersCount >= 1;
    case 'first-backlog-cleared':
      return stats.completedBacklogChaptersCount >= 1 || stats.completedChaptersCount >= 1;
    case 'backlog-cleared-10h':
      return stats.completedBacklogChaptersCount >= 5;
    case 'backlog-cleared-25h':
      return stats.completedBacklogChaptersCount >= 12;
    case 'hours-studied-10':
      return stats.totalHoursStudied >= 10;
    case 'hours-studied-25':
      return stats.totalHoursStudied >= 25;
    case 'hours-studied-50':
      return stats.totalHoursStudied >= 50;
    case 'hours-studied-100':
      return stats.totalHoursStudied >= 100;
    case 'streak-3':
      return stats.activeStreak >= 3 || stats.longestStreak >= 3;
    case 'streak-7':
      return stats.activeStreak >= 7 || stats.longestStreak >= 7;
    case 'streak-14':
      return stats.activeStreak >= 14 || stats.longestStreak >= 14;
    case 'first-revision': {
      const revisions = readSpacedRevisions(stats.progression.userId);
      return revisions.some((r) => r.status === 'completed' || r.isCompleted);
    }
    case 'first-subject-completed':
      return stats.completedSubjectsCount >= 1;
    default:
      return false;
  }
}

/**
 * Computes consolidated, real-data progression statistics
 * REUSING existing BacklogOS calculations without duplicating sources of truth
 */
export function computeProgressionStats(
  prog: UserProgression = readProgression()
): ProgressionStats {
  const uid = prog.userId;
  const sessions = readStudySessions(uid);
  const completedIds = readCompleted(uid);
  const completedIdSet = new Set(completedIds);
  const plan = readPlan(uid);
  const allBacklogItems = readBacklogItems(uid);
  const backlogItems = getScopedBacklogItemsForPlan(allBacklogItems, plan);
  const recovery = computeRecoveryProgressSummary(plan, completedIds);
  const backlogMetrics = calculateBacklogMetrics(backlogItems, 3, plan, completedIds);

  // 1. Total hours studied from logged focus sessions + completed recovery route tasks
  const sessionMinutes = sessions.reduce((acc, s) => acc + (s.minutes || 0), 0);
  const totalMinutes = sessionMinutes + recovery.completedMinutes;
  const totalHoursStudied = Math.round((totalMinutes / 60) * 100) / 100;

  // 2. Completed chapters (unique chapters, never counting raw task IDs as chapters)
  const completedChapterIds = new Set<string>();
  for (const item of backlogItems) {
    if (
      item.status === 'completed' ||
      recovery.fullyCompletedChapterIds.has(item.chapterId) ||
      completedIdSet.has(item.chapterId)
    ) {
      completedChapterIds.add(item.chapterId);
    }
  }
  recovery.fullyCompletedChapterIds.forEach((chId) => completedChapterIds.add(chId));
  const completedChaptersCount = completedChapterIds.size;

  // 3. Completed subjects check
  const subjectTotalMap = new Map<string, number>();
  const subjectDoneMap = new Map<string, number>();

  for (const c of chapters) {
    subjectTotalMap.set(c.subject, (subjectTotalMap.get(c.subject) || 0) + 1);
    if (completedChapterIds.has(c.id)) {
      subjectDoneMap.set(c.subject, (subjectDoneMap.get(c.subject) || 0) + 1);
    }
  }

  let completedSubjectsCount = 0;
  subjectTotalMap.forEach((total, sub) => {
    const done = subjectDoneMap.get(sub) || 0;
    if (total > 0 && done >= total) {
      completedSubjectsCount++;
    }
  });

  // 4. Backlog reduction metrics (chapter-based so progress never relies on subjective per-chapter hours)
  const currentBacklogHours = backlogMetrics.remainingHours;
  const totalBacklogChaptersCount = backlogMetrics.totalChapters;
  const completedBacklogChaptersCount = backlogMetrics.completedChapters;
  const remainingBacklogChaptersCount = backlogMetrics.remainingChapters;

  const rawStarting =
    prog.startingBacklogHours === 48 &&
    backlogMetrics.totalBacklogHours > 0 &&
    backlogMetrics.totalBacklogHours !== 48 &&
    sessionMinutes === 0 &&
    recovery.completedMinutes === 0
      ? backlogMetrics.totalBacklogHours
      : prog.startingBacklogHours || 0;
  const startingBacklog = plan
    ? backlogMetrics.totalBacklogHours
    : Math.max(rawStarting, backlogMetrics.totalBacklogHours);
  const hoursCleared = Math.max(0, Math.round((startingBacklog - currentBacklogHours) * 100) / 100);
  const percentageRecovered =
    totalBacklogChaptersCount > 0
      ? Math.min(100, Math.max(0, Math.round((completedBacklogChaptersCount / totalBacklogChaptersCount) * 100)))
      : 100;

  // 5. Streak validation
  // If lastActiveDate is before yesterday, streak is currently 0 until next study activity
  const today = getTodayString();
  const yesterday = getYesterdayString();
  let activeStreak = prog.currentStreak || 0;
  if (prog.lastActiveDate && prog.lastActiveDate !== today && prog.lastActiveDate !== yesterday) {
    activeStreak = 0;
  }

  const levelInfo = getLevelInfo(prog.xp);

  // 6. Milestones with percentage toward unlocking
  const milestones: MilestoneProgressItem[] = ACADEMIC_MILESTONES.map((m) => {
    const isUnlocked = prog.unlockedMilestoneIds.includes(m.id);
    let currentValue = 0;
    switch (m.category) {
      case 'session':
        currentValue = sessions.length;
        break;
      case 'chapter':
        currentValue = completedChaptersCount;
        break;
      case 'hours':
        currentValue = totalHoursStudied;
        break;
      case 'streak':
        currentValue = Math.max(activeStreak, prog.longestStreak || 0);
        break;
      case 'backlog':
        currentValue = completedBacklogChaptersCount;
        break;
      case 'revision':
        currentValue = readSpacedRevisions(uid).filter((r) => r.status === 'completed' || r.isCompleted).length;
        break;
      case 'subject':
        currentValue = completedSubjectsCount;
        break;
    }

    const percent = isUnlocked
      ? 100
      : Math.min(100, Math.max(0, Math.round((currentValue / (m.targetValue || 1)) * 100)));

    return {
      milestone: m,
      isUnlocked,
      currentValue,
      targetValue: m.targetValue,
      percent,
    };
  });

  return {
    levelInfo,
    progression: prog,
    totalHoursStudied,
    totalSessionsCount: sessions.length,
    completedChaptersCount,
    totalBacklogChaptersCount,
    completedBacklogChaptersCount,
    remainingBacklogChaptersCount,
    completedSubjectsCount,
    startingBacklogHours: startingBacklog,
    currentBacklogHours,
    hoursCleared,
    percentageRecovered,
    activeStreak,
    longestStreak: prog.longestStreak || 0,
    lastActiveDate: prog.lastActiveDate,
    milestones,
  };
}

function computeStreakFromDates(sortedDates: string[]): {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
} {
  if (sortedDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0, lastActiveDate: null };
  }

  let longest = 1;
  let run = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(`${sortedDates[i - 1]}T00:00:00Z`).getTime();
    const curr = new Date(`${sortedDates[i]}T00:00:00Z`).getTime();
    const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      run += 1;
      longest = Math.max(longest, run);
    } else if (diffDays > 1) {
      run = 1;
    }
  }

  const lastActiveDate = sortedDates[sortedDates.length - 1];
  const today = getTodayString();
  const yesterday = getYesterdayString();
  const currentStreak =
    lastActiveDate === today || lastActiveDate === yesterday ? run : 0;

  return { currentStreak, longestStreak: longest, lastActiveDate };
}

/**
 * Reconstructs progression (XP, level, streak, milestones) from synced cloud
 * study sessions, completed tasks, backlog items, and revisions when a student's
 * workspace progression is missing or was reset to 0 XP.
 */
export function reconcileProgressionFromCloudActivity(
  userId: string = getCurrentUserId()
): UserProgression | null {
  const current = readProgression(userId);
  if (current.xp > 0) return null;

  const sessions = readStudySessions(userId);
  const completedIds = readCompleted(userId);
  const plan = readPlan(userId);
  const allBacklogItems = readBacklogItems(userId);
  const revisions = readSpacedRevisions(userId);
  const recovery = computeRecoveryProgressSummary(plan, completedIds);

  const processedSet = new Set<string>(current.processedActionIds || []);
  const activeDatesSet = new Set<string>();
  let totalXp = 0;

  // 1. Focus study sessions
  for (const s of sessions) {
    const key = `session-${s.id}`;
    if (!processedSet.has(key)) {
      processedSet.add(key);
      const durationXp = Math.min(80, Math.floor(Math.max(15, s.minutes || 15)));
      totalXp += 40 + durationXp;
    }
    const dayStr = typeof s.completedAt === 'string' ? s.completedAt.slice(0, 10) : '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dayStr)) {
      activeDatesSet.add(dayStr);
    }
  }

  // 2. Completed chapters & cleared backlog items
  const completedChapters = new Set<string>();
  for (const item of allBacklogItems) {
    if (item.status === 'completed') {
      completedChapters.add(item.chapterId);
      const clearKey = `backlog-cleared-${item.chapterId}`;
      if (!processedSet.has(clearKey)) {
        processedSet.add(clearKey);
        totalXp += 100;
      }
      const dayStr = typeof item.completedAt === 'string' ? item.completedAt.slice(0, 10) : '';
      if (/^\d{4}-\d{2}-\d{2}$/.test(dayStr)) {
        activeDatesSet.add(dayStr);
      }
    }
  }
  recovery.fullyCompletedChapterIds.forEach((chId) => completedChapters.add(chId));

  completedChapters.forEach((chId) => {
    const chapterKey = `chapter-completed-${chId}`;
    if (!processedSet.has(chapterKey)) {
      processedSet.add(chapterKey);
      totalXp += 150;
    }
  });

  // 3. Completed revisions
  for (const rev of revisions) {
    if (rev.status === 'completed' || rev.isCompleted) {
      const revKey = `revision-${rev.id}`;
      if (!processedSet.has(revKey)) {
        processedSet.add(revKey);
        totalXp += 75;
      }
      const dayStr = typeof rev.completedDate === 'string' ? rev.completedDate.slice(0, 10) : '';
      if (/^\d{4}-\d{2}-\d{2}$/.test(dayStr)) {
        activeDatesSet.add(dayStr);
      }
    }
  }

  if (totalXp <= 0) {
    return null;
  }

  const sortedDates = Array.from(activeDatesSet).sort();
  const streakInfo = computeStreakFromDates(sortedDates);

  const rebuilt: UserProgression = {
    ...current,
    userId,
    xp: totalXp,
    level: getLevelInfo(totalXp).level,
    currentStreak: streakInfo.currentStreak,
    longestStreak: Math.max(current.longestStreak || 0, streakInfo.longestStreak),
    lastActiveDate: streakInfo.lastActiveDate || current.lastActiveDate,
    processedActionIds: Array.from(processedSet).slice(0, 300),
    unlockedMilestoneIds: [...(current.unlockedMilestoneIds || [])],
    updatedAt: new Date().toISOString(),
  };

  // Unlock milestones earned by reconciled stats
  const stats = computeProgressionStats(rebuilt);
  for (const m of ACADEMIC_MILESTONES) {
    if (!rebuilt.unlockedMilestoneIds.includes(m.id) && checkMilestoneCondition(m, stats)) {
      rebuilt.unlockedMilestoneIds.push(m.id);
      rebuilt.xp += m.xpReward;
    }
  }
  rebuilt.level = getLevelInfo(rebuilt.xp).level;

  saveProgressionLocalOnly(rebuilt);
  return rebuilt;
}

