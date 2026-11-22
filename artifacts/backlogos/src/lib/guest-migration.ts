export const GUEST_SCOPED_STORAGE_BASES = [
  'backlogos-plan-v1',
  'backlogos-plan-history-v1',
  'backlogos-deleted-plan-ids-v1',
  'backlogos-completed-v1',
  'backlogos-study-sessions-v1',
  'backlogos-rest-dates-v1',
  'backlogos-backlog-items-v2',
  'backlogos-smart-daily-plan-v2',
  'backlogos-missed-recovery-v2',
  'backlogos-spaced-revisions-v2',
  'backlogos-recovery-mode-active-v2',
  'backlogos-chapter-notes-v1',
  'backlogos-education-profile-v1',
] as const;

export interface GuestStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function itemKey(value: any, index: number): string {
  if (!value || typeof value !== 'object') return `${typeof value}:${String(value)}`;
  return String(value.id || value.taskId || value.chapterId || `${value.completedAt || ''}:${value.minutes || ''}:${index}`);
}

function mergeArrays(target: any[], source: any[]): any[] {
  const merged = new Map<string, any>();
  for (const [index, item] of target.entries()) merged.set(itemKey(item, index), item);
  for (const [index, item] of source.entries()) {
    const key = itemKey(item, index);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, item);
      continue;
    }
    if (existing && item && typeof existing === 'object' && typeof item === 'object') {
      const existingTime = Date.parse(existing.updatedAt || existing.createdAt || existing.completedAt || '') || 0;
      const sourceTime = Date.parse(item.updatedAt || item.createdAt || item.completedAt || '') || 0;
      merged.set(key, sourceTime >= existingTime ? { ...existing, ...item } : { ...item, ...existing });
    }
  }
  return Array.from(merged.values());
}

export function mergeGuestStorageValues(targetValue: string | null, sourceValue: string): string {
  if (targetValue === null) return sourceValue;
  try {
    const target = JSON.parse(targetValue);
    const source = JSON.parse(sourceValue);
    if (Array.isArray(target) && Array.isArray(source)) {
      return JSON.stringify(mergeArrays(target, source));
    }
    if (target && source && typeof target === 'object' && typeof source === 'object') {
      const targetTime = Date.parse(target.updatedAt || target.createdAt || '') || 0;
      const sourceTime = Date.parse(source.updatedAt || source.createdAt || '') || 0;
      return JSON.stringify(sourceTime > targetTime ? { ...target, ...source } : { ...source, ...target });
    }
  } catch {
    // Preserve the existing target value if either side is not valid JSON.
  }
  return targetValue;
}

export function migrateGuestStorageNamespace(
  storage: GuestStorageLike,
  sourceUid: string,
  targetUid: string,
  removeSource = false,
): string[] {
  if (!sourceUid || !targetUid || sourceUid === targetUid) return [];
  const migratedKeys: string[] = [];
  for (const base of GUEST_SCOPED_STORAGE_BASES) {
    const sourceKey = `${base}:${sourceUid}`;
    const targetKey = `${base}:${targetUid}`;
    const sourceValue = storage.getItem(sourceKey);
    if (sourceValue === null) continue;
    storage.setItem(targetKey, mergeGuestStorageValues(storage.getItem(targetKey), sourceValue));
    if (removeSource) storage.removeItem(sourceKey);
    migratedKeys.push(base);
  }

  const sourceProgressKey = `backlogos-progression-v2-${sourceUid}`;
  const targetProgressKey = `backlogos-progression-v2-${targetUid}`;
  const sourceProgress = storage.getItem(sourceProgressKey);
  if (sourceProgress !== null) {
    const merged = mergeGuestStorageValues(storage.getItem(targetProgressKey), sourceProgress);
    try {
      const parsed = JSON.parse(merged);
      parsed.userId = targetUid;
      storage.setItem(targetProgressKey, JSON.stringify(parsed));
    } catch {
      storage.setItem(targetProgressKey, merged);
    }
    if (removeSource) storage.removeItem(sourceProgressKey);
    migratedKeys.push('backlogos-progression-v2');
  }

  const sourceQueueKey = `backlogos_pending_sync_v1_${sourceUid}`;
  const targetQueueKey = `backlogos_pending_sync_v1_${targetUid}`;
  const sourceQueue = storage.getItem(sourceQueueKey);
  if (sourceQueue !== null) {
    storage.setItem(targetQueueKey, mergeGuestStorageValues(storage.getItem(targetQueueKey), sourceQueue));
    if (removeSource) storage.removeItem(sourceQueueKey);
    migratedKeys.push('backlogos_pending_sync_v1');
  }
  return migratedKeys;
}
