import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, isSupabaseConfigured, getActiveUserId, isValidUUID } from '@/lib/supabase';
import { readBacklogItems, type BacklogItemRecord } from '@/lib/storage';

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
  totalItemsCount: number;
  items: BacklogMetricItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Robust calculation hook that computes the precise mathematical sum of estimated_hours
 * specifically filtering for items where status is 'pending', 'incomplete', 'not_started', or 'in_progress'.
 * Connects directly to Supabase with real-time listeners and instant local fallbacks.
 */
export function useBacklogMetrics(userId?: string): BacklogMetricsResult {
  const effectiveUserId = userId || getActiveUserId();
  const [items, setItems] = useState<BacklogMetricItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Try querying Supabase directly if configured and effectiveUserId is a valid UUID
      if (isSupabaseConfigured && effectiveUserId && isValidUUID(effectiveUserId)) {
        const { data, error: sbError } = await supabase
          .from('backlog_items')
          .select('*')
          .eq('user_id', effectiveUserId);

        if (!sbError && Array.isArray(data) && data.length > 0) {
          const mapped: BacklogMetricItem[] = data.map((d: any) => ({
            id: String(d.id),
            chapter_id: String(d.chapter_id || d.chapterId || ''),
            subject_id: d.subject_id || d.subjectId,
            topic: String(d.topic || d.title || 'Chapter Topic'),
            estimated_hours: Number(d.estimated_hours || d.estimatedHours || 0),
            hours_spent: Number(d.hours_spent || d.hoursSpent || 0),
            status: String(d.status || 'pending').toLowerCase(),
            difficulty: d.difficulty,
            confidence: d.confidence,
            exam_relevance: d.exam_relevance,
          }));
          setItems(mapped);
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
      setLoading(false);
    } catch (err: any) {
      console.warn('[useBacklogMetrics] Error fetching backlog items:', err);
      setError(err?.message || 'Could not load backlog metrics');
      // Fall back gracefully to local storage
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

    window.addEventListener('backlogos-backlog-updated', handleLocalUpdate);
    window.addEventListener('backlogos-plan-updated', handleLocalUpdate);
    window.addEventListener('storage', handleLocalUpdate);

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      window.removeEventListener('backlogos-backlog-updated', handleLocalUpdate);
      window.removeEventListener('backlogos-plan-updated', handleLocalUpdate);
      window.removeEventListener('storage', handleLocalUpdate);
    };
  }, [fetchItems, effectiveUserId]);

  // Precise mathematical calculations - NO Math.random() or dummy numbers
  const calculations = useMemo(() => {
    let remaining = 0;
    let total = 0;
    let completed = 0;
    let pendingCount = 0;

    for (const item of items) {
      const hours = Number(item.estimated_hours) || 0;
      total += hours;

      const st = (item.status || '').toLowerCase().trim();
      const isComplete = st === 'completed' || st === 'mastered' || st === 'done';

      if (isComplete) {
        completed += hours;
      } else {
        // Pending / Incomplete / Not started / In progress / Revision
        remaining += hours;
        pendingCount += 1;
      }
    }

    return {
      remainingBacklogHours: Math.round(remaining * 10) / 10,
      totalBacklogHours: Math.round(total * 10) / 10,
      completedBacklogHours: Math.round(completed * 10) / 10,
      pendingItemsCount: pendingCount,
      totalItemsCount: items.length,
    };
  }, [items]);

  return {
    ...calculations,
    items,
    loading,
    error,
    refresh: fetchItems,
  };
}
