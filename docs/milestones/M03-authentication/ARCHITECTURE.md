# Milestone M03 Technical Architecture & Security Specification

> **Document:** `docs/milestones/M03-authentication/ARCHITECTURE.md`<br>
> **Milestone:** M03 — Administrator Identity & Auth Boundaries<br>
> **Document Version:** v1.0 (Gate A Specification)<br>
> **Date:** 2026-11-18<br>
> **Target Framework:** Next.js 16.4.6 (App Router + Turbopack)<br>
> **Auth Provider:** Supabase Auth (GoTrue) via `@supabase/ssr` (`^0.12.7`)<br>
> **Database:** PostgreSQL 17 (`zvmjdssztebhzpplkcrn`)

---

## 1. Multi-Tier Security Architecture & Boundary Separation

A primary principle of this architecture is **Defense-in-Depth**. Security is not relegated to a single layer. Instead, requests must pass through four distinct, non-bypassable security tiers:

```
[ Incoming Request ]
        │
        ▼
┌────────────────────────────────────────────────────────┐
│ Tier 1: Next.js 16 Proxy Edge Guard (`src/proxy.ts`)   │
│ - Session cookie extraction & JWT refresh             │
│ - Fast path-level redirection for unauthenticated users│
│ - Cache-Control: private, no-store enforcement         │
└────────────────────────────────────────────────────────┘
        │
        ▼
┌────────────────────────────────────────────────────────┐
│ Tier 2: Server Component Layout & Action Edge Guards   │
│ - Cryptographic JWT identity validation via getUser()  │
│ - Rejects forged or locally tampered session cookies   │
└────────────────────────────────────────────────────────┘
        │
        ▼
┌────────────────────────────────────────────────────────┐
│ Tier 3: Database Authorization RPC (`public.is_admin`) │
│ - Verifies auth.uid() against private.admin_users     │
│ - SECURITY INVOKER; zero caller parameters             │
│ - Rejects authenticated non-admin users with 404/403   │
└────────────────────────────────────────────────────────┘
        │
        ▼
┌────────────────────────────────────────────────────────┐
│ Tier 4: PostgreSQL Kernel RLS & Table Grants           │
│ - Table-level GRANTs: zero privileges on private table │
│ - FORCE ROW LEVEL SECURITY on all public tables        │
│ - Kernel-level draft isolation & mutation gating       │
└────────────────────────────────────────────────────────┘
```

### Separation of Responsibilities

| Responsibility | Responsible Component | Mechanism | Failure Outcome |
|:---|:---|:---|:---|
| **Session Refresh & Cookie Propagation** | Next.js 16 Proxy (`src/proxy.ts`) | `@supabase/ssr` `createServerClient` reading/writing cookies | Request continues as unauthenticated; cookies cleared |
| **Identity Verification** | Server Components / Route Handlers | `supabase.auth.getUser()` validating JWT with GoTrue | Throws error or returns `user = null`; access denied |
| **Administrator Authorization** | Server Component Layout / Server Actions | `supabase.rpc('is_admin')` querying database whitelist | Rejects caller with HTTP 404 (preventing route discovery) |
| **Data Mutation Gating** | PostgreSQL Kernel RLS | `USING (private.is_admin())` in database policies | SQLSTATE `42501` / PostgREST returns HTTP 403 Forbidden |

---

## 2. Next.js 16 Proxy Specification (`src/proxy.ts`)

Next.js 16 standardizes edge request filtering under the `src/proxy.ts` convention, executed before routing and static optimization.

### 2.1 File Location & Structure
- **Path:** `src/proxy.ts`
- **Exported Function:** `export async function proxy(request: NextRequest): Promise<NextResponse>`

### 2.2 Matcher Configuration
Proxy execution is strictly scoped to application routes while bypassing static bundles, images, and system endpoints:
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

### 2.3 Proxy Operational Responsibilities
1. **Response Cloning & Cookie Pipeline:**
   Creates an initial `NextResponse.next({ request: { headers: request.headers } })` to capture and forward mutated cookies.
2. **Session Refresh via GoTrue:**
   Initializes `@supabase/ssr` `createServerClient` using request cookies. Calls `supabase.auth.getUser()`:
   - If the access token is expired but the refresh token is valid, GoTrue issues new tokens.
   - The refreshed tokens are written to both the incoming request headers (for downstream Server Components) and the outgoing response cookies (for the browser).
