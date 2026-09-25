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
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { auth, googleAuthProvider } from './firebase';
import {
  readPlan,
  savePlan,
  readCompleted,
  saveCompleted,
  readStudySessions,
  saveStudySession,
  readNotes,
  saveNote,
  type StudentPlan,
} from './storage';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  token: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  syncDataNow: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  syncStatus: 'idle',
  token: null,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  syncDataNow: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');

  // Push local plan to server or restore server plan
  const syncWithBackend = async (idToken: string, currentUser: User) => {
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
        throw new Error(`Sync failed with status: ${res.status}`);
      }

      const data = await res.json();
      const localPlan = readPlan();

      // If server has a plan, use it or restore it
      if (data.plan) {
        savePlan(data.plan);
      } else if (localPlan) {
        // Otherwise upload our existing local plan to the cloud database
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
      console.warn('Backend sync failed, using offline storage:', err);
      setSyncStatus('error');
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const idToken = await firebaseUser.getIdToken();
          setToken(idToken);
          await syncWithBackend(idToken, firebaseUser);
        } catch (e) {
          console.error('Error fetching token:', e);
        }
      } else {
        setToken(null);
        setSyncStatus('idle');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setSyncStatus('syncing');
      const result = await signInWithPopup(auth, googleAuthProvider);
      setUser(result.user);
      const idToken = await result.user.getIdToken();
      setToken(idToken);
      await syncWithBackend(idToken, result.user);
    } catch (error: any) {
      console.error('Sign-in error:', error);
      setSyncStatus('error');
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setToken(null);
      setSyncStatus('idle');
    } catch (error) {
      console.error('Sign-out error:', error);
    }
  };

  const syncDataNow = async () => {
    if (!user) return;
    const idToken = token || (await user.getIdToken());
    await syncWithBackend(idToken, user);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        syncStatus,
        token,
        signInWithGoogle,
        signOut,
        syncDataNow,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
