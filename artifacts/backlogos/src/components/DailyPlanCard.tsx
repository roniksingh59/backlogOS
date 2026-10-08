import { useState, useMemo } from 'react';
import {
  Clock,
  Play,
  RotateCcw,
  CheckCircle2,
  Circle,
  AlertTriangle,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
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
import { TaskAttachedResources } from '@/components/resources/TaskAttachedResources';
import { InteractiveNotesModal } from '@/components/resources/InteractiveNotesModal';
import { YouTubePlayerModal } from '@/components/resources/YouTubePlayerModal';
import { ChapterResourceBrowserModal } from '@/components/resources/ChapterResourceBrowserModal';
import { MindMapModal } from '@/components/resources/MindMapModal';
import { UniversalResourceModal } from '@/components/resources/UniversalResourceModal';
import { type EducationalResource, type YouTubeResource } from '@/lib/resources/types';

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

  // Resource Modals State
  const [activeNotesResource, setActiveNotesResource] = useState<EducationalResource | null>(null);
  const [activeMindMapResource, setActiveMindMapResource] = useState<EducationalResource | null>(null);
  const [activeUniversalResource, setActiveUniversalResource] = useState<EducationalResource | null>(null);
  const [activeVideoResource, setActiveVideoResource] = useState<YouTubeResource | null>(null);
  const [moreResourcesTarget, setMoreResourcesTarget] = useState<{
    chapterId: string;
    chapterTitle: string;
    subject: string;
  } | null>(null);

  const handleOpenResource = (res: EducationalResource) => {
    if (res.resourceType === 'mindmap') {
      setActiveMindMapResource(res);
    } else if (res.resourceType === 'notes') {
      setActiveNotesResource(res);
    } else {
      setActiveUniversalResource(res);
    }
  };

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
      className="rounded-lg border border-border bg-card p-4 sm:p-5 transition"
      data-testid="card-smart-daily-plan"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Today's Schedule · {activePlan.availableHours}h Allocated
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">
              ({completedMinutes}/{activePlan.totalMinutes}m done)
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground mt-0.5">
            Daily Study Plan
          </h2>
        </div>

        {/* Primary and secondary actions */}
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-muted-foreground hover:text-foreground hover:bg-muted transition"
            data-testid="button-customize-daily-plan"
          >
            <SlidersHorizontal size={12} />
            <span>Configure</span>
          </button>

          <button
            type="button"
            onClick={handleRegenerate}
            className="flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-muted-foreground hover:text-foreground hover:bg-muted transition"
            data-testid="button-regenerate-daily-plan"
          >
            <RotateCcw size={12} />
            <span>Regenerate</span>
          </button>

          {firstIncompleteSlot && (
            <Link
              href={`/study?chapter=${firstIncompleteSlot.chapterId}&duration=${firstIncompleteSlot.durationMinutes}`}
              className="flex items-center gap-1.5 rounded-md bg-foreground text-background px-3 py-1 font-bold hover:bg-foreground/90 transition shadow-2xs"
              data-testid="button-start-todays-plan"
            >
              <Play size={11} className="fill-current" />
              <span>Start First Block</span>
            </Link>
          )}
        </div>
      </div>

      {/* Configuration Drawer */}
      {showConfig && (
        <div className="my-3.5 rounded-md border border-border bg-muted/30 p-3 text-xs space-y-3 font-mono">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Hours selection */}
            <div>
              <span className="block text-muted-foreground text-[11px] mb-1">
                Target Hours: {availableHours}h
              </span>
              <div className="flex items-center gap-1">
                {[2, 3, 4, 5, 6].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setAvailableHours(h)}
                    className={`rounded px-2 py-0.5 text-xs transition ${
                      availableHours === h
                        ? 'bg-foreground text-background font-bold'
                        : 'border border-border bg-card text-muted-foreground hover:text-foreground'
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
                Block Length:
              </span>
              <div className="flex items-center gap-1">
                {[30, 45, 60, 90].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSessionLength(m)}
                    className={`rounded px-2 py-0.5 text-xs transition ${
                      sessionLength === m
                        ? 'bg-foreground text-background font-bold'
                        : 'border border-border bg-card text-muted-foreground hover:text-foreground'
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
                Included Subjects:
              </span>
              <div className="flex items-center gap-1">
                {(['Physics', 'Chemistry', 'Mathematics'] as const).map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => toggleSubject(sub)}
                    className={`rounded px-2 py-0.5 text-xs transition ${
                      selectedSubjects.includes(sub)
                        ? 'bg-foreground text-background font-bold'
                        : 'border border-border bg-card text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleRegenerate}
              className="rounded bg-foreground text-background px-3 py-1 text-xs font-bold"
            >
              Apply & Regenerate
            </button>
          </div>
        </div>
      )}

      {/* Prerequisite Warnings */}
      {activePlan.prerequisiteWarnings.length > 0 && (
        <div className="my-2.5 space-y-1 font-mono text-[11px]">
          {activePlan.prerequisiteWarnings.slice(0, 2).map((w, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 border-l-2 border-border bg-muted/40 px-2.5 py-1 text-foreground"
            >
              <AlertTriangle size={12} className="shrink-0 mt-0.5 text-muted-foreground" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Subtle Progress Bar */}
      <div className="mt-2.5">
        <div className="h-1 w-full bg-muted overflow-hidden rounded-full">
          <div
            className="h-full bg-foreground progress-bar-smooth"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
      </div>

      {/* Tasks List - Notion Structure (What -> Why -> Duration -> Resources -> Action) */}
      <div className="mt-3.5 divide-y divide-border">
        {activePlan.slots.map((slot, index) => (
          <div
            key={slot.id}
            className={`py-3.5 first:pt-1 transition-all duration-200 ${
              slot.completed ? 'opacity-60 bg-muted/5' : 'hover:bg-muted/10'
            }`}
            data-testid={`daily-slot-${slot.id}`}
          >
            {/* Task Row: Checkbox, Details, Actions */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                {/* Complete checkbox button */}
                {onToggleSlotComplete ? (
                  <button
                    type="button"
                    onClick={() => onToggleSlotComplete(slot.id)}
                    className="mt-0.5 text-muted-foreground hover:text-foreground transition-all duration-150 active:scale-90 shrink-0"
                    aria-label={slot.completed ? 'Mark incomplete' : 'Mark task complete'}
                    data-testid={`button-toggle-slot-${slot.id}`}
                  >
                    {slot.completed ? (
                      <CheckCircle2 size={17} className="text-foreground animate-check-pop" />
                    ) : (
                      <Circle size={17} className="transition-transform duration-150 hover:scale-110" />
                    )}
                  </button>
                ) : (
                  <div className="mt-0.5 text-muted-foreground shrink-0">
                    <Circle size={17} />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  {/* Title & Metadata line */}
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-mono text-xs text-muted-foreground">
                      {index + 1}.
                    </span>

                    <span className="font-mono text-xs font-semibold text-foreground">
                      {slot.subject}
                    </span>

                    <span className="text-muted-foreground text-xs">·</span>

                    <span className={`font-semibold text-sm transition-all duration-200 ${slot.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      {slot.chapterTitle}
                    </span>

                    <span className="font-mono text-[11px] text-muted-foreground">
                      ({slot.durationMinutes} min)
                    </span>

                    <span className="text-[10px] font-mono uppercase text-muted-foreground px-1.5 py-0.5 rounded border border-border/70 bg-muted/40">
                      {slot.kind}
                    </span>

                    {slot.isPrerequisiteBlock && (
                      <span className="text-[10px] font-mono uppercase text-foreground px-1.5 py-0.5 rounded border border-border">
                        Foundation
                      </span>
                    )}
                  </div>

                  {/* Why / Reason */}
                  {slot.reason && (
                    <p className="mt-0.5 text-xs text-muted-foreground font-mono leading-relaxed">
                      {slot.reason}
                    </p>
                  )}
                </div>
              </div>

              {/* Action */}
              <div className="flex items-center gap-1.5 shrink-0 self-start">
                <Link
                  href={`/study?chapter=${slot.chapterId}&duration=${slot.durationMinutes}`}
                  className="inline-flex items-center gap-1 rounded-md border border-foreground bg-foreground text-background px-2.5 py-1 text-xs font-mono font-medium hover:bg-foreground/90 transition shadow-2xs"
                  data-testid={`link-study-slot-${slot.id}`}
                >
                  <span>Start</span>
                  <Play size={10} className="fill-current" />
                </Link>
              </div>
            </div>

            {/* Attached Resources directly inside the task */}
            <div className="pl-7 mt-2">
              <TaskAttachedResources
                slot={slot}
                onOpenNotes={(res) => handleOpenResource(res)}
                onOpenVideo={(videoRes) => setActiveVideoResource(videoRes)}
                onOpenMoreResources={(chId, chTitle, sub) =>
                  setMoreResourcesTarget({ chapterId: chId, chapterTitle: chTitle, subject: sub })
                }
              />
            </div>
          </div>
        ))}
      </div>

      {/* In-App Notes / Formula Sheet Modal */}
      <InteractiveNotesModal
        resource={activeNotesResource}
        isOpen={Boolean(activeNotesResource)}
        onClose={() => setActiveNotesResource(null)}
      />

      {/* In-App Visual Mind Map Modal */}
      {activeMindMapResource && (
        <MindMapModal
          resource={activeMindMapResource}
          chapterId={activeMindMapResource.chapterId}
          chapterTitle={activeMindMapResource.chapterTitle}
          subject={activeMindMapResource.subject}
          isOpen={Boolean(activeMindMapResource)}
          onClose={() => setActiveMindMapResource(null)}
        />
      )}

      {/* In-App Universal Educational Resource Modal */}
      {activeUniversalResource && (
        <UniversalResourceModal
          resource={activeUniversalResource}
          isOpen={Boolean(activeUniversalResource)}
          onClose={() => setActiveUniversalResource(null)}
        />
      )}

      {/* In-App YouTube Player Modal */}
      <YouTubePlayerModal
        video={activeVideoResource}
        isOpen={Boolean(activeVideoResource)}
        onClose={() => setActiveVideoResource(null)}
        chapterId={activeVideoResource?.id}
        chapterTitle={activeVideoResource?.title}
      />

      {/* Chapter Deep-Dive Resource Browser Modal */}
      <ChapterResourceBrowserModal
        isOpen={Boolean(moreResourcesTarget)}
        onClose={() => setMoreResourcesTarget(null)}
        chapterId={moreResourcesTarget?.chapterId || ''}
        chapterTitle={moreResourcesTarget?.chapterTitle || ''}
        subject={moreResourcesTarget?.subject || ''}
        onOpenNotes={(res) => handleOpenResource(res)}
        onOpenVideo={(v) => setActiveVideoResource(v)}
      />
    </section>
  );
}
