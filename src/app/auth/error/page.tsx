'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

const ERROR_DESCRIPTIONS: Record<string, { title: string; message: string }> = {
  token_expired: {
    title: 'Link Expired or Already Used',
    message:
      'The authentication or invitation link you clicked has expired or has already been consumed. For security, each link can only be used once.',
  },
  invalid_token: {
    title: 'Invalid Authentication Token',
    message:
      'The token provided could not be cryptographically validated. Please check the full link in your email or request a new one.',
  },
  missing_parameters: {
    title: 'Missing Required Parameters',
    message:
      'The authentication request arrived without required security parameters. Please verify the URL or try signing in again.',
  },
  unsupported_type: {
    title: 'Unsupported Verification Type',
    message:
      'The specified verification type is not recognized by the security policy.',
  },
  database_error: {
    title: 'Database Security Lockout',
    message:
      'A secure database authorization check could not be completed. In accordance with fail-closed security invariants, access was denied.',
  },
  auth_error: {
    title: 'Authentication Service Unavailable',
    message:
      'The authentication service could not be reached. Please check your connection and try again.',
  },
};

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const errorKey = searchParams.get('error') || 'default';
  const errorInfo = ERROR_DESCRIPTIONS[errorKey] || {
    title: 'Authentication Error',
    message: 'An unexpected authentication error occurred. Please return to login and try again.',
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-16rem)] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-6 space-y-2 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400">
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            {errorInfo.title}
          </h1>
          <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            {errorInfo.message}
          </p>
        </div>

        <div className="pt-2 text-center">
          <Link
            href="/admin/login"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Return to Login</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-[calc(100vh-16rem)] max-w-md items-center justify-center px-4 py-12">
          <div className="text-sm text-gray-500">Loading error details...</div>
        </div>
      }
    >
      <AuthErrorContent />
    </Suspense>
  );
}
