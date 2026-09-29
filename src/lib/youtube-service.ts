import { getCuratedVideosForQuery } from './curated-videos.ts';

interface YouTubeVideoItem {
  id: string;
  title: string;
  channel: string;
  duration: string;
  durationMinutes: number;
  publishedTime?: string;
  viewCount?: string;
  thumbnail: string;
  resourceType: 'concept' | 'oneshot' | 'pyq' | 'revision' | 'general';
  language: 'English' | 'Hinglish' | 'Hindi';
  relevanceLabel: string;
  relevanceScore: number;
  isEmbeddable: boolean;
}

interface SearchParams {
  q?: string;
  grade?: string;
  board?: string;
  subject?: string;
  chapter?: string;
  topic?: string;
  difficulty?: string;
  confidence?: string;
  language?: string;
  resourceType?: string;
  availableTime?: number;
  examDate?: string;
  backlogCount?: number;
}

// In-memory LRU / TTL Cache (6 hours TTL)
interface CacheEntry {
  timestamp: number;
  data: YouTubeVideoItem[];
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const searchCache = new Map<string, CacheEntry>();
const MAX_CACHE_ENTRIES = 500;

function parseDurationToMinutes(durationStr: string): number {
  if (!durationStr) return 0;
  const parts = durationStr.split(':').map((p) => parseInt(p, 10));
  if (parts.length === 3) {
    return parts[0] * 60 + parts[1] + Math.round(parts[2] / 60);
  }
  if (parts.length === 2) {
    return parts[0] + Math.round(parts[1] / 60);
  }
  return 0;
}

function detectResourceType(title: string): 'concept' | 'oneshot' | 'pyq' | 'revision' | 'general' {
  const t = title.toLowerCase();
  if (
    t.includes('one shot') ||
    t.includes('oneshot') ||
    t.includes('complete chapter') ||
    t.includes('full chapter') ||
    t.includes('marathon')
  ) {
    return 'oneshot';
  }
  if (
    t.includes('pyq') ||
    t.includes('previous year') ||
    t.includes('solved') ||
    t.includes('questions') ||
    t.includes('practice') ||
    t.includes('numerical') ||
    t.includes('numericals') ||
    t.includes('problem')
  ) {
    return 'pyq';
  }
  if (
    t.includes('revision') ||
    t.includes('formula') ||
    t.includes('summary') ||
    t.includes('quick recap') ||
    t.includes('mind map') ||
    t.includes('cheat sheet')
  ) {
    return 'revision';
  }
  if (
    t.includes('concept') ||
    t.includes('introduction') ||
    t.includes('intro') ||
    t.includes('basics') ||
    t.includes('ncert') ||
    t.includes('explained') ||
    t.includes('derivation')
  ) {
    return 'concept';
  }
  return 'general';
}

function detectLanguage(title: string, channel: string): 'English' | 'Hinglish' | 'Hindi' {
  if (/[\u0900-\u097F]/.test(title)) {
    return 'Hindi';
  }
  const t = (title + ' ' + channel).toLowerCase();
  if (
    t.includes('in hindi') ||
    t.includes('hindi') ||
    t.includes('hinglish') ||
    t.includes('apni kaksha') ||
    t.includes('pw') ||
    t.includes('physics wallah') ||
    t.includes('prashant kirad') ||
    t.includes('vedantu') ||
    t.includes('unacademy') ||
    t.includes('arvind') ||
    t.includes('learnohub') ||
    t.includes('magnet brains')
  ) {
    return 'Hinglish';
  }
  return 'English';
}

function calculateRelevance(
  video: { title: string; durationMinutes: number; resourceType: string; language: string },
  context: {
    confidence?: string;
    availableTime?: number;
    examNear?: boolean;
    largeBacklog?: boolean;
    preferredLanguage?: string;
  }
): { score: number; label: string } {
  let score = 50;
  let label = 'Curated CBSE Resource';

  const isLowConfidence =
    context.confidence === 'low' || context.confidence === 'rusty';
  const isHighConfidence =
    context.confidence === 'high' || context.confidence === 'solid';
  const availTime = context.availableTime || 60;

  // 1. Available study time matching
  const dur = video.durationMinutes;
  if (dur > 0) {
    if (dur <= availTime && dur >= availTime * 0.5) {
      score += 35;
      label = `Matches your ${availTime}m study block`;
    } else if (dur <= availTime) {
      score += 25;
      label = `Fits your available time (${dur}m)`;
    } else if (dur > availTime && dur <= availTime * 1.35) {
      score += 10;
    } else {
      score -= 15;
    }
  }

  // 2. User confidence matching
  if (isLowConfidence) {
    if (video.resourceType === 'concept') {
      score += 40;
      label = 'Recommended for your conditions · Concept foundation';
    } else if (video.title.toLowerCase().includes('basic') || video.title.toLowerCase().includes('intro')) {
      score += 30;
      label = 'Recommended for your conditions · Beginner-friendly';
    }
  } else if (isHighConfidence) {
    if (video.resourceType === 'pyq') {
      score += 40;
      label = 'Recommended for your conditions · PYQ & practice mastery';
    } else if (video.resourceType === 'revision') {
      score += 30;
      label = 'Recommended for your conditions · High-speed revision';
    }
  }

  // 3. Exam near
  if (context.examNear) {
    if (video.resourceType === 'revision' || video.resourceType === 'oneshot' || video.resourceType === 'pyq') {
      score += 30;
      label = 'Recommended for your conditions · Exam revision';
    }
  }

  // 4. Large backlog
  if (context.largeBacklog) {
    if (video.resourceType === 'oneshot' || (dur > 0 && dur <= 45 && video.resourceType === 'concept')) {
      score += 25;
      label = 'Recommended for your conditions · Efficient backlog reduction';
    }
  }

  // 5. Preferred language alignment
  if (context.preferredLanguage && context.preferredLanguage !== 'all' && context.preferredLanguage !== 'any') {
    if (video.language.toLowerCase() === context.preferredLanguage.toLowerCase()) {
      score += 15;
    }
  }

  return { score, label };
}

export function buildYouTubeSearchQuery(params: SearchParams): string {
  if (params.q && params.q.trim()) {
    return params.q.trim();
  }

  const parts: string[] = [];

  // Class
  const grade = params.grade || '11';
  parts.push(`Class ${grade}`);

  // Board
  const board = params.board || 'CBSE';
  parts.push(board);

  // Subject
  if (params.subject) {
    parts.push(params.subject);
  }

  // Chapter
  if (params.chapter) {
    parts.push(params.chapter);
  }

  // Topic
  if (params.topic) {
    parts.push(params.topic);
  }

  // Resource Type / Confidence modifiers
  const isLowConfidence = params.confidence === 'low' || params.confidence === 'rusty';
  const isHighConfidence = params.confidence === 'high' || params.confidence === 'solid';

  if (params.resourceType === 'oneshot') {
    parts.push('one shot full chapter');
  } else if (params.resourceType === 'pyq') {
    parts.push('PYQ solved questions');
  } else if (params.resourceType === 'revision') {
    parts.push('quick revision');
  } else if (params.resourceType === 'concept') {
    parts.push('concept explanation NCERT');
  } else if (isLowConfidence) {
    parts.push('concept beginner');
  } else if (isHighConfidence) {
    parts.push('important questions PYQ');
  }

  // Language modifier
  if (params.language === 'Hindi' || params.language === 'Hinglish') {
    parts.push('Hindi');
  } else if (params.language === 'English') {
    parts.push('English');
  }

  return parts.join(' ');
}

export async function searchYouTubeResources(params: SearchParams): Promise<{
  query: string;
  results: YouTubeVideoItem[];
  cached: boolean;
  total: number;
}> {
  const query = buildYouTubeSearchQuery(params);
  const cacheKey = `${query.toLowerCase()}_${params.resourceType || 'all'}_${params.language || 'all'}_${params.availableTime || 60}`;

  // Check cache
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return {
      query,
      results: cached.data,
      cached: true,
      total: cached.data.length,
    };
  }

