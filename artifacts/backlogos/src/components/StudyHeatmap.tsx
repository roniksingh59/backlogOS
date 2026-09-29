import { useMemo } from 'react';
import { Flame, Trophy, Award, Calendar, Clock, Zap } from 'lucide-react';
import { readStudySessions, readCompleted, type StudySession } from '@/lib/storage';

interface StudyHeatmapProps {
  sessions?: StudySession[];
  completedCount?: number;
}

export function StudyHeatmap({
  sessions: propSessions,
  completedCount: propCompleted,
}: StudyHeatmapProps) {
  const sessions = propSessions || readStudySessions();
  const completedCount = propCompleted ?? readCompleted().length;

  // Calculate day-by-day minutes map for the last 70 days (10 weeks)
  const { dateMap, streak, longestStreak, totalMinutes, activeDays } = useMemo(() => {
    const map = new Map<string, number>();

    if (Array.isArray(sessions)) {
      sessions.forEach((s) => {
        if (!s) return;
        let dateStr = '';
        if (typeof s.completedAt === 'string' && s.completedAt.includes('T')) {
          dateStr = s.completedAt.split('T')[0];
        } else if (typeof s.completedAt === 'string') {
          dateStr = s.completedAt.trim().slice(0, 10);
        } else if (s.completedAt) {
          try {
            dateStr = new Date(s.completedAt).toISOString().split('T')[0];
          } catch {
            dateStr = '';
          }
        }
        if (!dateStr) return;
        const prev = map.get(dateStr) || 0;
        map.set(dateStr, prev + (Number(s.minutes) || 0));
      });
    }

    let total = 0;
    map.forEach((mins) => {
      total += mins;
    });

    // Calculate current streak
    let currentStreak = 0;
    let maxStreak = 0;
    let tempStreak = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check past 180 days for streaks
    for (let i = 0; i < 180; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().split('T')[0];

      if ((map.get(iso) || 0) > 0) {
        tempStreak++;
        if (i === 0 || i === 1) {
          currentStreak = Math.max(currentStreak, tempStreak);
        }
        if (tempStreak > maxStreak) {
          maxStreak = tempStreak;
        }
      } else {
        if (i > 1 && currentStreak === 0) {
          // streak broken before today/yesterday
        }
        tempStreak = 0;
      }
    }

    return {
      dateMap: map,
      streak: currentStreak,
      longestStreak: Math.max(maxStreak, currentStreak),
      totalMinutes: total,
      activeDays: map.size,
    };
  }, [sessions]);

  // Generate 70 days (10 weeks) array
  const weeks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find the end of the current week (Saturday)
    const endDayOfWeek = today.getDay(); // 0 is Sunday, 6 is Saturday
    const daysUntilEndOfWeek = 6 - endDayOfWeek;
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + daysUntilEndOfWeek);

    // 10 weeks = 70 days
    const totalDays = 70;
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - totalDays + 1);

    const weekList: { date: string; displayDate: string; minutes: number; dayOfWeek: number }[][] = [];
    let currentWeek: { date: string; displayDate: string; minutes: number; dayOfWeek: number }[] = [];

    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      const iso = cursor.toISOString().split('T')[0];
      const mins = dateMap.get(iso) || 0;
      currentWeek.push({
        date: iso,
        displayDate: cursor.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        minutes: mins,
        dayOfWeek: cursor.getDay(),
      });

      if (currentWeek.length === 7) {
        weekList.push(currentWeek);
        currentWeek = [];
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    if (currentWeek.length > 0) {
      weekList.push(currentWeek);
    }

    return weekList;
  }, [dateMap]);

  // Badges logic
  const badges = [
    {
      id: 'first_step',
      name: 'First Spark',
      desc: 'Completed 1st study session',
      unlocked: sessions.length >= 1,
      icon: Zap,
    },
    {
      id: 'hour_power',
      name: 'Hour of Power',
      desc: 'Logged 60+ mins in single day',
      unlocked: Array.from(dateMap.values()).some((m) => m >= 60),
      icon: Clock,
    },
    {
      id: 'streak_3',
      name: '3-Day Momentum',
      desc: 'Achieved a 3-day study streak',
      unlocked: longestStreak >= 3,
      icon: Flame,
    },
    {
      id: 'slayer',
      name: 'Backlog Slayer',
      desc: 'Finished 3+ complete chapters',
      unlocked: completedCount >= 3,
      icon: Trophy,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top metrics row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex items-center gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/10 text-amber-500">
            <Flame size={20} className={streak > 0 ? 'animate-bounce' : ''} />
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight text-foreground">{streak} Days</div>
            <div className="text-[11px] font-medium text-muted-foreground">Current Streak</div>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <Clock size={20} />
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight text-foreground">
              {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
            </div>
            <div className="text-[11px] font-medium text-muted-foreground">Total Focus Time</div>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-500">
            <Calendar size={20} />
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight text-foreground">{activeDays} Days</div>
            <div className="text-[11px] font-medium text-muted-foreground">Active Study Days</div>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-purple-500/10 text-purple-500">
            <Trophy size={20} />
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight text-foreground">{longestStreak} Days</div>
            <div className="text-[11px] font-medium text-muted-foreground">Best Streak</div>
          </div>
        </div>
      </div>

      {/* Heatmap Card */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
              <Calendar size={16} className="text-primary" />
              Study Consistency Heatmap
            </h3>
            <p className="text-xs text-muted-foreground">
              Your daily learning and backlog recovery effort over the last 10 weeks
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span>Less</span>
            <span className="h-2.5 w-2.5 rounded-xs bg-muted" />
            <span className="h-2.5 w-2.5 rounded-xs bg-emerald-300 dark:bg-emerald-900" />
            <span className="h-2.5 w-2.5 rounded-xs bg-emerald-400 dark:bg-emerald-700" />
            <span className="h-2.5 w-2.5 rounded-xs bg-emerald-500 dark:bg-emerald-500" />
            <span className="h-2.5 w-2.5 rounded-xs bg-emerald-600 dark:bg-emerald-300" />
            <span>More</span>
          </div>
        </div>

        {/* Heatmap grid */}
        <div className="mt-4 overflow-x-auto pb-2">
          <div className="flex min-w-[500px] gap-1.5 justify-between">
            {weeks.map((week, wIndex) => (
              <div key={wIndex} className="flex flex-col gap-1.5">
                {week.map((day) => {
                  let colorClass = 'bg-muted/80 hover:ring-1 hover:ring-border';
                  if (day.minutes > 90) {
                    colorClass = 'bg-emerald-600 text-white dark:bg-emerald-400';
                  } else if (day.minutes >= 50) {
                    colorClass = 'bg-emerald-500 text-white dark:bg-emerald-500';
                  } else if (day.minutes >= 25) {
                    colorClass = 'bg-emerald-400 text-white dark:bg-emerald-700';
                  } else if (day.minutes > 0) {
                    colorClass = 'bg-emerald-300 dark:bg-emerald-900';
                  }

                  return (
                    <div
                      key={day.date}
                      title={`${day.displayDate}: ${day.minutes} mins studied`}
                      className={`group relative h-3.5 w-3.5 rounded-xs transition cursor-pointer ${colorClass}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
            <span>10 weeks ago</span>
            <span>5 weeks ago</span>
            <span>This week</span>
          </div>
        </div>
      </div>

      {/* Consistency Milestones Badges */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
        <h3 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2 mb-3">
          <Award size={16} className="text-amber-500" />
          Milestones & Consistency Badges
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {badges.map((b) => {
            const Icon = b.icon;
            return (
              <div
                key={b.id}
                className={`flex flex-col items-center justify-center rounded-xl border p-3.5 text-center transition ${
                  b.unlocked
                    ? 'border-amber-500/30 bg-amber-500/5 text-foreground'
                    : 'border-border/60 bg-muted/20 opacity-50'
                }`}
              >
                <div
                  className={`grid h-9 w-9 place-items-center rounded-full mb-2 ${
                    b.unlocked ? 'bg-amber-500 text-white shadow-xs' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <Icon size={17} />
                </div>
                <span className="text-xs font-bold leading-tight">{b.name}</span>
                <span className="mt-1 text-[10px] text-muted-foreground leading-tight">{b.desc}</span>
                <span
                  className={`mt-2 rounded-full px-2 py-0.5 text-[9px] font-semibold ${
                    b.unlocked
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {b.unlocked ? 'Unlocked' : 'In Progress'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
