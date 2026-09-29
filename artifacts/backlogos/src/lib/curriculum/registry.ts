import {
  type CurriculumSubject,
  type CurriculumChapter,
  type GradeLevel,
  type StreamId,
} from './types';
import { CBSE_SUBJECTS_CATALOGUE } from './cbse-2027-database';
import { ALL_CBSE_CHAPTERS, CHAPTERS_BY_ID } from './chapters-index';
import { readEducationProfile } from './user-profile-storage';
import { type Chapter } from '../backlog-data';
import { type BacklogItem } from '../backlog-items';

export interface SubjectRecommendation {
  subject: CurriculumSubject;
  isRecommended: boolean;
  tag: string;
}

/**
 * Get all available subjects for a given grade level, including official CBSE and any custom added ones
 */
export function getAvailableSubjectsForGrade(grade: GradeLevel): CurriculumSubject[] {
  const profile = readEducationProfile();
  const official = CBSE_SUBJECTS_CATALOGUE.filter((s) => s.class === grade);
  const custom = (profile.customSubjects || []).filter((s) => s.class === grade);
  return [...official, ...custom];
}

/**
 * Get recommended and optional subjects based on Class and Stream
 */
export function getSubjectRecommendations(
  grade: GradeLevel,
  stream: StreamId
): { recommended: CurriculumSubject[]; optional: CurriculumSubject[] } {
  const allForGrade = getAvailableSubjectsForGrade(grade);

  if (grade === '9' || grade === '10') {
    // Class 9 & 10: Standard core subjects, regional language, and vocational education
    const recommended = allForGrade.filter((s) =>
      [
        'Mathematics',
        'Science',
        'Social Science',
        'English Language & Literature',
        'Hindi Course A',
        'Bengali (বাংলা)',
        'Vocational Education (Kaushal Vikas)',
      ].includes(s.name)
    );
    const optional = allForGrade.filter(
      (s) => !recommended.some((r) => r.id === s.id)
    );
    return { recommended, optional };
  }

  // Class 11 & 12 by Stream
  let recommendedNames: string[] = ['English Core'];

  switch (stream) {
    case 'pcm':
      recommendedNames = ['Physics', 'Chemistry', 'Mathematics', 'English Core'];
      break;
    case 'pcb':
      recommendedNames = ['Physics', 'Chemistry', 'Biology', 'English Core'];
      break;
    case 'pcmb':
      recommendedNames = ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'English Core'];
      break;
    case 'science_cs':
      recommendedNames = ['Physics', 'Chemistry', 'Mathematics', 'Computer Science', 'English Core'];
      break;
    case 'commerce_math':
      recommendedNames = ['Accountancy', 'Business Studies', 'Economics', 'Mathematics', 'English Core'];
      break;
    case 'commerce_no_math':
      recommendedNames = ['Accountancy', 'Business Studies', 'Economics', 'English Core'];
      break;
    case 'humanities':
      recommendedNames = ['History', 'Political Science', 'Economics', 'English Core'];
      break;
    case 'humanities_math':
      recommendedNames = ['History', 'Political Science', 'Economics', 'Mathematics', 'English Core'];
      break;
    default:
      recommendedNames = ['Physics', 'Chemistry', 'Mathematics', 'English Core'];
      break;
  }

  const recommended = allForGrade.filter((s) => recommendedNames.includes(s.name));
  const optional = allForGrade.filter(
    (s) => !recommended.some((r) => r.id === s.id)
  );

  return { recommended, optional };
}

/**
 * Get all chapters for a given subject (official + custom)
 */
export function getChaptersForSubject(subjectId: string): CurriculumChapter[] {
  const official = ALL_CBSE_CHAPTERS.filter((c) => c.subjectId === subjectId);
  if (official.length > 0) return official;

  // Check custom chapters
  try {
    const raw = localStorage.getItem('backlogos-custom-chapters-v1');
    if (raw) {
      const customChapters: CurriculumChapter[] = JSON.parse(raw);
      return customChapters.filter((c) => c.subjectId === subjectId);
    }
  } catch {
    // fallback
  }

  return [];
}

/**
 * Get a specific chapter by ID
 */
export function findChapterById(chapterId: string): CurriculumChapter | undefined {
  const official = CHAPTERS_BY_ID.get(chapterId);
  if (official) return official;

  try {
    const raw = localStorage.getItem('backlogos-custom-chapters-v1');
    if (raw) {
      const customChapters: CurriculumChapter[] = JSON.parse(raw);
      return customChapters.find((c) => c.id === chapterId);
    }
  } catch {
    // fallback
  }

  return undefined;
}

export const getChapterById = findChapterById;

/**
 * Bridge Function: Convert CurriculumChapter to BacklogOS legacy Chapter
 * This guarantees 100% compatibility with existing study timers, flashcards, notes, and planners.
 */
export function toBacklogOSChapter(c: CurriculumChapter): Chapter {
  return {
    id: c.id,
    subject: c.subjectName,
    title: c.title,
    note: c.description || `${c.subjectName} Chapter ${c.chapterNumber}`,
    order: c.chapterNumber,
    tag: c.examWeightage === 'critical' ? 'High Yield' : c.examWeightage === 'high' ? 'Core' : 'Foundation',
  };
}

/**
 * Bridge Function: Convert CurriculumChapter to BacklogItem
 */
export function toBacklogItem(c: CurriculumChapter): BacklogItem {
  return {
    id: `item-${c.id}`,
    chapterId: c.id,
    subject: c.subjectName,
    topic: c.title,
    estimatedHours: c.defaultEstimatedHours || 5,
    hoursSpent: 0,
    difficulty: c.difficulty,
    status: 'not_started',
    confidence: 'medium',
    examRelevance: c.examWeightage,
    prerequisites: c.prerequisites || [],
    createdAt: new Date().toISOString(),
  };
}

/**
 * Search across subjects, chapters, and resources
 */
export function searchCurriculum(query: string, grade?: GradeLevel) {
  const q = query.trim().toLowerCase();
  if (!q) return { subjects: [], chapters: [] };

  const allSubjects = grade ? getAvailableSubjectsForGrade(grade) : CBSE_SUBJECTS_CATALOGUE;
  const matchedSubjects = allSubjects.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.code.includes(q) ||
      s.description.toLowerCase().includes(q)
  );

  const allChapters = grade
    ? ALL_CBSE_CHAPTERS.filter((c) => c.class === grade)
    : ALL_CBSE_CHAPTERS;

  const matchedChapters = allChapters.filter(
    (c) =>
      c.title.toLowerCase().includes(q) ||
      c.subjectName.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.topics.some((t) => t.name.toLowerCase().includes(q))
  );

  return {
    subjects: matchedSubjects,
    chapters: matchedChapters,
  };
}
