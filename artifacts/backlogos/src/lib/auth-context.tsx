import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import {
  supabase,
  isSupabaseConfigured,
  getSupabaseRedirectUrl,
  getCurrentSessionToken,
  isValidUUID,
} from './supabase';
import {
  readPlan,
  readPlanHistory,
  savePlanHistory,
  saveCompleted,
  readCompleted,
  readBacklogItems,
  readStoredBacklogItemsRaw,
  saveBacklogItems,
  readStudySessions,
  readSmartDailyPlan,
  saveSmartDailyPlan,
  readSpacedRevisions,
  saveSpacedRevisions,
  readRecoveryModeActive,
  setRecoveryModeActive,
  readMissedDayRecovery,
  saveMissedDayRecovery,
  readRestDates,
  saveRestDates,
} from './storage';
import {
  fetchCloudStudyPlansRaw,
  fetchCloudBacklogItemsRaw,
  fetchCloudStudySessionsRaw,
  flushPendingSyncQueue,
  loadAllStudyPlansDirect,
  saveStudyPlanDirect,
  setActiveStudyPlanDirect,
  renameStudyPlanDirect,
  deleteStudyPlanDirect,
  loadStudentProfileDirect,
  saveStudentProfileDirect,
  loadWorkspaceStateDirect,
  saveWorkspaceStateDirect,
  loadCompletedTasksDirect,
  saveCompletedTaskDirect,
  saveAllBacklogItemsDirect,
  saveStudySessionDirect,
  loadChapterNotesDirect,
  migrateGuestDataToCloud,
  getOrCreateStableGuestId,
  subscribeToStudentChanges,
} from './supabase-service';
import {
  readProgression,
  saveProgressionLocalOnly,
  reconcileProgressionFromCloudActivity,
} from './progression/progression-service';
import { readEducationProfile, saveEducationProfile } from './curriculum/user-profile-storage';

export interface StudentLearningPreferences {
  dailyTargetHours?: number;
  studyIntensity?: 'balanced' | 'rigorous' | 'exam-rush';
  focusInterval?: number;
  targetExam?: string;
}

export interface AppUser {
  uid: string;
  email: string | null;
  phone?: string | null;
  displayName: string | null;
  preferredName?: string | null;
  schoolName?: string | null;
  photoURL: string | null;
  grade?: '11' | '12' | string | null;
  board?: string | null;
  academicSession?: string | null;
  stream?: 'pcm' | 'pcb' | 'pcmb' | string | null;
  additionalSubjects?: string[] | null;
  backlogInfo?: any;
  onboardingCompleted?: boolean;
  onboardingStep?: number;
  onboardingDraft?: any;
  subjects?: string[] | null;
  learningPreferences?: StudentLearningPreferences | null;
  createdAt?: string;
  isGuest?: boolean;
}

export interface AuthErrorInfo {
  code: string;
  message: string;
  domain?: string;
  isUnauthorizedDomain?: boolean;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  hydratedUserId: string | null;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error' | 'offline';
  syncError: string | null;
  token: string | null;
  authError: AuthErrorInfo | null;
  savedAccounts: AppUser[];
  plans: any[];
  activePlan: any | null;
  setActivePlan: (planId: string) => Promise<void>;
  renamePlan: (planId: string, name: string) => Promise<void>;
  deletePlan: (planId: string) => Promise<void>;
  refreshPlans: () => Promise<void>;
  signInWithGoogle: (email?: string, name?: string, photo?: string | null) => Promise<void>;
  signInWithGoogleOAuth: () => Promise<{ success: boolean; error?: string }>;
  linkGoogleAccountDirect: () => Promise<void>;
  signInWithGoogleRedirect: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<{ success: boolean; error?: string; user?: AppUser }>;
  signUpWithEmail: (
    email: string,
    pass: string,
    name?: string,
    grade?: string
  ) => Promise<{ success: boolean; needsEmailVerification: boolean; error?: string }>;
  sendPasswordResetEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  updateStudentProfile: (updates: {
    displayName?: string;
    preferredName?: string;
    schoolName?: string;
    grade?: string;
    phone?: string;
    photoURL?: string | null;
    board?: string;
    academicSession?: string;
    stream?: string;
    additionalSubjects?: string[];
    subjects?: string[];
    onboardingCompleted?: boolean;
    learningPreferences?: StudentLearningPreferences;
  }) => Promise<{ success: boolean; error?: string }>;
  signInAsGuest: (name?: string, grade?: string) => void;
  signOut: () => Promise<void>;
  removeSavedAccount: (email: string) => void;
  syncDataNow: () => Promise<void>;
  clearAuthError: () => void;
  clearSyncError: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  hydratedUserId: null,
  syncStatus: 'idle',
  syncError: null,
  token: null,
  authError: null,
  savedAccounts: [],
  plans: [],
  activePlan: null,
  setActivePlan: async () => {},
  renamePlan: async () => {},
  deletePlan: async () => {},
  refreshPlans: async () => {},
  signInWithGoogle: async () => {},
  signInWithGoogleOAuth: async () => ({ success: false }),
  linkGoogleAccountDirect: async () => {},
  signInWithGoogleRedirect: async () => {},
  signInWithEmail: async () => ({ success: false }),
  signUpWithEmail: async () => ({ success: false, needsEmailVerification: false }),
  sendPasswordResetEmail: async () => ({ success: false }),
  updatePassword: async () => ({ success: false }),
  updateStudentProfile: async () => ({ success: false }),
  signInAsGuest: () => {},
  signOut: async () => {},
  removeSavedAccount: () => {},
  syncDataNow: async () => {},
  clearAuthError: () => {},
  clearSyncError: () => {},
});


const GUEST_STORAGE_KEY = 'backlogos_guest_user';
const GOOGLE_USER_STORAGE_KEY = 'backlogos_google_user';
const ACCOUNTS_REGISTRY_KEY = 'backlogos_accounts_registry';

/**
 * Purges legacy polluted keys with non-UUID custom identifiers (like 'google-s8452543_gmail_com')
 * and strips any legacy plaintext password properties from localStorage.
 */
function sanitizeStoredAccounts() {
  try {
    const storedGoogle = localStorage.getItem(GOOGLE_USER_STORAGE_KEY);
    if (storedGoogle) {
      const parsed = JSON.parse(storedGoogle);
      if (parsed?.uid && !isValidUUID(parsed.uid)) {
        localStorage.removeItem(GOOGLE_USER_STORAGE_KEY);
      }
    }
    const raw = localStorage.getItem(ACCOUNTS_REGISTRY_KEY);
    if (raw) {
      const accounts = JSON.parse(raw);
      let changed = false;
      for (const [key, val] of Object.entries(accounts)) {
        const acc = val as any;
        if (acc?.user?.uid && !isValidUUID(acc.user.uid) && !acc.user.isGuest) {
          delete accounts[key];
          changed = true;
          continue;
        }
        if (acc && 'password' in acc) {
          delete acc.password;
          changed = true;
        }
      }
      if (changed) {
        localStorage.setItem(ACCOUNTS_REGISTRY_KEY, JSON.stringify(accounts));
      }
    }
  } catch {}
}

