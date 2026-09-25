import { chapters, type Subject } from './backlog-data';
import { getChapterTitle } from './prerequisites-graph';

export type MistakeCategory =
  | 'conceptual'
  | 'calculation'
  | 'silly'
  | 'time_management'
  | 'unattempted';

export interface MistakeEntry {
  category: MistakeCategory;
  count: number;
  questionNumbers?: string;
  notes?: string;
}

export interface TestLog {
  id: string;
  testName: string;
  subject: Subject | 'PCM Combined';
  chapterIds: string[];
  score: number;
  maxMarks: number;
  date: string; // YYYY-MM-DD
  mistakes: Record<MistakeCategory, number>;
  notes?: string;
  createdAt: string;
}

export const MISTAKE_LABELS: Record<MistakeCategory, { label: string; desc: string; color: string }> = {
  conceptual: {
    label: 'Conceptual Error',
    desc: 'Formula misapplication, flawed theory assumption',
    color: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
  },
  calculation: {
    label: 'Calculation Error',
    desc: 'Arithmetic slips, sign mistakes, unit conversions',
    color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  },
  silly: {
    label: 'Silly Mistake',
    desc: 'Misread question, marked wrong option, rushed reading',
    color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
  },
  time_management: {
    label: 'Time Crunch',
    desc: 'Spent too long on early problems, panicked at end',
    color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  },
  unattempted: {
    label: 'Unattempted / Blind Spot',
    desc: 'Topic unstudied or no clue how to start',
    color: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
  },
};

export interface TestRecommendation {
  chapterId: string;
  chapterTitle: string;
  dominantMistakeCategory: MistakeCategory;
  mistakeCount: number;
  recommendationText: string;
  urgency: 'high' | 'medium';
}

export function generateTestRecommendations(logs: TestLog[]): TestRecommendation[] {
  if (logs.length === 0) return [];

  // Group mistakes by chapter
  const chapterMistakes: Record<
    string,
    { counts: Record<MistakeCategory, number>; total: number }
  > = {};

  logs.forEach((log) => {
    log.chapterIds.forEach((chId) => {
      if (!chapterMistakes[chId]) {
        chapterMistakes[chId] = {
          counts: {
            conceptual: 0,
            calculation: 0,
            silly: 0,
            time_management: 0,
            unattempted: 0,
          },
          total: 0,
        };
      }

      Object.entries(log.mistakes).forEach(([cat, count]) => {
        chapterMistakes[chId].counts[cat as MistakeCategory] += count;
        chapterMistakes[chId].total += count;
      });
    });
  });

  const recommendations: TestRecommendation[] = [];

  for (const [chId, data] of Object.entries(chapterMistakes)) {
    if (data.total === 0) continue;

    // Find dominant mistake
    let dominantCat: MistakeCategory = 'conceptual';
    let maxCount = -1;
    for (const [cat, count] of Object.entries(data.counts)) {
      if (count > maxCount) {
        maxCount = count;
        dominantCat = cat as MistakeCategory;
      }
    }

    const title = getChapterTitle(chId);

    let text = '';
    if (dominantCat === 'conceptual') {
      text = `You made ${maxCount} conceptual mistake${maxCount > 1 ? 's' : ''} in ${title}. Rebuilding the core theory and resolving 5 PYQs is strongly recommended.`;
    } else if (dominantCat === 'calculation') {
      text = `${maxCount} calculation error${maxCount > 1 ? 's' : ''} logged in ${title}. Practice writing intermediate steps with units rather than mental shortcuts.`;
    } else if (dominantCat === 'time_management') {
      text = `Time crunch affected ${title} questions. Do timed 25-minute question sprints to calibrate speed.`;
    } else if (dominantCat === 'unattempted') {
      text = `Questions in ${title} were left unattempted. Start with easy Level-1 NCERT solved examples to overcome hesitation.`;
    } else {
      text = `${maxCount} silly mistake${maxCount > 1 ? 's' : ''} in ${title}. Reread question boundary conditions ($t=0$, STP, units) twice before marking.`;
    }

    recommendations.push({
      chapterId: chId,
      chapterTitle: title,
      dominantMistakeCategory: dominantCat,
      mistakeCount: maxCount,
      recommendationText: text,
      urgency: data.counts.conceptual >= 3 || data.total >= 6 ? 'high' : 'medium',
    });
  }

  return recommendations.sort((a, b) => b.mistakeCount - a.mistakeCount);
}
