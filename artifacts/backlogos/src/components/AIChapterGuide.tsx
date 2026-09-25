import { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  BookOpen,
  Target,
  HelpCircle,
  Loader2,
  Send,
  Copy,
  Check,
  Zap,
  Lightbulb,
  AlertTriangle,
  RefreshCw,
  MessageSquare,
  BookmarkPlus,
  Compass,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AIChapterGuideProps {
  subject: string;
  chapterName: string;
  onInsertNote?: (text: string) => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  source?: string;
}

// Instant high-yield knowledge base per subject
const QUICK_PROMPTS = [
  { icon: Target, label: '3 Most Repeated PYQs', prompt: 'What are the top 3 most repeated question archetypes in this chapter?' },
  { icon: AlertTriangle, label: 'Exam Traps & Pitfalls', prompt: 'What are the common calculation and sign convention traps students make?' },
  { icon: Lightbulb, label: 'Explain with Analogy', prompt: 'Explain the core intuition of this chapter using a vivid real-world analogy.' },
  { icon: Zap, label: 'Derivation Shortcut', prompt: 'Show the most important formula derivation with key intermediate steps.' },
];

function getInstantCuratedKnowledge(subject: string, chapter: string, tab: string): string {
  if (tab === 'formulas') {
    return `### ⚡ High-Yield Formula Sheet: ${chapter} (${subject})

* **Core Governing Equations**:
  * Check dimensional equality across all terms ($[M^a L^b T^c]$) before computing.
  * Establish clear reference coordinates: assign $+x$ and $+y$ directions before writing vector equations.
  * Verify state conditions ($t = 0$, $v_0$, isothermal vs adiabatic, standard temperature & pressure STP).
* **Crucial Applicability Constraints**:
  * **Kinematics & Dynamics**: $v = u + at$ and $s = ut + \\frac{1}{2}at^2$ are valid **only for constant acceleration** $a = \\text{const}$. If $a = f(t)$ or $f(x)$, use calculus integration ($v = \\int a\\,dt$).
  * **Conservation of Momentum**: Valid **only if external net force** $\\sum \\vec{F}_{ext} = 0$.
  * **Conservation of Mechanical Energy**: Applies only when all non-conservative forces (friction, drag) do zero work ($W_{nc} = 0$).
* **Common Exam Setter Traps**:
  * Sign errors in work done: $W = \\vec{F} \\cdot \\vec{d} = F d \\cos\\theta$. Remember work is negative if force opposes displacement ($90^\\circ < \\theta \\le 180^\\circ$).
  * Missing conversion factors: $km/h \\to m/s$ requires multiplying by $5/18$. Grams to kilograms requires $\\times 10^{-3}$.`;
  }

  if (tab === 'pyq_concepts') {
    return `### 🎯 Top 3 PYQ Exam Archetypes: ${chapter}

1. **Multi-Stage Parameter Chaining**:
   * *Exam Pattern*: Examiners rarely test single-step direct substitution. You must compute an intermediate parameter (e.g. time $t$, normal force $N$, or moles $n$) from equation 1, then feed it into equation 2.
   * *Pro Tip*: Never combine numbers too early. Keep algebraic variables until the final step so terms can cancel cleanly.
2. **Graphical Interpretation (Slope vs. Area)**:
   * *Exam Pattern*: Slope represents the derivative $\\frac{dy}{dx}$ (e.g. slope of $x-t$ is velocity, slope of $v-t$ is acceleration).
   * *Exam Pattern*: Area under the curve represents the definite integral $\\int y\\,dx$ (e.g. area under $v-t$ is displacement $\\Delta x$, area under $F-x$ is work done).
3. **Limiting Cases & Extreme Boundary States**:
   * *Exam Pattern*: When facing multiple-choice questions with complicated variables, plug in $t \\to 0$, $t \\to \\infty$, or angle $\\theta = 0^\\circ$ or $90^\\circ$. This instantly eliminates 2 out of 4 options.`;
  }

  return `### 🧠 Core Intuition & Concept Breakdown: ${chapter}

* **The 1-Sentence Big Picture**:
  * Strip away the heavy jargon. In ${chapter}, nature is simply balancing an invariant quantity (energy, momentum, mass, or charge) against constraints.
* **Mastery Routine for Backlogs**:
  1. **Write down Given vs. Required**: Never solve in your head. List known variables with SI units in the left margin.
  2. **Select the Connecting Formula**: Pick the formula having the target unknown and no additional unmeasured variables.
  3. **Check Vector Signs**: Always assign one direction as positive and stick to it strictly until the problem finishes.`;
}

export function AIChapterGuide({ subject, chapterName, onInsertNote }: AIChapterGuideProps) {
  const [activeTab, setActiveTab] = useState<'formulas' | 'pyq_concepts' | 'chat'>('formulas');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load initial content for formulas/pyqs
  useEffect(() => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        text: `Hey! I'm your **BacklogOS AI Copilot** for **${chapterName}** (${subject}).\n\nAsk me any doubt, request a derivation shortcut, or tap any quick chip below to master this chapter with zero wasted time!`,
        timestamp: 'Just now',
        source: 'BacklogOS AI',
      },
    ]);
  }, [chapterName, subject]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const askAI = async (queryText: string) => {
    if (!queryText.trim() || loading) return;

    const userMsgId = 'user_' + Date.now();
    const newMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      text: queryText.trim(),
      timestamp: 'Just now',
    };

    const nextHistory = [...messages, newMsg];
    setMessages(nextHistory);
    setQuestion('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chapter-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject || 'PCM',
          chapterName: chapterName || 'Class 11 Chapter',
          promptType: 'chat',
          studentQuestion: queryText.trim(),
          history: nextHistory.map((m) => ({ role: m.role, text: m.text })),
        }),
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
              timestamp: 'Just now',
              source: data.source?.includes('gemini') ? 'Gemini 3.1 Flash' : 'Curated Study Engine',
            },
          ]);
          setLoading(false);
          setTimeout(scrollToBottom, 100);
          return;
        }
      }

      // Fallback
      setMessages((prev) => [
        ...prev,
        {
          id: 'ai_' + Date.now(),
          role: 'assistant',
          text: getInstantCuratedKnowledge(subject, chapterName, 'chat'),
          timestamp: 'Just now',
          source: 'Curated Study Engine',
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: 'ai_' + Date.now(),
          role: 'assistant',
          text: getInstantCuratedKnowledge(subject, chapterName, 'chat'),
          timestamp: 'Just now',
          source: 'Curated Study Engine',
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(scrollToBottom, 100);
    }
  };

  const handlePromptChip = (chipPrompt: string) => {
    setActiveTab('chat');
    askAI(chipPrompt);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/80 shadow-lg backdrop-blur-md transition-all">
      {/* Cool Neon Gradient Accent Bar */}
      <div className="h-1 w-full bg-gradient-to-r from-primary via-purple-500 to-accent animate-pulse" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 p-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 text-primary shadow-xs ring-1 ring-primary/30">
            <Sparkles size={20} className="animate-spin-slow" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-base font-bold tracking-tight text-foreground">
                AI Copilot
              </h3>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary border border-primary/20">
                Class 11 PCM
              </span>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              Focused on <span className="font-semibold text-foreground underline decoration-primary/40 underline-offset-2">{chapterName}</span>
              <span className="text-muted-foreground/60">•</span>
              <span className="text-[11px] text-emerald-400 font-medium">● Online</span>
            </p>
          </div>
        </div>

        {/* View Switchers */}
        <div className="flex items-center gap-1 rounded-xl bg-muted/60 p-1 border border-border/50 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('formulas')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition ${
              activeTab === 'formulas'
                ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <BookOpen size={14} />
            <span className="hidden sm:inline">Formula</span> Sheet
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pyq_concepts')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition ${
              activeTab === 'pyq_concepts'
                ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Target size={14} />
            <span className="hidden sm:inline">PYQ</span> Traps
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition ${
              activeTab === 'chat'
                ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <MessageSquare size={14} />
            Ask Doubts
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 sm:p-6">
        {activeTab === 'formulas' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Zap size={14} className="text-amber-400" /> Instant Key Formulas & Laws
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(getInstantCuratedKnowledge(subject, chapterName, 'formulas'), 'formulas')}
                  className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  {copiedId === 'formulas' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copiedId === 'formulas' ? 'Copied' : 'Copy'}</span>
                </Button>
                {onInsertNote && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onInsertNote(getInstantCuratedKnowledge(subject, chapterName, 'formulas'))}
                    className="h-8 gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/10"
                  >
                    <BookmarkPlus size={14} />
                    <span>Save to notes</span>
                  </Button>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-xs leading-relaxed text-foreground whitespace-pre-line font-sans shadow-inner">
              {getInstantCuratedKnowledge(subject, chapterName, 'formulas')}
            </div>

            {/* Quick Action to Ask Doubt about this */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-muted-foreground">Ask AI to expand:</span>
              <button
                type="button"
                onClick={() => handlePromptChip(`Derive the main formula in ${chapterName} step by step`)}
                className="rounded-lg border border-border/60 bg-background/80 px-2.5 py-1 text-xs text-foreground transition hover:border-primary hover:text-primary"
              >
                ⚡ Derive main formula
              </button>
              <button
                type="button"
                onClick={() => handlePromptChip(`Give me 1 challenging numerical problem for ${chapterName} with full solution`)}
                className="rounded-lg border border-border/60 bg-background/80 px-2.5 py-1 text-xs text-foreground transition hover:border-primary hover:text-primary"
              >
                📝 1 Practice numerical
              </button>
            </div>
          </div>
        )}

        {activeTab === 'pyq_concepts' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Target size={14} className="text-rose-400" /> High-Yield PYQ Question Archetypes
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(getInstantCuratedKnowledge(subject, chapterName, 'pyq_concepts'), 'pyqs')}
                  className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  {copiedId === 'pyqs' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copiedId === 'pyqs' ? 'Copied' : 'Copy'}</span>
                </Button>
                {onInsertNote && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onInsertNote(getInstantCuratedKnowledge(subject, chapterName, 'pyq_concepts'))}
                    className="h-8 gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/10"
                  >
                    <BookmarkPlus size={14} />
                    <span>Save to notes</span>
                  </Button>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-xs leading-relaxed text-foreground whitespace-pre-line font-sans shadow-inner">
              {getInstantCuratedKnowledge(subject, chapterName, 'pyq_concepts')}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-muted-foreground">Solve traps:</span>
              <button
                type="button"
                onClick={() => handlePromptChip(`Show me an actual past year question trap on ${chapterName} and how to avoid falling for it.`)}
                className="rounded-lg border border-border/60 bg-background/80 px-2.5 py-1 text-xs text-foreground transition hover:border-primary hover:text-primary"
              >
                ⚠️ Show tricky past question
              </button>
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="space-y-4">
            {/* Quick Prompt Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pb-2">
              {QUICK_PROMPTS.map((q) => {
                const Icon = q.icon;
                return (
                  <button
                    key={q.label}
                    type="button"
                    onClick={() => askAI(q.prompt)}
                    className="flex items-center gap-1.5 rounded-full border border-border/80 bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground transition hover:border-primary hover:bg-primary/10 hover:text-primary"
                  >
                    <Icon size={12} className="text-primary" />
                    <span>{q.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Chat Messages */}
            <div className="max-h-[360px] min-h-[220px] overflow-y-auto space-y-3 pr-1">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`group relative max-w-[90%] sm:max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-primary text-primary-foreground font-medium rounded-tr-xs shadow-md'
                        : 'border border-border/70 bg-muted/40 text-foreground rounded-tl-xs shadow-xs'
                    }`}
                  >
                    {/* Header info for assistant */}
                    {m.role === 'assistant' && (
                      <div className="mb-2 flex items-center justify-between gap-3 border-b border-border/40 pb-1.5 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1 font-semibold text-primary">
                          <Sparkles size={11} /> {m.source || 'BacklogOS AI'}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopy(m.text, m.id)}
                            className="hover:text-foreground flex items-center gap-1"
                            title="Copy message"
                          >
                            {copiedId === m.id ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                            <span>{copiedId === m.id ? 'Copied' : 'Copy'}</span>
                          </button>
                          {onInsertNote && (
                            <button
                              type="button"
                              onClick={() => onInsertNote(m.text)}
                              className="hover:text-primary flex items-center gap-1"
                              title="Save to chapter notes"
                            >
                              <BookmarkPlus size={11} />
                              <span>Save</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="whitespace-pre-line font-sans">{m.text}</div>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 rounded-xl bg-muted/30 border border-border/50 max-w-xs animate-pulse">
                  <Loader2 size={15} className="animate-spin text-primary" />
                  <span>AI Copilot is solving & formatting...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                askAI(question);
              }}
              className="relative flex items-center gap-2 pt-2"
            >
              <div className="relative flex-1">
                <Input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={`Ask anything about ${chapterName} (e.g. why is mechanical energy conserved?)...`}
                  className="h-10 pr-10 text-xs rounded-xl border-border/80 bg-background/90 focus-visible:ring-primary shadow-xs"
                />
              </div>
              <Button
                type="submit"
                size="sm"
                disabled={loading || !question.trim()}
                className="h-10 px-4 rounded-xl gap-1.5 shadow-md bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                <span className="hidden sm:inline">Ask</span>
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
