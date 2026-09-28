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
  if (!token || !isServerSupabaseConfigured) {
    // If running in development without live Supabase env credentials, permit local dev bypass
    if (process.env.NODE_ENV !== 'production' && token.startsWith('mock-') || token === 'guest-token') {
      return {
        id: 'dev-student-1',
        app_metadata: {},
        user_metadata: { full_name: 'Developer Student' },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        email: 'student@backlogos.local',
      } as User;
    }
    return null;
  }

  try {
    const { data, error } = await supabaseServer.auth.getUser(token);
    if (error || !data.user) {
      return null;
    }
    return data.user;
  } catch (err) {
    console.error('Supabase token verification error:', err);
    return null;
  }
}
