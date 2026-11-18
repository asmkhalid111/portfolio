# Milestone M03 Technical Architecture & Security Specification

> **Document:** `docs/milestones/M03-authentication/ARCHITECTURE.md`<br>
> **Milestone:** M03 — Administrator Identity & Auth Boundaries<br>
> **Document Version:** v1.1 (Gate A.1 Architecture & Security Reconciliation)<br>
> **Date:** 2026-11-18<br>
> **Target Framework:** Next.js 16.4.6 (App Router + Turbopack, Node.js Runtime)<br>
> **Auth Provider:** Supabase Auth (GoTrue) via `@supabase/ssr` (`^0.12.7`)<br>
> **Database:** PostgreSQL 17 (`zvmjdssztebhzpplkcrn`)

---

## Revision History

| Version | Date | Author | Summary of Changes | Status |
|:---:|:---:|:---|:---|:---:|
| **v1.0** | 2026-11-18 | Principal Next.js Architect | Initial Gate A architecture specification. | Superseded |
| **v1.1** | 2026-11-18 | Principal Next.js Architect | **Gate A.1 Security Reconciliation:** Corrected Next.js 16 Proxy runtime to Node.js; documented `@supabase/ssr` non-HttpOnly cookie model with strict CSP mitigation; finalized `public.is_admin()` contract and M02 schema grants audit; specified redirect cookie preservation; detailed hosted `{{ .ConfirmationURL }}` vs local Mailpit verification; simplified onboarding state machine to verifiable database states; clarified local vs global sign-out and token revocation semantics. | Current (Pass with Conditions) |

---

## 1. Multi-Tier Security Architecture & Boundary Separation

A primary principle of this architecture is **Defense-in-Depth**. Security is not relegated to a single layer. Instead, requests must pass through four distinct, non-bypassable security tiers:

```
[ Incoming Request ]
        │
        ▼
┌────────────────────────────────────────────────────────┐
│ Tier 1: Next.js 16 Proxy Guard (`src/proxy.ts`)        │
│ - Runtime: Node.js (default runtime in Next.js 16)     │
│ - Session cookie extraction & GoTrue token refresh     │
│ - Request & Response cookie synchronization            │
│ - Redirect cookie preservation (preserves auth tokens) │
│ - Cache-Control: private, no-store enforcement         │
└────────────────────────────────────────────────────────┘
        │
        ▼
┌────────────────────────────────────────────────────────┐
│ Tier 2: Server Component Layout & Action Edge Guards   │
│ - Cryptographic JWT validation via getUser()           │
│ - Rejects forged, revoked, or tampered session cookies │
│ - Strict CSP headers mitigating client-readable cookie │
└────────────────────────────────────────────────────────┘
        │
        ▼
┌────────────────────────────────────────────────────────┐
│ Tier 3: Database Authorization RPC (`public.is_admin`) │
│ - Verifies auth.uid() against private.admin_users      │
│ - SECURITY INVOKER; zero caller parameters             │
│ - PostgREST rejects unexpected parameters              │
│ - Leverages audited M02 schema grants                  │
│ - Rejects unwhitelisted callers with 404/403           │
└────────────────────────────────────────────────────────┘
        │
        ▼
┌────────────────────────────────────────────────────────┐
│ Tier 4: PostgreSQL Kernel RLS & Table Grants           │
│ - Table-level GRANTs: zero privileges on private table │
│ - FORCE ROW LEVEL SECURITY on all application tables   │
│ - Kernel-level draft isolation & mutation gating       │
└────────────────────────────────────────────────────────┘
```

### Separation of Responsibilities

| Responsibility | Responsible Component | Mechanism | Failure Outcome |
|:---|:---|:---|:---|
| **Session Refresh & Cookie Propagation** | Next.js 16 Proxy (`src/proxy.ts`, Node.js runtime) | `@supabase/ssr` `createServerClient` reading/writing cookies across request, response, and redirects | Request continues as unauthenticated; cookies cleared |
| **Identity Verification** | Server Components / Route Handlers | `supabase.auth.getUser()` validating JWT with GoTrue | Throws error or returns `user = null`; access denied |
| **Administrator Authorization** | Server Component Layout / Server Actions | `supabase.rpc('is_admin')` querying database whitelist | Rejects caller with HTTP 404 (preventing route discovery) |
| **Data Mutation Gating** | PostgreSQL Kernel RLS | `USING (private.is_admin())` in database policies | SQLSTATE `42501` / PostgREST returns HTTP 403 Forbidden |

