import { chapters, type Subject } from './backlog-data';
import {
  PREREQUISITE_GRAPH,
  getDependentsCount,
  checkUnfinishedPrerequisites,
  getChapterTitle,
} from './prerequisites-graph';

export type BacklogStatus =
  | 'not_started'
  | 'learning'
  | 'practicing'
  | 'revision'
  | 'completed';

export type BacklogDifficulty = 'easy' | 'medium' | 'hard';
export type BacklogConfidence = 'low' | 'medium' | 'high';
export type ExamRelevance = 'critical' | 'high' | 'medium' | 'low';
export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low';

export interface BacklogItem {
  id: string;
  chapterId: string;
  subject: Subject;
  topic: string;
  estimatedHours: number;
  hoursSpent: number;
  difficulty: BacklogDifficulty;
  status: BacklogStatus;
  confidence: BacklogConfidence;
  examRelevance: ExamRelevance;
  prerequisites: string[]; // chapterIds
  deadline?: string; // YYYY-MM-DD
  notes?: string;
  createdAt: string;
  completedAt?: string;
}

export interface PriorityScoreResult {
  level: PriorityLevel;
  score: number; // 0 - 100
  badgeEmoji: string;
  badgeLabel: string;
  primaryReason: string;
  detailedReasons: string[];
}

export const STATUS_LABELS: Record<BacklogStatus, string> = {
  not_started: 'Not Started',
  learning: 'Learning',
  practicing: 'Practicing',
  revision: 'Revision',
  completed: 'Completed',
};

export const DIFFICULTY_LABELS: Record<BacklogDifficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

export const CONFIDENCE_LABELS: Record<BacklogConfidence, string> = {
  low: 'Low (Struggling)',
  medium: 'Medium (Fair)',
  high: 'High (Confident)',
};

export const RELEVANCE_LABELS: Record<ExamRelevance, string> = {
  critical: 'Critical (High Weightage)',
  high: 'High Yield',
  medium: 'Medium Yield',
  low: 'Low Yield',
};

/**
 * Transparent Priority Calculation Engine
 * Factors:
 * 1. Exam importance (Critical +35, High +25, Medium +15, Low +5)
 * 2. Student confidence (Low +25, Medium +12, High 0)
 * 3. Prerequisite blocker count (If other chapters depend on this chapter: +6 per dependent, up to +24)
 * 4. Difficulty (Hard +12, Medium +7, Easy +2)
 * 5. Estimated hours vs remaining time proximity (+5 to +10)
 */
