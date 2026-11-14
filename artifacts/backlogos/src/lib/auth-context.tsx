import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import {
  supabase,
  isSupabaseConfigured,
  getSupabaseRedirectUrl,
  isValidUUID,
} from './supabase';
import {
  readPlan,
  readPlanHistory,
  saveCompleted,
  readCompleted,
  readBacklogItems,
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
  loadBacklogItemsDirect,
  saveAllBacklogItemsDirect,
  loadStudySessionsDirect,
  saveStudySessionDirect,
} from './supabase-service';
import {
  readProgression,
  saveProgression,
  saveProgressionLocalOnly,
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
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error' | 'offline';
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
    learningPreferences?: StudentLearningPreferences;
  }) => Promise<{ success: boolean; error?: string }>;
  signInAsGuest: (name?: string, grade?: string) => void;
  signOut: () => Promise<void>;
  removeSavedAccount: (email: string) => void;
  syncDataNow: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  syncStatus: 'idle',
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
 * Safely migrates guest-mode local data (plan, backlog items, completed tasks,
 * focus sessions, revisions, progression) into a signed-in student's UUID namespace
 * when the target namespace does not already contain data.
 */
function migrateGuestDataToUser(targetUid: string) {
  if (typeof localStorage === 'undefined' || !isValidUUID(targetUid)) return;
  try {
    const rawGuest = localStorage.getItem(GUEST_STORAGE_KEY);
    if (!rawGuest) return;
    const guest = JSON.parse(rawGuest);
    const guestUid = guest?.uid;
    if (!guestUid || !String(guestUid).startsWith('guest-')) return;

    const scopedBases = [
      'backlogos-plan-v1',
      'backlogos-plan-history-v1',
      'backlogos-completed-v1',
      'backlogos-study-sessions-v1',
      'backlogos-rest-dates-v1',
      'backlogos-backlog-items-v2',
      'backlogos-smart-daily-plan-v2',
      'backlogos-missed-recovery-v2',
      'backlogos-spaced-revisions-v2',
      'backlogos-recovery-mode-active-v2',
    ];

    for (const base of scopedBases) {
      const guestKey = `${base}:${guestUid}`;
      const targetKey = `${base}:${targetUid}`;
      const guestVal = localStorage.getItem(guestKey);
      if (guestVal !== null) {
        if (localStorage.getItem(targetKey) === null) {
          localStorage.setItem(targetKey, guestVal);
        }
        localStorage.removeItem(guestKey);
      }
    }

    const guestProgKey = `backlogos-progression-v2-${guestUid}`;
    const targetProgKey = `backlogos-progression-v2-${targetUid}`;
    const guestProgVal = localStorage.getItem(guestProgKey);
    if (guestProgVal !== null) {
      if (localStorage.getItem(targetProgKey) === null) {
        try {
          const parsedProg = JSON.parse(guestProgVal);
          parsedProg.userId = targetUid;
          localStorage.setItem(targetProgKey, JSON.stringify(parsedProg));
        } catch {}
      }
      localStorage.removeItem(guestProgKey);
    }
  } catch (e) {
    console.warn('[auth-context] Guest data migration non-fatal warning:', e);
  }
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
    photoURL:
      (metadata.avatar_url as string) ||
      (metadata.picture as string) ||
      null,
    grade: (metadata.class_grade as string) || (metadata.grade as string) || '11',
    board: (metadata.board as string) || 'CBSE',
    academicSession: (metadata.academic_session as string) || '2026-27',
    subjects: (metadata.subjects as string[]) || null,
    learningPreferences: (metadata.learning_preferences as StudentLearningPreferences) || null,
    createdAt: sbUser.created_at,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error' | 'offline'>('idle');
  const [authError, setAuthError] = useState<AuthErrorInfo | null>(null);
  const [savedAccounts, setSavedAccounts] = useState<AppUser[]>(() => getSavedAccountsList());
  const [plans, setPlans] = useState<any[]>([]);
  const [activePlan, setActivePlanState] = useState<any | null>(null);

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

  // Sync plan and profile directly with Supabase strictly scoped to currentUser.uid
  const syncWithBackend = useCallback(async (_accessToken: string, currentUser: AppUser) => {
    try {
      setSyncStatus('syncing');

      // 1. Direct Supabase load for student profile
      const dbProfile = await loadStudentProfileDirect(currentUser.uid);
      const userLocalPlan = readPlan(currentUser.uid);

      if (dbProfile) {
        setUser((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            board: dbProfile.board || prev.board || 'CBSE',
            subjects: dbProfile.subjects || prev.subjects || ['Physics', 'Chemistry', 'Mathematics'],
            onboardingCompleted: true,
          };
        });
      }

      // 2. Direct Supabase load for all study plans (Multi-Plan History)
      const dbPlans = await loadAllStudyPlansDirect(currentUser.uid);
      if (Array.isArray(dbPlans) && dbPlans.length > 0) {
        setPlans(dbPlans);
        const currentActive = dbPlans.find((p) => p.isActive) || dbPlans[0];
        setActivePlanState(currentActive);
      } else if (userLocalPlan) {
        const res = await saveStudyPlanDirect(userLocalPlan, currentUser.uid);
        const savedList = res.plans || [res.plan || userLocalPlan];
        setPlans(savedList);
        setActivePlanState(savedList.find((p) => p.isActive) || savedList[0]);
      } else {
        setPlans([]);
        setActivePlanState(null);
      }

      // 3. Direct Supabase load for completed tasks
      const dbCompleted = await loadCompletedTasksDirect(currentUser.uid);
      if (Array.isArray(dbCompleted) && dbCompleted.length > 0) {
        saveCompleted(dbCompleted, currentUser.uid);
      } else {
        const localCompleted = readCompleted(currentUser.uid);
        if (localCompleted.length > 0) {
          for (const taskId of localCompleted) {
            await saveCompletedTaskDirect(taskId, currentUser.uid);
          }
        }
      }

      // 4. Direct Supabase load for backlog items (or push migrated local items up)
      const dbBacklog = await loadBacklogItemsDirect(currentUser.uid);
      const localBacklog = readBacklogItems(currentUser.uid);
      if (Array.isArray(dbBacklog) && dbBacklog.length > 0) {
        localStorage.setItem(`backlogos-backlog-items-v2:${currentUser.uid}`, JSON.stringify(dbBacklog));
      } else if (localBacklog.length > 0) {
        await saveAllBacklogItemsDirect(localBacklog, currentUser.uid);
      }

      // 5. Direct Supabase load & sync for focus study sessions
      const dbSessions = await loadStudySessionsDirect(currentUser.uid);
      const localSessions = readStudySessions(currentUser.uid);
      if (Array.isArray(dbSessions) && dbSessions.length > 0) {
        const mergedMap = new Map<string, any>();
        for (const s of [...dbSessions, ...localSessions]) {
          const dedupeKey = `${s.chapterId}|${s.minutes}|${String(s.completedAt || '').slice(0, 16)}`;
          if (!mergedMap.has(dedupeKey)) {
            mergedMap.set(dedupeKey, s);
          }
        }
        const mergedSessions = Array.from(mergedMap.values())
          .sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime())
          .slice(0, 150);
        localStorage.setItem(`backlogos-study-sessions-v1:${currentUser.uid}`, JSON.stringify(mergedSessions));
      } else if (localSessions.length > 0) {
        for (const s of localSessions.slice(0, 50)) {
          await saveStudySessionDirect(
            { chapterId: s.chapterId, minutes: s.minutes, mode: s.mode || 'focus', skipLocalCache: true },
            currentUser.uid
          );
        }
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
        if (
          cloudWorkspace.progression &&
          typeof cloudWorkspace.progression.xp === 'number' &&
          cloudWorkspace.progression.xp >= localProg.xp
        ) {
          saveProgressionLocalOnly({ ...cloudWorkspace.progression, userId: currentUser.uid });
        } else if (localProg.xp > 0) {
          await saveWorkspaceStateDirect({ progression: localProg }, currentUser.uid);
        }

        if (cloudWorkspace.dailyPlan && !localDaily) {
          saveSmartDailyPlan(cloudWorkspace.dailyPlan, currentUser.uid);
        }
        if (Array.isArray(cloudWorkspace.revisions) && cloudWorkspace.revisions.length > 0 && localRevisions.length === 0) {
          saveSpacedRevisions(cloudWorkspace.revisions, currentUser.uid);
        }
        if (typeof cloudWorkspace.recoveryMode === 'boolean' && !localRecovery) {
          setRecoveryModeActive(cloudWorkspace.recoveryMode, currentUser.uid);
        }
        if (cloudWorkspace.missedRecovery && !localMissed) {
          saveMissedDayRecovery(cloudWorkspace.missedRecovery, currentUser.uid);
        }
        if (Array.isArray(cloudWorkspace.restDates) && cloudWorkspace.restDates.length > 0 && localRestDates.length === 0) {
          saveRestDates(cloudWorkspace.restDates, currentUser.uid);
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

      setSyncStatus('synced');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('backlogos-plan-updated'));
        window.dispatchEvent(new CustomEvent('backlogos-backlog-updated'));
        window.dispatchEvent(new CustomEvent('backlogos-progression-updated'));
        window.dispatchEvent(new Event('storage'));
      }
    } catch (err) {
      console.warn('[auth-context] Direct Supabase sync non-fatal error:', err);
      setSyncStatus('offline');
    }
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

  useEffect(() => {
    // Purge legacy non-UUID keys immediately
    sanitizeStoredAccounts();

    // 0. Clean OAuth tokens from URL hash if redirected back
    if (typeof window !== 'undefined' && (window.location.hash.includes('access_token') || window.location.search.includes('code='))) {
      setTimeout(() => {
        try {
          const cleanUrl = window.location.origin + window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        } catch {}
      }, 500);
    }

    // Cross-tab synchronization via BroadcastChannel
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('backlogos_auth_channel');
        bc.onmessage = (event) => {
          if (event.data?.type === 'LOGIN_SUCCESS' && event.data?.user) {
            setUser(event.data.user);
            setToken(event.data.token || 'token-' + event.data.user.uid);
            setSyncStatus('synced');
          } else if (event.data?.type === 'LOGOUT') {
            setUser(null);
            setToken(null);
            setSyncStatus('idle');
          }
        };
      }
    } catch {}

    // 1. Initial Session check via Supabase
    if (isSupabaseConfigured) {
      supabase.auth
        .getSession()
        .then(async ({ data: { session }, error }) => {
          if (error) {
            console.warn('Supabase getSession error:', error.message);
          }

          if (session?.user) {
            const u = mapSupabaseUser(session.user);
            setUser(u);
            setToken(session.access_token);
            await syncWithBackend(session.access_token, u);
          } else {
            // Check for local saved Google user session ONLY if it has a genuine UUID
            const storedGoogle = localStorage.getItem(GOOGLE_USER_STORAGE_KEY);
            if (storedGoogle) {
              try {
                const u = JSON.parse(storedGoogle);
                if (u?.uid && isValidUUID(u.uid)) {
                  setUser(u);
                  setToken('token-' + u.uid);
                  setSyncStatus('synced');
                } else {
                  localStorage.removeItem(GOOGLE_USER_STORAGE_KEY);
                }
              } catch {
                localStorage.removeItem(GOOGLE_USER_STORAGE_KEY);
                setUser(null);
              }
            } else {
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
          }
          setLoading(false);
        })
        .catch((err) => {
          handleAuthError(err);
          setLoading(false);
        });

      // 2. Listen to Supabase auth state transitions
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          const u = mapSupabaseUser(session.user);
          migrateGuestDataToUser(u.uid);
          setUser(u);
          setToken(session.access_token);
          localStorage.removeItem(GUEST_STORAGE_KEY);
          await syncWithBackend(session.access_token, u);
        } else if (event === 'SIGNED_OUT') {
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
        setLoading(false);
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
  }, [syncWithBackend, handleAuthError]);

  // 1. EMAIL & PASSWORD LOGIN
  const signInWithEmail = async (email: string, pass: string): Promise<{ success: boolean; error?: string; user?: AppUser }> => {
    try {
      setAuthError(null);
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
        const u = mapSupabaseUser(data.user);
        migrateGuestDataToUser(u.uid);
        setUser(u);
        setToken(data.session.access_token);
        localStorage.removeItem(GUEST_STORAGE_KEY);
        saveAccountToStore(cleanEmail, u);
        refreshAccounts();
        await syncWithBackend(data.session.access_token, u);
        return { success: true, user: u };
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
          migrateGuestDataToUser(u.uid);
          setUser(u);
          setToken(data.session.access_token);
          localStorage.removeItem(GUEST_STORAGE_KEY);
          saveAccountToStore(cleanEmail, u);
          refreshAccounts();
          await syncWithBackend(data.session.access_token, u);
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
    grade?: string;
    phone?: string;
    photoURL?: string | null;
    board?: string;
    academicSession?: string;
    subjects?: string[];
    learningPreferences?: StudentLearningPreferences;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!user) return { success: false, error: 'No user signed in' };

      const updatedUser: AppUser = {
        ...user,
        displayName: updates.displayName !== undefined ? updates.displayName : user.displayName,
        grade: updates.grade !== undefined ? updates.grade : (user.grade || '11'),
        phone: updates.phone !== undefined ? updates.phone : user.phone,
        photoURL: updates.photoURL !== undefined ? updates.photoURL : user.photoURL,
        board: updates.board !== undefined ? updates.board : (user.board || 'CBSE'),
        academicSession: updates.academicSession !== undefined ? updates.academicSession : (user.academicSession || '2026-27'),
        subjects: updates.subjects !== undefined ? updates.subjects : user.subjects,
        learningPreferences: updates.learningPreferences !== undefined ? updates.learningPreferences : user.learningPreferences,
      };

      setUser(updatedUser);

      // Persist to Supabase Auth metadata if signed in
      if (isSupabaseConfigured && !user.isGuest) {
        await supabase.auth.updateUser({
          data: {
            full_name: updatedUser.displayName,
            name: updatedUser.displayName,
            class_grade: updatedUser.grade,
            grade: updatedUser.grade,
            phone: updatedUser.phone,
            avatar_url: updatedUser.photoURL,
            picture: updatedUser.photoURL,
            board: updatedUser.board,
            academic_session: updatedUser.academicSession,
            subjects: updatedUser.subjects,
            learning_preferences: updatedUser.learningPreferences,
          },
        });
      }

      // Persist to Supabase student_profiles table directly
      if (user.uid && !user.isGuest) {
        try {
          await saveStudentProfileDirect(
            {
              board: updatedUser.board || 'CBSE',
              subjects: updatedUser.subjects || ['Physics', 'Chemistry', 'Mathematics'],
              goal: 'Complete CBSE Backlog Recovery',
              priority: 'backlog recovery',
              minutes_per_day: updatedUser.learningPreferences?.dailyTargetHours
                ? Math.round(updatedUser.learningPreferences.dailyTargetHours * 60)
                : 180,
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
            const u = mapSupabaseUser(sbUser);
            setUser(u);
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
              setToken(session.access_token);
              await syncWithBackend(session.access_token, u);
            }
            saveAccountToStore(u.email || sbUser.email || '', u);
            refreshAccounts();
            return;
          }
          // Switching to a different saved email: cleanly sign out the old session first
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
    const guestUser: AppUser = {
      uid: 'guest-' + Math.random().toString(36).substring(2, 9),
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
    if (token) {
      await syncWithBackend(token, user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        syncStatus,
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
      }}
    >
      {children}
    </AuthContext.Provider>

  );
}

export function useAuth() {
  return useContext(AuthContext);
}
