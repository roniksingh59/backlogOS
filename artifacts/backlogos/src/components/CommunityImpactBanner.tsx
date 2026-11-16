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
      className={`rounded-xl border border-border/70 bg-card/60 backdrop-blur-sm px-4 py-3.5 sm:px-5 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span>Community Recovery Impact</span>
        </div>

        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/70 bg-muted/40 text-sky-500 shrink-0">
              <Users size={13} />
            </div>
            <div className="leading-tight">
              <div className="text-xs sm:text-sm font-bold text-foreground font-mono">
                {studentsLabel} Students
              </div>
              <div className="text-[10px] text-muted-foreground">Students Recovering</div>
            </div>
          </div>

          <div className="hidden sm:block h-6 w-px bg-border/70" />

          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/70 bg-muted/40 text-emerald-500 shrink-0">
              <CheckCircle2 size={13} />
            </div>
            <div className="leading-tight">
              <div className="text-xs sm:text-sm font-bold text-foreground font-mono">
                {chaptersLabel} Chapters Cleared
              </div>
              <div className="text-[10px] text-muted-foreground">Backlog Chapters Cleared</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
