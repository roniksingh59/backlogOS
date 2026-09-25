import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { auth, googleAuthProvider } from './firebase';
import {
  readPlan,
  savePlan,
  readCompleted,
  saveCompleted,
} from './storage';

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error' | 'offline'>('idle');
  const [authError, setAuthError] = useState<AuthErrorInfo | null>(null);

  // Push local plan to server or restore server plan
  const syncWithBackend = async (idToken: string, currentUser: AppUser) => {
    try {
      setSyncStatus('syncing');
      const res = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
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
            Authorization: `Bearer ${idToken}`,
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
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({ chapterIds: localCompleted }),
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
    const code = err?.code || 'auth/unknown';
    const message = err?.message || 'Authentication failed';
    const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'unknown-domain';
    const isUnauthorizedDomain =
      code === 'auth/unauthorized-domain' ||
      message.toLowerCase().includes('unauthorized domain') ||
      message.toLowerCase().includes('authorized domain');

    const errInfo: AuthErrorInfo = {
      code,
      message,
      domain: currentDomain,
      isUnauthorizedDomain,
    };

    setAuthError(errInfo);
    setSyncStatus('idle');
    return errInfo;
  };

  useEffect(() => {
    // Check for redirect result on load
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          const u: AppUser = {
            uid: result.user.uid,
            email: result.user.email,
            displayName: result.user.displayName,
            photoURL: result.user.photoURL,
          };
          setUser(u);
          const idToken = await result.user.getIdToken();
          setToken(idToken);
          await syncWithBackend(idToken, u);
        }
      })
      .catch((err) => {
        handleAuthError(err);
      });

    // Check Firebase Auth state
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const u: AppUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        };
        setUser(u);
        try {
          const idToken = await firebaseUser.getIdToken();
          setToken(idToken);
          await syncWithBackend(idToken, u);
        } catch (e) {
          console.error('Error fetching token:', e);
        }
        setLoading(false);
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
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setAuthError(null);
      setSyncStatus('syncing');
      const result = await signInWithPopup(auth, googleAuthProvider);
      const u: AppUser = {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
      };
      setUser(u);
      localStorage.removeItem(GUEST_STORAGE_KEY);
      const idToken = await result.user.getIdToken();
      setToken(idToken);
      await syncWithBackend(idToken, u);
    } catch (error: any) {
      console.error('Sign-in error:', error);
      handleAuthError(error);
      throw error;
    }
  };

  const signInWithGoogleRedirect = async () => {
    try {
      setAuthError(null);
      await signInWithRedirect(auth, googleAuthProvider);
    } catch (error: any) {
      console.error('Redirect sign-in error:', error);
      handleAuthError(error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      setAuthError(null);
      setSyncStatus('syncing');
      const result = await signInWithEmailAndPassword(auth, email, pass);
      const u: AppUser = {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
      };
      setUser(u);
      localStorage.removeItem(GUEST_STORAGE_KEY);
      const idToken = await result.user.getIdToken();
      setToken(idToken);
      await syncWithBackend(idToken, u);
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
      const result = await createUserWithEmailAndPassword(auth, email, pass);
      if (name && result.user) {
        await updateProfile(result.user, { displayName: name });
      }
      const u: AppUser = {
        uid: result.user.uid,
        email: result.user.email,
        displayName: name || result.user.displayName,
        photoURL: result.user.photoURL,
      };
      setUser(u);
      localStorage.removeItem(GUEST_STORAGE_KEY);
      const idToken = await result.user.getIdToken();
      setToken(idToken);
      await syncWithBackend(idToken, u);
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
      await firebaseSignOut(auth);
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
