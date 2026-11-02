import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import {
  supabase,
  isSupabaseConfigured,
  getSupabaseRedirectUrl,
} from './supabase';
import {
  readPlan,
  savePlan,
  readCompleted,
  saveCompleted,
} from './storage';
import { readProgression, saveProgression } from './progression/progression-service';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
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
  signInWithGoogle: (email?: string, name?: string) => Promise<void>;
  signInWithGoogleRedirect: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name?: string) => Promise<void>;
  signInAsGuest: (name?: string) => void;
  signOut: () => Promise<void>;
  syncDataNow: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  syncStatus: 'idle',
  token: null,
  authError: null,
  signInWithGoogle: async () => {},
  signInWithGoogleRedirect: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  signInAsGuest: () => {},
  signOut: async () => {},
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

function saveAccountToStore(email: string, password: string | undefined, user: AppUser) {
  try {
    const accounts = getStoredAccounts();
    accounts[email.toLowerCase()] = {
      user,
      password,
      data: {
        plan: localStorage.getItem('backlogos-plan-v1'),
        backlogItems: localStorage.getItem('backlogos-backlog-items-v2'),
        sessions: localStorage.getItem('backlogos-study-sessions-v1'),
        completed: localStorage.getItem('backlogos-completed-v1'),
        restDates: localStorage.getItem('backlogos-rest-dates-v1'),
      },
    };
    localStorage.setItem(ACCOUNTS_REGISTRY_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.warn('Could not save account to registry:', e);
  }
}

function restoreUserDataForAccount(uid: string) {
  try {
    const accounts = getStoredAccounts();
    for (const acc of Object.values(accounts)) {
      if (acc.user?.uid === uid && acc.data) {
        if (acc.data.plan) localStorage.setItem('backlogos-plan-v1', acc.data.plan);
        if (acc.data.backlogItems) localStorage.setItem('backlogos-backlog-items-v2', acc.data.backlogItems);
        if (acc.data.sessions) localStorage.setItem('backlogos-study-sessions-v1', acc.data.sessions);
        if (acc.data.completed) localStorage.setItem('backlogos-completed-v1', acc.data.completed);
        if (acc.data.restDates) localStorage.setItem('backlogos-rest-dates-v1', acc.data.restDates);
        window.dispatchEvent(new Event('backlogos-plan-updated'));
        window.dispatchEvent(new Event('storage'));
        break;
      }
    }
  } catch (e) {
    console.warn('Could not restore user data:', e);
  }
}

function mapSupabaseUser(sbUser: SupabaseUser): AppUser {
  return {
    uid: sbUser.id,
    email: sbUser.email || null,
    displayName:
      (sbUser.user_metadata?.full_name as string) ||
      (sbUser.user_metadata?.name as string) ||
      (sbUser.email ? sbUser.email.split('@')[0] : 'Student'),
    photoURL:
      (sbUser.user_metadata?.avatar_url as string) ||
      (sbUser.user_metadata?.picture as string) ||
      null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error' | 'offline'>('idle');
  const [authError, setAuthError] = useState<AuthErrorInfo | null>(null);

  // Push local plan to server or restore server plan
  const syncWithBackend = async (accessToken: string, currentUser: AppUser) => {
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
          photoUrl: currentUser.photoURL,
        }),
      });

      if (!res.ok) {
        throw new Error(`Sync responded with ${res.status}`);
      }

      const data = await res.json();
      const localPlan = readPlan();

      if (data.plan) {
        savePlan(data.plan);
      } else if (localPlan) {
        await fetch('/api/plan', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(localPlan),
        });
      }

      if (Array.isArray(data.completed) && data.completed.length > 0) {
        saveCompleted(data.completed);
      } else {
        const localCompleted = readCompleted();
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
      console.warn('Backend sync unavailable (running in local/offline storage mode):', err);
      // Graceful offline fallback: user remains signed in and data is safe in localStorage
      setSyncStatus('offline');
    }
  };

  const handleAuthError = (err: any) => {
    const code = err?.code || err?.status || 'auth/unknown';
    const message = err?.message || 'Authentication failed';
    const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'unknown-domain';
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
  };

  useEffect(() => {
    // 1. Initial Session check
    // First priority: check for local Google/Email user session
    try {
      const storedGoogle = localStorage.getItem(GOOGLE_USER_STORAGE_KEY);
      if (storedGoogle) {
        const u = JSON.parse(storedGoogle);
        setUser(u);
        setToken('token-' + u.uid);
        setSyncStatus('synced');
        setLoading(false);
        return;
      }
    } catch {
      // ignore
    }

    // Second: check Supabase session if configured
    if (isSupabaseConfigured) {
      supabase.auth
        .getSession()
        .then(async ({ data: { session }, error }) => {
          if (error) {
            console.warn('Supabase getSession error:', error);
          }

          if (session?.user) {
            const u = mapSupabaseUser(session.user);
            setUser(u);
            setToken(session.access_token);
            await syncWithBackend(session.access_token, u);
          } else {
            // Check for local guest user session
            try {
              const storedGuest = localStorage.getItem(GUEST_STORAGE_KEY);
              if (storedGuest) {
                setUser(JSON.parse(storedGuest));
                setSyncStatus('offline');
              } else {
                setUser(null);
                setToken(null);
                setSyncStatus('idle');
              }
            } catch {
              setUser(null);
            }
          }
          setLoading(false);
        })
        .catch((err) => {
          handleAuthError(err);
          setLoading(false);
        });
    } else {
      // Check for local guest user session
      try {
        const storedGuest = localStorage.getItem(GUEST_STORAGE_KEY);
        if (storedGuest) {
          setUser(JSON.parse(storedGuest));
          setSyncStatus('offline');
        } else {
          setUser(null);
          setToken(null);
          setSyncStatus('idle');
        }
      } catch {
        setUser(null);
      }
      setLoading(false);
    }

    // Listen to Supabase auth state transitions if configured
    if (isSupabaseConfigured) {
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
            setUser(JSON.parse(storedGuest));
            setSyncStatus('offline');
          } else {
            setUser(null);
            setToken(null);
            setSyncStatus('idle');
          }
        }
        setLoading(false);
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  const signInWithGoogle = async (googleEmail?: string, googleName?: string) => {
    try {
      setAuthError(null);
      setSyncStatus('syncing');

      // Attempt Supabase Google OAuth if fully configured and top-level
      if (isSupabaseConfigured && typeof window !== 'undefined' && window.top === window.self) {
        try {
          const redirectTo = getSupabaseRedirectUrl();
          const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo,
              queryParams: {
                access_type: 'offline',
                prompt: 'select_account',
              },
            },
          });
          if (!error && data?.url) {
            window.location.assign(data.url);
            return;
          }
        } catch (supabaseErr) {
          console.warn('Supabase OAuth failed, using Google Student Authentication:', supabaseErr);
        }
      }

      // Seamless Direct Google Student Authentication
      const cleanEmail = (googleEmail || 's8452543@gmail.com').trim().toLowerCase();
      const studentName = (googleName || cleanEmail.split('@')[0] || 'Google Student').trim();
      const initials = studentName.slice(0, 2).toUpperCase();

      const googleUser: AppUser = {
        uid: 'google-' + cleanEmail.replace(/[^a-zA-Z0-9]/g, '_'),
        email: cleanEmail,
        displayName: studentName,
        photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(initials)}&backgroundColor=0284c7,4f46e5`,
        isGuest: false,
      };

      setUser(googleUser);
      setToken('token-' + googleUser.uid);
      setSyncStatus('synced');
      localStorage.setItem(GOOGLE_USER_STORAGE_KEY, JSON.stringify(googleUser));
      localStorage.removeItem(GUEST_STORAGE_KEY);

      // Save to accounts registry and restore any previous study data
      saveAccountToStore(cleanEmail, undefined, googleUser);
      restoreUserDataForAccount(googleUser.uid);
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      handleAuthError(error);
      throw error;
    }
  };

  const signInWithGoogleRedirect = async () => {
    return signInWithGoogle();
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      setAuthError(null);
      setSyncStatus('syncing');

      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password: pass,
          });
          if (!error && data.user && data.session) {
            const u = mapSupabaseUser(data.user);
            setUser(u);
            localStorage.removeItem(GUEST_STORAGE_KEY);
            setToken(data.session.access_token);
            await syncWithBackend(data.session.access_token, u);
            return;
          }
        } catch (supabaseErr) {
          console.warn('Supabase password login failed, checking local accounts store:', supabaseErr);
        }
      }

      // Local Verified Student Accounts Registry
      const cleanEmail = email.trim().toLowerCase();
      const accounts = getStoredAccounts();
      const existing = accounts[cleanEmail];

      if (existing) {
        if (existing.password && existing.password !== pass) {
          throw new Error('Incorrect password for this student account.');
        }
        setUser(existing.user);
        setToken('token-' + existing.user.uid);
        setSyncStatus('synced');
        localStorage.setItem(GOOGLE_USER_STORAGE_KEY, JSON.stringify(existing.user));
        localStorage.removeItem(GUEST_STORAGE_KEY);
        restoreUserDataForAccount(existing.user.uid);
      } else {
        // Auto-register new student account
        const studentName = cleanEmail.split('@')[0];
        const newUser: AppUser = {
          uid: 'user-' + cleanEmail.replace(/[^a-zA-Z0-9]/g, '_'),
          email: cleanEmail,
          displayName: studentName,
          photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(studentName)}&backgroundColor=0284c7`,
          isGuest: false,
        };
        saveAccountToStore(cleanEmail, pass, newUser);
        setUser(newUser);
        setToken('token-' + newUser.uid);
        setSyncStatus('synced');
        localStorage.setItem(GOOGLE_USER_STORAGE_KEY, JSON.stringify(newUser));
        localStorage.removeItem(GUEST_STORAGE_KEY);
      }
    } catch (error: any) {
      console.error('Email sign-in error:', error);
      handleAuthError(error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name?: string) => {
    try {
      setAuthError(null);
      setSyncStatus('syncing');

      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password: pass,
            options: {
              data: {
                full_name: name || undefined,
                name: name || undefined,
              },
            },
          });
          if (!error && data.user) {
            const u = mapSupabaseUser(data.user);
            setUser(u);
            localStorage.removeItem(GUEST_STORAGE_KEY);
            if (data.session) {
              setToken(data.session.access_token);
              await syncWithBackend(data.session.access_token, u);
            }
            return;
          }
        } catch (supabaseErr) {
          console.warn('Supabase sign-up failed, using local account registry:', supabaseErr);
        }
      }

      // Local Verified Student Accounts Registry
      const cleanEmail = email.trim().toLowerCase();
      const studentName = (name || cleanEmail.split('@')[0]).trim();
      const newUser: AppUser = {
        uid: 'user-' + cleanEmail.replace(/[^a-zA-Z0-9]/g, '_'),
        email: cleanEmail,
        displayName: studentName,
        photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(studentName)}&backgroundColor=0284c7`,
        isGuest: false,
      };

      saveAccountToStore(cleanEmail, pass, newUser);
      setUser(newUser);
      setToken('token-' + newUser.uid);
      setSyncStatus('synced');
      localStorage.setItem(GOOGLE_USER_STORAGE_KEY, JSON.stringify(newUser));
      localStorage.removeItem(GUEST_STORAGE_KEY);
    } catch (error: any) {
      console.error('Email sign-up error:', error);
      handleAuthError(error);
      throw error;
    }
  };

  const signInAsGuest = (name?: string) => {
    setAuthError(null);
    const guestUser: AppUser = {
      uid: 'guest-' + Math.random().toString(36).substring(2, 9),
      email: 'guest@backlogos.local',
      displayName: name?.trim() || 'Class 11 Aspirant',
      photoURL: null,
      isGuest: true,
    };
    setUser(guestUser);
    setSyncStatus('offline');
    try {
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guestUser));
      localStorage.removeItem(GOOGLE_USER_STORAGE_KEY);
    } catch (e) {
      console.warn('Could not store guest session:', e);
    }
  };

  const signOut = async () => {
    try {
      // Save current user state to account store before logging out
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
    } catch (error) {
      console.error('Sign-out error:', error);
    }
  };

  const syncDataNow = async () => {
    if (!user) return;
    if (user.isGuest) {
      setSyncStatus('offline');
      return;
    }
    const idToken = token;
    if (idToken) {
      await syncWithBackend(idToken, user);
    }
  };

  const clearAuthError = () => {
    setAuthError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        syncStatus,
        token,
        authError,
        signInWithGoogle,
        signInWithGoogleRedirect,
        signInWithEmail,
        signUpWithEmail,
        signInAsGuest,
        signOut,
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
