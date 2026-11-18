import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from './types';
import type { User } from '@supabase/supabase-js';

export interface ProxySessionResult {
  supabase: ReturnType<typeof createServerClient<Database>>;
  response: NextResponse;
  user: User | null;
  authHeaders: Record<string, string>;
}

/**
 * Creates an SSR-compatible Supabase server client for Next.js 16 Proxy.
 * Extracts session cookies, executes token refresh if expired, and synchronizes
 * mutated cookies and cache headers across request and response pipelines.
 */
export async function createProxySession(request: NextRequest): Promise<ProxySessionResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
    );
  }

  let authHeaders: Record<string, string> = {};

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        // Record refresh-related cache headers (Cache-Control, Expires, Pragma)
        if (headers) {
          authHeaders = { ...authHeaders, ...headers };
        }

        // 1. Update request cookies for downstream Server Components
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        // 2. Clone response with updated request headers
        response = NextResponse.next({
          request,
        });

        // 3. Update outgoing response cookies for the browser client
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });

        // 4. Apply refresh cache headers to outgoing response
        if (headers) {
          Object.entries(headers).forEach(([key, value]) => {
            response.headers.set(key, value);
          });
        }
      },
    },
  });

  // Call getUser() to cryptographically validate the JWT against GoTrue and trigger token refresh if needed
  let user: User | null = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (!error && data?.user) {
      user = data.user;
    }
  } catch {
    // On unexpected network or cryptographic error, fail closed
    user = null;
  }

  return { supabase, response, user, authHeaders };
}
