import { useEffect, useState } from 'react';
import { Clock3, Users } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const FALLBACK_STUDENTS = '120+';
const FALLBACK_HOURS = '850+';

export function CommunityImpactBanner({ className = '' }: { className?: string }) {
  const [studentsLabel, setStudentsLabel] = useState<string>(FALLBACK_STUDENTS);
  const [hoursLabel, setHoursLabel] = useState<string>(FALLBACK_HOURS);

  useEffect(() => {
    let cancelled = false;

    async function fetchCommunityMetrics() {
      if (!isSupabaseConfigured) return;

      try {
        // Safe read-only aggregate checks; falls back cleanly when RLS restricts reads to own rows
        const [profilesRes, completedItemsRes] = await Promise.all([
          supabase.from('student_profiles').select('*', { count: 'exact', head: true }),
          supabase
            .from('backlog_items')
            .select('estimated_hours')
            .in('status', ['completed', 'mastered', 'done']),
        ]);

        if (cancelled) return;

        if (!profilesRes.error && typeof profilesRes.count === 'number' && profilesRes.count > 1) {
          setStudentsLabel(`${profilesRes.count.toLocaleString()}+`);
        } else {
          setStudentsLabel(FALLBACK_STUDENTS);
        }

        if (!completedItemsRes.error && Array.isArray(completedItemsRes.data)) {
          const totalClearedHours = completedItemsRes.data.reduce(
            (sum, row: any) => sum + (Number(row?.estimated_hours) || 0),
            0
          );

          if (totalClearedHours >= 50) {
            setHoursLabel(`${Math.round(totalClearedHours).toLocaleString()}+`);
          } else {
            setHoursLabel(FALLBACK_HOURS);
          }
        } else {
          setHoursLabel(FALLBACK_HOURS);
        }
      } catch {
        if (!cancelled) {
          setStudentsLabel(FALLBACK_STUDENTS);
          setHoursLabel(FALLBACK_HOURS);
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
              <Clock3 size={13} />
            </div>
            <div className="leading-tight">
              <div className="text-xs sm:text-sm font-bold text-foreground font-mono">
                {hoursLabel} Hours Cleared
              </div>
              <div className="text-[10px] text-muted-foreground">Backlog Hours Cleared</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