3. **Route Boundary Enforcement:**
   - **Protected Admin Paths (`/admin/**` excluding `/admin/login`):**
     If `user == null`, proxy immediately intercepts the request and issues an HTTP 307 redirect to `/admin/login?next=<encoded_path>`.
   - **Public Login Path (`/admin/login`):**
     If `user != null`, proxy does **not** assume administrator status. It permits the request to pass through to the Server Component, which checks `is_admin()` and redirects to `/admin` if already an admin, or permits login if not.
   - **Onboarding Paths (`/auth/**`):**
     Unconstrained by proxy to allow callbacks, password setup, and error views to function cleanly.
4. **Cache Header Enforcement:**
   Injects `Cache-Control: private, no-store, must-revalidate` on all responses within the `/admin` and `/auth` trees.

### 2.4 Critical Boundary Limitation
> [!IMPORTANT]
> Proxy verifies only that a **cryptographically valid session exists**; it **does NOT grant administrator privileges**. Proxy must never inspect `private.admin_users` or determine whitelist status. Downstream Server Components and Server Actions must independently invoke `public.is_admin()` before rendering sensitive data or executing mutations.

---

## 3. Administrator Authorization Architecture (`public.is_admin()`)

### 3.1 Architectural Conflict in M02
In Milestone M02:
- The whitelist table `private.admin_users` was created in schema `private`.
- The helper function `private.is_admin()` was created in schema `private`.
- The `private` schema was intentionally omitted from PostgREST (`schemas = ["public"]`), ensuring zero direct table API exposure.
- **Problem:** Because PostgREST only exposes schema `public`, a Next.js Server Component running `@supabase/ssr` cannot invoke `supabase.rpc('is_admin')` in `private`, nor can it query `supabase.from('admin_users')`.

### 3.2 Evaluation of Architectural Options

| Option | Architecture | Trust Boundary | DB Grants Required | PostgREST Exposure | Security Assessment | Verdict |
|:---|:---|:---|:---|:---:|:---|:---:|
| **Option 1** | Expose schema `private` in PostgREST | PostgREST exposes all `private.*` tables | None | High (`private.admin_users` exposed as REST endpoint) | **REJECTED.** Violates least privilege; creates public endpoint for admin table. |
| **Option 2** | Use `service_role` key in Server Components | Server Component bypasses RLS entirely | Bypass RLS | None | **REJECTED.** Prohibited by `AGENTS.md`; high risk of token leak; bypasses kernel security. |
| **Option 3** | Direct TCP Postgres connection (`pg` / `pool`) | Node server connects via port 5432 with password | Direct DB login | None | **REJECTED.** Requires DB password in Vercel; connection exhaustion on serverless. |
| **Option 4** | **`SECURITY INVOKER` wrapper in `public`** | PostgREST exposes only zero-argument RPC | `GRANT EXECUTE` on wrapper to `authenticated` | Minimal (single RPC) | **ACCEPTED.** Zero parameters; derives identity from JWT; zero data exposed. |

### 3.3 Selected Architecture: `public.is_admin()` RPC Wrapper (ADR-M03-01)

#### SQL Migration Specification
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

#### Security Proof & Invariants:
1. **Zero Caller Parameters:** The function signature is `public.is_admin() RETURNS boolean`. The caller cannot pass an arbitrary user ID, email, or role name.
2. **Identity Grounding:** It is `SECURITY INVOKER`, running under the caller's active database role (`authenticated`). When it calls `private.is_admin()`, the underlying `SECURITY DEFINER` function reads `auth.uid()` from the verified JWT context (`request.jwt.claims`).
3. **Anonymous Lockout:** Anonymous visitors (`anon`) possess zero `EXECUTE` privileges. Calling `supabase.rpc('is_admin')` as anon returns an authorization error.
4. **Data Isolation:** The function returns a single primitive `boolean` (`true` or `false`). Zero rows or columns of `private.admin_users` are returned or exposed.
5. **Kernel RLS Preservation:** Existing M02 database policies on `projects` and `project_media` continue invoking `private.is_admin()` directly inside database triggers and policies, remaining 100% intact.

---

## 4. Auth Callback, Email Invitations & Open-Redirect Security

The authentication callback handler (`src/app/auth/callback/route.ts`) processes inbound redirects from Supabase Auth emails.

### 4.1 Dual-Flow Support (PKCE vs Token Hash)
Supabase Auth dispatches authentication tokens in two formats depending on client configuration and email templates. The callback handler must support both:

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

### 4.2 Open-Redirect Defense Architecture
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

## 5. Onboarding State Machine & Deadlock Prevention

### 5.1 The Onboarding Deadlock Identified
If password setup is hosted at `/admin/setup-password` while all `/admin/**` routes require `public.is_admin() === true`, an invited user cannot set their password because they are not yet in `private.admin_users`. Conversely, the owner cannot verify the user's confirmed identity in `auth.users` before the password is set.

