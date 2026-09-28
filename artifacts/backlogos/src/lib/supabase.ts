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
 * Computes the OAuth redirect URL for production Netlify and local development.
 * Production Netlify domain: https://backlogos.netlify.app
 */
export function getSupabaseRedirectUrl(): string {
  if (typeof window === 'undefined') return 'https://backlogos.netlify.app/dashboard';
  
  const origin = window.location.origin;
  // If hosted on Netlify or custom domain, redirect back to /dashboard
  return `${origin}/dashboard`;
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

/**
 * Synchronous helper for user ID with guest fallback
 */
export function getActiveUserId(): string {
  try {
    // Check for cached Supabase session in localStorage
    const raw = localStorage.getItem('backlogos-supabase-auth-token');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.user?.id) return parsed.user.id;
    }
  } catch {
    // ignore
  }

  try {
    const localGuest = localStorage.getItem('backlogos_guest_user');
    if (localGuest) {
      const parsed = JSON.parse(localGuest);
      if (parsed.uid) return parsed.uid;
    }
  } catch {
    // ignore
  }

  return 'default-student';
}
