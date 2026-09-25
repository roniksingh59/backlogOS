import { useEffect, useState } from 'react';
import { Sparkles, Check, Rocket } from 'lucide-react';
import studentRocketImg from '@/assets/images/student_on_rocket.jpg';

interface PlanGeneratingScreenProps {
  onComplete: () => void;
  minutesPerDay: number;
  subjectCount: number;
  chapterCount: number;
}

const STAGES = [
  { text: 'Scanning selected chapters & identifying prerequisites...', pct: 20 },
  { text: 'Optimizing daily study capacity & formula revisions...', pct: 50 },
  { text: 'Balancing concept mastery with target numericals...', pct: 80 },
  { text: 'Trajectory calibrated! Launching your 7-day roadmap...', pct: 100 },
];

export function PlanGeneratingScreen({
  onComplete,
  minutesPerDay,
  subjectCount,
  chapterCount,
}: PlanGeneratingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState(4); // 4 seconds total
  const [stageIndex, setStageIndex] = useState(0);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    // Total duration: 4000ms, tick every 50ms (80 steps)
    const totalMs = 4000;
    const intervalMs = 50;
    let elapsed = 0;

    const timer = setInterval(() => {
      elapsed += intervalMs;
      const currentPct = Math.min(100, Math.round((elapsed / totalMs) * 100));
      setProgress(currentPct);

      // Remaining seconds (rounded up)
      const remainingSec = Math.max(0, Math.ceil((totalMs - elapsed) / 1000));
      setTimeLeft(remainingSec);

      // Stage progression
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
        }, 300);
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#070a13]/95 backdrop-blur-xl p-4 overflow-y-auto animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg rounded-3xl border border-primary/30 bg-[#0d1322] p-6 sm:p-8 text-center shadow-2xl shadow-primary/20 overflow-hidden">
        {/* Ambient background glow */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-64 w-64 rounded-full bg-primary/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/2 -translate-x-1/2 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />

        {/* Character Illustration with Rocket */}
        <div className="relative mx-auto mb-6 flex items-center justify-center">
          <div className="relative h-48 w-48 sm:h-56 sm:w-56 rounded-2xl overflow-hidden border-2 border-primary/50 shadow-[0_0_40px_rgba(99,102,241,0.45)] bg-slate-900">
            {!imgError ? (
              <img
                src={studentRocketImg}
                alt="Nerdy student riding a rocket with study notes"
                onError={() => setImgError(true)}
                className="h-full w-full object-cover object-center transform transition-transform duration-500 hover:scale-105"
              />
            ) : (
              /* High-fidelity Vector Fallback if Image fails to load */
              <div className="h-full w-full bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-4 relative">
                {/* Floating Stars */}
                <span className="absolute top-3 left-4 text-yellow-300 text-xs animate-ping">✦</span>
                <span className="absolute top-8 right-6 text-cyan-300 text-sm">★</span>
                <span className="absolute bottom-10 left-6 text-violet-400 text-xs">✦</span>

                {/* Nerdy Student Head & Rocket Vector */}
                <div className="relative flex flex-col items-center">
                  {/* Glasses + Student Icon */}
                  <div className="relative">
                    <div className="text-5xl select-none">🧑‍🎓</div>
                    <div className="absolute -bottom-1 -right-2 text-2xl select-none">👓</div>
                  </div>
                  {/* Rocket */}
                  <div className="mt-1 flex items-center gap-1">
                    <Rocket className="text-cyan-400 rotate-45 transform drop-shadow-[0_0_12px_rgba(6,182,212,0.8)]" size={38} />
                  </div>
                  <span className="mt-2 text-[11px] font-bold text-cyan-300 tracking-wider font-mono">
                    NERDY STUDENT · LAUNCH
                  </span>
                </div>
              </div>
            )}

            {/* Bottom telemetry overlay bar */}
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] font-mono font-bold text-white bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/20">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Nerdy Pilot: Active
              </span>
              <span className="text-cyan-400 font-bold">v = {Math.round(progress * 28)} km/h</span>
            </div>
          </div>
        </div>

        {/* Badge & Title */}
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary mb-3">
          <Sparkles size={14} className="animate-spin text-accent" />
          <span>Building Your Custom 7-Day Plan</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Preparing For Liftoff! 🚀
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-slate-300 max-w-sm mx-auto font-medium">
          Structuring <span className="text-primary font-bold">{chapterCount} chapters</span> across <span className="text-primary font-bold">{subjectCount} subjects</span> for <span className="text-cyan-400 font-bold">{minutesPerDay} min/day</span>.
        </p>

        {/* Countdown & Progress bar */}
        <div className="mt-6">
          <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-200 mb-2">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Calibrating: {progress}%
            </span>
            <span className="rounded-md bg-primary/20 px-2 py-0.5 text-primary border border-primary/30">
              {timeLeft > 0 ? `Launch in ${timeLeft}s` : 'Launching!'}
            </span>
          </div>

          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800 p-0.5 border border-slate-700">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary via-cyan-400 to-emerald-400 transition-all duration-100 ease-out shadow-[0_0_15px_rgba(99,102,241,0.8)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Active Stage Indicator */}
        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 text-left">
          <div className="space-y-2">
            {STAGES.map((st, idx) => {
              const isPast = idx < stageIndex;
              const isCurrent = idx === stageIndex;
              return (
                <div
                  key={st.text}
                  className={`flex items-center gap-2.5 text-xs transition-opacity ${
                    isPast
                      ? 'text-emerald-400 font-medium'
                      : isCurrent
                      ? 'text-white font-bold animate-pulse'
                      : 'text-slate-500'
                  }`}
                >
                  <div
                    className={`grid h-4 w-4 shrink-0 place-items-center rounded-full text-[9px] ${
                      isPast
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : isCurrent
                        ? 'bg-primary text-white shadow-[0_0_8px_rgba(99,102,241,0.6)]'
                        : 'border border-slate-700 text-slate-600'
                    }`}
                  >
                    {isPast ? <Check size={10} strokeWidth={3} /> : idx + 1}
                  </div>
                  <span className="truncate">{st.text}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Student Status Ticker */}
        <div className="mt-6 flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-900/40 px-3.5 py-2">
          <span className="flex items-center gap-2 text-[11px] text-cyan-300 font-medium">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping shrink-0" />
            <span>Targeting high-yield concepts & active recall...</span>
          </span>
          <span className="text-[11px] font-mono text-slate-400 font-semibold">
            Zero Backlog Mission
          </span>
        </div>
      </div>
    </div>
  );
}

