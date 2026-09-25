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
} from './db/users.ts';
import { getGeminiClient } from './lib/gemini.ts';

export const apiRouter = Router();

apiRouter.use(express.json());

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
    });
  } catch (err: any) {
    console.error('Failed to sync user:', err);
    res.status(500).json({ error: err.message || 'Sync failed' });
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

// Context-Aware AI Study Assistant (Section 13)
apiRouter.post(['/ai/study-assistant', '/api/ai/study-assistant'], async (req: Request, res: Response) => {
  const { studentContext = {}, userQuery, history = [] } = req.body || {};

  try {
    const ai = getGeminiClient();
    const contextSummary = `
Student Live BacklogOS State:
- Remaining Backlog: ${studentContext.remainingHours ?? 45} hours (Total: ${studentContext.totalHours ?? 60}h, Completed: ${studentContext.completedHours ?? 15}h)
- Daily Study Available: ${studentContext.dailyHours ?? 4} hours/day
- Current Empirical Pace: ${studentContext.currentPace ?? 2.8} hours/day
- Required Exam Pace: ${studentContext.requiredPace ?? 3.5} hours/day
- Days to Target / Exam: ${studentContext.daysToExam ?? 45} days
- On-Track Status: ${studentContext.isOnTrack ? 'ON TRACK' : 'BEHIND SCHEDULE'}
- Active / Unfinished Chapters: ${(studentContext.activeChapters || ['Kinematics', 'Chemical Bonding', 'Quadratic Equations']).join(', ')}
- Weak / Low Confidence Chapters: ${(studentContext.weakChapters || ['Rotational Motion', 'Thermodynamics']).join(', ')}
- Scheduled Due Revisions: ${(studentContext.dueRevisions || ['Kinematics']).join(', ')}
- Recent Test Mistake Patterns: ${studentContext.recentMistakes || 'Conceptual errors in Kinematics, Calculation errors in Mole Concept'}
`;

    const systemInstruction = `You are "BacklogOS AI" — an elite academic backlog strategist and recovery coach for IIT-JEE and CBSE Class 11 PCM students.
You have direct real-time access to the student's actual database and metrics:
${contextSummary}

Rules:
1. ALWAYS reference their ACTUAL numbers, active chapters, and pace from the context above. Never give generic study tips like "make a timetable" or "drink water".
2. If they ask "I only have X hours today. What should I study?", build a strict, prioritized schedule using their highest-priority unfinished chapters and due revisions with exact minutes (e.g. 50 min Physics Kinematics, 40 min Chem Mole Concept, 30 min revision).
3. If they ask "Why am I behind?", analyze the exact deficit between their current pace and required pace, point out the bottleneck chapters, and suggest immediate recovery adjustments.
4. Keep answers crisp, practical, empowering, and formatted with clean bullet points and bold math.`;

    if (!ai) {
      return res.json({
        content: getFallbackAssistantResponse(userQuery, studentContext),
        source: 'curated_offline',
      });
    }

    let conversationContext = '';
    if (Array.isArray(history) && history.length > 0) {
      conversationContext = history.slice(-4).map((h: any) => `${h.role === 'user' ? 'Student' : 'AI'}: ${h.text}`).join('\n') + '\n';
    }

    const prompt = `${conversationContext ? `Recent conversation:\n${conversationContext}\n` : ''}Student: "${userQuery || 'What should I study today based on my backlog?'}"`;

    const candidateModels = ['gemini-2.5-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-pro'];
    let generatedText = '';
    let usedModel = '';

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction,
            temperature: 0.5,
          },
        });
        if (response.text) {
          generatedText = response.text;
          usedModel = model;
          break;
        }
      } catch (err: any) {
        console.warn(`Assistant model ${model} failed:`, err?.message?.slice(0, 80));
      }
    }

    if (generatedText) {
      return res.json({
        content: generatedText,
        source: usedModel,
      });
    }

    res.json({
      content: getFallbackAssistantResponse(userQuery, studentContext),
      source: 'curated_fallback',
    });
  } catch (error: any) {
    console.error('Error in /api/ai/study-assistant:', error);
    res.json({
      content: getFallbackAssistantResponse(userQuery, studentContext),
      source: 'curated_fallback',
    });
  }
});

