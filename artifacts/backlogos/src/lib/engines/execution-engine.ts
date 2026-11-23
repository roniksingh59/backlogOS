import type {
  ChapterMasteryRecord,
  ChapterMasteryStatus,
  MasteryHistoryEvent,
  ObjectiveState,
  PlanObjective,
} from './types';

export const OBJECTIVE_STATES: readonly ObjectiveState[] = [
  'PENDING',
  'IN_PROGRESS',
  'STUDIED',
  'VERIFICATION_PENDING',
  'VERIFIED',
  'NEEDS_RELEARNING',
] as const;

const ALLOWED_TRANSITIONS: Record<ObjectiveState, ReadonlyArray<ObjectiveState>> = {
  PENDING: ['IN_PROGRESS', 'STUDIED', 'NEEDS_RELEARNING'],
  IN_PROGRESS: ['PENDING', 'STUDIED', 'VERIFICATION_PENDING', 'NEEDS_RELEARNING'],
  STUDIED: ['IN_PROGRESS', 'VERIFICATION_PENDING', 'NEEDS_RELEARNING'],
  VERIFICATION_PENDING: ['VERIFIED', 'NEEDS_RELEARNING', 'STUDIED', 'IN_PROGRESS'],
  VERIFIED: ['NEEDS_RELEARNING', 'VERIFICATION_PENDING'],
  NEEDS_RELEARNING: ['IN_PROGRESS', 'STUDIED', 'VERIFICATION_PENDING'],
};

export interface ObjectiveTransitionContext {
  verifiedByAssessmentAttemptId?: string | null;
  additionalMinutesSpent?: number;
  now?: Date;
}

export interface ObjectiveTransitionResult {
  objective: PlanObjective;
  chapterStudyCompleted: boolean;
  needsVerificationPrompt: boolean;
  historyEvent: MasteryHistoryEvent | null;
}

export function isObjectiveStudiedOrBeyond(state: ObjectiveState): boolean {
  return (
    state === 'STUDIED' ||
    state === 'VERIFICATION_PENDING' ||
    state === 'VERIFIED'
  );
}

export function canTransitionObjectiveState(
  fromState: ObjectiveState,
  toState: ObjectiveState,
  context: ObjectiveTransitionContext = {}
): { allowed: boolean; reason?: string } {
  if (fromState === toState) {
    return { allowed: true };
  }

  // Strictly block granting VERIFIED without server-verified assessment attempt evidence
  if (toState === 'VERIFIED' && !context.verifiedByAssessmentAttemptId) {
    return {
      allowed: false,
      reason:
        'Marking an objective studied cannot automatically grant VERIFIED mastery. Pass an objective verification assessment first.',
    };
  }

  const allowedTargets = ALLOWED_TRANSITIONS[fromState] || [];
  if (!allowedTargets.includes(toState)) {
    return {
      allowed: false,
      reason: `Invalid objective state transition from ${fromState} to ${toState}.`,
    };
  }

  return { allowed: true };
}

/**
 * Transitions a learning objective through the 6-state Execution Engine lifecycle.
 * Strictly separates study completion (`STUDIED`) from verified understanding (`VERIFIED`).
 */
export function transitionObjectiveState(
  objective: PlanObjective,
  nextState: ObjectiveState,
  context: ObjectiveTransitionContext = {},
  siblingChapterObjectives: PlanObjective[] = []
): ObjectiveTransitionResult {
  const check = canTransitionObjectiveState(objective.state, nextState, context);
  if (!check.allowed) {
    throw new Error(check.reason || 'Disallowed objective transition');
  }

  const nowIso = (context.now || new Date()).toISOString();
  const addedMinutes = Math.max(0, Math.round(context.additionalMinutesSpent || 0));

  const updatedObjective: PlanObjective = {
    ...objective,
    state: nextState,
    actualMinutes: (objective.actualMinutes || 0) + addedMinutes,
    studiedAt:
      nextState === 'STUDIED' || nextState === 'VERIFICATION_PENDING'
        ? objective.studiedAt || nowIso
        : nextState === 'PENDING'
        ? null
        : objective.studiedAt,
    verifiedAt:
      nextState === 'VERIFIED'
        ? nowIso
        : nextState === 'NEEDS_RELEARNING'
        ? null
        : objective.verifiedAt,
    updatedAt: nowIso,
  };

  // Compute whether all objectives for this chapter are now studied (or beyond)
  const chapterPeers = siblingChapterObjectives.filter(
    (o) => o.chapterId === objective.chapterId && o.id !== objective.id
  );
  const allChapterObjectives = [...chapterPeers, updatedObjective];
  const chapterStudyCompleted =
    allChapterObjectives.length > 0 &&
    allChapterObjectives.every((o) => isObjectiveStudiedOrBeyond(o.state));

  let historyEvent: MasteryHistoryEvent | null = null;
  if (nextState === 'VERIFIED' && objective.state !== 'VERIFIED') {
    historyEvent = {
      id: `mh-${objective.id}-${Date.now()}`,
      chapterId: objective.chapterId,
      conceptId: objective.conceptId || null,
      eventType: 'OBJECTIVE_VERIFIED',
      previousStatus: objective.state,
      newStatus: 'VERIFIED',
      attemptId: context.verifiedByAssessmentAttemptId || null,
      notes: `Objective verified: ${objective.title}`,
      recordedAt: nowIso,
    };
  } else if (nextState === 'NEEDS_RELEARNING' && objective.state !== 'NEEDS_RELEARNING') {
    historyEvent = {
      id: `mh-${objective.id}-${Date.now()}`,
      chapterId: objective.chapterId,
      conceptId: objective.conceptId || null,
      eventType: 'OBJECTIVE_FAILED',
      previousStatus: objective.state,
      newStatus: 'NEEDS_RELEARNING',
      attemptId: context.verifiedByAssessmentAttemptId || null,
      notes: `Relearning flagged for objective: ${objective.title}`,
      recordedAt: nowIso,
    };
  }

  return {
    objective: updatedObjective,
    chapterStudyCompleted,
    needsVerificationPrompt:
      nextState === 'STUDIED' || nextState === 'VERIFICATION_PENDING',
    historyEvent,
  };
}

