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

    const systemInstruction = `You are "Bax" — an intelligent, highly engaging, empathetic, and academically brilliant AI mentor for CBSE Class ${grade}${stream} students (Session ${session}).
You have live visibility into the student's actual registered curriculum, enrolled subjects (${enrolledSubjects}), active chapters, and backlog metrics:
${contextSummary}

Rules:
1. ALWAYS directly and intelligently answer the student's prompt.
2. If the student greets you (e.g. "hi", "hello", "hey Bax"), give a warm, energetic, and concise greeting welcoming them, acknowledging their Class ${grade} journey, and offering 3 actionable prompt suggestions (e.g. today's study plan, concept doubt, or revision).
3. If they ask a concept question or doubt (across Math, Science, Physics, Chemistry, Biology, SST, English, Hindi, CS, AI, Commerce), give a crystal-clear, step-by-step intuitive explanation with bold math/formulas, real-world analogies, and official NCERT syllabus accuracy.
4. If they ask "I have X hours today. What should I study?", build a strict, realistic schedule apportioning their highest-priority unfinished chapters and due revisions with exact minutes (e.g. 50 min Physics, 40 min Chem, 30 min Spaced Recall).
5. If they ask "Why am I behind?", analyze the exact deficit between their current pace and required pace, identify the bottleneck, and suggest 3 concrete recovery steps.
6. Keep formatting scannable and beautiful with clear bullet points, clean headings, and bold math expressions.`;

    const cleanQ = queryText.toLowerCase().trim();
    if (!cleanQ || cleanQ === 'hi' || cleanQ === 'hello' || cleanQ === 'hey' || cleanQ === 'sup' || cleanQ === 'yo' || cleanQ === 'hi bax' || cleanQ === 'hello bax' || cleanQ === 'hey bax' || cleanQ === 'who are you') {
      return res.json({
        content: getSmartBaxResponse(queryText, subject, chapterName, studentContext),
        source: 'bax_fast_mentor',
      });
    }

    if (!ai) {
      return res.json({
        content: getSmartBaxResponse(queryText, subject, chapterName, studentContext),
        source: 'curated_offline',
      });
    }

    let conversationContext = '';
    if (Array.isArray(history) && history.length > 0) {
      conversationContext = history.slice(-4).map((h: any) => `${h.role === 'user' ? 'Student' : 'Bax'}: ${h.text}`).join('\n') + '\n';
    }

    const prompt = `${conversationContext ? `Recent conversation:\n${conversationContext}\n` : ''}Student: "${queryText || 'What should I study today based on my backlog?'}"`;

    // Cascade: try ultra-fast gemini-3.1-flash-lite, then gemini-3.8-flash with timeout protection
    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
    let generatedText = '';
    let usedModel = '';

    let lastError = '';
    for (const model of candidateModels) {
      try {
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 6000));
        const geminiPromise = ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction,
            temperature: 0.6,
          },
        });
        const response: any = await Promise.race([geminiPromise, timeoutPromise]);
        if (response && response.text) {
          generatedText = response.text;
          usedModel = model;
          break;
        }
      } catch (err: any) {
        lastError = err?.message || String(err);
        console.warn(`[Bax Engine] Model ${model} failed:`, err?.message?.slice(0, 90));
      }
    }

    if (generatedText) {
      return res.json({
        content: generatedText,
        source: usedModel,
      });
    }

    // Heuristic intelligent fallback when models hit rate limit/quota
    res.json({
      content: getSmartBaxResponse(queryText, subject, chapterName, studentContext),
      source: 'smart_heuristic_knowledge_engine',
    });
  } catch (error: any) {
    console.error('Error in Bax endpoint:', error);
    res.json({
      content: getSmartBaxResponse(queryText, subject, chapterName, studentContext),
      source: 'smart_heuristic_knowledge_engine',
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

  // 4. MOTIVATION & EXAM ANXIETY ("stressed", "scared", "can't focus", "procrastinating", "lost")
  if (q.includes('stress') || q.includes('scared') || q.includes('focus') || q.includes('procrastinat') || q.includes('anxious') || q.includes('give up')) {
    return `### 🧠 Mental Reset: The Backlog Truth
Falling behind in Class ${grade} is completely normal — almost every top scorer has faced a 50+ hour backlog at some point.

The secret is **momentum over volume**:
* You do not need to study for 10 hours today. You just need **one solid 25-minute Pomodoro** on a single topic.
* Once you complete 1 topic, dopamine resets your focus and inertia disappears.
* Pick **${active[0] || 'one specific chapter'}**, set a 25-minute timer, put your phone in another room, and solve just 3 problems. You've got this!`;
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