function getStoredAccounts(): Record<string, { user: AppUser; data?: any }> {
  try {
    const raw = localStorage.getItem(ACCOUNTS_REGISTRY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const valid: Record<string, { user: AppUser; data?: any }> = {};
    for (const [k, v] of Object.entries(parsed)) {
      const item = v as any;
      if (item?.user?.uid && (isValidUUID(item.user.uid) || item.user.isGuest)) {
        valid[k] = { user: item.user, data: item.data };
      }
    }
    return valid;
  } catch {
    return {};
  }
}

export function getSavedAccountsList(): AppUser[] {
  const accounts = getStoredAccounts();
  const list: AppUser[] = [];

  for (const acc of Object.values(accounts)) {
    if (acc.user && acc.user.email) {
      list.push(acc.user);
    }
  }

  return list;
}

function removeAccountFromStore(email: string) {
  try {
    const accounts = getStoredAccounts();
    delete accounts[email.toLowerCase()];
    localStorage.setItem(ACCOUNTS_REGISTRY_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.warn('Could not remove account:', e);
  }
}

function saveAccountToStore(email: string, user: AppUser) {
  try {
    if (!email) return;
    // Only persist authenticated accounts that have a genuine UUID (or explicit guest)
    if (!user.isGuest && !isValidUUID(user.uid)) return;
    const accounts = getStoredAccounts();
    // Never store passwords or sensitive tokens in localStorage
    accounts[email.toLowerCase()] = {
      user,
    };
    localStorage.setItem(ACCOUNTS_REGISTRY_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.warn('Could not save account to registry:', e);
  }
}

/**
 * Safely runs idempotent guest-to-account migration across all possible guest buckets
 * (explicit guest session, stable guest ID, and legacy 'guest-student'/'guest-default'),
 * ensuring targetUid (auth.uid) is never replaced with a guest ID and duplicate rows are prevented.
 */
async function runIdempotentGuestMigration(targetUid: string): Promise<{ allSucceeded: boolean }> {
  if (typeof localStorage === 'undefined' || !isValidUUID(targetUid)) {
    return { allSucceeded: false };
  }

  const candidateGuestIds: string[] = [];
  const addCandidate = (id?: string | null) => {
    const clean = id ? String(id).trim() : '';
    if (clean.startsWith('guest-') && !candidateGuestIds.includes(clean)) {
      candidateGuestIds.push(clean);
    }
  };

  try {
    const rawGuest = localStorage.getItem(GUEST_STORAGE_KEY);
    if (rawGuest) {
      try {
        const parsed = JSON.parse(rawGuest);
        addCandidate(parsed?.uid);
      } catch {}
    }
    addCandidate(localStorage.getItem('backlogos_stable_guest_id'));
    addCandidate('guest-student');
    addCandidate('guest-default');

    if (candidateGuestIds.length === 0) {
      return { allSucceeded: true };
    }

    let allSucceeded = true;
    for (const guestUid of candidateGuestIds) {
      const res = await migrateGuestDataToCloud(guestUid, targetUid, 'guest_migration_v1', {
        suppressSyncStatus: true,
      });
      if (!res.success) {
        allSucceeded = false;
      }
    }
    return { allSucceeded };
  } catch (e) {
    console.warn('[auth-context] Guest data migration non-fatal warning:', e);
    return { allSucceeded: false };
  }
}

function cleanOAuthParamsFromUrl() {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    const hadAuthQuery =
      url.searchParams.has('code') ||
      url.searchParams.has('state') ||
      url.searchParams.has('error') ||
      url.searchParams.has('error_description');
    const hash = url.hash || '';
    const hasAuthHash =
      hash.includes('access_token=') ||
      hash.includes('refresh_token=') ||
      hash.includes('provider_token=') ||
      hash.includes('error_description=');
    if (!hadAuthQuery && !hasAuthHash) return;

    url.searchParams.delete('code');
    url.searchParams.delete('state');
    url.searchParams.delete('error');
    url.searchParams.delete('error_description');
    if (hasAuthHash && hash.includes('type=recovery') && !url.searchParams.has('type')) {
      url.searchParams.set('type', 'recovery');
    }
    const nextHash = hasAuthHash ? '' : hash;
    const cleanUrl = `${url.origin}${url.pathname}${url.search}${nextHash}`;
    window.history.replaceState({}, document.title, cleanUrl);
  } catch {}
}

function mapSupabaseUser(sbUser: SupabaseUser): AppUser {
  const metadata = sbUser.user_metadata || {};
  return {
    uid: sbUser.id,
    email: sbUser.email || null,
    phone: sbUser.phone || (metadata.phone as string) || null,
    displayName:
      (metadata.full_name as string) ||
      (metadata.name as string) ||
      (sbUser.email ? sbUser.email.split('@')[0] : sbUser.phone || 'Student'),
    preferredName: (metadata.preferred_name as string) || undefined,
    schoolName: (metadata.school_name as string) || undefined,
    photoURL:
      (metadata.avatar_url as string) ||
      (metadata.picture as string) ||
      null,
    grade: (metadata.class_grade as string) || (metadata.grade as string) || '11',
    board: (metadata.board as string) || 'CBSE',
    academicSession: (metadata.academic_session as string) || '2026-27',
    stream: (metadata.stream as string) || undefined,
    additionalSubjects: (metadata.additional_subjects as string[]) || undefined,
    subjects: (metadata.subjects as string[]) || null,
    learningPreferences: (metadata.learning_preferences as StudentLearningPreferences) || null,
    createdAt: sbUser.created_at,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [hydratedUserId, setHydratedUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error' | 'offline'>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<AuthErrorInfo | null>(null);
  const [savedAccounts, setSavedAccounts] = useState<AppUser[]>(() => getSavedAccountsList());
  const [plans, setPlans] = useState<any[]>([]);
  const [activePlan, setActivePlanState] = useState<any | null>(null);
  const syncInFlightRef = useRef<Map<string, Promise<void>>>(new Map());
  const authQueueRef = useRef<Promise<void>>(Promise.resolve());
  const lastSyncedAtRef = useRef<number>(0);
  const userRef = useRef<AppUser | null>(null);
  userRef.current = user;

  const refreshAccounts = useCallback(() => {
    setSavedAccounts(getSavedAccountsList());
  }, []);

  const removeSavedAccount = useCallback((email: string) => {
    removeAccountFromStore(email);
    refreshAccounts();
  }, [refreshAccounts]);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  const clearSyncError = useCallback(() => {
    setSyncError(null);
  }, []);

  useEffect(() => {
    const onSyncEvent = (event: Event) => {
      const detail = (event as CustomEvent)?.detail;
      if (!detail?.status) return;
      setSyncStatus(detail.status);
      if (detail.status === 'error') {
        setSyncError(detail.errorMessage || 'Failed to sync changes with Supabase');
      } else if (detail.status === 'synced') {
        setSyncError(null);
      }
    };
    window.addEventListener('backlogos-sync-status', onSyncEvent);
    return () => {
      window.removeEventListener('backlogos-sync-status', onSyncEvent);
    };
  }, []);

  // Sync plan and profile directly with Supabase strictly scoped to currentUser.uid
  const syncWithBackend = useCallback(async (_accessToken: string, currentUser: AppUser) => {
    if (!currentUser?.uid || currentUser.isGuest || !isValidUUID(currentUser.uid)) {
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setSyncStatus('offline');
      setHydratedUserId(currentUser.uid);
      return;
    }

    const existingSync = syncInFlightRef.current.get(currentUser.uid);
    if (existingSync) {
      return existingSync;
    }

    const runSync = (async () => {
      const syncErrors: string[] = [];
      try {
        setSyncStatus('syncing');
        setSyncError(null);

        // 0. Flush any queued offline mutations before pulling cloud state
        const flushRes = await flushPendingSyncQueue(currentUser.uid);
        if (flushRes.remaining > 0 && flushRes.lastError) {
          syncErrors.push(flushRes.lastError);
        }

        // 1. Direct Supabase load for student profile & hydrate grade/stream/subjects
        const dbProfile = await loadStudentProfileDirect(currentUser.uid);
        const userLocalPlan = readPlan(currentUser.uid);

        if (dbProfile) {
          try {
            const eduProfile = readEducationProfile(currentUser.uid);
            let eduChanged = false;
            if (dbProfile.grade && eduProfile.grade !== dbProfile.grade) {
              eduProfile.grade = dbProfile.grade as any;
              eduChanged = true;
            }
            if (dbProfile.stream && eduProfile.stream !== dbProfile.stream) {
              eduProfile.stream = dbProfile.stream as any;
              eduChanged = true;
            }
            if (dbProfile.board && eduProfile.curriculum !== dbProfile.board) {
              eduProfile.curriculum = dbProfile.board as any;
              eduChanged = true;
            }
            if (Array.isArray(dbProfile.subjects) && dbProfile.subjects.length > 0) {
              eduProfile.enrolledSubjectIds = dbProfile.subjects;
              eduChanged = true;
            }
            if (eduChanged) {
              saveEducationProfile(eduProfile, currentUser.uid);
            }
          } catch {}
        }

        // 2. Direct Supabase sync for ALL study plans (Multi-Plan History + workspace_state backup)
        const { plans: cloudPlans, error: plansErr } = await fetchCloudStudyPlansRaw(currentUser.uid);
        if (plansErr) syncErrors.push(plansErr);
        const localPlans = readPlanHistory(currentUser.uid);
        const cloudPlanIds = new Set(cloudPlans.map((p) => p.id));
        const missingInCloud = localPlans.filter((lp) => lp.id && !cloudPlanIds.has(lp.id));

        if (missingInCloud.length > 0) {
          const sortedMissing = [...missingInCloud].sort((a, b) => (a.isActive === b.isActive ? 0 : a.isActive ? -1 : 1));
          for (const p of sortedMissing) {
            const res = await saveStudyPlanDirect(p, currentUser.uid, {
              preserveActiveFlag: cloudPlans.length > 0 ? Boolean(p.isActive) : true,
            });
            if (!res.success && res.error) syncErrors.push(res.error);
          }
        } else if (cloudPlans.length === 0 && userLocalPlan) {
          const res = await saveStudyPlanDirect(userLocalPlan, currentUser.uid);
          if (!res.success && res.error) syncErrors.push(res.error);
        }

        const finalPlans = await loadAllStudyPlansDirect(currentUser.uid);
        setPlans(finalPlans);
        setActivePlanState(finalPlans.find((p) => p.isActive) || finalPlans[0] || null);

        // 3. Direct Supabase bidirectional union sync for completed tasks (never fire fake XP during hydration)
        const localCompletedBefore = readCompleted(currentUser.uid);
        const dbCompleted = await loadCompletedTasksDirect(currentUser.uid);
        const dbCompletedSet = new Set(dbCompleted);
        const localOnlyCompleted = localCompletedBefore.filter((id) => !dbCompletedSet.has(id));

        if (localOnlyCompleted.length > 0) {
          for (const taskId of localOnlyCompleted) {
            const res = await saveCompletedTaskDirect(taskId, true, currentUser.uid);
            if (!res.success && res.error) syncErrors.push(res.error);
          }
        }

        const mergedCompleted = Array.from(new Set([...dbCompleted, ...localOnlyCompleted]));
        if (mergedCompleted.length > 0) {
          saveCompleted(mergedCompleted, currentUser.uid, { skipProgression: true });
        }

        // 4. Direct Supabase bidirectional sync for backlog items (read raw local first to avoid seeding fake items on cold devices)
        const { items: cloudBacklog, error: backlogErr } = await fetchCloudBacklogItemsRaw(currentUser.uid);
        if (backlogErr) syncErrors.push(backlogErr);
        const rawLocalBacklog = readStoredBacklogItemsRaw(currentUser.uid);
        let mergedBacklogCount = cloudBacklog.length;

        if (cloudBacklog.length > 0) {
          const localByChapter = new Map(rawLocalBacklog.map((b) => [b.chapterId, b]));
          const cloudByChapter = new Set(cloudBacklog.map((b) => b.chapterId));
          const mergedFromCloud = cloudBacklog.map((cb) => {
            const lb = localByChapter.get(cb.chapterId);
            if (!lb) return cb;
            const status = lb.status === 'completed' || cb.status === 'completed'
              ? 'completed'
              : lb.status === 'learning' && cb.status === 'not_started'
              ? 'learning'
              : cb.status;
            return {
              ...cb,
              status,
              hoursSpent: Math.max(Number(cb.hoursSpent || 0), Number(lb.hoursSpent || 0)),
              completedAt: cb.completedAt || lb.completedAt,
            };
          });
          const localOnlyBacklog = rawLocalBacklog.filter((b) => !cloudByChapter.has(b.chapterId));
          const updatedLocalInCloud = mergedFromCloud.filter((mb, idx) => {
            const orig = cloudBacklog[idx];
            return orig && (mb.status !== orig.status || mb.hoursSpent !== orig.hoursSpent);
          });
          const mergedBacklog = [...mergedFromCloud, ...localOnlyBacklog];
          mergedBacklogCount = mergedBacklog.length;
          if (localOnlyBacklog.length > 0 || updatedLocalInCloud.length > 0) {
            const blRes = await saveAllBacklogItemsDirect(mergedBacklog, currentUser.uid);
            if (!blRes.success && blRes.error) syncErrors.push(blRes.error);
          }
          saveBacklogItems(mergedBacklog, currentUser.uid, { skipProgression: true });
        } else if (rawLocalBacklog.length > 0) {
          mergedBacklogCount = rawLocalBacklog.length;
          const blRes = await saveAllBacklogItemsDirect(rawLocalBacklog, currentUser.uid);
          if (!blRes.success && blRes.error) syncErrors.push(blRes.error);
        } else if (finalPlans.length > 0) {
          const seeded = readBacklogItems(currentUser.uid);
          mergedBacklogCount = seeded.length;
        }

        // 5. Direct Supabase load & sync for focus study sessions + chapter notes
        const [{ sessions: cloudSessions, error: sessionsErr }, { error: notesErr }] = await Promise.all([
          fetchCloudStudySessionsRaw(currentUser.uid),
          loadChapterNotesDirect(currentUser.uid),
        ]);
        if (sessionsErr) syncErrors.push(sessionsErr);
        if (notesErr) syncErrors.push(notesErr);
        const localSessions = readStudySessions(currentUser.uid);
        const sessionKey = (s: any) => `${s.chapterId}|${s.minutes}|${String(s.completedAt || '').slice(0, 16)}`;
        const cloudSessionKeys = new Set(cloudSessions.map(sessionKey));
        const localOnlySessions = localSessions.filter((s) => !cloudSessionKeys.has(sessionKey(s)));

        if (localOnlySessions.length > 0) {
          for (const s of localOnlySessions.slice(0, 50)) {
            const sessRes = await saveStudySessionDirect(
              {
                chapterId: s.chapterId,
                minutes: s.minutes,
                mode: s.mode || 'focus',
                completedAt: s.completedAt,
                skipLocalCache: true,
              },
              currentUser.uid
            );
            if (!sessRes.success && sessRes.error) syncErrors.push(sessRes.error);
          }
        }

        if (cloudSessions.length > 0 || localSessions.length > 0) {
          const mergedMap = new Map<string, any>();
          for (const s of [...cloudSessions, ...localSessions]) {
            const dedupeKey = sessionKey(s);
            if (!mergedMap.has(dedupeKey)) {
              mergedMap.set(dedupeKey, s);
            }
          }
          const mergedSessions = Array.from(mergedMap.values())
            .sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime())
            .slice(0, 150);
          localStorage.setItem(`backlogos-study-sessions-v1:${currentUser.uid}`, JSON.stringify(mergedSessions));
        }

        // Update React user state with DB profile + onboarding completion status
        const hasRealWorkspaceData =
          finalPlans.length > 0 ||
          mergedBacklogCount > 0 ||
          mergedCompleted.length > 0 ||
          cloudSessions.length > 0 ||
          (Array.isArray(dbProfile?.selected_chapter_ids) && dbProfile!.selected_chapter_ids.length > 0);

        if (dbProfile || hasRealWorkspaceData) {
          setUser((prev) => {
            if (!prev || prev.uid !== currentUser.uid) return prev;
            const dailyTargetHours =
              dbProfile?.minutes_per_day
                ? Math.round((dbProfile.minutes_per_day / 60) * 10) / 10
                : prev.learningPreferences?.dailyTargetHours;
            return {
              ...prev,
              board: dbProfile?.board || prev.board || 'CBSE',
              grade: dbProfile?.grade || prev.grade || '11',
              stream: dbProfile?.stream || prev.stream,
              subjects: dbProfile?.subjects || prev.subjects || ['Physics', 'Chemistry', 'Mathematics'],
              learningPreferences: dailyTargetHours
                ? { ...(prev.learningPreferences || {}), dailyTargetHours }
                : prev.learningPreferences,
              onboardingCompleted: Boolean(hasRealWorkspaceData || prev.onboardingCompleted),
            };
          });
        }

        // 6. Direct Supabase load & sync for workspace state (XP progression, daily slots, revisions, recovery mode, rest dates)
        const cloudWorkspace = await loadWorkspaceStateDirect(currentUser.uid);
        const localProg = readProgression(currentUser.uid);
        const localDaily = readSmartDailyPlan(currentUser.uid);
        const localRevisions = readSpacedRevisions(currentUser.uid);
        const localRecovery = readRecoveryModeActive(currentUser.uid);
        const localMissed = readMissedDayRecovery(currentUser.uid);
        const localRestDates = readRestDates(currentUser.uid);

        if (cloudWorkspace) {
          const cloudProg = cloudWorkspace.progression;
          if (cloudProg && typeof cloudProg.xp === 'number') {
            const cloudMilestonesCount = Array.isArray(cloudProg.unlockedMilestoneIds)
              ? cloudProg.unlockedMilestoneIds.length
              : 0;
            const localMilestonesCount = Array.isArray(localProg.unlockedMilestoneIds)
              ? localProg.unlockedMilestoneIds.length
              : 0;

            if (
              cloudProg.xp > localProg.xp ||
              (cloudProg.xp === localProg.xp && cloudMilestonesCount >= localMilestonesCount)
            ) {
              saveProgressionLocalOnly({ ...cloudProg, userId: currentUser.uid });
            } else if (localProg.xp > cloudProg.xp) {
              await saveWorkspaceStateDirect({ progression: localProg }, currentUser.uid);
            }
          } else if (localProg.xp > 0) {
            await saveWorkspaceStateDirect({ progression: localProg }, currentUser.uid);
          }

          if (cloudWorkspace.dailyPlan) {
            if (!localDaily) {
              saveSmartDailyPlan(cloudWorkspace.dailyPlan, currentUser.uid);
            } else {
              const cloudDate = String(cloudWorkspace.dailyPlan.date || '');
              const localDate = String(localDaily.date || '');
              const cloudDone = Array.isArray(cloudWorkspace.dailyPlan.slots)
                ? cloudWorkspace.dailyPlan.slots.filter((s: any) => s.completed).length
                : 0;
              const localDone = Array.isArray(localDaily.slots)
                ? localDaily.slots.filter((s: any) => s.completed).length
                : 0;
              if (cloudDate > localDate || (cloudDate === localDate && cloudDone > localDone)) {
                saveSmartDailyPlan(cloudWorkspace.dailyPlan, currentUser.uid);
              }
            }
          } else if (localDaily) {
            await saveWorkspaceStateDirect({ dailyPlan: localDaily }, currentUser.uid);
          }

          if (Array.isArray(cloudWorkspace.revisions) && cloudWorkspace.revisions.length > 0) {
            const revById = new Map<string, any>();
            for (const r of [...cloudWorkspace.revisions, ...localRevisions]) {
              if (!r?.id) continue;
              const prev = revById.get(r.id);
              if (!prev) {
                revById.set(r.id, r);
              } else {
                const isDone = r.status === 'completed' || r.isCompleted || prev.status === 'completed' || prev.isCompleted;
                revById.set(r.id, isDone ? { ...prev, ...r, status: 'completed' } : { ...prev, ...r });
              }
            }
            saveSpacedRevisions(Array.from(revById.values()), currentUser.uid);
          } else if (localRevisions.length > 0) {
            await saveWorkspaceStateDirect({ revisions: localRevisions }, currentUser.uid);
          }

          if (typeof cloudWorkspace.recoveryMode === 'boolean' && !localRecovery) {
            setRecoveryModeActive(cloudWorkspace.recoveryMode, currentUser.uid);
          }
          if (cloudWorkspace.missedRecovery && !localMissed) {
            saveMissedDayRecovery(cloudWorkspace.missedRecovery, currentUser.uid);
          }
          if (Array.isArray(cloudWorkspace.restDates) && cloudWorkspace.restDates.length > 0) {
            const mergedRest = Array.from(new Set([...cloudWorkspace.restDates, ...localRestDates]));
            saveRestDates(mergedRest, currentUser.uid);
          }
        } else if (
          localProg.xp > 0 ||
          localDaily ||
          localRevisions.length > 0 ||
          localRecovery ||
          localRestDates.length > 0
        ) {
          await saveWorkspaceStateDirect(
            {
              progression: localProg,
              dailyPlan: localDaily || undefined,
              revisions: localRevisions.length > 0 ? localRevisions : undefined,
              recoveryMode: localRecovery,
              missedRecovery: localMissed || undefined,
              restDates: localRestDates.length > 0 ? localRestDates : undefined,
            },
            currentUser.uid
          );
        }

        // 7. Self-heal progression XP/streak/milestones if workspace_state was previously zeroed/missing
        //    even though real sessions, completed chapters, or revisions exist in the cloud.
        const currentProgAfterHydration = readProgression(currentUser.uid);
        if (currentProgAfterHydration.xp === 0) {
          const reconciled = reconcileProgressionFromCloudActivity(currentUser.uid);
          if (reconciled && reconciled.xp > 0) {
            await saveWorkspaceStateDirect({ progression: reconciled }, currentUser.uid);
          }
        }

        lastSyncedAtRef.current = Date.now();
        if (syncErrors.length > 0) {
          setSyncStatus('error');
          setSyncError(syncErrors[0]);
        } else {
          setSyncStatus('synced');
          setSyncError(null);
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('backlogos-plan-updated'));
          window.dispatchEvent(new CustomEvent('backlogos-plans-updated', { detail: finalPlans }));
          window.dispatchEvent(new CustomEvent('backlogos-completed-updated'));
          window.dispatchEvent(new CustomEvent('backlogos-backlog-updated'));
          window.dispatchEvent(new CustomEvent('backlogos-progression-updated'));
          window.dispatchEvent(new CustomEvent('backlogos-notes-updated'));
          window.dispatchEvent(new Event('storage'));
        }
      } catch (err: any) {
        const message = err?.message || 'Supabase synchronization failed';
        console.warn('[auth-context] Direct Supabase sync error:', message);
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          setSyncStatus('offline');
        } else {
          setSyncStatus('error');
          setSyncError(message);
        }
      } finally {
        syncInFlightRef.current.delete(currentUser.uid);
        setHydratedUserId(currentUser.uid);
      }
    })();

    syncInFlightRef.current.set(currentUser.uid, runSync);
    return runSync;
  }, []);

  const setActivePlan = useCallback(async (planId: string) => {
    try {
      const { plans: updatedPlans, activePlan: nextActive } = await setActiveStudyPlanDirect(
        planId,
        user?.uid
      );
      setPlans(updatedPlans);
      setActivePlanState(nextActive);
    } catch (err) {
      console.error('Failed to set active plan:', err);
    }
  }, [user?.uid]);

  const renamePlan = useCallback(async (planId: string, name: string) => {
    try {
      const updatedPlans = await renameStudyPlanDirect(planId, name, user?.uid);
      setPlans(updatedPlans);
      setActivePlanState(updatedPlans.find((p) => p.isActive) || updatedPlans[0] || null);
    } catch (err) {
      console.error('Failed to rename plan:', err);
    }
  }, [user?.uid]);

  const deletePlan = useCallback(async (planId: string) => {
    try {
      const res = await deleteStudyPlanDirect(user?.uid, planId);
      const remaining = res.plans ?? readPlanHistory(user?.uid);
      const nextActive = res.nextActive ?? remaining.find((p) => p.isActive) ?? remaining[0] ?? null;
      setPlans(remaining);
      setActivePlanState(nextActive);
    } catch (err) {
      console.error('Failed to delete plan:', err);
    }
  }, [user?.uid]);

  const refreshPlans = useCallback(async () => {
    try {
      const list = user?.uid && !user.isGuest
        ? await loadAllStudyPlansDirect(user.uid)
        : readPlanHistory(user?.uid);
      setPlans(list);
      setActivePlanState(list.find((p) => p.isActive) || list[0] || null);
    } catch (err) {
      console.error('Failed to refresh plans:', err);
    }
  }, [user?.uid, user?.isGuest]);

  // Keep plans & activePlan reactive for both Guest and Authenticated users
  useEffect(() => {
    const syncLocalHistory = () => {
      const history = readPlanHistory(user?.uid);
      setPlans(history);
      setActivePlanState(history.find((p) => p.isActive) || history[0] || null);
    };
    syncLocalHistory();
    window.addEventListener('backlogos-plans-updated', syncLocalHistory);
    window.addEventListener('backlogos-plan-updated', syncLocalHistory);
    return () => {
      window.removeEventListener('backlogos-plans-updated', syncLocalHistory);
      window.removeEventListener('backlogos-plan-updated', syncLocalHistory);
    };
  }, [user?.uid]);


  const handleAuthError = useCallback((err: any) => {
    const code = err?.code || err?.status || 'auth/unknown';
    const message = err?.message || 'Authentication error';
    const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const isUnauthorizedDomain =
      message.toLowerCase().includes('redirect_uri_mismatch') ||
      message.toLowerCase().includes('unauthorized domain') ||
      message.toLowerCase().includes('redirect url');

    const errInfo: AuthErrorInfo = {
      code: String(code),
      message,
      domain: currentDomain,
      isUnauthorizedDomain,
    };

    setAuthError(errInfo);
    setSyncStatus('idle');
    return errInfo;
  }, []);

  const mergeIncomingAuthUser = useCallback((incoming: AppUser): AppUser => {
    const prev = userRef.current;
    if (prev && prev.uid === incoming.uid && !prev.isGuest) {
      return {
        ...incoming,
        preferredName: prev.preferredName ?? incoming.preferredName,
        schoolName: prev.schoolName ?? incoming.schoolName,
        stream: prev.stream ?? incoming.stream,
        additionalSubjects: prev.additionalSubjects ?? incoming.additionalSubjects,
        board: prev.board ?? incoming.board,
        grade: prev.grade ?? incoming.grade,
        subjects: prev.subjects ?? incoming.subjects,
        learningPreferences: prev.learningPreferences ?? incoming.learningPreferences,
        onboardingCompleted: prev.onboardingCompleted,
      };
    }
    return incoming;
  }, []);

  const enqueueAuthTransition = useCallback((task: () => Promise<void>) => {
    const next = authQueueRef.current.then(task, task);
    authQueueRef.current = next;
    return next;
  }, []);

  const hydrateAuthenticatedSession = useCallback(
    async (sbUser: SupabaseUser, accessToken: string) => {
      const mapped = mapSupabaseUser(sbUser);
      const mergedUser = mergeIncomingAuthUser(mapped);
      if (userRef.current?.uid !== mergedUser.uid) {
        setHydratedUserId(null);
      }
      setSyncStatus('syncing');
      setUser(mergedUser);
      setToken(accessToken);

      const migration = await runIdempotentGuestMigration(mergedUser.uid);
      if (migration.allSucceeded) {
        try {
          localStorage.removeItem(GUEST_STORAGE_KEY);
        } catch {}
      }

      if (mergedUser.email) {
        saveAccountToStore(mergedUser.email, mergedUser);
        refreshAccounts();
      }

      await syncWithBackend(accessToken, mergedUser);
      cleanOAuthParamsFromUrl();
    },
    [mergeIncomingAuthUser, refreshAccounts, syncWithBackend]
  );

  useEffect(() => {
    // Purge legacy non-UUID keys immediately
    sanitizeStoredAccounts();

    // Cross-tab synchronization via BroadcastChannel
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('backlogos_auth_channel');
        bc.onmessage = (event) => {
          if (event.data?.type === 'LOGIN_SUCCESS' && event.data?.user) {
            void enqueueAuthTransition(async () => {
              if (isSupabaseConfigured) {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                  await hydrateAuthenticatedSession(session.user, session.access_token);
                  return;
                }
              }
              setHydratedUserId(null);
              setUser(event.data.user);
              if (event.data.token) {
                setToken(event.data.token);
              }
            });
          } else if (event.data?.type === 'LOGOUT') {
            setUser(null);
            setToken(null);
            setHydratedUserId(null);
            setSyncStatus('idle');
          }
        };
      }
    } catch {}

    // 1. Initial Session check via Supabase (serialized with onAuthStateChange)
    if (isSupabaseConfigured) {
      void enqueueAuthTransition(async () => {
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (error) {
            console.warn('Supabase getSession error:', error.message);
          }

          if (session?.user) {
            await hydrateAuthenticatedSession(session.user, session.access_token);
          } else {
            localStorage.removeItem(GOOGLE_USER_STORAGE_KEY);
            setHydratedUserId(null);
            // Check for local guest user session
            const storedGuest = localStorage.getItem(GUEST_STORAGE_KEY);
            if (storedGuest) {
              try {
                setUser(JSON.parse(storedGuest));
                setSyncStatus('offline');
              } catch {
                setUser(null);
              }
            } else {
              setUser(null);
              setToken(null);
              setSyncStatus('idle');
            }
          }
        } catch (err) {
          handleAuthError(err);
        } finally {
          setLoading(false);
        }
      });

      // 2. Listen to Supabase auth state transitions
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'TOKEN_REFRESHED') {
          if (session?.access_token) {
            setToken(session.access_token);
          }
          return;
        }

        void enqueueAuthTransition(async () => {
          try {
            if (session?.user) {
              await hydrateAuthenticatedSession(session.user, session.access_token);
            } else if (event === 'SIGNED_OUT') {
              localStorage.removeItem(GOOGLE_USER_STORAGE_KEY);
              setHydratedUserId(null);
              const storedGuest = localStorage.getItem(GUEST_STORAGE_KEY);
              if (storedGuest) {
                try {
                  setUser(JSON.parse(storedGuest));
                  setSyncStatus('offline');
                } catch {
                  setUser(null);
                }
              } else {
                setUser(null);
                setToken(null);
                setSyncStatus('idle');
              }
            }
          } finally {
            setLoading(false);
          }
        });
      });

      return () => {
        bc?.close();
        subscription.unsubscribe();
      };
    } else {
      // Offline fallback check
      const storedGuest = localStorage.getItem(GUEST_STORAGE_KEY);
      if (storedGuest) {
        try {
          setUser(JSON.parse(storedGuest));
          setSyncStatus('offline');
        } catch {
          setUser(null);
        }
      }
      setLoading(false);
      return () => {
        bc?.close();
      };
    }
  }, [syncWithBackend, handleAuthError, enqueueAuthTransition, hydrateAuthenticatedSession]);

  useEffect(() => {
    if (!user?.uid || user.isGuest || !isSupabaseConfigured || !isValidUUID(user.uid)) return;
    const uid = user.uid;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleResync = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const activeUser = userRef.current;
        if (activeUser && activeUser.uid === uid && !activeUser.isGuest) {
          void syncWithBackend(token || '', activeUser);
        }
      }, 1200);
    };

    const handleOnline = () => {
      void (async () => {
        const res = await flushPendingSyncQueue(uid);
        const activeUser = userRef.current;
        if (activeUser && activeUser.uid === uid && (res.flushed > 0 || res.remaining === 0)) {
          await syncWithBackend(token || '', activeUser);
        }
      })();
    };
    const handleOffline = () => {
      setSyncStatus('offline');
    };
    const handleVisibilityChange = () => {
      const activeUser = userRef.current;
      if (
        document.visibilityState === 'visible' &&
        Date.now() - lastSyncedAtRef.current > 15000 &&
        activeUser &&
        activeUser.uid === uid
      ) {
        void syncWithBackend(token || '', activeUser);
      }
    };

    const unsubscribeRealtime = subscribeToStudentChanges(uid, {
      onProfileChange: () => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('backlogos-profile-updated'));
        }
        scheduleResync();
      },
      onPlanChange: scheduleResync,
      onBacklogChange: scheduleResync,
      onTaskChange: scheduleResync,
      onSessionChange: scheduleResync,
      onNoteChange: () => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('backlogos-notes-updated'));
        }
        scheduleResync();
      },
    });

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      unsubscribeRealtime();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.uid, user?.isGuest, token, syncWithBackend]);

  // 1. EMAIL & PASSWORD LOGIN
  const signInWithEmail = async (email: string, pass: string): Promise<{ success: boolean; error?: string; user?: AppUser }> => {
    try {
      setAuthError(null);
      setHydratedUserId(null);
      setSyncStatus('syncing');

      const cleanEmail = email.trim().toLowerCase();
      if (!isSupabaseConfigured) {
        throw new Error('Supabase client is not configured.');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: pass,
      });

      if (error) {
        handleAuthError(error);
        return { success: false, error: error.message };
      }

      if (data.user && data.session) {
        await enqueueAuthTransition(() => hydrateAuthenticatedSession(data.user!, data.session!.access_token));
        const finalUser = userRef.current || mapSupabaseUser(data.user);
        return { success: true, user: finalUser };
      }

      return { success: false, error: 'Could not establish session.' };
    } catch (error: any) {
      console.error('Email sign-in error:', error);
      handleAuthError(error);
      return { success: false, error: error.message || 'Login failed.' };
    }
  };

  // 2. EMAIL & PASSWORD REGISTRATION (WITH CBSE CLASS SELECTION)
  const signUpWithEmail = async (
    email: string,
    pass: string,
    name?: string,
    grade: string = '11'
  ): Promise<{ success: boolean; needsEmailVerification: boolean; error?: string }> => {
    try {
      setAuthError(null);
      setSyncStatus('syncing');

      const cleanEmail = email.trim().toLowerCase();
      const studentName = (name || cleanEmail.split('@')[0]).trim();

      if (!isSupabaseConfigured) {
        throw new Error('Supabase client is not configured.');
      }

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: pass,
        options: {
          data: {
            full_name: studentName,
            name: studentName,
            class_grade: grade,
            grade,
          },
          emailRedirectTo: getSupabaseRedirectUrl('/dashboard'),
        },
      });

      if (error) {
        handleAuthError(error);
        return { success: false, needsEmailVerification: false, error: error.message };
      }

      if (data.user) {
        const u = mapSupabaseUser(data.user);
        u.grade = grade;
        u.displayName = studentName;

        // If email confirmation is disabled in Supabase, session is issued immediately
        if (data.session) {
          await enqueueAuthTransition(() => hydrateAuthenticatedSession(data.user!, data.session!.access_token));
          return { success: true, needsEmailVerification: false };
        }

        // Email confirmation is required by project settings
        return { success: true, needsEmailVerification: true };
      }

      return { success: false, needsEmailVerification: false, error: 'Registration incomplete.' };
    } catch (error: any) {
      console.error('Email sign-up error:', error);
      handleAuthError(error);
      return { success: false, needsEmailVerification: false, error: error.message || 'Registration failed.' };
    }
  };

  // 3. FORGOT PASSWORD / PASSWORD RESET REQUEST
  const sendPasswordResetEmail = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setAuthError(null);
      const cleanEmail = email.trim().toLowerCase();

      if (!isSupabaseConfigured) {
        throw new Error('Supabase client is not configured.');
      }

      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: getSupabaseRedirectUrl('/login?type=recovery'),
      });

      if (error) {
        handleAuthError(error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Password reset email error:', error);
      handleAuthError(error);
      return { success: false, error: error.message || 'Could not send reset email.' };
    }
  };

  // 4. UPDATE PASSWORD AFTER RESET LINK CLICK
  const updatePassword = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setAuthError(null);
      if (!isSupabaseConfigured) {
        throw new Error('Supabase client is not configured.');
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        handleAuthError(error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Update password error:', error);
      handleAuthError(error);
      return { success: false, error: error.message || 'Could not update password.' };
    }
  };

  // 5. GOOGLE OAUTH FLOW VIA SUPABASE
  const signInWithGoogleOAuth = async (loginHintEmail?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setAuthError(null);
      setSyncStatus('syncing');

      if (!isSupabaseConfigured) {
        throw new Error('Supabase client is not configured.');
      }

      const redirectUrl = getSupabaseRedirectUrl('/login');
      const queryParams: Record<string, string> = {
        access_type: 'offline',
        prompt: loginHintEmail ? 'select_account' : 'consent',
      };
      if (loginHintEmail) {
        queryParams.login_hint = loginHintEmail;
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams,
        },
      });

      if (error) {
        handleAuthError(error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Google OAuth sign-in error:', error);
      handleAuthError(error);
      return { success: false, error: error.message || 'Google sign-in failed.' };
    }
  };

  // 6. UPDATE STUDENT PROFILE (NAME, CBSE CLASS, PHONE, AVATAR, BOARD, SUBJECTS, PREFERENCES)
  const updateStudentProfile = async (updates: {
    displayName?: string;
    preferredName?: string;
    schoolName?: string;
    grade?: string;
    stream?: string;
    phone?: string;
    photoURL?: string | null;
    board?: string;
    academicSession?: string;
    additionalSubjects?: string[];
    subjects?: string[];
    onboardingCompleted?: boolean;
    learningPreferences?: StudentLearningPreferences;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!user) return { success: false, error: 'No user signed in' };

      const updatedUser: AppUser = {
        ...user,
        displayName: updates.displayName !== undefined ? updates.displayName : user.displayName,
        preferredName: updates.preferredName !== undefined ? updates.preferredName : user.preferredName,
        schoolName: updates.schoolName !== undefined ? updates.schoolName : user.schoolName,
        grade: updates.grade !== undefined ? updates.grade : (user.grade || '11'),
        stream: updates.stream !== undefined ? updates.stream : user.stream,
        phone: updates.phone !== undefined ? updates.phone : user.phone,
        photoURL: updates.photoURL !== undefined ? updates.photoURL : user.photoURL,
        board: updates.board !== undefined ? updates.board : (user.board || 'CBSE'),
        academicSession: updates.academicSession !== undefined ? updates.academicSession : (user.academicSession || '2026-27'),
        additionalSubjects: updates.additionalSubjects !== undefined ? updates.additionalSubjects : user.additionalSubjects,
        subjects: updates.subjects !== undefined ? updates.subjects : user.subjects,
        onboardingCompleted:
          updates.onboardingCompleted !== undefined ? updates.onboardingCompleted : user.onboardingCompleted,
        learningPreferences: updates.learningPreferences !== undefined ? updates.learningPreferences : user.learningPreferences,
      };

      setUser(updatedUser);

      // Persist to Supabase Auth metadata if signed in
      if (isSupabaseConfigured && !user.isGuest) {
        await supabase.auth.updateUser({
          data: {
            full_name: updatedUser.displayName,
            name: updatedUser.displayName,
            preferred_name: updatedUser.preferredName,
            school_name: updatedUser.schoolName,
            class_grade: updatedUser.grade,
            grade: updatedUser.grade,
            stream: updatedUser.stream,
            phone: updatedUser.phone,
            avatar_url: updatedUser.photoURL,
            picture: updatedUser.photoURL,
            board: updatedUser.board,
            academic_session: updatedUser.academicSession,
            additional_subjects: updatedUser.additionalSubjects,
            subjects: updatedUser.subjects,
            learning_preferences: updatedUser.learningPreferences,
          },
        });
      }

      // Persist to Supabase student_profiles table directly
      if (user.uid && !user.isGuest) {
        try {
          const fallbackMinutes = updatedUser.learningPreferences?.dailyTargetHours
            ? Math.round(updatedUser.learningPreferences.dailyTargetHours * 60)
            : activePlan?.minutesPerDay || 180;
          await saveStudentProfileDirect(
            {
              board: updatedUser.board || 'CBSE',
              grade: updatedUser.grade || undefined,
              stream: updatedUser.stream || undefined,
              subjects: updatedUser.subjects || ['Physics', 'Chemistry', 'Mathematics'],
              goal: 'Complete CBSE Backlog Recovery',
              priority: 'backlog recovery',
              minutes_per_day: fallbackMinutes,
            },
            user.uid
          );
        } catch (dbErr) {
          console.warn('Direct student profile save warning:', dbErr);
        }
      }

      // Sync curriculum education profile
      try {
        const eduProfile = readEducationProfile(user.uid);
        if (updates.grade) eduProfile.grade = updates.grade as any;
        if (updates.board) eduProfile.curriculum = updates.board as any;
        if (updates.academicSession) eduProfile.academicSession = updates.academicSession;
        if (updates.subjects && Array.isArray(updates.subjects)) {
          eduProfile.enrolledSubjectIds = updates.subjects;
        }
        saveEducationProfile(eduProfile, user.uid);
      } catch (eduErr) {
        console.warn('Curriculum profile sync warning:', eduErr);
      }

      // Update registry and trigger profile update event
      if (updatedUser.email) {
        saveAccountToStore(updatedUser.email, updatedUser);
        refreshAccounts();
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('backlogos-profile-updated', { detail: updatedUser }));
        window.dispatchEvent(new CustomEvent('backlogos-plan-updated'));
      }

      return { success: true };
    } catch (err: any) {
      console.error('Profile update error:', err);
      return { success: false, error: err.message };
    }
  };

  // Authentic Google Sign-in & account switcher — NEVER silently swaps into a different account without OAuth
  const signInWithGoogle = async (googleEmail?: string, _googleName?: string, _googlePhoto?: string | null) => {
    setAuthError(null);
    setSyncStatus('syncing');

    const requestedEmail = googleEmail?.trim().toLowerCase();

    if (isSupabaseConfigured) {
      try {
        const { data: { user: sbUser } } = await supabase.auth.getUser();
        const activeEmail = sbUser?.email?.trim().toLowerCase();
        if (sbUser?.id && isValidUUID(sbUser.id)) {
          // Only reuse existing session when no specific target email was requested OR it matches the active session email
          if (!requestedEmail || activeEmail === requestedEmail) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
              await enqueueAuthTransition(() => hydrateAuthenticatedSession(sbUser, session.access_token));
            }
            return;
          }
          // Switching to a different saved email: cleanly sign out the old session first
          setHydratedUserId(null);
          await supabase.auth.signOut().catch(() => {});
        }
      } catch (e) {
        console.warn('Supabase check error in signInWithGoogle:', e);
      }
    }

    // Launch real Google OAuth with login_hint when switching accounts
    await signInWithGoogleOAuth(requestedEmail);
  };

  const linkGoogleAccountDirect = async () => {
    await signInWithGoogleOAuth();
  };

  const signInWithGoogleRedirect = async () => {
    await signInWithGoogleOAuth();
  };

  const signInAsGuest = (name?: string, grade: string = '11') => {
    setAuthError(null);
    const stableGuestUid = getOrCreateStableGuestId();
    const guestUser: AppUser = {
      uid: stableGuestUid,
      email: 'guest@backlogos.local',
      displayName: name?.trim() || 'Class ' + grade + ' Aspirant',
      grade,
      photoURL: null,
      isGuest: true,
    };
    setUser(guestUser);
    setSyncStatus('offline');
    try {
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guestUser));
      localStorage.removeItem(GOOGLE_USER_STORAGE_KEY);
    } catch {}
  };

  const signOut = async () => {
    try {
      if (user && user.email) {
        saveAccountToStore(user.email, user);
      }
      localStorage.removeItem(GUEST_STORAGE_KEY);
      localStorage.removeItem(GOOGLE_USER_STORAGE_KEY);

      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }

      setUser(null);
      setToken(null);
      setHydratedUserId(null);
      setSyncStatus('idle');
      setAuthError(null);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('backlogos-plan-updated', { detail: null }));
        window.dispatchEvent(new Event('storage'));
      }

      try {
        if (typeof BroadcastChannel !== 'undefined') {
          const ch = new BroadcastChannel('backlogos_auth_channel');
          ch.postMessage({ type: 'LOGOUT' });
          ch.close();
        }
      } catch {}
    } catch (error) {
      console.error('Sign-out error:', error);
    }
  };

  const syncDataNow = async () => {
    if (!user || user.isGuest) return;
    const activeToken = token || (await getCurrentSessionToken()) || '';
    await syncWithBackend(activeToken, user);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        hydratedUserId,
        syncStatus,
        syncError,
        token,
        authError,
        savedAccounts,
        plans,
        activePlan,
        setActivePlan,
        renamePlan,
        deletePlan,
        refreshPlans,
        signInWithGoogle,
        signInWithGoogleOAuth,
        linkGoogleAccountDirect,
        signInWithGoogleRedirect,
        signInWithEmail,
        signUpWithEmail,
        sendPasswordResetEmail,
        updatePassword,
        updateStudentProfile,
        signInAsGuest,
        signOut,
        removeSavedAccount,
        syncDataNow,
        clearAuthError,
        clearSyncError,
      }}
    >
      {children}
    </AuthContext.Provider>

  );
}

export function useAuth() {
  return useContext(AuthContext);
}
