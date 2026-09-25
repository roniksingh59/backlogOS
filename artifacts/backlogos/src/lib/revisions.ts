import { chapters, type Subject } from './backlog-data';
import { getChapterTitle, getChapterSubject } from './prerequisites-graph';

export interface SpacedRevision {
  id: string;
  chapterId: string;
  chapterTitle: string;
  subject: Subject;
  revisionNumber: number; // 1, 2, 3
  scheduledDate: string; // YYYY-MM-DD
  completedDate?: string;
  status: 'due' | 'completed' | 'upcoming' | 'overdue';
  retentionConfidence?: 'strong' | 'shaky' | 'forgotten';
  notes?: string;
  createdAt: string;
}

export interface RevisionSettings {
  intervalsInDays: [number, number, number]; // e.g. [2, 7, 21]
  autoScheduleOnComplete: boolean;
}

export const DEFAULT_REVISION_SETTINGS: RevisionSettings = {
  intervalsInDays: [2, 7, 21],
  autoScheduleOnComplete: true,
};

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function generateSpacedRevisions(
  chapterId: string,
  completionDate: Date = new Date(),
  settings: RevisionSettings = DEFAULT_REVISION_SETTINGS
): SpacedRevision[] {
  const title = getChapterTitle(chapterId);
  const subject = getChapterSubject(chapterId) as Subject;
  const revisions: SpacedRevision[] = [];

  settings.intervalsInDays.forEach((daysToAdd, index) => {
    const revDate = new Date(completionDate);
    revDate.setDate(revDate.getDate() + daysToAdd);

    revisions.push({
      id: `rev-${chapterId}-${index + 1}-${Date.now()}`,
      chapterId,
      chapterTitle: title,
      subject,
      revisionNumber: index + 1,
      scheduledDate: formatDate(revDate),
      status: 'upcoming',
      createdAt: new Date().toISOString(),
    });
  });

  return revisions;
}

export function evaluateRevisionStatus(
  rev: SpacedRevision,
  todayStr: string = formatDate(new Date())
): 'due' | 'completed' | 'upcoming' | 'overdue' {
  if (rev.completedDate) return 'completed';
  if (rev.scheduledDate === todayStr) return 'due';
  if (rev.scheduledDate < todayStr) return 'overdue';
  return 'upcoming';
}

export function filterDueRevisions(
  revisions: SpacedRevision[]
): SpacedRevision[] {
  const todayStr = formatDate(new Date());
  return revisions.filter((r) => {
    const status = evaluateRevisionStatus(r, todayStr);
    return status === 'due' || status === 'overdue';
  });
}
