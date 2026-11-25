export const BAX_TUTORIAL_VERSION = 1;

export type BaxTutorialStatus = 'pending' | 'completed' | 'skipped';

export interface BaxTutorialState {
  status: BaxTutorialStatus;
  version: number;
  completedAt?: string;
  skippedAt?: string;
  updatedAt: string;
}

export function getBaxTutorialStorageKey(userId?: string | null): string {
  const scope = userId && userId.trim() ? userId.trim() : 'guest';
  return `backlogos_bax_tutorial_v${BAX_TUTORIAL_VERSION}_${scope}`;
}

export function readBaxTutorialState(userId?: string | null): BaxTutorialState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(getBaxTutorialStorageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BaxTutorialState>;
    if (
      parsed &&
      (parsed.status === 'pending' ||
        parsed.status === 'completed' ||
        parsed.status === 'skipped')
    ) {
      return {
        status: parsed.status,
        version: typeof parsed.version === 'number' ? parsed.version : BAX_TUTORIAL_VERSION,
        completedAt: parsed.completedAt,
        skippedAt: parsed.skippedAt,
        updatedAt: parsed.updatedAt || new Date().toISOString(),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function saveBaxTutorialStateLocal(
  state: BaxTutorialState,
  userId?: string | null
): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getBaxTutorialStorageKey(userId), JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}
