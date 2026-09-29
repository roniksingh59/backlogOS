import { chapters, type Subject } from './backlog-data';
import {
  type BacklogItem,
  calculatePriorityScore,
  calculateBacklogMetrics,
} from './backlog-items';
import {
  PREREQUISITE_GRAPH,
  checkUnfinishedPrerequisites,
  getChapterTitle,
} from './prerequisites-graph';
import type { StudySession } from './storage';
import { type EducationalResource } from './resources/types';
import { getAttachedTaskResources } from './resources/plan-resource-matcher';

export interface DailyPlanSlot {
  id: string;
  backlogItemId: string;
  chapterId: string;
  chapterTitle: string;
  subject: Subject;
  topic: string;
  durationMinutes: number;
  kind: 'theory' | 'practice' | 'revision';
  isPrerequisiteBlock: boolean;
  priorityScore: number;
  reason: string;
  completed: boolean;
  attachedResources?: EducationalResource[];
}

export interface SmartDailyPlan {
  date: string; // YYYY-MM-DD
  totalMinutes: number;
  availableHours: number;
  slots: DailyPlanSlot[];
  prerequisiteWarnings: string[];
  isRecoveryPlan: boolean;
  recoveryNote?: string;
  generatedAt: string;
}

export interface PlanGenerationOptions {
  availableHoursToday: number; // e.g. 4.0
  preferredSessionLengthMinutes: number; // e.g. 45 or 60
  selectedSubjects: Subject[];
  examDate?: string;
  includeDueRevisions?: boolean;
}

/**
 * Smart Daily Plan Generator:
 * Generates an achievable study schedule prioritizing high-yield chapters,
 * prerequisite foundations, and revision requirements without overloading.
 */
