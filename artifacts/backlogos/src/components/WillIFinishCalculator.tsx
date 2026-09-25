import { useState } from 'react';
import {
  CalendarDays,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Sliders,
  Flame,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { type BacklogItem } from '@/lib/backlog-items';
import { calculateWillIFinish } from '@/lib/smart-planner';
import type { StudySession } from '@/lib/storage';

interface WillIFinishCalculatorProps {
  backlogItems: BacklogItem[];
  sessions: StudySession[];
  defaultDailyHours?: number;
  examDateStr?: string;
  onOpenRecoveryMode?: () => void;
  onUpdateDailyPromise?: (hours: number) => void;
}

export function WillIFinishCalculator({
  backlogItems,
  sessions,
  defaultDailyHours = 3.5,
  examDateStr,
  onOpenRecoveryMode,
  onUpdateDailyPromise,
}: WillIFinishCalculatorProps) {
  const [simulatedHours, setSimulatedHours] = useState<number>(defaultDailyHours);
  const [isSimulating, setIsSimulating] = useState(false);

  const activeHours = isSimulating ? simulatedHours : defaultDailyHours;
  const analysis = calculateWillIFinish(
    backlogItems,
    sessions,
    activeHours,
    examDateStr
  );

  const statusColor = analysis.isOnTrack
    ? 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
    : analysis.statusCategory === 'critical_behind'
    ? 'text-rose-600 dark:text-rose-400 border-rose-500/30 bg-rose-500/10'
    : 'text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10';

  const statusLabel = analysis.isOnTrack
    ? 'ON TRACK'
    : analysis.statusCategory === 'critical_behind'
    ? 'CRITICALLY BEHIND'
    : 'AT RISK';

  return (
    <section
      className="border border-border bg-card p-5 sm:p-6"
      data-testid="widget-will-i-finish"
    >
      {/* Header with technical status indicator */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Runway Engine · "Will I Finish?"
            </span>
            <div className="flex items-center gap-2.5 mt-0.5">
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono font-bold border ${statusColor}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${analysis.isOnTrack ? 'bg-emerald-500' : analysis.statusCategory === 'critical_behind' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                {statusLabel}
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                {analysis.estimatedCompletionDate
                  ? `Estimated completion: ${analysis.estimatedCompletionDate}`
                  : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Action Button for behind state */}
        {!analysis.isOnTrack && onOpenRecoveryMode && (
          <button
            type="button"
            onClick={onOpenRecoveryMode}
            className="focus-ring flex items-center gap-1.5 rounded border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition"
            data-testid="button-open-recovery-from-calculator"
          >
            <span>Activate Recovery Mode</span>
            <ArrowRight size={13} />
          </button>
        )}
      </div>

      {/* Primary Metrics Grid - Technical Divided Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border-b border-border divide-y sm:divide-y-0 sm:divide-x divide-border">
        {/* Metric 1: Remaining Backlog */}
        <div className="py-4 sm:px-4 first:sm:pl-0">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
            Remaining Backlog
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-mono text-3xl font-bold tracking-tight text-foreground">
              {analysis.remainingBacklogHours}
            </span>
            <span className="text-xs font-mono text-muted-foreground">hours</span>
          </div>
          <span className="text-[11px] text-muted-foreground block mt-0.5">
            {backlogItems.filter((i) => i.status !== 'completed').length} active chapters
          </span>
        </div>

        {/* Metric 2: Required Pace */}
        <div className="py-4 px-4">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
            Required Pace
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-mono text-3xl font-bold tracking-tight text-foreground">
              {analysis.requiredPaceHoursPerDay}
            </span>
            <span className="text-xs font-mono text-muted-foreground">h / day</span>
          </div>
          <span className="text-[11px] text-muted-foreground block mt-0.5">
            {analysis.daysToExam !== null
              ? `Exam runway: ${analysis.daysToExam} days`
              : 'Target: 60 days'}
          </span>
        </div>

        {/* Metric 3: Current Empirical Pace */}
        <div className="py-4 px-4">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
            Current Pace
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-mono text-3xl font-bold tracking-tight text-foreground">
              {analysis.currentPaceHoursPerDay}
            </span>
            <span className="text-xs font-mono text-muted-foreground">h / day</span>
          </div>
          <span className="text-[11px] text-muted-foreground block mt-0.5">
            {sessions.length > 0 ? '7-day rolling velocity' : 'Default initial rate'}
          </span>
        </div>

        {/* Metric 4: Buffer or Deficit */}
        <div className="py-4 sm:px-4 last:sm:pr-0">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
            {analysis.isOnTrack ? 'Runway Buffer' : 'Deficit Pace'}
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span
              className={`font-mono text-3xl font-bold tracking-tight ${
                analysis.isOnTrack
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {analysis.isOnTrack
                ? `+${analysis.bufferDays ?? 0}`
                : `+${analysis.additionalHoursNeededPerDay}`}
            </span>
            <span className="text-xs font-mono text-muted-foreground">
              {analysis.isOnTrack ? 'days margin' : 'h/day needed'}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground block mt-0.5">
            {analysis.isOnTrack ? 'Completes ahead of exam' : 'Action needed to recover'}
          </span>
        </div>
      </div>

      {/* Factual Calculation Output */}
      <div className="pt-3 text-xs text-muted-foreground flex items-center justify-between flex-wrap gap-2">
        <p className="font-mono text-[11px]">
          CALC: {analysis.summaryExplanation}
        </p>

        {/* Minimal Pace Simulator */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[11px] text-muted-foreground font-mono">Simulate:</span>
          <div className="flex items-center gap-1 font-mono">
            {[2, 3, 4, 5, 6].map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => {
                  setIsSimulating(true);
                  setSimulatedHours(h);
                  if (onUpdateDailyPromise) onUpdateDailyPromise(h);
                }}
                className={`px-1.5 py-0.5 text-[10px] rounded border transition ${
                  simulatedHours === h
                    ? 'bg-foreground text-background border-foreground font-bold'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground'
                }`}
              >
                {h}h
              </button>
            ))}
          </div>
          {isSimulating && (
            <button
              type="button"
              onClick={() => {
                setIsSimulating(false);
                setSimulatedHours(defaultDailyHours);
              }}
              className="text-[10px] text-muted-foreground hover:underline ml-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
