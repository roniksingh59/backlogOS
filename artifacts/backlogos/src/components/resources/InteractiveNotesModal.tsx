import { useState } from 'react';
import {
  X,
  BookOpen,
  Sparkles,
  CheckCircle2,
  Bookmark,
  BookmarkCheck,
  Copy,
  Check,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';
import { type EducationalResource } from '@/lib/resources/types';
import {
  isResourceSaved,
  toggleSaveResource,
  isResourceCompleted,
  markResourceCompleted,
} from '@/lib/resources/resource-service';
import { useToast } from '@/hooks/use-toast';

interface InteractiveNotesModalProps {
  resource: EducationalResource | null;
  isOpen: boolean;
  onClose: () => void;
  onCompleted?: () => void;
}

export function InteractiveNotesModal({
  resource,
  isOpen,
  onClose,
  onCompleted,
}: InteractiveNotesModalProps) {
  const { toast } = useToast();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen || !resource) return null;

  const content = resource.interactiveContent;
  const isSaved = isResourceSaved(resource.id);
  const isDone = isResourceCompleted(resource.id);

  const handleCopyFormula = (formula: string, idx: number) => {
    navigator.clipboard.writeText(formula);
    setCopiedIndex(idx);
    toast({
      title: 'Formula Copied',
      description: formula,
    });
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleToggleSave = () => {
    const nextSaved = toggleSaveResource(resource, {
      chapterId: resource.chapterId,
      chapterTitle: resource.chapterTitle,
      subject: resource.subject,
    });
    toast({
      title: nextSaved ? 'Saved to Library' : 'Removed from Library',
      description: nextSaved ? 'Added to your offline notes collection.' : 'Resource removed.',
    });
  };

  const handleToggleComplete = () => {
    const next = !isDone;
    markResourceCompleted(resource.id, next, {
      chapterId: resource.chapterId,
      chapterTitle: resource.chapterTitle,
      durationMinutes: resource.durationMinutes || 15,
      resourceType: resource.resourceType,
      logStudySessionToBacklog: next,
    });
    toast({
      title: next ? 'Notes Completed! (+XP)' : 'Marked Incomplete',
      description: next ? 'Your review session was logged to your backlog.' : 'Status updated.',
    });
    if (onCompleted) onCompleted();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200"
    >
      <div className="relative flex flex-col max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border p-5 sm:p-6 bg-muted/20">
          <div className="space-y-1 pr-6">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-mono font-semibold text-primary">
                <BookOpen size={12} />
                High-Yield NCERT Concept Blueprint
              </span>
              <span className="text-[11px] font-mono text-muted-foreground">
                {resource.subject} · {resource.duration || '15 mins read'}
              </span>
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {resource.title}
            </h2>
            <p className="text-xs text-muted-foreground">
              Direct curriculum syllabus breakdown mapped to NCERT exercises and board exam marking schemes.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-sm">
          {/* Summary / Overview */}
          {content?.summary && (
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-foreground mb-1.5">
                <Sparkles size={14} className="text-primary" />
                <span>EXECUTIVE CONCEPT SUMMARY</span>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {content.summary}
              </p>
            </div>
          )}

          {/* Key Formulas Section */}
          {content?.keyFormulas && content.keyFormulas.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-1.5">
                <span className="font-mono text-xs font-bold tracking-wide uppercase text-foreground">
                  Formula Cheatsheet & Governing Equations ({content.keyFormulas.length})
                </span>
                <span className="text-[11px] font-mono text-muted-foreground">Click to copy</span>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {content.keyFormulas.map((formula, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleCopyFormula(formula, idx)}
                    className="group relative flex items-center justify-between rounded-lg border border-border bg-card p-3 hover:border-primary/50 hover:bg-muted/30 cursor-pointer transition"
                  >
                    <code className="font-mono text-xs font-bold text-foreground">
                      {formula}
                    </code>
                    <button
                      type="button"
                      className="text-muted-foreground group-hover:text-primary transition shrink-0 ml-2"
                      title="Copy formula"
                    >
                      {copiedIndex === idx ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Core Tested Concepts */}
          {content?.coreConcepts && content.coreConcepts.length > 0 && (
            <div className="space-y-3">
              <div className="border-b border-border pb-1.5">
                <span className="font-mono text-xs font-bold tracking-wide uppercase text-foreground">
                  Core Subtopics & Examination Focus Points
                </span>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {content.coreConcepts.map((concept, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 rounded-lg border border-border bg-card p-3"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-mono font-bold text-primary">
                      {idx + 1}
                    </span>
                    <span className="text-xs text-foreground font-medium leading-snug">
                      {concept}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Common Exam Trap Note */}
          {content?.trapNote && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-amber-700 dark:text-amber-300">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-mono text-xs font-bold uppercase tracking-wider block">
                  Common Board Exam Mistake Alert
                </span>
                <p className="text-xs leading-relaxed">
                  {content.trapNote}
                </p>
              </div>
            </div>
          )}

          {/* Academic Reminder */}
          <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-3 text-[11px] text-muted-foreground font-mono">
            <Lightbulb size={14} className="shrink-0 text-amber-500" />
            <span>
              Directly aligned with NCERT Rationalized Syllabus 2026-27. No non-examinable portions included.
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-border p-4 sm:p-5 bg-card">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleSave}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition"
            >
              {isSaved ? (
                <>
                  <BookmarkCheck size={14} className="text-primary fill-primary" />
                  <span>Saved</span>
                </>
              ) : (
                <>
                  <Bookmark size={14} />
                  <span>Save for Review</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleComplete}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-mono font-bold transition ${
                isDone
                  ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-foreground text-background hover:bg-foreground/90'
              }`}
            >
              <CheckCircle2 size={14} className={isDone ? 'fill-emerald-500/20' : ''} />
              <span>{isDone ? 'Completed' : 'Mark Notes Completed'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
