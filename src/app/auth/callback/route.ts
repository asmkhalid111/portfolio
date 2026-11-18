import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import type { Database } from '@/lib/supabase/types';
import type { EmailOtpType } from '@supabase/supabase-js';
import { sanitizeNextUrl } from '@/proxy';

const ALLOWED_OTP_TYPES: EmailOtpType[] = ['invite', 'recovery', 'signup', 'email'];

/**
 * Common handler for processing token exchanges (PKCE or OTP token hashes).
 */
async function processAuthExchange(
  request: NextRequest,
  params: {
    code?: string | null;
    token_hash?: string | null;
    type?: string | null;
    next?: string | null;
  }
): Promise<NextResponse> {
  const { code, token_hash, type, next } = params;
  const requestUrl = new URL(request.url);

  // 1. Missing authentication parameters -> redirect to error
  if (!code && !token_hash) {
    return NextResponse.redirect(new URL('/auth/error?error=missing_parameters', request.url));
  }

  // 2. Prepare in-memory cookie collector to ensure all SSR cookies are transferred to redirect response
  const cookiesToApply: Array<{ name: string; value: string; options: CookieOptions }> = [];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

  const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookiesToApply.push({ name, value, options });
        });
      },
    },
  });

  let redirectDestination = '/admin';

  // 3. Flow A: PKCE Authorization Code Exchange
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL('/auth/error?error=invalid_token', request.url));
    }
    // Safe destination validation
    redirectDestination = sanitizeNextUrl(next);
  }

  // 4. Flow B: Token Hash Verification (Invite or Recovery)
  else if (token_hash) {
    const otpType = (type || 'invite') as EmailOtpType;

    if (!ALLOWED_OTP_TYPES.includes(otpType)) {
      return NextResponse.redirect(new URL('/auth/error?error=unsupported_type', request.url));
    }

    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: otpType,
    });

    if (error) {
      const isExpired = error.message.toLowerCase().includes('expired') || error.status === 403;
      const errorParam = isExpired ? 'token_expired' : 'invalid_token';
      return NextResponse.redirect(new URL(`/auth/error?error=${errorParam}`, request.url));
    }

    // Determine secure onboarding destination based on flow type
    if (otpType === 'invite') {
      redirectDestination = '/auth/setup-password';
    } else if (otpType === 'recovery') {
      redirectDestination = '/auth/reset-password';
    } else {
      redirectDestination = sanitizeNextUrl(next);
    }
  }

  // 5. Construct redirect response and attach all captured SSR cookies
  const finalRedirectUrl = new URL(redirectDestination, requestUrl.origin);
  const response = NextResponse.redirect(finalRedirectUrl);

  cookiesToApply.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });

  response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate, max-age=0');

  return response;
}

/**
 * Inbound GET handler for auth redirects (PKCE codes, direct token verification, etc.)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Scanner / Prefetch Safety Guard: Ignore automated prefetch scans without consuming one-time tokens
  const isPrefetch =
    request.headers.get('purpose') === 'prefetch' ||
    request.headers.get('sec-purpose') === 'prefetch';

  if (isPrefetch) {
    return new NextResponse('Prefetch request ignored', { status: 200 });
  }

  const { searchParams } = new URL(request.url);

  return processAuthExchange(request, {
    code: searchParams.get('code'),
    token_hash: searchParams.get('token_hash'),
    type: searchParams.get('type'),
    next: searchParams.get('next'),
  });
}

/**
 * Inbound POST handler for human-confirmed form submissions from /auth/confirm.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();

  return processAuthExchange(request, {
    code: formData.get('code') as string | null,
    token_hash: formData.get('token_hash') as string | null,
    type: formData.get('type') as string | null,
    next: formData.get('next') as string | null,
  });
}