export function generateSmartDailyPlan(
  backlogItems: BacklogItem[],
  options: PlanGenerationOptions,
  dueRevisionChapters: { chapterId: string; title: string; subject: Subject }[] = []
): SmartDailyPlan {
  const {
    availableHoursToday,
    preferredSessionLengthMinutes = 60,
    selectedSubjects,
  } = options;

  const totalAvailableMinutes = Math.round(availableHoursToday * 60);
  const completedChapterIds = backlogItems
    .filter((b) => b.status === 'completed')
    .map((b) => b.chapterId);

  // Filter items matching selected subjects and not completed
  const activeItems = backlogItems.filter(
    (b) => b.status !== 'completed' && selectedSubjects.includes(b.subject)
  );

  // Score all items
  const scoredItems = activeItems.map((item) => {
    const prio = calculatePriorityScore(item, completedChapterIds);
    const prereqCheck = checkUnfinishedPrerequisites(
      item.chapterId,
      completedChapterIds
    );

    // If an item has unfinished prerequisites, we reduce its immediate priority
    // in favor of clearing the prerequisites first!
    let effectiveScore = prio.score;
    if (prereqCheck.hasUnfinished) {
      effectiveScore -= 20; // Deprioritize until prereqs are touched
    }

    return {
      item,
      prio,
      prereqCheck,
      effectiveScore,
    };
  });

  // Sort by effective score descending
  scoredItems.sort((a, b) => b.effectiveScore - a.effectiveScore);

  const slots: DailyPlanSlot[] = [];
  let allocatedMinutes = 0;
  const prerequisiteWarnings: string[] = [];

  // 1. First allocate 20-30m for Due Revisions if requested and available
  if (dueRevisionChapters.length > 0 && totalAvailableMinutes >= 90) {
    const rev = dueRevisionChapters[0];
    const revMinutes = Math.min(30, Math.round(totalAvailableMinutes * 0.15));
    slots.push({
      id: `slot-rev-${Date.now()}-0`,
      backlogItemId: `rev-${rev.chapterId}`,
      chapterId: rev.chapterId,
      chapterTitle: rev.title,
      subject: rev.subject,
      topic: `${rev.title} (Spaced Revision)`,
      durationMinutes: revMinutes,
      kind: 'revision',
      isPrerequisiteBlock: false,
      priorityScore: 90,
      reason: 'Scheduled spaced retrieval revision due today',
      completed: false,
    });
    allocatedMinutes += revMinutes;
  }

  // 2. Allocate chapters according to priority and prerequisites
  for (const { item, prio, prereqCheck } of scoredItems) {
    if (allocatedMinutes + 25 > totalAvailableMinutes) break;

    // Check if prerequisite warning is needed
    if (prereqCheck.hasUnfinished && !prerequisiteWarnings.includes(prereqCheck.warningMessage!)) {
      prerequisiteWarnings.push(prereqCheck.warningMessage!);
    }

    // Available chunk for this chapter
    const remainingTime = totalAvailableMinutes - allocatedMinutes;
    const sessionDuration = Math.min(
      remainingTime,
      Math.max(30, preferredSessionLengthMinutes)
    );

    if (sessionDuration < 20) break;

    // Decide session kind based on status
    const kind =
      item.status === 'practicing'
        ? 'practice'
        : item.status === 'revision'
        ? 'revision'
        : 'theory';

    const slotChapterId = item.chapterId;
    const slotTitle = getChapterTitle(slotChapterId);

    const attachedResources = getAttachedTaskResources(
      {
        chapterId: slotChapterId,
        chapterTitle: slotTitle,
        subject: item.subject,
        kind,
        durationMinutes: sessionDuration,
        topic: item.topic,
      },
      {
        confidence: item.confidence,
        examDate: options.examDate,
      }
    );

    slots.push({
      id: `slot-${item.id}-${slots.length}`,
      backlogItemId: item.id,
      chapterId: slotChapterId,
      chapterTitle: slotTitle,
      subject: item.subject,
      topic: item.topic,
      durationMinutes: sessionDuration,
      kind,
      isPrerequisiteBlock: prereqCheck.hasUnfinished,
      priorityScore: prio.score,
      reason: prio.primaryReason,
      completed: false,
      attachedResources,
    });

    allocatedMinutes += sessionDuration;
  }

  const todayStr = new Date().toISOString().split('T')[0];

  return {
    date: todayStr,
    totalMinutes: allocatedMinutes,
    availableHours: availableHoursToday,
    slots,
    prerequisiteWarnings,
    isRecoveryPlan: false,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * ----------------------------------------------------
 * MISSED-DAY RECOVERY SYSTEM
 * ----------------------------------------------------
 */
export interface MissedDayRecoveryPlan {
  id: string;
  missedHours: number;
  missedDate: string;
  originalPaceHours: number;
  distributionDays: number; // e.g. 4 days
  addedHoursPerDay: number; // e.g. 0.5h
  newDailyHours: number; // e.g. 4.5h
  schedulePreview: {
    dayLabel: string;
    targetHours: number;
    notes: string;
  }[];
  adjustmentMessage: string;
  status: 'pending' | 'accepted' | 'dismissed';
}

export function computeMissedDayRecovery(
  missedHours: number,
  currentDailyHours: number = 4,
  missedDateStr: string = 'Yesterday'
): MissedDayRecoveryPlan {
  // Rather than doubling tomorrow's workload (8h impossible day),
  // distribute smoothly across the next 3 to 5 study days (capped at +1.0h max per day)
  const distributionDays = missedHours >= 5 ? 5 : missedHours >= 3 ? 4 : 3;
  const rawAdded = missedHours / distributionDays;
  const addedHoursPerDay = Math.round(rawAdded * 10) / 10;
  const newDailyHours = Math.round((currentDailyHours + addedHoursPerDay) * 10) / 10;

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = new Date();

  const schedulePreview = Array.from({ length: distributionDays }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : daysOfWeek[d.getDay()];
    return {
      dayLabel: `${dayName} (${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`,
      targetHours: newDailyHours,
      notes: `+${Math.round(addedHoursPerDay * 60)} min recovery buffer`,
    };
  });

  return {
    id: `recovery-${Date.now()}`,
    missedHours,
    missedDate: missedDateStr,
    originalPaceHours: currentDailyHours,
    distributionDays,
    addedHoursPerDay,
    newDailyHours,
    schedulePreview,
    adjustmentMessage: `You missed ${missedHours}h of planned study. Instead of an exhausting cram session, BacklogOS distributed +${Math.round(
      addedHoursPerDay * 60
    )}m across the next ${distributionDays} days to keep your momentum realistic.`,
    status: 'pending',
  };
}

/**
 * ----------------------------------------------------
 * "WILL I FINISH?" CALCULATOR
 * ----------------------------------------------------
 */
export interface WillIFinishResult {
  remainingBacklogHours: number;
  availableHoursPerDay: number;
  currentPaceHoursPerDay: number; // based on actual recent logged sessions
  requiredPaceHoursPerDay: number; // based on exam runway
  examDateStr: string | null;
  daysToExam: number | null;
  daysNeededAtCurrentPace: number;
  estimatedCompletionDate: string;
  bufferDays: number | null; // positive = buffer, negative = deficit
  isOnTrack: boolean;
  statusCategory: 'on_track' | 'behind' | 'critical_behind';
  additionalHoursNeededPerDay: number;
  summaryTitle: string;
  summaryExplanation: string;
}

export function calculateWillIFinish(
  backlogItems: BacklogItem[],
  sessions: StudySession[],
  availableHoursPerDay: number = 3.5,
  examDateStr?: string
): WillIFinishResult {
  const metrics = calculateBacklogMetrics(backlogItems, availableHoursPerDay);
  const remainingHours = metrics.remainingHours;

  // Calculate actual pace from sessions in the last 14 days
  const now = Date.now();
  const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000;
  const recentSessions = sessions.filter(
    (s) => new Date(s.completedAt).getTime() >= fourteenDaysAgo
  );

  const totalRecentMinutes = recentSessions.reduce((acc, s) => acc + s.minutes, 0);
  // If user has logged sessions, use their empirical daily pace over active days or last 7 days
  const empiricalDays = Math.max(1, Math.min(14, Math.ceil((now - fourteenDaysAgo) / (1000 * 60 * 60 * 24))));
  const empiricalPace = recentSessions.length > 0
    ? Math.round((totalRecentMinutes / 60 / empiricalDays) * 10) / 10
    : availableHoursPerDay; // fallback to stated daily promise

  const currentPace = Math.max(0.5, empiricalPace);

  let daysToExam: number | null = null;
  let requiredPace = 2.5;
  let bufferDays: number | null = null;

  if (examDateStr) {
    const examTime = new Date(`${examDateStr}T12:00:00`).getTime();
    if (!Number.isNaN(examTime)) {
      const diff = examTime - now;
      daysToExam = Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
      requiredPace = Math.round((remainingHours / daysToExam) * 10) / 10;
    }
  } else {
    // Default assumption: 60 days
    daysToExam = 60;
    requiredPace = Math.round((remainingHours / 60) * 10) / 10;
  }

  const daysNeededAtCurrentPace = Math.ceil(remainingHours / currentPace);

  const completionDateObj = new Date();
  completionDateObj.setDate(completionDateObj.getDate() + daysNeededAtCurrentPace);
  const estimatedCompletionDate = completionDateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  if (daysToExam !== null) {
    bufferDays = daysToExam - daysNeededAtCurrentPace;
  }

  const isOnTrack = currentPace >= requiredPace || (bufferDays !== null && bufferDays >= 0);
  const additionalHoursNeeded = Math.max(
    0,
    Math.round((requiredPace - currentPace) * 10) / 10
  );

  let statusCategory: 'on_track' | 'behind' | 'critical_behind' = 'on_track';
  if (!isOnTrack) {
    statusCategory = additionalHoursNeeded > 2.0 ? 'critical_behind' : 'behind';
  }

  let summaryTitle = '';
  let summaryExplanation = '';

  if (isOnTrack) {
    summaryTitle = '🟢 ON TRACK';
    summaryExplanation = `At your current pace of ${currentPace}h/day, you will clear all ${remainingHours}h of backlog by ${estimatedCompletionDate}. You have a safety buffer of ${
      bufferDays ?? 0
    } days before your exam.`;
  } else if (statusCategory === 'behind') {
    summaryTitle = '🟠 BEHIND SCHEDULE';
    summaryExplanation = `To finish all ${remainingHours}h by your exam, you need ${requiredPace}h/day, but your current pace is ${currentPace}h/day. Increasing by +${additionalHoursNeeded}h/day or switching to Recovery Mode will close the gap.`;
  } else {
    summaryTitle = '🔴 CRITICALLY BEHIND';
    summaryExplanation = `A ${additionalHoursNeeded}h/day deficit exists between your required pace (${requiredPace}h/day) and current pace (${currentPace}h/day). Immediate Backlog Recovery Mode is recommended to prioritize critical chapters.`;
  }

  return {
    remainingBacklogHours: remainingHours,
    availableHoursPerDay,
    currentPaceHoursPerDay: currentPace,
    requiredPaceHoursPerDay: requiredPace,
    examDateStr: examDateStr || null,
    daysToExam,
    daysNeededAtCurrentPace,
    estimatedCompletionDate,
    bufferDays,
    isOnTrack,
    statusCategory,
    additionalHoursNeededPerDay: additionalHoursNeeded,
    summaryTitle,
    summaryExplanation,
  };
}
