import { useState } from 'react';
import {
  GitFork,
  X,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Clock,
  ArrowRight,
  Filter,
  Sparkles,
} from 'lucide-react';
import { chapters, type Subject } from '@/lib/backlog-data';
import {
  PREREQUISITE_GRAPH,
  DEPENDENTS_GRAPH,
  checkUnfinishedPrerequisites,
  getChapterTitle,
} from '@/lib/prerequisites-graph';
import { type BacklogItem } from '@/lib/backlog-items';

interface PrerequisiteMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  backlogItems: BacklogItem[];
  completedChapterIds: string[];
  onSelectChapter?: (chapterId: string) => void;
}

export function PrerequisiteMapModal({
  isOpen,
  onClose,
  backlogItems,
  completedChapterIds,
  onSelectChapter,
}: PrerequisiteMapModalProps) {
  const [selectedSubject, setSelectedSubject] = useState<Subject | 'All'>('All');
  const [activeChapterId, setActiveChapterId] = useState<string>('phy-work');

  if (!isOpen) return null;

  const completedSet = new Set(completedChapterIds);

  const filteredChapters = chapters.filter(
    (c) => selectedSubject === 'All' || c.subject === selectedSubject
  );

  const activeChapter =
    chapters.find((c) => c.id === activeChapterId) || filteredChapters[0] || chapters[0];

  const prereqCheck = checkUnfinishedPrerequisites(
    activeChapter.id,
    completedChapterIds
  );

  const directPrereqIds = PREREQUISITE_GRAPH[activeChapter.id] || [];
  const directDependentIds = DEPENDENTS_GRAPH[activeChapter.id] || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-md animate-in fade-in">
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/80 bg-muted/40 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <GitFork size={20} />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold">
                Prerequisite & Dependency Map
              </h2>
              <p className="text-xs text-muted-foreground">
                Understand foundation chains before jumping into high-yield topics.
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

        {/* Filter bar */}
        <div className="flex items-center justify-between border-b border-border/60 bg-background/50 px-6 py-2.5 text-xs">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-muted-foreground" />
            <span className="font-semibold text-muted-foreground">Subject:</span>
            {(['All', 'Physics', 'Chemistry', 'Mathematics'] as const).map((sub) => (
              <button
                key={sub}
                type="button"
                onClick={() => setSelectedSubject(sub)}
                className={`rounded-lg px-2.5 py-1 font-bold transition ${
                  selectedSubject === sub
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50 text-muted-foreground hover:text-foreground'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>

          <span className="text-[11px] text-muted-foreground">
            {completedChapterIds.length} / {chapters.length} chapters completed
          </span>
        </div>

        {/* Content split */}
        <div className="grid flex-1 overflow-hidden md:grid-cols-[300px_1fr]">
          {/* Chapter selector list */}
          <div className="overflow-y-auto border-r border-border/60 p-3 space-y-1 max-h-[550px]">
            {filteredChapters.map((ch) => {
              const isCompleted = completedSet.has(ch.id);
              const isSelected = activeChapter.id === ch.id;
              const hasPrereqs = (PREREQUISITE_GRAPH[ch.id] || []).length > 0;
              const check = checkUnfinishedPrerequisites(ch.id, completedChapterIds);

              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setActiveChapterId(ch.id)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs transition ${
                    isSelected
                      ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                      : 'hover:bg-muted/60 text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isCompleted ? (
                      <CheckCircle2
                        size={15}
                        className={isSelected ? 'text-white' : 'text-emerald-500'}
                      />
                    ) : (
                      <Circle
                        size={15}
                        className={isSelected ? 'text-white/60' : 'text-muted-foreground'}
                      />
                    )}
                    <span className="truncate">{ch.title}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    {check.hasUnfinished && !isCompleted && (
                      <AlertTriangle
                        size={13}
                        className={isSelected ? 'text-amber-200' : 'text-amber-500'}
                      />
                    )}
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                        isSelected ? 'bg-white/20' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {ch.subject.slice(0, 3)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Chapter Details & Prerequisite Chains */}
          <div className="overflow-y-auto p-6 space-y-6 max-h-[550px]">
            {/* Active Chapter Card */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-bold text-primary">
                  {activeChapter.subject} · Class 11
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    completedSet.has(activeChapter.id)
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {completedSet.has(activeChapter.id) ? '✓ Completed' : 'In Backlog'}
                </span>
              </div>

              <h3 className="font-display mt-2 text-2xl font-bold">
                {activeChapter.title}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">{activeChapter.note}</p>

              {/* Prerequisite warning banner */}
              {prereqCheck.hasUnfinished && !completedSet.has(activeChapter.id) && (
                <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-600 dark:text-amber-400">
                  <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Missing Foundational Prerequisites</p>
                    <p className="mt-1 opacity-90">{prereqCheck.warningMessage}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Direct Prerequisites List */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <span>Required Foundations First (Prerequisites)</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-mono">
                  {directPrereqIds.length}
                </span>
              </h4>

              {directPrereqIds.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {directPrereqIds.map((pid) => {
                    const isDone = completedSet.has(pid);
                    const title = getChapterTitle(pid);
                    return (
                      <div
                        key={pid}
                        onClick={() => setActiveChapterId(pid)}
                        className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 text-xs transition ${
                          isDone
                            ? 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50'
                            : 'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isDone ? (
                            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                          ) : (
                            <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                          )}
                          <span className="font-bold truncate">{title}</span>
                        </div>
                        <span className="text-[10px] font-semibold text-muted-foreground shrink-0 ml-2">
                          {isDone ? 'Cleared' : 'Unfinished'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-border/80 p-4 text-xs text-muted-foreground italic">
                  🌱 This is a root foundational chapter. No prior Class 11 prerequisites required. You can start here safely!
                </p>
              )}
            </div>

            {/* Dependents (Chapters Unlocked by this) */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <span>Subsequent Chapters Unlocked</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-mono">
                  {directDependentIds.length}
                </span>
              </h4>

              {directDependentIds.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {directDependentIds.map((did) => {
                    const isDone = completedSet.has(did);
                    const title = getChapterTitle(did);
                    return (
                      <div
                        key={did}
                        onClick={() => setActiveChapterId(did)}
                        className="flex cursor-pointer items-center justify-between rounded-xl border border-border/70 bg-card p-3 text-xs hover:border-primary/50 transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <ArrowRight size={14} className="text-primary shrink-0" />
                          <span className="font-bold truncate">{title}</span>
                        </div>
                        <span
                          className={`text-[10px] font-semibold ${
                            isDone ? 'text-emerald-500' : 'text-muted-foreground'
                          }`}
                        >
                          {isDone ? 'Done' : 'Pending'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-border/80 p-4 text-xs text-muted-foreground italic">
                  Terminal chapter in the Class 11 sequence.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/80 bg-muted/20 px-6 py-3 text-xs">
          <span className="text-muted-foreground">
            Click any chapter node to navigate its dependency hierarchy.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-primary px-4 py-2 font-bold text-primary-foreground hover:bg-primary/90"
          >
            Close Map
          </button>
        </div>
      </div>
    </div>
  );
}
