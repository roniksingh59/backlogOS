import { useState, useMemo } from 'react';
import {
  CalendarDays,
  Clock,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  SlidersHorizontal,
  Flame,
  BookOpen,
} from 'lucide-react';
import { chapters, type Subject } from '@/lib/backlog-data';
import { type BacklogItem } from '@/lib/backlog-items';
import {
  type SmartDailyPlan,
  type DailyPlanSlot,
  generateSmartDailyPlan,
} from '@/lib/smart-planner';
import { Link } from 'wouter';

interface DailyPlanCardProps {
  plan: SmartDailyPlan | null;
  backlogItems: BacklogItem[];
  dueRevisionChapters?: { chapterId: string; title: string; subject: Subject }[];
  examDateStr?: string;
  onGeneratePlan: (newPlan: SmartDailyPlan) => void;
  onToggleSlotComplete?: (slotId: string) => void;
  onStartFocusSlot?: (chapterId: string, durationMinutes: number) => void;
}

export function DailyPlanCard({
  plan,
  backlogItems,
  dueRevisionChapters = [],
  examDateStr,
  onGeneratePlan,
  onToggleSlotComplete,
  onStartFocusSlot,
}: DailyPlanCardProps) {
  const [availableHours, setAvailableHours] = useState<number>(
    plan?.availableHours ?? 4
  );
  const [sessionLength, setSessionLength] = useState<number>(60);
  const [selectedSubjects, setSelectedSubjects] = useState<Subject[]>([
    'Physics',
    'Chemistry',
    'Mathematics',
  ]);
  const [showConfig, setShowConfig] = useState(false);

  // Toggle subject selection
  const toggleSubject = (sub: Subject) => {
    if (selectedSubjects.includes(sub)) {
      if (selectedSubjects.length > 1) {
        setSelectedSubjects(selectedSubjects.filter((s) => s !== sub));
      }
    } else {
      setSelectedSubjects([...selectedSubjects, sub]);
    }
  };

  const handleRegenerate = () => {
    const newPlan = generateSmartDailyPlan(
      backlogItems,
      {
        availableHoursToday: availableHours,
        preferredSessionLengthMinutes: sessionLength,
        selectedSubjects,
        examDate: examDateStr,
      },
      dueRevisionChapters
    );
    onGeneratePlan(newPlan);
    setShowConfig(false);
  };

  const activePlan = useMemo(() => {
    if (plan && plan.slots.length > 0) return plan;
    return generateSmartDailyPlan(
      backlogItems,
      {
        availableHoursToday: availableHours,
        preferredSessionLengthMinutes: sessionLength,
        selectedSubjects,
        examDate: examDateStr,
      },
      dueRevisionChapters
    );
  }, [plan, backlogItems, availableHours, sessionLength, selectedSubjects, examDateStr, dueRevisionChapters]);

  const completedMinutes = activePlan.slots
    .filter((s) => s.completed)
    .reduce((sum, s) => sum + s.durationMinutes, 0);

  const completionPercent =
    activePlan.totalMinutes > 0
      ? Math.round((completedMinutes / activePlan.totalMinutes) * 100)
      : 0;

  const firstIncompleteSlot = activePlan.slots.find((s) => !s.completed) || activePlan.slots[0];

  return (
    <section
      className="border border-border bg-card p-5 sm:p-6"
      data-testid="card-smart-daily-plan"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Daily Target · {activePlan.availableHours}h Allocated
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">
              ({completedMinutes}/{activePlan.totalMinutes}m done)
            </span>
          </div>
          <h2 className="font-display mt-0.5 text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Today's Plan
          </h2>
        </div>

        {/* Primary and secondary actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            className="focus-ring flex items-center gap-1.5 rounded border border-border bg-card px-2.5 py-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition"
            data-testid="button-customize-daily-plan"
          >
            <SlidersHorizontal size={13} />
            <span>Configure</span>
          </button>

          <button
            type="button"
            onClick={handleRegenerate}
            className="focus-ring flex items-center gap-1.5 rounded border border-border bg-card px-2.5 py-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition"
            data-testid="button-regenerate-daily-plan"
          >
            <RotateCcw size={13} />
            <span>Regenerate</span>
          </button>

          {firstIncompleteSlot && (
            <Link
              href={`/study?chapter=${firstIncompleteSlot.chapterId}&duration=${firstIncompleteSlot.durationMinutes}`}
              className="focus-ring flex items-center gap-2 rounded bg-foreground text-background px-3.5 py-1.5 text-xs font-mono font-bold hover:bg-foreground/90 transition shadow-xs"
              data-testid="button-start-todays-plan"
            >
              <Play size={13} className="fill-current" />
              <span>START TODAY'S PLAN</span>
            </Link>
          )}
        </div>
      </div>

      {/* Configuration Drawer */}
      {showConfig && (
        <div className="my-4 border border-border bg-muted/20 p-3.5 text-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-4 font-mono">
            {/* Hours selection */}
            <div>
              <span className="block text-muted-foreground text-[11px] mb-1">
                Available hours: {availableHours}h
              </span>
              <div className="flex items-center gap-1">
                {[2, 3, 4, 5, 6].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setAvailableHours(h)}
                    className={`rounded border px-2 py-0.5 text-xs ${
                      availableHours === h
                        ? 'bg-foreground text-background border-foreground font-bold'
                        : 'border-border bg-card text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {h}h
                  </button>
                ))}
              </div>
            </div>

            {/* Preferred chunk length */}
            <div>
              <span className="block text-muted-foreground text-[11px] mb-1">
                Session block:
              </span>
              <div className="flex items-center gap-1">
                {[30, 45, 60, 90].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSessionLength(m)}
                    className={`rounded border px-2 py-0.5 text-xs ${
                      sessionLength === m
                        ? 'bg-foreground text-background border-foreground font-bold'
                        : 'border-border bg-card text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {m}m
                  </button>
                ))}
              </div>
            </div>

            {/* Subjects */}
            <div>
              <span className="block text-muted-foreground text-[11px] mb-1">
                Active subjects:
              </span>
              <div className="flex items-center gap-1">
                {(['Physics', 'Chemistry', 'Mathematics'] as const).map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => toggleSubject(sub)}
                    className={`rounded border px-2 py-0.5 text-xs ${
                      selectedSubjects.includes(sub)
                        ? 'bg-foreground text-background border-foreground font-bold'
                        : 'border-border bg-card text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {sub.slice(0, 4)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleRegenerate}
              className="rounded bg-foreground text-background px-3 py-1 text-xs font-mono font-medium"
            >
              Apply Changes
            </button>
          </div>
        </div>
      )}

      {/* Prerequisite Warnings (clean academic callout) */}
      {activePlan.prerequisiteWarnings.length > 0 && (
        <div className="my-3 space-y-1.5 font-mono text-[11px]">
          {activePlan.prerequisiteWarnings.slice(0, 2).map((w, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 border-l-2 border-amber-500 bg-amber-500/5 px-3 py-1.5 text-amber-700 dark:text-amber-300"
            >
              <AlertTriangle size={13} className="shrink-0 mt-0.5" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Thin Progress bar */}
      <div className="mt-3">
        <div className="h-1 w-full bg-muted overflow-hidden rounded-full">
          <div
            className="h-full bg-foreground transition-all duration-300"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
      </div>

      {/* Compact Task / List Layout (As specified by user) */}
      <div className="mt-4 divide-y divide-border border-t border-b border-border">
        {activePlan.slots.map((slot, index) => (
          <div
            key={slot.id}
            className={`flex flex-col sm:flex-row sm:items-center sm:justify-between py-2.5 px-1 gap-2 transition text-xs ${
              slot.completed ? 'opacity-50' : 'hover:bg-muted/20'
            }`}
            data-testid={`daily-slot-${slot.id}`}
          >
            {/* Left: Duration · Subject · Topic */}
            <div className="flex items-center gap-3 min-w-0">
              <span className="font-mono text-muted-foreground text-xs w-10 shrink-0 font-medium">
                {slot.durationMinutes}m
              </span>

              <span className="font-mono text-xs font-bold text-foreground w-24 shrink-0 truncate">
                {slot.subject}
              </span>

              <div className="min-w-0 flex items-center gap-2">
                <span className={`font-medium truncate ${slot.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                  {slot.chapterTitle}
                </span>

                {slot.kind === 'revision' && (
                  <span className="text-[10px] font-mono px-1 py-0.2 rounded border border-border text-muted-foreground shrink-0">
                    rev
                  </span>
                )}

                {slot.isPrerequisiteBlock && (
                  <span className="text-[10px] font-mono px-1 py-0.2 rounded border border-amber-500/30 text-amber-600 dark:text-amber-400 shrink-0">
                    prereq
                  </span>
                )}
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              {onToggleSlotComplete && (
                <button
                  type="button"
                  onClick={() => onToggleSlotComplete(slot.id)}
                  className={`font-mono text-[11px] px-2 py-0.5 rounded transition ${
                    slot.completed
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  data-testid={`button-toggle-slot-${slot.id}`}
                >
                  {slot.completed ? '✓ Completed' : 'Mark done'}
                </button>
              )}

              <Link
                href={`/study?chapter=${slot.chapterId}&duration=${slot.durationMinutes}`}
                className="font-mono text-[11px] text-foreground hover:underline flex items-center gap-1 ml-1"
                data-testid={`link-study-slot-${slot.id}`}
              >
                <span>Study</span>
                <Play size={10} className="fill-current" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
