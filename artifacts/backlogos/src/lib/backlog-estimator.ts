/**
 * BacklogOS Intelligent Backlog-Clearing Time Estimator
 *
 * Unified mathematical model for calculating genuine academic workload,
 * daily hours needed, estimated completion dates, and subject-wise breakdowns.
 *
 * Formula:
 * Workload = (LearningTime + PracticeTime + RevisionTime) * DifficultyMultiplier * StatusFactor
 */

export type ChapterDifficulty = 'easy' | 'medium' | 'hard';
export type BacklogStatus = 'untouched' | 'partially_completed' | 'needs_revision' | 'completed';

export interface BacklogChapterInput {
  id: string;
  title: string;
  subject: string;
  estimatedHours?: number;
  difficulty?: ChapterDifficulty | string;
  status?: BacklogStatus | string;
  isCompleted?: boolean;
}

export interface SubjectWorkload {
  subject: string;
  hours: number;
  chaptersCount: number;
  completedCount: number;
  progressPercent: number;
}

export interface BacklogEstimateResult {
  totalBacklogHours: number;
  totalChapters: number;
  completedChapters: number;
  remainingChapters: number;
  progressPercent: number;
  dailyHoursNeeded: number;
  estimatedDaysToClear: number;
  estimatedCompletionDate: string;
  subjectWiseBreakdown: SubjectWorkload[];
  weeklyWorkloadHours: number;
  urgencyLevel: 'relaxed' | 'manageable' | 'demanding' | 'critical';
}

const DIFFICULTY_MULTIPLIERS: Record<string, number> = {
  easy: 0.8,
  low: 0.8,
  medium: 1.0,
  hard: 1.3,
  critical: 1.3,
};

const STATUS_FACTORS: Record<string, number> = {
  untouched: 1.0,
  not_started: 1.0,
  partially_completed: 0.6,
  in_progress: 0.6,
  needs_revision: 0.4,
  review: 0.4,
  completed: 0.0,
};

/**
 * Calculates estimated workload for a single chapter taking into account
 * learning time (45%), practice time (35%), revision time (20%), difficulty, and current status.
 */
export function estimateChapterWorkload(chapter: BacklogChapterInput): {
  baseHours: number;
  learningHours: number;
  practiceHours: number;
  revisionHours: number;
  weightedHours: number;
} {
  const base = Math.max(1, chapter.estimatedHours || 5);
  const diffKey = (chapter.difficulty || 'medium').toLowerCase();
  const diffMult = DIFFICULTY_MULTIPLIERS[diffKey] ?? 1.0;

  let statusKey = (chapter.status || 'untouched').toLowerCase();
  if (chapter.isCompleted) {
    statusKey = 'completed';
  }
  const statusFactor = STATUS_FACTORS[statusKey] ?? 1.0;

  const learning = Math.round(base * 0.45 * 10) / 10;
  const practice = Math.round(base * 0.35 * 10) / 10;
  const revision = Math.round(base * 0.20 * 10) / 10;

  const weighted = Math.round((learning + practice + revision) * diffMult * statusFactor * 10) / 10;

  return {
    baseHours: base,
    learningHours: learning,
    practiceHours: practice,
    revisionHours: revision,
    weightedHours: weighted,
  };
}

/**
 * Formats a date into a clean, readable student format (e.g. "24 Apr 2026")
 */
export function formatCompletionDate(date: Date): string {
  try {
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return date.toISOString().split('T')[0];
  }
}

/**
 * Computes complete backlog estimation metrics across a student's full list of chapters
 */
export function computeBacklogEstimates(
  chapters: BacklogChapterInput[],
  options: {
    dailyTargetHours?: number;
    targetExamDate?: string;
    completedChapterIds?: string[];
  } = {}
): BacklogEstimateResult {
  const completedSet = new Set(options.completedChapterIds || []);
  let totalRemainingHours = 0;
  let completedCount = 0;

  const subjectMap = new Map<string, { totalHours: number; count: number; completed: number }>();

  chapters.forEach((ch) => {
    const isDone = completedSet.has(ch.id) || ch.isCompleted || ch.status === 'completed';
    if (isDone) {
      completedCount++;
    }

    const itemInput: BacklogChapterInput = {
      ...ch,
      isCompleted: isDone,
      status: isDone ? 'completed' : (ch.status || 'untouched'),
    };

    const { weightedHours } = estimateChapterWorkload(itemInput);
    if (!isDone) {
      totalRemainingHours += weightedHours;
    }

    const subj = ch.subject || 'General';
    const curr = subjectMap.get(subj) || { totalHours: 0, count: 0, completed: 0 };
    curr.totalHours += isDone ? 0 : weightedHours;
    curr.count += 1;
    if (isDone) curr.completed += 1;
    subjectMap.set(subj, curr);
  });

  const totalChapters = chapters.length;
  const remainingChapters = totalChapters - completedCount;
  const progressPercent = totalChapters > 0 ? Math.round((completedCount / totalChapters) * 100) : 0;

  // Determine Daily Study Hours
  let dailyHours = options.dailyTargetHours || 2.5;

  // If a target exam date is specified, calculate required daily pace
  if (options.targetExamDate) {
    try {
      const examTime = new Date(options.targetExamDate).getTime();
      const nowTime = Date.now();
      const daysUntilExam = Math.max(1, Math.ceil((examTime - nowTime) / (1000 * 60 * 60 * 24)));
      const paceNeeded = Math.round((totalRemainingHours / daysUntilExam) * 10) / 10;
      if (paceNeeded > 0) {
        dailyHours = paceNeeded;
      }
    } catch {
      // Fallback to dailyTargetHours
    }
  }

  const effectiveDailyHours = Math.max(0.5, dailyHours);
  const estimatedDaysToClear = Math.ceil(totalRemainingHours / effectiveDailyHours);

  const completionDateObj = new Date(Date.now() + estimatedDaysToClear * 24 * 60 * 60 * 1000);
  const estimatedCompletionDate = formatCompletionDate(completionDateObj);

  // Subject-wise breakdown
  const subjectWiseBreakdown: SubjectWorkload[] = Array.from(subjectMap.entries()).map(
    ([subject, data]) => ({
      subject,
      hours: Math.round(data.totalHours * 10) / 10,
      chaptersCount: data.count,
      completedCount: data.completed,
      progressPercent: data.count > 0 ? Math.round((data.completed / data.count) * 100) : 0,
    })
  );

  // Sort subjects by highest remaining backlog hours first
  subjectWiseBreakdown.sort((a, b) => b.hours - a.hours);

  const weeklyWorkloadHours = Math.round(effectiveDailyHours * 7 * 10) / 10;

  // Urgency classification
  let urgencyLevel: 'relaxed' | 'manageable' | 'demanding' | 'critical' = 'manageable';
  if (effectiveDailyHours < 1.5) {
    urgencyLevel = 'relaxed';
  } else if (effectiveDailyHours <= 3.0) {
    urgencyLevel = 'manageable';
  } else if (effectiveDailyHours <= 5.0) {
    urgencyLevel = 'demanding';
  } else {
    urgencyLevel = 'critical';
  }

  return {
    totalBacklogHours: Math.round(totalRemainingHours * 10) / 10,
    totalChapters,
    completedChapters: completedCount,
    remainingChapters,
    progressPercent,
    dailyHoursNeeded: Math.round(effectiveDailyHours * 10) / 10,
    estimatedDaysToClear,
    estimatedCompletionDate,
    subjectWiseBreakdown,
    weeklyWorkloadHours,
    urgencyLevel,
  };
}
