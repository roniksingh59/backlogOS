import type {
  ChapterMasteryRecord,
  MasteryHistoryEvent,
  ReviewAttemptRecord,
  ReviewScheduleRecord,
  ReviewScheduleStatus,
} from './types';

export const INITIAL_REVIEW_INTERVALS_DAYS = [1, 3, 7, 14, 30] as const;

export function formatReviewDateIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysToDate(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * Generates initial spaced review schedule starting at 1 day after mastery/study completion
 * using the canonical [1, 3, 7, 14, 30] spaced cadence.
 */
export function buildInitialReviewSchedule(
  chapterId: string,
  chapterTitle?: string,
  subjectName?: string,
  baseDate: Date = new Date(),
  conceptId: string | null = null
): ReviewScheduleRecord {
  const dueDate = formatReviewDateIso(
    addDaysToDate(baseDate, INITIAL_REVIEW_INTERVALS_DAYS[0])
  );
  const nowIso = baseDate.toISOString();

  return {
    id: `rev-${chapterId}-${baseDate.getTime()}`,
    chapterId,
    chapterTitle,
    subjectName,
    conceptId,
    intervalStep: 1,
    intervalDays: INITIAL_REVIEW_INTERVALS_DAYS[0],
    easeFactor: 2.5,
    dueDate,
    status: 'SCHEDULED',
    retentionHealthScore: 100,
    lastReviewedAt: null,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

/**
 * Evaluates live due/overdue status for a schedule record against today's date.
 */
export function evaluateReviewScheduleStatus(
  schedule: ReviewScheduleRecord,
  todayStr: string = formatReviewDateIso(new Date())
): ReviewScheduleStatus {
  if (schedule.status === 'COMPLETED' || schedule.status === 'PAUSED') {
    return schedule.status;
  }
  if (schedule.dueDate < todayStr) return 'OVERDUE';
  if (schedule.dueDate === todayStr) return 'DUE';
  return 'SCHEDULED';
}

/**
 * Computes next adaptive interval in days following [1, 3, 7, 14, 30] baseline
 * scaled by assessment recall performance and ease factor.
 */
export function calculateNextReviewInterval(params: {
  currentStep: number;
  currentIntervalDays: number;
  currentEaseFactor: number;
  scorePercent: number;
  recallQuality: 1 | 2 | 3 | 4 | 5;
}): {
  passed: boolean;
  nextStep: number;
  nextIntervalDays: number;
  nextEaseFactor: number;
  retentionHealthDelta: number;
} {
  const {
    currentStep,
    currentIntervalDays,
    currentEaseFactor,
    scorePercent,
    recallQuality,
  } = params;

  const passed = scorePercent >= 65 && recallQuality >= 3;

  // SM-2 inspired ease factor delta bounded cleanly to [1.30, 3.50]
  const qDiff = 5 - recallQuality;
  const rawEase =
    currentEaseFactor + (0.1 - qDiff * (0.08 + qDiff * 0.02));
  const nextEaseFactor = Math.round(
    Math.min(3.5, Math.max(1.3, rawEase)) * 100
  ) / 100;

  if (!passed) {
    return {
      passed: false,
      nextStep: 1,
      nextIntervalDays: INITIAL_REVIEW_INTERVALS_DAYS[0], // Drop back to 1-day urgent recall
      nextEaseFactor: Math.max(1.3, Math.round((nextEaseFactor - 0.15) * 100) / 100),
      retentionHealthDelta: -25,
    };
  }

  const nextStep = Math.max(1, currentStep + 1);
  let nextIntervalDays: number;

  if (nextStep <= INITIAL_REVIEW_INTERVALS_DAYS.length) {
    const baseline = INITIAL_REVIEW_INTERVALS_DAYS[nextStep - 1];
    // High recall can stretch the interval slightly; borderline recall keeps conservative baseline
    if (scorePercent >= 90 && recallQuality === 5) {
      nextIntervalDays = Math.min(60, Math.round(baseline * 1.15));
    } else if (scorePercent < 75 || recallQuality === 3) {
      nextIntervalDays = Math.max(currentIntervalDays, Math.round(baseline * 0.85));
    } else {
      nextIntervalDays = baseline;
    }
  } else {
    nextIntervalDays = Math.min(
      90,
      Math.max(30, Math.round(currentIntervalDays * nextEaseFactor))
    );
  }

  const retentionHealthDelta =
    scorePercent >= 85 ? 8 : scorePercent >= 70 ? 3 : 0;

  return {
    passed: true,
    nextStep,
    nextIntervalDays,
    nextEaseFactor,
    retentionHealthDelta,
  };
}

/**
 * Processes a completed retention assessment/review:
 * - Adapts next scheduled review date.
 * - Preserves historical mastery (`firstMasteredAt`, `bestMasteryScore`, immutable `mastery_history`)
 *   even if recall drops and chapter enters `NEEDS_REVISION`.
 */
export function processReviewOutcome(
  schedule: ReviewScheduleRecord,
  chapterMastery: ChapterMasteryRecord | null | undefined,
  input: {
    recallQuality: 1 | 2 | 3 | 4 | 5;
    scorePercent: number;
    assessmentAttemptId?: string | null;
    reviewedAt?: Date;
  }
): {
  completedSchedule: ReviewScheduleRecord;
  nextSchedule: ReviewScheduleRecord;
  reviewAttempt: ReviewAttemptRecord;
  updatedChapterMastery: ChapterMasteryRecord | null;
  historyEvent: MasteryHistoryEvent;
} {
  const reviewedAt = input.reviewedAt || new Date();
  const reviewedIso = reviewedAt.toISOString();

  const adaptation = calculateNextReviewInterval({
    currentStep: schedule.intervalStep,
    currentIntervalDays: schedule.intervalDays,
    currentEaseFactor: schedule.easeFactor,
    scorePercent: input.scorePercent,
    recallQuality: input.recallQuality,
  });

  const nextDueDate = formatReviewDateIso(
    addDaysToDate(reviewedAt, adaptation.nextIntervalDays)
  );
  const nextHealthScore = Math.max(
    0,
    Math.min(100, Math.round((schedule.retentionHealthScore || 100) + adaptation.retentionHealthDelta))
  );

  const completedSchedule: ReviewScheduleRecord = {
    ...schedule,
    status: 'COMPLETED',
    retentionHealthScore: nextHealthScore,
    lastReviewedAt: reviewedIso,
    updatedAt: reviewedIso,
  };

  const nextSchedule: ReviewScheduleRecord = {
    id: `rev-${schedule.chapterId}-${reviewedAt.getTime()}-${adaptation.nextStep}`,
    userId: schedule.userId,
    chapterId: schedule.chapterId,
    chapterTitle: schedule.chapterTitle,
    subjectName: schedule.subjectName,
    conceptId: schedule.conceptId || null,
    intervalStep: adaptation.nextStep,
    intervalDays: adaptation.nextIntervalDays,
    easeFactor: adaptation.nextEaseFactor,
    dueDate: nextDueDate,
    status: 'SCHEDULED',
    retentionHealthScore: nextHealthScore,
    lastReviewedAt: reviewedIso,
    createdAt: reviewedIso,
    updatedAt: reviewedIso,
  };

  const reviewAttempt: ReviewAttemptRecord = {
    id: `reva-${schedule.id}-${reviewedAt.getTime()}`,
    reviewScheduleId: schedule.id,
    userId: schedule.userId,
    chapterId: schedule.chapterId,
    assessmentAttemptId: input.assessmentAttemptId || null,
    recallQuality: input.recallQuality,
    scorePercent: Math.round(input.scorePercent * 100) / 100,
    passed: adaptation.passed,
    previousIntervalDays: schedule.intervalDays,
    nextIntervalDays: adaptation.nextIntervalDays,
    reviewedAt: reviewedIso,
  };

  let updatedChapterMastery: ChapterMasteryRecord | null = null;
  const previousStatus = chapterMastery?.status || 'MASTERED';

  if (chapterMastery) {
    const nextChapterStatus = adaptation.passed
      ? chapterMastery.firstMasteredAt || previousStatus === 'NEEDS_REVISION' || previousStatus === 'MASTERED'
        ? 'MASTERED'
        : chapterMastery.status
      : 'NEEDS_REVISION';

    updatedChapterMastery = {
      ...chapterMastery,
      status: nextChapterStatus,
      // Explicitly preserve historical study completion & peak mastery records
      studyCompleted: true,
      studyCompletedAt: chapterMastery.studyCompletedAt || reviewedIso,
      firstMasteredAt: chapterMastery.firstMasteredAt || null,
      lastMasteredAt:
        adaptation.passed && nextChapterStatus === 'MASTERED'
          ? reviewedIso
          : chapterMastery.lastMasteredAt || null,
      bestMasteryScore: Math.max(
        chapterMastery.bestMasteryScore || 0,
        chapterMastery.masteryScore || 0,
        input.scorePercent
      ),
      masteryScore: Math.round(input.scorePercent * 100) / 100,
      updatedAt: reviewedIso,
    };
  }

  const historyEvent: MasteryHistoryEvent = {
    id: `mh-rev-${schedule.id}-${reviewedAt.getTime()}`,
    userId: schedule.userId,
    chapterId: schedule.chapterId,
    conceptId: schedule.conceptId || null,
    eventType: adaptation.passed ? 'REVISION_PASSED' : 'REVISION_DECAYED',
    previousStatus,
    newStatus: updatedChapterMastery?.status || (adaptation.passed ? 'MASTERED' : 'NEEDS_REVISION'),
    scorePercent: Math.round(input.scorePercent * 100) / 100,
    attemptId: input.assessmentAttemptId || null,
    notes: adaptation.passed
      ? `Spaced review passed (${input.scorePercent}%). Next interval expanded to ${adaptation.nextIntervalDays} day(s).`
      : `Recall dropped (${input.scorePercent}%). Flagged NEEDS_REVISION with 1-day reinforcement interval while preserving historical mastery record.`,
    recordedAt: reviewedIso,
  };

  return {
    completedSchedule,
    nextSchedule,
    reviewAttempt,
    updatedChapterMastery,
    historyEvent,
  };
}

/**
 * Computes retention health (0..100) strictly from active/completed review records.
 * Applies overdue penalty without inflating cold state.
 */
export function computeRetentionHealthMetric(
  schedules: ReviewScheduleRecord[],
  todayStr: string = formatReviewDateIso(new Date())
): {
  retentionHealthPercent: number;
  pendingRevisionsCount: number;
  overdueRevisionsCount: number;
  completedRevisionsCount: number;
  hasRetentionData: boolean;
} {
  if (!Array.isArray(schedules) || schedules.length === 0) {
    return {
      retentionHealthPercent: 0,
      pendingRevisionsCount: 0,
      overdueRevisionsCount: 0,
      completedRevisionsCount: 0,
      hasRetentionData: false,
    };
  }

  let dueCount = 0;
  let overdueCount = 0;
  let completedCount = 0;
  let weightedHealthSum = 0;

  for (const sched of schedules) {
    const status = evaluateReviewScheduleStatus(sched, todayStr);
    const baseScore = Number(sched.retentionHealthScore ?? 100);
    if (status === 'COMPLETED') {
      completedCount += 1;
      weightedHealthSum += baseScore;
    } else if (status === 'OVERDUE') {
      dueCount += 1;
      overdueCount += 1;
      // Decay effective score for overdue review without rewriting stored baseline
      const overduePenalty = 25;
      weightedHealthSum += Math.max(20, baseScore - overduePenalty);
    } else if (status === 'DUE') {
      dueCount += 1;
      weightedHealthSum += baseScore;
    } else {
      weightedHealthSum += baseScore;
    }
  }

  const retentionHealthPercent = Math.max(
    0,
    Math.min(100, Math.round(weightedHealthSum / schedules.length))
  );

  return {
    retentionHealthPercent,
    pendingRevisionsCount: dueCount,
    overdueRevisionsCount: overdueCount,
    completedRevisionsCount: completedCount,
    hasRetentionData: true,
  };
}
