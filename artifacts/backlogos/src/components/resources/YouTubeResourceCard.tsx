import { useState, useEffect } from 'react';
import {
  Play,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { type YouTubeResource } from '@/lib/resources/types';
import {
  isResourceSaved,
  toggleSaveResource,
  isResourceCompleted,
  markResourceCompleted,
} from '@/lib/resources/resource-service';
import { useToast } from '@/hooks/use-toast';

interface YouTubeResourceCardProps {
  video: YouTubeResource;
  chapterId?: string;
  chapterTitle?: string;
  subject?: string;
  onWatch: (video: YouTubeResource) => void;
  onUpdate?: () => void;
}

export function YouTubeResourceCard({
  video,
  chapterId,
  chapterTitle,
  subject,
  onWatch,
  onUpdate,
}: YouTubeResourceCardProps) {
  const { toast } = useToast();
  const [saved, setSaved] = useState(() => isResourceSaved(video.id));
  const [completed, setCompleted] = useState(() => isResourceCompleted(video.id));

  // Sync state if external update fires
  useEffect(() => {
    const handler = () => {
      setSaved(isResourceSaved(video.id));
      setCompleted(isResourceCompleted(video.id));
    };
    window.addEventListener('backlogos-resources-updated', handler);
    return () => window.removeEventListener('backlogos-resources-updated', handler);
  }, [video.id]);

  const handleToggleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    const isNowSaved = toggleSaveResource(video, { chapterId, chapterTitle, subject });
    setSaved(isNowSaved);
    toast({
      title: isNowSaved ? 'Saved to Study Library' : 'Removed from Library',
      description: isNowSaved ? 'Available in your study resources.' : 'Resource removed.',
    });
    if (onUpdate) onUpdate();
  };

  const handleToggleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !completed;
    markResourceCompleted(video.id, next, {
      chapterId,
      chapterTitle,
      durationMinutes: video.durationMinutes,
      logStudySessionToBacklog: next,
    });
    setCompleted(next);
    toast({
      title: next ? 'Completed!' : 'Marked Incomplete',
      description: next ? `Session logged (${video.durationMinutes || 25}m).` : 'Status updated.',
    });
    if (onUpdate) onUpdate();
  };

  const getResourceTypeBadge = (type: string) => {
    switch (type) {
      case 'oneshot':
        return { label: 'One-Shot', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30' };
      case 'pyq':
        return { label: 'PYQs & Practice', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' };
      case 'revision':
        return { label: 'Quick Revision', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' };
      case 'concept':
      default:
        return { label: 'Concept Foundation', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' };
    }
  };

  const typeBadge = getResourceTypeBadge(video.resourceType);

  return (
    <div
      onClick={() => onWatch(video)}
      className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all duration-200 cursor-pointer"
    >
      <div>
        {/* Video Thumbnail & Duration Overlay */}
        <div className="relative aspect-video w-full overflow-hidden bg-muted">
          <img
            src={video.thumbnail}
            alt={video.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              // Fallback to standard YouTube thumbnail if high-res fails
              (e.currentTarget as HTMLImageElement).src = `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;
            }}
          />

          {/* Dark gradient overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

          {/* Duration Badge */}
          {video.duration && (
            <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 font-mono text-[11px] font-bold text-white shadow-xs">
              {video.duration}
            </span>
          )}

          {/* Quick Play Overlay Icon */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/90 text-primary-foreground shadow-lg backdrop-blur-xs transition-transform group-hover:scale-110">
              <Play size={18} className="fill-current ml-0.5" />
            </div>
          </div>

          {/* Completed Check Badge */}
          {completed && (
            <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-emerald-600/90 backdrop-blur-xs px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
              <CheckCircle2 size={11} />
              <span>Studied</span>
            </span>
          )}

          {/* Language Badge */}
          {video.language && (
            <span className="absolute top-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white/90">
              {video.language}
            </span>
          )}
        </div>

        {/* Video Metadata Content */}
        <div className="p-3.5 space-y-2">
          {/* Resource Type & Relevance Label */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${typeBadge.color}`}
            >
              {typeBadge.label}
            </span>

            {video.relevanceLabel && (
              <span className="inline-flex items-center gap-1 rounded bg-muted/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground truncate max-w-[200px]">
                <Sparkles size={10} className="text-primary shrink-0" />
                <span className="truncate">{video.relevanceLabel}</span>
              </span>
            )}
          </div>

          {/* Video Title */}
          <h3
            className="text-xs sm:text-sm font-bold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors"
            title={video.title}
          >
            {video.title}
          </h3>

          {/* Channel Name & Stats */}
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="truncate font-medium text-foreground/80">{video.channel}</span>
            <div className="flex items-center gap-1.5 shrink-0 text-[10px]">
              {video.viewCount && <span>{video.viewCount}</span>}
              {video.publishedTime && (
                <>
                  <span>·</span>
                  <span>{video.publishedTime}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons Bar */}
      <div className="flex items-center justify-between border-t border-border/80 bg-muted/20 px-3 py-2 text-xs">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onWatch(video);
          }}
          className="inline-flex items-center gap-1.5 font-bold text-primary hover:underline"
        >
          <Play size={13} className="fill-current" />
          <span>Watch inside App</span>
        </button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleToggleSave}
            title={saved ? 'Remove from saved' : 'Save resource'}
            className={`rounded-lg p-1.5 transition ${
              saved
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {saved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
          </button>

          <button
            type="button"
            onClick={handleToggleComplete}
            title={completed ? 'Mark incomplete' : 'Mark completed'}
            className={`rounded-lg p-1.5 transition ${
              completed
                ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <CheckCircle2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
