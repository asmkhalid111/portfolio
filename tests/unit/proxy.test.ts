import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { proxy, config, sanitizeNextUrl } from '@/proxy';
import * as proxyLib from '@/lib/supabase/proxy';

describe('Next.js 16 Proxy Architecture & Boundaries (src/proxy.ts)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_key_for_proxy_unit_tests',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Configuration & Exports', () => {
    it('exports a function named proxy and a valid matcher config', () => {
      expect(typeof proxy).toBe('function');
      expect(config).toBeDefined();
      expect(Array.isArray(config.matcher)).toBe(true);
      expect(config.matcher[0]).toContain('(?!_next/static');
    });

    it('throws sanitized error if required Supabase environment variables are missing', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      const req = new NextRequest(new URL('http://localhost:3000/'));
      await expect(proxy(req)).rejects.toThrow(
        /Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/
      );
    });
  });

  describe('Open-Redirect Defense (sanitizeNextUrl)', () => {
    it('returns /admin fallback when rawNext is null, empty, or undefined', () => {
      expect(sanitizeNextUrl(null)).toBe('/admin');
      expect(sanitizeNextUrl('')).toBe('/admin');
    });

    it('rejects protocol-relative URL bypasses (//)', () => {
      expect(sanitizeNextUrl('//evil.com')).toBe('/admin');
      expect(sanitizeNextUrl('//attacker.org/phish')).toBe('/admin');
    });

    it('rejects backslash URL parser confusion (\\)', () => {
      expect(sanitizeNextUrl('/\\evil.com')).toBe('/admin');
      expect(sanitizeNextUrl('\\evil.com')).toBe('/admin');
      expect(sanitizeNextUrl('/admin\\test')).toBe('/admin');
    });

    it('rejects absolute external URLs', () => {
      expect(sanitizeNextUrl('https://evil.com')).toBe('/admin');
      expect(sanitizeNextUrl('http://phishing.site/login')).toBe('/admin');
      expect(sanitizeNextUrl('javascript:alert(1)')).toBe('/admin');
    });

    it('preserves valid internal relative paths and query parameters', () => {
      expect(sanitizeNextUrl('/admin')).toBe('/admin');
      expect(sanitizeNextUrl('/admin/projects')).toBe('/admin/projects');
      expect(sanitizeNextUrl('/admin/projects?status=draft')).toBe('/admin/projects?status=draft');
      expect(sanitizeNextUrl('/auth/setup-password')).toBe('/auth/setup-password');
    });
  });

  describe('Route Boundaries & Redirect Behavior', () => {
    it('redirects unauthenticated visitor requesting /admin to /admin/login?next=%2Fadmin', async () => {
      vi.spyOn(proxyLib, 'createProxySession').mockResolvedValue({
        supabase: {} as any,
        response: NextResponse.next(),
        user: null,
        authHeaders: {},
      });

      const req = new NextRequest(new URL('http://localhost:3000/admin'));
      const res = await proxy(req);

      expect(res.status).toBe(307);
      const location = res.headers.get('location');
      expect(location).toBe('http://localhost:3000/admin/login?next=%2Fadmin');
      expect(res.headers.get('cache-control')).toContain('private, no-cache, no-store');
    });

    it('redirects unauthenticated visitor requesting nested /admin/media to login with encoded next path', async () => {
      vi.spyOn(proxyLib, 'createProxySession').mockResolvedValue({
        supabase: {} as any,
        response: NextResponse.next(),
        user: null,
        authHeaders: {},
      });

      const req = new NextRequest(new URL('http://localhost:3000/admin/media?project=123'));
      const res = await proxy(req);

      expect(res.status).toBe(307);
      const location = res.headers.get('location');
      expect(location).toBe('http://localhost:3000/admin/login?next=%2Fadmin%2Fmedia%3Fproject%3D123');
    });

    it('sanitizes malicious open-redirect parameter during unauthenticated redirect', async () => {
      vi.spyOn(proxyLib, 'createProxySession').mockResolvedValue({
        supabase: {} as any,
        response: NextResponse.next(),
        user: null,
        authHeaders: {},
      });

      const req = new NextRequest(new URL('http://localhost:3000/admin?next=//evil.com'));
      const res = await proxy(req);

      expect(res.status).toBe(307);
      const location = res.headers.get('location');
      // Must sanitize and fallback to safe internal /admin
      expect(location).toBe('http://localhost:3000/admin/login?next=%2Fadmin');
    });

    it('permits unauthenticated access to /admin/login without redirect loop', async () => {
      vi.spyOn(proxyLib, 'createProxySession').mockResolvedValue({
        supabase: {} as any,
        response: NextResponse.next(),
        user: null,
        authHeaders: {},
      });

      const req = new NextRequest(new URL('http://localhost:3000/admin/login'));
      const res = await proxy(req);

      // Must NOT redirect
      expect(res.status).toBe(200);
      expect(res.headers.get('location')).toBeNull();
      expect(res.headers.get('cache-control')).toContain('private, no-cache, no-store');
    });

    it('permits inbound email callbacks on /auth/callback without blocking', async () => {
      vi.spyOn(proxyLib, 'createProxySession').mockResolvedValue({
        supabase: {} as any,
        response: NextResponse.next(),
        user: null,
        authHeaders: {},
      });

      const req = new NextRequest(new URL('http://localhost:3000/auth/callback?code=auth_code_123'));
      const res = await proxy(req);

      expect(res.status).toBe(200);
      expect(res.headers.get('location')).toBeNull();
      expect(res.headers.get('cache-control')).toContain('private, no-cache, no-store');
    });

    it('permits onboarding access to /auth/setup-password without admin whitelist check in proxy', async () => {
      // User is authenticated but proxy does not check admin whitelist
      vi.spyOn(proxyLib, 'createProxySession').mockResolvedValue({
        supabase: {} as any,
        response: NextResponse.next(),
        user: { id: 'invitee-uuid', email: 'invitee@example.com' } as any,
        authHeaders: {},
      });

      const req = new NextRequest(new URL('http://localhost:3000/auth/setup-password'));
      const res = await proxy(req);

      expect(res.status).toBe(200);
      expect(res.headers.get('location')).toBeNull();
    });

    it('permits authenticated requests to /admin to pass through to Server Component layout', async () => {
      vi.spyOn(proxyLib, 'createProxySession').mockResolvedValue({
        supabase: {} as any,
        response: NextResponse.next(),
        user: { id: 'admin-uuid', email: 'admin@example.com' } as any,
        authHeaders: {},
      });

      const req = new NextRequest(new URL('http://localhost:3000/admin'));
      const res = await proxy(req);

      expect(res.status).toBe(200);
      expect(res.headers.get('location')).toBeNull();
      expect(res.headers.get('cache-control')).toContain('private, no-cache, no-store');
    });

    it('permits public homepage / requests to pass through untouched', async () => {
      vi.spyOn(proxyLib, 'createProxySession').mockResolvedValue({
        supabase: {} as any,
        response: NextResponse.next(),
        user: null,
        authHeaders: {},
      });

      const req = new NextRequest(new URL('http://localhost:3000/'));
      const res = await proxy(req);

      expect(res.status).toBe(200);
      expect(res.headers.get('location')).toBeNull();
    });
  });

  describe('Cookie & Cache-Header Preservation on Redirects', () => {
    it('preserves refreshed cookies and Supabase cache headers when constructing a redirect', async () => {
      const baseResponse = NextResponse.next();
      baseResponse.cookies.set('sb-access-token', 'refreshed_access_token_123', {
        path: '/',
        sameSite: 'lax',
        secure: true,
      });
      baseResponse.cookies.set('sb-refresh-token', 'refreshed_refresh_token_456', {
        path: '/',
        sameSite: 'lax',
        secure: true,
      });

      const authHeaders = {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      };

      vi.spyOn(proxyLib, 'createProxySession').mockResolvedValue({
        supabase: {} as any,
        response: baseResponse,
        user: null,
        authHeaders,
      });

      const req = new NextRequest(new URL('http://localhost:3000/admin'));
      const res = await proxy(req);

      expect(res.status).toBe(307);
      // Verify refreshed cookies are preserved on redirect response
      expect(res.cookies.get('sb-access-token')?.value).toBe('refreshed_access_token_123');
      expect(res.cookies.get('sb-refresh-token')?.value).toBe('refreshed_refresh_token_456');

      // Verify Supabase SSR cache headers are preserved on redirect response
      expect(res.headers.get('cache-control')).toBe('private, no-cache, no-store, must-revalidate, max-age=0');
      expect(res.headers.get('pragma')).toBe('no-cache');
      expect(res.headers.get('expires')).toBe('0');
    });
  });
});
