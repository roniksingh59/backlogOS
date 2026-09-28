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
  signInWithGoogle: () => Promise<void>;
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
  }, []);

  const signInWithGoogle = async () => {
    try {
      setAuthError(null);
      setSyncStatus('syncing');

      if (!isSupabaseConfigured) {
        throw new Error(
          'Supabase is not yet configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.'
        );
      }

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

      if (error) throw error;
      if (data?.url) {
        window.location.assign(data.url);
      }
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

      if (!isSupabaseConfigured) {
        throw new Error(
          'Supabase is not yet configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.'
        );
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });

      if (error) throw error;

      if (data.user && data.session) {
        const u = mapSupabaseUser(data.user);
        setUser(u);
        localStorage.removeItem(GUEST_STORAGE_KEY);
        setToken(data.session.access_token);
        await syncWithBackend(data.session.access_token, u);
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

      if (!isSupabaseConfigured) {
        throw new Error(
          'Supabase is not yet configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.'
        );
      }

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

      if (error) throw error;

      if (data.user) {
        const u = mapSupabaseUser(data.user);
        setUser(u);
        localStorage.removeItem(GUEST_STORAGE_KEY);
        if (data.session) {
          setToken(data.session.access_token);
          await syncWithBackend(data.session.access_token, u);
        }
      }
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
    } catch (e) {
      console.warn('Could not store guest session:', e);
    }
  };

  const signOut = async () => {
    try {
      localStorage.removeItem(GUEST_STORAGE_KEY);
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
