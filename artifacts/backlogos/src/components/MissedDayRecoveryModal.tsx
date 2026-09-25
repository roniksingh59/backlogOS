import { useState } from 'react';
import {
  RotateCcw,
  X,
  AlertTriangle,
  Calendar,
  Check,
  Flame,
  ArrowRight,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  type MissedDayRecoveryPlan,
  computeMissedDayRecovery,
} from '@/lib/smart-planner';

interface MissedDayRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  recoveryPlan: MissedDayRecoveryPlan;
  onAcceptRecoveryPlan: (plan: MissedDayRecoveryPlan) => void;
  onModifyHours?: (newDailyHours: number) => void;
}

export function MissedDayRecoveryModal({
  isOpen,
  onClose,
  recoveryPlan,
  onAcceptRecoveryPlan,
  onModifyHours,
}: MissedDayRecoveryModalProps) {
  const [selectedDays, setSelectedDays] = useState<number>(
    recoveryPlan.distributionDays
  );
  const [customMissedHours, setCustomMissedHours] = useState<number>(
    recoveryPlan.missedHours
  );

  if (!isOpen) return null;

  // Dynamically recompute if student tweaks the days or missed hours
  const livePlan = computeMissedDayRecovery(
    customMissedHours,
    recoveryPlan.originalPaceHours,
    recoveryPlan.missedDate
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/10 text-amber-500">
              <RotateCcw size={20} />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold">
                Missed-Day Recovery System
              </h3>
              <p className="text-xs text-muted-foreground">
                Automatic schedule rebalancing without burnout or double-cram days.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        {/* Narrative Banner */}
        <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-600 dark:text-amber-400">
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">
                You missed {customMissedHours} hours of planned study ({recoveryPlan.missedDate}).
              </p>
              <p className="mt-1 leading-relaxed text-foreground/90">
                Instead of demanding an impossible {recoveryPlan.originalPaceHours + customMissedHours}h day tomorrow, BacklogOS has distributed <strong className="text-primary font-bold">+{Math.round(livePlan.addedHoursPerDay * 60)} minutes</strong> across the next {livePlan.distributionDays} days.
              </p>
            </div>
          </div>
        </div>

        {/* Tuner Controls */}
        <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <label className="block font-bold text-foreground mb-1">
              Missed Hours to Recover:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="16"
                step="0.5"
                value={customMissedHours}
                onChange={(e) => setCustomMissedHours(parseFloat(e.target.value) || 1)}
                className="w-20 rounded-lg border border-border bg-background px-2.5 py-1 font-bold"
              />
              <span className="text-muted-foreground">hours</span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <label className="block font-bold text-foreground mb-1">
              New Daily Promise:
            </label>
            <div className="flex items-center gap-1.5 font-display text-lg font-bold text-primary">
              <Clock size={16} />
              <span>{livePlan.newDailyHours}h / day</span>
              <span className="text-[10px] text-muted-foreground font-sans font-normal">
                (was {recoveryPlan.originalPaceHours}h)
              </span>
            </div>
          </div>
        </div>

        {/* Schedule Preview */}
        <div className="mt-5">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Balanced Recovery Route
          </p>
          <div className="space-y-2">
            {livePlan.schedulePreview.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-xl border border-border/80 bg-background px-4 py-2.5 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <Calendar size={14} className="text-primary" />
                  <span className="font-bold text-foreground">{item.dayLabel}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                    {item.notes}
                  </span>
                  <span className="font-mono font-bold text-primary">
                    {item.targetHours}h total
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border/80 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border bg-muted/40 px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Dismiss
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onAcceptRecoveryPlan(livePlan);
                onClose();
              }}
              className="focus-ring flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90"
              data-testid="button-accept-recovery-plan"
            >
              <Check size={15} />
              <span>Accept Recovery Plan</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
