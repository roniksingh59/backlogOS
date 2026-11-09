import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, isSupabaseConfigured, getActiveUserId } from '@/lib/supabase';
import { chapters, type Subject } from '@/lib/backlog-data';
import { readBacklogItems } from '@/lib/storage';
import { BookOpen, Layers, Loader2, Sparkles } from 'lucide-react';

export interface FetchedChapterData {
  chapterId: string;
  chapterTitle: string;
  subject: string;
  backlogItems: any[];
  resources: any[];
  notes?: string;
  masteryPercentage: number;
}

interface ChapterFilterSelectProps {
  selectedChapterId?: string;
  onChapterSelect: (chapterId: string, chapterData?: FetchedChapterData) => void;
  className?: string;
  showSubjectSelector?: boolean;
}

export function ChapterFilterSelect({
  selectedChapterId: propSelectedChapterId,
  onChapterSelect,
  className = '',
  showSubjectSelector = true,
}: ChapterFilterSelectProps) {
  const [activeSubject, setActiveSubject] = useState<Subject>('Physics');
  const [activeChapterId, setActiveChapterId] = useState<string>(
    propSelectedChapterId || chapters[0].id
  );
  const [loading, setLoading] = useState(false);
  const [fetchedData, setFetchedData] = useState<FetchedChapterData | null>(null);

  // Keep in sync with incoming prop if controlled
  useEffect(() => {
    if (propSelectedChapterId && propSelectedChapterId !== activeChapterId) {
      setActiveChapterId(propSelectedChapterId);
      const ch = chapters.find((c) => c.id === propSelectedChapterId);
      if (ch) setActiveSubject(ch.subject);
    }
  }, [propSelectedChapterId]);

  // Clean lifecycle refetch from Supabase using .eq('chapter_id', selectedChapterId)
  const fetchChapterDataFromSupabase = useCallback(
    async (chapterId: string) => {
      setLoading(true);
      const chInfo = chapters.find((c) => c.id === chapterId) || {
        id: chapterId,
        title: chapterId,
        subject: activeSubject,
      };

      try {
        let backlogData: any[] = [];
        let resourcesData: any[] = [];

        if (isSupabaseConfigured) {
          const userId = getActiveUserId();
          // 1. Fetch backlog items matching this exact chapter_id
          const { data: bData, error: bError } = await supabase
            .from('backlog_items')
            .select('*')
            .eq('chapter_id', chapterId);

          if (!bError && bData) {
            backlogData = bData;
          }

          // 2. Fetch resources for this chapter_id
          const { data: rData, error: rError } = await supabase
            .from('user_resources')
            .select('*')
            .eq('chapter_id', chapterId);

          if (!rError && rData) {
            resourcesData = rData;
          }
        }

        // If no remote records yet, merge with local storage items for this chapter
        if (backlogData.length === 0) {
          const localItems = readBacklogItems();
          backlogData = localItems.filter((item) => item.chapterId === chapterId);
        }

        const completedCount = backlogData.filter(
          (i) => i.status === 'completed' || i.status === 'mastered'
        ).length;
        const mastery =
          backlogData.length > 0
            ? Math.round((completedCount / backlogData.length) * 100)
            : 0;

        const result: FetchedChapterData = {
          chapterId,
          chapterTitle: chInfo.title,
          subject: chInfo.subject,
          backlogItems: backlogData,
          resources: resourcesData,
          masteryPercentage: mastery,
        };

        setFetchedData(result);
        onChapterSelect(chapterId, result);
      } catch (err) {
        console.warn('[ChapterFilterSelect] Supabase fetch error, fallback to local:', err);
        const localItems = readBacklogItems().filter((item) => item.chapterId === chapterId);
        const result: FetchedChapterData = {
          chapterId,
          chapterTitle: chInfo.title,
          subject: chInfo.subject,
          backlogItems: localItems,
          resources: [],
          masteryPercentage: 0,
        };
        setFetchedData(result);
        onChapterSelect(chapterId, result);
      } finally {
        setLoading(false);
      }
    },
    [activeSubject, onChapterSelect]
  );

  // Trigger refetch whenever activeChapterId changes
  useEffect(() => {
    fetchChapterDataFromSupabase(activeChapterId);
  }, [activeChapterId, fetchChapterDataFromSupabase]);

  // Filter chapters by selected subject
  const subjectChapters = useMemo(() => {
    return chapters.filter((c) => c.subject === activeSubject);
  }, [activeSubject]);

  // State handler for Subject dropdown
  const handleSubjectChange = (newSubject: Subject) => {
    setActiveSubject(newSubject);
    const firstChapterOfSubject = chapters.find((c) => c.subject === newSubject);
    if (firstChapterOfSubject) {
      setActiveChapterId(firstChapterOfSubject.id);
    }
  };

  // State handler for Chapter dropdown - removes hardcoded fallbacks
  const handleChapterChange = (newChapterId: string) => {
    setActiveChapterId(newChapterId);
  };

  return (
    <div className={`space-y-2 ${className}`} data-testid="chapter-filter-select">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
        {showSubjectSelector && (
          <div>
            <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block mb-1">
              Select Subject
            </label>
            <select
              value={activeSubject}
              onChange={(e) => handleSubjectChange(e.target.value as Subject)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:ring-1 focus:ring-primary focus:outline-hidden"
              data-testid="select-filter-subject"
            >
              <option value="Physics">Physics</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Mathematics">Mathematics</option>
            </select>
          </div>
        )}

        <div className={showSubjectSelector ? '' : 'sm:col-span-2'}>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
              Filter by Chapter
            </label>
            {loading && (
              <span className="flex items-center gap-1 text-[10px] text-sky-500 animate-pulse">
                <Loader2 size={10} className="animate-spin" /> Fetching...
              </span>
            )}
          </div>
          <select
            value={activeChapterId}
            onChange={(e) => handleChapterChange(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:ring-1 focus:ring-primary focus:outline-hidden"
            data-testid="select-filter-chapter"
          >
            {subjectChapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.order}. {c.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Filter Confirmation Status */}
      {fetchedData && (
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded bg-muted/40 border border-border/60 text-[11px] font-mono text-muted-foreground">
          <span className="flex items-center gap-1.5 truncate">
            <BookOpen size={12} className="text-primary shrink-0" />
            <strong className="text-foreground">{fetchedData.chapterTitle}</strong>
          </span>
          <span className="shrink-0 text-[10px] font-semibold text-primary">
            {fetchedData.backlogItems.length} Backlog Item
            {fetchedData.backlogItems.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
}
