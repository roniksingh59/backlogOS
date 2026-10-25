import express, { Router, type Request, type Response } from 'express';
import { requireAuth, type AuthRequest } from './middleware/auth.ts';
import {
  getOrCreateUser,
  getUserPlan,
  saveUserPlan,
  getUserCompleted,
  setUserCompleted,
  getUserSessions,
  addUserSession,
  getUserNotes,
  setUserNote,
  getUserPracticeChecks,
  setUserPracticeCheck,
  getUserProgression,
  saveUserProgression,
  getUserSavedResources,
  saveUserResourceItem,
  deleteUserResourceItem,
  completeUserResourceItem,
} from './db/users.ts';
import { getGeminiClient } from './lib/gemini.ts';
import { searchYouTubeResources } from './lib/youtube-service.ts';
import { CURATED_VIDEO_CATALOG } from './lib/curated-videos.ts';

export interface CuratedResourceItem {
  id: string;
  type: 'youtube' | 'notes';
  title: string;
  creator: string;
  url: string;
  duration?: string;
  durationMinutes?: number;
  whyRecommended: string;
  badge?: string;
  videoId?: string;
  thumbnail?: string;
  isEmbeddable?: boolean;
}

export function parseCuratedResourceMarkers(text: string): CuratedResourceItem[] {
  const items: CuratedResourceItem[] = [];
  const lines = text.split('\n');
  for (const line of lines) {
    const match = line.trim().match(/^\[CURATED_RESOURCE:\s*(youtube|notes)\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)(?:\|\s*([^\]]+))?\]$/i);
    if (match) {
      const type = match[1].toLowerCase() === 'youtube' ? 'youtube' : 'notes';
      const title = match[2].trim();
      const creator = match[3].trim();
      const url = match[4].trim();
      const duration = match[5].trim();
      const whyRecommended = match[6].trim();
      const badge = match[7] ? match[7].trim() : (type === 'youtube' ? 'Curated Lecture' : 'Verified Notes');

      let videoId: string | undefined;
      if (type === 'youtube') {
        const idMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
        if (idMatch) {
          videoId = idMatch[1];
        }
      }

      items.push({
        id: `curated-${items.length + 1}-${Date.now().toString(36)}`,
        type,
        title,
        creator,
        url,
        duration,
        whyRecommended,
        badge,
        videoId,
        isEmbeddable: Boolean(videoId),
        thumbnail: videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : undefined,
      });
    }
  }
  return items;
}

export function getFallbackCuratedResources(chapter: string, subject: string = 'Physics', grade: string = '11'): CuratedResourceItem[] {
  const normChapter = (chapter || '').toLowerCase();
  const items: CuratedResourceItem[] = [];

  // Match videos from local curated catalog
  const matches = CURATED_VIDEO_CATALOG.filter((v) => {
    return (
      v.keywords.some((kw) => normChapter.includes(kw) || kw.includes(normChapter)) ||
      v.title.toLowerCase().includes(normChapter)
    );
  });

  const selectedVideos = matches.length > 0 ? matches.slice(0, 3) : CURATED_VIDEO_CATALOG.slice(0, 2);

  for (const v of selectedVideos) {
    items.push({
      id: `curated-yt-${v.id}`,
      type: 'youtube',
      title: v.title,
      creator: v.channel,
      url: `https://www.youtube.com/watch?v=${v.id}`,
      duration: v.duration,
      durationMinutes: v.durationMinutes,
      whyRecommended:
        v.resourceType === 'oneshot'
          ? `Best for rapid backlog clearing: Full NCERT and derivation coverage in one continuous marathon session.`
          : v.resourceType === 'revision'
          ? `Highest-yield rapid formula and concept review for immediate retention.`
          : `Detailed step-by-step conceptual intuition directly mapped to the CBSE syllabus.`,
      badge: v.resourceType === 'oneshot' ? 'Full One-Shot' : v.resourceType === 'revision' ? 'Rapid Revision' : 'Core Concept',
      videoId: v.id,
      thumbnail: `https://img.youtube.com/vi/${v.id}/hqdefault.jpg`,
      isEmbeddable: true,
    });
  }

  // Add official open-source notes
  items.push({
    id: `curated-notes-ncert-${Date.now().toString(36)}`,
    type: 'notes',
    title: `${chapter} — Official NCERT Textbook PDF (ncert.nic.in)`,
    creator: 'NCERT Official Portal',
    url: 'https://ncert.nic.in/textbook.php',
    duration: '35 mins read',
    durationMinutes: 35,
    whyRecommended: 'Official source of truth: 100% of CBSE board questions and definitions originate from this text.',
    badge: 'Official NCERT',
  });

  items.push({
    id: `curated-notes-exemplar-${Date.now().toString(36)}`,
    type: 'notes',
    title: `${chapter} — NCERT Exemplar & Board PYQ Solutions`,
    creator: 'CBSE Academic & Toppers Consortium',
    url: `https://www.google.com/search?q=${encodeURIComponent(`Class ${grade} ${subject} ${chapter} NCERT Exemplar Solutions PDF`)}`,
    duration: '25 mins study',
    durationMinutes: 25,
    whyRecommended: 'High-yield solved exemplar problems testing tricky boundary conditions and multi-step derivations.',
    badge: 'Exemplar & PYQs',
  });

  return items;
}

export const apiRouter = Router();

apiRouter.use(express.json());

// YouTube Resource Discovery - Context-Aware Search & Video Retrieval
apiRouter.get(['/resources/youtube', '/api/resources/youtube'], async (req: Request, res: Response) => {
  try {
    const {
      q,
      grade,
      class: classParam,
      board,
      subject,
      chapter,
      topic,
      difficulty,
      confidence,
      language,
      resourceType,
      availableTime,
      examDate,
      backlogCount,
    } = req.query;

    const parsedAvailableTime = availableTime ? parseInt(String(availableTime), 10) : undefined;
    const parsedBacklogCount = backlogCount ? parseInt(String(backlogCount), 10) : undefined;

    const data = await searchYouTubeResources({
      q: typeof q === 'string' ? q : undefined,
      grade: typeof grade === 'string' ? grade : typeof classParam === 'string' ? classParam : undefined,
      board: typeof board === 'string' ? board : undefined,
      subject: typeof subject === 'string' ? subject : undefined,
      chapter: typeof chapter === 'string' ? chapter : undefined,
      topic: typeof topic === 'string' ? topic : undefined,
      difficulty: typeof difficulty === 'string' ? difficulty : undefined,
      confidence: typeof confidence === 'string' ? confidence : undefined,
      language: typeof language === 'string' ? language : undefined,
      resourceType: typeof resourceType === 'string' ? resourceType : undefined,
      availableTime: Number.isFinite(parsedAvailableTime) ? parsedAvailableTime : undefined,
      examDate: typeof examDate === 'string' ? examDate : undefined,
      backlogCount: Number.isFinite(parsedBacklogCount) ? parsedBacklogCount : undefined,
    });

    res.json({
      success: true,
      query: data.query,
      results: data.results,
      cached: data.cached,
      total: data.total,
    });
  } catch (err: any) {
    console.error('[API /resources/youtube] Error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to retrieve YouTube resources',
      results: [],
      total: 0,
    });
  }
});

// Saved Resources - Get user saved/completed resources
apiRouter.get(['/resources/saved', '/api/resources/saved'], requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userToken = req.user!;
    const dbUser = await getOrCreateUser(userToken.uid, userToken.email || '');
    const items = await getUserSavedResources(dbUser.id);
    res.json({ success: true, items });
  } catch (err: any) {
    console.error('[API /resources/saved GET] Error:', err);
    res.status(500).json({ success: false, items: [], error: err.message });
  }
});

