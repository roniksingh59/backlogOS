import { useState, useMemo } from 'react';
import {
  BookOpen,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Layers,
  FileText,
  HelpCircle,
  Play,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import {
  type EducationalResource,
  type AcademicResourceType,
} from '@/lib/resources/types';
import { getAttachedTaskResources } from '@/lib/resources/plan-resource-matcher';
import {
  isResourceSaved,
  toggleSaveResource,
  isResourceCompleted,
  markResourceCompleted,
} from '@/lib/resources/resource-service';
import { useToast } from '@/hooks/use-toast';

interface TaskAttachedResourcesProps {
  slot: {
    id: string;
    chapterId: string;
    chapterTitle: string;
    subject: string;
    kind: 'theory' | 'practice' | 'revision';
    durationMinutes: number;
    topic?: string;
    attachedResources?: EducationalResource[];
  };
  onOpenNotes?: (resource: EducationalResource) => void;
  onOpenVideo?: (resource: any) => void;
  onOpenMoreResources?: (chapterId: string, chapterTitle: string, subject: string) => void;
}

export function TaskAttachedResources({
  slot,
  onOpenNotes,
  onOpenVideo,
  onOpenMoreResources,
}: TaskAttachedResourcesProps) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(true);

  // Use pre-attached resources or resolve instantaneously
  const resources = useMemo(() => {
    if (slot.attachedResources && slot.attachedResources.length > 0) {
      return slot.attachedResources;
    }
    return getAttachedTaskResources(slot);
  }, [slot]);

  const handleAction = (resource: EducationalResource, e: React.MouseEvent) => {
    e.stopPropagation();

    if (resource.resourceType === 'notes' && resource.interactiveContent && onOpenNotes) {
      onOpenNotes(resource);
      return;
    }

    if (resource.resourceType === 'video' && onOpenVideo) {
      onOpenVideo(resource);
      return;
    }

    if (resource.url) {
      window.open(resource.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleToggleComplete = (resource: EducationalResource, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentlyDone = isResourceCompleted(resource.id);
    const next = !currentlyDone;
    markResourceCompleted(resource.id, next, {
      chapterId: slot.chapterId,
      chapterTitle: slot.chapterTitle,
      durationMinutes: resource.durationMinutes,
      resourceType: resource.resourceType,
      logStudySessionToBacklog: next,
    });
    toast({
      title: next ? 'Resource Completed! (+XP)' : 'Marked Incomplete',
      description: next ? `Logged towards ${slot.chapterTitle}.` : 'Status updated.',
    });
  };

  const handleToggleSave = (resource: EducationalResource, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextSaved = toggleSaveResource(resource, {
      chapterId: slot.chapterId,
      chapterTitle: slot.chapterTitle,
      subject: slot.subject,
    });
    toast({
      title: nextSaved ? 'Saved to Library' : 'Removed from Library',
      description: nextSaved ? 'Added to offline resources.' : 'Resource removed.',
    });
  };

  const getResourceTypeConfig = (type: AcademicResourceType) => {
    switch (type) {
      case 'textbook':
        return {
          label: 'Official Textbook',
          icon: BookOpen,
          badge: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300',
        };
      case 'solution':
        return {
          label: 'NCERT Solutions',
          icon: BookOpen,
          badge: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
        };
      case 'mindmap':
        return {
          label: 'Formula Mind Map',
          icon: Sparkles,
          badge: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300',
        };
      case 'notes':
        return {
          label: 'Concept Notes',
          icon: FileText,
          badge: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
        };
      case 'practice':
        return {
          label: 'Exemplar Practice',
          icon: HelpCircle,
          badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
        };
      case 'pyq':
        return {
          label: 'Board PYQs',
          icon: Layers,
          badge: 'border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300',
        };
      case 'revision':
        return {
          label: 'Revision Sheet',
          icon: Sparkles,
          badge: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300',
        };
      default:
        return {
          label: 'Video Lecture',
          icon: Play,
          badge: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
        };
    }
  };

  if (resources.length === 0) return null;

  return (
    <div className="mt-2.5 space-y-2 border-t border-border/50 pt-2.5" data-testid={`attached-resources-${slot.id}`}>
      {/* Mini header */}
      <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 hover:text-foreground transition font-medium"
        >
          {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          <span className="uppercase tracking-wider font-semibold text-foreground">
            Curated Study Material ({resources.length})
          </span>
        </button>

        {onOpenMoreResources && (
          <button
            type="button"
            onClick={() => onOpenMoreResources(slot.chapterId, slot.chapterTitle, slot.subject)}
            className="flex items-center gap-1 text-[11px] text-primary hover:underline hover:text-primary/90 font-bold transition"
          >
            <span>Explore all 15+ resources for this chapter</span>
            <ArrowUpRight size={12} />
          </button>
        )}
      </div>

      {/* Resource cards list */}
      {isExpanded && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 pt-0.5">
          {resources.map((res) => {
            const config = getResourceTypeConfig(res.resourceType);
            const Icon = config.icon;
            const isDone = isResourceCompleted(res.id);
            const isSaved = isResourceSaved(res.id);

            return (
              <div
                key={res.id}
                onClick={(e) => handleAction(res, e)}
                className={`group flex flex-col justify-between rounded-lg border p-2.5 text-xs transition cursor-pointer ${
                  isDone
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-border bg-card hover:border-primary/50 hover:bg-muted/30 shadow-2xs'
                }`}
                title={res.title}
              >
                <div>
                  {/* Badge & Provider */}
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase tracking-wider ${config.badge}`}
                    >
                      <Icon size={10} />
                      {config.label}
                    </span>

                    <span className="font-mono text-[10px] text-muted-foreground truncate">
                      {res.duration || `${res.durationMinutes}m`}
                    </span>
                  </div>

                  {/* Title */}
                  <h4 className="font-medium text-foreground text-xs leading-snug line-clamp-1 group-hover:text-primary transition-colors">
                    {res.title}
                  </h4>

                  {/* Provider & Reason */}
                  <p className="font-mono text-[10px] text-muted-foreground mt-0.5 truncate">
                    {res.provider}
                  </p>
                </div>

                {/* Bottom Actions */}
                <div className="mt-2.5 flex items-center justify-between border-t border-border/40 pt-1.5">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => handleToggleSave(res, e)}
                      className="p-1 text-muted-foreground hover:text-foreground transition rounded"
                      title={isSaved ? 'Saved in library' : 'Save resource'}
                    >
                      {isSaved ? (
                        <BookmarkCheck size={13} className="text-primary fill-primary" />
                      ) : (
                        <Bookmark size={13} />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleToggleComplete(res, e)}
                      className={`flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] font-medium transition ${
                        isDone
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                      title="Mark resource complete"
                    >
                      <CheckCircle2 size={11} className={isDone ? 'fill-emerald-500/20' : ''} />
                      <span>{isDone ? 'Done' : 'Done'}</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleAction(res, e)}
                    className="flex items-center gap-1 rounded bg-foreground text-background px-2 py-0.5 font-mono text-[10px] font-bold hover:bg-foreground/90 transition shadow-2xs"
                  >
                    <span>{res.actionLabel || 'Open'}</span>
                    <ExternalLink size={9} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
