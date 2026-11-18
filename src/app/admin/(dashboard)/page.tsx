import { getAdminAuthStatus } from '@/lib/auth/admin';
import { Database, Shield, Lock, Layers } from 'lucide-react';

export const instant = false;

export default async function AdminDashboardPage() {
  const authStatus = await getAdminAuthStatus();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Administrator Overview
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Secure administration shell established under Milestone M03 (Auth Boundaries).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <Shield className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Authorization Tier</p>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Tier 3 (DB Whitelist)</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <Lock className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Session Grounding</p>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Caller JWT + RPC</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-50 p-2 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
              <Database className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Kernel Isolation</p>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">RLS Forced & Audited</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-6 dark:border-amber-900/40 dark:bg-amber-950/20">
        <div className="flex items-start gap-3">
          <Layers className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden="true" />
          <div className="space-y-1.5">
            <h2 className="text-sm font-bold text-amber-900 dark:text-amber-300">
              M03 Architecture Boundary Notice
            </h2>
            <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-400">
              You are viewing the authenticated M03 administrative shell for{' '}
              <strong className="font-semibold text-amber-950 dark:text-amber-200">
                {authStatus.user?.email}
              </strong>
              . In accordance with the project roadmap, full project CRUD management UI (create, edit, publish, draft isolation) is scheduled for implementation in <strong>Milestone M04</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
