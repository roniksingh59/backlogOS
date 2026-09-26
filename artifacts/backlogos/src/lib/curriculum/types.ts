export type AcademicSession = '2026-27' | '2027-28';
export type GradeLevel = '9' | '10' | '11' | '12';

export type StreamId =
  | 'none' // For Class 9-10
  // Science Streams (Class 11-12)
  | 'pcm'
  | 'pcb'
  | 'pcmb'
  | 'science_cs'
  // Commerce Streams (Class 11-12)
  | 'commerce_math'
  | 'commerce_no_math'
  // Humanities Streams (Class 11-12)
  | 'humanities'
  | 'humanities_math';

export type SubjectCategory =
  | 'compulsory'
  | 'elective'
  | 'skill'
  | 'language'
  | 'custom';

export type ResourceType =
  | 'ncert_textbook'
  | 'cbse_syllabus'
  | 'support_material'
  | 'sample_paper'
  | 'practice_material';

export interface CurriculumResource {
  id: string;
  title: string;
  type: ResourceType;
  url: string;
  sourceOrg: 'NCERT' | 'CBSE' | 'Custom';
  description?: string;
  class: GradeLevel;
  subjectCode?: string;
}

export interface ChapterTopic {
  id: string;
  name: string;
  inCbseSyllabus: boolean;
  notes?: string;
}

export interface CurriculumChapter {
  id: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  class: GradeLevel;
  academicSession: AcademicSession;
  title: string;
  chapterNumber: number;
  unitNumber?: number;
  unitName?: string;
  description: string;
  defaultEstimatedHours: number;
  examWeightage: 'critical' | 'high' | 'medium' | 'low';
  difficulty: 'easy' | 'medium' | 'hard';
  prerequisites: string[]; // chapter IDs
  inCbseSyllabus: boolean; // false if in NCERT textbook but dropped/rationalized in current CBSE 2026-27
  syllabusRelevanceNote?: string;
  topics: ChapterTopic[];
  officialNcertUrl: string;
  officialCbseSyllabusUrl: string;
  additionalResources?: CurriculumResource[];
}

export interface SyllabusUnit {
  unitNumber: number;
  title: string;
  marksWeightage?: number;
  chapterIds: string[];
}

export interface CurriculumSubject {
  id: string; // e.g. 'cbse-11-physics'
  code: string; // e.g. '042'
  name: string; // e.g. 'Physics'
  class: GradeLevel;
  academicSession: AcademicSession;
  category: SubjectCategory;
  streamRelevance: StreamId[]; // Streams for which this subject is standard
  isCustom?: boolean;
  description: string;
  ncertBookTitle: string;
  officialSyllabusUrl: string;
  officialTextbookUrl: string;
  units: SyllabusUnit[];
  chapterIds: string[];
}

export interface CustomSubjectInput {
  name: string;
  code?: string;
  class: GradeLevel;
  category?: SubjectCategory;
  description?: string;
  initialChapters?: {
    title: string;
    estimatedHours: number;
  }[];
}

export interface UserEducationProfile {
  curriculum: 'CBSE';
  academicSession: AcademicSession;
  grade: GradeLevel;
  stream: StreamId;
  enrolledSubjectIds: string[]; // List of subject IDs (built-in or custom)
  archivedSubjectIds: string[]; // Inactive without losing historical backlog
  customSubjects: CurriculumSubject[];
  lastUpdated: string;
}
