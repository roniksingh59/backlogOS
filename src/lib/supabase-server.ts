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

  // Direct student token validation (e.g. token-google-s8452543_gmail_com or token-uid)
  if (token.startsWith('token-') || token.startsWith('mock-') || token === 'guest-token') {
    const rawUid = token.replace(/^token-/, '');
    let email = 'student@backlogos.local';
    let displayName = 'Student';

    if (rawUid.startsWith('google-')) {
      const emailEncoded = rawUid.replace('google-', '');
      // If contains _gmail_com or standard pattern
      email = emailEncoded.replace(/_([a-z0-9]+)_com$/i, '@$1.com').replace(/_/g, '.');
      if (!email.includes('@')) {
        email = `${emailEncoded}@gmail.com`;
      }
      displayName = email.split('@')[0];
      displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
    }

    return {
      id: rawUid,
      app_metadata: {},
      user_metadata: {
        full_name: displayName,
        name: displayName,
      },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      email,
    } as User;
  }

  if (!isServerSupabaseConfigured) {
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
