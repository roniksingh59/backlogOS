import {
  type UserEducationProfile,
  type GradeLevel,
  type StreamId,
  type CurriculumSubject,
  type CustomSubjectInput,
  type CurriculumChapter,
} from './types';
import { CBSE_SUBJECTS_CATALOGUE, CBSE_ACADEMIC_SESSION } from './cbse-2027-database';
import { readPlan } from '../storage';

const EDUCATION_PROFILE_KEY = 'backlogos-education-profile-v1';

export function getDefaultEducationProfile(): UserEducationProfile {
  // Check if existing user already has a Class 11 PCM plan stored
  const existingPlan = readPlan();
  const defaultGrade: GradeLevel = '11';
  const defaultStream: StreamId = 'pcm';

  let enrolledIds = ['cbse-11-physics', 'cbse-11-chemistry', 'cbse-11-mathematics'];

  if (existingPlan && existingPlan.subjects && existingPlan.subjects.length > 0) {
    const mapped = existingPlan.subjects.map((s) => {
      const lower = s.toLowerCase();
      if (lower.includes('physic')) return 'cbse-11-physics';
      if (lower.includes('chem')) return 'cbse-11-chemistry';
      if (lower.includes('math')) return 'cbse-11-mathematics';
      if (lower.includes('bio')) return 'cbse-11-biology';
      return `custom-${s.toLowerCase().replace(/\s+/g, '-')}`;
    });
    if (mapped.length > 0) enrolledIds = mapped;
  }

  return {
    curriculum: 'CBSE',
    academicSession: CBSE_ACADEMIC_SESSION,
    grade: defaultGrade,
    stream: defaultStream,
    enrolledSubjectIds: enrolledIds,
    archivedSubjectIds: [],
    customSubjects: [],
    lastUpdated: new Date().toISOString(),
  };
}

export function readEducationProfile(): UserEducationProfile {
  try {
    const raw = localStorage.getItem(EDUCATION_PROFILE_KEY);
    if (!raw) {
      const def = getDefaultEducationProfile();
      saveEducationProfile(def);
      return def;
    }
    const parsed = JSON.parse(raw) as UserEducationProfile;
    if (!parsed.grade || !parsed.curriculum) {
      const fallback = getDefaultEducationProfile();
      return { ...fallback, ...parsed };
    }
    return parsed;
  } catch {
    return getDefaultEducationProfile();
  }
}

export function saveEducationProfile(profile: UserEducationProfile) {
  try {
    profile.lastUpdated = new Date().toISOString();
    localStorage.setItem(EDUCATION_PROFILE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.error('Failed to save education profile to localStorage:', e);
  }
}

/**
 * Add a new custom subject to the user's profile
 */
export function addCustomSubject(input: CustomSubjectInput): CurriculumSubject {
  const profile = readEducationProfile();
  const slug = input.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const customId = `custom-${profile.grade}-${slug}-${Date.now().toString().slice(-4)}`;

  const createdChapters: CurriculumChapter[] = (input.initialChapters || []).map((ch, idx) => ({
    id: `${customId}-ch-${idx + 1}`,
    subjectId: customId,
    subjectName: input.name,
    subjectCode: input.code || 'CUSTOM',
    class: input.class,
    academicSession: profile.academicSession,
    title: ch.title,
    chapterNumber: idx + 1,
    description: `Custom syllabus unit for ${input.name}`,
    defaultEstimatedHours: ch.estimatedHours || 5,
    examWeightage: 'high',
    difficulty: 'medium',
    prerequisites: [],
    inCbseSyllabus: true,
    topics: [{ id: `${customId}-ch-${idx + 1}-t1`, name: ch.title, inCbseSyllabus: true }],
    officialNcertUrl: 'https://ncert.nic.in/textbook.php',
    officialCbseSyllabusUrl: 'https://cbseacademic.nic.in/curriculum_2027.html',
  }));

  const newSubject: CurriculumSubject = {
    id: customId,
    code: input.code || 'CUSTOM',
    name: input.name,
    class: input.class,
    academicSession: profile.academicSession,
    category: input.category || 'custom',
    streamRelevance: profile.stream ? [profile.stream] : ['none'],
    isCustom: true,
    description: input.description || `Custom student-added subject: ${input.name}`,
    ncertBookTitle: `${input.name} Resource Guide`,
    officialSyllabusUrl: 'https://cbseacademic.nic.in/curriculum_2027.html',
    officialTextbookUrl: 'https://ncert.nic.in/textbook.php',
    units: [
      {
        unitNumber: 1,
        title: `${input.name} Core Units`,
        chapterIds: createdChapters.map((c) => c.id),
      },
    ],
    chapterIds: createdChapters.map((c) => c.id),
  };

  profile.customSubjects = [...(profile.customSubjects || []), newSubject];
  if (!profile.enrolledSubjectIds.includes(customId)) {
    profile.enrolledSubjectIds.push(customId);
  }

  saveEducationProfile(profile);

  // Also dynamically save custom chapters in local storage for lookup
  const customChaptersRaw = localStorage.getItem('backlogos-custom-chapters-v1');
  const customChaptersList: CurriculumChapter[] = customChaptersRaw ? JSON.parse(customChaptersRaw) : [];
  localStorage.setItem(
    'backlogos-custom-chapters-v1',
    JSON.stringify([...customChaptersList, ...createdChapters])
  );

  return newSubject;
}

/**
 * Archive a subject so historical backlog data remains intact without deletion
 */
export function archiveSubject(subjectId: string) {
  const profile = readEducationProfile();
  if (profile.enrolledSubjectIds.includes(subjectId)) {
    profile.enrolledSubjectIds = profile.enrolledSubjectIds.filter((id) => id !== subjectId);
    if (!profile.archivedSubjectIds.includes(subjectId)) {
      profile.archivedSubjectIds.push(subjectId);
    }
    saveEducationProfile(profile);
  }
}

/**
 * Unarchive / re-enroll an archived subject
 */
export function unarchiveSubject(subjectId: string) {
  const profile = readEducationProfile();
  profile.archivedSubjectIds = profile.archivedSubjectIds.filter((id) => id !== subjectId);
  if (!profile.enrolledSubjectIds.includes(subjectId)) {
    profile.enrolledSubjectIds.push(subjectId);
  }
  saveEducationProfile(profile);
}

/**
 * Reorder enrolled subjects
 */
export function reorderEnrolledSubjects(newOrderedIds: string[]) {
  const profile = readEducationProfile();
  profile.enrolledSubjectIds = newOrderedIds;
  saveEducationProfile(profile);
}

/**
 * Edit an existing custom subject
 */
export function updateCustomSubject(
  subjectId: string,
  updatedData: { name: string; code?: string; description?: string }
) {
  const profile = readEducationProfile();
  profile.customSubjects = (profile.customSubjects || []).map((sub) => {
    if (sub.id === subjectId) {
      return {
        ...sub,
        name: updatedData.name,
        code: updatedData.code || sub.code,
        description: updatedData.description || sub.description,
      };
    }
    return sub;
  });
  saveEducationProfile(profile);
}
