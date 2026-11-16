import {
  chapters,
  type Subject,
  type DayRhythmType,
  isCoreSubject,
  isAuxiliaryOrElective,
} from './backlog-data';
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
  slotNumber?: 1 | 2 | 3;
  slotRole?: 'core_anchor' | 'secondary_sprint' | 'retrieval_drill';
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
  dayOfWeekLabel?: string;
  rhythmType?: DayRhythmType;
  rhythmBadge?: string;
  rhythmTitle?: string;
  rhythmDescription?: string;
  primarySubject?: Subject;
  secondarySubject?: Subject;
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
  preferredSessionLengthMinutes?: number; // e.g. 45 or 60
  selectedSubjects: Subject[];
  examDate?: string;
  includeDueRevisions?: boolean;
}

/**
 * Smart Daily Plan Generator:
 * Generates an achievable study schedule prioritizing high-yield chapters,
 * prerequisite foundations, and revision requirements without overloading.
 *
 * Enforces Cognitive Balance:
 * - Exactly 2 subjects per day (never 5 subjects in 1 day to prevent cognitive burnout).
 * - Mon, Tue, Thu, Fri: Dual-Core Focus (Physics, Chemistry, Maths, Biology).
 * - Wednesday & Weekends: Elective & Scoring Booster Priority (English, Computer Science,
 *   Physical Education, Economics) paired with a Core Anchor.
 * - Daily Slot 3: Quick Active Recall & Formula Retrieval Blitz.
 */