---

## 2. Next.js 16 Proxy Specification (`src/proxy.ts`)

Next.js 16 standardizes request filtering under the `src/proxy.ts` convention, executed before routing and page rendering.

### 2.1 Runtime Environment
> [!IMPORTANT]
> **Runtime is Node.js by default.** Unlike earlier Next.js middleware conventions that required the Edge runtime, Next.js 16 proxy functions run in the standard Node.js runtime unless explicitly configured with `export const runtime = 'edge'`. We explicitly operate on the default **Node.js runtime**, providing full Node.js crypto, standard streams, and robust cookie handling without Edge sandbox limitations.

### 2.2 File Location & Structure
- **Path:** `src/proxy.ts`
- **Exported Function:** `export async function proxy(request: NextRequest): Promise<NextResponse>`

### 2.3 Matcher Configuration
Proxy execution is strictly scoped to application routes while bypassing static bundles, images, and public metadata assets:
```ts
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
```

### 2.4 Proxy Operational Responsibilities & Cookie Propagation
The proxy is responsible for refreshing expired tokens and guaranteeing that cookie mutations are synchronized across the request-response lifecycle:

1. **Dual Cookie Pipeline (Request & Response):**
   ```ts
   let response = NextResponse.next({
     request: {
       headers: request.headers,
     },
   });

   const supabase = createServerClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
     {
       cookies: {
         getAll() {
           return request.cookies.getAll();
         },
         setAll(cookiesToSet) {
           cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
           response = NextResponse.next({
             request,
           });
           cookiesToSet.forEach(({ name, value, options }) =>
             response.cookies.set(name, value, options)
           );
         },
       },
     }
   );
   ```
2. **Session Refresh via GoTrue:**
   The proxy calls `await supabase.auth.getUser()`. If the short-lived access token is expired but a valid refresh token exists, GoTrue issues new tokens. The `setAll` callback automatically writes updated cookies to:
   - Downstream `request.cookies` (ensuring Server Components receive the refreshed token).
   - Upstream `response.cookies` (ensuring the browser client stores the refreshed token).
3. **Redirect Cookie Preservation (Crucial Safeguard):**
   When the proxy generates a redirect response (e.g., redirecting an unauthenticated user to `/admin/login`, or redirecting away from a protected route), **all cookies stored on `response` must be copied onto the redirect response**:
   ```ts
   function createRedirect(url: URL, baseResponse: NextResponse): NextResponse {
     const redirectResponse = NextResponse.redirect(url);
     baseResponse.cookies.getAll().forEach(cookie => {
       redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
     });
     return redirectResponse;
   }
   ```
   Without this safeguard, newly refreshed tokens or sign-out cookie clearing headers are lost during HTTP 307 redirects.
4. **Route Boundary Enforcement:**
   - **Protected Admin Paths (`/admin/**` excluding `/admin/login`):**
     If `user == null`, proxy immediately intercepts the request and issues an HTTP 307 redirect to `/admin/login?next=<encoded_path>`.
   - **Public Login Path (`/admin/login`):**
     If `user != null`, proxy does **not** assume administrator status. It permits the request to pass through to the Server Component, which checks `public.is_admin()`. If the user is an admin, the Server Component redirects to `/admin`; if unwhitelisted, it renders appropriately or redirects to `/auth/pending-approval`.
   - **Onboarding Paths (`/auth/**`):**
     Unconstrained by proxy boundary checks to allow callbacks, password setup, and error views to function cleanly.
5. **Cache Header Enforcement:**
   Injects `Cache-Control: private, no-store, must-revalidate` on all responses within the `/admin` and `/auth` routes.

### 2.5 Critical Boundary Limitation
> [!IMPORTANT]
> The proxy verifies only that a **cryptographically valid session exists**; it **does NOT grant administrator privileges**. Proxy must never inspect `private.admin_users` or attempt to determine whitelist status. Downstream Server Components and Server Actions must independently invoke `public.is_admin()` before rendering sensitive data or executing mutations.

---

## 3. Administrator Authorization Architecture (`public.is_admin()`)