/**
 * Recomputes chapter study status cleanly from objectives.
 * Never grants MASTERED via study completion alone, and never erases studyCompleted on failed tests.
 */
export function deriveChapterMasteryAfterStudyChange(
  existing: ChapterMasteryRecord | null | undefined,
  chapterId: string,
  chapterObjectives: PlanObjective[],
  now: Date = new Date()
): { record: ChapterMasteryRecord; historyEvent: MasteryHistoryEvent | null } {
  const nowIso = now.toISOString();
  const anyStarted = chapterObjectives.some((o) => o.state !== 'PENDING');
  const allStudied =
    chapterObjectives.length > 0 &&
    chapterObjectives.every((o) => isObjectiveStudiedOrBeyond(o.state));
  const anyNeedsVerification = chapterObjectives.some(
    (o) => o.state === 'VERIFICATION_PENDING'
  );

  const prevStatus: ChapterMasteryStatus = existing?.status || 'NOT_STARTED';
  const preserveStudyCompleted = Boolean(existing?.studyCompleted) || allStudied;

  let nextStatus: ChapterMasteryStatus = prevStatus;

  if (prevStatus === 'MASTERED') {
    nextStatus = 'MASTERED';
  } else if (prevStatus === 'NEEDS_REVISION') {
    nextStatus = 'NEEDS_REVISION';
  } else if (prevStatus === 'MASTERY_PENDING' || anyNeedsVerification) {
    nextStatus = allStudied ? 'MASTERY_PENDING' : 'IN_PROGRESS';
  } else if (allStudied || preserveStudyCompleted) {
    nextStatus = 'STUDY_COMPLETE';
  } else if (anyStarted) {
    nextStatus = 'IN_PROGRESS';
  } else {
    nextStatus = 'NOT_STARTED';
  }

  const record: ChapterMasteryRecord = {
    id: existing?.id,
    userId: existing?.userId,
    chapterId,
    subjectId: existing?.subjectId || null,
    status: nextStatus,
    studyCompleted: preserveStudyCompleted,
    masteryScore: existing?.masteryScore || 0,
    bestMasteryScore: existing?.bestMasteryScore || 0,
    conceptCoveragePercent: existing?.conceptCoveragePercent || 0,
    attemptsCount: existing?.attemptsCount || 0,
    lastAssessmentAttemptId: existing?.lastAssessmentAttemptId || null,
    studyCompletedAt:
      existing?.studyCompletedAt || (preserveStudyCompleted ? nowIso : null),
    firstMasteredAt: existing?.firstMasteredAt || null,
    lastMasteredAt: existing?.lastMasteredAt || null,
    updatedAt: nowIso,
  };

  let historyEvent: MasteryHistoryEvent | null = null;
  if (!existing?.studyCompleted && preserveStudyCompleted) {
    historyEvent = {
      id: `mh-study-${chapterId}-${Date.now()}`,
      chapterId,
      eventType: 'STUDY_COMPLETED',
      previousStatus: prevStatus,
      newStatus: nextStatus,
      notes: 'All scheduled study objectives completed. Mastery verification still required for MASTERED.',
      recordedAt: nowIso,
    };
  }

  return { record, historyEvent };
}
