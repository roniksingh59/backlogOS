import { LevelInfo } from './types';

// Transparent level curve tailored for academic consistency:
// Level 1: 0 - 300 XP
// Level 2: 300 - 750 XP (+450)
// Level 3: 750 - 1350 XP (+600)
// Level 4: 1350 - 2100 XP (+750)
// Level 5: 2100 - 3000 XP (+900)
// Level 6: 3000 - 4050 XP (+1050)
// Level 7: 4050 - 5250 XP (+1200)
// Level 8: 5250 - 6600 XP (+1350)
// Level 9: 6600 - 8100 XP (+1500)
// Level 10: 8100 - 9750 XP (+1650)
// Formula for level threshold: BaseXP(L) = 150 * (L - 1) * L / 2 * 3 ... or clean cumulative brackets.

const LEVEL_THRESHOLDS: number[] = [
  0,     // Level 1 starts at 0 XP
  300,   // Level 2 starts at 300 XP
  750,   // Level 3 starts at 750 XP
  1350,  // Level 4 starts at 1,350 XP
  2100,  // Level 5 starts at 2,100 XP
  3000,  // Level 6 starts at 3,000 XP
  4050,  // Level 7 starts at 4,050 XP
  5250,  // Level 8 starts at 5,250 XP
  6600,  // Level 9 starts at 6,600 XP
  8100,  // Level 10 starts at 8,100 XP
  9750,  // Level 11 starts at 9,750 XP
  11550, // Level 12 starts at 11,550 XP
  13500, // Level 13 starts at 13,500 XP
  15600, // Level 14 starts at 15,600 XP
  17850, // Level 15 starts at 17,850 XP
  20250, // Level 16 starts at 20,250 XP
  22800, // Level 17 starts at 22,800 XP
  25500, // Level 18 starts at 25,500 XP
  28350, // Level 19 starts at 28,350 XP
  31350, // Level 20 starts at 31,350 XP
];

export function getLevelThreshold(level: number): number {
  if (level <= 1) return 0;
  if (level - 1 < LEVEL_THRESHOLDS.length) {
    return LEVEL_THRESHOLDS[level - 1];
  }
  // Formula for levels beyond 20:
  const lastKnown = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const extraLevels = level - LEVEL_THRESHOLDS.length;
  return lastKnown + extraLevels * 3200;
}

export function getLevelInfo(totalXp: number): LevelInfo {
  const safeXp = Math.max(0, Math.floor(totalXp || 0));

  let currentLevel = 1;
  while (safeXp >= getLevelThreshold(currentLevel + 1)) {
    currentLevel++;
  }

  const currentLevelBaseXp = getLevelThreshold(currentLevel);
  const nextLevelXp = getLevelThreshold(currentLevel + 1);
  const xpNeededForNextLevel = Math.max(1, nextLevelXp - currentLevelBaseXp);
  const xpIntoCurrentLevel = Math.max(0, safeXp - currentLevelBaseXp);
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round((xpIntoCurrentLevel / xpNeededForNextLevel) * 100))
  );

  return {
    level: currentLevel,
    currentXp: safeXp,
    currentLevelBaseXp,
    nextLevelXp,
    xpIntoCurrentLevel,
    xpNeededForNextLevel,
    progressPercent,
  };
}

export function getAcademicRankTitle(level: number): string {
  if (level >= 20) return 'Board Exam Master';
  if (level >= 16) return 'CBSE Scholar';
  if (level >= 12) return 'Syllabus Strategist';
  if (level >= 8) return 'Consistent Scholar';
  if (level >= 5) return 'Focused Aspirant';
  if (level >= 3) return 'Active Student';
  return 'Foundation Builder';
}
