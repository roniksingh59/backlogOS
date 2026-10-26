import { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Camera,
  Upload,
  Sparkles,
  Loader2,
  Check,
  Copy,
  AlertTriangle,
  FileQuestion,
  HelpCircle,
  BookmarkPlus,
  RefreshCw,
  Lightbulb,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Send,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { triggerTaskCelebration } from '@/lib/celebration';

interface AIDoubtPhotoSolverModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSubject?: string;
  defaultChapter?: string;
  onSendToBax?: (promptText: string) => void;
}

export function AIDoubtPhotoSolverModal({
  isOpen,
  onClose,
  defaultSubject = 'Physics',
  defaultChapter = '',
  onSendToBax,
}: AIDoubtPhotoSolverModalProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [subject, setSubject] = useState<string>(defaultSubject);
  const [chapter, setChapter] = useState<string>(defaultChapter);
  const [customQuestion, setCustomQuestion] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [solution, setSolution] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'solution' | 'summary' | 'practice'>('solution');

  // Listen for Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle Clipboard Paste (Ctrl+V / Cmd+V)
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            handleFileSelect(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File',
        description: 'Please upload an image (PNG, JPG, WEBP).',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Image should be under 10MB.',
        variant: 'destructive',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImagePreview(dataUrl);
      setImageBase64(dataUrl);
      setSolution(null);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleClearImage = () => {
    setImagePreview(null);
    setImageBase64(null);
    setSolution(null);
  };

  const handleSolve = async () => {
    if (!imageBase64 && !customQuestion.trim()) {
      toast({
        title: 'Missing Input',
        description: 'Please capture/upload a sum photo or type your question.',
      });
      return;
    }

    setLoading(true);
    setSolution(null);

    try {
      const res = await fetch('/api/ai/solve-doubt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageBase64,
          questionText: customQuestion.trim(),
          subject,
          chapter,
          grade: '11',
        }),
      });

      const data = await res.json();
      if (data && data.solution) {
        setSolution(data.solution);
        triggerTaskCelebration();
        toast({
          title: 'Problem Solved! 🎯',
          description: 'Step-by-step NCERT derivation & marking scheme ready.',
        });
      } else {
        throw new Error(data.error || 'Failed to solve');
      }
    } catch (err: any) {
      toast({
        title: 'Analysis Error',
        description: err.message || 'Could not analyze photo. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopySolution = () => {
    if (!solution) return;
    navigator.clipboard.writeText(solution);
    setCopied(true);
    toast({
      title: 'Solution Copied',
      description: 'Copied step-by-step derivation to clipboard.',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAskBaxMore = () => {
    if (!solution) return;
    const prompt = `I solved this sum with Bax Photo Solver:\n\n${solution.slice(0, 500)}...\n\nCan you explain the intuition behind this derivation and give me another exam trap question?`;
    if (onSendToBax) {
      onSendToBax(prompt);
      onClose();
    } else {
      window.dispatchEvent(
        new CustomEvent('open-bax-copilot', {
          detail: { initialPrompt: prompt },
        })
      );
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="doubt-solver-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-background/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl border border-sky-400/40 bg-card shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/80 bg-muted/30 px-4 py-3 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-sm">
              <Camera size={17} />
            </div>
            <div>
              <h3 id="doubt-solver-modal-title" className="text-sm font-bold text-foreground flex items-center gap-2">
                Bax AI Photo Doubt & Numerical Solver
                <span className="rounded-full bg-sky-500/10 border border-sky-500/30 px-2 py-0.2 text-[10px] font-mono text-sky-500 font-bold">
                  Vision + Marking Scheme
                </span>
              </h3>
              <p className="text-[11px] text-muted-foreground font-mono">
                Scan textbook or handwritten sums · Get NCERT derivations & examiner trap warnings
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
            aria-label="Close doubt solver"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {!solution ? (
            /* Upload / Capture Stage */
            <div className="space-y-4">
              {/* Photo Dropzone or Preview */}
              {!imagePreview ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-sky-400/40 hover:border-sky-400/80 bg-sky-500/5 hover:bg-sky-500/10 p-6 sm:p-8 text-center transition-all duration-200 cursor-pointer group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="relative mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-500/20 to-indigo-500/20 border border-sky-400/30 group-hover:scale-105 transition-transform">
                    <Camera size={26} className="text-sky-500" />
                    <Sparkles size={13} className="absolute -top-1 -right-1 text-amber-400 animate-pulse" />
                  </div>

                  <h4 className="text-sm font-bold text-foreground mb-1">
                    Upload or Snap a Photo of Your Question
                  </h4>
                  <p className="text-xs text-muted-foreground max-w-sm mb-4 leading-relaxed">
                    Take a picture of any textbook numerical, handwritten assignment sum, or past-year question paper.
                  </p>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 w-full max-w-sm">
                    <Button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        cameraInputRef.current?.click();
                      }}
                      className="gap-2 bg-gradient-to-r from-sky-500 to-indigo-600 text-white text-xs sm:text-xs font-semibold shadow-sm hover:from-sky-400 hover:to-indigo-500 min-h-[44px] justify-center touch-manipulation cursor-pointer flex-1"
                    >
                      <Camera size={16} />
                      <span>Take Photo / Camera</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="gap-2 text-xs sm:text-xs font-semibold border-border/80 min-h-[44px] justify-center touch-manipulation cursor-pointer flex-1"
                    >
                      <Upload size={16} />
                      <span>Choose File / Gallery</span>
                    </Button>
                  </div>

                  <span className="mt-3 text-[10px] font-mono text-muted-foreground/80">
                    Supports PNG, JPG, WEBP · Tip: You can also paste directly with <strong>Ctrl+V</strong>
                  </span>
                </div>
              ) : (
                /* Image Preview with Controls */
                <div className="relative rounded-2xl border border-border/80 overflow-hidden bg-black/5 dark:bg-black/20 p-2 sm:p-3 flex flex-col items-center">
                  <div className="relative max-h-64 sm:max-h-72 w-full flex items-center justify-center overflow-hidden rounded-xl bg-black/40">
                    <img
                      src={imagePreview}
                      alt="Question preview"
                      className="max-h-64 sm:max-h-72 w-auto object-contain rounded-lg shadow-md"
                    />
                    <button
                      type="button"
                      onClick={handleClearImage}
                      className="absolute top-2 right-2 rounded-full bg-black/70 hover:bg-black text-white p-2 sm:p-1.5 transition shadow-lg touch-manipulation"
                      title="Remove image"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="w-full flex items-center justify-between pt-2 px-1 text-[11px] font-mono text-muted-foreground">
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                      <Check size={12} /> Image Ready to Scan
                    </span>
                    <button
                      type="button"
                      onClick={handleClearImage}
                      className="text-muted-foreground hover:text-foreground underline transition py-1 px-2"
                    >
                      Change Photo
                    </button>
                  </div>
                </div>
              )}

              {/* Hidden file inputs */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                }}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                }}
              />

              {/* Subject & Details Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">
                    Subject Focus
                  </label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base sm:text-xs font-mono text-foreground focus:outline-hidden min-h-[44px] sm:min-h-[38px]"
                  >
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Biology">Biology</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">
                    Chapter Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={chapter}
                    onChange={(e) => setChapter(e.target.value)}
                    placeholder="e.g. Kinematics, Laws of Motion"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base sm:text-xs font-mono text-foreground focus:outline-hidden min-h-[44px] sm:min-h-[38px]"
                  />
                </div>
              </div>

              {/* Clarification or Typed Question Input */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1 font-mono">
                  Additional Question Details / Doubts (Optional)
                </label>
                <textarea
                  rows={2}
                  value={customQuestion}
                  onChange={(e) => setCustomQuestion(e.target.value)}
                  placeholder="e.g. 'Solve part (b) only' or 'Explain why the acceleration is negative in step 2'..."
                  className="w-full rounded-lg border border-border bg-background p-2.5 text-base sm:text-xs font-sans text-foreground focus:outline-hidden resize-none min-h-[56px]"
                />
              </div>

              {/* Action Button */}
              <Button
                type="button"
                onClick={handleSolve}
                disabled={loading || (!imageBase64 && !customQuestion.trim())}
                className="w-full gap-2 bg-gradient-to-r from-sky-500 via-indigo-600 to-sky-500 text-white font-bold py-3 min-h-[48px] rounded-xl shadow-md hover:shadow-sky-500/25 active:scale-98 transition cursor-pointer touch-manipulation text-sm sm:text-xs"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Bax Vision is Scanning & Solving...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Solve Sum with Bax Vision AI</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </Button>
            </div>
          ) : (
            /* Solution Stage */
            <div className="space-y-4">
              {/* Solution Banner */}
              <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-xs font-mono">
                  <ShieldCheck size={16} className="text-emerald-500" />
                  <span>Problem Solved with Official NCERT Rigor & Marking Scheme</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopySolution}
                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-background/80 hover:bg-background px-2.5 py-1 text-[11px] font-mono text-foreground transition"
                  >
                    {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSolution(null)}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-background/80 hover:bg-background px-2.5 py-1 text-[11px] font-mono text-muted-foreground hover:text-foreground transition"
                  >
                    <RefreshCw size={12} />
                    <span>New Sum</span>
                  </button>
                </div>
              </div>

              {/* Rendered Solution */}
              <div className="rounded-xl border border-border/80 bg-muted/15 p-4 sm:p-5 text-xs font-sans leading-relaxed space-y-3.5 max-h-[55vh] overflow-y-auto">
                {solution.split('\n').map((line, idx) => {
                  const trimmed = line.trim();
                  if (!trimmed) return <div key={idx} className="h-1" />;

                  if (trimmed.startsWith('### ')) {
                    return (
                      <h4
                        key={idx}
                        className="font-bold text-foreground text-xs pt-2 pb-1 border-b border-border/50 flex items-center gap-1.5"
                      >
                        {trimmed.replace(/^###\s+/, '')}
                      </h4>
                    );
                  }

                  if (trimmed.startsWith('⚠️') || trimmed.toLowerCase().includes('trap:')) {
                    return (
                      <div
                        key={idx}
                        className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-amber-800 dark:text-amber-200 font-medium text-[11px] flex items-start gap-2"
                      >
                        <AlertTriangle size={14} className="shrink-0 text-amber-500 mt-0.5" />
                        <span>{trimmed}</span>
                      </div>
                    );
                  }

                  if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
                    return (
                      <div key={idx} className="flex items-start gap-2 pl-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary/70 shrink-0 mt-1.5" />
                        <span className="text-foreground/90">{trimmed.replace(/^[\*\-]\s+/, '')}</span>
                      </div>
                    );
                  }

                  return (
                    <p key={idx} className="text-foreground/90 leading-relaxed">
                      {trimmed}
                    </p>
                  );
                })}
              </div>

              {/* Next Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSolution(null)}
                  className="gap-1.5 text-xs font-mono"
                >
                  <Camera size={13} />
                  <span>Scan Another Question</span>
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAskBaxMore}
                    className="gap-1.5 bg-foreground text-background text-xs font-semibold hover:opacity-90 transition"
                  >
                    <Send size={12} />
                    <span>Ask Bax a Follow-up Doubt</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
