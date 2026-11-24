import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { BellRing, ExternalLink, Pause, Play, RotateCcw, VolumeX, X } from 'lucide-react';
import { usePomodoroTimer } from '@/lib/pomodoro-context';

export function FloatingPomodoroWidget({ visible = true }: { visible?: boolean }) {
  const [location] = useLocation();
  const [expanded, setExpanded] = useState(false);

  const {
    duration,
    seconds,
    running,
    hasActiveOrPausedSession,
    selectedChapterId,
    selectedChapterTitle,
    selectedSubject,
    selectedTask,
    alarmActive,
    completedSummary,
    toggleRunning,
    reset,
    dismissAlarm,
    restartAfterAlarm,
  } = usePomodoroTimer();

  // Auto-open the control panel when timer finishes so user sees Stop Alarm immediately
  useEffect(() => {
    if (alarmActive) {
      setExpanded(true);
    }
  }, [alarmActive]);

  const isOnStudyPage = location === '/study';
  const shouldRender =
    visible &&
    !isOnStudyPage &&
    (hasActiveOrPausedSession || alarmActive);

  if (!shouldRender) return null;

  const totalSeconds = Math.max(1, duration * 60);
  const progressRatio = alarmActive
    ? 1
    : Math.max(0, Math.min(1, seconds / totalSeconds));

  const radius = 37;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progressRatio);

  const minutes = `${Math.floor(seconds / 60)}`.padStart(2, '0');
  const secs = `${seconds % 60}`.padStart(2, '0');

  const ringStrokeClass = alarmActive
    ? 'stroke-rose-600 dark:stroke-rose-400'
    : running
    ? 'stroke-indigo-600 dark:stroke-indigo-400'
    : 'stroke-amber-600 dark:stroke-amber-400';

  const statusText = alarmActive ? 'Time up' : running ? 'Focus' : 'Paused';

  return (
    <aside
      aria-label="Floating Pomodoro Timer"
      className="fixed bottom-20 left-4 lg:bottom-6 lg:left-6 z-40 flex flex-col items-start gap-2.5 font-sans"
      data-testid="floating-pomodoro-widget"
    >
      {/* Expandable Compact Controls Popover */}
      {expanded && (
        <div
          className="w-[272px] max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card/95 backdrop-blur-xl p-3.5 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-150"
          data-testid="card-floating-pomodoro-controls"
        >
          <div className="flex items-start justify-between gap-2 border-b border-border/80 pb-2.5">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
                <span className="font-semibold text-foreground/80">
                  {completedSummary?.subject || selectedSubject}
                </span>
                <span>·</span>
                <span>{completedSummary?.minutes || duration}m block</span>
              </div>
              <p className="mt-0.5 truncate text-xs font-semibold text-foreground">
                {completedSummary?.chapterTitle || selectedChapterTitle}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {completedSummary?.task || selectedTask}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              aria-label="Minimize timer controls"
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer shrink-0"
              data-testid="button-floating-minimize"
            >
              <X size={14} />
            </button>
          </div>

          {alarmActive ? (
            <div
              role="alert"
              aria-live="assertive"
              className="mt-3 space-y-2.5"
              data-testid="card-floating-pomodoro-alarm"
            >
              <div className="flex items-center gap-2 rounded-lg border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
                <BellRing size={15} className="shrink-0" />
                <span className="font-semibold">
                  Focus block complete! Session logged.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={dismissAlarm}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white px-3 py-2 text-xs font-semibold transition cursor-pointer whitespace-nowrap"
                  data-testid="button-floating-stop-alarm"
                >
                  <VolumeX size={13} />
                  <span>Stop Alarm</span>
                </button>
                <button
                  type="button"
                  onClick={restartAfterAlarm}
                  className="inline-flex items-center justify-center gap-1 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition cursor-pointer whitespace-nowrap"
                  data-testid="button-floating-restart"
                >
                  <Play size={12} className="fill-current" />
                  <span>Again</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-2xl font-bold tracking-tight text-foreground tabular-nums">
                  {minutes}:{secs}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={toggleRunning}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition cursor-pointer whitespace-nowrap ${
                      running
                        ? 'bg-amber-600 hover:bg-amber-500'
                        : 'bg-indigo-600 hover:bg-indigo-500'
                    }`}
                    data-testid="button-floating-toggle"
                  >
                    {running ? (
                      <>
                        <Pause size={12} />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <Play size={12} className="fill-current" />
                        <span>Resume</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={reset}
                    aria-label="Reset Pomodoro timer"
                    title="Reset timer"
                    className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
                    data-testid="button-floating-reset"
                  >
                    <RotateCcw size={13} />
                  </button>
                </div>
              </div>

              {!isOnStudyPage && (
                <Link
                  href={`/study?chapter=${encodeURIComponent(selectedChapterId)}`}
                  onClick={() => setExpanded(false)}
                  className="flex items-center justify-between rounded-lg border border-border bg-muted/35 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition"
                  data-testid="link-floating-open-study"
                >
                  <span className="truncate">Return to Learn &amp; Test</span>
                  <ExternalLink size={12} className="shrink-0 text-muted-foreground" />
                </Link>
              )}
            </div>
          )}
        </div>
      )}

      {/* Stopwatch / Circular Timer-Shaped Dial */}
      <div className="relative flex flex-col items-center">
        {/* Top Stopwatch Crown Lug */}
        <div
          aria-hidden="true"
          className={`h-1.5 w-5 rounded-t-md border border-b-0 ${
            alarmActive
              ? 'border-rose-500/60 bg-rose-500/20'
              : running
              ? 'border-indigo-500/50 bg-indigo-500/15'
              : 'border-border bg-muted'
          }`}
        />

        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-label={`Pomodoro timer ${minutes}:${secs} (${statusText}). Click to toggle controls.`}
          aria-expanded={expanded}
          data-alarm-active={alarmActive ? 'true' : 'false'}
          data-testid="button-floating-pomodoro-dial"
          className={`focus-ring group relative flex h-[86px] w-[86px] flex-col items-center justify-center rounded-full border bg-card/95 backdrop-blur-md shadow-lg transition-transform duration-150 hover:scale-105 cursor-pointer ${
            alarmActive
              ? 'border-rose-500/70 ring-4 ring-rose-500/20'
              : running
              ? 'border-indigo-500/45'
              : 'border-amber-500/45'
          }`}
        >
          <svg
            viewBox="0 0 86 86"
            className="pointer-events-none absolute inset-0 h-full w-full -rotate-90"
            aria-hidden="true"
          >
            <circle
              cx="43"
              cy="43"
              r={radius}
              fill="none"
              strokeWidth="4"
              className="stroke-muted/70"
            />
            <circle
              cx="43"
              cy="43"
              r={radius}
              fill="none"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className={`${ringStrokeClass} transition-[stroke-dashoffset] duration-500 ease-out`}
            />
          </svg>

          <span className="relative z-10 font-mono text-[16px] font-bold tracking-tight text-foreground tabular-nums leading-none">
            {alarmActive ? '00:00' : `${minutes}:${secs}`}
          </span>
          <span
            className={`relative z-10 mt-1 text-[10px] font-semibold tracking-tight leading-none ${
              alarmActive
                ? 'text-rose-600 dark:text-rose-400'
                : running
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-amber-700 dark:text-amber-300'
            }`}
          >
            {statusText}
          </span>
        </button>
      </div>
    </aside>
  );
}