### 3.1 Architectural Conflict in M02 & Solution
In Milestone M02:
- The whitelist table `private.admin_users` was created in schema `private`.
- The helper function `private.is_admin()` was created in schema `private`.
- PostgREST only exposes schema `public` (`schemas = ["public"]`), ensuring zero direct table API exposure.
- **Problem:** Because PostgREST does not expose schema `private`, a Next.js Server Component running `@supabase/ssr` cannot invoke `supabase.rpc('is_admin')` in `private`.

### 3.2 Evaluation of Options & Selection
- **Option 1 (Expose `private` in PostgREST):** REJECTED. Violates least privilege.
- **Option 2 (Use `service_role` key in Server Components):** REJECTED. Prohibited by `AGENTS.md`; high leak risk; bypasses RLS kernel.
- **Option 3 (Direct TCP database connection):** REJECTED. Connection exhaustion on serverless.
- **Option 4 (`SECURITY INVOKER` wrapper in `public`):** **ACCEPTED (ADR-M03-01).**

### 3.3 Database Grants Reconciliation with M02 Foundation
Auditing `supabase/migrations/20261116000001_create_private_schema_and_admin_users.sql` confirmed:
- **Line 13:** `GRANT USAGE ON SCHEMA private TO authenticated;`
- **Line 52:** `GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated;`
- **Line 50:** `REVOKE EXECUTE ON FUNCTION private.is_admin() FROM PUBLIC, anon;`

Because the `authenticated` database role **already possesses** `USAGE ON SCHEMA private` and `EXECUTE ON FUNCTION private.is_admin()`, creating `public.is_admin()` as a `SECURITY INVOKER` function requires **zero additional grants on schema `private`**.

### 3.4 SQL Migration Specification
A new version-controlled migration (`supabase/migrations/20261118000001_create_public_is_admin_rpc.sql`) will define:

```sql
-- 1. Create the public-facing RPC wrapper
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
    -- Delegates directly to the existing audited M02 private function
    -- Running as authenticated caller, which already possesses USAGE on private and EXECUTE on private.is_admin()
    SELECT private.is_admin();
$$;

-- 2. Restrict execution privileges
-- Revoke all default execution permissions from public and anonymous visitors
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;

-- Grant execution strictly to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

COMMENT ON FUNCTION public.is_admin() IS 
'Public-facing RPC wrapper. Evaluates whether the calling authenticated identity (auth.uid()) exists in private.admin_users. Zero parameters accepted; fails closed.';
```

### 3.5 Security Proof & Invariants:
1. **Zero Caller Parameters:** The function signature is `public.is_admin() RETURNS boolean`.
2. **PostgREST Rejection of Extra Arguments:** PostgREST resolves functions strictly by name and matching parameter signatures. When a client calls `supabase.rpc('is_admin', { user_id: 'target' })`, PostgREST cannot find a function matching `public.is_admin(text)` and **immediately returns an error (HTTP 404 / `PGRST202` function not found with specified arguments)**, completely failing closed.
3. **Identity Grounding:** It is `SECURITY INVOKER`, running under the caller's active database role (`authenticated`). When it calls `private.is_admin()`, the underlying `SECURITY DEFINER` function reads `auth.uid()` from the verified JWT context (`request.jwt.claims`).
4. **Anonymous Lockout:** Anonymous visitors (`anon`) possess zero `EXECUTE` privileges. Calling `supabase.rpc('is_admin')` as anon returns HTTP 401/403 permission denied.
5. **Data Isolation:** The function returns a single primitive `boolean` (`true` or `false`). Zero rows or columns of `private.admin_users` are returned or exposed.

---

## 4. Auth Callback, Email Invitations & Open-Redirect Security

The authentication callback handler (`src/app/auth/callback/route.ts`) processes inbound redirects from Supabase Auth emails.

### 4.1 Dual-Flow Support (PKCE vs Token Hash)
Supabase Auth dispatches authentication tokens in two formats depending on client configuration and email templates:

```
Inbound GET /auth/callback
          │
          ├── Has `?code=...`? ────────► [ Flow A: PKCE Exchange ]
          │                                  Call supabase.auth.exchangeCodeForSession(code)
          │
          ├── Has `?token_hash=...`? ──► [ Flow B: Token Hash OTP Verify ]
          │                                  Validate type in ['invite', 'recovery', 'signup', 'email']
          │                                  Call supabase.auth.verifyOtp({ token_hash, type })
          │
          └── Neither present? ────────► [ Error Path ]
                                             Redirect to /auth/error?error=missing_parameters
```

