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
