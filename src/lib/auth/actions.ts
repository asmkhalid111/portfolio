'use server';

import { createClient } from '@/lib/supabase/server';
import { getAdminAuthStatus } from '@/lib/auth/admin';
import { redirect } from 'next/navigation';

/**
 * Standard administrator sign-out Server Action.
 * Clears local browser session cookies and redirects safely to /admin/login.
 */
export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: 'local' });
  redirect('/admin/login');
}

/**
 * Minimal non-mutating administrator-only Server Action.
 * Independently enforces live database authorization via public.is_admin().
 * Used to verify Server Action edge protection (AUTH-06, AUTH-22) without project CRUD.
 */
export async function testAdminAction(): Promise<{ success: boolean; error?: string; message?: string }> {
  const authStatus = await getAdminAuthStatus();

  if (!authStatus.isAdmin) {
    return {
      success: false,
      error: 'Unauthorized: Administrator privileges required',
    };
  }

  return {
    success: true,
    message: 'Administrator authorization verified',
  };
}
