import { getAdminAuthStatus } from '@/lib/auth/admin';
import { redirect } from 'next/navigation';
import { logoutAction } from '@/lib/auth/actions';
import { ShieldCheck, LogOut } from 'lucide-react';

export const instant = false;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authStatus = await getAdminAuthStatus();

  // Tier 2 & Tier 3 Enforcement in Server Component Layout:
  if (authStatus.error === 'unauthenticated' || !authStatus.user) {
    redirect('/admin/login?next=%2Fadmin');
  }

  if (authStatus.error === 'forbidden' || !authStatus.isAdmin) {
    redirect('/auth/pending-approval');
  }

  if (authStatus.error) {
    redirect('/auth/error?error=database_error');
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950">
      <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <span className="text-sm font-bold tracking-tight text-gray-900 dark:text-gray-100">
              Portfolio Admin Panel
            </span>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              Whitelisted
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {authStatus.user.email}
            </span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-750"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Sign Out</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
