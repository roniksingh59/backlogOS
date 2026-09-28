import type { Request, Response, NextFunction } from 'express';
import { verifySupabaseToken } from '../lib/supabase-server.ts';

export interface AuthUserToken {
  uid: string;
  email: string | null;
  name?: string | null;
  picture?: string | null;
  [key: string]: any;
}

export interface AuthRequest extends Request {
  user?: AuthUserToken;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const supabaseUser = await verifySupabaseToken(token);
    if (!supabaseUser) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or expired Supabase token' });
    }

    req.user = {
      uid: supabaseUser.id,
      email: supabaseUser.email || '',
      name:
        (supabaseUser.user_metadata?.full_name as string) ||
        (supabaseUser.user_metadata?.name as string) ||
        null,
      picture:
        (supabaseUser.user_metadata?.avatar_url as string) ||
        (supabaseUser.user_metadata?.picture as string) ||
        null,
      ...supabaseUser.user_metadata,
    };
    next();
  } catch (error) {
    console.error('Error verifying Supabase token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};
