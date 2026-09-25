import { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Loader2,
  Copy,
  Check,
  Minimize2,
  Brain,
  TrendingDown,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { chapters } from '@/lib/backlog-data';
import {
  readBacklogItems,
  readStudySessions,
  readPlan,
  readTestLogs,
  readSpacedRevisions,
} from '@/lib/storage';
import { calculateBacklogMetrics } from '@/lib/backlog-items';
import { calculateWillIFinish } from '@/lib/smart-planner';

interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  time: string;
}

export function AIFloatingCopilot() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedChapterId, setSelectedChapterId] = useState<string>(chapters[2]?.id || 'phy-vectors');
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: 'init',
      role: 'assistant',
      text: "👋 Hi! I'm **Bax**, your personal BacklogOS PCM assistant.\n\nI have live visibility into your actual backlog hours, exam runway, and test errors. Ask me:\n• *'I only have 2 hours today. What should I study?'*\n• *'Why am I behind?'*\n• Or pick any chapter below for formulas and PYQ traps!",
      time: 'Just now',
    },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedChapter = chapters.find((c) => c.id === selectedChapterId) || chapters[0];

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

    const studentContext = {
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

    // Determine whether to route to study-assistant or chapter-guide
    const lower = queryText.toLowerCase();
    const isBacklogQuery =
      lower.includes('study') ||
      lower.includes('behind') ||
      lower.includes('plan') ||
      lower.includes('today') ||
      lower.includes('pace') ||
      lower.includes('backlog') ||
      lower.includes('hours') ||
      lower.includes('finish') ||
      lower.includes('exam');

    const endpoint = isBacklogQuery ? '/api/ai/study-assistant' : '/api/ai/chapter-guide';
    const body = isBacklogQuery
      ? { studentContext, userQuery: queryText.trim(), history: nextHistory.map((m) => ({ role: m.role, text: m.text })) }
      : {
          subject: selectedChapter.subject,
          chapterName: selectedChapter.title,
          promptType: 'chat',
          studentQuestion: queryText.trim(),
          history: nextHistory.map((m) => ({ role: m.role, text: m.text })),
        };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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

      // Fallback
      setMessages((prev) => [
        ...prev,
        {
          id: 'ai_' + Date.now(),
          role: 'assistant',
          text: `### 🎯 Targeted Advice for Your Backlog:\nYou have **${metrics.remainingHours}h remaining** across ${activeChapters.length} active topics.\n\n* Focus on **${activeChapters[0] || 'your #1 priority chapter'}** first.\n* Solve 8 focused PYQs.\n* Current pace is **${finishAnalysis.currentPaceHoursPerDay}h/day**.`,
          time: 'Just now',
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: 'ai_' + Date.now(),
          role: 'assistant',
          text: `### 🎯 Targeted Advice for Your Backlog:\nYou have **${metrics.remainingHours}h remaining** across ${activeChapters.length} active topics.\n\n* Focus on **${activeChapters[0] || 'your #1 priority chapter'}** first.\n* Solve 8 focused PYQs.\n* Current pace is **${finishAnalysis.currentPaceHoursPerDay}h/day**.`,
          time: 'Just now',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Launcher Button - Disciplined Academic Utility */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded border border-border bg-foreground px-3 py-2 text-xs font-mono font-medium text-background shadow-md transition hover:bg-foreground/90"
          aria-label="Open Syllabus Assistant"
          data-testid="button-floating-bax"
        >
          <span className="grid h-4 w-4 place-items-center rounded bg-background/20 text-[10px] font-bold">
            ?
          </span>
          <span>Syllabus Advisor</span>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
        </button>
      )}

      {/* Floating Chat Drawer */}
      {isOpen && (
        <div className="fixed bottom-5 right-5 z-50 flex h-[520px] w-[92vw] max-w-[420px] flex-col overflow-hidden rounded border border-border bg-card shadow-xl transition-all animate-in fade-in">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-muted/30 px-3.5 py-2.5">
            <div className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded bg-foreground text-background font-mono text-[11px] font-bold">
                B/OS
              </span>
              <div>
                <h4 className="text-xs font-bold tracking-tight text-foreground flex items-center gap-1.5">
                  Syllabus Advisor (Bax)
                  <span className="rounded bg-muted px-1.5 py-0.2 text-[9px] font-mono text-muted-foreground uppercase">PCM Engine</span>
                </h4>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close Advisor"
            >
              <Minimize2 size={15} />
            </button>
          </div>

          {/* Chapter Selector Dropdown */}
          <div className="border-b border-border/40 bg-background/50 px-4 py-2 flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground shrink-0 font-medium">Chapter:</span>
            <select
              value={selectedChapterId}
              onChange={(e) => setSelectedChapterId(e.target.value)}
              className="w-full truncate rounded-lg border border-border/60 bg-muted/30 px-2 py-1 text-xs font-medium text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            >
              {chapters.map((ch) => (
                <option key={ch.id} value={ch.id} className="bg-card text-foreground">
                  [{ch.subject.slice(0, 4)}] {ch.title}
                </option>
              ))}
            </select>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-xl p-3 leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground font-medium rounded-tr-xs'
                      : 'border border-border/60 bg-muted/40 text-foreground rounded-tl-xs shadow-2xs'
                  }`}
                >
                  {m.role === 'assistant' && (
                    <div className="mb-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span className="font-semibold text-primary">BacklogOS AI</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(m.text, m.id)}
                        className="hover:text-foreground"
                      >
                        {copiedId === m.id ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                      </button>
                    </div>
                  )}
                  <div className="whitespace-pre-line font-sans">{m.text}</div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground p-2 rounded-lg bg-muted/40 max-w-xs animate-pulse">
                <Loader2 size={13} className="animate-spin text-primary" />
                <span>Analyzing your backlog & calculating plan...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Smart Prompts (Backlog + Chapter) */}
          <div className="flex items-center gap-1.5 overflow-x-auto border-t border-border/40 px-3 py-2 text-[11px]">
            <button
              type="button"
              onClick={() => handleSend("I only have 2 hours today. What should I study?")}
              className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-primary font-bold hover:bg-primary/20"
            >
              🎯 2h Plan Today
            </button>
            <button
              type="button"
              onClick={() => handleSend("Why am I behind? Analyze my pace vs exam runway.")}
              className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-amber-600 dark:text-amber-400 font-bold hover:bg-amber-500/20"
            >
              📊 Why am I behind?
            </button>
            <button
              type="button"
              onClick={() => handleSend(`What are the core formulas and variables in ${selectedChapter.title}?`)}
              className="shrink-0 rounded-full border border-border/60 bg-background/80 px-2.5 py-0.5 text-muted-foreground hover:border-primary hover:text-foreground"
            >
              ⚡ Formulas
            </button>
            <button
              type="button"
              onClick={() => handleSend(`What is the #1 trick question asked in ${selectedChapter.title}?`)}
              className="shrink-0 rounded-full border border-border/60 bg-background/80 px-2.5 py-0.5 text-muted-foreground hover:border-primary hover:text-foreground"
            >
              🎯 PYQ Trap
            </button>
          </div>

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(question);
            }}
            className="flex items-center gap-2 border-t border-border/60 bg-card p-3"
          >
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask Bax: e.g. 'What should I study today?'"
              className="h-9 text-xs rounded-xl bg-background"
            />
            <Button
              type="submit"
              size="sm"
              disabled={loading || !question.trim()}
              className="h-9 w-9 p-0 rounded-xl shrink-0 shadow-2xs"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
