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
        };
      case 'solution':
        return {
          label: 'NCERT Solutions',
          icon: BookOpen,
        };
      case 'mindmap':
        return {
          label: 'Formula Mind Map',
          icon: Sparkles,
        };
      case 'notes':
        return {
          label: 'Concept Notes',
          icon: FileText,
        };
      case 'practice':
        return {
          label: 'Exemplar Practice',
          icon: HelpCircle,
        };
      case 'pyq':
        return {
          label: 'Board PYQs',
          icon: Layers,
        };
      case 'revision':
        return {
          label: 'Rapid Recap',
          icon: Sparkles,
        };
      default:
        return {
          label: 'Video Lecture',
          icon: Play,
        };
    }
  };

  if (resources.length === 0) return null;

  return (
    <div className="mt-2 space-y-1.5 border-t border-border/40 pt-2" data-testid={`attached-resources-${slot.id}`}>
      {/* Mini header */}
      <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 hover:text-foreground transition font-medium"
        >
          {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
          <span className="uppercase tracking-wider text-[10px] text-muted-foreground font-semibold">
            Study Materials ({resources.length})
          </span>
        </button>

        {onOpenMoreResources && (
          <button
            type="button"
            onClick={() => onOpenMoreResources(slot.chapterId, slot.chapterTitle, slot.subject)}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground hover:underline transition"
          >
            <span>All 15+ resources for {slot.chapterTitle}</span>
            <ArrowUpRight size={11} />
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
                className={`group flex flex-col justify-between rounded-md border p-2 text-xs transition cursor-pointer ${
                  isDone
                    ? 'border-border bg-muted/40 opacity-70'
                    : 'border-border bg-card hover:border-foreground/30 hover:bg-muted/20'
                }`}
                title={res.title}
              >
                <div>
                  {/* Badge & Duration */}
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground uppercase">
                      <Icon size={11} />
                      <span>{config.label}</span>
                    </span>

                    <span className="font-mono text-[10px] text-muted-foreground">
                      {res.duration || `${res.durationMinutes}m`}
                    </span>
                  </div>

                  {/* Title */}
                  <h4 className="font-medium text-foreground text-xs leading-snug line-clamp-1 group-hover:underline">
                    {res.title}
                  </h4>

                  {/* Provider */}
                  <p className="font-mono text-[10px] text-muted-foreground mt-0.5 truncate">
                    {res.provider}
                  </p>
                </div>

                {/* Bottom Actions */}
                <div className="mt-2 flex items-center justify-between border-t border-border/50 pt-1 text-[11px] font-mono">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => handleToggleSave(res, e)}
                      className="p-1 text-muted-foreground hover:text-foreground transition rounded"
                      title={isSaved ? 'Saved in library' : 'Save resource'}
                    >
                      {isSaved ? (
                        <BookmarkCheck size={12} className="text-foreground fill-foreground" />
                      ) : (
                        <Bookmark size={12} />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleToggleComplete(res, e)}
                      className={`flex items-center gap-1 rounded px-1.5 py-0.5 transition ${
                        isDone
                          ? 'text-foreground font-bold'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                      title="Mark resource complete"
                    >
                      <CheckCircle2 size={11} className={isDone ? 'text-foreground' : ''} />
                      <span>{isDone ? 'Done' : 'Mark'}</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleAction(res, e)}
                    className="flex items-center gap-1 rounded bg-foreground text-background px-2 py-0.5 text-[10px] font-bold hover:bg-foreground/90 transition shadow-2xs"
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
