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
  formatIndianPhone,
  isValidUUID,
} from './supabase';
import {
  readPlan,
  savePlan,
  readCompleted,
  saveCompleted,
} from './storage';
import {
  loadActiveStudyPlanDirect,
  saveStudyPlanDirect,
  deleteStudyPlanDirect,
  loadStudentProfileDirect,
  saveStudentProfileDirect,
  loadCompletedTasksDirect,
  loadBacklogItemsDirect,
  saveAllBacklogItemsDirect,
  subscribeToStudentChanges,
  getAuthenticatedUserId,
} from './supabase-service';
import { readProgression, saveProgression } from './progression/progression-service';
import { readEducationProfile, saveEducationProfile } from './curriculum/user-profile-storage';

export interface StudentLearningPreferences {
  dailyTargetHours?: number;
  studyIntensity?: 'balanced' | 'rigorous' | 'exam-rush';
  focusInterval?: number;
  targetExam?: string;
  notesStyle?: string;
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
  deletePlan: (planId: string) => Promise<void>;
  refreshPlans: () => Promise<void>;
  signInWithGoogle: (email?: string, name?: string, photo?: string | null) => Promise<void>;
  signInWithGoogleOAuth: () => Promise<{ success: boolean; error?: string }>;
  linkGoogleAccountDirect: () => Promise<void>;
  signInWithGoogleRedirect: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signUpWithEmail: (
    email: string,
    pass: string,
    name?: string,
    grade?: string
  ) => Promise<{ success: boolean; needsEmailVerification: boolean; error?: string }>;
  sendPasswordResetEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  sendPhoneOtp: (phone: string) => Promise<{ success: boolean; formattedPhone: string; error?: string }>;
  verifyPhoneOtp: (phone: string, token: string) => Promise<{ success: boolean; error?: string }>;
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
  sendPhoneOtp: async () => ({ success: false, formattedPhone: '' }),
  verifyPhoneOtp: async () => ({ success: false }),
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
 * from localStorage so stale cached states cannot resurrect non-UUID strings.
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
        }
      }
      if (changed) {
        localStorage.setItem(ACCOUNTS_REGISTRY_KEY, JSON.stringify(accounts));
      }
    }
  } catch {}
}

