import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Flame,
  HelpCircle,
  ChevronDown,
  Sparkles,
  BookOpen,
  Filter,
  AlertTriangle,
  Play,
  X,
} from 'lucide-react';
import {
  getChapterSubtopics,
  readClearedSubtopics,
  saveClearedSubtopic,
  type NCERTSubtopic,
} from '@/lib/ncert-subtopics';
import { ResourceDiscoverySection } from '@/components/resources/ResourceDiscoverySection';
import { useAuth } from '@/lib/auth-context';
import { saveWorkspaceStateDirect } from '@/lib/supabase-service';

interface ChapterTopicsInlineProps {
  chapterId: string;
  chapterTitle: string;
  subject?: string;
  filterHighYield?: boolean;
  onAskBax?: (subtopicTitle: string) => void;
  onClearedChange?: (clearedCount: number, totalCount: number) => void;
}

export function ChapterTopicsInline({
  chapterId,
  chapterTitle,
  subject,
  filterHighYield = false,
  onAskBax,
  onClearedChange,
}: ChapterTopicsInlineProps) {
  const { user } = useAuth();
  const userId = user?.uid;
  const subtopics = getChapterSubtopics(chapterId);
  const [clearedData, setClearedData] = useState<Record<string, string[]>>(() =>
    readClearedSubtopics(userId)
  );
  const [expandedSubtopicId, setExpandedSubtopicId] = useState<string | null>(null);
  const [activeVideoTopic, setActiveVideoTopic] = useState<string | null>(null);

  useEffect(() => {
    setClearedData(readClearedSubtopics(userId));
    const onSubtopicsUpdate = () => setClearedData(readClearedSubtopics(userId));
    window.addEventListener('backlogos-subtopics-updated', onSubtopicsUpdate);
    window.addEventListener('storage', onSubtopicsUpdate);
    return () => {
      window.removeEventListener('backlogos-subtopics-updated', onSubtopicsUpdate);
      window.removeEventListener('storage', onSubtopicsUpdate);
    };
  }, [userId]);

  const clearedList = clearedData[chapterId] || [];
  const clearedSet = new Set(clearedList);

  const filteredSubtopics = filterHighYield
    ? subtopics.filter((s) => s.highYield)
    : subtopics;

  const handleToggle = (subtopicId: string) => {
    const isCurrentlyCleared = clearedSet.has(subtopicId);
    const updated = saveClearedSubtopic(chapterId, subtopicId, !isCurrentlyCleared, userId);
    setClearedData({ ...updated });
    if (user?.uid && !user.isGuest) {
      saveWorkspaceStateDirect({ clearedSubtopics: updated }, user.uid).catch((err) =>
        console.warn('[ChapterSubtopicsCard] saveWorkspaceStateDirect subtopics error:', err)
      );
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('backlogos-subtopics-updated'));
    }
    if (onClearedChange) {
      const nextList = updated[chapterId] || [];
      const nextClearedCount = nextList.filter((id) =>
        subtopics.some((s) => s.id === id)
      ).length;
      onClearedChange(nextClearedCount, subtopics.length);
    }
  };

  return (
    <>
      <div className="divide-y divide-border/60" data-testid={`inline-topics-${chapterId}`}>
        {filteredSubtopics.length === 0 ? (
          <p className="py-3 text-xs sm:text-[13px] text-muted-foreground">
            No high-yield topics marked in this chapter — toggle off the filter to view all {subtopics.length} topics.
          </p>
        ) : (
          filteredSubtopics.map((subtopic) => {
            const isDone = clearedSet.has(subtopic.id);
            const isExpanded = expandedSubtopicId === subtopic.id;

            return (
              <div
                key={subtopic.id}
                className={`py-3 first:pt-1.5 last:pb-1.5 transition-colors ${
                  isDone ? 'opacity-80' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => handleToggle(subtopic.id)}
                    className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition cursor-pointer ${
                      isDone
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-border bg-background hover:border-indigo-500'
                    }`}
                    aria-label={isDone ? 'Mark topic incomplete' : 'Mark topic studied'}
                    data-testid={`checkbox-subtopic-${subtopic.id}`}
                  >
                    {isDone ? (
                      <CheckCircle2 size={12} strokeWidth={2.5} />
                    ) : (
                      <Circle size={8} className="text-muted-foreground/35" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                      <span className="font-mono text-xs font-semibold text-muted-foreground tabular-nums">
                        {subtopic.code}
                      </span>
                      <span
                        className={`text-[13px] font-semibold leading-snug ${
                          isDone ? 'line-through text-muted-foreground' : 'text-foreground'
                        }`}
                      >
                        {subtopic.title}
                      </span>
                      {subtopic.highYield && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                          <Flame size={11} />
                          <span>High-Yield</span>
                        </span>
                      )}
                      {isDone && (
                        <span className="text-[11px] font-medium text-blue-700 dark:text-blue-400">
                          Studied
                        </span>
                      )}
                    </div>

                    {subtopic.coreConcepts && subtopic.coreConcepts.length > 0 && (
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        {subtopic.coreConcepts.join(' · ')}
                      </p>
                    )}

                    {isExpanded && (
                      <div className="mt-3 space-y-2.5 border-t border-border/60 pt-3 text-xs animate-in fade-in duration-150">
                        <div>
                          <span className="font-mono font-semibold text-[11px] uppercase text-indigo-700 dark:text-indigo-400 tracking-wider">
                            Key Concepts
                          </span>
                          <ul className="mt-1.5 list-disc pl-4 space-y-1 text-foreground/80 text-xs leading-relaxed">
                            {subtopic.coreConcepts.map((concept, idx) => (
                              <li key={idx}>{concept}</li>
                            ))}
                          </ul>
                        </div>

                        {subtopic.keyFormula && (
                          <div className="rounded-lg bg-muted/40 border border-border/70 p-2.5 font-mono text-xs text-indigo-700 dark:text-indigo-300">
                            <span className="text-[11px] uppercase text-muted-foreground font-sans block mb-0.5 font-medium">
                              Key Equation
                            </span>
                            <code>{subtopic.keyFormula}</code>
                          </div>
                        )}

                        {subtopic.trapNote && (
                          <div className="flex items-start gap-2 rounded-lg bg-rose-500/6 border border-rose-500/20 p-2.5 text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
                            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                            <span>
                              <strong>Exam Trap:</strong> {subtopic.trapNote}
                            </span>
                          </div>
                        )}

                        <div className="pt-1 flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setActiveVideoTopic(subtopic.title)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/6 hover:bg-indigo-500/12 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 text-xs font-semibold transition cursor-pointer whitespace-nowrap"
                          >
                            <Play size={12} className="fill-current" />
                            <span>Watch Videos</span>
                          </button>

                          {onAskBax && (
                            <button
                              type="button"
                              onClick={() => onAskBax(`${chapterTitle}: ${subtopic.title}`)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 text-xs font-semibold transition cursor-pointer whitespace-nowrap"
                            >
                              <Sparkles size={12} />
                              <span>Ask Bax</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setExpandedSubtopicId(isExpanded ? null : subtopic.id)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer shrink-0"
                    aria-label={isExpanded ? 'Collapse topic details' : 'Expand topic details'}
                  >
                    <ChevronDown
                      size={14}
                      className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {activeVideoTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-5">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-primary font-bold">
                  Topic Video Discovery
                </span>
                <h3 className="text-base sm:text-lg font-bold text-foreground">
                  {activeVideoTopic}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveVideoTopic(null)}
                className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
                aria-label="Close topic video discovery"
              >
                <X size={16} />
              </button>
            </div>
            <ResourceDiscoverySection
              chapterId={chapterId}
              chapterTitle={chapterTitle}
              subject={subject}
              initialTopic={activeVideoTopic}
            />
          </div>
        </div>
      )}
    </>
  );
}

interface ChapterSubtopicsCardProps {
  chapterId: string;
  chapterTitle: string;
  subject?: string;
  compact?: boolean;
  onAskBax?: (subtopicTitle: string) => void;
}

export function ChapterSubtopicsCard({
  chapterId,
  chapterTitle,
  subject,
  compact = false,
  onAskBax,
}: ChapterSubtopicsCardProps) {
  const { user } = useAuth();
  const userId = user?.uid;
  const subtopics = getChapterSubtopics(chapterId);
  const [clearedData, setClearedData] = useState<Record<string, string[]>>(() =>
    readClearedSubtopics(userId)
  );
  const [filterHighYield, setFilterHighYield] = useState(false);

  useEffect(() => {
    setClearedData(readClearedSubtopics(userId));
    const onSubtopicsUpdate = () => setClearedData(readClearedSubtopics(userId));
    window.addEventListener('backlogos-subtopics-updated', onSubtopicsUpdate);
    window.addEventListener('storage', onSubtopicsUpdate);
    return () => {
      window.removeEventListener('backlogos-subtopics-updated', onSubtopicsUpdate);
      window.removeEventListener('storage', onSubtopicsUpdate);
    };
  }, [userId]);

  const clearedList = clearedData[chapterId] || [];
  const totalCount = subtopics.length;
  const clearedCount = clearedList.filter((id) => subtopics.some((s) => s.id === id)).length;
  const progressPct = totalCount > 0 ? Math.round((clearedCount / totalCount) * 100) : 0;

  return (
    <div className={`rounded-2xl border border-border bg-card transition-all ${compact ? 'p-4' : 'p-5 sm:p-6'}`}>
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-mono text-primary font-semibold">
            <span className="inline-flex items-center gap-1">
              <BookOpen size={11} />
              <span>NCERT Subtopics Breakdown</span>
            </span>
            {clearedCount === totalCount && totalCount > 0 && (
              <>
                <span className="text-muted-foreground">·</span>
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={11} />
                  <span>100% Cleared</span>
                </span>
              </>
            )}
          </div>
          <h3 className="mt-1 font-display text-base font-bold text-foreground">
            Clear Backlog Topic-by-Topic
          </h3>
          <p className="text-xs text-muted-foreground tabular-nums">
            {chapterTitle} · {clearedCount} of {totalCount} topics mastered ({progressPct}%)
          </p>
        </div>

        {/* Filter & Progress Meter */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setFilterHighYield(!filterHighYield)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition cursor-pointer whitespace-nowrap ${
              filterHighYield
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                : 'border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            <Flame size={12} className={filterHighYield ? 'text-amber-500' : 'text-muted-foreground'} />
            <span>High-Yield Only</span>
          </button>

          <div className="hidden sm:flex flex-col items-end">
            <span className="font-mono tabular-nums text-xs font-bold text-foreground">
              {progressPct}%
            </span>
            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar (Mobile) */}
      <div className="mt-3 sm:hidden h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="mt-4">
        <ChapterTopicsInline
          chapterId={chapterId}
          chapterTitle={chapterTitle}
          subject={subject}
          filterHighYield={filterHighYield}
          onAskBax={onAskBax}
          onClearedChange={() => setClearedData({ ...readClearedSubtopics(userId) })}
        />
      </div>
    </div>
  );
}