### 4.2 Hosted Email Contract vs Local Mailpit Verification
1. **Hosted Supabase Default Contract:**
   - In production Supabase, the default invitation email template uses `{{ .ConfirmationURL }}`.
   - This link points directly to the hosted Supabase Auth server:
     `https://<ref>.supabase.co/auth/v1/verify?token=<token>&type=invite&redirect_to=<SITE_URL>/auth/callback`
   - When clicked, GoTrue validates the token on the server and redirects the browser to `<SITE_URL>/auth/callback?code=...` (under PKCE) or with `#access_token=...` / query parameters.
2. **Custom Template Direct Callback:**
   - If email templates are configured with direct token links:
     `<SITE_URL>/auth/callback?token_hash={{ .TokenHash }}&type=invite`
   - The inbound request carries `token_hash` directly into `/auth/callback`, which calls `verifyOtp({ token_hash, type: 'invite' })`.
3. **Local Testing Strategy with Mailpit:**
   - In local development, Supabase CLI runs Mailpit (Inbucket on port `54324`).
   - All invitation, recovery, and confirmation emails are captured locally at `http://127.0.0.1:54324`.
   - The test suite (`AUTH-09`, `AUTH-10`) fetches email messages via the Mailpit REST API (`/api/v1/messages`), extracts the exact verification URLs, and executes end-to-end callback verification without external network access or real SMTP delivery.

### 4.3 Open-Redirect Defense Architecture
Untrusted `next` query parameters represent a severe phishing vector if an attacker crafts an invitation link redirecting to an external site.

