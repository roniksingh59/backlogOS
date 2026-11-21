import { useCallback, useEffect, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, isValidUUID } from '@/lib/supabase';
import {
  toDbBacklogItemId,
  fromDbBacklogItemId,
  fetchCloudBacklogItemsRaw,
  createBacklogItemDirect,
  deleteBacklogItemDirect,
} from '@/lib/supabase-service';
import type { BacklogItem, BacklogStatus, BacklogDifficulty, BacklogConfidence, ExamRelevance } from '@/lib/backlog-items';
import type { Subject } from '@/lib/backlog-data';

export interface BacklogItemRow {
  id: string;
  user_id: string;
  chapter_id: string;
  topic: string;
  subject: Subject;
  estimated_hours: number;
  hours_spent: number;
  difficulty: BacklogDifficulty;
  status: BacklogStatus;
  confidence: BacklogConfidence;
  exam_relevance: ExamRelevance;
  prerequisites: string[];
  deadline?: string | null;
  notes?: string | null;
  created_at: string;
  completed_at?: string | null;
}

function toBacklogItem(row: BacklogItemRow, userId?: string): BacklogItem {
  return {
    id: fromDbBacklogItemId(row.id, userId),
    chapterId: row.chapter_id,
    topic: row.topic,
    subject: row.subject,
    estimatedHours: Number(row.estimated_hours) || 0,
    hoursSpent: Number(row.hours_spent) || 0,
    difficulty: row.difficulty,
    status: row.status,
    confidence: row.confidence,
    examRelevance: row.exam_relevance,
    prerequisites: Array.isArray(row.prerequisites) ? row.prerequisites : [],
    deadline: row.deadline || undefined,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    completedAt: row.completed_at || undefined,
  };
}

function fromBacklogItem(item: BacklogItem, userId: string) {
  return {
    id: toDbBacklogItemId(item.id, userId),
    user_id: userId,
    chapter_id: item.chapterId,
    topic: item.topic,
    subject: item.subject,
    estimated_hours: item.estimatedHours,
    hours_spent: item.hoursSpent,
    difficulty: item.difficulty,
    status: item.status,
    confidence: item.confidence,
    exam_relevance: item.examRelevance,
    prerequisites: item.prerequisites,
    deadline: item.deadline || null,
    notes: item.notes || null,
    created_at: item.createdAt,
    completed_at: item.completedAt || null,
  };
}

export function useBacklogItems(userId?: string, selectedChapterId?: string) {
  const [items, setItems] = useState<BacklogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    if (!userId || !isSupabaseConfigured || !isValidUUID(userId)) return [];
    setLoading(true);
    setError(null);
    try {
      const { items: cloudItems, fromCloud, error: fetchError } = await fetchCloudBacklogItemsRaw(userId);
      if (!fromCloud && fetchError) throw new Error(fetchError);
      const nextItems = selectedChapterId
        ? cloudItems.filter((item) => item.chapterId === selectedChapterId)
        : cloudItems;
      setItems(nextItems);
      return nextItems;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load backlog items';
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [selectedChapterId, userId]);

  useEffect(() => {
    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    void fetchItems();
    if (userId && isSupabaseConfigured && isValidUUID(userId)) {
      channel = supabase
        .channel(`backlog-items:${userId}:${selectedChapterId || 'all'}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'backlog_items',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            if (cancelled) return;
            const changed = payload.new as BacklogItemRow;
            if (payload.eventType === 'DELETE') {
              const deletedId = fromDbBacklogItemId((payload.old as { id: string }).id, userId);
              setItems((current) => current.filter((item) => item.id !== deletedId));
              return;
            }
            if (selectedChapterId && changed.chapter_id !== selectedChapterId) {
              setItems((current) => current.filter((item) => item.id !== fromDbBacklogItemId(changed.id, userId)));
              return;
            }
            const next = toBacklogItem(changed, userId);
            setItems((current) => [next, ...current.filter((item) => item.id !== next.id)]);
          },
        )
        .subscribe();
    }

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [fetchItems, selectedChapterId, userId]);

  const upsert = useCallback(async (item: BacklogItem) => {
    if (!userId || !isSupabaseConfigured || !isValidUUID(userId)) return;
    const res = await createBacklogItemDirect(item, userId);
    if (!res.success && res.error) setError(res.error);
  }, [userId]);

  const remove = useCallback(async (id: string) => {
    if (!userId || !isSupabaseConfigured || !isValidUUID(userId)) return;
    const res = await deleteBacklogItemDirect(id, userId);
    if (!res.success && res.error) setError(res.error);
  }, [userId]);

  return { items, loading, error, refresh: fetchItems, upsert, remove };
}
