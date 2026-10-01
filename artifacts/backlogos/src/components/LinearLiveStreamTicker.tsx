import {
  CheckCircle2,
  RotateCcw,
  GitFork,
  Layers,
  TrendingDown,
  ShieldCheck,
  Bookmark,
  Flame,
  Sparkles,
} from 'lucide-react';

interface StreamEvent {
  id: string;
  icon: typeof CheckCircle2;
  iconColor: string;
  tag: string;
  title: string;
  subtitle: string;
  metric: string;
  time: string;
}

const STREAM_EVENTS: StreamEvent[] = [
  {
    id: 'e1',
    icon: CheckCircle2,
    iconColor: 'text-emerald-500',
    tag: 'PHYSICS · CLASS 11',
    title: 'Kinematics: 1D & 2D Motion',
    subtitle: 'Concept Learning & Derivations marked complete',
    metric: '-1.0h debt · +120 XP',
    time: '2m ago',
  },
  {
    id: 'e2',
    icon: RotateCcw,
    iconColor: 'text-sky-500',
    tag: 'RECOVERY ENGINE',
    title: 'Zero-Guilt Catch-up Auto-Applied',
    subtitle: 'Tuesday missed block redistributed (+20m across 6 buffer days)',
    metric: 'Exam Runway: Feb 24 (Protected)',
    time: '4m ago',
  },
  {
    id: 'e3',
    icon: GitFork,
    iconColor: 'text-purple-500',
    tag: 'PREREQUISITE ENGINE',
    title: 'Foundational Sequence Verified',
    subtitle: 'Vectors & Calculus mastered → Rotational Dynamics unlocked',
    metric: 'Circular Dependency Prevented',
    time: '7m ago',
  },
  {
    id: 'e4',
    icon: Layers,
    iconColor: 'text-amber-500',
    tag: 'SPACED ACTIVE RECALL',
    title: "Gauss's Law & Flux Derivation",
    subtitle: 'Active recall card reviewed at optimal forgetting curve decay',
    metric: 'Next review in 4 days',
    time: '11m ago',
  },
  {
    id: 'e5',
    icon: TrendingDown,
    iconColor: 'text-emerald-500',
    tag: 'MATHEMATICAL RUNWAY',
    title: 'Daily Velocity Recalculated',
    subtitle: 'Pace: 3.5h/day · Board exam completion locked with buffer',
    metric: '+6 days safety margin',
    time: '16m ago',
  },
  {
    id: 'e6',
    icon: Bookmark,
    iconColor: 'text-blue-500',
    tag: 'CURATED RESOURCES',
    title: 'NCERT High-Yield Lecture Linked',
    subtitle: 'Physics Galaxy 52m line-by-line breakdown attached to task',
    metric: 'Zero YouTube distraction',
    time: '22m ago',
  },
  {
    id: 'e7',
    icon: ShieldCheck,
    iconColor: 'text-emerald-500',
    tag: 'ANTI-GAMING ENGINE',
    title: 'Focus Sprint Verified',
    subtitle: '25-minute Pomodoro study sprint validated by telemetry',
    metric: '+150 Academic XP',
    time: '28m ago',
  },
  {
    id: 'e8',
    icon: Flame,
    iconColor: 'text-orange-500',
    tag: 'CONSISTENCY STREAK',
    title: '12-Day Recovery Streak',
    subtitle: 'Continuous daily syllabus clearance streak maintained',
    metric: 'Level 4 Syllabus Strategist',
    time: '35m ago',
  },
];

export function LinearLiveStreamTicker() {
  // We duplicate the list to ensure smooth infinite loop
  const duplicatedEvents = [...STREAM_EVENTS, ...STREAM_EVENTS];

  return (
    <div className="relative mx-auto max-w-5xl px-4 sm:px-6 pt-6 pb-2">
      {/* Container Frame with Linear aesthetic */}
      <div className="rounded-xl border border-border/80 bg-card/60 backdrop-blur-xs p-4 sm:p-5 shadow-sm">
        {/* Header Label */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-mono text-[11px] uppercase tracking-wider font-semibold text-foreground">
              Live Backlog Recovery Stream
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
            <span className="hidden sm:inline">Autonomous Pipeline</span>
            <span className="rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[9px] font-bold text-foreground">
              AUTOMATIC SLIDE
            </span>
          </div>
        </div>

        {/* Sliding Stream Window with Gradient Mask (Linear.app signature) */}
        <div className="relative h-[220px] sm:h-[240px] overflow-hidden mask-linear-vertical">
          <div className="animate-slide-up-continuous space-y-2.5">
            {duplicatedEvents.map((event, idx) => {
              const Icon = event.icon;
              return (
                <div
                  key={`${event.id}-${idx}`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-border/60 bg-background/80 p-3 text-xs transition-all duration-150 hover:border-foreground/30 hover:bg-muted/30 hover:shadow-2xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded border border-border/80 bg-card">
                      <Icon size={14} className={event.iconColor} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] uppercase text-muted-foreground tracking-wider">
                          {event.tag}
                        </span>
                        <span className="text-[10px] text-border">·</span>
                        <span className="font-semibold text-foreground truncate">
                          {event.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {event.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 font-mono text-[11px] shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-border/40">
                    <span className="text-foreground font-semibold px-2 py-0.5 rounded bg-muted/40 border border-border/50">
                      {event.metric}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {event.time}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom micro-bar */}
        <div className="pt-2 text-center text-[10px] font-mono text-muted-foreground flex items-center justify-center gap-1.5 opacity-70">
          <Sparkles size={11} />
          <span>Real-time mathematical scheduling · Hover any item to pause stream</span>
        </div>
      </div>
    </div>
  );
}
