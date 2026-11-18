import { NextResponse, type NextRequest } from 'next/server';
import { createProxySession } from '@/lib/supabase/proxy';

/**
 * Next.js 16 Proxy configuration matcher.
 * Intercepts application routes while bypassing static bundles, images, and public assets.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt
     * - Public assets with file extensions (e.g. .svg, .png, .jpg)
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

/**
 * Sanitizes an incoming redirect path to prevent open-redirect vulnerabilities.
 * Enforces single leading slash, rejects protocol-relative URLs (//) and backslashes (\).
 * Handles encoded slashes, backslashes, and control character bypasses.
 */
export function sanitizeNextUrl(rawNext: string | null | undefined): string {
  if (!rawNext) return '/admin';

  // Reject protocol-relative URLs (//) and backslashes (\) anywhere in path or query
  if (rawNext.includes('//') || rawNext.includes('\\')) {
    return '/admin';
  }

  // Must be an internal relative path starting with /
  if (!rawNext.startsWith('/') || rawNext.startsWith('/\\')) {
    return '/admin';
  }

  // Catch URL-encoded slashes, backslashes, and control characters (e.g. %2f, %5c, %09)
  try {
    const decoded = decodeURIComponent(rawNext);
    if (decoded.includes('//') || decoded.includes('\\') || /^\/[\s\x00-\x1f]/.test(decoded)) {
      return '/admin';
    }
  } catch {
    return '/admin';
  }

  return rawNext;
}

/**
 * Creates an HTTP redirect response while strictly preserving refreshed session cookies
 * and Supabase SSR cache headers.
 */
function createRedirectResponse(
  redirectUrl: URL,
  baseResponse: NextResponse,
  authHeaders: Record<string, string>
): NextResponse {
  const redirectResponse = NextResponse.redirect(redirectUrl);

  // 1. Copy all cookies from baseResponse to redirectResponse
  baseResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
  });

  // 2. Propagate Supabase SSR cache headers (e.g. Cache-Control, Expires, Pragma)
  Object.entries(authHeaders).forEach(([key, value]) => {
    redirectResponse.headers.set(key, value);
  });

  // 3. Ensure restrictive Cache-Control for protected/auth redirects
  redirectResponse.headers.set(
    'Cache-Control',
    'private, no-cache, no-store, must-revalidate, max-age=0'
  );

  return redirectResponse;
}

/**
 * Next.js 16 Proxy Entry Point.
 * Operates on the default Node.js runtime.
 * Handles edge session refreshing, cookie synchronization, and coarse route interception.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Initialize SSR session, validate JWT, and capture refreshed cookies/headers
  const { response, user, authHeaders } = await createProxySession(request);

  const isAdminRoute = pathname.startsWith('/admin') && pathname !== '/admin/login';

  // 1. Protected Administrator Boundary (/admin/** excluding /admin/login)
  if (isAdminRoute && !user) {
    // Unauthenticated visitor -> Redirect to /admin/login with sanitized next parameter
    const nextPath = sanitizeNextUrl(pathname + (request.nextUrl.search || ''));
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('next', nextPath);

    return createRedirectResponse(loginUrl, response, authHeaders);
  }

  // 2. Public Login Boundary (/admin/login)
  if (pathname === '/admin/login') {
    // Prevent redirect loops: never redirect /admin/login back to itself.
    // If authenticated, let the Server Component handle redirect if already an admin.
    response.headers.set(
      'Cache-Control',
      'private, no-cache, no-store, must-revalidate, max-age=0'
    );
    return response;
  }

  // 3. Authenticated Onboarding & Callback Routes (/auth/**)
  if (pathname.startsWith('/auth')) {
    // Callback, password setup, reset, and error paths must not be blocked by proxy
    response.headers.set(
      'Cache-Control',
      'private, no-cache, no-store, must-revalidate, max-age=0'
    );
    return response;
  }

  // 4. Authenticated Admin Access (/admin/** with user !== null)
  if (isAdminRoute && user) {
    // Proxy does NOT grant admin rights. It permits the request to pass to the Server Component / Layout,
    // which will call public.is_admin() and render the dashboard or return HTTP 404.
    response.headers.set(
      'Cache-Control',
      'private, no-cache, no-store, must-revalidate, max-age=0'
    );
    return response;
  }

  // 5. Public Landing & Unprotected Routes (e.g. /)
  return response;
}
