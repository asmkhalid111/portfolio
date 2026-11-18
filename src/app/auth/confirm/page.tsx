'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ShieldCheck, MailCheck, AlertCircle, ArrowRight } from 'lucide-react';

function AuthConfirmContent() {
  const searchParams = useSearchParams();
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') || 'invite';
  const next = searchParams.get('next') || '';

  const isInvite = type === 'invite';
  const isRecovery = type === 'recovery';

  if (!tokenHash) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-16rem)] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/40 dark:bg-red-950/20">
          <AlertCircle className="mx-auto h-8 w-8 text-red-600 dark:text-red-400" aria-hidden="true" />
          <h1 className="mt-3 text-lg font-bold text-red-900 dark:text-red-300">
            Invalid Verification Link
          </h1>
          <p className="mt-2 text-xs text-red-800 dark:text-red-400">
            The link you followed is missing required authentication tokens. Please request a new invitation or recovery email.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-16rem)] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-6 space-y-2 text-center">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
            {isInvite ? (
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            ) : (
              <MailCheck className="h-5 w-5" aria-hidden="true" />
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            {isInvite
              ? 'Confirm Administrator Invitation'
              : isRecovery
              ? 'Confirm Password Recovery'
              : 'Confirm Verification'}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {isInvite
              ? 'Please confirm you wish to accept this invitation and establish your administrative credentials.'
              : isRecovery
              ? 'Please confirm you wish to proceed with resetting your administrator password.'
              : 'Please confirm to complete account verification.'}
          </p>
        </div>

        {/*
          Scanner Defense:
          Submitting via POST ensures that email scanners issuing automated GET requests
          do NOT prematurely consume single-use invitation or recovery token hashes.
        */}
        <form action="/auth/callback" method="POST" className="space-y-4">
          <input type="hidden" name="token_hash" value={tokenHash} />
          <input type="hidden" name="type" value={type} />
          {next && <input type="hidden" name="next" value={next} />}

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
          >
            <span>
              {isInvite
                ? 'Accept Invitation & Continue'
                : isRecovery
                ? 'Proceed to Password Reset'
                : 'Confirm & Continue'}
            </span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AuthConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-[calc(100vh-16rem)] max-w-md items-center justify-center px-4 py-12">
          <div className="text-sm text-gray-500">Loading verification details...</div>
        </div>
      }
    >
      <AuthConfirmContent />
    </Suspense>
  );
}