### 5.2 Decoupled Route Architecture
To prevent this deadlock, the account completion flow is placed under `/auth/`:
- **`/auth/setup-password`**: Requires an authenticated session, but **does NOT require administrator whitelist membership**.
- **`/auth/pending-approval`**: Safe landing page for a user with completed credentials who is awaiting owner activation.

### 5.3 The 8 Identity States

| # | State Name | Auth Session | Email Confirmed | Whitelisted in `private.admin_users` | Accessible Routes | Redirect Behavior |
|:---:|:---|:---:|:---:|:---:|:---|:---|
| **1** | `UNAUTHENTICATED_VISITOR` | No | No | No | `/`, `/admin/login`, `/auth/forgot-password`, `/auth/error` | Accessing `/admin/**` -> 307 to `/admin/login` |
| **2** | `INVITED_PENDING_CONFIRMATION` | No (Token in email) | Pending | No | Inbound email link | Lands on `/auth/callback` -> exchanges token |
| **3** | `AUTHENTICATED_SETUP_PENDING` | Yes | Yes (via invite) | No | `/auth/setup-password` | Accessing `/admin/**` -> 307 to `/auth/setup-password` |
| **4** | `AUTHENTICATED_UNWHITELISTED` | Yes | Yes | No | `/auth/pending-approval`, `/auth/logout` | Accessing `/admin/**` -> 307 to `/auth/pending-approval` |
| **5** | `AUTHENTICATED_NON_ADMIN` | Yes | Yes | No | Public pages, `/auth/pending-approval` | Accessing `/admin/**` -> HTTP 404 Not Found |
| **6** | `AUTHENTICATED_ADMINISTRATOR` | Yes | Yes | **Yes** | Full access to `/admin/**` and public pages | Accessing `/admin/login` -> 307 to `/admin` |
| **7** | `SESSION_EXPIRED_REVOKED` | Expired | — | — | Public pages | Proxy attempts refresh; fails -> 307 to `/admin/login` |
| **8** | `TOKEN_INVALID_REPLAYED` | Invalid | — | — | `/auth/error` | Callback fails -> 307 to `/auth/error` |

---

## 6. Complete Application Route Matrix

| Route Path | Component Type | Access Control / Auth State | Whitelist Required? | Method / Action | Primary Responsibility |
|:---|:---|:---|:---:|:---:|:---|
| **`/admin/login`** | Client Component | Public / Unauthenticated | No | GET, POST (`signInWithPassword`) | Renders login form; redirects authenticated admins to `/admin` |
| **`/admin`** | Server Component | Authenticated (`getUser()`) | **YES** (`is_admin()`) | GET | Administrative dashboard shell; rejects unwhitelisted with 404 |
| **`/admin/logout`** | Server Action | Authenticated | No | POST (`signOut`) | Clears GoTrue session cookies and redirects to `/admin/login` |
| **`/auth/callback`** | Route Handler | Inbound auth redirect | No | GET | Exchanges `code` or verifies `token_hash`; validates `next` redirect |
| **`/auth/setup-password`**| Client Component | Authenticated (Invited) | No | GET, POST (`updateUser`) | Enforces $\ge 12$ char password creation; redirects to pending approval |
| **`/auth/pending-approval`**| Server Component| Authenticated | No | GET | Informs user account is confirmed; awaiting owner whitelist SQL |
| **`/auth/forgot-password`**| Client Component | Public | No | GET, POST (`resetPasswordForEmail`) | Initiates password reset; generic success response |
| **`/auth/reset-password`** | Client Component | Authenticated (Recovery) | No | GET, POST (`updateUser`) | Enforces password change following recovery link verification |
| **`/auth/error`** | Server Component | Public | No | GET | Displays sanitized, user-friendly authentication error messages |

---

## 7. Password Security & Recovery Architecture

1. **Password Complexity Standards:**
   - Minimum length: **12 characters**.
   - Complexity: Must contain at least one uppercase letter, one lowercase letter, one number, and one special symbol.
   - Enforced client-side and server-side before dispatching to `supabase.auth.updateUser({ password })`.
2. **Account Enumeration Prevention:**
   - The password recovery endpoint (`/auth/forgot-password`) always returns a generic success message: *"If an account exists with that email, a password recovery link has been dispatched."* Zero disclosure of user existence.
3. **Session Invalidation on Password Change:**
   - Upon updating a password, Supabase Auth revokes existing refresh tokens. The server component immediately refreshes the active session.
4. **Zero Credential Exposure:**
   - Passwords and recovery tokens are never logged, never stored in application database tables, and never passed in query parameters.
