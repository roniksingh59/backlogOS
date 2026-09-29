import { useState, useEffect } from 'react';
import {
  BookOpen,
  FileText,
  HelpCircle,
  Clock,
  Sparkles,
  ExternalLink,
  Play,
  CheckCircle2,
  Bookmark,
  BookmarkCheck,
  ShieldCheck,
  Layers,
} from 'lucide-react';
import {
  type EducationalResource,
  type AcademicResourceType,
} from '@/lib/resources/types';
import {
  isResourceSaved,
  toggleSaveResource,
  isResourceCompleted,
  markResourceCompleted,
} from '@/lib/resources/resource-service';
import { useToast } from '@/hooks/use-toast';

interface EducationalResourceCardProps {
  resource: EducationalResource;
  onOpenNotes?: (resource: EducationalResource) => void;
  onOpenVideo?: (resource: EducationalResource) => void;
  onUpdate?: () => void;
  compact?: boolean;
}

export function EducationalResourceCard({
  resource,
  onOpenNotes,
  onOpenVideo,
  onUpdate,
  compact = false,
}: EducationalResourceCardProps) {
  const { toast } = useToast();
  const [saved, setSaved] = useState(() => isResourceSaved(resource.id));
  const [completed, setCompleted] = useState(() => isResourceCompleted(resource.id));

  useEffect(() => {
    const handler = () => {
      setSaved(isResourceSaved(resource.id));
      setCompleted(isResourceCompleted(resource.id));
    };
    window.addEventListener('backlogos-resources-updated', handler);
    return () => window.removeEventListener('backlogos-resources-updated', handler);
  }, [resource.id]);

  const handleToggleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextSaved = toggleSaveResource(resource, {
      chapterId: resource.chapterId,
      chapterTitle: resource.chapterTitle,
      subject: resource.subject,
    });
    setSaved(nextSaved);
    toast({
      title: nextSaved ? 'Saved to Study Library' : 'Removed from Library',
      description: nextSaved ? 'Available across all study sessions.' : 'Resource removed.',
    });
    if (onUpdate) onUpdate();
  };

  const handleToggleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !completed;
    markResourceCompleted(resource.id, next, {
      chapterId: resource.chapterId,
      chapterTitle: resource.chapterTitle,
      durationMinutes: resource.durationMinutes,
      resourceType: resource.resourceType,
      logStudySessionToBacklog: next,
    });
    setCompleted(next);
    toast({
      title: next ? 'Resource Completed! (+XP)' : 'Marked Incomplete',
      description: next
        ? `Logged ${resource.durationMinutes || 25}m towards chapter recovery.`
        : 'Status updated.',
    });
    if (onUpdate) onUpdate();
  };

  const handlePrimaryAction = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (resource.resourceType === 'notes' && resource.interactiveContent) {
      if (onOpenNotes) {
        onOpenNotes(resource);
        return;
      }
    }

    if (resource.resourceType === 'video' || resource.isEmbeddable) {
      if (onOpenVideo) {
        onOpenVideo(resource);
        return;
      }
    }

    if (resource.url) {
      window.open(resource.url, '_blank', 'noopener,noreferrer');
    }
  };

  const getTypeBadge = (type: AcademicResourceType) => {
    switch (type) {
      case 'textbook':
        return {
          label: 'Official Textbook',
          icon: BookOpen,
          badgeColor: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300',
        };
      case 'solution':
        return {
          label: 'NCERT Step-by-Step Solutions',
          icon: BookOpen,
          badgeColor: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
        };
      case 'mindmap':
        return {
          label: 'Formula Sheet & Mind Map',
          icon: Sparkles,
          badgeColor: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
        };
      case 'notes':
        return {
          label: 'NCERT High-Yield Notes',
          icon: FileText,
          badgeColor: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
        };
      case 'practice':
        return {
          label: 'NCERT Exemplar Problems',
          icon: HelpCircle,
          badgeColor: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
        };
      case 'pyq':
        return {
          label: 'CBSE Board PYQs',
          icon: Layers,
          badgeColor: 'border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300',
        };
      case 'revision':
        return {
          label: 'Rapid Revision',
          icon: Sparkles,
          badgeColor: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300',
        };
      case 'video':
      default:
        return {
          label: 'Concept Lecture',
          icon: Play,
          badgeColor: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
        };
    }
  };

  const typeConfig = getTypeBadge(resource.resourceType);
  const TypeIcon = typeConfig.icon;

  if (compact) {
    return (
      <div
        onClick={handlePrimaryAction}
        className={`group relative flex items-center justify-between gap-3 rounded-lg border p-3 text-xs transition cursor-pointer ${
          completed
            ? 'border-emerald-500/30 bg-emerald-500/5'
            : 'border-border bg-card hover:border-primary/40 hover:bg-muted/20'
        }`}
        data-testid={`resource-compact-${resource.id}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${typeConfig.badgeColor}`}
          >
            <TypeIcon size={14} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono text-[10px] uppercase font-bold text-muted-foreground">
                {typeConfig.label}
              </span>
              <span className="text-[10px] text-muted-foreground">·</span>
              <span className="font-mono text-[10px] text-muted-foreground truncate">
                {resource.duration || `${resource.durationMinutes}m`}
              </span>
            </div>
            <p className="truncate font-medium text-foreground text-xs leading-snug">
              {resource.title}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleToggleSave}
            className="p-1 text-muted-foreground hover:text-foreground transition rounded"
            title={saved ? 'Remove from library' : 'Save resource'}
          >
            {saved ? (
              <BookmarkCheck size={14} className="text-primary fill-primary" />
            ) : (
              <Bookmark size={14} />
            )}
          </button>

          <button
            type="button"
            onClick={handleToggleComplete}
            className={`flex items-center gap-1 rounded px-2 py-1 font-mono text-[11px] font-semibold transition ${
              completed
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
            title="Toggle completion"
          >
            <CheckCircle2 size={13} className={completed ? 'fill-emerald-500/20' : ''} />
            <span>{completed ? 'Done' : 'Mark'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrimaryAction}
            className="flex items-center gap-1 rounded bg-foreground text-background px-2.5 py-1 font-mono text-[11px] font-bold hover:bg-foreground/90 transition shadow-2xs"
          >
            <span>{resource.actionLabel || 'Open'}</span>
            <ExternalLink size={10} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handlePrimaryAction}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-xl border p-4 sm:p-5 transition cursor-pointer ${
        completed
          ? 'border-emerald-500/30 bg-emerald-500/5'
          : 'border-border bg-card hover:border-primary/50 hover:shadow-sm'
      }`}
      data-testid={`resource-card-${resource.id}`}
    >
      <div className="space-y-3">
        {/* Top Badges & Meta */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider ${typeConfig.badgeColor}`}
            >
              <TypeIcon size={11} />
              {typeConfig.label}
            </span>

            {resource.isOfficial && (
              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-mono font-medium text-emerald-700 dark:text-emerald-300">
                <ShieldCheck size={11} />
                Official NCERT / CBSE
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleToggleSave}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition"
              title={saved ? 'Saved in library' : 'Save resource'}
            >
              {saved ? (
                <BookmarkCheck size={15} className="text-primary fill-primary" />
              ) : (
                <Bookmark size={15} />
              )}
            </button>
          </div>
        </div>

        {/* Title */}
        <div>
          <h3 className="font-display text-base font-bold tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-2">
            {resource.title}
          </h3>
          <div className="mt-1 flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <span>{resource.provider}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {resource.duration || `${resource.durationMinutes} min`}
            </span>
            {resource.difficulty && (
              <>
                <span>•</span>
                <span className="capitalize">{resource.difficulty}</span>
              </>
            )}
          </div>
        </div>

        {/* Short description / summary */}
        {resource.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {resource.description}
          </p>
        )}

        {/* Objective Recommendation Reason */}
        {resource.recommendationReason && (
          <div className="flex items-start gap-1.5 rounded-lg border border-border/80 bg-muted/30 px-2.5 py-1.5 text-[11px] text-muted-foreground">
            <Sparkles size={12} className="shrink-0 mt-0.5 text-primary" />
            <span className="font-medium line-clamp-1">{resource.recommendationReason}</span>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="mt-4 flex items-center justify-between border-t border-border/80 pt-3">
        <button
          type="button"
          onClick={handleToggleComplete}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-mono font-medium transition ${
            completed
              ? 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <CheckCircle2 size={13} className={completed ? 'fill-emerald-500/20' : ''} />
          <span>{completed ? 'Completed' : 'Mark Complete'}</span>
        </button>

        <button
          type="button"
          onClick={handlePrimaryAction}
          className="flex items-center gap-1.5 rounded-lg bg-foreground text-background px-3 py-1.5 text-xs font-mono font-bold hover:bg-foreground/90 transition shadow-xs"
        >
          <span>{resource.actionLabel || 'Open Resource'}</span>
          <ExternalLink size={12} />
        </button>
      </div>
    </div>
  );
}