export function generateSmartDailyPlan(
  backlogItems: BacklogItem[],
  options: PlanGenerationOptions,
  dueRevisionChapters: { chapterId: string; title: string; subject: Subject }[] = []
): SmartDailyPlan {
  const {
    availableHoursToday,
    selectedSubjects,
  } = options;

  const totalAvailableMinutes = Math.max(60, Math.round(availableHoursToday * 60));
  const completedChapterIds = backlogItems
    .filter((b) => b.status === 'completed')
    .map((b) => b.chapterId);

  // Filter items matching selected subjects and not completed
  const activeItems = backlogItems.filter(
    (b) => b.status !== 'completed' && (selectedSubjects.length === 0 || selectedSubjects.includes(b.subject))
  );

  // Score all items
  const scoredItems = activeItems.map((item) => {
    const prio = calculatePriorityScore(item, completedChapterIds);
    const prereqCheck = checkUnfinishedPrerequisites(
      item.chapterId,
      completedChapterIds
    );

    // If an item has unfinished prerequisites, we reduce its immediate priority
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

  // Separate into Core and Elective pools
  const coreScored = scoredItems.filter((s) => isCoreSubject(s.item.subject));
  const electiveScored = scoredItems.filter((s) => isAuxiliaryOrElective(s.item.subject));
  const otherScored = scoredItems.filter(
    (s) => !isCoreSubject(s.item.subject) && !isAuxiliaryOrElective(s.item.subject)
  );

  // Determine current day of the week
  const today = new Date();
  const dayIndex = today.getDay(); // 0 = Sun, 1 = Mon, ..., 3 = Wed, 6 = Sat
  const dayOfWeekLabel = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayIndex];
  const isWednesday = dayIndex === 3;
  const isWeekend = dayIndex === 0 || dayIndex === 6;
  const isSunday = dayIndex === 0;

  const slots: DailyPlanSlot[] = [];
  const prerequisiteWarnings: string[] = [];

  // Determine Rhythm Type & Strategy
  let rhythmType: DayRhythmType = 'dual_core';
  let rhythmBadge = '⚡ Dual-Core Focus';
  let rhythmTitle = 'Dual-Core Weekday Sprint';
  let rhythmDescription = '2 Core Subjects paired (Physics, Chemistry, Maths, Bio) for deep focus without single-subject burnout.';

  let slot1Candidate: (typeof scoredItems)[0] | undefined;
  let slot2Candidate: (typeof scoredItems)[0] | undefined;

  const hasElectives = electiveScored.length > 0;

  if ((isWednesday || isWeekend) && hasElectives) {
    if (isSunday) {
      rhythmType = 'weekend_booster';
      rhythmBadge = '🌟 Sunday Review & Elective Reset';
      rhythmTitle = 'Sunday Review & Elective Reset';
      rhythmDescription = 'Sunday rhythm: Clear elective backlog chapters (English/CS/PE/Econ) paired with core formula review.';
      // Slot 1: Elective chapter, Slot 2: Core anchor
      slot1Candidate = electiveScored[0];
      slot2Candidate = coreScored[0] || (electiveScored.length > 1 ? electiveScored[1] : undefined);
    } else if (isWednesday) {
      rhythmType = 'wednesday_pivot';
      rhythmBadge = '🎯 Wednesday Elective Pivot';
      rhythmTitle = 'Wednesday Elective & Scoring Booster Day';
      rhythmDescription = 'Mid-week strategic balance: Retain 1 Core Anchor while clearing high-scoring Elective backlog.';
      // Slot 1: Core anchor, Slot 2: Elective sprint
      slot1Candidate = coreScored[0] || electiveScored[0];
      slot2Candidate = electiveScored[0]?.item.id === slot1Candidate?.item.id && electiveScored.length > 1
        ? electiveScored[1]
        : (electiveScored[0] || coreScored[1]);
    } else {
      // Saturday
      rhythmType = 'weekend_booster';
      rhythmBadge = '🏆 Weekend Board Booster';
      rhythmTitle = 'Weekend Board Booster Sprint';
      rhythmDescription = 'Weekend intensive: 1 Core deep-numerical sprint + 1 Elective high-yield backlog clearing.';
      slot1Candidate = coreScored[0] || electiveScored[0];
      slot2Candidate = electiveScored[0]?.item.id === slot1Candidate?.item.id && electiveScored.length > 1
        ? electiveScored[1]
        : (electiveScored[0] || coreScored[1]);
    }
  } else {
    // Weekday or Core-Only
    rhythmType = 'dual_core';
    rhythmBadge = '⚡ Dual-Core Focus';
    rhythmTitle = 'Dual-Core Weekday Sprint';
    rhythmDescription = '2 Core Subjects (Physics, Chemistry, Maths, Biology) paired to maximize deep conceptual progress.';

    // Slot 1: Top scoring core item
    slot1Candidate = coreScored[0] || otherScored[0] || scoredItems[0];

    // Slot 2: Try to find a different subject for variety to avoid cognitive fatigue
    if (slot1Candidate) {
      const primarySub = slot1Candidate.item.subject;
      slot2Candidate =
        coreScored.find((s) => s.item.subject !== primarySub) ||
        otherScored.find((s) => s.item.subject !== primarySub) ||
        scoredItems.find((s) => s.item.id !== slot1Candidate?.item.id);
    }
  }

  // Fallbacks if no candidate found
  if (!slot1Candidate && scoredItems.length > 0) {
    slot1Candidate = scoredItems[0];
  }
  if (!slot2Candidate && scoredItems.length > 1 && slot1Candidate) {
    slot2Candidate = scoredItems.find((s) => s.item.id !== slot1Candidate?.item.id);
  }

  // Time distribution:
  // Slot 1 (Primary Anchor): ~52%
  // Slot 2 (Secondary Sprint): ~35%
  // Slot 3 (Active Recall / Quick Revision): ~13% (minimum 15 mins if total >= 90 mins)
  const hasRevisionSlot = totalAvailableMinutes >= 90;
  const revisionMinutes = hasRevisionSlot
    ? Math.max(15, Math.min(30, Math.round(totalAvailableMinutes * 0.14)))
    : 0;

  const coreBudgetMinutes = totalAvailableMinutes - revisionMinutes;
  const slot1Minutes = slot2Candidate
    ? Math.round(coreBudgetMinutes * 0.58)
    : coreBudgetMinutes;
  const slot2Minutes = slot2Candidate
    ? coreBudgetMinutes - slot1Minutes
    : 0;

  // Build Slot 1
  if (slot1Candidate) {
    const item = slot1Candidate.item;
    const prereqCheck = slot1Candidate.prereqCheck;
    if (prereqCheck.hasUnfinished && !prerequisiteWarnings.includes(prereqCheck.warningMessage!)) {
      prerequisiteWarnings.push(prereqCheck.warningMessage!);
    }

    const slotChapterId = item.chapterId;
    const slotTitle = getChapterTitle(slotChapterId);
    const kind =
      item.status === 'practicing'
        ? 'practice'
        : item.status === 'revision'
        ? 'revision'
        : 'theory';

    const attachedResources = getAttachedTaskResources(
      {
        chapterId: slotChapterId,
        chapterTitle: slotTitle,
        subject: item.subject,
        kind,
        durationMinutes: slot1Minutes,
        topic: item.topic,
      },
      {
        confidence: item.confidence,
        examDate: options.examDate,
      }
    );

    slots.push({
      id: `slot-1-${item.id}`,
      slotNumber: 1,
      slotRole: 'core_anchor',
      backlogItemId: item.id,
      chapterId: slotChapterId,
      chapterTitle: slotTitle,
      subject: item.subject,
      topic: item.topic,
      durationMinutes: slot1Minutes,
      kind,
      isPrerequisiteBlock: prereqCheck.hasUnfinished,
      priorityScore: slot1Candidate.prio.score,
      reason: `${slot1Candidate.prio.primaryReason} (Anchor Subject)`,
      completed: false,
      attachedResources,
    });
  }

  // Build Slot 2 (Secondary Subject)
  if (slot2Candidate && slot2Minutes >= 20) {
    const item = slot2Candidate.item;
    const prereqCheck = slot2Candidate.prereqCheck;
    if (prereqCheck.hasUnfinished && !prerequisiteWarnings.includes(prereqCheck.warningMessage!)) {
      prerequisiteWarnings.push(prereqCheck.warningMessage!);
    }

    const slotChapterId = item.chapterId;
    const slotTitle = getChapterTitle(slotChapterId);
    const kind =
      item.status === 'practicing'
        ? 'practice'
        : item.status === 'revision'
        ? 'revision'
        : 'theory';

    const attachedResources = getAttachedTaskResources(
      {
        chapterId: slotChapterId,
        chapterTitle: slotTitle,
        subject: item.subject,
        kind,
        durationMinutes: slot2Minutes,
        topic: item.topic,
      },
      {
        confidence: item.confidence,
        examDate: options.examDate,
      }
    );

    slots.push({
      id: `slot-2-${item.id}`,
      slotNumber: 2,
      slotRole: 'secondary_sprint',
      backlogItemId: item.id,
      chapterId: slotChapterId,
      chapterTitle: slotTitle,
      subject: item.subject,
      topic: item.topic,
      durationMinutes: slot2Minutes,
      kind,
      isPrerequisiteBlock: prereqCheck.hasUnfinished,
      priorityScore: slot2Candidate.prio.score,
      reason: isAuxiliaryOrElective(item.subject)
        ? `Mid-week / Weekend Elective Sprint (${item.subject})`
        : `Dual-Subject Balance (${item.subject})`,
      completed: false,
      attachedResources,
    });
  }

  // Build Slot 3: Quick Active Recall / Formula Blitz (Reinforcement or Due Revision)
  if (hasRevisionSlot && revisionMinutes >= 15) {
    if (dueRevisionChapters.length > 0) {
      const rev = dueRevisionChapters[0];
      slots.push({
        id: `slot-3-rev-${Date.now()}`,
        slotNumber: 3,
        slotRole: 'retrieval_drill',
        backlogItemId: `rev-${rev.chapterId}`,
        chapterId: rev.chapterId,
        chapterTitle: rev.title,
        subject: rev.subject,
        topic: `${rev.title} (Spaced Retrieval)`,
        durationMinutes: revisionMinutes,
        kind: 'revision',
        isPrerequisiteBlock: false,
        priorityScore: 95,
        reason: 'Scheduled spaced retrieval revision due today',
        completed: false,
      });
    } else if (slot1Candidate) {
      // Reinforcement recall of today's anchor
      const anchorItem = slot1Candidate.item;
      slots.push({
        id: `slot-3-recall-${anchorItem.id}`,
        slotNumber: 3,
        slotRole: 'retrieval_drill',
        backlogItemId: `recall-${anchorItem.id}`,
        chapterId: anchorItem.chapterId,
        chapterTitle: getChapterTitle(anchorItem.chapterId),
        subject: anchorItem.subject,
        topic: `Active Recall & Formula Blitz`,
        durationMinutes: revisionMinutes,
        kind: 'revision',
        isPrerequisiteBlock: false,
        priorityScore: 85,
        reason: 'Active recall & formula derivation retention block',
        completed: false,
      });
    }
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const allocatedMinutes = slots.reduce((sum, s) => sum + s.durationMinutes, 0);

  return {
    date: todayStr,
    dayOfWeekLabel,
    rhythmType,
    rhythmBadge,
    rhythmTitle,
    rhythmDescription,
    primarySubject: slot1Candidate?.item.subject,
    secondarySubject: slot2Candidate?.item.subject,
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
  remainingChapters: number;
  totalChapters: number;
  completedChapters: number;
  availableHoursPerDay: number;
  currentPaceHoursPerDay: number; // daily focus budget or logged daily hours
  requiredPaceHoursPerDay: number;
  currentChaptersPerWeek: number;
  requiredChaptersPerWeek: number;
  additionalChaptersPerWeek: number;
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
  examDateStr?: string,
  plan?: { days?: { tasks?: { id: string; chapterId?: string; minutes?: number }[] }[] } | null,
  completedIds: string[] = []
): WillIFinishResult {
  const metrics = calculateBacklogMetrics(backlogItems, availableHoursPerDay, plan, completedIds);
  const remainingHours = metrics.remainingHours;
  const remainingChapters = metrics.remainingChapters;
  const totalChapters = metrics.totalChapters;
  const completedChapters = metrics.completedChapters;

  // Calculate actual logged focus hours per day over the last 14 days
  const now = Date.now();
  const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000;
  const recentSessions = sessions.filter(
    (s) => new Date(s.completedAt).getTime() >= fourteenDaysAgo
  );

  const totalRecentMinutes = recentSessions.reduce((acc, s) => acc + s.minutes, 0);
  const empiricalDays = 14;
  const empiricalPace = recentSessions.length > 0
    ? Math.round((totalRecentMinutes / 60 / empiricalDays) * 10) / 10
    : availableHoursPerDay;
  const currentPace = Math.max(0.5, empiricalPace);

  // Measure completed chapters over the last 14 days (if timestamps exist), or infer a realistic pace from daily focus budget
  const recentCompletedChapters = backlogItems.filter(
    (item) =>
      item.status === 'completed' &&
      item.completedAt &&
      new Date(item.completedAt).getTime() >= fourteenDaysAgo
  ).length;

  const fallbackChaptersPerWeek = Math.max(1, Math.round((availableHoursPerDay / 2) * 10) / 10);
  const currentChaptersPerWeek =
    recentCompletedChapters > 0
      ? Math.max(1, Math.round(((recentCompletedChapters / 2) * 10)) / 10)
      : completedChapters > 0
      ? Math.max(1, Math.round(((completedChapters / 2) * 10)) / 10)
      : fallbackChaptersPerWeek;

  let daysToExam: number | null = null;
  if (examDateStr) {
    const examTime = new Date(`${examDateStr}T12:00:00`).getTime();
    if (!Number.isNaN(examTime)) {
      const diff = examTime - now;
      daysToExam = Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }
  }
  if (daysToExam === null) {
    daysToExam = 60;
  }

  const weeksToExam = Math.max(1, daysToExam / 7);
  const requiredChaptersPerWeek =
    remainingChapters > 0 ? Math.max(0.5, Math.round((remainingChapters / weeksToExam) * 10) / 10) : 0;

  const chaptersPerDay = Math.max(0.1, currentChaptersPerWeek / 7);
  const daysNeededAtCurrentPace = remainingChapters > 0 ? Math.ceil(remainingChapters / chaptersPerDay) : 0;

  const completionDateObj = new Date();
  completionDateObj.setDate(completionDateObj.getDate() + daysNeededAtCurrentPace);
  const estimatedCompletionDate = completionDateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const bufferDays = daysToExam !== null ? daysToExam - daysNeededAtCurrentPace : null;

  const isOnTrack =
    remainingChapters === 0 ||
    currentChaptersPerWeek >= requiredChaptersPerWeek ||
    (bufferDays !== null && bufferDays >= 0);

  const additionalChaptersPerWeek = Math.max(
    0,
    Math.round((requiredChaptersPerWeek - currentChaptersPerWeek) * 10) / 10
  );

  const requiredPaceHours = Math.round(availableHoursPerDay * 10) / 10;
  const additionalHoursNeeded = Math.max(0, Math.round((requiredPaceHours - currentPace) * 10) / 10);

  let statusCategory: 'on_track' | 'behind' | 'critical_behind' = 'on_track';
  if (!isOnTrack) {
    statusCategory = additionalChaptersPerWeek > 2.0 ? 'critical_behind' : 'behind';
  }

  let summaryTitle = '';
  let summaryExplanation = '';

  if (remainingChapters === 0) {
    summaryTitle = '🟢 ALL CLEAR';
    summaryExplanation = `All ${totalChapters} syllabus chapters in your plan are marked cleared. Keep scheduled spaced revisions active until exam day.`;
  } else if (isOnTrack) {
    summaryTitle = '🟢 ON TRACK';
    summaryExplanation = `At ~${currentChaptersPerWeek} chapters/week, you are pacing to clear all ${remainingChapters} pending chapters by ${estimatedCompletionDate} with a ${
      bufferDays ?? 0
    }-day buffer before your exam.`;
  } else if (statusCategory === 'behind') {
    summaryTitle = '🟠 BEHIND SCHEDULE';
    summaryExplanation = `You have ${remainingChapters} chapters left across ${daysToExam} days (~${requiredChaptersPerWeek} ch/week needed vs ~${currentChaptersPerWeek} ch/week current). Adding +${additionalChaptersPerWeek} ch/week or activating Recovery Mode keeps you on time.`;
  } else {
    summaryTitle = '🔴 CRITICALLY BEHIND';
    summaryExplanation = `To clear ${remainingChapters} chapters in ${daysToExam} days, you need ~${requiredChaptersPerWeek} ch/week (currently ~${currentChaptersPerWeek} ch/week). Switch to Backlog Recovery Mode to focus on highest-weightage chapters first.`;
  }

  return {
    remainingBacklogHours: remainingHours,
    remainingChapters,
    totalChapters,
    completedChapters,
    availableHoursPerDay,
    currentPaceHoursPerDay: currentPace,
    requiredPaceHoursPerDay: requiredPaceHours,
    currentChaptersPerWeek,
    requiredChaptersPerWeek,
    additionalChaptersPerWeek,
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