**Validation Rules:**
1. Parameter must begin with a single `/`.
2. Parameter must **not** begin with `//` (protocol-relative URL bypass).
3. Parameter must **not** contain backslashes `\` (URL parser confusion).
4. Parameter must resolve to an approved internal route whitelist:
   - `/admin`
   - `/auth/setup-password`
   - `/auth/pending-approval`
5. If validation fails, the parameter is dropped and the handler falls back to a safe default:
   - For `type === 'invite'`: `/auth/setup-password`
   - For all other flows: `/admin`

---

## 5. Simplified Onboarding State Machine & Deadlock Prevention

### 5.1 The Onboarding Deadlock Prevented
If password setup is hosted at `/admin/setup-password` while all `/admin/**` routes require `public.is_admin() === true`, an invited user cannot set their password because they are not yet in `private.admin_users`. Conversely, the owner cannot verify the user's confirmed identity in `auth.users` before the password is set.

Decoupling the onboarding flow to `/auth/setup-password` and `/auth/pending-approval` outside the `/admin/**` namespace completely resolves this deadlock.

### 5.2 Grounded Database State Machine (Zero Invented Columns)
The PostgreSQL database has no intermediate onboarding columns (no `status`, `is_invited`, or `pending_approval` columns exist in `private.admin_users` or `auth.users`).

The authorization state machine is therefore grounded strictly in **verifiable facts**:
- **Fact A:** Does a cryptographically verified GoTrue session exist? (`user !== null`)
- **Fact B:** Does the user's `auth.uid()` exist in `private.admin_users`? (`public.is_admin() === true`)

```
                          ┌─────────────────────────────┐
                          │     1. UNAUTHENTICATED      │
                          │        (Visitor)            │
                          └──────────────┬──────────────┘
                                         │ Inbound invitation link
                                         ▼
                          ┌─────────────────────────────┐
                          │ 2. INVITED_CALLBACK_IN_FLIGHT│
                          │   (GET /auth/callback)      │
                          └──────────────┬──────────────┘
                                         │ Token verified -> Session created
                                         ▼
                          ┌─────────────────────────────┐
                          │ 3. AUTHENTICATED_UNWHITELISTED│
                          │   user != null, admin = false│
                          └──────────────┬──────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 │ Accesses /auth/setup-password                 │ Accesses /admin/**
                 ▼                                               ▼
┌─────────────────────────────────┐             ┌─────────────────────────────────┐
│ Form: Set secure password       │             │ Intercepted: HTTP 404 / 307     │
│ Submits -> Redirects to pending │             │ Redirect to /auth/pending-appr. │
└────────────────┬────────────────┘             └─────────────────────────────────┘
                 │
                 ▼
┌───────────────────────────────────────────────────────────────┐
│                  4. AUTHENTICATED_UNWHITELISTED               │
│                  Lands on /auth/pending-approval              │
│                  Awaiting Owner Whitelist SQL                 │
└───────────────────────────────┬───────────────────────────────┘
                                │ Owner executes INSERT into private.admin_users
                                ▼
┌───────────────────────────────────────────────────────────────┐
│                 5. AUTHENTICATED_ADMINISTRATOR                │
│                 user != null, admin = true                    │
│                 Full access to /admin/**                      │
└───────────────────────────────┬───────────────────────────────┘
                                │ Logout or Admin deletion
                                ▼
┌───────────────────────────────────────────────────────────────┐
│                 6. SESSION_EXPIRED_OR_REVOKED                 │
│                 Cookies cleared / Refresh token revoked       │
└───────────────────────────────────────────────────────────────┘
```

### 5.3 Verifiable Identity States

| # | State Name | GoTrue Session | `public.is_admin()` | Accessible Routes | Redirect Behavior |
|:---:|:---|:---:|:---:|:---|:---|
| **1** | `UNAUTHENTICATED` | `null` | N/A (anon) | `/`, `/admin/login`, `/auth/forgot-password`, `/auth/error` | Accessing `/admin/**` -> 307 to `/admin/login` |
| **2** | `INVITED_CALLBACK_IN_FLIGHT` | In exchange | N/A | `/auth/callback` | Exchanges token -> 307 to `/auth/setup-password` |
| **3** | `AUTHENTICATED_UNWHITELISTED` | Active | `false` | `/auth/setup-password`, `/auth/pending-approval`, `/auth/logout` | Accessing `/admin/**` -> HTTP 404 or 307 to `/auth/pending-approval` |
| **4** | `AUTHENTICATED_ADMINISTRATOR` | Active | `true` | Full access to `/admin/**` and public pages | Accessing `/admin/login` -> 307 to `/admin` |
| **5** | `SESSION_EXPIRED_OR_REVOKED` | Expired / None | N/A | Public pages | Proxy refresh fails -> 307 to `/admin/login` |

> [!CRITICAL]
> **Password setup alone does NOT grant administrative rights.** Setting a password merely establishes a local credential for `auth.users`. The identity remains in State 3 (`AUTHENTICATED_UNWHITELISTED`) until the Project Owner explicitly inserts their `id` into `private.admin_users`.

---

## 6. Complete Application Route Matrix

| Route Path | Component Type | Access Control / Auth State | Whitelist Required? | Method / Action | Primary Responsibility |
|:---|:---|:---|:---:|:---:|:---|
| **`/admin/login`** | Client Component | Public / Unauthenticated | No | GET, POST (`signInWithPassword`) | Renders login form; redirects authenticated admins to `/admin` |
| **`/admin`** | Server Component | Authenticated (`getUser()`) | **YES** (`is_admin()`) | GET | Administrative dashboard shell; rejects unwhitelisted with 404 |
| **`/admin/logout`** | Server Action | Authenticated | No | POST (`signOut`) | Clears GoTrue session cookies and redirects to `/admin/login` |
| **`/auth/callback`** | Route Handler | Inbound auth redirect | No | GET | Exchanges `code` or verifies `token_hash`; validates `next` redirect |
| **`/auth/setup-password`**| Client Component | Authenticated (Unwhitelisted) | No | GET, POST (`updateUser`) | Enforces $\ge 12$ char password creation; redirects to pending approval |
| **`/auth/pending-approval`**| Server Component| Authenticated | No | GET | Informs user account is confirmed; awaiting owner whitelist SQL |
| **`/auth/forgot-password`**| Client Component | Public | No | GET, POST (`resetPasswordForEmail`) | Initiates password reset; generic success response |
| **`/auth/reset-password`** | Client Component | Authenticated (Recovery) | No | GET, POST (`updateUser`) | Enforces password change following recovery link verification |
| **`/auth/error`** | Server Component | Public | No | GET | Displays sanitized, user-friendly authentication error messages |

---

## 7. SSR Cookie Security Model & Client-Side Mitigations

### 7.1 Non-HttpOnly Cookie Model in `@supabase/ssr`
In `@supabase/ssr` (`0.12.7`), the session cookies stored in the browser client **are NOT `HttpOnly`**.

**Why?**
The browser client (`createBrowserClient` in `src/lib/supabase/client.ts`) must read session tokens from `document.cookie` to:
1. Hydrate the initial client-side auth state upon page load.
2. Initialize background refresh timers before JWT expiration.
3. Emit real-time authentication events via `onAuthStateChange`.

If cookies were strictly `HttpOnly`, `createBrowserClient` could not read the session token, breaking all client-side authentication listeners and client-rendered forms.

### 7.2 Cookie Attributes & Chunking
The cookies managed by `@supabase/ssr` use the following configuration:
- `Secure: true` (enforced on HTTPS; in local dev `NODE_ENV === 'production'` controls this).
- `SameSite: Lax` (protects against CSRF on state-changing requests while enabling top-level navigations from email links).
- `Path: /` (accessible across the entire application domain).
- **Cookie Chunking:** Because Supabase JWTs with rich metadata can exceed the 4096-byte browser cookie limit, `@supabase/ssr` automatically splits tokens across chunked keys (e.g. `sb-<project-ref>-auth-token.0`, `sb-<project-ref>-auth-token.1`). The proxy and server utilities use `getAll()` to reconstruct chunked cookies seamlessly.

### 7.3 Threat Modeling Implication & Strict CSP Defense
Because session cookies are accessible via JavaScript (`document.cookie`), **Cross-Site Scripting (XSS) represents the single most critical threat to session confidentiality**. If malicious JavaScript executes on the client, it can read `document.cookie` and exfiltrate the active JWT.

To neutralize this risk, the application implements a strict **Defense-in-Depth XSS Mitigation Architecture**:
1. **Strict Content Security Policy (CSP):**
   ```http
   Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://<project-ref>.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self';
   ```
   - Strictly prohibits inline scripts (`script-src 'self'`).
   - Disallows external unvetted scripts and third-party CDNs.
   - Restricts `connect-src` to the application origin and the specific Supabase project endpoint.
2. **React 19 Automatic Output Escaping:**
   - All dynamic content rendered in JSX is automatically escaped by React.
   - Strict ban on `dangerouslySetInnerHTML`.
3. **Zero Credential Logging:**
   - Console logging of session objects, tokens, or user objects is prohibited and enforced via ESLint rules.
4. **Subresource Integrity & Dependency Hygiene:**
   - Zero untrusted third-party analytics, ad tags, or widget libraries.

---

## 8. Session Revocation Semantics & Token Lifetimes

Understanding the distinction between stateless JWT validation and stateful database authorization is essential for accurate security claims:

### 8.1 Local vs Global Sign-Out
1. **Local Sign-Out (`supabase.auth.signOut({ scope: 'local' })`):**
   - Clears session cookies in the browser.
   - The user cannot make subsequent authenticated requests from that browser.
   - However, the JWT access token remains cryptographically valid until its `exp` timestamp (typically up to 1 hour). If an attacker stole the token prior to logout, the stolen token remains valid for direct API requests until `exp`.
2. **Global Sign-Out (`supabase.auth.signOut({ scope: 'global' })`):**
   - Clears session cookies in the browser.
   - GoTrue revokes all active refresh tokens for the user account.
   - Subsequent attempts to refresh the session will fail.
   - The current access token remains valid until `exp` for endpoints that only inspect JWT signatures without querying the database or GoTrue.

### 8.2 Real-Time Whitelist Revocation
While stateless JWT tokens remain valid until expiration, **administrative authorization in this architecture does NOT rely on JWT claims**.
- Every administrative page request and every Server Action execution calls `public.is_admin()`, which executes a live `SELECT` against `private.admin_users`.
- If the Project Owner removes a user from `private.admin_users`, that user's administrative access is **instantly terminated on their very next request**, even if their GoTrue JWT has 59 minutes of validity remaining.
- The user may remain an authenticated visitor (`AUTHENTICATED_UNWHITELISTED`), but all administrative pages return HTTP 404 and all mutations fail closed with PostgreSQL RLS errors.
