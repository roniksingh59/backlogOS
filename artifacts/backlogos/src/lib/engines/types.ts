export type ObjectiveState =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'STUDIED'
  | 'VERIFICATION_PENDING'
  | 'VERIFIED'
  | 'NEEDS_RELEARNING';

export type ObjectiveKind = 'learn' | 'practice' | 'revise' | 'verify' | 'recovery';

export type ChapterMasteryStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'STUDY_COMPLETE'
  | 'MASTERY_PENDING'
  | 'MASTERED'
  | 'NEEDS_REVISION';

export type ConceptMasteryStatus =
  | 'UNASSESSED'
  | 'WEAK'
  | 'DEVELOPING'
  | 'MASTERED'
  | 'NEEDS_REVISION';

export type ReviewScheduleStatus =
  | 'SCHEDULED'
  | 'DUE'
  | 'OVERDUE'
  | 'COMPLETED'
  | 'PAUSED';

export type MasteryEventType =
  | 'STUDY_COMPLETED'
  | 'OBJECTIVE_VERIFIED'
  | 'OBJECTIVE_FAILED'
  | 'CHAPTER_MASTERED'
  | 'CHAPTER_FAILED'
  | 'REVISION_PASSED'
  | 'REVISION_DECAYED';

export interface PlanObjective {
  id: string;
  planId: string;
  planDayId: string;
  userId?: string;
  dayNumber: number;
  chapterId: string;
  conceptId?: string | null;
  subjectName: string;
  title: string;
  description: string;
  kind: ObjectiveKind;
  state: ObjectiveState;
  priorityScore: number;
  estimatedMinutes: number;
  actualMinutes: number;
  sequenceOrder: number;
  scheduledDate: string | null; // YYYY-MM-DD
  missedCount: number;
  rescheduledFromDayId?: string | null;
  rescheduledFromDayNumber?: number | null;
  legacyTaskKey: string;
  studiedAt?: string | null;
  verifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NormalizedPlanDay {
  id: string;
  planId: string;
  dayNumber: number;
  scheduledDate: string; // YYYY-MM-DD
  title: string;
  focusTheme: string;
  dayOfWeekLabel: string;
  rhythmBadge: string;
  allocatedMinutes: number;
  maxCapacityMinutes: number;
  isRecoveryDay: boolean;
  isPrerequisiteDay: boolean;
  isRecap: boolean;
  primaryChapterId: string;
  secondaryChapterId?: string;
  objectives: PlanObjective[];
}

export interface NormalizedPlan {
  id: string;
  userId?: string;
  name: string;
  planHorizonDays: number;
  isActive: boolean;
  status: 'active' | 'paused' | 'completed' | 'archived';
  board: string;
  goal: string;
  priority: string;
  confidence: 'rusty' | 'mixed' | 'solid';
  examDate: string;
  startDate: string; // YYYY-MM-DD
  minutesPerDay: number;
  subjects: string[];
  selectedChapterIds: string[];
  orderedChapterIds: string[];
  prerequisiteChapterIds: string[];
  prerequisiteWarnings: string[];
  orderReason: string;
  coverageNote: string;
  rescheduleCount: number;
  lastRescheduledAt?: string | null;
  days: NormalizedPlanDay[];
  createdAt: string;
  updatedAt: string;
}

export interface MovedObjectiveSummary {
  objectiveId: string;
  title: string;
  chapterId: string;
  fromDayNumber: number;
  fromDate: string | null;
  toDayNumber: number;
  toDate: string;
  estimatedMinutes: number;
}

export interface RescheduleResult {
  plan: NormalizedPlan;
  movedObjectives: MovedObjectiveSummary[];
  createdOverflowDaysCount: number;
  unscheduledCount: number;
  preservedCapacityLimitMinutes: number;
  summaryMessage: string;
}

export interface ChapterMasteryRecord {
  id?: string;
  userId?: string;
  chapterId: string;
  subjectId?: string | null;
  status: ChapterMasteryStatus;
  studyCompleted: boolean;
  masteryScore: number;
  bestMasteryScore: number;
  conceptCoveragePercent: number;
  attemptsCount: number;
  lastAssessmentAttemptId?: string | null;
  studyCompletedAt?: string | null;
  firstMasteredAt?: string | null;
  lastMasteredAt?: string | null;
  updatedAt: string;
}

export interface ConceptMasteryRecord {
  id?: string;
  userId?: string;
  chapterId: string;
  conceptId: string;
  catalogConceptId?: string | null;
  conceptTitle: string;
  masteryScore: number;
  attemptsCount: number;
  correctCount: number;
  status: ConceptMasteryStatus;
  lastAssessedAt?: string | null;
  updatedAt: string;
}

export interface MasteryHistoryEvent {
  id: string;
  userId?: string;
  chapterId: string;
  conceptId?: string | null;
  eventType: MasteryEventType;
  previousStatus?: string | null;
  newStatus: string;
  scorePercent?: number | null;
  attemptId?: string | null;
  notes: string;
  recordedAt: string;
}

export interface ReviewScheduleRecord {
  id: string;
  userId?: string;
  chapterId: string;
  chapterTitle?: string;
  subjectName?: string;
  conceptId?: string | null;
  intervalStep: number;
  intervalDays: number;
  easeFactor: number;
  dueDate: string; // YYYY-MM-DD
  status: ReviewScheduleStatus;
  retentionHealthScore: number;
  lastReviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewAttemptRecord {
  id: string;
  reviewScheduleId: string;
  userId?: string;
  chapterId: string;
  assessmentAttemptId?: string | null;
  recallQuality: 1 | 2 | 3 | 4 | 5;
  scorePercent: number;
  passed: boolean;
  previousIntervalDays: number;
  nextIntervalDays: number;
  reviewedAt: string;
}

export interface SubjectSeparatedMetrics {
  subject: string;
  totalChapters: number;
  studyCompletedChapters: number;
  masteredChapters: number;
  backlogClearancePercent: number;
  conceptMasteryPercent: number;
  assessedConceptsCount: number;
}

export interface DailyStudyActivityPoint {
  date: string; // YYYY-MM-DD
  dayLabel: string;
  minutesStudied: number;
  objectivesStudied: number;
  objectivesVerified: number;
}

export interface WeakConceptSummary {
  conceptId: string;
  conceptTitle: string;
  chapterId: string;
  chapterTitle: string;
  subject: string;
  masteryScore: number;
  attemptsCount: number;
  status: ConceptMasteryStatus;
}

export interface AnalyticsDashboardMetrics {
  // Strictly separated core metrics (backlog completion != learning mastery)
  backlogClearancePercent: number;
  conceptMasteryPercent: number;
  retentionHealthPercent: number;

  completedObjectivesCount: number; // STUDIED + VERIFICATION_PENDING + VERIFIED
  verifiedObjectivesCount: number; // strictly VERIFIED
  totalObjectivesCount: number;
  objectivesByState: Record<ObjectiveState, number>;

  totalBacklogChapters: number;
  studyCompletedChaptersCount: number;
  masteredChaptersCount: number; // strictly MASTERED
  chaptersByStatus: Record<ChapterMasteryStatus, number>;

  pendingRevisionsCount: number;
  overdueRevisionsCount: number;
  completedRevisionsCount: number;
  hasRetentionData: boolean;
  hasAssessmentData: boolean;

  weakConcepts: WeakConceptSummary[];
  subjectBreakdown: SubjectSeparatedMetrics[];
  weeklyActivity: DailyStudyActivityPoint[];
  totalFocusMinutesLogged: number;
  activeStudyStreakDays: number;
}
