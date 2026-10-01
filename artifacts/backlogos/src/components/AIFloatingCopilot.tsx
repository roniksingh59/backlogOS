import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Send,
  Loader2,
  Copy,
  Check,
  Minimize2,
  BookOpen,
  Calendar,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  readBacklogItems,
  readStudySessions,
  readPlan,
  readTestLogs,
  readSpacedRevisions,
} from '@/lib/storage';
import { calculateBacklogMetrics } from '@/lib/backlog-items';
import { calculateWillIFinish } from '@/lib/smart-planner';
import { readEducationProfile } from '@/lib/curriculum/user-profile-storage';
import { getAvailableSubjectsForGrade } from '@/lib/curriculum/registry';
import { getCurriculumChaptersByGrade, type CurriculumChapter } from '@/lib/curriculum/chapters-index';

interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  time: string;
}

export function AIFloatingCopilot() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedChapterId, setSelectedChapterId] = useState<string>('all-general');
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Student active education profile
  const profile = readEducationProfile();
  const grade = profile.grade || '11';

  // Load available chapters for the student's grade
  const gradeChapters = useMemo(() => {
    return getCurriculumChaptersByGrade(grade);
  }, [grade]);

  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: 'init',
      role: 'assistant',
      text: `👋 Hi! I'm **Bax**, your personal BacklogOS academic AI mentor for **CBSE Class ${grade}**.\n\nI have live visibility into your actual backlog hours, syllabus runway, and test performance. Ask me anything:\n• *"I only have 2 hours today. What should I study?"*\n• *"Why am I behind schedule?"*\n• *"Explain [any concept] simply"*\n• Or pick a chapter below for formulas and PYQ traps!`,
      time: 'Just now',
    },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedChapter = useMemo(() => {
    if (selectedChapterId === 'all-general') return null;
    return gradeChapters.find((c) => c.id === selectedChapterId) || null;
  }, [selectedChapterId, gradeChapters]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSend = async (queryText: string) => {
    if (!queryText.trim() || loading) return;

    const userMsg: ChatMsg = {
      id: 'usr_' + Date.now(),
      role: 'user',
      text: queryText.trim(),
      time: 'Just now',
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setQuestion('');
    setLoading(true);

    // Read live BacklogOS data
    const backlogItems = readBacklogItems();
    const sessions = readStudySessions();
    const plan = readPlan();
    const testLogs = readTestLogs();
    const revisions = readSpacedRevisions();

    const metrics = calculateBacklogMetrics(backlogItems, plan?.minutesPerDay ? plan.minutesPerDay / 60 : 3.5);
    const finishAnalysis = calculateWillIFinish(
      backlogItems,
      sessions,
      plan?.minutesPerDay ? plan.minutesPerDay / 60 : 3.5,
      plan?.examDate
    );

    const activeChapters = backlogItems
      .filter((i) => i.status !== 'completed')
      .map((i) => `${i.subject}: ${i.topic} (${i.estimatedHours}h, prio: ${i.examRelevance})`);

    const weakChapters = backlogItems
      .filter((i) => i.confidence === 'low' || i.difficulty === 'hard')
      .map((i) => i.topic);

    const dueRevs = revisions
      .filter((r) => r.status === 'due' || r.status === 'overdue')
      .map((r) => `${r.subject}: ${r.chapterTitle}`);

    const enrolledSubjects = profile.enrolledSubjectIds
      .map((id) => getAvailableSubjectsForGrade(profile.grade).find((s) => s.id === id)?.name)
      .filter(Boolean);

    const studentContext = {
      curriculum: profile.curriculum,
      academicSession: profile.academicSession,
      grade: profile.grade,
      stream: profile.stream,
      enrolledSubjects: enrolledSubjects.length > 0 ? enrolledSubjects : ['Core Subjects'],
      remainingHours: metrics.remainingHours,
      totalHours: metrics.totalBacklogHours,
      completedHours: metrics.completedHours,
      dailyHours: plan?.minutesPerDay ? Math.round((plan.minutesPerDay / 60) * 10) / 10 : 3.5,
      currentPace: finishAnalysis.currentPaceHoursPerDay,
      requiredPace: finishAnalysis.requiredPaceHoursPerDay,
      daysToExam: finishAnalysis.daysToExam,
      isOnTrack: finishAnalysis.isOnTrack,
      activeChapters: activeChapters.slice(0, 6),
      weakChapters: weakChapters.slice(0, 4),
      dueRevisions: dueRevs,
      estimatedCompletionDate: finishAnalysis.estimatedCompletionDate,
      recentMistakes: testLogs.length > 0 ? `Recent test: ${testLogs[0].testName}` : 'None logged',
    };

    const payload = {
      userQuery: queryText.trim(),
      subject: selectedChapter?.subjectName || 'All Subjects',
      chapterName: selectedChapter?.title || 'General Backlog Strategy',
      studentContext,
      history: nextHistory.map((m) => ({ role: m.role, text: m.text })),
    };

    try {
      const res = await fetch('/api/ai/bax', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.content) {
          setMessages((prev) => [
            ...prev,
            {
              id: 'ai_' + Date.now(),
              role: 'assistant',
              text: data.content,
              time: 'Just now',
            },
          ]);
          setLoading(false);
          return;
        }
      }

      // Intelligent Client Fallback if server unreachable
      const lower = queryText.toLowerCase();
      let fallbackContent = '';

      if (lower.includes('study') || lower.includes('hour') || lower.includes('plan') || lower.includes('today')) {
        fallbackContent = `### 🎯 Targeted Study Plan for Today:\nYou have **${metrics.remainingHours}h remaining** across your backlog.\n\n1. ⚡ **${activeChapters[0] || 'Primary Focus Topic'}** (50 mins)\n2. 🧪 **${activeChapters[1] || 'Secondary Core Topic'}** (40 mins)\n3. 🔄 **Spaced Retrieval** (25 mins)\n\n*Current pace: ${finishAnalysis.currentPaceHoursPerDay}h/day · Exam runway: ${finishAnalysis.daysToExam} days.*`;
      } else if (lower.includes('behind') || lower.includes('pace')) {
        fallbackContent = `### 📊 Real Bottleneck Analysis:\n* Current Pace: **${finishAnalysis.currentPaceHoursPerDay}h/day** vs Required: **${finishAnalysis.requiredPaceHoursPerDay}h/day**\n* Deficit: **${Math.max(0.4, Math.round((finishAnalysis.requiredPaceHoursPerDay - finishAnalysis.currentPaceHoursPerDay) * 10) / 10)}h/day**\n* Recommendation: Activate **Backlog Recovery Mode** and add +30 mins to today's study block.`;
      } else if (lower.includes('hi') || lower.includes('hello') || lower.includes('hey')) {
        fallbackContent = `👋 **Hey there!** I'm ready to help you with your Class ${grade} CBSE syllabus and backlog. Ask me for today's study plan, any concept explanation, or test error analysis!`;
      } else {
        fallbackContent = `### 💡 Academic Insight: ${selectedChapter?.title || 'Backlog Priority'}\nRegarding: *"${queryText}"*\n\n1. Review the core NCERT definitions and boundary conditions.\n2. Note standard formulas with SI units.\n3. Solve 3 representative previous-year problems to test retention.\n\n*You have ${metrics.remainingHours}h left in your backlog — 1 focused session today keeps you on track!*`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: 'ai_' + Date.now(),
          role: 'assistant',
          text: fallbackContent,
          time: 'Just now',
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: 'ai_' + Date.now(),
          role: 'assistant',
          text: `### 🎯 BacklogOS Recommendation:\nYou have **${metrics.remainingHours}h remaining** across active topics.\n\n* Tackle **${activeChapters[0] || 'your #1 priority chapter'}** next.\n* Complete one 25-minute Pomodoro sprint to maintain velocity.\n* Current study pace: **${finishAnalysis.currentPaceHoursPerDay}h/day**.`,
          time: 'Just now',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Launcher Button - Ask Bax */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="focus-ring fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-40 flex items-center gap-2 rounded-full sm:rounded-md border border-sky-400/40 bg-sky-500 hover:bg-sky-400 text-white px-3.5 py-2 sm:py-1.5 text-xs font-mono font-bold shadow-lg transition"
          aria-label="Open Ask Bax"
          data-testid="button-floating-bax"
        >
          <Sparkles size={14} />
          <span>Ask Bax</span>
        </button>
      )}

      {/* Floating Chat Drawer */}
      {isOpen && (
        <div className="fixed bottom-20 lg:bottom-6 right-3 sm:right-6 z-50 flex h-[min(540px,calc(100dvh-105px))] w-[calc(100vw-1.5rem)] sm:w-[92vw] max-w-[420px] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl transition-all animate-in fade-in zoom-in-95 font-sans">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-card px-3.5 py-2.5">
            <div className="flex items-center gap-2">
              <div className="grid h-6 w-6 place-items-center rounded border border-border bg-foreground text-background font-mono text-[11px] font-bold">
                B
              </div>
              <div>
                <h4 className="text-xs font-bold tracking-tight text-foreground flex items-center gap-1.5">
                  Ask Bax
                  <span className="rounded border border-border bg-muted/40 px-1 py-0.2 text-[9px] font-mono text-muted-foreground uppercase">
                    Class {grade}
                  </span>
                </h4>
                <p className="text-[10px] text-muted-foreground font-mono">Academic AI Strategist</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition"
              aria-label="Close Ask Bax"
            >
              <Minimize2 size={15} />
            </button>
          </div>

          {/* Chapter Selector Dropdown */}
          <div className="border-b border-border bg-muted/20 px-3 py-1.5 flex items-center gap-2 font-mono text-xs">
            <span className="text-[10px] text-muted-foreground shrink-0 uppercase">
              Topic:
            </span>
            <select
              value={selectedChapterId}
              onChange={(e) => setSelectedChapterId(e.target.value)}
              className="w-full truncate rounded border border-border bg-background px-2 py-1 text-xs font-mono text-foreground focus:outline-hidden"
            >
              <option value="all-general">
                [General / Any Topic / Study Plan]
              </option>
              {gradeChapters.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  [{ch.subjectName.slice(0, 10)}] {ch.title}
                </option>
              ))}
            </select>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs font-sans">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[90%] rounded-md p-2.5 leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-foreground text-background font-medium'
                      : 'border border-border bg-muted/20 text-foreground'
                  }`}
                >
                  {m.role === 'assistant' && (
                    <div className="mb-1 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                      <span className="font-bold text-foreground">Bax</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(m.text, m.id)}
                        className="hover:text-foreground p-0.5"
                        title="Copy answer"
                      >
                        {copiedId === m.id ? <Check size={11} className="text-foreground" /> : <Copy size={11} />}
                      </button>
                    </div>
                  )}
                  <div className="whitespace-pre-line text-xs">{m.text}</div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground p-2 rounded border border-border bg-muted/20 max-w-xs">
                <Loader2 size={12} className="animate-spin text-foreground" />
                <span>Computing recommendation...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Action Prompts */}
          <div className="flex items-center gap-1.5 overflow-x-auto border-t border-border px-3 py-1.5 text-[10px] font-mono bg-muted/15">
            <button
              type="button"
              onClick={() => handleSend("I only have 2 hours today. What should I study?")}
              className="shrink-0 rounded border border-border bg-card px-2 py-0.5 text-foreground hover:bg-muted transition"
            >
              2h Plan Today
            </button>
            <button
              type="button"
              onClick={() => handleSend("Why am I behind? Analyze my pace vs exam runway.")}
              className="shrink-0 rounded border border-border bg-card px-2 py-0.5 text-foreground hover:bg-muted transition"
            >
              Analyze Pace
            </button>
            <button
              type="button"
              onClick={() =>
                handleSend(
                  selectedChapter
                    ? `What are the core formulas and key traps in ${selectedChapter.title}?`
                    : "What are the most common traps and formulas in my current backlog?"
                )
              }
              className="shrink-0 rounded border border-border bg-card px-2 py-0.5 text-foreground hover:bg-muted transition"
            >
              Formulas & Traps
            </button>
          </div>

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(question);
            }}
            className="flex items-center gap-2 border-t border-border bg-card p-2.5 font-mono text-xs"
          >
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask Bax a doubt, plan inquiry, or formula..."
              className="h-8 text-xs rounded border border-border bg-background text-foreground"
            />
            <Button
              type="submit"
              size="sm"
              disabled={loading || !question.trim()}
              className="h-8 px-2.5 rounded bg-foreground text-background shrink-0"
              title="Send to Bax"
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