  let rawVideos: Array<{
    id: string;
    title: string;
    channel: string;
    duration: string;
    publishedTime?: string;
    viewCount?: string;
    thumbnail: string;
  }> = [];

  // Strategy 1: If YouTube API key is available, attempt official Google Data API v3
  const apiKey = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_API_KEY;
  if (apiKey) {
    try {
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=15&q=${encodeURIComponent(query)}&key=${apiKey}`;
      const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(6000) });
      if (searchRes.ok) {
        const searchJson = await searchRes.json();
        const ids = (searchJson.items || []).map((it: any) => it.id?.videoId).filter(Boolean);
        if (ids.length > 0) {
          // Fetch duration from videos endpoint
          const vidUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${ids.join(',')}&key=${apiKey}`;
          const vidRes = await fetch(vidUrl, { signal: AbortSignal.timeout(6000) });
          if (vidRes.ok) {
            const vidJson = await vidRes.json();
            for (const item of vidJson.items || []) {
              const durIso = item.contentDetails?.duration || '';
              // Convert ISO 8601 duration (PT1H20M15S) to mm:ss
              const m = durIso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
              let durStr = '0:00';
              if (m) {
                const hours = parseInt(m[1] || '0', 10);
                const mins = parseInt(m[2] || '0', 10);
                const secs = parseInt(m[3] || '0', 10);
                durStr = hours > 0
                  ? `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
                  : `${mins}:${secs.toString().padStart(2, '0')}`;
              }
              const thumb = item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`;
              rawVideos.push({
                id: item.id,
                title: item.snippet?.title || '',
                channel: item.snippet?.channelTitle || '',
                duration: durStr,
                publishedTime: item.snippet?.publishedAt ? new Date(item.snippet.publishedAt).toLocaleDateString() : undefined,
                viewCount: undefined,
                thumbnail: thumb,
              });
            }
          }
        }
      }
    } catch (e) {
      // Fall through to public parser
    }
  }

  // Strategy 2: Fast Public YouTube search extraction if no rawVideos yet
  if (rawVideos.length === 0) {
    try {
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      const res = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(7000),
      });

      if (res.ok) {
        const html = await res.text();
        const startToken = 'var ytInitialData = ';
        let idx = html.indexOf(startToken);
        if (idx === -1) {
          idx = html.indexOf('ytInitialData = ');
          if (idx !== -1) idx += 'ytInitialData = '.length;
        } else {
          idx += startToken.length;
        }

        if (idx !== -1) {
          const endIdx = html.indexOf(';</script>', idx);
          if (endIdx !== -1) {
            const data = JSON.parse(html.substring(idx, endIdx));
            const sectionList = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
            for (const s of sectionList) {
              const items = s?.itemSectionRenderer?.contents || [];
              for (const item of items) {
                if (item?.videoRenderer) {
                  const vr = item.videoRenderer;
                  const vidId = vr.videoId;
                  if (!vidId) continue;
                  const title = vr.title?.runs?.map((r: any) => r.text).join('') || vr.title?.simpleText || '';
                  const channel = vr.ownerText?.runs?.map((r: any) => r.text).join('') || '';
                  const duration = vr.lengthText?.simpleText || '';
                  const views = vr.viewCountText?.simpleText || '';
                  const published = vr.publishedTimeText?.simpleText || '';
                  const thumbs = vr.thumbnail?.thumbnails || [];
                  const thumb = thumbs.length > 0 ? thumbs[thumbs.length - 1].url : `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`;

                  rawVideos.push({
                    id: vidId,
                    title,
                    channel,
                    duration,
                    viewCount: views,
                    publishedTime: published,
                    thumbnail: thumb,
                  });
                }
              }
            }
          }
        }
      }
    } catch (e: any) {
      console.warn('[YouTube Service] Public search fetch error:', e.message);
    }
  }

  // Supplement with high-yield curated educational seeds to guarantee rich, reliable results
  const curatedSeeds = getCuratedVideosForQuery(
    `${params.chapter || ''} ${params.subject || ''} ${params.topic || ''} ${query}`,
    12
  );
  for (const c of curatedSeeds) {
    if (!rawVideos.some((r) => r.id === c.id)) {
      rawVideos.push({
        id: c.id,
        title: c.title,
        channel: c.channel,
        duration: c.duration,
        viewCount: c.views,
        publishedTime: c.published,
        thumbnail: `https://i.ytimg.com/vi/${c.id}/hqdefault.jpg`,
      });
    }
  }

  // Determine context conditions
  const examNear = Boolean(
    params.examDate &&
      Math.abs(new Date(params.examDate).getTime() - Date.now()) < 45 * 24 * 60 * 60 * 1000
  );
  const largeBacklog = (params.backlogCount || 0) > 3;

  // Process and rank videos
  const processedVideos: YouTubeVideoItem[] = rawVideos.map((raw) => {
    const durationMinutes = parseDurationToMinutes(raw.duration);
    const resourceType = detectResourceType(raw.title);
    const language = detectLanguage(raw.title, raw.channel);

    const { score, label } = calculateRelevance(
      { title: raw.title, durationMinutes, resourceType, language },
      {
        confidence: params.confidence,
        availableTime: params.availableTime,
        examNear,
        largeBacklog,
        preferredLanguage: params.language,
      }
    );

    return {
      id: raw.id,
      title: raw.title,
      channel: raw.channel,
      duration: raw.duration,
      durationMinutes,
      publishedTime: raw.publishedTime,
      viewCount: raw.viewCount,
      thumbnail: raw.thumbnail,
      resourceType,
      language,
      relevanceLabel: label,
      relevanceScore: score,
      isEmbeddable: true,
    };
  });

  // Filter by requested resourceType if specifically chosen and not 'all'
  let filtered = processedVideos;
  if (params.resourceType && params.resourceType !== 'all') {
    const matched = processedVideos.filter((v) => v.resourceType === params.resourceType);
    if (matched.length > 0) filtered = matched;
  }

  // Filter by language if specified
  if (params.language && params.language !== 'all' && params.language !== 'any') {
    const matched = filtered.filter(
      (v) => v.language.toLowerCase() === params.language?.toLowerCase()
    );
    if (matched.length > 0) filtered = matched;
  }

  // Sort by relevance score descending
  filtered.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Store in cache (limit to top 20 results)
  const finalResults = filtered.slice(0, 20);

  if (searchCache.size >= MAX_CACHE_ENTRIES) {
    const firstKey = searchCache.keys().next().value;
    if (firstKey) searchCache.delete(firstKey);
  }

  searchCache.set(cacheKey, {
    timestamp: Date.now(),
    data: finalResults,
  });

  return {
    query,
    results: finalResults,
    cached: false,
    total: finalResults.length,
  };
}