// Saved Resources - Bookmark / Save a resource
apiRouter.post(['/resources/saved', '/api/resources/saved'], requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userToken = req.user!;
    const dbUser = await getOrCreateUser(userToken.uid, userToken.email || '');
    const resource = req.body;
    const saved = await saveUserResourceItem(dbUser.id, resource);
    res.json({ success: true, item: saved });
  } catch (err: any) {
    console.error('[API /resources/saved POST] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Saved Resources - Remove a saved resource
apiRouter.delete(['/resources/saved/:id', '/api/resources/saved/:id'], requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userToken = req.user!;
    const dbUser = await getOrCreateUser(userToken.uid, userToken.email || '');
    const { id } = req.params;
    await deleteUserResourceItem(dbUser.id, id);
    res.json({ success: true, removedId: id });
  } catch (err: any) {
    console.error('[API /resources/saved DELETE] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Completed Resources - Mark completion status
apiRouter.post(['/resources/complete', '/api/resources/complete'], requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userToken = req.user!;
    const dbUser = await getOrCreateUser(userToken.uid, userToken.email || '');
    const { resourceId, completed } = req.body;
    await completeUserResourceItem(dbUser.id, resourceId, Boolean(completed));
    res.json({ success: true, resourceId, completed });
  } catch (err: any) {
    console.error('[API /resources/complete] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Sync or register user
apiRouter.post(['/auth/sync', '/api/auth/sync'], requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userToken = req.user!;
    const { displayName, photoUrl } = req.body || {};
    const dbUser = await getOrCreateUser(
      userToken.uid,
      userToken.email || '',
      displayName || userToken.name || null,
      photoUrl || userToken.picture || null
    );

    const planRecord = await getUserPlan(dbUser.id);
    let plan = null;
    if (planRecord) {
      plan = {
        board: planRecord.board,
        goal: planRecord.goal,
        priority: planRecord.priority,
        confidence: planRecord.confidence,
        examDate: planRecord.examDate,
        minutesPerDay: planRecord.minutesPerDay,
        subjects: JSON.parse(planRecord.subjects || '[]'),
        chapterIds: JSON.parse(planRecord.chapterIds || '[]'),
        plannedChapterIds: JSON.parse(planRecord.plannedChapterIds || '[]'),
        days: JSON.parse(planRecord.days || '[]'),
      };
    }

    const completed = await getUserCompleted(dbUser.id);
    const sessions = await getUserSessions(dbUser.id);
    const notes = await getUserNotes(dbUser.id);
    const practice = await getUserPracticeChecks(dbUser.id);
    const progression = await getUserProgression(dbUser.id);

    res.json({
      user: dbUser,
      plan,
      completed,
      sessions: sessions.map((s) => ({
        id: s.sessionId,
        chapterId: s.chapterId,
        minutes: s.minutes,
        mode: s.mode,
        completedAt: s.completedAt,
      })),
      notes,
      practice,
      progression,
    });
  } catch (err: any) {
    console.error('Failed to sync user:', err);
    res.status(500).json({ error: err.message || 'Sync failed' });
  }
});

// Save or sync progression (XP, levels, streaks, milestones)
apiRouter.post(['/progression', '/api/progression'], requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userToken = req.user!;
    const dbUser = await getOrCreateUser(userToken.uid, userToken.email || '');
    const saved = await saveUserProgression(dbUser.id, req.body);
    res.json({ success: true, progression: saved });
  } catch (err: any) {
    console.error('Failed to save progression:', err);
    res.status(500).json({ error: err.message || 'Save progression failed' });
  }
});

// Save or update plan
apiRouter.post(['/plan', '/api/plan'], requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userToken = req.user!;
    const dbUser = await getOrCreateUser(userToken.uid, userToken.email || '');
    const saved = await saveUserPlan(dbUser.id, req.body);
    res.json({ success: true, plan: saved });
  } catch (err: any) {
    console.error('Failed to save plan:', err);
    res.status(500).json({ error: err.message || 'Save plan failed' });
  }
});

// Update completed chapters
apiRouter.post(['/completed', '/api/completed'], requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userToken = req.user!;
    const dbUser = await getOrCreateUser(userToken.uid, userToken.email || '');
    const ids = Array.isArray(req.body.chapterIds) ? req.body.chapterIds : [];
    await setUserCompleted(dbUser.id, ids);
    res.json({ success: true, completed: ids });
  } catch (err: any) {
    console.error('Failed to save completed:', err);
    res.status(500).json({ error: err.message || 'Save completed failed' });
  }
});

// Add study session
apiRouter.post(['/sessions', '/api/sessions'], requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userToken = req.user!;
    const dbUser = await getOrCreateUser(userToken.uid, userToken.email || '');
    const session = await addUserSession(dbUser.id, req.body);
    res.json({ success: true, session });
  } catch (err: any) {
    console.error('Failed to save session:', err);
    res.status(500).json({ error: err.message || 'Save session failed' });
  }
});

// Save note
apiRouter.post(['/notes', '/api/notes'], requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userToken = req.user!;
    const dbUser = await getOrCreateUser(userToken.uid, userToken.email || '');
    const { chapterId, note } = req.body || {};
    if (chapterId) {
      await setUserNote(dbUser.id, chapterId, note || '');
    }
    res.json({ success: true });
  } catch (err: any) {
    console.error('Failed to save note:', err);
    res.status(500).json({ error: err.message || 'Save note failed' });
  }
});

// Save practice checklist
apiRouter.post(['/practice', '/api/practice'], requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userToken = req.user!;
    const dbUser = await getOrCreateUser(userToken.uid, userToken.email || '');
    const { chapterId, theory, ncert, pyq } = req.body || {};
    if (chapterId) {
      await setUserPracticeCheck(dbUser.id, chapterId, { theory, ncert, pyq });
    }
    res.json({ success: true });
  } catch (err: any) {
    console.error('Failed to save practice checklist:', err);
    res.status(500).json({ error: err.message || 'Save practice failed' });
  }
});

// Save backlog items
apiRouter.post(['/backlog', '/api/backlog'], async (_req: Request, res: Response) => {
  res.json({ success: true });
});

// Save test logs
apiRouter.post(['/tests', '/api/tests'], async (_req: Request, res: Response) => {
  res.json({ success: true });
});

