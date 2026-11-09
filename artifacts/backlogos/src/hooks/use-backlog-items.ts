import { useCallback, useEffect, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, isValidUUID } from '@/lib/supabase';
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

function toBacklogItem(row: BacklogItemRow): BacklogItem {
  return {
    id: row.id,
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
    id: item.id,
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
      let query = supabase
        .from('backlog_items')
        .select('id,user_id,chapter_id,topic,subject,estimated_hours,hours_spent,difficulty,status,confidence,exam_relevance,prerequisites,deadline,notes,created_at,completed_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (selectedChapterId) {
        query = query.eq('chapter_id', selectedChapterId);
      }
      const { data, error: queryError } = await query;
      if (queryError) throw queryError;
      const nextItems = ((data || []) as BacklogItemRow[]).map(toBacklogItem);
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
              setItems((current) => current.filter((item) => item.id !== (payload.old as { id: string }).id));
              return;
            }
            if (selectedChapterId && changed.chapter_id !== selectedChapterId) {
              setItems((current) => current.filter((item) => item.id !== changed.id));
              return;
            }
            const next = toBacklogItem(changed);
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
    const { error: mutationError } = await supabase.from('backlog_items').upsert(fromBacklogItem(item, userId), { onConflict: 'id' });
    if (mutationError) setError(mutationError.message);
  }, [userId]);

  const remove = useCallback(async (id: string) => {
    if (!userId || !isSupabaseConfigured || !isValidUUID(userId)) return;
    const { error: mutationError } = await supabase.from('backlog_items').delete().eq('id', id).eq('user_id', userId);
    if (mutationError) setError(mutationError.message);
  }, [userId]);

  return { items, loading, error, refresh: fetchItems, upsert, remove };
}
