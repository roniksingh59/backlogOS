import { type CurriculumChapter } from './types';
import { CLASS_9_CHAPTERS } from './cbse-chapters-class9';
import { CLASS_10_CHAPTERS } from './cbse-chapters-class10';
import { CLASS_11_CHAPTERS } from './cbse-chapters-class11';
import { CLASS_12_CHAPTERS } from './cbse-chapters-class12';

export const ALL_CBSE_CHAPTERS: CurriculumChapter[] = [
  ...CLASS_9_CHAPTERS,
  ...CLASS_10_CHAPTERS,
  ...CLASS_11_CHAPTERS,
  ...CLASS_12_CHAPTERS,
];

export const CHAPTERS_BY_ID = new Map<string, CurriculumChapter>(
  ALL_CBSE_CHAPTERS.map((ch) => [ch.id, ch])
);

export function getCurriculumChapterById(id: string): CurriculumChapter | undefined {
  return CHAPTERS_BY_ID.get(id);
}

export function getCurriculumChaptersBySubjectId(subjectId: string): CurriculumChapter[] {
  return ALL_CBSE_CHAPTERS.filter((ch) => ch.subjectId === subjectId);
}

export function getCurriculumChaptersByGrade(grade: string): CurriculumChapter[] {
  return ALL_CBSE_CHAPTERS.filter((ch) => ch.class === grade);
}
