import {
  type YouTubeResource,
  type EducationalResource,
  type ResourceDiscoveryContext,
  type SavedResource,
  type AcademicResourceType,
} from './types';
import { saveStudySession } from '@/lib/storage';
import { recordAcademicAction } from '@/lib/progression/progression-service';
import { getCurrentSessionToken } from '@/lib/supabase';
import { getOfficialChapterResources } from './official-catalog';
import { getCuratedVideosForQuery } from './curated-videos-data';

const SAVED_RESOURCES_KEY = 'backlogos_saved_resources_v2';
const LEGACY_SAVED_RESOURCES_KEY = 'backlogos_saved_resources_v1';
const CLIENT_CACHE_KEY_PREFIX = 'backlogos_res_cache_';
const clientMemoryCache = new Map<string, { timestamp: number; data: EducationalResource[] }>();
const CLIENT_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes in browser

export function buildContextSearchQuery(context: ResourceDiscoveryContext): string {
  const parts: string[] = [];

  const grade = context.grade || '11';
  parts.push(`Class ${grade}`);

  const board = context.board || 'CBSE';
  parts.push(board);

  if (context.subject) {
    parts.push(context.subject);
  }

  if (context.chapter) {
    parts.push(context.chapter);
  }

  if (context.topic) {
    parts.push(context.topic);
  }

  const isLowConfidence =
    context.confidence === 'low' || context.confidence === 'rusty';
  const isHighConfidence =
    context.confidence === 'high' || context.confidence === 'solid';

  if (context.resourceType === 'oneshot') {
    parts.push('one shot full chapter');
  } else if (context.resourceType === 'pyq') {
    parts.push('PYQ solved questions');
  } else if (context.resourceType === 'revision') {
    parts.push('quick revision');
  } else if (context.resourceType === 'concept') {
    parts.push('concept explanation NCERT');
  } else if (isLowConfidence) {
    parts.push('concept beginner');
  } else if (isHighConfidence) {
    parts.push('important questions PYQ');
  }

  if (context.preferredLanguage === 'Hindi' || context.preferredLanguage === 'Hinglish') {
    parts.push('Hindi');
  } else if (context.preferredLanguage === 'English') {
    parts.push('English');
  }

  return parts.join(' ');
}

/**
 * Server sync helper for authenticated accounts
 */
async function syncResourceWithServer(url: string, method: 'POST' | 'DELETE', body?: any) {
  try {
    const token = await getCurrentSessionToken();
    if (!token) return;
    await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    // Offline or network error - local storage is authoritative
  }
}

/**
 * Core smart context recommendation scorer
 */
