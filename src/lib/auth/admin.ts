import { createClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';

export interface AdminAuthResult {
  user: User | null;
  isAdmin: boolean;
  error: 'unauthenticated' | 'forbidden' | 'auth_error' | 'database_error' | null;
}

/**
 * Server-only authorization evaluator for Next.js App Router.
 * Verifies caller identity via GoTrue getUser() and evaluates live administrator
 * whitelist status via parameterless public.is_admin() RPC.
 * Never caches authorization status; fails closed on any error.
 */
export async function getAdminAuthStatus(): Promise<AdminAuthResult> {
  try {
    const supabase = await createClient();

    // 1. Verify caller session and identity against GoTrue
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user) {
      return { user: null, isAdmin: false, error: 'unauthenticated' };
    }

    const user = userData.user;

    // 2. Query live database whitelist status via parameterless SECURITY INVOKER RPC
    const { data: isAdmin, error: rpcError } = await supabase.rpc('is_admin');

    if (rpcError) {
      // Any RPC permission denial, connection failure, or database error fails closed
      return { user, isAdmin: false, error: 'database_error' };
    }

    if (isAdmin !== true) {
      return { user, isAdmin: false, error: 'forbidden' };
    }

    return { user, isAdmin: true, error: null };
  } catch {
    // Fail closed on unexpected exceptions
    return { user: null, isAdmin: false, error: 'auth_error' };
  }
}