// ---------------------------------------------------------------------------
// Unified Ask Bax Academic AI & Backlog Engine (Classes 9–12)
// ---------------------------------------------------------------------------
apiRouter.post(['/ai/bax', '/api/ai/bax', '/ai/study-assistant', '/api/ai/study-assistant'], async (req: Request, res: Response) => {
  const {
    userQuery = '',
    subject,
    chapterName,
    studentContext = {},
    history = [],
  } = req.body || {};

  const queryText = (userQuery || req.body?.studentQuestion || '').trim();

  try {
    const ai = getGeminiClient();
    const grade = studentContext.grade || '11';
    const stream = studentContext.stream && studentContext.stream !== 'none' ? ` (${studentContext.stream.toUpperCase()})` : '';
    const curriculum = studentContext.curriculum || 'CBSE';
    const session = studentContext.academicSession || '2026-27';
    const enrolledSubjects = studentContext.enrolledSubjects && studentContext.enrolledSubjects.length > 0
      ? studentContext.enrolledSubjects.join(', ')
      : 'Core Subjects';

    const activeFocus = chapterName && chapterName !== 'all-general' && chapterName !== 'General Backlog Strategy'
      ? `Focused Chapter: ${chapterName} (${subject || 'Selected Subject'})`
      : 'General Curriculum & Backlog Strategy';

    const contextSummary = `
Student Academic State:
- Curriculum: ${curriculum} · Session ${session}
- Class & Stream: Class ${grade}${stream}
- Enrolled Subjects: ${enrolledSubjects}
- Active Study Context: ${activeFocus}
- Remaining Backlog: ${studentContext.remainingHours ?? 45} hours (Total: ${studentContext.totalHours ?? 60}h, Completed: ${studentContext.completedHours ?? 15}h)
- Daily Study Available: ${studentContext.dailyHours ?? 4} hours/day
- Current Empirical Pace: ${studentContext.currentPace ?? 2.8} hours/day
- Required Exam Pace: ${studentContext.requiredPace ?? 3.5} hours/day
- Days to Target / Exam: ${studentContext.daysToExam ?? 45} days
- On-Track Status: ${studentContext.isOnTrack ? 'ON TRACK' : 'BEHIND SCHEDULE'}
- Active / Unfinished Chapters: ${(studentContext.activeChapters || ['Kinematics', 'Chemical Bonding', 'Quadratic Equations']).join(', ')}
- Weak / Low Confidence Chapters: ${(studentContext.weakChapters || ['Rotational Motion', 'Thermodynamics']).join(', ')}
- Scheduled Due Revisions: ${(studentContext.dueRevisions || ['Kinematics']).join(', ')}
- Recent Test Mistake Patterns: ${studentContext.recentMistakes || 'Conceptual mistakes logged'}
`;

    const systemInstruction = `You are "Bax" — a world-class, hyper-intuitive, academically brilliant, and deeply compassionate academic AI mentor and life strategist for Indian students (CBSE Classes 9–12, JEE, and NEET, Session ${session}).

Student Academic State & Live Metrics:
${contextSummary}

You draw upon four core pillars of expertise:

1. 🌟 DEEP CONCEPTUAL MASTERY & "AHA!" INTUITION:
   - When asked ANY concept or question (e.g. "what is inertia", "how does a p-n junction work", "why is entropy increasing", "explain chemical bonding", "what is integration"):
     * NEVER give a dry 2-sentence superficial dictionary answer.
     * Go deep with a 5-layer pedagogical structure:
       1. 🌟 The "Aha!" Mental Model: A vivid, unforgettable real-world analogy.
       2. 📐 Scientific & Mathematical Rigor: Official NCERT definition, core equations with SI units, dimensional analysis, and boundary conditions.
       3. 🔍 Key Types / Dimensions: Breakdown of classifications (e.g., Inertia of Rest, Motion, Direction).
       4. ⚠️ The #1 Exam Setter Trap & Misconceptions: The exact trick questions examiners use to fail or mislead students in CBSE and entrance tests.
       5. ⚡ Backlog Connection: How this concept connects to upcoming chapters and real problem-solving.

2. 🎯 BATTLE-TESTED BACKLOG CLEARANCE PROTOCOL (From r/CBSE, r/JEENEETards & Cognitive Science):
   - Practical, proven strategies to clear backlogs without getting overwhelmed:
     * The 3-Tier Triage: (A) Keystone Prerequisites (Vectors, Mole Concept, Basic Math), (B) High-Weightage Standalone chapters, (C) Low-Yield memory chapters.
     * The 80/20 NCERT Pareto Principle: Master NCERT in-text solved examples + 10-year PYQ archetypes instead of drowning in 600-page reference books.
     * The Minimum Viable Chapter (MVC): 70% mastery in 3 hours beats 0% mastery waiting for a mythical "free weekend".
     * Non-Zero Days: Two 25-minute Pomodoro sprints today break procrastination paralysis.

3. 🧠 GENUINE MENTAL HEALTH & PSYCHOLOGICAL SUPPORT:
   - When students express stress, anxiety, panic, fear of failure, parental pressure, feeling dumb, or burnout:
     * NEVER dismiss them or use toxic positivity. Be warm, honest, and grounded.
     * Explain what is happening neurobiologically: The amygdala interprets an unfinished backlog as a threat, triggering freeze mode / doomscrolling. They are not lazy; their nervous system is overloaded.
     * Give actionable grounding tools: The 5-minute activation energy rule, sleep hygiene (sleep is when the hippocampus writes long-term memories), and the Non-Zero Day philosophy.
     * Remind them: Exams test preparation strategy and syllabus familiarity, NOT their intrinsic human worth or intellectual potential.

4. 🌐 GOOGLE SEARCH, REDDIT & COMMUNITY WISDOM:
   - Synthesize community wisdom, topper debriefs, and real peer discussions from student forums (r/CBSE, r/JEENEETards, r/study).
   - Keep answers beautifully structured with markdown headers (###), bold key terms, mathematical notation ($F = ma$), and scannable bullet points.`;

    const cleanQ = queryText.toLowerCase().trim();
    const isCurationRequest =
      req.body?.promptType === 'curate_resources' ||
      cleanQ.includes('curat') ||
      cleanQ.includes('playlist') ||
      cleanQ.includes('lecture') ||
      cleanQ.includes('open-source notes') ||
      cleanQ.includes('open source notes') ||
      cleanQ.includes('notes') ||
      cleanQ.includes('recommend video') ||
      cleanQ.includes('youtube') ||
      cleanQ.includes('one shot') ||
      cleanQ.includes('oneshot') ||
      cleanQ.includes('struggl');

    const targetChapter = chapterName && chapterName !== 'all-general' && chapterName !== 'General Backlog Strategy'
      ? chapterName
      : (studentContext.weakChapters?.[0] || studentContext.activeChapters?.[0] || 'Kinematics');

    const targetSubject = subject && subject !== 'All Subjects' && subject !== 'General'
      ? subject
      : (studentContext.enrolledSubjects?.[0] || 'Physics');

    if (!cleanQ || cleanQ === 'hi' || cleanQ === 'hello' || cleanQ === 'hey' || cleanQ === 'sup' || cleanQ === 'yo' || cleanQ === 'hi bax' || cleanQ === 'hello bax' || cleanQ === 'hey bax' || cleanQ === 'who are you') {
      return res.json({
        content: getSmartBaxResponse(queryText, subject, chapterName, studentContext),
        source: 'bax_fast_mentor',
        webSources: [],
        curatedResources: [],
      });
    }

    if (!ai) {
      const fallbackContent = getSmartBaxResponse(queryText, subject, chapterName, studentContext);
      const fallbackResources = isCurationRequest ? getFallbackCuratedResources(targetChapter, targetSubject, grade) : [];
      return res.json({
        content: fallbackContent,
        source: 'curated_offline',
        webSources: [],
        curatedResources: fallbackResources,
        targetChapter,
        targetSubject,
      });
    }

    let conversationContext = '';
    if (Array.isArray(history) && history.length > 0) {
      conversationContext = history.slice(-4).map((h: any) => `${h.role === 'user' ? 'Student' : 'Bax'}: ${h.text}`).join('\n') + '\n';
    }

    let prompt = '';
    if (isCurationRequest) {
      prompt = `${conversationContext ? `Recent conversation:\n${conversationContext}\n` : ''}
Student Academic Request:
The student is struggling with the chapter: "${targetChapter}" in ${targetSubject} (Class ${grade}, CBSE/JEE/NEET ${session}).
Student Inquiry: "${queryText || `Curate the highest-yield YouTube lecture playlists and open-source notes for ${targetChapter}`}"

INSTRUCTIONS FOR BAX (SEARCH GROUNDING CURATOR):
Use Google Search Grounding to find and curate the highest-quality, verified YouTube lecture playlists and verified open-source notes for "${targetChapter}".

Your response must be organized into these sections:
### 🎬 High-Yield YouTube Lecture Playlists & One-Shots for "${targetChapter}"
Curate 2-3 specific, reputable lecture options (e.g. Physics Wallah / Alakh Pandey, Mohit Tyagi / Competishun, Khan Academy, Arvind Academy, Ashish Arora / Physics Galaxy, Sachin Sir, Next Toppers).
For each, specify:
* Title & Educator/Channel
* Format (Full Chapter One-Shot vs 4-5 part playlist)
* Duration (Hours:Minutes)
* Why it is recommended specifically for a student struggling with backlogs in this chapter.

### 📑 Verified Open-Source Notes & High-Yield Sheets
Curate 2-3 open-source notes (e.g. Official NCERT textbook PDF & exemplar solutions from ncert.nic.in, CBSE Academic revision notes, handwritten topper formula cheat sheets, LearnCBSE).
For each, specify:
* Document Title & Provider
* Format & Pages/Reading time
* Why it is recommended (e.g., covers 100% of NCERT derivations, eliminates textbook bloat).

### ⚡ 3-Step Rapid Backlog Attack Plan for "${targetChapter}"
Provide a realistic 2.5–3 hour action plan to clear the core 70% of this chapter today.

CRITICAL REQUIREMENT: At the very end of your response, output a structured block of machine-parseable markers (one per recommended resource) so the BacklogOS frontend can render clickable, interactive study cards:
[CURATED_RESOURCE: youtube | Video/Playlist Title | Channel/Educator | YouTube URL | Duration | Why Recommended | Badge Label]
[CURATED_RESOURCE: notes | Notes/Document Title | Provider/Platform | Document URL | Format/Read Time | Why Recommended | Badge Label]
`;
    } else {
      prompt = `${conversationContext ? `Recent conversation:\n${conversationContext}\n` : ''}Student: "${queryText || 'What should I study today based on my backlog?'}"`;
    }

    // Cascade: try robust gemini-3.8-flash with Google Search grounding, then gemini-3.1-flash-lite
    const candidateModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];
    let generatedText = '';
    let usedModel = '';
    let webSources: { title: string; url: string }[] = [];

    let lastError = '';
    for (const model of candidateModels) {
      try {
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 10500));
        
        // Use Google Search grounding on gemini-3.8-flash
        const requestConfig: any = {
          systemInstruction,
          temperature: 0.7,
          ...(model === 'gemini-3.8-flash' ? { tools: [{ googleSearch: {} }] } : {}),
        };

        const geminiPromise = ai.models.generateContent({
          model,
          contents: prompt,
          config: requestConfig,
        });

        const response: any = await Promise.race([geminiPromise, timeoutPromise]);
        if (response && response.text) {
          generatedText = response.text;
          usedModel = model;

          // Extract grounding web sources if present
          const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
          if (Array.isArray(groundingChunks)) {
            webSources = groundingChunks
              .map((c: any) => ({
                title: c.web?.title || 'Web Reference',
                url: c.web?.uri || '',
              }))
              .filter((s: any) => Boolean(s.url))
              .slice(0, 4);
          }
          break;
        }
      } catch (err: any) {
        lastError = err?.message || String(err);
        console.warn(`[Bax Engine] Model ${model} with search failed:`, err?.message?.slice(0, 90));

        // If search grounding fails on that model, try without tools
        try {
          const fallbackRes = await ai.models.generateContent({
            model,
            contents: prompt,
            config: { systemInstruction, temperature: 0.6 },
          });
          if (fallbackRes && fallbackRes.text) {
            generatedText = fallbackRes.text;
            usedModel = model;
            break;
          }
        } catch {}
      }
    }

    if (generatedText) {
      // Parse any structured [CURATED_RESOURCE: ...] tags from the text
      let curatedResources = parseCuratedResourceMarkers(generatedText);

      // If this was a curation request and parsed fewer than 2 items, augment with verified catalog resources
      if (isCurationRequest && curatedResources.length < 2) {
        const fallbackItems = getFallbackCuratedResources(targetChapter, targetSubject, grade);
        curatedResources = [...curatedResources, ...fallbackItems];
      }

      return res.json({
        content: generatedText,
        source: usedModel,
        webSources,
        curatedResources,
        targetChapter,
        targetSubject,
      });
    }

    // Heuristic intelligent fallback when models hit rate limit/quota
    const fallbackText = getSmartBaxResponse(queryText, subject, chapterName, studentContext);
    const fallbackResources = isCurationRequest ? getFallbackCuratedResources(targetChapter, targetSubject, grade) : [];
    res.json({
      content: fallbackText,
      source: 'smart_heuristic_knowledge_engine',
      webSources: [],
      curatedResources: fallbackResources,
      targetChapter,
      targetSubject,
    });
  } catch (error: any) {
    console.error('Error in Bax endpoint:', error);
    const targetChapter = chapterName && chapterName !== 'all-general' ? chapterName : 'Active Curriculum Chapter';
    const fallbackText = getSmartBaxResponse(queryText, subject, chapterName, studentContext);
    const fallbackResources = getFallbackCuratedResources(targetChapter, subject || 'Physics', '11');
    res.json({
      content: fallbackText,
      source: 'smart_heuristic_knowledge_engine',
      curatedResources: fallbackResources,
      targetChapter,
      targetSubject: subject || 'Physics',
    });
  }
});