function scoreEducationalResource(
  res: EducationalResource,
  context: ResourceDiscoveryContext
): { score: number; reason: string } {
  let score = 50;
  let reason = res.recommendationReason;

  const isLowConfidence = context.confidence === 'low' || context.confidence === 'rusty';
  const isHighConfidence = context.confidence === 'high' || context.confidence === 'solid';
  const availTime = context.availableTime || 45;

  // 1. Confidence Level Matching
  if (isLowConfidence) {
    if (res.resourceType === 'textbook') {
      score += 35;
      reason = 'Recommended for your current conditions · Foundational concept clarity';
    } else if (res.videoSubtype === 'concept' || res.difficulty === 'beginner') {
      score += 32;
      reason = 'Recommended for your current conditions · Beginner-friendly concept';
    }
  } else if (isHighConfidence) {
    if (res.resourceType === 'pyq' || res.videoSubtype === 'pyq') {
      score += 38;
      reason = 'Recommended for your current conditions · Board exam & PYQ mastery';
    } else if (res.resourceType === 'revision' || res.videoSubtype === 'revision') {
      score += 30;
      reason = 'Recommended for your current conditions · High-speed retention review';
    }
  }

  // 2. Available Study Time Matching
  const dur = res.durationMinutes;
  if (dur > 0) {
    if (dur <= availTime && dur >= Math.max(10, availTime * 0.45)) {
      score += 28;
      reason = `Matches your available study time (${dur}m of ${availTime}m available)`;
    } else if (dur <= availTime) {
      score += 18;
      reason = `Fits inside your available study time (${dur}m)`;
    } else if (dur > availTime && dur <= availTime * 1.3) {
      score += 5;
    } else {
      score -= 15;
    }
  }

  // 3. Exam Proximity Matching
  if (context.examDate) {
    const daysUntilExam = Math.ceil(
      (new Date(context.examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntilExam > 0 && daysUntilExam <= 30) {
      if (res.resourceType === 'pyq' || res.resourceType === 'revision' || res.videoSubtype === 'oneshot') {
        score += 30;
        reason = `Recommended for your exam schedule (${daysUntilExam} days away) · High yield`;
      }
    }
  }

  // 4. Backlog Size Matching
  if (context.backlogCount && context.backlogCount >= 5) {
    if (res.videoSubtype === 'oneshot' || res.resourceType === 'notes') {
      score += 22;
      reason = 'Recommended for your current conditions · Efficient backlog reduction';
    }
  }

  // 5. Official Resources Baseline Quality
  if (res.isOfficial) {
    score += 15;
  }

  return { score, reason };
}

/**
 * Maps a YouTube video into a full BacklogOS EducationalResource
 */
export function mapYouTubeToEducationalResource(
  video: YouTubeResource,
  context: ResourceDiscoveryContext
): EducationalResource {
  let difficulty: 'beginner' | 'intermediate' | 'exam-level' | 'all-levels' = 'intermediate';
  if (video.resourceType === 'concept') difficulty = 'beginner';
  if (video.resourceType === 'pyq') difficulty = 'exam-level';

  let actionLabel: 'Watch' = 'Watch';
  let primaryType: AcademicResourceType = 'video';
  if (video.resourceType === 'pyq') primaryType = 'pyq';
  if (video.resourceType === 'revision') primaryType = 'revision';

  const baseResource: EducationalResource = {
    id: video.id,
    title: video.title,
    resourceType: primaryType,
    videoSubtype: video.resourceType,
    subject: context.subject || 'Physics',
    chapterId: context.chapterId,
    chapterTitle: context.chapter,
    topic: context.topic,
    provider: video.channel,
    url: `https://www.youtube.com/watch?v=${video.id}`,
    thumbnail: video.thumbnail,
    duration: video.duration,
    durationMinutes: video.durationMinutes,
    difficulty,
    language: video.language,
    recommendationReason: video.relevanceLabel || 'Recommended video lecture',
    relevanceScore: video.relevanceScore || 60,
    estimatedMinutes: video.durationMinutes || 25,
    actionLabel,
    isEmbeddable: video.isEmbeddable,
    isExternal: !video.isEmbeddable,
    publishedTime: video.publishedTime,
    viewCount: video.viewCount,
    description: `Contextual video lecture on ${context.chapter || 'this topic'} by ${video.channel}.`,
  };

  const scored = scoreEducationalResource(baseResource, context);
  baseResource.relevanceScore = scored.score;
  baseResource.recommendationReason = scored.reason;

  return baseResource;
}

/**
 * Unified Resource Discovery: combines real official NCERT/CBSE resources and live YouTube results
 */
export async function fetchUnifiedResources(
  context: ResourceDiscoveryContext,
  customQuery?: string,
  signal?: AbortSignal
): Promise<{ query: string; results: EducationalResource[]; cached: boolean }> {
  const finalQuery = customQuery && customQuery.trim()
    ? customQuery.trim()
    : buildContextSearchQuery(context);

  const cacheKey = `${finalQuery.toLowerCase()}_${context.resourceType || 'all'}_${context.preferredLanguage || 'all'}_${context.availableTime || 60}_${context.chapterId || ''}`;

  // 1. Check in-memory client cache
  const memCached = clientMemoryCache.get(cacheKey);
  if (memCached && Date.now() - memCached.timestamp < CLIENT_CACHE_TTL_MS) {
    return { query: finalQuery, results: memCached.data, cached: true };
  }

  // 2. Check sessionStorage
  try {
    const sessionRaw = sessionStorage.getItem(`${CLIENT_CACHE_KEY_PREFIX}${cacheKey}`);
    if (sessionRaw) {
      const parsed = JSON.parse(sessionRaw);
      if (Date.now() - parsed.timestamp < CLIENT_CACHE_TTL_MS && Array.isArray(parsed.data)) {
        clientMemoryCache.set(cacheKey, { timestamp: parsed.timestamp, data: parsed.data });
        return { query: finalQuery, results: parsed.data, cached: true };
      }
    }
  } catch {
    // Ignore session storage errors
  }

  // 3. Generate Official NCERT / CBSE resources
  const officialResources = getOfficialChapterResources(context).map((r) => {
    const scored = scoreEducationalResource(r, context);
    return {
      ...r,
      relevanceScore: scored.score,
      recommendationReason: scored.reason,
    };
  });

  // 4. Fetch live context-aware YouTube videos from /api/resources/youtube
  let videoResources: EducationalResource[] = [];
  try {
    const ytRes = await fetchYouTubeResources(context, customQuery, signal);
    videoResources = ytRes.results.map((v) => mapYouTubeToEducationalResource(v, context));
  } catch (err) {
    console.warn('[Resource Service] YouTube live discovery failed or offline; using official resources:', err);
  }

  // 5. Merge and sort by contextual relevance score
  const allResources = [...officialResources, ...videoResources];

  // Filter by requested category if not 'all'
  let filtered = allResources;
  const filterType = context.resourceType;
  if (filterType && filterType !== 'all') {
    if (filterType === 'video') {
      filtered = allResources.filter((r) => r.resourceType === 'video' || r.videoSubtype !== undefined);
    } else {
      filtered = allResources.filter(
        (r) => r.resourceType === filterType || r.videoSubtype === filterType
      );
    }
  }

  // Sort: highest contextual relevance first
  filtered.sort((a, b) => (b.relevanceScore || 50) - (a.relevanceScore || 50));

  // Cache results
  clientMemoryCache.set(cacheKey, { timestamp: Date.now(), data: filtered });
  try {
    sessionStorage.setItem(
      `${CLIENT_CACHE_KEY_PREFIX}${cacheKey}`,
      JSON.stringify({ timestamp: Date.now(), data: filtered })
    );
  } catch {
    // Ignore storage quota
  }

  return {
    query: finalQuery,
    results: filtered,
    cached: false,
  };
}

/**
 * Backward compatible fetch for YouTube resources
 */
export async function fetchYouTubeResources(
  context: ResourceDiscoveryContext,
  customQuery?: string,
  signal?: AbortSignal
): Promise<{ query: string; results: YouTubeResource[]; cached: boolean }> {
  const finalQuery = customQuery && customQuery.trim()
    ? customQuery.trim()
    : buildContextSearchQuery(context);

  try {
    const params = new URLSearchParams();
    params.set('q', finalQuery);
    if (context.grade) params.set('grade', context.grade);
    if (context.board) params.set('board', context.board);
    if (context.subject) params.set('subject', context.subject);
    if (context.chapter) params.set('chapter', context.chapter);
    if (context.topic) params.set('topic', context.topic);
    if (context.difficulty) params.set('difficulty', context.difficulty);
    if (context.confidence) params.set('confidence', context.confidence);
    if (context.preferredLanguage) params.set('language', context.preferredLanguage);
    if (context.resourceType && context.resourceType !== 'all') params.set('resourceType', context.resourceType);
    if (context.availableTime) params.set('availableTime', String(context.availableTime));
    if (context.examDate) params.set('examDate', context.examDate);
    if (context.backlogCount !== undefined) params.set('backlogCount', String(context.backlogCount));

    const res = await fetch(`/api/resources/youtube?${params.toString()}`, {
      signal,
      headers: { Accept: 'application/json' },
    });

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const json = await res.json();
      const results: YouTubeResource[] = Array.isArray(json.results) ? json.results : [];
      if (results.length > 0) {
        return {
          query: json.query || finalQuery,
          results,
          cached: Boolean(json.cached),
        };
      }
    }
  } catch (err) {
    // Expected on static hosting platforms like Netlify where /api backend proxy is unavailable
    console.warn('[ResourceService] Remote /api/resources/youtube unavailable on static host; using curated CBSE catalog:', err);
  }

  // NETLIFY / OFFLINE / STATIC HOSTING ZERO-FAILURE FALLBACK:
  // Instantly serves curated high-yield CBSE videos locally on the client!
  const curated = getCuratedVideosForQuery(finalQuery, 12);
  const localResults: YouTubeResource[] = curated.map((v) => ({
    id: v.id,
    title: v.title,
    channel: v.channel,
    duration: v.duration,
    durationMinutes: v.durationMinutes,
    views: v.views,
    published: v.published,
    thumbnail: `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
    description: `Official NCERT curriculum lecture by ${v.channel}. Covers board derivations and numerical problem solving.`,
    resourceType: v.resourceType,
    language: v.language,
    relevanceLabel:
      v.resourceType === 'oneshot'
        ? 'High-Yield One-Shot'
        : v.resourceType === 'revision'
        ? 'Rapid Revision'
        : v.resourceType === 'pyq'
        ? 'Board PYQ Solving'
        : 'Concept Foundation',
    matchReason: `Curated for CBSE ${context.subject || 'Class 11/12'} syllabus recovery`,
  }));

  return {
    query: finalQuery,
    results: localResults,
    cached: true,
  };
}

// ============================================================================
// SAVED & COMPLETED RESOURCES STORE (Offline-first with Supabase / DB sync)
// ============================================================================

export function getSavedResources(): SavedResource[] {
  try {
    // Check v2 first
    const rawV2 = localStorage.getItem(SAVED_RESOURCES_KEY);
    if (rawV2) return JSON.parse(rawV2);

    // Migration from v1
    const rawV1 = localStorage.getItem(LEGACY_SAVED_RESOURCES_KEY);
    if (rawV1) {
      const v1Data = JSON.parse(rawV1);
      if (Array.isArray(v1Data)) {
        const migrated: SavedResource[] = v1Data.map((item) => ({
          ...item,
          provider: item.channel || 'Video Resource',
          actionLabel: 'Watch',
          isEmbeddable: true,
        }));
        localStorage.setItem(SAVED_RESOURCES_KEY, JSON.stringify(migrated));
        return migrated;
      }
    }
    return [];
  } catch {
    return [];
  }
}

export function isResourceSaved(id: string): boolean {
  const saved = getSavedResources();
  return saved.some((r) => r.id === id);
}

export function isResourceCompleted(id: string): boolean {
  const saved = getSavedResources();
  const match = saved.find((r) => r.id === id);
  return Boolean(match?.completed);
}

export function saveResource(
  resource: EducationalResource | YouTubeResource,
  context?: { chapterId?: string; chapterTitle?: string; subject?: string }
): SavedResource[] {
  const existing = getSavedResources();
  const index = existing.findIndex((r) => r.id === resource.id);

  let next: SavedResource[];
  if (index >= 0) {
    next = existing;
  } else {
    const isEdu = 'provider' in resource;
    const newItem: SavedResource = {
      id: resource.id,
      title: resource.title,
      channel: isEdu ? (resource as EducationalResource).provider : (resource as YouTubeResource).channel,
      provider: isEdu ? (resource as EducationalResource).provider : (resource as YouTubeResource).channel,
      duration: resource.duration || '',
      durationMinutes: resource.durationMinutes || 0,
      thumbnail: resource.thumbnail,
      resourceType: resource.resourceType,
      chapterId: context?.chapterId || (isEdu ? (resource as EducationalResource).chapterId : undefined),
      chapterTitle: context?.chapterTitle || (isEdu ? (resource as EducationalResource).chapterTitle : undefined),
      subject: context?.subject || (isEdu ? (resource as EducationalResource).subject : undefined),
      topic: isEdu ? (resource as EducationalResource).topic : undefined,
      url: isEdu ? (resource as EducationalResource).url : `https://www.youtube.com/watch?v=${resource.id}`,
      difficulty: isEdu ? (resource as EducationalResource).difficulty : undefined,
      language: resource.language,
      recommendationReason: isEdu ? (resource as EducationalResource).recommendationReason : (resource as YouTubeResource).relevanceLabel,
      actionLabel: isEdu ? (resource as EducationalResource).actionLabel : 'Watch',
      isEmbeddable: resource.isEmbeddable,
      isExternal: isEdu ? (resource as EducationalResource).isExternal : !resource.isEmbeddable,
      isOfficial: isEdu ? (resource as EducationalResource).isOfficial : false,
      savedAt: new Date().toISOString(),
      completed: false,
    };
    next = [newItem, ...existing];
    // Sync to backend if authenticated
    syncResourceWithServer('/api/resources/saved', 'POST', newItem);
  }

  localStorage.setItem(SAVED_RESOURCES_KEY, JSON.stringify(next));
  window.dispatchEvent(
    new CustomEvent('backlogos-resources-updated', { detail: { action: 'saved', resourceId: resource.id } })
  );
  return next;
}

export function removeSavedResource(id: string): SavedResource[] {
  const existing = getSavedResources();
  const next = existing.filter((r) => r.id !== id);
  localStorage.setItem(SAVED_RESOURCES_KEY, JSON.stringify(next));
  syncResourceWithServer(`/api/resources/saved/${id}`, 'DELETE');
  window.dispatchEvent(
    new CustomEvent('backlogos-resources-updated', { detail: { action: 'removed', resourceId: id } })
  );
  return next;
}

export function toggleSaveResource(
  resource: EducationalResource | YouTubeResource,
  context?: { chapterId?: string; chapterTitle?: string; subject?: string }
): boolean {
  if (isResourceSaved(resource.id)) {
    removeSavedResource(resource.id);
    return false;
  } else {
    saveResource(resource, context);
    return true;
  }
}

export function markResourceCompleted(
  id: string,
  completed: boolean,
  options?: {
    chapterId?: string;
    chapterTitle?: string;
    durationMinutes?: number;
    resourceType?: string;
    logStudySessionToBacklog?: boolean;
  }
): void {
  const existing = getSavedResources();
  const index = existing.findIndex((r) => r.id === id);

  if (index >= 0) {
    existing[index].completed = completed;
    existing[index].completedAt = completed ? new Date().toISOString() : undefined;
    localStorage.setItem(SAVED_RESOURCES_KEY, JSON.stringify(existing));
  }

  // 1. Meaningful Gamification XP Award (Anti-gaming deduplicated)
  if (completed) {
    const result = recordAcademicAction({
      type: 'complete_resource',
      resourceId: id,
      durationMinutes: options?.durationMinutes || 25,
      chapterId: options?.chapterId,
      resourceType: options?.resourceType,
    });
    if (result && typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('backlogos-academic-achievement', { detail: result })
      );
    }
  }

  // 2. Register Study Session in BacklogOS engine if requested
  if (completed && options?.logStudySessionToBacklog && options?.chapterId) {
    const minutes = Math.max(15, options.durationMinutes || 25);
    saveStudySession({
      chapterId: options.chapterId,
      minutes,
      mode: 'learning',
    });
  }

  // 3. Sync to backend
  syncResourceWithServer('/api/resources/complete', 'POST', {
    resourceId: id,
    completed,
  });

  window.dispatchEvent(
    new CustomEvent('backlogos-resources-updated', {
      detail: { action: 'completed', resourceId: id, completed },
    })
  );
}
