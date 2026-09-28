import {
  type EducationalResource,
  type ResourceDiscoveryContext,
} from './types';
import { getChapterSubtopics, ncertSubtopicsData } from '@/lib/ncert-subtopics';
import { getChapterById } from '@/lib/curriculum/registry';
import {
  OFFICIAL_CBSE_SYLLABUS_PORTAL,
  OFFICIAL_NCERT_PORTAL,
} from '@/lib/curriculum/cbse-2027-database';

// Visual badge thumbnails for official academic resources
export const OFFICIAL_THUMBNAILS = {
  ncertPhysics11: 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=600&auto=format&fit=crop&q=80',
  ncertChemistry11: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=600&auto=format&fit=crop&q=80',
  ncertMath11: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&auto=format&fit=crop&q=80',
  ncertBiology11: 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=600&auto=format&fit=crop&q=80',
  cbseOfficial: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600&auto=format&fit=crop&q=80',
  pyqPractice: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&auto=format&fit=crop&q=80',
  revisionNotes: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&auto=format&fit=crop&q=80',
  exemplarProblems: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=600&auto=format&fit=crop&q=80',
};

function getSubjectThumbnail(subjectName: string, kind: 'textbook' | 'notes' | 'pyq' | 'practice' | 'revision'): string {
  const s = subjectName.toLowerCase();
  if (kind === 'pyq') return OFFICIAL_THUMBNAILS.pyqPractice;
  if (kind === 'practice') return OFFICIAL_THUMBNAILS.exemplarProblems;
  if (kind === 'revision') return OFFICIAL_THUMBNAILS.revisionNotes;
  if (s.includes('chem')) return OFFICIAL_THUMBNAILS.ncertChemistry11;
  if (s.includes('math')) return OFFICIAL_THUMBNAILS.ncertMath11;
  if (s.includes('bio')) return OFFICIAL_THUMBNAILS.ncertBiology11;
  return OFFICIAL_THUMBNAILS.ncertPhysics11;
}

/**
 * Returns genuine, verified official NCERT and CBSE educational resources for a given chapter
 */