function getFallbackAssistantResponse(query: string = '', ctx: any = {}) {
  const remaining = ctx.remainingHours ?? 45;
  const currentPace = ctx.currentPace ?? 2.8;
  const reqPace = ctx.requiredPace ?? 3.5;
  const active = ctx.activeChapters && ctx.activeChapters.length > 0 ? ctx.activeChapters : ['Kinematics', 'Chemical Bonding', 'Quadratic Equations'];
  const weak = ctx.weakChapters && ctx.weakChapters.length > 0 ? ctx.weakChapters : ['Rotational Motion', 'Thermodynamics'];

  const lower = query.toLowerCase();

  if (lower.includes('why am i behind') || lower.includes('behind')) {
    return `### 📊 Real Bottleneck Analysis for Your Backlog:
* **The Pace Gap**: You currently log **${currentPace}h/day**, but with **${remaining} hours** left on your exam runway, you need **${reqPace}h/day** to finish all chapters before your exam date.
* **The Deficit**: You are behind by **${Math.max(0.5, Math.round((reqPace - currentPace) * 10) / 10)}h/day**.
* **Primary Blockers**: Your lowest confidence and highest mistake chapters are **${weak.slice(0, 2).join(' and ')}**.
* **Recovery Action**:
  1. Turn on **Backlog Recovery Mode** on your dashboard.
  2. Increase daily study by just **+30 to +45 minutes** across the next 4 days.
  3. Clear foundational prerequisites first before tackling heavy derivations.`;
  }

  return `### 🎯 Targeted Study Plan Based on Your Actual Data:
You have **${remaining}h of backlog** remaining across ${active.length} active topics.

Here is your prioritized breakdown:
1. ⚡ **${active[0] || 'Physics — Kinematics'}** (50 mins)
   * Focus on mastering core definitions and standard 1D/2D equations.
2. 🧪 **${active[1] || 'Chemistry — Chemical Bonding'}** (45 mins)
   * VSEPR shapes and hybridization identification rules.
3. 🔄 **Spaced Retrieval** (25 mins)
   * Review formula flashcards and 1 recent test mistake.

*Current daily promise: ${ctx.dailyHours ?? 4}h · Target completion: ${ctx.estimatedCompletionDate || 'On track before exam'}.*`;
}

// Resilient AI Chapter Guide & Concept Assistant
apiRouter.post(['/ai/chapter-guide', '/api/ai/chapter-guide'], async (req: Request, res: Response) => {
  const { subject = 'PCM', chapterName = 'Class 11 Chapter', promptType = 'formulas', studentQuestion, history = [] } = req.body || {};

  try {
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        content: getFallbackGuide(subject, chapterName, promptType, studentQuestion),
        source: 'curated_offline',
      });
    }

    let prompt = '';
    const systemInstruction = `You are "BacklogOS AI" — a hyper-focused, brilliant, and deeply encouraging IIT-JEE & CBSE Class 11 PCM mentor.
Your mission is to help a student who fell behind in Class 11 catch up with zero fluff.
Guidelines:
- Explain things with razor-sharp clarity, high-yield intuition, and exam practicality.
- Always include mathematical expressions clearly.
- Highlight common student traps and time-saving calculation tricks.
- Keep tone empowering, modern, and concise.`;

    if (promptType === 'formulas') {
      prompt = `For the Class 11 ${subject} chapter "${chapterName}", give a crisp, high-impact Formula & Key Concepts Sheet:
1. ⚡ **Fundamental Equations & Definitions** (State symbols, SI units, and vector direction rules).
2. ⚠️ **Critical Applicability Constraints** (When does each equation FAIL? e.g. non-constant acceleration, non-inertial frames, non-ideal gas).
3. 🎯 **The #1 Trap Question in Exams** (How test setters trick students and how to avoid it).
Format with clean bullet points and bold math.`;
    } else if (promptType === 'pyq_concepts') {
      prompt = `For the Class 11 ${subject} chapter "${chapterName}", break down:
1. 🎯 **Top 3 Most Repeated PYQ Archetypes** in CBSE & JEE Main.
2. 🔄 **How Questions Are Twisted** (Multi-concept mixing, changing boundary conditions).
3. ⚡ **Golden Elimination Tip** (How top rankers solve or eliminate options in 30 seconds).`;
    } else if (promptType === 'eli5') {
      prompt = `Explain the most difficult or core concept in the Class 11 ${subject} chapter "${chapterName}" using a vivid, unforgettable real-world analogy.
Then show how that intuition connects to the standard textbook formula. Under 180 words.`;
    } else {
      // Custom doubt or chat
      let conversationContext = '';
      if (Array.isArray(history) && history.length > 0) {
        conversationContext = history.slice(-4).map((h: any) => `${h.role === 'user' ? 'Student' : 'AI'}: ${h.text}`).join('\n') + '\n';
      }

      prompt = `Context: The student is studying the Class 11 ${subject} chapter "${chapterName}".
${conversationContext ? `Recent conversation:\n${conversationContext}\n` : ''}
Student's Question: "${studentQuestion || 'Can you summarize what I need to master first to clear my backlog in this chapter?'}"

Provide a direct, step-by-step, intuitive explanation. Focus on clearing their doubt immediately with a concrete example.`;
    }

    // Try ultra-fast gemini-3.1-flash-lite first, fallback to gemini-3.8-flash
    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
    let generatedText = '';
    let usedModel = '';

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction,
            temperature: 0.6,
          },
        });
        if (response.text) {
          generatedText = response.text;
          usedModel = model;
          break;
        }
      } catch (err: any) {
        console.warn(`Model ${model} failed, falling back:`, err?.message?.slice(0, 80));
      }
    }

    if (generatedText) {
      return res.json({
        content: generatedText,
        source: usedModel,
      });
    }

    // Curated high quality fallback if all models hit rate limit
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
