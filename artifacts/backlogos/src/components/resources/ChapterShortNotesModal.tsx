import { useState, useMemo, useEffect } from 'react';
import {
  X,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Copy,
  Check,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  ExternalLink,
  Printer,
  Maximize2,
  Minimize2,
  Search,
  List,
  AlertTriangle,
  FileText,
  Clock,
  ShieldCheck,
  Flame,
  HelpCircle,
  Layers,
  ArrowRight,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  getChapterShortNotesBooklet,
  type ChapterShortNotesBooklet,
  type ShortNotesPage,
} from '@/lib/resources/chapter-short-notes-service';
import {
  isResourceSaved,
  toggleSaveResource,
  isResourceCompleted,
  markResourceCompleted,
} from '@/lib/resources/resource-service';
import { useToast } from '@/hooks/use-toast';

interface ChapterShortNotesModalProps {
  chapterId: string;
  chapterTitle?: string;
  subject?: string;
  grade?: string;
  initialPage?: number;
  isOpen: boolean;
  onClose: () => void;
  onCompleted?: () => void;
}

export function ChapterShortNotesModal({
  chapterId,
  chapterTitle = 'Chapter Notes',
  subject = 'Physics',
  grade = '11',
  initialPage = 1,
  isOpen,
  onClose,
  onCompleted,
}: ChapterShortNotesModalProps) {
  const { toast } = useToast();

  const booklet = useMemo(() => {
    return getChapterShortNotesBooklet(chapterId, chapterTitle, subject, grade);
  }, [chapterId, chapterTitle, subject, grade]);

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [showToc, setShowToc] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'compact'>('normal');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected quiz answers
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});

  const resourceId = `short-notes-booklet-${chapterId}`;
  const [isSaved, setIsSaved] = useState(() => isResourceSaved(resourceId));
  const [isDone, setIsDone] = useState(() => isResourceCompleted(resourceId));

  // Reset to initial page when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentPage(initialPage);
    }
  }, [isOpen, initialPage]);

  // Keyboard navigation (Arrow keys)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && currentPage < booklet.totalPages) {
        setCurrentPage((p) => p + 1);
      } else if (e.key === 'ArrowLeft' && currentPage > 1) {
        setCurrentPage((p) => p - 1);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentPage, booklet.totalPages, onClose]);

  if (!isOpen) return null;

  const page = booklet.pages[currentPage - 1] || booklet.pages[0];

  const handleCopyPage = () => {
    const text = `=== ${page.title} (Page ${page.pageNumber}/${booklet.totalPages}) ===\n${page.subtitle}\n\n${page.content.summary || ''}\n\n${
      page.content.bulletPoints?.join('\n') || ''
    }\n\n${
      page.content.sections
        ?.map((s) => `[${s.heading}]\n${s.content}\n${s.keyTakeaway ? `Tip: ${s.keyTakeaway}` : ''}`)
        .join('\n\n') || ''
    }\n\n${
      page.content.formulas
        ?.map((f) => `Formula: ${f.name} -> ${f.equation} (${f.units})`)
        .join('\n') || ''
    }`;

    navigator.clipboard.writeText(text);
    setCopiedText(true);
    toast({
      title: `Page ${currentPage} Copied to Clipboard`,
      description: 'You can paste into your study notes or markdown editor.',
    });
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleToggleSave = () => {
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);
    toast({
      title: nextSaved ? 'Booklet Saved to Study Library' : 'Removed from Library',
      description: nextSaved ? 'Available offline for rapid revision.' : 'Resource removed.',
    });
  };

  const handleToggleComplete = () => {
    const next = !isDone;
    markResourceCompleted(resourceId, next, {
      chapterId,
      chapterTitle,
      durationMinutes: booklet.estimatedReadMinutes,
      resourceType: 'notes',
      logStudySessionToBacklog: next,
    });
    setIsDone(next);
    toast({
      title: next ? '12-Page Notes Completed! (+30 XP)' : 'Marked Incomplete',
      description: next
        ? `Logged complete revision session for ${chapterTitle} into your daily study tracker.`
        : 'Status updated.',
    });
    if (onCompleted) onCompleted();
  };

  const handlePrint = () => {
    window.print();
  };

  const fontClass = {
    compact: 'text-xs leading-normal',
    normal: 'text-sm leading-relaxed',
    large: 'text-base leading-loose',
  }[fontSize];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[75] flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-200"
    >
      <div className="relative flex flex-col h-full max-h-[96vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* Top App Bar */}
        <div className="flex items-center justify-between border-b border-border px-4 sm:px-6 py-3 bg-muted/30">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold">
              <BookOpen size={16} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-primary font-bold">
                  PW · BYJU'S · VEDANTU CURATED NOTES
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">·</span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  CBSE Class {grade} {subject}
                </span>
              </div>
              <h2 className="font-display text-sm sm:text-base font-bold text-foreground line-clamp-1">
                {chapterTitle} — Complete 12-Page Revision Booklet
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {/* Table of Contents Toggle */}
            <button
              type="button"
              onClick={() => setShowToc((v) => !v)}
              className={`flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-mono transition ${
                showToc ? 'bg-primary text-primary-foreground font-bold' : 'bg-card text-muted-foreground hover:text-foreground'
              }`}
              title="Table of Contents (Jump to any page)"
            >
              <List size={14} />
              <span className="hidden sm:inline">Index</span>
            </button>

            {/* Font Size Selector */}
            <div className="hidden sm:flex items-center border border-border rounded-lg p-0.5 bg-card">
              <button
                type="button"
                onClick={() => setFontSize('compact')}
                className={`px-1.5 py-0.5 text-[10px] font-mono rounded ${fontSize === 'compact' ? 'bg-muted font-bold text-foreground' : 'text-muted-foreground'}`}
                title="Compact text"
              >
                A-
              </button>
              <button
                type="button"
                onClick={() => setFontSize('normal')}
                className={`px-1.5 py-0.5 text-[10px] font-mono rounded ${fontSize === 'normal' ? 'bg-muted font-bold text-foreground' : 'text-muted-foreground'}`}
                title="Normal text"
              >
                A
              </button>
              <button
                type="button"
                onClick={() => setFontSize('large')}
                className={`px-1.5 py-0.5 text-[10px] font-mono rounded ${fontSize === 'large' ? 'bg-muted font-bold text-foreground' : 'text-muted-foreground'}`}
                title="Large text"
              >
                A+
              </button>
            </div>

            {/* Copy Page */}
            <button
              type="button"
              onClick={handleCopyPage}
              className="rounded-lg border border-border bg-card p-1.5 text-muted-foreground hover:text-foreground transition"
              title="Copy Page Content"
            >
              {copiedText ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition ml-1"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Booklet Sub-header / Page Tabs Bar */}
        <div className="flex items-center justify-between border-b border-border px-4 sm:px-6 py-2 bg-muted/10 font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground">
              PAGE {page.pageNumber} OF {booklet.totalPages}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground line-clamp-1 text-[11px]">
              {page.title}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="flex items-center gap-1 rounded border border-border bg-card px-2 py-1 text-xs text-foreground disabled:opacity-40 disabled:pointer-events-none hover:bg-muted transition"
            >
              <ChevronLeft size={13} />
              <span className="hidden sm:inline">Prev Page</span>
            </button>

            <span className="px-1 text-muted-foreground font-bold">
              {currentPage} / {booklet.totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage >= booklet.totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="flex items-center gap-1 rounded border border-border bg-card px-2 py-1 text-xs text-foreground disabled:opacity-40 disabled:pointer-events-none hover:bg-muted transition"
            >
              <span className="hidden sm:inline">Next Page</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>

        {/* Main Body Area: Table of Contents Drawer + Page Content */}
        <div className="relative flex-1 overflow-hidden flex">
          {/* Table of Contents Sidebar / Dropdown */}
          {showToc && (
            <div className="absolute inset-y-0 left-0 z-20 w-72 sm:w-80 border-r border-border bg-card/95 backdrop-blur-md p-4 overflow-y-auto space-y-2 shadow-xl animate-in slide-in-from-left duration-200">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="font-mono text-xs font-bold text-foreground uppercase tracking-wider">
                  Booklet Table of Contents
                </span>
                <button
                  type="button"
                  onClick={() => setShowToc(false)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-1">
                {booklet.pages.map((p) => (
                  <button
                    key={p.pageNumber}
                    type="button"
                    onClick={() => {
                      setCurrentPage(p.pageNumber);
                      setShowToc(false);
                    }}
                    className={`w-full text-left rounded-lg p-2.5 transition text-xs flex items-start gap-2.5 ${
                      currentPage === p.pageNumber
                        ? 'bg-primary/10 border border-primary/30 text-primary font-bold'
                        : 'hover:bg-muted/60 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted font-mono text-[10px] font-bold">
                      {p.pageNumber}
                    </span>
                    <div className="space-y-0.5 min-w-0">
                      <p className="line-clamp-1 font-medium">{p.title}</p>
                      <p className="line-clamp-1 text-[10px] text-muted-foreground">{p.subtitle}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Active Page Sheet (Paper-style reading container) */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 max-w-4xl mx-auto">
            {/* Sheet Page Banner Header */}
            <div className="border-b-2 border-border/80 pb-4">
              <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground uppercase tracking-widest mb-1">
                <span>SECTION {page.pageNumber} · CBSE CLASS {grade} {subject}</span>
                <span>PW / BYJU'S / VEDANTU ACCREDITED SYLLABUS</span>
              </div>
              <h1 className="font-display text-xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {page.title}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-sans">
                {page.subtitle}
              </p>
            </div>

            {/* Page Summary */}
            {page.content.summary && (
              <div className="rounded-xl border border-border bg-muted/20 p-4 text-xs leading-relaxed text-muted-foreground">
                <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-foreground mb-1">
                  <Sparkles size={13} className="text-primary" />
                  <span>SECTION OBJECTIVE & EXAM RELEVANCE</span>
                </div>
                <p>{page.content.summary}</p>
              </div>
            )}

            {/* Bullet Points if present */}
            {page.content.bulletPoints && page.content.bulletPoints.length > 0 && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-primary block">
                  High-Yield Takeaways
                </span>
                <ul className="space-y-1.5">
                  {page.content.bulletPoints.map((bp, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-foreground">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <span>{bp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Sections (Definitions, Theory, Derivations, Graph explanation) */}
            {page.content.sections && page.content.sections.length > 0 && (
              <div className="space-y-4">
                {page.content.sections.map((sec, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-2.5 transition hover:border-border/80"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-sm sm:text-base font-bold text-foreground">
                        {sec.heading}
                      </h3>
                      {sec.subheading && (
                        <span className="rounded bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                          {sec.subheading}
                        </span>
                      )}
                    </div>

                    <p className={`text-muted-foreground whitespace-pre-line ${fontClass}`}>
                      {sec.content}
                    </p>

                    {sec.codeOrFormula && (
                      <div className="rounded-lg bg-muted/60 p-3 font-mono text-xs font-bold text-foreground break-all">
                        <code>{sec.codeOrFormula}</code>
                      </div>
                    )}

                    {sec.keyTakeaway && (
                      <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-xs text-primary">
                        <Flame size={14} className="shrink-0 mt-0.5" />
                        <span className="font-medium">{sec.keyTakeaway}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Master Formulas Table / Grid if present */}
            {page.content.formulas && page.content.formulas.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-1">
                  <span className="font-mono text-xs font-bold text-foreground uppercase tracking-wider">
                    Governing Equations ({page.content.formulas.length})
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    Click equation to copy
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {page.content.formulas.map((f, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        navigator.clipboard.writeText(f.equation);
                        toast({ title: 'Equation Copied', description: f.equation });
                      }}
                      className="group rounded-xl border border-border bg-card p-4 hover:border-primary/50 hover:bg-muted/30 cursor-pointer transition space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-display text-xs font-bold text-foreground">
                          {f.name}
                        </span>
                        <Copy size={13} className="text-muted-foreground group-hover:text-primary transition" />
                      </div>

                      <div className="rounded bg-muted/60 p-2 font-mono text-xs font-bold text-primary break-all">
                        {f.equation}
                      </div>

                      <div className="space-y-1 text-[11px] text-muted-foreground font-mono">
                        <p><strong>Parameters:</strong> {f.symbols}</p>
                        <p><strong>SI Units:</strong> {f.units}</p>
                        {f.dimensionalFormula && <p><strong>Dimensions:</strong> {f.dimensionalFormula}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Worked Problems (Page 6) */}
            {page.content.workedProblems && page.content.workedProblems.length > 0 && (
              <div className="space-y-4">
                {page.content.workedProblems.map((prob, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-border bg-card p-5 space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <span className="font-mono text-xs font-bold text-primary">
                        Solved Problem #{idx + 1}
                      </span>
                      <span className="rounded bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground font-bold">
                        {prob.marks}
                      </span>
                    </div>

                    <p className="font-display text-sm font-bold text-foreground">
                      {prob.question}
                    </p>

                    <div className="rounded-lg bg-muted/40 p-3 space-y-1.5 text-xs font-mono">
                      <p className="text-muted-foreground"><strong>Given:</strong> {prob.given}</p>
                      <p className="text-primary font-bold"><strong>Formula:</strong> {prob.formula}</p>
                    </div>

                    <div className="space-y-1 text-xs text-muted-foreground">
                      <span className="font-mono font-bold text-foreground block text-[11px]">
                        CBSE Step-by-Step Marking Solution:
                      </span>
                      <ul className="space-y-1 pl-2">
                        {prob.stepByStepSolution.map((s, sIdx) => (
                          <li key={sIdx} className="flex items-start gap-1.5">
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {prob.finalAnswer}
                    </div>

                    <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 text-xs text-amber-700 dark:text-amber-300 font-mono">
                      <AlertTriangle size={13} className="shrink-0 mt-0.5 text-amber-500" />
                      <span>{prob.examinerTip}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Board Traps (Page 8) */}
            {page.content.boardTraps && page.content.boardTraps.length > 0 && (
              <div className="space-y-3">
                {page.content.boardTraps.map((tr, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs space-y-2 text-amber-900 dark:text-amber-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold font-mono text-amber-700 dark:text-amber-300">
                        <AlertTriangle size={14} className="text-amber-500" />
                        <span>{tr.trapTitle}</span>
                      </div>
                      <span className="rounded bg-rose-500/10 px-2 py-0.5 text-[10px] font-mono text-rose-500 font-bold">
                        {tr.marksLost}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <p><strong className="text-rose-500">Common Student Error:</strong> {tr.commonMistake}</p>
                      <p><strong className="text-emerald-600 dark:text-emerald-400">Model Board Correction:</strong> {tr.correctApproach}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Past Year Questions (Page 9) */}
            {page.content.pyqQuestions && page.content.pyqQuestions.length > 0 && (
              <div className="space-y-3">
                {page.content.pyqQuestions.map((q, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-border bg-card p-4 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between border-b border-border pb-1.5">
                      <span className="font-mono text-[11px] font-bold text-primary">
                        {q.year} · {q.marks}
                      </span>
                    </div>

                    <p className="font-bold text-foreground">
                      {q.question}
                    </p>

                    <div className="rounded bg-muted/40 p-2.5 text-muted-foreground font-sans">
                      <strong>Model Answer:</strong> {q.modelAnswer}
                    </div>

                    <p className="text-[11px] font-mono text-muted-foreground">
                      <strong>Evaluator Rubric:</strong> {q.markingScheme}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* External Notes Sources Links (Page 11) */}
            {page.content.externalSources && page.content.externalSources.length > 0 && (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  {page.content.externalSources.map((src, idx) => (
                    <a
                      key={idx}
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex flex-col justify-between rounded-xl border border-border bg-card p-4 hover:border-primary/50 hover:bg-muted/30 transition"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-mono font-bold text-primary">
                            {src.badge}
                          </span>
                          <ExternalLink size={13} className="text-muted-foreground group-hover:text-primary transition" />
                        </div>
                        <h3 className="font-display text-sm font-bold text-foreground group-hover:text-primary transition">
                          {src.title}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {src.description}
                        </p>
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2 text-[11px] font-mono text-primary font-bold">
                        <span>Open on {src.provider}</span>
                        <ArrowRight size={12} className="group-hover:translate-x-0.5 transition" />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Active Recall Quiz (Page 12) */}
            {page.content.quickQuiz && page.content.quickQuiz.length > 0 && (
              <div className="space-y-4">
                {page.content.quickQuiz.map((quiz, qIdx) => {
                  const selected = quizAnswers[qIdx];
                  const hasAnswered = selected !== undefined;
                  const isCorrect = selected === quiz.correctIndex;

                  return (
                    <div
                      key={qIdx}
                      className="rounded-xl border border-border bg-card p-4 space-y-3"
                    >
                      <span className="font-mono text-xs font-bold text-primary">
                        Question #{qIdx + 1}
                      </span>
                      <p className="font-display text-sm font-bold text-foreground">
                        {quiz.question}
                      </p>

                      <div className="space-y-1.5">
                        {quiz.options.map((opt, optIdx) => {
                          const isOptSelected = selected === optIdx;
                          return (
                            <button
                              key={optIdx}
                              type="button"
                              onClick={() => setQuizAnswers((prev) => ({ ...prev, [qIdx]: optIdx }))}
                              className={`w-full text-left rounded-lg p-2.5 text-xs transition border ${
                                hasAnswered
                                  ? optIdx === quiz.correctIndex
                                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                                    : isOptSelected
                                    ? 'border-rose-500 bg-rose-500/10 text-rose-600'
                                    : 'border-border opacity-60'
                                  : isOptSelected
                                  ? 'border-primary bg-primary/10 text-primary font-bold'
                                  : 'border-border hover:bg-muted/50 text-foreground'
                              }`}
                            >
                              {String.fromCharCode(65 + optIdx)}. {opt}
                            </button>
                          );
                        })}
                      </div>

                      {hasAnswered && (
                        <div
                          className={`rounded-lg p-2.5 text-xs font-mono ${
                            isCorrect
                              ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          <p className="font-bold mb-0.5">{isCorrect ? '✓ Correct Answer!' : '✗ Incorrect'}</p>
                          <p className="text-[11px] text-muted-foreground">{quiz.explanation}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Pagination & Action Bar */}
        <div className="flex items-center justify-between border-t border-border px-4 sm:px-6 py-3 bg-card font-mono text-xs">
          {/* Left Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleSave}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-muted-foreground hover:text-foreground transition"
            >
              {isSaved ? (
                <>
                  <BookmarkCheck size={14} className="text-primary fill-primary" />
                  <span>Saved</span>
                </>
              ) : (
                <>
                  <Bookmark size={14} />
                  <span>Save Booklet</span>
                </>
              )}
            </button>
          </div>

          {/* Middle Page Dots */}
          <div className="hidden sm:flex items-center gap-1">
            {booklet.pages.map((p) => (
              <button
                key={p.pageNumber}
                type="button"
                onClick={() => setCurrentPage(p.pageNumber)}
                className={`h-2 rounded-full transition-all ${
                  currentPage === p.pageNumber
                    ? 'w-6 bg-primary'
                    : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/60'
                }`}
                title={`Jump to Page ${p.pageNumber}: ${p.title}`}
              />
            ))}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleComplete}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 font-bold transition ${
                isDone
                  ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-foreground text-background hover:bg-foreground/90'
              }`}
            >
              <CheckCircle2 size={14} className={isDone ? 'fill-emerald-500/20' : ''} />
              <span>{isDone ? 'Completed' : 'Mark Complete (+30 XP)'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-3 py-1.5 text-muted-foreground hover:text-foreground transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
