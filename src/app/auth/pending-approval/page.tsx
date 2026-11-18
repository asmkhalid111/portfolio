import { getAdminAuthStatus } from '@/lib/auth/admin';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { logoutAction } from '@/lib/auth/actions';
import { Clock, ShieldAlert, ArrowRight, LogOut, CheckCircle } from 'lucide-react';

export const instant = false;

export default async function PendingApprovalPage() {
  const authStatus = await getAdminAuthStatus();

  // If unauthenticated, redirect to login
  if (!authStatus.user) {
    redirect('/admin/login?next=%2Fauth%2Fpending-approval');
  }

  const isWhitelisted = authStatus.isAdmin;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-16rem)] max-w-lg flex-col justify-center px-4 py-12 sm:px-6">
      <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-6 space-y-2 text-center">
          <div
            className={`inline-flex h-12 w-12 items-center justify-center rounded-full ${
              isWhitelisted
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
                : 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400'
            }`}
          >
            {isWhitelisted ? (
              <CheckCircle className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Clock className="h-6 w-6" aria-hidden="true" />
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            {isWhitelisted ? 'Administrator Access Approved' : 'Awaiting Administrator Activation'}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Authenticated identity:{' '}
            <strong className="font-semibold text-gray-900 dark:text-gray-200">
              {authStatus.user.email}
            </strong>
          </p>
        </div>

        {isWhitelisted ? (
          <div className="space-y-6">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
              Your account has been added to the database administrator whitelist. You may now proceed to the administration panel.
            </div>

            <Link
              href="/admin"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
            >
              <span>Access Administrator Panel</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-4 text-xs leading-relaxed text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden="true" />
                <span>
                  Your account credentials have been successfully established. However, administrative privileges require explicit manual activation by the Project Owner.
                </span>
              </div>
            </div>

            <p className="text-center text-xs text-gray-500 dark:text-gray-400">
              Once the Project Owner executes the guarded whitelist insertion, refresh this page or sign in again to access administrative tools.
            </p>

            <form action={logoutAction} className="pt-2">
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-750"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span>Sign Out</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