export function calculatePriorityScore(
  item: BacklogItem,
  allCompletedIds: string[] = []
): PriorityScoreResult {
  if (item.status === 'completed') {
    return {
      level: 'low',
      score: 0,
      badgeEmoji: '🟢',
      badgeLabel: 'Completed',
      primaryReason: 'Chapter has been cleared and marked completed.',
      detailedReasons: ['All topics and practice cleared.'],
    };
  }

  let score = 0;
  const detailedReasons: string[] = [];

  // 1. Exam Relevance Weight
  if (item.examRelevance === 'critical') {
    score += 35;
    detailedReasons.push('Carries highest marks in JEE/CBSE');
  } else if (item.examRelevance === 'high') {
    score += 25;
    detailedReasons.push('High-yield exam weightage');
  } else if (item.examRelevance === 'medium') {
    score += 15;
    detailedReasons.push('Standard syllabus weightage');
  } else {
    score += 5;
    detailedReasons.push('Moderate exam weightage');
  }

  // 2. Student Confidence Weight
  if (item.confidence === 'low') {
    score += 25;
    detailedReasons.push('Confidence is low; needs early concept rebuilding');
  } else if (item.confidence === 'medium') {
    score += 12;
    detailedReasons.push('Confidence is average; needs targeted practice');
  } else {
    detailedReasons.push('High confidence');
  }

  // 3. Prerequisite Blocker Effect
  const dependentsCount = getDependentsCount(item.chapterId);
  if (dependentsCount > 0) {
    const dependentBonus = Math.min(24, dependentsCount * 8);
    score += dependentBonus;
    detailedReasons.push(
      `Prerequisite for ${dependentsCount} subsequent chapter${
        dependentsCount > 1 ? 's' : ''
      }`
    );
  }

  // Check if this item has unfinished prerequisites itself
  const prereqCheck = checkUnfinishedPrerequisites(
    item.chapterId,
    allCompletedIds
  );
  if (prereqCheck.hasUnfinished) {
    detailedReasons.push(
      `Has ${prereqCheck.unfinishedPrereqs.length} unfinished foundation chapter(s)`
    );
  }

  // 4. Difficulty
  if (item.difficulty === 'hard') {
    score += 12;
    detailedReasons.push('Complex chapter requiring deep focus blocks');
  } else if (item.difficulty === 'medium') {
    score += 7;
  } else {
    score += 2;
  }

  // 5. Deadline urgency
  if (item.deadline) {
    const daysLeft = Math.ceil(
      (new Date(item.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysLeft <= 7 && daysLeft >= 0) {
      score += 15;
      detailedReasons.push(`Target deadline is in ${daysLeft} day(s)`);
    } else if (daysLeft <= 21 && daysLeft > 7) {
      score += 8;
      detailedReasons.push(`Target deadline is within 3 weeks`);
    }
  }

  // Normalize score
  score = Math.min(100, Math.max(5, score));

  let level: PriorityLevel = 'low';
  let badgeEmoji = '🟢';
  let badgeLabel = 'Low Priority';

  if (score >= 65) {
    level = 'critical';
    badgeEmoji = '🔴';
    badgeLabel = 'Critical Priority';
  } else if (score >= 45) {
    level = 'high';
    badgeEmoji = '🟠';
    badgeLabel = 'High Priority';
  } else if (score >= 25) {
    level = 'medium';
    badgeEmoji = '🟡';
    badgeLabel = 'Medium Priority';
  }

  const primaryReason = `${badgeLabel.split(' ')[0]} — ${detailedReasons
    .slice(0, 2)
    .join(' and ')}.`;

  return {
    level,
    score,
    badgeEmoji,
    badgeLabel,
    primaryReason,
    detailedReasons,
  };
}

export interface BacklogMetrics {
  totalBacklogHours: number;
  completedHours: number;
  remainingHours: number;
  percentageCompleted: number;
  hoursRecovered: number;
  estimatedCompletionDate: string; // formatted e.g. "Oct 24, 2026"
  daysToComplete: number;
  subjectMetrics: Record<
    Subject,
    { total: number; completed: number; remaining: number; count: number }
  >;
  statusCounts: Record<BacklogStatus, number>;
  priorityCounts: Record<PriorityLevel, number>;
}

export function calculateBacklogMetrics(
  items: BacklogItem[],
  dailyStudyHours: number = 3
): BacklogMetrics {
  let totalHours = 0;
  let completedHours = 0;
  let remainingHours = 0;
  let hoursRecovered = 0;

  const subjectMetrics: Record<
    Subject,
    { total: number; completed: number; remaining: number; count: number }
  > = {
    Physics: { total: 0, completed: 0, remaining: 0, count: 0 },
    Chemistry: { total: 0, completed: 0, remaining: 0, count: 0 },
    Mathematics: { total: 0, completed: 0, remaining: 0, count: 0 },
  };

  const statusCounts: Record<BacklogStatus, number> = {
    not_started: 0,
    learning: 0,
    practicing: 0,
    revision: 0,
    completed: 0,
  };

  const priorityCounts: Record<PriorityLevel, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  const completedIds = items
    .filter((i) => i.status === 'completed')
    .map((i) => i.chapterId);

  items.forEach((item) => {
    totalHours += item.estimatedHours;
    hoursRecovered += item.hoursSpent;

    const sub = item.subject as Subject;
    if (subjectMetrics[sub]) {
      subjectMetrics[sub].total += item.estimatedHours;
      subjectMetrics[sub].count += 1;
    }

    statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;

    const prio = calculatePriorityScore(item, completedIds);
    priorityCounts[prio.level] = (priorityCounts[prio.level] || 0) + 1;

    if (item.status === 'completed') {
      completedHours += item.estimatedHours;
      if (subjectMetrics[sub]) {
        subjectMetrics[sub].completed += item.estimatedHours;
      }
    } else {
      const remainingForThis = Math.max(
        0,
        item.estimatedHours - item.hoursSpent
      );
      remainingHours += remainingForThis;
      if (subjectMetrics[sub]) {
        subjectMetrics[sub].remaining += remainingForThis;
      }
    }
  });

  const percentageCompleted =
    totalHours > 0 ? Math.round((completedHours / totalHours) * 100) : 0;

  const effectiveDaily = Math.max(0.5, dailyStudyHours);
  const daysToComplete = Math.ceil(remainingHours / effectiveDaily);

  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + daysToComplete);
  const estimatedCompletionDate = targetDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return {
    totalBacklogHours: Math.round(totalHours * 10) / 10,
    completedHours: Math.round(completedHours * 10) / 10,
    remainingHours: Math.round(remainingHours * 10) / 10,
    percentageCompleted,
    hoursRecovered: Math.round(hoursRecovered * 10) / 10,
    estimatedCompletionDate,
    daysToComplete,
    subjectMetrics,
    statusCounts,
    priorityCounts,
  };
}

/**
 * Creates initial default backlog items from selected or all chapters
 */
export function generateDefaultBacklogItems(
  selectedChapterIds?: string[]
): BacklogItem[] {
  const targetChapters =
    selectedChapterIds && selectedChapterIds.length > 0
      ? chapters.filter((c) => selectedChapterIds.includes(c.id))
      : chapters.slice(0, 12); // Default first 12 foundation chapters

  const highYieldIds = new Set([
    'phy-vectors',
    'phy-laws',
    'phy-work',
    'phy-rotation',
    'phy-thermo',
    'chem-basic',
    'chem-bonding',
    'chem-thermo',
    'chem-equilibrium',
    'chem-organic',
    'math-trig',
    'math-sequence',
    'math-conic',
    'math-limits',
  ]);

  const hardIds = new Set([
    'phy-rotation',
    'phy-system',
    'phy-fluids',
    'chem-thermo',
    'chem-equilibrium',
    'math-pnc',
    'math-conic',
    'math-limits',
  ]);

  return targetChapters.map((ch, index) => {
    const isHighYield = highYieldIds.has(ch.id);
    const isHard = hardIds.has(ch.id);
    const est = isHard ? 12 : isHighYield ? 8 : 5;

    return {
      id: `backlog-${ch.id}`,
      chapterId: ch.id,
      subject: ch.subject,
      topic: ch.title,
      estimatedHours: est,
      hoursSpent: 0,
      difficulty: isHard ? 'hard' : isHighYield ? 'medium' : 'easy',
      status: 'not_started',
      confidence: isHard ? 'low' : 'medium',
      examRelevance: isHighYield ? 'critical' : 'high',
      prerequisites: PREREQUISITE_GRAPH[ch.id] || [],
      createdAt: new Date().toISOString(),
    };
  });
}
