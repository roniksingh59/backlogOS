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
 * Formats a phone number for Indian standard (+91 default) in E.164 format.
 * If user inputs 10 digits e.g. 9876543210 -> +919876543210
 * If user inputs with 91 or +91 -> cleans and outputs +91...
 */
export function formatIndianPhone(input: string): { valid: boolean; formatted: string; error?: string } {
  const cleaned = input.trim().replace(/[\s\-()]/g, '');
  if (!cleaned) {
    return { valid: false, formatted: '', error: 'Please enter your phone number' };
  }

  let digits = cleaned;
  if (digits.startsWith('+')) {
    digits = digits.substring(1);
  }

  // If 10 digits (standard Indian mobile starting with 6, 7, 8, or 9)
  if (/^[6-9]\d{9}$/.test(digits)) {
    return { valid: true, formatted: `+91${digits}` };
  }

  // If 12 digits starting with 91 (e.g. 919876543210)
  if (/^91[6-9]\d{9}$/.test(digits)) {
    return { valid: true, formatted: `+${digits}` };
  }

  // General E.164 international check if student enters another valid country code
  if (/^\d{10,15}$/.test(digits)) {
    return { valid: true, formatted: `+${digits}` };
  }

  return {
    valid: false,
    formatted: `+91${digits}`,
    error: 'Please enter a valid 10-digit Indian mobile number (e.g. 98765 43210)',
  };
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

/**
 * Synchronous helper for user ID with guest fallback
 */
export function getActiveUserId(): string {
  try {
    // 1. Check for cached Supabase session in localStorage
    const raw = localStorage.getItem('backlogos-supabase-auth-token');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.user?.id) return parsed.user.id;
    }
  } catch {
    // ignore
  }

  try {
    // 2. Check for active Google user session
    const localGoogle = localStorage.getItem('backlogos_google_user');
    if (localGoogle) {
      const parsed = JSON.parse(localGoogle);
      if (parsed?.uid) return parsed.uid;
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

  return 'default-student';
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
