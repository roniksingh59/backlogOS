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
 * Validates incoming Supabase Bearer token against Supabase Auth API
 */
export async function verifySupabaseToken(token: string): Promise<User | null> {
  if (!token) return null;

  // Real Supabase session verification
  if (isServerSupabaseConfigured && !token.startsWith('guest-')) {
    try {
      const { data, error } = await supabaseServer.auth.getUser(token);
      if (!error && data?.user) {
        return data.user;
      }
    } catch (err) {
      console.warn('[Auth Server] Supabase token verification failed:', err);
    }
  }

  // Isolated Guest Session handling (strictly scoped to guest prefix)
  if (token.startsWith('guest-') || token === 'guest-token') {
    const guestId = token === 'guest-token' ? 'guest-ephemeral' : token;
    return {
      id: guestId,
      app_metadata: { provider: 'guest' },
      user_metadata: {
        full_name: 'Guest Aspirant',
        name: 'Guest Aspirant',
        is_guest: true,
      },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      email: 'guest@backlogos.local',
    } as User;
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
