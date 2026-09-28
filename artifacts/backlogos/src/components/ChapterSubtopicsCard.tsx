import { useState } from 'react';
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
  const subtopics = getChapterSubtopics(chapterId);
  const [clearedData, setClearedData] = useState<Record<string, string[]>>(() => readClearedSubtopics());
  const [filterHighYield, setFilterHighYield] = useState(false);
  const [expandedSubtopicId, setExpandedSubtopicId] = useState<string | null>(null);
  const [activeVideoTopic, setActiveVideoTopic] = useState<string | null>(null);

  const clearedList = clearedData[chapterId] || [];
  const clearedSet = new Set(clearedList);

  const filteredSubtopics = filterHighYield
    ? subtopics.filter((s) => s.highYield)
    : subtopics;

  const totalCount = subtopics.length;
  const clearedCount = clearedList.filter((id) => subtopics.some((s) => s.id === id)).length;
  const progressPct = totalCount > 0 ? Math.round((clearedCount / totalCount) * 100) : 0;

  const handleToggle = (subtopicId: string) => {
    const isCurrentlyCleared = clearedSet.has(subtopicId);
    const updated = saveClearedSubtopic(chapterId, subtopicId, !isCurrentlyCleared);
    setClearedData({ ...updated });
  };

  return (
    <div className={`rounded-2xl border border-border bg-card transition-all ${compact ? 'p-4' : 'p-5 sm:p-6'}`}>
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary">
              <BookOpen size={11} />
              <span>NCERT Subtopics Breakdown</span>
            </span>
            {clearedCount === totalCount && totalCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={11} />
                <span>100% Cleared!</span>
              </span>
            )}
          </div>
          <h3 className="mt-1 font-display text-base font-bold text-foreground">
            Clear Backlog Topic-by-Topic
          </h3>
          <p className="text-xs text-muted-foreground">
            {chapterTitle} · {clearedCount} of {totalCount} topics mastered ({progressPct}%)
          </p>
        </div>

        {/* Filter & Progress Meter */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setFilterHighYield(!filterHighYield)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-medium transition ${
              filterHighYield
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-500'
                : 'border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            <Flame size={12} className={filterHighYield ? 'text-amber-500' : 'text-muted-foreground'} />
            <span>High-Yield Only</span>
          </button>

          <div className="hidden sm:flex flex-col items-end">
            <span className="font-mono text-xs font-bold text-foreground">{progressPct}%</span>
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

      {/* List of Subtopics */}
      <div className="mt-4 space-y-2">
        {filteredSubtopics.map((subtopic) => {
          const isDone = clearedSet.has(subtopic.id);
          const isExpanded = expandedSubtopicId === subtopic.id;

          return (
            <div
              key={subtopic.id}
              className={`rounded-xl border transition-all ${
                isDone
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : 'border-border/70 bg-background/60 hover:border-primary/40'
              }`}
            >
              <div className="flex items-start gap-3 p-3">
                {/* Checkbox */}
                <button
                  type="button"
                  onClick={() => handleToggle(subtopic.id)}
                  className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-lg border transition ${
                    isDone
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : 'border-muted-foreground/40 bg-card hover:border-primary'
                  }`}
                  aria-label={isDone ? 'Mark as incomplete' : 'Mark as cleared'}
                >
                  {isDone ? <CheckCircle2 size={13} strokeWidth={2.5} /> : <Circle size={10} className="text-muted-foreground/30" />}
                </button>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-[10px] font-bold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                      {subtopic.code}
                    </span>
                    <span className={`text-xs font-semibold ${isDone ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      {subtopic.title}
                    </span>
                    {subtopic.highYield && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-500">
                        <Flame size={10} />
                        <span>High-Yield</span>
                      </span>
                    )}
                  </div>

                  {/* Core concept preview */}
                  {subtopic.coreConcepts && subtopic.coreConcepts.length > 0 && (
                    <p className="mt-1 text-[11px] text-muted-foreground line-clamp-1">
                      {subtopic.coreConcepts.join(' · ')}
                    </p>
                  )}

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="mt-3 space-y-2 rounded-lg bg-card/80 border border-border/60 p-3 text-xs animate-in fade-in-50 duration-150">
                      <div>
                        <span className="font-bold text-[10px] uppercase text-primary tracking-wider">Key Concepts:</span>
                        <ul className="mt-1 list-disc pl-4 space-y-0.5 text-muted-foreground text-[11px]">
                          {subtopic.coreConcepts.map((concept, idx) => (
                            <li key={idx}>{concept}</li>
                          ))}
                        </ul>
                      </div>

                      {subtopic.keyFormula && (
                        <div className="rounded-lg bg-muted/50 p-2 font-mono text-[11px] text-primary">
                          <span className="text-[10px] uppercase text-muted-foreground font-sans block mb-0.5">Key Equation:</span>
                          <code>{subtopic.keyFormula}</code>
                        </div>
                      )}

                      {subtopic.trapNote && (
                        <div className="flex items-start gap-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 p-2 text-[11px] text-rose-600 dark:text-rose-400">
                          <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                          <span><strong>Exam Trap:</strong> {subtopic.trapNote}</span>
                        </div>
                      )}

                      <div className="pt-1 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveVideoTopic(subtopic.title)}
                          className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary px-2.5 py-1 text-[11px] font-semibold transition"
                        >
                          <Play size={11} className="fill-current" />
                          <span>Watch Videos</span>
                        </button>

                        {onAskBax && (
                          <button
                            type="button"
                            onClick={() => onAskBax(`${chapterTitle}: ${subtopic.title}`)}
                            className="inline-flex items-center gap-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary px-2.5 py-1 text-[11px] font-semibold transition"
                          >
                            <Sparkles size={11} />
                            <span>Ask Bax</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Expand / Collapse Button */}
                <button
                  type="button"
                  onClick={() => setExpandedSubtopicId(isExpanded ? null : subtopic.id)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition"
                  aria-label={isExpanded ? 'Collapse' : 'Expand'}
                >
                  <ChevronDown size={14} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal for topic-specific video discovery */}
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
                className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
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
    </div>
  );
}
