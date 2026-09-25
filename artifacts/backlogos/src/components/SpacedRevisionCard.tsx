import { useState } from 'react';
import {
  RotateCcw,
  CheckCircle2,
  Calendar,
  Clock,
  ArrowRight,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import {
  type SpacedRevision,
  filterDueRevisions,
  evaluateRevisionStatus,
} from '@/lib/revisions';
import { Link } from 'wouter';

interface SpacedRevisionCardProps {
  revisions: SpacedRevision[];
  onCompleteRevision: (
    revisionId: string,
    confidence: 'strong' | 'shaky' | 'forgotten'
  ) => void;
}

export function SpacedRevisionCard({
  revisions,
  onCompleteRevision,
}: SpacedRevisionCardProps) {
  const [activeTab, setActiveTab] = useState<'due' | 'all'>('due');
  const dueRevisions = filterDueRevisions(revisions);

  const displayList = activeTab === 'due' ? dueRevisions : revisions;

  return (
    <section
      className="border border-border bg-card p-5 sm:p-6"
      data-testid="card-spaced-revisions"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block">
            Memory Retention · Spaced Recall
          </span>
          <h3 className="font-display text-lg font-bold tracking-tight text-foreground mt-0.5 flex items-center gap-2">
            Spaced Revision Engine
            {dueRevisions.length > 0 && (
              <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.2 text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400">
                {dueRevisions.length} due today
              </span>
            )}
          </h3>
        </div>

        <div className="flex items-center gap-1 font-mono text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('due')}
            className={`rounded border px-2.5 py-1 transition ${
              activeTab === 'due'
                ? 'bg-foreground text-background border-foreground font-bold'
                : 'border-border bg-card text-muted-foreground hover:text-foreground'
            }`}
          >
            Due Today ({dueRevisions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`rounded border px-2.5 py-1 transition ${
              activeTab === 'all'
                ? 'bg-foreground text-background border-foreground font-bold'
                : 'border-border bg-card text-muted-foreground hover:text-foreground'
            }`}
          >
            All Scheduled ({revisions.length})
          </button>
        </div>
      </div>

      {displayList.length === 0 ? (
        <div className="py-8 text-center text-xs font-mono text-muted-foreground">
          <p className="font-medium text-foreground">No revisions due today.</p>
          <p className="mt-1 text-[11px]">
            Chapters marked as completed automatically trigger spaced reviews at +2d, +7d, and +21d intervals.
          </p>
        </div>
      ) : (
        <div className="mt-3 divide-y divide-border border-t border-b border-border">
          {displayList.slice(0, 5).map((rev) => {
            const status = evaluateRevisionStatus(rev);
            return (
              <div
                key={rev.id}
                className="py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-muted-foreground text-xs w-8 shrink-0 font-medium">
                    R{rev.revisionNumber}
                  </span>

                  <span className="font-mono text-xs font-bold text-foreground w-24 shrink-0 truncate">
                    {rev.subject}
                  </span>

                  <div className="min-w-0 flex items-center gap-2">
                    <span className="font-medium text-foreground truncate">
                      {rev.chapterTitle}
                    </span>

                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                        status === 'overdue'
                          ? 'border-rose-500/40 text-rose-600 dark:text-rose-400 bg-rose-500/5'
                          : status === 'due'
                          ? 'border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/5'
                          : 'border-border text-muted-foreground'
                      }`}
                    >
                      {status === 'due'
                        ? 'due today'
                        : status === 'overdue'
                        ? 'overdue'
                        : `due ${rev.scheduledDate}`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0 font-mono text-[11px]">
                  <Link
                    href={`/study?chapter=${rev.chapterId}&mode=review`}
                    className="text-foreground hover:underline"
                  >
                    Review
                  </Link>
                  <span className="text-border">·</span>
                  <button
                    type="button"
                    onClick={() => onCompleteRevision(rev.id, 'strong')}
                    className="text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    ✓ Retained
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
