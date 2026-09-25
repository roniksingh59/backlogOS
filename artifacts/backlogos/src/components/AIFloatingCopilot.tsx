import { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Loader2,
  Copy,
  Check,
  Minimize2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { chapters } from '@/lib/backlog-data';

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
      text: "👋 Hi! I'm **Bax**, your personal Class 11 PCM study companion.\n\nSelect any chapter and ask me formulas, derivation breakdowns, PYQ traps, or tricky doubts anytime while you study.",
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

    try {
      const res = await fetch('/api/ai/chapter-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: selectedChapter.subject,
          chapterName: selectedChapter.title,
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
          text: `### 💡 Quick Breakdown for ${selectedChapter.title}:\n* Focus on master formulas: write given parameters with SI units first.\n* Solve with boundary cases ($t=0, v=0$) to eliminate traps.\n* Ask me to dive into any specific formula or derivation!`,
          time: 'Just now',
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: 'ai_' + Date.now(),
          role: 'assistant',
          text: `### 💡 Quick Breakdown for ${selectedChapter.title}:\n* Focus on master formulas: write given parameters with SI units first.\n* Solve with boundary cases ($t=0, v=0$) to eliminate traps.\n* Ask me to dive into any specific formula or derivation!`,
          time: 'Just now',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full border border-primary/40 bg-gradient-to-r from-primary via-indigo-600 to-purple-600 px-4 py-2.5 text-xs font-bold text-white shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-primary/40 glow-indigo"
          aria-label="Open Bax AI Study Assistant"
          data-testid="button-floating-bax"
        >
          <Sparkles size={15} className="animate-spin-slow text-amber-300" />
          <span>Ask Bax</span>
          <span className="flex h-2 w-2 rounded-full bg-emerald-400"></span>
        </button>
      )}

      {/* Floating Chat Drawer */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[520px] w-[92vw] max-w-[400px] flex-col overflow-hidden rounded-2xl border border-border/80 bg-card/95 shadow-2xl backdrop-blur-xl transition-all animate-in fade-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary border border-primary/30">
                <Sparkles size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold tracking-tight text-foreground flex items-center gap-1.5">
                  Bax · Study Assistant
                  <span className="rounded-full bg-primary/15 px-1.5 py-0.2 text-[9px] font-mono text-primary font-bold">PCM</span>
                </h4>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span> Ready to help
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close Bax Assistant"
            >
              <Minimize2 size={16} />
            </button>
          </div>

          {/* Chapter Selector Dropdown */}
          <div className="border-b border-border/40 bg-background/50 px-4 py-2 flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground shrink-0 font-medium">Chapter:</span>
            <select
              value={selectedChapterId}
              onChange={(e) => setSelectedChapterId(e.target.value)}
              className="w-full truncate rounded-lg border border-border/60 bg-muted/30 px-2 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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
                      : 'border border-border/60 bg-muted/40 text-foreground rounded-tl-xs shadow-xs'
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
                <span>Generating formula & explanation...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="flex items-center gap-1.5 overflow-x-auto border-t border-border/40 px-3 py-2 text-[11px]">
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
            <button
              type="button"
              onClick={() => handleSend(`Explain the core concept of ${selectedChapter.title} in 3 simple sentences.`)}
              className="shrink-0 rounded-full border border-border/60 bg-background/80 px-2.5 py-0.5 text-muted-foreground hover:border-primary hover:text-foreground"
            >
              🧠 Simple Summary
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
              placeholder="Ask Bax a doubt, formula or PYQ trap..."
              className="h-9 text-xs rounded-xl bg-background"
            />
            <Button
              type="submit"
              size="sm"
              disabled={loading || !question.trim()}
              className="h-9 w-9 p-0 rounded-xl shrink-0 shadow-xs"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
