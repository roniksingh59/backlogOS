import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, isSupabaseConfigured, getActiveUserId, isValidUUID } from '@/lib/supabase';
import { fetchCloudBacklogItemsRaw } from '@/lib/supabase-service';
import { readBacklogItems, readPlan, readCompleted, getPlanChapterIdSet } from '@/lib/storage';
import { resolveChapterById } from '@/lib/backlog-data';
import { computeRecoveryProgressSummary } from '@/lib/backlog-items';

export interface BacklogMetricItem {
  id: string;
  chapter_id: string;
  subject_id?: string;
  topic: string;
  estimated_hours: number;
  hours_spent: number;
  status: string; // 'pending' | 'incomplete' | 'not_started' | 'in_progress' | 'completed'
  difficulty?: string;
  confidence?: string;
  exam_relevance?: string;
}

export interface BacklogMetricsResult {
  remainingBacklogHours: number;
  totalBacklogHours: number;
  completedBacklogHours: number;
  pendingItemsCount: number;
  completedItemsCount: number;
  totalItemsCount: number;
  chapterProgressPercent: number;
  recoveryCompletedMinutes: number;
  recoveryTotalMinutes: number;
  recoveryCompletedTasks: number;
  recoveryTotalTasks: number;
  items: BacklogMetricItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const roundHours = (v: number) => Math.round(v * 100) / 100;

/**
 * Robust calculation hook that aggregates chapter & recovery completion metrics
 * from Supabase (backlog_items + workspace_state mirror) and local storage fallbacks.
 */
export function useBacklogMetrics(userId?: string): BacklogMetricsResult {
  const effectiveUserId = userId || getActiveUserId();
  const [items, setItems] = useState<BacklogMetricItem[]>([]);
  const [completionRevision, setCompletionRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Query merged cloud backlog (backlog_items table + workspace_state mirror)
      if (isSupabaseConfigured && effectiveUserId && isValidUUID(effectiveUserId)) {
        const { items: cloudItems, fromCloud } = await fetchCloudBacklogItemsRaw(effectiveUserId);

        if (fromCloud && cloudItems.length > 0) {
          const mapped: BacklogMetricItem[] = cloudItems.map((i) => ({
            id: i.id,
            chapter_id: i.chapterId,
            subject_id: i.subject,
            topic: i.topic,
            estimated_hours: Number(i.estimatedHours || 0),
            hours_spent: Number(i.hoursSpent || 0),
            status: String(i.status || 'pending').toLowerCase(),
            difficulty: i.difficulty,
            confidence: i.confidence,
            exam_relevance: i.examRelevance,
          }));
          setItems(mapped);
          setCompletionRevision((r) => r + 1);
          setLoading(false);
          return;
        }
      }

      // 2. Fall back to local storage items scoped to effectiveUserId
      const local = readBacklogItems(effectiveUserId);
      const mappedLocal: BacklogMetricItem[] = (local || []).map((i) => ({
        id: i.id,
        chapter_id: i.chapterId,
        subject_id: i.subject,
        topic: i.topic,
        estimated_hours: Number(i.estimatedHours || 0),
        hours_spent: Number(i.hoursSpent || 0),
        status: String(i.status || 'pending').toLowerCase(),
        difficulty: i.difficulty,
        confidence: i.confidence,
        exam_relevance: i.examRelevance,
      }));

      setItems(mappedLocal);
      setCompletionRevision((r) => r + 1);
      setLoading(false);
    } catch (err: any) {
      console.warn('[useBacklogMetrics] Error fetching backlog items:', err);
      setError(err?.message || 'Could not load backlog metrics');
      const fallbackLocal = readBacklogItems(effectiveUserId);
      setItems(
        (fallbackLocal || []).map((i) => ({
          id: i.id,
          chapter_id: i.chapterId,
          subject_id: i.subject,
          topic: i.topic,
          estimated_hours: Number(i.estimatedHours || 0),
          hours_spent: Number(i.hoursSpent || 0),
          status: String(i.status || 'pending').toLowerCase(),
          difficulty: i.difficulty,
          confidence: i.confidence,
          exam_relevance: i.examRelevance,
        }))
      );
      setCompletionRevision((r) => r + 1);
      setLoading(false);
    }
  }, [effectiveUserId]);

  useEffect(() => {
    fetchItems();

    // Set up Supabase Realtime subscription for instantaneous sync
    let channel: any = null;
    if (isSupabaseConfigured && effectiveUserId && isValidUUID(effectiveUserId)) {
      try {
        channel = supabase
          .channel(`backlog_metrics_${effectiveUserId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'backlog_items',
              filter: `user_id=eq.${effectiveUserId}`,
            },
            () => {
              fetchItems();
            }
          )
          .subscribe();
      } catch (subErr) {
        console.warn('[useBacklogMetrics] Realtime subscription notice:', subErr);
      }
    }

    // Window event listeners for local actions (instant optimistic updates)
    const handleLocalUpdate = () => {
      fetchItems();
    };
    const handleCompletionUpdate = () => {
      setCompletionRevision((r) => r + 1);
    };

    window.addEventListener('backlogos-backlog-updated', handleLocalUpdate);
    window.addEventListener('backlogos-plan-updated', handleLocalUpdate);
    window.addEventListener('backlogos-plans-updated', handleLocalUpdate);
    window.addEventListener('backlogos-completed-updated', handleCompletionUpdate);
    window.addEventListener('storage', handleLocalUpdate);

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      window.removeEventListener('backlogos-backlog-updated', handleLocalUpdate);
      window.removeEventListener('backlogos-plan-updated', handleLocalUpdate);
      window.removeEventListener('backlogos-plans-updated', handleLocalUpdate);
      window.removeEventListener('backlogos-completed-updated', handleCompletionUpdate);
      window.removeEventListener('storage', handleLocalUpdate);
    };
  }, [fetchItems, effectiveUserId]);

  // Precise mathematical calculations linking Recovery Route task durations & backlog items scoped to the active plan
  const calculations = useMemo(() => {
    const plan = readPlan(effectiveUserId);
    const planChapterIds = getPlanChapterIdSet(plan);
    const completedIds = readCompleted(effectiveUserId);
    const completedSet = new Set(completedIds);
    const recovery = computeRecoveryProgressSummary(plan, completedIds);
    const matchedRecoveryChapters = new Set<string>();

    // Scope backlog items to the active plan's chapters if the plan defines chapters
    const scopedItems: BacklogMetricItem[] = (() => {
      if (planChapterIds.size === 0) return items;
      const byChapter = new Map<string, BacklogMetricItem>();
      for (const item of items) {
        if (item.chapter_id && planChapterIds.has(item.chapter_id)) {
          byChapter.set(item.chapter_id, item);
        }
      }
      for (const chId of planChapterIds) {
        if (!byChapter.has(chId)) {
          const resolved = resolveChapterById(chId);
          if (resolved) {
            byChapter.set(chId, {
              id: `item-${chId}`,
              chapter_id: chId,
              subject_id: resolved.subject,
              topic: resolved.title,
              estimated_hours: 5,
              hours_spent: 0,
              status: completedSet.has(chId) ? 'completed' : 'not_started',
              difficulty: 'medium',
              confidence: 'medium',
              exam_relevance: 'high',
            });
          }
        }
      }
      return Array.from(byChapter.values());
    })();

    let remaining = 0;
    let total = 0;
    let completed = 0;
    let pendingCount = 0;

    for (const item of scopedItems) {
      const hours = Math.max(0, Number(item.estimated_hours) || 0);
      total += hours;

      const chId = item.chapter_id || '';
      const recoveryHoursForChapter = (recovery.minutesByChapter[chId] || 0) / 60;
      if (recovery.minutesByChapter[chId]) {
        matchedRecoveryChapters.add(chId);
      }

      const st = (item.status || '').toLowerCase().trim();
      const isComplete =
        st === 'completed' ||
        st === 'mastered' ||
        st === 'done' ||
        (chId ? recovery.fullyCompletedChapterIds.has(chId) || completedSet.has(chId) : false);

      if (isComplete) {
        completed += hours;
      } else {
        const spentHours = Math.max(0, Number(item.hours_spent) || 0) + recoveryHoursForChapter;
        const clearedForThis = Math.min(hours, spentHours);
        const remainingForThis = Math.max(0, hours - clearedForThis);
        completed += clearedForThis;
        remaining += remainingForThis;
        pendingCount += 1;
      }
    }

    // Deduct completed recovery task durations whose chapter doesn't have an explicit backlog_items row
    let unmatchedMinutes = 0;
    for (const [chId, mins] of Object.entries(recovery.minutesByChapter)) {
      if (!matchedRecoveryChapters.has(chId)) {
        unmatchedMinutes += mins;
      }
    }
    if (unmatchedMinutes > 0 && remaining > 0) {
      const extraHours = Math.min(remaining, unmatchedMinutes / 60);
      remaining = Math.max(0, remaining - extraHours);
      completed = Math.min(total, completed + extraHours);
    }

    const completedCount = scopedItems.length - pendingCount;
    const chapterProgressPercent =
      scopedItems.length > 0 ? Math.min(100, Math.round((completedCount / scopedItems.length) * 100)) : 0;

    return {
      remainingBacklogHours: roundHours(remaining),
      totalBacklogHours: roundHours(total),
      completedBacklogHours: roundHours(completed),
      pendingItemsCount: pendingCount,
      completedItemsCount: completedCount,
      totalItemsCount: scopedItems.length,
      chapterProgressPercent,
      recoveryCompletedMinutes: recovery.completedMinutes,
      recoveryTotalMinutes: recovery.totalMinutes,
      recoveryCompletedTasks: recovery.completedTaskCount,
      recoveryTotalTasks: recovery.totalTaskCount,
    };
  }, [items, effectiveUserId, completionRevision]);

  return {
    ...calculations,
    items,
    loading,
    error,
    refresh: fetchItems,
  };
}
