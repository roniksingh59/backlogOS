export type MilestoneCategory =
  | 'session'
  | 'chapter'
  | 'hours'
  | 'streak'
  | 'backlog'
  | 'revision'
  | 'test'
  | 'subject';

export interface AcademicMilestone {
  id: string;
  title: string;
  description: string;
  iconName: string;
  xpReward: number;
  category: MilestoneCategory;
  targetValue: number;
  unlockedAt?: string;
}

export interface LevelInfo {
  level: number;
  currentXp: number;
  currentLevelBaseXp: number;
  nextLevelXp: number;
  xpIntoCurrentLevel: number;
  xpNeededForNextLevel: number;
  progressPercent: number;
}

export interface UserProgression {
  userId: string;
  xp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null; // YYYY-MM-DD
  startingBacklogHours: number;
  unlockedMilestoneIds: string[];
  processedActionIds: string[];
  updatedAt: string;
}

export interface MilestoneProgressItem {
  milestone: AcademicMilestone;
  isUnlocked: boolean;
  currentValue: number;
  targetValue: number;
  percent: number;
  unlockedAt?: string;
}

export interface ProgressionStats {
  levelInfo: LevelInfo;
  progression: UserProgression;
  totalHoursStudied: number;
  totalSessionsCount: number;
  completedChaptersCount: number;
  completedSubjectsCount: number;
  startingBacklogHours: number;
  currentBacklogHours: number;
  hoursCleared: number;
  percentageRecovered: number;
  activeStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  milestones: MilestoneProgressItem[];
}
