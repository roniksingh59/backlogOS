import { createClient, type SupabaseClient, type User, type Session } from '@supabase/supabase-js';

// Read client-side environment variables with fallbacks
const supabaseUrl =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && (process.env?.VITE_SUPABASE_URL || process.env?.SUPABASE_URL)) ||
  '';

const supabaseAnonKey =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && (process.env?.VITE_SUPABASE_ANON_KEY || process.env?.SUPABASE_ANON_KEY)) ||
  '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('http') &&
  !supabaseUrl.includes('your-project-id')
);

// Fallback dummy client if credentials not configured yet to prevent crash on import
const fallbackUrl = 'https://placeholder-project.supabase.co';
const fallbackKey = 'placeholder-anon-key';

export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured ? supabaseUrl : fallbackUrl,
  isSupabaseConfigured ? supabaseAnonKey : fallbackKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'backlogos-supabase-auth-token',
    },
  }
);

/**
 * Returns Supabase request headers including user authorization bearer token
 */
export function getAuthorizedSupabaseHeaders(token?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    apikey: isSupabaseConfigured ? supabaseAnonKey : fallbackKey,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}


/**
 * Computes the OAuth redirect URL for local preview, production Netlify, or custom domains.
 */
export function getSupabaseRedirectUrl(path: string = '/dashboard'): string {
  if (typeof window === 'undefined') return 'https://backlogos.netlify.app/dashboard';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${window.location.origin}${cleanPath}`;
}

/**
 * Helper to fetch the current active Supabase session token
 */
export async function getCurrentSessionToken(): Promise<string | null> {
  try {
    if (!isSupabaseConfigured) return null;
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch {
    return null;
  }
}

/**
 * Helper to fetch the current authenticated Supabase user
 */
export async function getCurrentAuthUser(): Promise<User | null> {
  try {
    if (!isSupabaseConfigured) return null;
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUUID(id?: string | null): boolean {
  if (!id || typeof id !== 'string') return false;
  return UUID_REGEX.test(id.trim());
}

const GUEST_STORAGE_KEY = 'backlogos_guest_user';

function createGuestId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `guest-${crypto.randomUUID()}`;
    }
  } catch {
    // Fall back for older browsers or restricted environments.
  }
  return `guest-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

/**
 * Synchronous helper for the active user namespace.
 * Guest mode is browser-local, but it must still have one stable ID. Never
 * return a hard-coded fallback because onboarding can save data before the
 * protected dashboard has initialized the guest session.
 */
export function getActiveUserId(): string {
  try {
    // 1. Check for cached Supabase session in localStorage
    const raw = localStorage.getItem('backlogos-supabase-auth-token');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.user?.id && isValidUUID(parsed.user.id)) return parsed.user.id;
    }
  } catch {
    // ignore
  }

  try {
    // 2. Check for active Google user session ONLY if it has a genuine UUID
    const localGoogle = localStorage.getItem('backlogos_google_user');
    if (localGoogle) {
      const parsed = JSON.parse(localGoogle);
      if (parsed?.uid && isValidUUID(parsed.uid)) return parsed.uid;
    }
  } catch {
    // ignore
  }

  try {
    // 3. Check for active guest user session
    const localGuest = localStorage.getItem('backlogos_guest_user');
    if (localGuest) {
      const parsed = JSON.parse(localGuest);
      if (parsed?.uid) return parsed.uid;
    }
  } catch {
    // ignore
  }

  const guest = {
    uid: createGuestId(),
    email: 'guest@backlogos.local',
    displayName: 'Guest Student',
    grade: '11',
    photoURL: null,
    isGuest: true,
  };
  try {
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guest));
  } catch {
    // The generated ID remains usable for this call even if storage is blocked.
  }
  return guest.uid;
}


/**
 * Verifies live connection to Supabase project from client
 */
export async function testSupabaseConnection(): Promise<{
  connected: boolean;
  configured: boolean;
  url: string;
  projectId: string;
  message: string;
  latencyMs?: number;
  error?: string;
}> {
  if (!isSupabaseConfigured) {
    return {
      connected: false,
      configured: false,
      url: supabaseUrl || 'Not configured',
      projectId: 'unknown',
      message: 'VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing or invalid',
    };
  }

  const startTime = performance.now();
  try {
    const { error: authError } = await supabase.auth.getSession();
    if (authError) {
      return {
        connected: false,
        configured: true,
        url: supabaseUrl,
        projectId: new URL(supabaseUrl).hostname.split('.')[0],
        message: `Auth check failed: ${authError.message}`,
        error: authError.message,
      };
    }

    const { error: tableError, status } = await supabase
      .from('study_sessions')
      .select('id')
      .limit(1);

    const latencyMs = Math.round(performance.now() - startTime);
    const projectId = new URL(supabaseUrl).hostname.split('.')[0];

    return {
      connected: true,
      configured: true,
      url: supabaseUrl,
      projectId,
      latencyMs,
      message: 'Connected to Supabase project successfully',
    };
  } catch (err: any) {
    return {
      connected: false,
      configured: true,
      url: supabaseUrl,
      projectId: 'unknown',
      message: err?.message || 'Connection failed',
      error: err?.message,
    };
  }
}
