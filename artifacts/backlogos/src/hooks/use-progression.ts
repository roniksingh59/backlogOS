import { useState, useEffect, useCallback } from 'react';
import {
  UserProgression,
  ProgressionStats,
} from '@/lib/progression/types';
import {
  readProgression,
  computeProgressionStats,
  getCurrentUserId,
} from '@/lib/progression/progression-service';
import { useAuth } from '@/lib/auth-context';

export function useProgression() {
  const { user } = useAuth();
  const userId = user?.uid || getCurrentUserId();

  const [progression, setProgression] = useState<UserProgression>(() =>
    readProgression(userId)
  );

  const [stats, setStats] = useState<ProgressionStats>(() =>
    computeProgressionStats(readProgression(userId))
  );

  const refresh = useCallback(() => {
    const currentProg = readProgression(userId);
    setProgression(currentProg);
    setStats(computeProgressionStats(currentProg));
  }, [userId]);

  useEffect(() => {
    refresh();

    const handleUpdate = () => {
      refresh();
    };

    window.addEventListener('backlogos-progression-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('backlogos-progression-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [refresh]);

  return {
    progression,
    stats,
    refresh,
  };
}