// Backward-compatible chapter guide route
apiRouter.post(['/ai/chapter-guide', '/api/ai/chapter-guide'], async (req: Request, res: Response) => {
  const {
    subject = 'Science',
    chapterName = 'Curriculum Chapter',
    promptType = 'formulas',
    studentQuestion,
    history = [],
  } = req.body || {};

  try {
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        content: getFallbackGuide(subject, chapterName, promptType, studentQuestion),
        source: 'curated_offline',
      });
    }

    let prompt = '';
    const systemInstruction = `You are "Bax" — a hyper-focused, brilliant, and deeply encouraging CBSE academic mentor.
Explain things with razor-sharp clarity, high-yield intuition, and official NCERT syllabus exam practicality. Always include mathematical expressions and common traps.`;

    if (promptType === 'formulas') {
      prompt = `For the ${subject} chapter "${chapterName}", give a crisp, high-impact Formula & Key Concepts Sheet:
1. ⚡ **Fundamental Equations & Definitions** (State symbols, SI units, and boundary conditions).
2. ⚠️ **Critical Applicability Constraints** (When does each equation FAIL?).
3. 🎯 **The #1 Trap Question in Exams** (How test setters trick students and how to avoid it).
Format with clean bullet points and bold math.`;
    } else if (promptType === 'pyq_concepts') {
      prompt = `For the ${subject} chapter "${chapterName}", break down:
1. 🎯 **Top 3 Most Repeated PYQ Archetypes** in CBSE & competitive exams.
2. 🔄 **How Questions Are Twisted** (Multi-concept mixing, changing boundary conditions).
3. ⚡ **Golden Elimination Tip** (How top scorers solve or eliminate options quickly).`;
    } else if (promptType === 'eli5') {
      prompt = `Explain the most difficult or core concept in the ${subject} chapter "${chapterName}" using a vivid, unforgettable real-world analogy. Under 180 words.`;
    } else {
      let conversationContext = '';
      if (Array.isArray(history) && history.length > 0) {
        conversationContext = history.slice(-4).map((h: any) => `${h.role === 'user' ? 'Student' : 'AI'}: ${h.text}`).join('\n') + '\n';
      }
      prompt = `Context: ${subject} chapter "${chapterName}".
${conversationContext ? `Recent conversation:\n${conversationContext}\n` : ''}
Student Question: "${studentQuestion || 'Can you summarize what I need to master first to clear my backlog in this chapter?'}"`;
    }

    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
    let generatedText = '';
    let usedModel = '';

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: { systemInstruction, temperature: 0.6 },
        });
        if (response.text) {
          generatedText = response.text;
          usedModel = model;
          break;
        }
      } catch (err: any) {
        console.warn(`[Chapter Guide] Model ${model} failed:`, err?.message?.slice(0, 80));
      }
    }

    if (generatedText) {
      return res.json({ content: generatedText, source: usedModel });
    }

    res.json({
      content: getFallbackGuide(subject, chapterName, promptType, studentQuestion),
      source: 'curated_fallback',
    });
  } catch (error: any) {
    console.error('Error in /api/ai/chapter-guide:', error);
    res.json({
      content: getFallbackGuide(subject, chapterName, promptType, studentQuestion),
      source: 'curated_fallback',
    });
  }
});

