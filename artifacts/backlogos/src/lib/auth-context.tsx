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
} from './supabase';
import {
  readPlan,
  savePlan,
  readCompleted,
  saveCompleted,
} from './storage';
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

function getStoredAccounts(): Record<string, { user: AppUser; password?: string; data?: any }> {
  try {
    const raw = localStorage.getItem(ACCOUNTS_REGISTRY_KEY);
    return raw ? JSON.parse(raw) : {};
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

  // Sync plan and profile with backend strictly scoped to currentUser.uid
  const syncWithBackend = useCallback(async (accessToken: string, currentUser: AppUser) => {
    try {
      setSyncStatus('syncing');
      const res = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          displayName: currentUser.displayName,
          preferredName: currentUser.preferredName,
          schoolName: currentUser.schoolName,
          photoUrl: currentUser.photoURL,
          phone: currentUser.phone,
          grade: currentUser.grade,
          stream: currentUser.stream,
        }),
      });

      if (!res.ok) {
        throw new Error(`Sync responded with ${res.status}`);
      }

      const data = await res.json();
      const userLocalPlan = readPlan(currentUser.uid);

      if (data.user) {
        setUser((prev) => {
          if (!prev) return prev;
          const hasExistingWork = Boolean(
            data.plan ||
            (data.plans && data.plans.length > 0) ||
            (data.completed && data.completed.length > 0) ||
            userLocalPlan
          );
          return {
            ...prev,
            displayName: data.user.displayName || prev.displayName,
            preferredName: data.user.preferredName || prev.preferredName,
            schoolName: data.user.schoolName || prev.schoolName,
            grade: data.user.grade || prev.grade,
            board: data.user.board || prev.board,
            academicSession: data.user.academicSession || prev.academicSession,
            stream: data.user.stream || prev.stream,
            additionalSubjects: data.user.additionalSubjects || prev.additionalSubjects,
            backlogInfo: data.user.backlogInfo || prev.backlogInfo,
            onboardingCompleted: data.user.onboardingCompleted ?? hasExistingWork,
            onboardingStep: data.user.onboardingStep || 1,
            onboardingDraft: data.user.onboardingDraft,
          };
        });
      }

      if (Array.isArray(data.plans)) {
        setPlans(data.plans);
      }

      if (data.plan) {
        setActivePlanState(data.plan);
        savePlan(data.plan, currentUser.uid);
      } else if (userLocalPlan) {
        setActivePlanState(userLocalPlan);
        // Upload local plan to backend
        await fetch('/api/plan', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(userLocalPlan),
        });
      }

      if (Array.isArray(data.completed) && data.completed.length > 0) {
        saveCompleted(data.completed, currentUser.uid);
      } else {
        const localCompleted = readCompleted(currentUser.uid);
        if (localCompleted.length > 0) {
          await fetch('/api/completed', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ chapterIds: localCompleted }),
          });
        }
      }

      if (data.progression) {
        saveProgression(data.progression);
      } else {
        const localProg = readProgression(currentUser.uid);
        if (localProg && localProg.xp > 0) {
          await fetch('/api/progression', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(localProg),
          });
        }
      }

      setSyncStatus('synced');
    } catch (err) {
      console.warn('Backend sync unavailable (running in local storage mode):', err);
      setSyncStatus('offline');
    }
  }, []);

  const setActivePlan = useCallback(async (planId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/plans/${planId}/active`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (d.success && d.plan) {
        setActivePlanState(d.plan);
        if (d.plans) setPlans(d.plans);
        if (user?.uid) savePlan(d.plan, user.uid);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('backlogos-plan-updated', { detail: d.plan }));
        }
      }
    } catch (err) {
      console.error('Failed to set active plan:', err);
    }
  }, [token, user]);

  const deletePlan = useCallback(async (planId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/plans/${planId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (d.success && d.plans) {
        setPlans(d.plans);
      }
    } catch (err) {
      console.error('Failed to delete plan:', err);
    }
  }, [token]);

  const refreshPlans = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/plans', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (d.success && d.plans) {
        setPlans(d.plans);
        const active = d.plans.find((p: any) => p.isActive) || d.plans[0];
        if (active) {
          setActivePlanState(active);
          if (user?.uid) savePlan(active, user.uid);
        }
      }
    } catch (err) {
      console.error('Failed to refresh plans:', err);
    }
  }, [token, user]);


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
            // Check for local saved Google user session
            const storedGoogle = localStorage.getItem(GOOGLE_USER_STORAGE_KEY);
            if (storedGoogle) {
              try {
                const u = JSON.parse(storedGoogle);
                setUser(u);
                setToken('token-' + u.uid);
                setSyncStatus('synced');
              } catch {
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

      // Persist to backend database
      if (token) {
        try {
          await fetch('/api/auth/profile', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              displayName: updatedUser.displayName,
              grade: updatedUser.grade,
              phone: updatedUser.phone,
              photoUrl: updatedUser.photoURL,
            }),
          });
        } catch (apiErr) {
          console.warn('Backend profile sync non-fatal warning:', apiErr);
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

  // Instant direct switch / 1-tap select for device-saved accounts
  const signInWithGoogle = async (googleEmail?: string, googleName?: string, googlePhoto?: string | null) => {
    const cleanEmail = (googleEmail || 's8452543@gmail.com').trim().toLowerCase();
    const rawName = googleName || cleanEmail.split('@')[0] || 'Student';
    const studentName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
    const initials = studentName.slice(0, 2).toUpperCase();

    const googleUser: AppUser = {
      uid: 'google-' + cleanEmail.replace(/[^a-zA-Z0-9]/g, '_'),
      email: cleanEmail,
      displayName: studentName,
      grade: '11',
      photoURL: googlePhoto || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(initials)}&backgroundColor=0284c7,4f46e5`,
      isGuest: false,
    };

    setUser(googleUser);
    setToken('token-' + googleUser.uid);
    setSyncStatus('synced');
    localStorage.setItem(GOOGLE_USER_STORAGE_KEY, JSON.stringify(googleUser));
    localStorage.removeItem(GUEST_STORAGE_KEY);
    saveAccountToStore(cleanEmail, undefined, googleUser);
    restoreUserDataForAccount(googleUser.uid);
    refreshAccounts();

    try {
      await syncWithBackend('token-' + googleUser.uid, googleUser);
    } catch {}

    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const ch = new BroadcastChannel('backlogos_auth_channel');
        ch.postMessage({ type: 'LOGIN_SUCCESS', user: googleUser });
        ch.close();
      }
    } catch {}
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
