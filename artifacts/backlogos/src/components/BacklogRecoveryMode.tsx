import { useState, useMemo } from 'react';
import {
  Flame,
  Play,
  RotateCcw,
  ShieldAlert,
  Zap,
  CheckCircle2,
  Clock,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import { type BacklogItem } from '@/lib/backlog-items';
import { calculateBacklogMetrics } from '@/lib/backlog-items';
import { generateSmartDailyPlan } from '@/lib/smart-planner';
import { Link } from 'wouter';

interface BacklogRecoveryModeProps {
  backlogItems: BacklogItem[];
  isActive: boolean;
  onToggleActive: (active: boolean) => void;
  onStartSprint: (chapterId: string, minutes: number) => void;
  dailyHours?: number;
}

export function BacklogRecoveryMode({
  backlogItems,
  isActive,
  onToggleActive,
  onStartSprint,
  dailyHours = 4,
}: BacklogRecoveryModeProps) {
  const metrics = useMemo(
    () => calculateBacklogMetrics(backlogItems, dailyHours),
    [backlogItems, dailyHours]
  );

  // Generate tactical recovery sprint targeting top critical chapters
  const recoveryPlan = useMemo(() => {
    return generateSmartDailyPlan(backlogItems, {
      availableHoursToday: Math.max(3.5, dailyHours),
      preferredSessionLengthMinutes: 60,
      selectedSubjects: ['Physics', 'Chemistry', 'Mathematics'],
    });
  }, [backlogItems, dailyHours]);

  const physicsRemaining = metrics.subjectMetrics.Physics.remaining;
  const chemistryRemaining = metrics.subjectMetrics.Chemistry.remaining;
  const mathsRemaining = metrics.subjectMetrics.Mathematics.remaining;
  const totalBehind = metrics.remainingHours;

  const firstSlot = recoveryPlan.slots[0];

  return (
    <section
      className="border border-rose-500/30 bg-card p-5 sm:p-6"
      data-testid="section-backlog-recovery-mode"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-rose-600 dark:text-rose-400 block font-semibold">
            Emergency Triage Protocol
          </span>
          <h2 className="font-display mt-0.5 text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Backlog Recovery Mode
            <span className="text-xs font-mono font-medium text-rose-600 dark:text-rose-400 border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 rounded">
              {totalBehind}h Deficit
            </span>
          </h2>
        </div>

        <button
          type="button"
          onClick={() => onToggleActive(!isActive)}
          className={`rounded border px-3 py-1 text-xs font-mono transition ${
            isActive
              ? 'border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold'
              : 'border-border bg-card text-muted-foreground hover:text-foreground'
          }`}
          data-testid="button-toggle-recovery-mode"
        >
          {isActive ? 'Active (Click to Exit)' : 'Inactive'}
        </button>
      </div>

      {/* Deficit Row */}
      <div className="py-4 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-mono text-muted-foreground">
            Targeting high-yield prerequisites first to stop compounding syllabus loss.
          </p>
        </div>

        {/* Clean Subject Deficit Strip */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-baseline gap-1.5">
            <span className="text-muted-foreground">PHY:</span>
            <span className="font-bold text-foreground">{physicsRemaining}h</span>
          </div>
          <span className="text-border">·</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-muted-foreground">CHEM:</span>
            <span className="font-bold text-foreground">{chemistryRemaining}h</span>
          </div>
          <span className="text-border">·</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-muted-foreground">MATH:</span>
            <span className="font-bold text-foreground">{mathsRemaining}h</span>
          </div>
        </div>
      </div>

      {/* Recovery Queue List */}
      <div className="mt-4">
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-2">
          Prioritized Triage Slots ({recoveryPlan.totalMinutes}m allocated)
        </span>

        <div className="divide-y divide-border border-t border-b border-border">
          {recoveryPlan.slots.slice(0, 3).map((slot, index) => (
            <div
              key={slot.id}
              className="py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-mono text-muted-foreground text-xs w-10 shrink-0 font-medium">
                  {slot.durationMinutes}m
                </span>
                <span className="font-mono text-xs font-bold text-foreground w-24 shrink-0 truncate">
                  {slot.subject}
                </span>
                <span className="font-medium text-foreground truncate">
                  {slot.chapterTitle}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground hidden md:inline">
                  — {slot.reason}
                </span>
              </div>

              <Link
                href={`/study?chapter=${slot.chapterId}&duration=${slot.durationMinutes}`}
                className="font-mono text-[11px] text-foreground hover:underline flex items-center gap-1 self-end sm:self-center"
              >
                <span>Focus</span>
                <ArrowRight size={11} />
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Signature START RECOVERY Action */}
      <div className="mt-4 pt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-xs font-mono text-muted-foreground">
          Recovers 60 minutes towards your total deficit today.
        </p>

        {firstSlot ? (
          <Link
            href={`/study?chapter=${firstSlot.chapterId}&duration=${firstSlot.durationMinutes}`}
            className="focus-ring inline-flex items-center justify-center gap-2 rounded bg-foreground text-background px-4 py-2 text-xs font-mono font-bold hover:bg-foreground/90 transition shadow-xs"
            data-testid="button-start-recovery-signature"
          >
            <Play size={13} className="fill-current" />
            <span>START RECOVERY</span>
          </Link>
        ) : (
          <Link
            href="/study"
            className="focus-ring inline-flex items-center justify-center gap-2 rounded bg-foreground text-background px-4 py-2 text-xs font-mono font-bold hover:bg-foreground/90"
          >
            <Play size={13} className="fill-current" />
            <span>START RECOVERY</span>
          </Link>
        )}
      </div>
    </section>
  );
}
