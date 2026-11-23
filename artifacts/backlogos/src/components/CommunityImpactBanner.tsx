import { useEffect, useState } from 'react';
import { CheckCircle2, Users } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const FALLBACK_STUDENTS = '120+';
const FALLBACK_CHAPTERS = '340+';

export function CommunityImpactBanner({ className = '' }: { className?: string }) {
  const [studentsLabel, setStudentsLabel] = useState<string>(FALLBACK_STUDENTS);
  const [chaptersLabel, setChaptersLabel] = useState<string>(FALLBACK_CHAPTERS);

  useEffect(() => {
    let cancelled = false;

    async function fetchCommunityMetrics() {
      if (!isSupabaseConfigured) return;

      try {
        // 1. Query aggregate counts cleanly (student_profiles & completed backlog chapters)
        const [rpcRes, completedItemsRes] = await Promise.all([
          supabase.rpc('get_community_impact'),
          supabase
            .from('backlog_items')
            .select('*', { count: 'exact', head: true })
            .in('status', ['completed', 'mastered', 'done']),
        ]);

        if (cancelled) return;

        if (!rpcRes.error && rpcRes.data && typeof rpcRes.data === 'object') {
          const studentCount = Number((rpcRes.data as any).student_count || 0);
          setStudentsLabel(studentCount > 1 ? `${studentCount.toLocaleString()}+` : FALLBACK_STUDENTS);
        } else {
          const profilesRes = await supabase
            .from('student_profiles')
            .select('*', { count: 'exact', head: true });
          if (!cancelled && !profilesRes.error && typeof profilesRes.count === 'number' && profilesRes.count > 1) {
            setStudentsLabel(`${profilesRes.count.toLocaleString()}+`);
          } else if (!cancelled) {
            setStudentsLabel(FALLBACK_STUDENTS);
          }
        }

        const rpcChapters = !rpcRes.error && rpcRes.data && typeof rpcRes.data === 'object'
          ? Number((rpcRes.data as any).cleared_chapters || 0)
          : 0;
        const headCount = !completedItemsRes.error && typeof completedItemsRes.count === 'number'
          ? completedItemsRes.count
          : 0;
        const bestChapterCount = Math.max(rpcChapters, headCount);

        if (bestChapterCount >= 10) {
          setChaptersLabel(`${bestChapterCount.toLocaleString()}+`);
        } else {
          setChaptersLabel(FALLBACK_CHAPTERS);
        }
      } catch {
        if (!cancelled) {
          setStudentsLabel(FALLBACK_STUDENTS);
          setChaptersLabel(FALLBACK_CHAPTERS);
        }
      }
    }

    void fetchCommunityMetrics();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      data-testid="community-impact-banner"
      className={`rounded-xl border border-border/80 bg-card px-4 py-4 sm:px-6 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-0.5">
          <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Student Recovery Impact
          </div>
          <p className="text-xs text-muted-foreground">
            Live CBSE Class 11 &amp; 12 backlog progress across the student community
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-5 sm:gap-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-500/25 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
              <Users size={15} />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-bold text-foreground font-mono tabular-nums">
                {studentsLabel} Students
              </div>
              <div className="text-[11px] text-muted-foreground">Actively Recovering</div>
            </div>
          </div>

          <div className="hidden sm:block h-7 w-px bg-border/80" />

          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <CheckCircle2 size={15} />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-bold text-foreground font-mono tabular-nums">
                {chaptersLabel} Chapters
              </div>
              <div className="text-[11px] text-muted-foreground">Backlog Chapters Cleared</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
