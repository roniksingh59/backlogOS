import { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  CheckCircle2,
  Bookmark,
  BookmarkCheck,
  Clock,
  Sparkles,
  AlertCircle,
  Play,
  RotateCcw,
} from 'lucide-react';
import { type YouTubeResource } from '@/lib/resources/types';
import {
  isResourceSaved,
  toggleSaveResource,
  isResourceCompleted,
  markResourceCompleted,
} from '@/lib/resources/resource-service';
import { useToast } from '@/hooks/use-toast';

interface YouTubePlayerModalProps {
  video: YouTubeResource | null;
  chapterId?: string;
  chapterTitle?: string;
  subject?: string;
  onClose: () => void;
  onSessionLogged?: (minutes: number) => void;
}

export function YouTubePlayerModal({
  video,
  chapterId,
  chapterTitle,
  subject,
  onClose,
  onSessionLogged,
}: YouTubePlayerModalProps) {
  const { toast } = useToast();
  const [saved, setSaved] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [embedError, setEmbedError] = useState(false);
  const [sessionLogged, setSessionLogged] = useState(false);

  useEffect(() => {
    if (!video) return;
    setSaved(isResourceSaved(video.id));
    setCompleted(isResourceCompleted(video.id));
    setEmbedError(false);
    setSessionLogged(false);

    // Escape key listener to close modal
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [video, onClose]);

  if (!video) return null;

  const durationMin = video.durationMinutes > 0 ? video.durationMinutes : 25;
  const officialYouTubeUrl = `https://www.youtube.com/watch?v=${video.id}`;
  // Use official YouTube embed domain with strict origin policies for Netlify and custom domains
  const embedUrl = `https://www.youtube.com/embed/${video.id}?autoplay=1&enablejsapi=1&rel=0`;

  const handleToggleSave = () => {
    const isNowSaved = toggleSaveResource(video, { chapterId, chapterTitle, subject });
    setSaved(isNowSaved);
    toast({
      title: isNowSaved ? 'Saved to Study Library' : 'Removed from Library',
      description: isNowSaved ? 'You can review this resource anytime.' : 'Resource removed.',
    });
  };

  const handleToggleComplete = () => {
    const nextCompleted = !completed;
    markResourceCompleted(video.id, nextCompleted, {
      chapterId,
      chapterTitle,
      durationMinutes: durationMin,
      logStudySessionToBacklog: nextCompleted && !sessionLogged,
    });
    setCompleted(nextCompleted);
    if (nextCompleted && !sessionLogged) {
      setSessionLogged(true);
      if (onSessionLogged) onSessionLogged(durationMin);
    }
    toast({
      title: nextCompleted ? 'Marked as Completed! 🎉' : 'Marked as Incomplete',
      description: nextCompleted
        ? `Logged ${durationMin}m study time to BacklogOS tracking.`
        : 'Status updated.',
    });
  };

  const handleLogSession = () => {
    markResourceCompleted(video.id, true, {
      chapterId,
      chapterTitle,
      durationMinutes: durationMin,
      logStudySessionToBacklog: true,
    });
    setCompleted(true);
    setSessionLogged(true);
    if (onSessionLogged) onSessionLogged(durationMin);
    toast({
      title: `Logged ${durationMin}m Study Block!`,
      description: 'Backlog metrics, study streak, and XP updated successfully.',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-200">
      <div
        className="relative flex flex-col w-full max-w-4xl max-h-[92vh] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="video-player-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 sm:px-5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              <span className="text-primary font-bold">{subject || 'Study Resource'}</span>
              {chapterTitle && (
                <>
                  <span>·</span>
                  <span className="truncate">{chapterTitle}</span>
                </>
              )}
              <span>·</span>
              <span className="rounded bg-muted px-1.5 py-0.5 text-foreground">{video.duration}</span>
            </div>
            <h2
              id="video-player-title"
              className="mt-0.5 truncate text-sm sm:text-base font-bold text-foreground"
              title={video.title}
            >
              {video.title}
            </h2>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <a
              href={officialYouTubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition"
              title="Open directly on YouTube"
            >
              <ExternalLink size={13} className="text-red-500" />
              <span className="hidden sm:inline">Watch on YouTube</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition"
              title="Close Player"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Video Player Container */}
        <div className="relative w-full bg-black aspect-video flex items-center justify-center">
          {!embedError ? (
            <iframe
              src={embedUrl}
              title={video.title}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              onError={() => setEmbedError(true)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center text-white max-w-md">
              <AlertCircle size={40} className="text-amber-400 mb-3" />
              <h3 className="font-bold text-base mb-1">Embedding Restricted by Video Owner</h3>
              <p className="text-xs text-white/70 mb-4">
                The creator of this video has configured playback permissions to only allow viewing directly on YouTube.
              </p>
              <a
                href={officialYouTubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2.5 text-xs font-bold text-white transition shadow-lg"
              >
                <Play size={14} />
                Watch on YouTube
              </a>
            </div>
          )}
        </div>

        {/* Fallback Direct Link Helper Bar */}
        <div className="bg-muted/40 border-b border-border px-4 py-1.5 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
          <span>Official NCERT Curriculum Lecture</span>
          <a
            href={officialYouTubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:underline flex items-center gap-1 font-semibold"
          >
            <span>Playback restricted? Open directly in YouTube</span>
            <ExternalLink size={10} />
          </a>
        </div>

        {/* Footer & Study Action Bar */}
        <div className="border-t border-border bg-card p-3 sm:p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground">{video.channel}</span>
                {video.relevanceLabel && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    <Sparkles size={10} />
                    {video.relevanceLabel}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Official YouTube Embed Player · BacklogOS Academic Progress Tracking
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleToggleSave}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  saved
                    ? 'border-primary/50 bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {saved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                <span>{saved ? 'Saved' : 'Save'}</span>
              </button>

              <button
                type="button"
                onClick={handleToggleComplete}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  completed
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <CheckCircle2 size={14} />
                <span>{completed ? 'Completed' : 'Mark Completed'}</span>
              </button>

              {!sessionLogged ? (
                <button
                  type="button"
                  onClick={handleLogSession}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 px-3.5 py-1.5 text-xs font-bold text-primary-foreground shadow-xs transition"
                >
                  <Clock size={14} />
                  <span>Log {durationMin}m to Backlog</span>
                </button>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={13} />
                  <span>{durationMin}m Logged</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