export function getOfficialChapterResources(context: ResourceDiscoveryContext): EducationalResource[] {
  const chapterId = context.chapterId || '';
  const chapter = getChapterById(chapterId);
  const subtopicData = ncertSubtopicsData[chapterId];
  const subjectName = context.subject || chapter?.subjectName || 'Physics';
  const chapterTitle = context.chapter || chapter?.title || 'Chapter';
  const grade = context.grade || chapter?.class || '11';

  const isLowConfidence = context.confidence === 'low' || context.confidence === 'rusty';
  const isHighConfidence = context.confidence === 'high' || context.confidence === 'solid';
  const availableTime = context.availableTime || 45;

  const resources: EducationalResource[] = [];

  // 1. OFFICIAL NCERT TEXTBOOK CHAPTER
  const ncertUrl = chapter?.officialNcertUrl || `${OFFICIAL_NCERT_PORTAL}`;
  resources.push({
    id: `ncert-textbook-${chapterId || 'gen'}`,
    title: `${chapterTitle} — NCERT Class ${grade} ${subjectName}`,
    resourceType: 'textbook',
    subject: subjectName,
    chapterId,
    chapterTitle,
    provider: 'NCERT Official',
    url: ncertUrl,
    thumbnail: getSubjectThumbnail(subjectName, 'textbook'),
    duration: '35 mins read',
    durationMinutes: 35,
    difficulty: 'beginner',
    language: 'English',
    recommendationReason: isLowConfidence
      ? 'Recommended for your conditions · Foundational concept clarity from primary textbook'
      : 'Official prescribed textbook for CBSE 2026-27 board curriculum',
    relevanceScore: isLowConfidence ? 96 : 82,
    estimatedMinutes: 35,
    actionLabel: 'Read',
    isExternal: true,
    isOfficial: true,
    description: `Official digital textbook chapter from the National Council of Educational Research and Training (NCERT). Direct digital access at ncert.nic.in.`,
  });

  // 2. HIGH-YIELD NCERT STUDY NOTES & FORMULA SHEET
  if (subtopicData && subtopicData.subtopics.length > 0) {
    const keyFormulas = subtopicData.subtopics
      .map((s) => s.keyFormula)
      .filter((f): f is string => Boolean(f));
    const trapNotes = subtopicData.subtopics
      .map((s) => s.trapNote)
      .filter((t): t is string => Boolean(t));
    const coreConcepts = subtopicData.subtopics.flatMap((s) => s.coreConcepts);

    resources.push({
      id: `ncert-notes-${chapterId}`,
      title: `${chapterTitle} — High-Yield NCERT Study Notes & Core Concepts`,
      resourceType: 'notes',
      subject: subjectName,
      chapterId,
      chapterTitle,
      provider: 'BacklogOS Academic Notes',
      url: undefined, // Interactive in-app viewer
      thumbnail: getSubjectThumbnail(subjectName, 'notes'),
      duration: '15 mins read',
      durationMinutes: 15,
      difficulty: 'intermediate',
      language: 'English',
      recommendationReason: availableTime <= 30
        ? `Matches your ${availableTime}m study block · Rapid 15m retention notes`
        : 'Recommended for your conditions · Direct syllabus formulas & common exam traps',
      relevanceScore: availableTime <= 30 ? 94 : 85,
      estimatedMinutes: 15,
      actionLabel: 'Review Notes',
      isExternal: false,
      isOfficial: true,
      description: `${subtopicData.totalSubtopics} NCERT subtopics mapped with core definitions, dimensional checks, and common board exam pitfalls.`,
      interactiveContent: {
        summary: `Comprehensive syllabus breakdown for ${chapterTitle}. Focus on high-yield sections for maximum score retention.`,
        keyFormulas: keyFormulas.length > 0 ? keyFormulas : undefined,
        coreConcepts: coreConcepts.slice(0, 8),
        trapNote: trapNotes.length > 0 ? trapNotes[0] : undefined,
      },
    });
  }

  // 3. NCERT EXEMPLAR PRACTICE QUESTIONS
  resources.push({
    id: `ncert-exemplar-${chapterId || 'gen'}`,
    title: `${chapterTitle} — NCERT Exemplar Problems & Solved Exercises`,
    resourceType: 'practice',
    subject: subjectName,
    chapterId,
    chapterTitle,
    provider: 'NCERT Exemplar Division',
    url: 'https://ncert.nic.in/exemplar-problems.php',
    thumbnail: getSubjectThumbnail(subjectName, 'practice'),
    duration: '40 mins practice',
    durationMinutes: 40,
    difficulty: 'intermediate',
    language: 'English',
    recommendationReason: isHighConfidence
      ? 'Recommended for your conditions · Higher-order thinking skill (HOTS) questions'
      : 'Matches your practice block · Step-by-step NCERT textbook problems',
    relevanceScore: isHighConfidence ? 92 : 80,
    estimatedMinutes: 40,
    actionLabel: 'Practice',
    isExternal: true,
    isOfficial: true,
    description: `Official NCERT Exemplar problems featuring Multiple Choice Questions, short answer numericals, and analytical problems designed for CBSE and competitive exams.`,
  });

  // 4. CBSE PREVIOUS YEAR QUESTIONS (PYQ) & BOARD PAPERS
  resources.push({
    id: `cbse-pyq-${chapterId || 'gen'}`,
    title: `${chapterTitle} — CBSE Board Previous Year Questions & Solutions`,
    resourceType: 'pyq',
    subject: subjectName,
    chapterId,
    chapterTitle,
    provider: 'CBSE Examination Wing',
    url: 'https://cbseacademic.nic.in/sqp_classxii_2024.html',
    thumbnail: getSubjectThumbnail(subjectName, 'pyq'),
    duration: '45 mins review',
    durationMinutes: 45,
    difficulty: 'exam-level',
    language: 'English',
    recommendationReason: isHighConfidence || (context.examDate && context.examDate.length > 0)
      ? 'Recommended for your conditions · High-priority exam pattern & marking scheme PYQs'
      : 'Essential board examination question bank with model solutions',
    relevanceScore: isHighConfidence ? 97 : 88,
    estimatedMinutes: 45,
    actionLabel: 'View PYQs',
    isExternal: true,
    isOfficial: true,
    description: `Real CBSE past year questions covering 1-mark, 2-mark, 3-mark, and 5-mark question patterns with official step-by-step marking rubrics.`,
  });

  // 5. OFFICIAL CBSE 2026-27 CURRICULUM GUIDELINES
  const syllabusUrl = chapter?.officialCbseSyllabusUrl || OFFICIAL_CBSE_SYLLABUS_PORTAL;
  resources.push({
    id: `cbse-curriculum-${chapterId || 'gen'}`,
    title: `CBSE Academic Session 2026-27 — ${subjectName} Curriculum & Blueprint`,
    resourceType: 'official',
    subject: subjectName,
    chapterId,
    chapterTitle,
    provider: 'CBSE Academic Directorate',
    url: syllabusUrl,
    thumbnail: OFFICIAL_THUMBNAILS.cbseOfficial,
    duration: '10 mins check',
    durationMinutes: 10,
    difficulty: 'all-levels',
    language: 'English',
    recommendationReason: 'Official verified syllabus document confirming examinable topics and weightage',
    relevanceScore: 75,
    estimatedMinutes: 10,
    actionLabel: 'Open Resource',
    isExternal: true,
    isOfficial: true,
    description: `Official curriculum notification from the Central Board of Secondary Education confirming non-evaluative vs examinable sections for 2026-27.`,
  });

  return resources;
}
