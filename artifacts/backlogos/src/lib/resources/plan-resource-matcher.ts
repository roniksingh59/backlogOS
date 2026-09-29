import {
  type EducationalResource,
  type AcademicResourceType,
  type ResourceDiscoveryContext,
} from './types';
import { getOfficialChapterResources } from './official-catalog';
import { getCuratedVideosForQuery } from './curated-videos';
import { readEducationProfile } from '@/lib/curriculum/user-profile-storage';
import { type DailyPlanSlot } from '@/lib/smart-planner';
import { readPlan, readBacklogItems } from '@/lib/storage';

/**
 * Deterministically and instantaneously matches the best 3 to 4 diverse resources
 * (including video lecture, textbook, notes, and pyqs) for a daily plan task slot.
 */
export function getAttachedTaskResources(
  slot: {
    chapterId: string;
    chapterTitle: string;
    subject: string;
    kind: 'theory' | 'practice' | 'revision';
    durationMinutes: number;
    topic?: string;
  },
  contextOverride?: Partial<ResourceDiscoveryContext>
): EducationalResource[] {
  const profile = readEducationProfile();
  const plan = readPlan();
  const backlogItems = readBacklogItems();
  const backlogItem = backlogItems.find((b) => b.chapterId === slot.chapterId);

  const grade = contextOverride?.grade || profile.grade || '11';
  const board = contextOverride?.board || profile.curriculum || 'CBSE';
  const confidence =
    contextOverride?.confidence || backlogItem?.confidence || plan?.confidence || 'rusty';
  const examDate = contextOverride?.examDate || plan?.examDate;

  const discoveryContext: ResourceDiscoveryContext = {
    grade,
    board,
    subject: slot.subject,
    chapter: slot.chapterTitle,
    chapterId: slot.chapterId,
    topic: slot.topic,
    difficulty: confidence === 'rusty' || confidence === 'low' ? 'beginner' : 'intermediate',
    confidence,
    availableTime: slot.durationMinutes,
    examDate,
    ...contextOverride,
  };

  // 1. Get official verified NCERT / CBSE catalog resources
  const officialResources = getOfficialChapterResources(discoveryContext);

  const textbookRes = officialResources.find((r) => r.resourceType === 'textbook');
  const solutionsRes = officialResources.find((r) => r.resourceType === 'solution');
  const notesRes = officialResources.find((r) => r.resourceType === 'notes');
  const mindmapRes = officialResources.find((r) => r.resourceType === 'mindmap');
  const exemplarRes = officialResources.find((r) => r.resourceType === 'practice');
  const pyqRes = officialResources.find((r) => r.resourceType === 'pyq');
  const trapsRes = officialResources.find((r) => r.id.startsWith('exam-traps'));

  // 2. Find best matching video lecture for this task
  const curatedVideos = getCuratedVideosForQuery(
    `${slot.chapterTitle} ${slot.subject} ${slot.kind}`,
    3
  );

  let videoRes: EducationalResource | undefined;
  if (curatedVideos.length > 0) {
    const topVid = curatedVideos[0];
    videoRes = {
      id: `vid-${topVid.id}`,
      title: topVid.title,
      resourceType: 'video',
      videoSubtype: topVid.resourceType,
      subject: slot.subject,
      chapterId: slot.chapterId,
      chapterTitle: slot.chapterTitle,
      provider: topVid.channel,
      url: `https://www.youtube.com/watch?v=${topVid.id}`,
      thumbnail: `https://i.ytimg.com/vi/${topVid.id}/hqdefault.jpg`,
      duration: topVid.duration,
      durationMinutes: topVid.durationMinutes,
      difficulty: 'intermediate',
      language: topVid.language,
      recommendationReason: `Top recommended lecture by ${topVid.channel} (${topVid.views})`,
      relevanceScore: 95,
      estimatedMinutes: topVid.durationMinutes || slot.durationMinutes,
      actionLabel: 'Watch',
      isEmbeddable: true,
      isExternal: false,
      publishedTime: topVid.published,
      viewCount: topVid.views,
      description: `Curated high-yield video lecture for ${slot.chapterTitle} by ${topVid.channel}.`,
    };
  }

  const attached: EducationalResource[] = [];

  if (slot.kind === 'practice') {
    // Practice task:
    // 1. NCERT Exemplar & Solved Exercises
    // 2. CBSE Past Year Questions (PYQs)
    // 3. NCERT Step-by-Step Solutions / Formula Sheet
    // 4. Video (Numericals / PYQ marathon)
    if (exemplarRes) attached.push(exemplarRes);
    if (pyqRes) attached.push(pyqRes);
    if (solutionsRes) attached.push(solutionsRes);
    if (videoRes && attached.length < 4) attached.push(videoRes);
    if (mindmapRes && attached.length < 4) attached.push(mindmapRes);
    if (notesRes && attached.length < 4) attached.push(notesRes);
  } else if (slot.kind === 'revision') {
    // Revision task:
    // 1. High-Yield Revision Notes & Formula Sheet
    // 2. Video Rapid Recap / One-Shot
    // 3. Board Exam Traps & Examiner Tips
    // 4. CBSE PYQs
    if (notesRes) attached.push(notesRes);
    if (mindmapRes) attached.push(mindmapRes);
    if (videoRes) attached.push(videoRes);
    if (trapsRes && attached.length < 4) attached.push(trapsRes);
    if (pyqRes && attached.length < 4) attached.push(pyqRes);
  } else {
    // Theory / Learning task:
    // 1. Curated Video Lecture (One-Shot / Concept)
    // 2. Official NCERT Textbook chapter
    // 3. High-Yield Concept Notes & Subtopic Blueprint
    // 4. NCERT Exemplar Problems
    if (videoRes) attached.push(videoRes);
    if (textbookRes) attached.push(textbookRes);
    if (notesRes) attached.push(notesRes);
    if (exemplarRes && attached.length < 4) attached.push(exemplarRes);
    if (pyqRes && attached.length < 4) attached.push(pyqRes);
  }

  // Fallback if empty
  if (attached.length === 0 && officialResources.length > 0) {
    return officialResources.slice(0, 4);
  }

  return attached.slice(0, 4);
}

/**
 * Attaches curated resources to a DailyPlanSlot
 */
export function attachResourcesToSlot(
  slot: DailyPlanSlot,
  contextOverride?: Partial<ResourceDiscoveryContext>
): DailyPlanSlot {
  if (slot.attachedResources && slot.attachedResources.length > 0) {
    return slot;
  }
  const attached = getAttachedTaskResources(slot, contextOverride);
  return {
    ...slot,
    attachedResources: attached,
  };
}
