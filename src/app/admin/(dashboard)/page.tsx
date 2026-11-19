import { getAdminAuthStatus } from '@/lib/auth/admin';
import { connection } from 'next/server';
import Link from 'next/link';
import { Database, Shield, Lock, Layers, FolderKanban, ArrowRight } from 'lucide-react';

export const instant = false;

export default async function AdminDashboardPage() {
  await connection();
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

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <FolderKanban className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Project Management
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                View and manage your portfolio projects and publication status.
              </p>
            </div>
          </div>
          <Link
            href="/admin/projects"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            <span>View Projects</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