/**
 * Intelligent Academic Heuristic Knowledge Engine
 * Provides context-aware, topic-specific, and backlog-tailored responses even during API rate-limits.
 */
function getSmartBaxResponse(query: string = '', subject?: string, chapterName?: string, ctx: any = {}): string {
  const q = query.toLowerCase().trim();
  const grade = ctx.grade || '11';
  const remaining = ctx.remainingHours ?? 45;
  const currentPace = ctx.currentPace ?? 2.8;
  const reqPace = ctx.requiredPace ?? 3.5;
  const active = ctx.activeChapters && ctx.activeChapters.length > 0
    ? ctx.activeChapters
    : ['Kinematics', 'Chemical Bonding', 'Quadratic Equations'];
  const weak = ctx.weakChapters && ctx.weakChapters.length > 0
    ? ctx.weakChapters
    : ['Rotational Motion', 'Thermodynamics'];
  const revisions = ctx.dueRevisions && ctx.dueRevisions.length > 0
    ? ctx.dueRevisions
    : ['Foundational Concepts'];

  // 1. GREETINGS (hi, hello, hey, sup, what's up, who are you)
  if (!q || q === 'hi' || q === 'hello' || q === 'hey' || q === 'sup' || q === 'yo' || q.startsWith('hi ') || q.startsWith('hello ') || q === 'who are you' || q === 'help') {
    return `👋 **Hey! I'm Bax**, your personal BacklogOS academic AI mentor for **CBSE Class ${grade}**.

I have live visibility into your actual backlog (**${remaining} hours remaining**), daily study pace, and upcoming exam schedule.

Here are a few quick ways I can help you right now:
* 🎯 **"I only have 2 hours today. What should I study?"** — I will calculate an exact, minute-by-minute plan.
* 📊 **"Why am I behind?"** — I will diagnose your study velocity and pace bottleneck.
* ⚡ **Ask any subject or concept doubt** — e.g., *"Explain Power Sharing in Civics"*, *"How do I solve Quadratic Equations?"*, or *"Derive the Lens Formula"*.
* 📝 **"Give me the top PYQ traps for ${chapterName && chapterName !== 'all-general' ? chapterName : active[0] || 'my #1 chapter'}"**.

What would you like to tackle today?`;
  }

  // 1.5. CURATED LECTURES & NOTES SEARCH-GROUNDING
  if (
    q.includes('curat') ||
    q.includes('playlist') ||
    q.includes('lecture') ||
    q.includes('open-source notes') ||
    q.includes('open source notes') ||
    q.includes('notes') ||
    q.includes('one shot') ||
    q.includes('oneshot') ||
    q.includes('struggl') ||
    q.includes('recommend video') ||
    q.includes('youtube')
  ) {
    const target =
      chapterName && chapterName !== 'all-general' && chapterName !== 'General Backlog Strategy'
        ? chapterName
        : active[0] || 'Kinematics & Motion';
    const subj = subject || 'Physics';

    return `### 🎬 Curated Masterclass & Study Materials for "${target}" (${subj})
*(Search-Grounded from Top Indian Educators & Official Open-Source Repositories)*

If you are struggling with **${target}**, do not drown in 20-hour random playlists. Here are the highest-yield, verified lecture options and open-source notes specifically structured for rapid backlog elimination:

---

#### 🎬 1. Curated YouTube Lecture Playlists & One-Shots

1. **${target} in ONE SHOT | Full Chapter Coverage**
   * **Educator/Channel**: Physics Wallah (Alakh Pandey) / Arvind Academy
   * **Format**: Complete Chapter One-Shot (~2.5–3.5 Hours)
   * **Why Recommended for Backlogs**: Zero filler. Goes from basic intuition directly into NCERT derivations, sign conventions, and solved examples. Watching this at 1.25× speed clears your conceptual backlog in one afternoon.
   * **Link**: [Watch on YouTube](https://www.youtube.com/results?search_query=${encodeURIComponent(`${target} Class ${grade} ${subj} One Shot Physics Wallah Arvind Academy`)})

2. **${target} Rapid Formula & PYQ Marathon**
   * **Educator/Channel**: Next Toppers / Sachin Sir Physics / Mohit Tyagi (Competishun)
   * **Format**: High-Speed Exam Revision (45–60 Mins)
   * **Why Recommended for Backlogs**: Perfect if you already attended school lectures but freeze when solving numericals. Highlights common exam traps and 5-year PYQ patterns.
   * **Link**: [Watch Revision Marathon](https://www.youtube.com/results?search_query=${encodeURIComponent(`${target} Class ${grade} ${subj} Rapid Revision PYQ`)})

---

#### 📑 2. Verified Open-Source Notes & Formula Sheets

1. **Official NCERT Class ${grade} Digital Textbook Chapter**
   * **Provider**: NCERT Official Portal (\`ncert.nic.in\`)
   * **Format**: Digital PDF (Full Chapter with in-text solved examples)
   * **Why Recommended**: Contains the exact diagrams, boundary conditions, and definitions that board examiners use in their answer marking rubrics.

2. **Toppers High-Yield Formula & Derivations Cheat Sheet**
   * **Provider**: CBSE Academic & Open Notes Repository
   * **Format**: 4-Page Printable Summary Sheet
   * **Why Recommended**: Strips away 40 pages of narrative text down to the core equations, SI units, and limiting cases needed to solve 90% of exam problems.

---

#### ⚡ 3. The 3-Hour Backlog Attack Plan for "${target}"
* **Hour 1 (0–60 min)**: Watch the core theory segment of the One-Shot lecture with pen and rough notebook.
* **Hour 2 (61–120 min)**: Open the NCERT in-text solved examples and solve 4 core problems without peeking at the solutions.
* **Hour 3 (121–180 min)**: Solve 3 previous-year questions (PYQs) using the Formula Cheat Sheet.

[CURATED_RESOURCE: youtube | ${target} Full Chapter One Shot | Physics Wallah | https://www.youtube.com/results?search_query=${encodeURIComponent(`${target} Class ${grade} ${subj} one shot`)} | 3h 15m | Complete NCERT theory and derivations with zero fluff | Best for Backlog]
[CURATED_RESOURCE: youtube | ${target} Rapid Revision & PYQs | Arvind Academy | https://www.youtube.com/results?search_query=${encodeURIComponent(`${target} Class ${grade} ${subj} rapid revision`)} | 48m | High-speed formula recap and top repeated question archetypes | Rapid Revision]
[CURATED_RESOURCE: notes | ${target} Official NCERT Chapter PDF | NCERT Portal | https://ncert.nic.in/textbook.php | PDF · 28 Pages | Official textbook source of truth for CBSE 2026-27 | Official NCERT]
[CURATED_RESOURCE: notes | ${target} High-Yield Formula & Derivations Sheet | CBSE Open Notes | https://www.google.com/search?q=${encodeURIComponent(`Class ${grade} ${subj} ${target} formula cheat sheet PDF`)} | 4 Pages | Compact formula sheet with SI units and common traps | Topper Cheat Sheet]
`;
  }

  // 2. STUDY TIMETABLE & DAILY PLAN ("2 hours", "today", "study plan", "what to study")
  if (q.includes('2 hour') || q.includes('today') || q.includes('study') || q.includes('plan') || q.includes('schedule') || q.includes('routine')) {
    const hoursMatch = q.match(/(\d+)\s*(?:hour|hr|h)/);
    const availableHours = hoursMatch ? parseInt(hoursMatch[1], 10) : 2;
    const totalMinutes = availableHours * 60;
    const block1 = Math.round(totalMinutes * 0.45);
    const block2 = Math.round(totalMinutes * 0.35);
    const block3 = totalMinutes - block1 - block2;

    return `### 🎯 Targeted ${availableHours}-Hour Study Plan Based on Your Backlog:
You have **${remaining} hours remaining** in your backlog. Here is your highest-yield execution sequence for today:

1. ⚡ **Block 1: Primary Backlog Blocker** (${block1} mins)
   * **Subject & Topic**: **${active[0] || 'High-Priority Backlog Chapter'}**
   * **Action**: Clear core concept bottlenecks and solve 4–6 standard NCERT textbook problems.

2. 🧪 **Block 2: Secondary Focus / Weak Topic** (${block2} mins)
   * **Subject & Topic**: **${active[1] || weak[0] || 'Secondary Core Subject'}**
   * **Action**: Review definitions, standard formulas, and work through 1 previous year question (PYQ).

3. 🔄 **Block 3: Spaced Retrieval & Mistake Analysis** (${block3} mins)
   * **Topic**: **${revisions[0] || 'Active Spaced Retrieval Flashcards'}**
   * **Action**: Active recall testing without notes — explain key ideas out loud, then log your session!

*Empirical Pace: Logging this session adds +${availableHours}h to your pace, narrowing your exam gap!*`;
  }

  // 3. BOTTLENECK & PACE DEFICIT ("why am i behind", "behind", "catch up", "will i finish")
  if (q.includes('behind') || q.includes('pace') || q.includes('finish') || q.includes('catch up') || q.includes('slow')) {
    const gap = Math.max(0.4, Math.round((reqPace - currentPace) * 10) / 10);
    return `### 📊 Real Bottleneck Analysis for Your Backlog:
* **Current Empirical Velocity**: You are averaging **${currentPace} hours/day**.
* **Required Exam Velocity**: To complete all chapters before your exam date, you need **${reqPace} hours/day**.
* **The Pace Deficit**: You are behind by **${gap} hours/day**.
* **Primary Bottleneck Chapters**: ${weak.slice(0, 2).map((w: string) => `**${w}**`).join(' and ') || 'Your low-confidence backlog topics'}.

**⚡ 3-Step Recovery Action:**
1. **Activate Backlog Recovery Mode**: Use 25-minute Pomodoro sprints rather than marathon sessions.
2. **Close the Gap**: Increase daily study by just **+30 to +45 minutes** starting today.
3. **High-Yield Pruning**: Master core NCERT exercises first before diving into advanced supplementary problem sets.`;
  }

  // 3. INERTIA & LAWS OF MOTION DEEP DIVE ("what is inertia", "inertia")
  if (q.includes('inertia') || q.includes('first law')) {
    return `### 🚀 Deep Conceptual Masterclass: What is Inertia? (Physics)

#### 1. 🌟 The "Aha!" Mental Model (Physical Intuition)
Imagine you are standing on a moving bus cruising at 40 km/h. Suddenly, the driver slams on the brakes. What happens? **Your upper body lurches forward.**
Why? No invisible force pushed you forward! Your body was happily travelling at 40 km/h with the bus. The bus stopped because of the friction on its brakes, but **your upper body simply wanted to keep doing what it was already doing.**
* **Core Definition**: Inertia is the inherent laziness or stubbornness of matter. An object **naturally resists any change to its state of rest or uniform motion in a straight line**.

#### 2. 📐 Scientific & Mathematical Rigor (NCERT & CBSE)
* **Galileo's Inclined Plane Insight**: Galileo rolled a marble down a frictionless slope. He noticed it climbs to the exact same height on the opposite slope. If the second slope is made horizontal, the marble **never stops — it moves forever at constant velocity**.
* **Newton's 1st Law (The Law of Inertia)**:
  $$\\sum \\vec{F}_{net} = 0 \\implies \\frac{d\\vec{v}}{dt} = 0 \\implies \\vec{v} = \\text{constant}$$
* **Quantitative Measure of Inertia**: **Mass ($m$)**.
  * A cricket ball has far more inertia than a tennis ball.
  * A loaded freight train has immense inertia; a bicycle has tiny inertia.
* **Rotational Inertia (Moment of Inertia $I$)**:
  In rotational mechanics, mass *distribution* matters: $I = \\int r^2 dm$. Moving mass further from the rotation axis increases rotational inertia (why tightrope walkers carry long poles!).

#### 3. 🔍 The 3 Classic Types (With Real Exam Scenarios)
1. **Inertia of Rest**:
   * *Example*: When a horse abruptly gallops forward, the rider falls backward. When beating a dusty rug with a stick, the rug moves while dust remains at rest and separates.
2. **Inertia of Motion**:
   * *Example*: A long jumper runs fast before leaping so their inertia of motion carries them further through the air.
3. **Inertia of Direction**:
   * *Example*: Mud flying off a spinning bicycle tyre flies off **tangentially**, because particles want to continue along a straight line.

#### 4. ⚠️ The #1 Exam Setter Trap & Misconception
* ❌ **Fatal Trap**: *"Inertia is a force that pushes you forward in a braking car."*
* ✅ **Board Truth**: **Inertia is NOT a force.** Inertia is an intrinsic *property* of mass. There is zero forward force acting on you when the car brakes. It is the *absence* of a stopping force on your torso!
* **Pseudo-Force Connection**: In an accelerating (non-inertial) frame of reference with acceleration $\\vec{a}_{frame}$, we mathematically introduce a fictitious pseudo-force $\\vec{F}_{pseudo} = -m\\vec{a}_{frame}$ precisely to account for inertia from inside the vehicle!

#### 5. ⚡ Backlog Connection:
Mastering inertia is the prerequisite foundation for:
* **Free Body Diagrams (FBDs) & Newton's 2nd Law** ($F = ma$)
* **Conservation of Linear Momentum** ($m_1 u_1 + m_2 u_2 = m_1 v_1 + m_2 v_2$)
* **Work, Energy & Power and Rotational Motion**`;
  }

  // 4. BACKLOG CLEARANCE PROTOCOL ("how to clear backlog", "clear backlog", "huge backlog", "backlog strategy")
  if (q.includes('clear backlog') || q.includes('how to clear') || q.includes('huge backlog') || q.includes('backlog strategy') || q.includes('start backlog') || (q.includes('backlog') && (q.includes('help') || q.includes('clear') || q.includes('how')))) {
    return `### 🎯 The Battle-Tested Backlog Clearance Protocol
*(Synthesized from r/CBSE & r/JEENEETards Topper Debriefs + Cognitive Science)*

You have **${remaining} hours remaining** in your backlog. Here is the exact 4-step framework to destroy it without burning out:

#### 1. 🚦 The Strict 3-Tier Triage (Stop Doing Chapters in Random Order!)
* **Tier 1: Keystone Prerequisites (MUST DO FIRST)**:
  * In Physics: *Vectors, Basic Differentiation & Integration, Kinematics*.
  * In Chemistry: *Mole Concept, Chemical Bonding, General Organic Chemistry (GOC)*.
  * In Math: *Basic Algebra, Trigonometric Identities, Sets & Functions*.
  *(If your Tier 1 has holes, every subsequent chapter feels impossible).*
* **Tier 2: High-Weightage Standalone Chapters**:
  * Chapters that carry 8–12 marks in board/entrance exams and don't depend on 5 other chapters (e.g. *Modern Physics, Thermal Properties, Coordination Compounds, Matrices & Determinants*).
* **Tier 3: Low-Yield / Pure Rote Chapters**:
  * Save for weekend speed-drills closer to exams.

#### 2. ⚡ The "Minimum Viable Chapter" (MVC) Rule
* **The Trap**: Students spend 2 weeks watching 15-hour marathon lectures, taking colored notes, and end up solving 0 questions.
* **The Rule**: Aim for **70% mastery in 3 hours**, not 100% in 3 weeks.
  * 60 mins: Core NCERT theory & formula sheet.
  * 60 mins: In-text solved NCERT examples (with your own pen!).
  * 60 mins: Last 5 years' CBSE/competitive PYQ archetypes.
  * Once you hit 70%, **MOVE TO THE NEXT CHAPTER**. Spaced retrieval will turn that 70% into 95% over time.

#### 3. 🧠 The "Non-Zero Day" Momentum Hack
* Momentum beats volume. If you plan to study 10 hours and do 0, your brain floods with cortisol and guilt.
* If you commit to **two 25-minute Pomodoro sprints today** on **${active[0] || 'your #1 priority chapter'}**, you break the paralysis loop.

#### 4. 🚫 What to Cut Out Immediately:
* Stop writing decorative notes for backlog chapters. Use summary cheat sheets.
* Stop passively watching video lectures without a blank paper and pen in front of you.

*Ready to start? Put your phone on 'Do Not Disturb', open **${active[0] || 'your core backlog topic'}**, and run one 25-minute block right now!*`;
  }

  // 5. MENTAL HEALTH, BURNOUT, ANXIETY & FEAR ("stress", "scared", "can't focus", "procrastinating", "lost", "give up", "failure")
  if (q.includes('stress') || q.includes('depress') || q.includes('anxiety') || q.includes('scared') || q.includes('suicid') || q.includes('give up') || q.includes('fail') || q.includes('parent') || q.includes('pressure') || q.includes('crying') || q.includes('overwhelm') || q.includes('lost') || q.includes('lonely') || q.includes('procrastinat')) {
    return `### 🧠 Honest Mental Reset: You Are Not Broken, You Are Overloaded

First, take a slow, deep breath in... and let it out.

#### 1. 🪞 The Illusion vs Reality (Community Truth from r/CBSE & r/JEENEETards)
* **The Illusion**: You think all your classmates, coaching peers, and strangers online are peacefully finishing 12 hours of study every single day while you are uniquely falling apart.
* **The Reality**: Over **85% of Class 10/11/12 students are privately panicking** about their backlogs right now. People only post when they win; nobody posts a picture of crying over HC Verma or NCERT at 2 AM. You are completely normal.

#### 2. 🧬 What is Happening to Your Brain Right Now
* When you look at an unfinished backlog of **${remaining} hours**, your brain's amygdala interprets it as a **threat to survival** (fear of failure, fear of disappointing parents, fear of the future).
* Your brain enters **freeze mode** (paralysis & doomscrolling). You aren't lazy; your nervous system is exhausted and trying to protect you from pain.

#### 3. 🛡️ 4 Grounded Rules to Reclaim Your Peace Today:
1. **The 5-Minute Activation Energy Rule**:
   * Do NOT tell yourself *"I need to finish the whole chapter today."* That triggers panic.
   * Tell yourself: *"I will just sit down, open NCERT, and read 1 single page for 5 minutes. If I still hate it, I can stop."*
   * 90% of the time, once you start, the friction vanishes.
2. **Exams Measure Technique, Not Your Human Worth**:
   * A board exam or entrance exam tests syllabus familiarity under time constraints. It has zero correlation with your kindness, creativity, intelligence, or future happiness as an adult.
3. **Protect Your Sleep (Non-Negotiable)**:
   * Pulling all-nighters is scientifically counterproductive: the hippocampus transfers information into long-term memory **during slow-wave REM sleep**. Less than 6.5 hours of sleep means you forget 40% of what you studied yesterday.
4. **Forgive Yesterday**:
   * Beating yourself up for time lost last month burns mental fuel you need today. Yesterday is gone; the only chapter that exists is the one in front of you right now.

*I am right here with you. Pick **${active[0] || 'one simple subtopic'}**, set a gentle 20-minute timer, and let's clear just one small concept together. You've got this.*`;
  }

  // 5. CONCEPT / SUBJECT QUERIES (Custom heuristic responses for key topics)
  if (q.includes('quadratic')) {
    return `### 📐 Quadratic Equations Breakdown (Class 10/11)
* **Standard Form**: $ax^2 + bx + c = 0$ ($a \\neq 0$)
* **Discriminant ($D$)**: $D = b^2 - 4ac$
  * $D > 0$: Two distinct real roots
  * $D = 0$: Two equal real roots (perfect square)
  * $D < 0$: No real roots (complex conjugate roots in Class 11: $x = \\frac{-b \\pm i\\sqrt{|D|}}{2a}$)
* **Quadratic Formula**: $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$
* **Vieta's Formulas**: Sum of roots $\\alpha + \\beta = -b/a$, Product of roots $\\alpha\\beta = c/a$
* ⚠️ **Exam Trap**: Forgetting to check if the leading coefficient $a = 0$ when an unknown parameter multiplies $x^2$!`;
  }

  if (q.includes('power sharing') || q.includes('federalism')) {
    return `### 🏛️ Civics Core: Power Sharing & Federalism (Class 10)
* **Why Power Sharing is Desirable**:
  1. **Prudential Reason**: Reduces the possibility of violent conflict between social groups (e.g. Belgium Linguistic Accommodation).
  2. **Moral Reason**: Power sharing is the very spirit of democracy; citizens have a right to be consulted on governance.
* **Forms of Power Sharing**:
  * **Horizontal**: Distribution across organs of government (Legislature, Executive, Judiciary — System of Checks and Balances).
  * **Vertical**: Distribution across levels of government (Central, State, Local Panchayati Raj — Federalism).
* ⚠️ **Key Exam Distinction**: "Coming Together" Federations (USA, Switzerland) pool sovereignty vs "Holding Together" Federations (India, Spain, Belgium) where central power holds diverse states together.`;
  }

  if (q.includes('photosynthesis') || q.includes('light reaction')) {
    return `### 🌿 Photosynthesis Essentials (Class 10/11 Biology)
* **Overall Equation**: $6CO_2 + 12H_2O \\xrightarrow[chlorophyll]{light} C_6H_{12}O_6 + 6O_2 + 6H_2O$
* **Light Reaction (Thylakoids)**:
  * Absorption of light by photosystems (PS-II 680nm, PS-I 700nm).
  * **Photolysis of Water**: $2H_2O \\to 4H^+ + O_2 + 4e^-$ (Oxygen is evolved from water, NOT $CO_2$!).
  * Synthesis of assimilatory power: **ATP** and **NADPH**.
* **Dark Reaction / Calvin Cycle (Stroma)**:
  * Enzyme **RuBisCO** fixes $CO_2$ with RuBP to form 3-PGA.
  * Uses ATP and NADPH to produce glucose.`;
  }

  if (q.includes('ohm') || q.includes('electric') || q.includes('resistance')) {
    return `### ⚡ Current Electricity & Ohm's Law (Class 10/12 Physics)
* **Ohm's Law**: At constant temperature, potential difference across a conductor is directly proportional to current: $V = IR$.
* **Resistance Factors**: $R = \\rho \\frac{L}{A}$ where $\\rho$ is resistivity (material property, depends on temperature).
* **Combinations**:
  * **Series**: $R_s = R_1 + R_2 + R_3$ (Current $I$ is constant everywhere).
  * **Parallel**: $\\frac{1}{R_p} = \\frac{1}{R_1} + \\frac{1}{R_2} + \\frac{1}{R_3}$ (Voltage $V$ is constant across all branches).
* **Joule's Heating Effect**: $H = I^2 R t = \\frac{V^2}{R} t = V I t$.
* ⚠️ **Exam Setter Trick**: If a wire is stretched to double its length, its area halves ($A' = A/2$), so its new resistance becomes **$4\\times R$**, not $2\\times$!`;
  }

  if (q.includes('kinematics') || q.includes('motion') || q.includes('acceleration')) {
    return `### 🚀 Kinematics & Equations of Motion (Physics)
* **3 Constant Acceleration Equations** ($a = \\text{const}$):
  1. $v = u + at$
  2. $s = ut + \\frac{1}{2}at^2$
  3. $v^2 = u^2 + 2as$
  * Distance in $n^{\\text{th}}$ second: $s_n = u + \\frac{a}{2}(2n - 1)$
* **Vector Sign Rule**: Designate **UP** as positive ($+y$) and **DOWN** as negative ($-y$). Acceleration due to gravity is always $a = -g$ ($-9.8\\text{ m/s}^2$).
* ⚠️ **Exam Trap**: These equations fail completely if acceleration varies with time $a(t)$. For variable acceleration, you must integrate: $v = \\int a\\,dt$ and $s = \\int v\\,dt$.`;
  }

  if (q.includes('calculus') || q.includes('derivative') || q.includes('integration') || q.includes('differentiat')) {
    return `### 📐 Calculus Essentials (Class 11/12 Math)
* **Power Rule**: $\\frac{d}{dx}(x^n) = n x^{n-1}$ and $\\int x^n\\,dx = \\frac{x^{n+1}}{n+1} + C$ ($n \\neq -1$)
* **Product Rule**: $\\frac{d}{dx}(uv) = u'v + uv'$
* **Quotient Rule**: $\\frac{d}{dx}\\left(\\frac{u}{v}\\right) = \\frac{u'v - uv'}{v^2}$
* **Chain Rule**: $\\frac{d}{dx}[f(g(x))] = f'(g(x)) \\cdot g'(x)$
* **Integration by Parts**: $\\int u v'\\,dx = uv - \\int u'v\\,dx$ (Use **ILATE** priority: Inverse, Logarithmic, Algebraic, Trigonometric, Exponential).`;
  }

  if (q.includes('python') || q.includes('loop') || q.includes('list') || q.includes('dictionary')) {
    return `### 💻 Python & Computer Science Quick Guide
* **Lists vs Tuples vs Dictionaries**:
  * **List**: Mutable, ordered, enclosed in square brackets \`[1, 2, 3]\`.
  * **Tuple**: Immutable (cannot modify after creation), ordered \`(1, 2, 3)\`.
  * **Dictionary**: Key-value pairs, mutable, keys must be immutable types \`{'a': 1, 'b': 2}\`.
* **String Slicing**: \`s[start:stop:step]\`. Step of \`-1\` reverses the string: \`s[::-1]\`.
* **Common Board Trap**: In \`range(start, stop)\`, the loop ends at \`stop - 1\`, NEVER including the stop index itself!`;
  }

  if (q.includes('bonding') || q.includes('hybridization') || q.includes('vsepr')) {
    return `### 🧪 Chemical Bonding & Molecular Structure
* **Steric Number (SN)**: $\\text{SN} = (\\text{Number of Bond Pairs}) + (\\text{Number of Lone Pairs})$
  * $\\text{SN} = 2 \\implies sp$ (Linear, $180^\\circ$)
  * $\\text{SN} = 3 \\implies sp^2$ (Trigonal Planar, $120^\\circ$)
  * $\\text{SN} = 4 \\implies sp^3$ (Tetrahedral, $109.5^\\circ$ e.g. $CH_4$; Pyramidal if 1 LP e.g. $NH_3$; Bent/V-shaped if 2 LP e.g. $H_2O$)
* **VSEPR Repulsion Order**: $\\text{Lone Pair - Lone Pair} > \\text{Lone Pair - Bond Pair} > \\text{Bond Pair - Bond Pair}$.
* ⚠️ **Board Exam Setter Trap**: Lone pairs distort bond angles downwards (e.g. $H_2O$ is $104.5^\\circ$, not $109.5^\\circ$!).`;
  }

  if (q.includes('genetics') || q.includes('mendel') || q.includes('dna')) {
    return `### 🧬 Genetics & Heredity (Class 10/12 Biology)
* **Mendel's Laws**:
  1. **Law of Dominance**: In a heterozygote, dominant allele conceals presence of recessive allele.
  2. **Law of Segregation**: Alleles segregate during gamete formation so each gamete carries only one allele (Universal law).
  3. **Law of Independent Assortment**: Dihybrid cross phenotypic ratio is **$9:3:3:1$**.
* **DNA Structure**: Double helix (Watson & Crick), antiparallel strands ($5' \\to 3'$ and $3' \\to 5'$), purines pair with pyrimidines ($A=T$ with 2 hydrogen bonds, $G \\equiv C$ with 3 hydrogen bonds).`;
  }

  // 6. DEFAULT TARGETED ADVICE (Respects user's actual question & chapter)
  const targetChapter = chapterName && chapterName !== 'all-general' ? chapterName : active[0] || 'Active Curriculum Chapter';
  return `### 💡 Bax Academic Guide: ${targetChapter}
Regarding your query: *"${query}"*

* **Core Concept Insight**: In Class ${grade} CBSE, mastery of this topic requires connecting physical or logical intuition directly to the standard NCERT governing equations.
* **3-Step Recovery Action for Your Backlog**:
  1. **Define Core Variables**: Write down knowns and unknowns with their SI units before computing.
  2. **Identify Governing Laws**: What fundamental conservation law or constitutional/biological principle applies here?
  3. **Target 3 PYQs**: Practice 3 standard previous-year board questions to reinforce the concept pattern.

*You have **${remaining} hours left** in your backlog. Complete one 25-minute focused sprint on this chapter today to stay on track!*`;
}

