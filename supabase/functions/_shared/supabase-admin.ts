import { createClient, type SupabaseClient, type User } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

export function getSupabaseEnv(): {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
} {
  const url = Deno.env.get('SUPABASE_URL') || '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

  if (!url || !anonKey || !serviceRoleKey) {
    throw new Error('Missing required Supabase server environment configuration');
  }
  return { url, anonKey, serviceRoleKey };
}

export function createServiceRoleClient(): SupabaseClient {
  const { url, serviceRoleKey } = getSupabaseEnv();
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function requireAuthenticatedUser(
  req: Request
): Promise<{ user: User | null; error: string | null }> {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim() || '';

  if (!token || token.startsWith('guest-') || token === 'guest-token') {
    return { user: null, error: 'Authentication required. Please sign in to verify assessments.' };
  }

  try {
    const { url, anonKey } = getSupabaseEnv();
    const authClient = createClient(url, anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data, error } = await authClient.auth.getUser(token);
    if (error || !data?.user) {
      return { user: null, error: error?.message || 'Invalid or expired session token.' };
    }

    return { user: data.user, error: null };
  } catch (err) {
    return {
      user: null,
      error: err instanceof Error ? err.message : 'Unable to verify authentication token.',
    };
  }
}
