import { useState } from 'react';
import {
  X,
  History,
  CheckCircle2,
  Trash2,
  Pencil,
  Check,
  Plus,
  CalendarDays,
  BookOpen,
  Clock3,
  Layers,
} from 'lucide-react';
import { Link } from 'wouter';
import { useAuth } from '@/lib/auth-context';
import { buildDefaultPlanName, type StudentPlan } from '@/lib/backlog-data';

interface PlanHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PlanHistoryModal({ isOpen, onClose }: PlanHistoryModalProps) {
  const { plans, activePlan, setActivePlan, renamePlan, deletePlan } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!isOpen) return null;

  const startEditing = (plan: StudentPlan) => {
    setEditingId(plan.id || null);
    setDraftName(plan.name || buildDefaultPlanName(plan));
  };

  const commitRename = async (planId: string) => {
    if (draftName.trim()) {
      setBusyId(planId);
      await renamePlan(planId, draftName.trim());
      setBusyId(null);
    }
    setEditingId(null);
  };

  const handleActivate = async (planId: string) => {
    setBusyId(planId);
    await setActivePlan(planId);
    setBusyId(null);
    onClose();
  };

  const handleDeleteConfirm = async (plan: StudentPlan) => {
    if (!plan.id) return;
    setBusyId(plan.id);
    await deletePlan(plan.id);
    setPendingDeleteId(null);
    setBusyId(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Saved Study Plans History"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-2xl font-sans max-h-[85dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border/70 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/12 border border-sky-500/25 text-sky-400 shrink-0">
              <History size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground tracking-tight">
                Saved Study Plans History
              </h2>
              <p className="text-xs text-muted-foreground">
                Switch between active and past recovery plans without losing any progress.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
            aria-label="Close plan history"
          >
            <X size={18} />
          </button>
        </div>

        {/* Plans List */}
        <div className="mt-4 flex-1 overflow-y-auto space-y-2.5 pr-1">
          {plans.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center space-y-3">
              <Layers size={24} className="mx-auto text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">No saved plans yet</p>
              <p className="text-xs text-muted-foreground">
                Create your first personalized CBSE recovery roadmap to save it here.
              </p>
            </div>
          ) : (
            plans.map((p: StudentPlan, idx: number) => {
              const planId = p.id || `plan-${idx}`;
              const isCurrent = Boolean(p.isActive || (activePlan?.id && activePlan.id === p.id));
              const displayName = p.name || buildDefaultPlanName(p);
              const chapterCount = p.chapterIds?.length || p.plannedChapterIds?.length || 0;
              const durationDays = p.planDuration || p.days?.length || 7;
              const hoursPerDay = Math.round(((p.minutesPerDay || 180) / 60) * 10) / 10;
              const createdLabel = p.createdAt
                ? new Date(p.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : 'Saved';
              const isEditing = editingId === planId;
              const isBusy = busyId === planId;

              return (
                <div
                  key={planId}
                  data-testid={`plan-history-item-${idx}`}
                  className={`rounded-xl border p-4 transition ${
                    isCurrent
                      ? 'border-sky-500/45 bg-sky-500/8 shadow-xs'
                      : 'border-border bg-background/60 hover:border-border/90'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={draftName}
                            onChange={(e) => setDraftName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitRename(planId);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            autoFocus
                            className="h-8 w-full max-w-xs rounded-lg border border-sky-500/50 bg-background px-2.5 text-xs font-semibold text-foreground focus:outline-hidden"
                            placeholder="Plan name"
                          />
                          <button
                            type="button"
                            onClick={() => commitRename(planId)}
                            className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 p-1.5 text-emerald-400 hover:bg-emerald-500/25 cursor-pointer"
                            title="Save plan name"
                          >
                            <Check size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-foreground truncate">
                            {displayName}
                          </span>
                          {isCurrent && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-400">
                              <CheckCircle2 size={10} />
                              ACTIVE
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => startEditing(p)}
                            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
                            title="Rename plan"
                          >
                            <Pencil size={12} />
                          </button>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays size={11} className="text-sky-400" />
                          {durationDays}-Day
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <BookOpen size={11} className="text-indigo-400" />
                          {chapterCount} Chapters
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock3 size={11} className="text-amber-400" />
                          {hoursPerDay}h/day
                        </span>
                        <span>· {createdLabel}</span>
                      </div>

                      {Array.isArray(p.subjects) && p.subjects.length > 0 && (
                        <div className="text-[11px] text-muted-foreground">
                          Subjects: <span className="text-foreground/90">{p.subjects.join(', ')}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {pendingDeleteId === planId ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleDeleteConfirm(p)}
                            className="rounded-lg bg-rose-600 hover:bg-rose-500 px-2.5 py-1.5 text-[11px] font-semibold text-white transition disabled:opacity-50 cursor-pointer"
                            data-testid={`confirm-delete-plan-${idx}`}
                          >
                            {isBusy ? 'Deleting...' : 'Delete'}
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => setPendingDeleteId(null)}
                            className="rounded-lg border border-border bg-card hover:bg-muted px-2.5 py-1.5 text-[11px] font-semibold text-foreground transition cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          {!isCurrent && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleActivate(planId)}
                              className="rounded-lg bg-sky-500 hover:bg-sky-400 px-3 py-1.5 text-xs font-semibold text-white transition active:scale-95 disabled:opacity-50 cursor-pointer"
                            >
                              Switch to Plan
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => setPendingDeleteId(planId)}
                            className="rounded-lg border border-rose-500/25 bg-rose-500/10 hover:bg-rose-500/20 p-1.5 text-rose-400 transition disabled:opacity-50 cursor-pointer"
                            title="Delete plan"
                            data-testid={`button-delete-plan-${idx}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-border/70 flex items-center justify-between gap-3">
          <span className="text-[11px] font-mono text-muted-foreground">
            {plans.length} {plans.length === 1 ? 'plan' : 'plans'} saved
          </span>
          <Link
            href="/onboarding?reset=true"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow-xs transition"
          >
            <Plus size={14} />
            <span>Create New Plan</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