function getStoredAccounts(): Record<string, { user: AppUser; password?: string; data?: any }> {
  try {
    const raw = localStorage.getItem(ACCOUNTS_REGISTRY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const valid: Record<string, { user: AppUser; password?: string; data?: any }> = {};
    for (const [k, v] of Object.entries(parsed)) {
      const item = v as any;
      if (item?.user?.uid && (isValidUUID(item.user.uid) || item.user.isGuest)) {
        valid[k] = item;
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

function saveAccountToStore(email: string, password: string | undefined, user: AppUser) {
  try {
    if (!email) return;
    // Only persist authenticated accounts that have a genuine UUID (or explicit guest)
    if (!user.isGuest && !isValidUUID(user.uid)) return;
    const accounts = getStoredAccounts();
    accounts[email.toLowerCase()] = {
      user,
      password,
    };
    localStorage.setItem(ACCOUNTS_REGISTRY_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.warn('Could not save account to registry:', e);
  }
}

function restoreUserDataForAccount(uid: string) {
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('backlogos-plan-updated'));
      window.dispatchEvent(new Event('storage'));
    }
  } catch (e) {
    console.warn('Could not restore user data:', e);
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

      // 2. Direct Supabase load for active study plan
      const dbPlan = await loadActiveStudyPlanDirect(currentUser.uid);
      if (dbPlan) {
        setActivePlanState(dbPlan);
        setPlans([dbPlan]);
        savePlan(dbPlan, currentUser.uid);
      } else if (userLocalPlan) {
        setActivePlanState(userLocalPlan);
        setPlans([userLocalPlan]);
        // Push local plan up to Supabase if not yet in database
        await saveStudyPlanDirect(userLocalPlan, currentUser.uid);
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

      // 4. Direct Supabase load for backlog items
      const dbBacklog = await loadBacklogItemsDirect(currentUser.uid);
      if (Array.isArray(dbBacklog) && dbBacklog.length > 0) {
        localStorage.setItem(`backlogos-backlog-items-v2:${currentUser.uid}`, JSON.stringify(dbBacklog));
      }

      setSyncStatus('synced');
    } catch (err) {
      console.warn('[auth-context] Direct Supabase sync non-fatal error:', err);
      setSyncStatus('offline');
    }
  }, []);

  const setActivePlan = useCallback(async (planId: string) => {
    try {
      const active = plans.find((p: any) => p.id === planId) || plans[0];
      if (active) {
        setActivePlanState(active);
        if (user?.uid) {
          savePlan(active, user.uid);
          await saveStudyPlanDirect(active, user.uid);
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('backlogos-plan-updated', { detail: active }));
        }
      }
    } catch (err) {
      console.error('Failed to set active plan:', err);
    }
  }, [plans, user]);

  const deletePlan = useCallback(async (_planId: string) => {
    try {
      if (user?.uid) {
        await deleteStudyPlanDirect(user.uid);
      }
      setActivePlanState(null);
      setPlans([]);
    } catch (err) {
      console.error('Failed to delete plan:', err);
    }
  }, [user]);

  const refreshPlans = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const p = await loadActiveStudyPlanDirect(user.uid);
      if (p) {
        setActivePlanState(p);
        setPlans([p]);
        savePlan(p, user.uid);
      }
    } catch (err) {
      console.error('Failed to refresh plans:', err);
    }
  }, [user]);


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
  const signInWithEmail = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
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
        setUser(u);
        setToken(data.session.access_token);
        localStorage.removeItem(GUEST_STORAGE_KEY);
        saveAccountToStore(cleanEmail, pass, u);
        refreshAccounts();
        await syncWithBackend(data.session.access_token, u);
        return { success: true };
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
          setUser(u);
          setToken(data.session.access_token);
          localStorage.removeItem(GUEST_STORAGE_KEY);
          saveAccountToStore(cleanEmail, pass, u);
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
  const signInWithGoogleOAuth = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      setAuthError(null);
      setSyncStatus('syncing');

      if (!isSupabaseConfigured) {
        throw new Error('Supabase client is not configured.');
      }

      const redirectUrl = getSupabaseRedirectUrl('/onboarding');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
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

  // 6. PHONE AUTHENTICATION — Intentionally disabled pending SMS provider configuration
  const sendPhoneOtp = async (phone: string): Promise<{ success: boolean; formattedPhone: string; error?: string }> => {
    return {
      success: false,
      formattedPhone: '',
      error: 'Phone authentication is currently paused pending SMS gateway setup. Please use Email or Google sign-in.',
    };
  };

  // 7. PHONE AUTHENTICATION — VERIFY OTP
  const verifyPhoneOtp = async (phone: string, token: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setAuthError(null);
      setSyncStatus('syncing');
      const parsed = formatIndianPhone(phone);
      const targetPhone = parsed.valid ? parsed.formatted : phone.trim();

      if (!isSupabaseConfigured) {
        throw new Error('Supabase client is not configured.');
      }

      const { data, error } = await supabase.auth.verifyOtp({
        phone: targetPhone,
        token: token.trim(),
        type: 'sms',
      });

      if (error) {
        handleAuthError(error);
        return { success: false, error: error.message };
      }

      if (data.user && data.session) {
        const u = mapSupabaseUser(data.user);
        u.phone = targetPhone;
        setUser(u);
        setToken(data.session.access_token);
        localStorage.removeItem(GUEST_STORAGE_KEY);
        await syncWithBackend(data.session.access_token, u);
        return { success: true };
      }

      return { success: false, error: 'Could not verify OTP.' };
    } catch (error: any) {
      console.error('Phone OTP verify error:', error);
      handleAuthError(error);
      return { success: false, error: error.message || 'OTP verification failed.' };
    }
  };

  // 8. UPDATE STUDENT PROFILE (NAME, CBSE CLASS, PHONE, AVATAR, BOARD, SUBJECTS, PREFERENCES)
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
        saveAccountToStore(updatedUser.email, undefined, updatedUser);
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

  // Authentic Google Sign-in & account switcher — NEVER generates custom fake IDs from emails
  const signInWithGoogle = async (googleEmail?: string, _googleName?: string, _googlePhoto?: string | null) => {
    setAuthError(null);
    setSyncStatus('syncing');

    // 1. If an authenticated user session is already established in Supabase, fetch and sync that user
    if (isSupabaseConfigured) {
      try {
        const { data: { user: sbUser } } = await supabase.auth.getUser();
        if (sbUser?.id && isValidUUID(sbUser.id)) {
          const u = mapSupabaseUser(sbUser);
          setUser(u);
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            setToken(session.access_token);
            await syncWithBackend(session.access_token, u);
          }
          saveAccountToStore(u.email || sbUser.email || '', undefined, u);
          refreshAccounts();
          return;
        }
      } catch (e) {
        console.warn('Supabase check error in signInWithGoogle:', e);
      }
    }

    // 2. Check if the target email corresponds to a saved account in our local store
    if (googleEmail) {
      const cleanEmail = googleEmail.trim().toLowerCase();
      const stored = getStoredAccounts();
      const accountRecord = stored[cleanEmail];
      if (accountRecord?.password) {
        // Log in cleanly with stored credentials via Supabase
        const res = await signInWithEmail(cleanEmail, accountRecord.password);
        if (res.success) return;
      }
      if (accountRecord?.user && isValidUUID(accountRecord.user.uid)) {
        // Authenticated user with valid UUID
        setUser(accountRecord.user);
        setSyncStatus('synced');
        return;
      }
    }

    // 3. Initiate authentic Google OAuth via Supabase
    await signInWithGoogleOAuth();
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
        saveAccountToStore(user.email, undefined, user);
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
        sendPhoneOtp,
        verifyPhoneOtp,
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
