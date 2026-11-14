import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  '';

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  '';

export const isServerSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseKey &&
  supabaseUrl.startsWith('http') &&
  !supabaseUrl.includes('your-project-id')
);

// Fallback client if not configured
export const supabaseServer: SupabaseClient = createClient(
  isServerSupabaseConfigured ? supabaseUrl : 'https://placeholder-project.supabase.co',
  isServerSupabaseConfigured ? supabaseKey : 'placeholder-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Validates incoming Supabase Bearer token against Supabase Auth API.
 * Strictly requires a real verified Supabase JWT — forged or local guest-* tokens are rejected.
 */
export async function verifySupabaseToken(token: string): Promise<User | null> {
  if (!token || !isServerSupabaseConfigured) return null;
  if (token.startsWith('guest-') || token === 'guest-token') return null;

  try {
    const { data, error } = await supabaseServer.auth.getUser(token);
    if (!error && data?.user) {
      return data.user;
    }
  } catch (err) {
    console.warn('[Auth Server] Supabase token verification failed:', err);
  }

  return null;
}

/**
 * Checks server-side connectivity to the user's Supabase project
 */
export async function checkServerSupabaseConnection(): Promise<{
  connected: boolean;
  configured: boolean;
  url: string;
  projectId: string;
  latencyMs?: number;
  message: string;
  error?: string;
}> {
  if (!isServerSupabaseConfigured) {
    return {
      connected: false,
      configured: false,
      url: supabaseUrl || 'Not configured',
      projectId: 'unknown',
      message: 'SUPABASE_URL or SUPABASE_ANON_KEY is missing or invalid in server environment',
    };
  }

  const startTime = Date.now();
  try {
    const { error: authError } = await supabaseServer.auth.getSession();
    const { data, error: tableError, status } = await supabaseServer
      .from('study_sessions')
      .select('id')
      .limit(1);

    const latencyMs = Date.now() - startTime;
    const urlObj = new URL(supabaseUrl);
    const projectId = urlObj.hostname.split('.')[0] || 'unknown';

    if (tableError && status !== 200 && status !== 406) {
      return {
        connected: false,
        configured: true,
        url: supabaseUrl,
        projectId,
        latencyMs,
        message: `Connected to Supabase endpoint, but table query returned: ${tableError.message}`,
        error: tableError.message,
      };
    }

    return {
      connected: true,
      configured: true,
      url: supabaseUrl,
      projectId,
      latencyMs,
      message: 'Successfully established live connection to Supabase project',
    };
  } catch (err: any) {
    return {
      connected: false,
      configured: true,
      url: supabaseUrl,
      projectId: 'unknown',
      message: `Failed to connect to Supabase: ${err.message || 'Unknown network error'}`,
      error: err.message,
    };
  }
}
