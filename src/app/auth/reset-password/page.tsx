'use client';

import { Suspense, useState, useTransition, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { KeyRound, Lock, AlertCircle, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const exchangeAttemptedRef = useRef(false);

  const [pageStatus, setPageStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let isMounted = true;

    // Prevent duplicate PKCE code exchange from React Strict Mode double-invocation
    if (exchangeAttemptedRef.current) return;

    const supabase = createClient();

    // 1. Inspect URL search params and hash fragment for error states (e.g. otp_expired, access_denied)
    const queryError = searchParams.get('error_code') || searchParams.get('error');
    const queryErrorDesc = searchParams.get('error_description');

    let hashError: string | null = null;
    let hashErrorDesc: string | null = null;
    let hashAccessToken: string | null = null;
    let hashRefreshToken: string | null = null;

    if (typeof window !== 'undefined' && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      hashError = hashParams.get('error_code') || hashParams.get('error');
      hashErrorDesc = hashParams.get('error_description');
      hashAccessToken = hashParams.get('access_token');
      hashRefreshToken = hashParams.get('refresh_token');
    }

    const effectiveErrorCode = queryError || hashError;
    const effectiveErrorDesc = queryErrorDesc || hashErrorDesc;

    if (effectiveErrorCode) {
      exchangeAttemptedRef.current = true;
      setPageStatus('error');
      if (effectiveErrorCode === 'otp_expired' || effectiveErrorCode === 'access_denied') {
        setErrorMessage(
          'This password recovery link has expired or has already been used. For your security, recovery links can only be used once. Please request a new recovery link.'
        );
      } else {
        setErrorMessage(
          effectiveErrorDesc
            ? decodeURIComponent(effectiveErrorDesc)
            : 'The password recovery link is invalid or expired. Please request a new recovery link.'
        );
      }
      return;
    }

    // 2. PKCE Authorization Code Exchange (Path A)
    const code = searchParams.get('code');
    if (code) {
      exchangeAttemptedRef.current = true;
      // Clean query parameter from address bar immediately to prevent double-exchange on reload
      if (typeof window !== 'undefined') {
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('code');
        const remainingQuery = cleanUrl.searchParams.toString();
        window.history.replaceState({}, '', cleanUrl.pathname + (remainingQuery ? '?' + remainingQuery : ''));
      }

      supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        if (!isMounted) return;
        if (error || !data?.user) {
          setPageStatus('error');
          setErrorMessage(
            'The recovery authorization code could not be verified or has expired. If you opened this link in a different browser than where it was requested, please request a fresh link.'
          );
        } else {
          setUserEmail(data.user.email || null);
          setPageStatus('ready');
        }
      });
      return;
    }

    // 3. Implicit Hash Token Session Establishment (Path B)
    if (hashAccessToken && hashRefreshToken) {
      exchangeAttemptedRef.current = true;
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', window.location.pathname);
      }
      supabase.auth
        .setSession({ access_token: hashAccessToken, refresh_token: hashRefreshToken })
        .then(({ data, error }) => {
          if (!isMounted) return;
          if (error || !data?.user) {
            setPageStatus('error');
            setErrorMessage(
              'Failed to establish a secure recovery session from the provided token. Please request a new recovery link.'
            );
          } else {
            setUserEmail(data.user.email || null);
            setPageStatus('ready');
          }
        });
      return;
    }

    // 4. Listen for auth state change events (e.g. PASSWORD_RECOVERY)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (event === 'PASSWORD_RECOVERY' && session?.user) {
        exchangeAttemptedRef.current = true;
        setUserEmail(session.user.email || null);
        setPageStatus('ready');
      }
    });

    // 5. Existing active recovery session check (Path C)
    // Only permit if an active recovery session exists. If no code, hash, or recovery session, fail closed.
    supabase.auth.getUser().then(({ data, error }) => {
      if (!isMounted) return;
      if (error || !data?.user) {
        setPageStatus('error');
        setErrorMessage(
          'No active password recovery session was found. Please request a new password recovery link to proceed.'
        );
      } else {
        setUserEmail(data.user.email || null);
        setPageStatus('ready');
      }
    });

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, [searchParams]);

  const handleResetPassword = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    if (password.length < 12) {
      setFormError('New password must be at least 12 characters in length.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match. Please verify your entries.');
      return;
    }

    startTransition(async () => {
      try {
        const supabase = createClient();

        const { error: updateError } = await supabase.auth.updateUser({
          password,
        });

        if (updateError) {
          setFormError(updateError.message || 'Failed to update password. Please try again.');
          return;
        }

        // Successfully updated password -> redirect to login with confirmation parameter
        router.push('/admin/login?message=password_updated');
        router.refresh();
      } catch {
        setFormError('An unexpected error occurred while resetting your password.');
      }
    });
  };

  if (pageStatus === 'loading') {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-16rem)] max-w-md items-center justify-center px-4 py-12">
        <div className="text-center space-y-3">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Verifying recovery session...</p>
        </div>
      </div>
    );
  }

  if (pageStatus === 'error') {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-16rem)] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-6 space-y-2 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400">
              <AlertCircle className="h-6 w-6" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              Recovery Link Expired or Invalid
            </h1>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              {errorMessage}
            </p>
          </div>

          <div className="space-y-3 pt-2 text-center">
            <Link
              href="/auth/forgot-password"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
            >
              <span>Request New Reset Link</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>

            <Link
              href="/admin/login"
              className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Return to Login</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-16rem)] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-6 space-y-2 text-center">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
            <KeyRound className="h-5 w-5" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Set New Password
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {userEmail
              ? `Enter a new secure password for ${userEmail}.`
              : 'Enter a new secure password for your administrator account.'}
          </p>
        </div>

        {formError && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleResetPassword} className="space-y-5" noValidate>
          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300"
            >
              New Password (min 12 characters)
            </label>
            <div className="relative mt-1.5">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                <Lock className="h-4 w-4" aria-hidden="true" />
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isPending}
                className="block w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                placeholder="••••••••••••"
              />
            </div>
            {password.length > 0 && password.length >= 12 && (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Meets minimum length requirement</span>
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300"
            >
              Confirm New Password
            </label>
            <div className="relative mt-1.5">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                <Lock className="h-4 w-4" aria-hidden="true" />
              </div>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isPending}
                className="block w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                placeholder="••••••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
          >
            <span>{isPending ? 'Updating Password...' : 'Save New Password & Continue'}</span>
            {!isPending && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-[calc(100vh-16rem)] max-w-md items-center justify-center px-4 py-12">
          <div className="text-sm text-gray-500">Loading recovery details...</div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
