import { useEffect, useState } from 'react';
import { Award, Sparkles, CheckCircle2, X } from 'lucide-react';
import { AcademicMilestone } from '@/lib/progression/types';
import { getAcademicRankTitle } from '@/lib/progression/levels';

interface AchievementNotification {
  id: string;
  type: 'milestone' | 'levelup';
  title: string;
  subtitle: string;
  xpReward?: number;
  level?: number;
}

export function AcademicMilestoneCelebration() {
  const [notifications, setNotifications] = useState<AchievementNotification[]>([]);

  useEffect(() => {
    const handleAchievement = (e: Event) => {
      const customEvent = e as CustomEvent<{
        awardedXp: number;
        leveledUp: boolean;
        newLevel?: number;
        unlockedMilestones: AcademicMilestone[];
      }>;

      const detail = customEvent.detail;
      if (!detail) return;

      const queue: AchievementNotification[] = [];

      if (detail.leveledUp && detail.newLevel) {
        queue.push({
          id: `levelup-${detail.newLevel}-${Date.now()}`,
          type: 'levelup',
          title: `Academic Advancement: Level ${detail.newLevel}`,
          subtitle: `Achieved rank: ${getAcademicRankTitle(detail.newLevel)}`,
          level: detail.newLevel,
        });
      }

      if (Array.isArray(detail.unlockedMilestones)) {
        for (const m of detail.unlockedMilestones) {
          queue.push({
            id: `milestone-${m.id}-${Date.now()}`,
            type: 'milestone',
            title: m.title,
            subtitle: m.description,
            xpReward: m.xpReward,
          });
        }
      }

      if (queue.length > 0) {
        setNotifications((prev) => [...prev, ...queue]);
      }
    };

    window.addEventListener('backlogos-academic-achievement', handleAchievement);
    return () => {
      window.removeEventListener('backlogos-academic-achievement', handleAchievement);
    };
  }, []);

  const dismiss = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Auto-dismiss individual toasts after 6.5 seconds
  useEffect(() => {
    if (notifications.length === 0) return;
    const timer = setTimeout(() => {
      setNotifications((prev) => prev.slice(1));
    }, 6500);
    return () => clearTimeout(timer);
  }, [notifications]);

  if (notifications.length === 0) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      data-testid="academic-achievement-notifications"
    >
      {notifications.map((item) => (
        <div
          key={item.id}
          className="pointer-events-auto border border-border bg-card/95 backdrop-blur-md shadow-lg p-4 rounded-lg flex items-start gap-3 transition-all animate-in slide-in-from-bottom-5 fade-in duration-300"
        >
          <div className="p-2 rounded bg-foreground text-background shrink-0 mt-0.5">
            {item.type === 'levelup' ? (
              <Sparkles className="h-4 w-4 text-amber-300" />
            ) : (
              <Award className="h-4 w-4 text-emerald-300" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground font-semibold">
                {item.type === 'levelup' ? 'Level Up' : 'Milestone Achieved'}
              </span>
              {item.xpReward && (
                <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded">
                  +{item.xpReward} XP
                </span>
              )}
            </div>

            <h4 className="text-sm font-bold text-foreground tracking-tight mt-0.5 truncate">
              {item.title}
            </h4>

            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
              {item.subtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={() => dismiss(item.id)}
            className="text-muted-foreground hover:text-foreground p-1 transition"
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
