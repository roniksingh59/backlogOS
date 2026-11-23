import { useEffect, useState } from 'react';
import { Check, BookOpenCheck } from 'lucide-react';

interface PlanGeneratingScreenProps {
  onComplete: () => void;
  minutesPerDay: number;
  subjectCount: number;
  chapterCount: number;
}

const STAGES = [
  { text: 'Ordering chapter prerequisites & NCERT foundations', pct: 25 },
  { text: 'Balancing daily study blocks across core subjects', pct: 55 },
  { text: 'Scheduling spaced formula recall checkpoints', pct: 85 },
  { text: 'Finalizing your recovery dashboard', pct: 100 },
];

export function PlanGeneratingScreen({
  onComplete,
  minutesPerDay,
  subjectCount,
  chapterCount,
}: PlanGeneratingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState(4);
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const totalMs = 3800;
    const intervalMs = 50;
    let elapsed = 0;

    const timer = setInterval(() => {
      elapsed += intervalMs;
      const currentPct = Math.min(100, Math.round((elapsed / totalMs) * 100));
      setProgress(currentPct);

      const remainingSec = Math.max(0, Math.ceil((totalMs - elapsed) / 1000));
      setTimeLeft(remainingSec);

      if (currentPct >= 85) {
        setStageIndex(3);
      } else if (currentPct >= 55) {
        setStageIndex(2);
      } else if (currentPct >= 25) {
        setStageIndex(1);
      } else {
        setStageIndex(0);
      }

      if (elapsed >= totalMs) {
        clearInterval(timer);
        setTimeout(() => {
          onComplete();
        }, 250);
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xl space-y-6">
        {/* Clean Editorial Study Illustration */}
        <div className="overflow-hidden rounded-xl border border-border bg-muted/20">
          <div className="relative h-44 w-full">
            <img
              src="/images/edtech_study_desk.jpg"
              alt="Organized CBSE study desk and schedule"
              className="h-full w-full object-cover object-center"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 via-slate-950/40 to-transparent px-4 py-3 flex items-center justify-between text-xs font-mono text-white">
              <span className="flex items-center gap-1.5 font-semibold">
                <BookOpenCheck size={14} className="text-emerald-400" />
                BacklogOS Recovery Engine
              </span>
              <span className="tabular-nums text-indigo-300 font-bold">
                {progress}% built
              </span>
            </div>
          </div>
        </div>

        {/* Title & Parameters */}
        <div className="text-center space-y-1.5">
          <h2 className="font-display text-2xl font-bold text-foreground tracking-tight">
            Building Your Study Roadmap
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
            Structuring <strong className="text-foreground">{chapterCount} chapters</strong> across{' '}
            <strong className="text-foreground">{subjectCount} subjects</strong> for{' '}
            <strong className="text-indigo-600 dark:text-indigo-400">{minutesPerDay} min/day</strong>.
          </p>
        </div>

        {/* Crisp Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono font-semibold text-muted-foreground tabular-nums">
            <span>Schedule Calibration</span>
            <span className="text-indigo-600 dark:text-indigo-400">
              {timeLeft > 0 ? `Ready in ${timeLeft}s` : 'Opening Workspace'}
            </span>
          </div>

          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-emerald-500 transition-all duration-100 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Active Stage Checklist */}
        <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2.5">
          {STAGES.map((st, idx) => {
            const isPast = idx < stageIndex;
            const isCurrent = idx === stageIndex;
            return (
              <div
                key={st.text}
                className={`flex items-center gap-2.5 text-xs ${
                  isPast
                    ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                    : isCurrent
                    ? 'text-foreground font-semibold'
                    : 'text-muted-foreground'
                }`}
              >
                <div
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-md text-[10px] font-mono ${
                    isPast
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      : isCurrent
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'border border-border text-muted-foreground'
                  }`}
                >
                  {isPast ? <Check size={11} strokeWidth={3} /> : idx + 1}
                </div>
                <span className="truncate">{st.text}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