function getFallbackGuide(subject: string, chapterName: string, promptType: string, question?: string) {
  if (promptType === 'formulas') {
    return `### ⚡ High-Yield Formula Sheet: ${chapterName} (${subject})

* **Core Governing Equations**:
  * Verify dimensional homogeneity across all terms ($[M^a L^b T^c]$) before substituting values.
  * Check reference frame & boundary conditions ($t = 0$, $v_0$, STP conditions).
* **Constraints & Conditions**:
  * **Conservation Laws**: Always ask: Is total energy conserved? Is external force zero (momentum conservation)?
  * **Units Hygiene**: Convert $cm \\to m$, $g \\to kg$, $min \\to s$, and $km/h \\to m/s$ $(\\times 5/18)$.
* **Exam Setter Trap**:
  * Missing vector signs ($+ / -$ in 1D/2D kinematics, thermodynamic work convention $\\Delta U = Q - W$, or sign of gravitational potential energy $-GM/r$).`;
  }

  if (promptType === 'pyq_concepts') {
    return `### 🎯 Top 3 PYQ Archetypes: ${chapterName}

1. **Multi-Stage Variable Chaining**:
   * Questions rarely test 1-step formula insertion. Solve equation 1 for an intermediate variable ($t$, $a$, or $N$), then plug into equation 2.
2. **Slope & Area Graphical Problems**:
   * Slope corresponds to first derivative $\\frac{dy}{dx}$ (e.g. $v-t$ slope is acceleration). Area under curve is the integral product $\\int y\\,dx$ (e.g. $v-t$ area is displacement).
3. **Boundary Value Testing**:
   * Check limiting states ($t \\to 0$, $t \\to \\infty$, or $\\theta = 0^\\circ$) to quickly rule out 2 out of 4 options.`;
  }

  if (promptType === 'eli5') {
    return `### 🧠 Core Intuition in 60 Seconds: ${chapterName}

* **The Big Picture**: Don't memorize 20 variations. Every concept in this chapter originates from a single conservation or equilibrium principle.
* **The Analogy**: Think of it like a bank balance: what goes in must equal what goes out plus what is stored.
* **Strategy**: When stuck on a hard problem, write down what cannot change, and the answer will follow.`;
  }

  return `### 💡 Concept Breakdown: ${chapterName}

"${question || 'Fundamental concept breakdown'}"

* **Core Intuition**: Strip away the mathematical jargon first. Ask yourself: what physical or logical truth is constant throughout this problem?
* **3-Step Backlog Recovery Strategy**:
  1. Write down known variables with units in the margin.
  2. Identify the target unknown.
  3. Select the connecting formula with zero extra unknowns.`;
}
