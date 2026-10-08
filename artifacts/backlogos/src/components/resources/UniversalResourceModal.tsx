import { useState } from 'react';
import {
  X,
  BookOpen,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  Bookmark,
  BookmarkCheck,
  Copy,
  Check,
  AlertTriangle,
  Lightbulb,
  Layers,
  HelpCircle,
  FileText,
  Clock,
  ShieldCheck,
  Compass,
} from 'lucide-react';
import { type EducationalResource } from '@/lib/resources/types';
import {
  isResourceSaved,
  toggleSaveResource,
  isResourceCompleted,
  markResourceCompleted,
} from '@/lib/resources/resource-service';
import { useToast } from '@/hooks/use-toast';

interface UniversalResourceModalProps {
  resource: EducationalResource | null;
  isOpen: boolean;
  onClose: () => void;
  onCompleted?: () => void;
}

export function UniversalResourceModal({
  resource,
  isOpen,
  onClose,
  onCompleted,
}: UniversalResourceModalProps) {
  const { toast } = useToast();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen || !resource) return null;

  const isSaved = isResourceSaved(resource.id);
  const isDone = isResourceCompleted(resource.id);
  const content = resource.interactiveContent;

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    toast({
      title: 'Copied to Clipboard',
      description: text,
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
      description: nextSaved ? 'Available offline for your study plan.' : 'Resource removed.',
    });
  };

  const handleToggleComplete = () => {
    const next = !isDone;
    markResourceCompleted(resource.id, next, {
      chapterId: resource.chapterId,
      chapterTitle: resource.chapterTitle,
      durationMinutes: resource.durationMinutes || 25,
      resourceType: resource.resourceType,
      logStudySessionToBacklog: next,
    });
    toast({
      title: next ? 'Resource Completed! (+XP)' : 'Marked Incomplete',
      description: next ? 'Study session logged towards your chapter recovery.' : 'Status updated.',
    });
    if (onCompleted) onCompleted();
  };

  const handleOpenExternal = () => {
    if (resource.url) {
      try {
        window.open(resource.url, '_blank', 'noopener,noreferrer');
      } catch (err) {
        // Fallback for sandboxed frames
        window.location.assign(resource.url);
      }
    }
  };

  // Type configuration
  const getTypeMeta = () => {
    switch (resource.resourceType) {
      case 'textbook':
        return {
          icon: BookOpen,
          badgeLabel: 'Official NCERT Digital Textbook',
          badgeColor: 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400',
          overviewTitle: 'NCERT Textbook Syllabus Scope',
          actionText: 'Open Official NCERT Digital Portal',
        };
      case 'solution':
        return {
          icon: BookOpen,
          badgeLabel: 'NCERT Step-by-Step Solutions',
          badgeColor: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
          overviewTitle: 'Exercise Solutions & Derivations Guide',
          actionText: 'Open Full Solutions Archive',
        };
      case 'practice':
        return {
          icon: HelpCircle,
          badgeLabel: 'NCERT Exemplar Problems & HOTS',
          badgeColor: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
          overviewTitle: 'Higher-Order Thinking & Problem Drill',
          actionText: 'Open Exemplar Portal',
        };
      case 'pyq':
        return {
          icon: Layers,
          badgeLabel: 'CBSE 10-Year Board PYQs',
          badgeColor: 'border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400',
          overviewTitle: 'Board Exam Pattern & Marking Scheme',
          actionText: 'Open Official CBSE Question Bank',
        };
      case 'revision':
        return {
          icon: Sparkles,
          badgeLabel: 'High-Density Rapid Recap',
          badgeColor: 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400',
          overviewTitle: '15-Minute Revision Blueprint',
          actionText: 'Review Quick Summary',
        };
      case 'notes':
      default:
        return {
          icon: FileText,
          badgeLabel: 'High-Yield NCERT Study Blueprint',
          badgeColor: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
          overviewTitle: 'Curriculum Core Concepts',
          actionText: 'Review Notes',
        };
    }
  };

  const typeMeta = getTypeMeta();
  const TypeIcon = typeMeta.icon;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-5 animate-in fade-in duration-200"
    >
      <div className="relative flex flex-col h-full max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border p-4 sm:p-6 bg-muted/20">
          <div className="space-y-1.5 pr-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-mono font-bold uppercase ${typeMeta.badgeColor}`}>
                <TypeIcon size={12} />
                {typeMeta.badgeLabel}
              </span>
              <span className="text-[11px] font-mono text-muted-foreground">
                {resource.subject} · {resource.duration || `${resource.durationMinutes} mins`}
              </span>
              {resource.isOfficial && (
                <span className="inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck size={11} />
                  CBSE 2026-27 Aligned
                </span>
              )}
            </div>

            <h2 className="font-display text-lg sm:text-2xl font-bold tracking-tight text-foreground">
              {resource.title}
            </h2>
            <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
              {resource.description || 'Verified academic study material curated for CBSE Classes 9-12 curriculum recovery.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition shrink-0"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-sm">
          {/* Executive Overview */}
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
            <div className="flex items-center justify-between font-mono text-xs font-bold text-foreground">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-primary" />
                <span className="uppercase">{typeMeta.overviewTitle}</span>
              </div>
              <span className="text-[11px] text-muted-foreground font-normal">
                Provider: {resource.provider}
              </span>
            </div>

            <p className="text-xs leading-relaxed text-muted-foreground">
              {content?.summary || resource.recommendationReason || resource.description}
            </p>

            {/* Direct Official Link Banner if URL exists */}
            {resource.url && (
              <div className="pt-2 flex items-center justify-between border-t border-border/60">
                <span className="text-[11px] font-mono text-muted-foreground">
                  Official resource source hosted at {resource.provider}
                </span>
                <button
                  type="button"
                  onClick={handleOpenExternal}
                  className="inline-flex items-center gap-1.5 rounded-md bg-foreground text-background px-3 py-1 text-xs font-mono font-bold hover:bg-foreground/90 transition shadow-2xs"
                >
                  <span>{typeMeta.actionText}</span>
                  <ExternalLink size={12} />
                </button>
              </div>
            )}
          </div>

          {/* Governing Formulas if present */}
          {content?.keyFormulas && content.keyFormulas.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-1.5">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                  Key Governing Formulas & Equations ({content.keyFormulas.length})
                </span>
                <span className="text-[11px] font-mono text-muted-foreground">Click equation to copy</span>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {content.keyFormulas.map((formula, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleCopy(formula, idx)}
                    className="group relative flex items-center justify-between rounded-lg border border-border bg-card p-3 hover:border-primary/50 hover:bg-muted/30 cursor-pointer transition"
                  >
                    <code className="font-mono text-xs font-bold text-foreground break-all">
                      {formula}
                    </code>
                    <button
                      type="button"
                      className="text-muted-foreground group-hover:text-primary transition shrink-0 ml-2"
                      title="Copy formula"
                    >
                      {copiedIndex === idx ? (
                        <Check size={14} className="text-emerald-500" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Core Tested Concepts / Subtopic Points */}
          {content?.coreConcepts && content.coreConcepts.length > 0 && (
            <div className="space-y-3">
              <div className="border-b border-border pb-1.5">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                  Core Examination Focus Points & Syllabus Subtopics
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

          {/* Common Exam Pitfall Alert */}
          {content?.trapNote && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-amber-800 dark:text-amber-200">
              <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-500" />
              <div className="space-y-1">
                <span className="font-mono text-xs font-bold uppercase tracking-wider block text-amber-700 dark:text-amber-300">
                  Examiner Warning: Common Board Pitfall
                </span>
                <p className="text-xs leading-relaxed">
                  {content.trapNote}
                </p>
              </div>
            </div>
          )}

          {/* Academic Session & Syllabus Alignment */}
          <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-3 text-[11px] text-muted-foreground font-mono">
            <Lightbulb size={14} className="shrink-0 text-amber-500" />
            <span>
              Directly mapped to CBSE 2026-27 Rationalized Textbook Curriculum. Deleted topics are excluded.
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
                  <span>Save to Library</span>
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
              <span>{isDone ? 'Completed' : 'Mark Completed (+XP)'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-3.5 py-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
