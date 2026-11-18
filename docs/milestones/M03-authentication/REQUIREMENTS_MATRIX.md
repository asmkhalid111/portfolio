# Milestone M03 Requirements Matrix & Design Decisions

> **Document:** `docs/milestones/M03-authentication/REQUIREMENTS_MATRIX.md`<br>
> **Milestone:** M03 — Administrator Identity & Auth Boundaries<br>
> **Version:** v1.1 (Gate A.1 Security Reconciliation)<br>
> **Date:** 2026-11-18

---

## Revision History

| Version | Date | Author | Summary of Changes | Status |
|:---:|:---:|:---|:---|:---:|
| **v1.0** | 2026-11-18 | Principal Next.js Architect | Initial Gate A requirements matrix (25 tests) and 12 ADRs. | Superseded |
| **v1.1** | 2026-11-18 | Principal Next.js Architect | **Gate A.1 Security Reconciliation:** Corrected `AUTH-06` to test M03 `testAdminAction` (decoupled from M04 project CRUD); corrected `AUTH-23` to assert PostgREST parameter rejection; corrected `AUTH-25` to cover M03 auth lifecycle; updated ADRs with Node.js runtime proxy, SSR non-HttpOnly cookie model with strict CSP, audited M02 schema grants, and Mailpit testing. | Current (Pass with Conditions) |

---

## 1. Security Acceptance Test Matrix (`AUTH-01` through `AUTH-25`)

All tests in this suite will be executed against an isolated, disposable local Supabase development stack (`127.0.0.1:54321`) paired with local GoTrue and Mailpit (`127.0.0.1:54324`). Zero production credentials or hosted instances will be used for testing.

| Test ID | Scenario Description | Target Boundary | Test Harness / Fixture | Assertion / Invariant | Expected Outcome |
|:---:|:---|:---|:---|:---|:---:|
| **`AUTH-01`** | Unauthenticated visitor requests `/admin` | Node.js Proxy (`src/proxy.ts`) | Unauthenticated browser request | Status HTTP 307; `Location` header points to `/admin/login?next=%2Fadmin` | **PASS** |
| **`AUTH-02`** | Administrator login page is publicly reachable | Application Routing | Anonymous GET `/admin/login` | Status HTTP 200; renders email & password form | **PASS** |
| **`AUTH-03`** | Invited user completes password setup before whitelist | Decoupled Onboarding | Authenticated session with `public.is_admin() === false` | Accesses `/auth/setup-password`; successfully sets password; redirects to `/auth/pending-approval` | **PASS** |
| **`AUTH-04`** | Authenticated non-admin cannot access `/admin` | Server Component Layout | Authenticated user not in `private.admin_users` | Status HTTP 404 (Not Found) or 307 redirect to `/auth/pending-approval` | **PASS** |
| **`AUTH-05`** | Whitelisted administrator accesses `/admin` | Database Whitelist | Authenticated user present in `private.admin_users` | Status HTTP 200; renders administrative dashboard shell | **PASS** |
| **`AUTH-06`** | Public/non-admin user calls privileged Server Action | Server Action Edge | Direct invoke of M03 `testAdminAction` without admin session | Throws unauthorized error / returns `{ success: false, error: 'Unauthorized' }`; zero database mutations executed | **PASS** |
| **`AUTH-07`** | Forged or tampered cookie rejection | GoTrue JWT Validation | Client sends cookie with modified payload or fake signature | `getUser()` throws error / returns `null`; session cleared; 307 to login | **PASS** |
| **`AUTH-08`** | Expired JWT refresh / revocation | Proxy Session Refresh | Expired access token with valid refresh token | Refreshes session; writes new cookies to request/response; expired refresh token forces 307 login | **PASS** |
| **`AUTH-09`** | PKCE callback code exchange | Callback Route | GET `/auth/callback?code=<valid_code>` | Exchanges code via `exchangeCodeForSession`; sets cookies; preserves cookies on redirect to approved `next` | **PASS** |
| **`AUTH-10`** | Token hash verification (`invite` / `recovery`) | Callback Route & Mailpit | GET `/auth/callback?token_hash=<hash>&type=invite` | Calls `verifyOtp`; establishes session; redirects to `/auth/setup-password` | **PASS** |
| **`AUTH-11`** | Replayed / expired invitation token rejection | Callback Route | Inbound GET with previously used or expired token | GoTrue rejects token; handler redirects to `/auth/error?error=token_expired` | **PASS** |
| **`AUTH-12`** | Open-redirect parameter rejection | Callback Guard | Inbound GET `/auth/callback?code=xxx&next=https://evil.com` | Rejects external URL, `//`, or `\`; drops `next`; redirects to `/admin` or `/auth/setup-password` | **PASS** |
| **`AUTH-13`** | Administrator logout invalidates session | Logout Action | POST `/admin/logout` (invoking `signOut({ scope: 'local' })`) | Cookies cleared; subsequent request to `/admin` redirects to `/admin/login` | **PASS** |
| **`AUTH-14`** | Password recovery completes securely | Recovery Flow | Forgot password request + token callback + `/auth/reset-password` | Updates password; invalidates old sessions; permits login with new password | **PASS** |
| **`AUTH-15`** | Password recovery generic user enumeration defense | Recovery Form | Submit non-existent email to `/auth/forgot-password` | Status HTTP 200; identical generic confirmation message displayed | **PASS** |
| **`AUTH-16`** | Password setup alone cannot grant admin access | Onboarding State | User sets password; immediately requests `/admin` | Denied with HTTP 404; database RLS policies reject data access | **PASS** |
| **`AUTH-17`** | Instant administrator revocation | Live Database Check | Admin record deleted from `private.admin_users`; user holds valid JWT | Next request to `/admin` or Server Action is immediately rejected with 404 | **PASS** |
| **`AUTH-18`** | Shared cache isolation for authenticated views | Cache Headers | GET `/admin` and `/auth/**` responses | Headers contain `Cache-Control: private, no-store, must-revalidate` | **PASS** |
| **`AUTH-19`** | Zero service-role secrets in client bundles & CSP | Build Artifact Scan | Automated regex scan across `.next/static` bundles | Zero occurrences of secret keys; CSP header configured without `unsafe-eval` | **PASS** |
| **`AUTH-20`** | Authenticated user cannot read `private.admin_users` | PostgreSQL Grants | Authenticated user calls `supabase.from('admin_users').select()` | Returns HTTP 404 (`PGRST205: table not found in schema cache`) | **PASS** |
| **`AUTH-21`** | Redirect loopback prevention | Edge State Machine | Repeated requests with invalid/expired cookies | Deterministic termination at `/admin/login`; zero redirect loops | **PASS** |
| **`AUTH-22`** | Server Action independent authorization | Server Action | Direct POST to mutation action bypassing proxy | Action internally verifies `public.is_admin()`; fails closed | **PASS** |
| **`AUTH-23`** | PostgREST rejection of unexpected RPC arguments | RPC Contract | Caller passes `{ user_id: 'fake' }` to `public.is_admin()` | PostgREST rejects call with HTTP 404 / `PGRST202` (function not found with specified parameters), failing closed | **PASS** |
| **`AUTH-24`** | Anonymous lockout on `public.is_admin()` | PostgreSQL Permissions | Anonymous client calls `supabase.rpc('is_admin')` | PostgREST returns permission denied (EXECUTE revoked from `anon`) | **PASS** |
| **`AUTH-25`** | Full M03 auth lifecycle & resilience | End-to-End Replay | Full cycle: invite -> verify OTP -> setup password -> pending approval -> whitelist insertion -> admin login -> testAdminAction execution -> logout | All M03 auth state transitions complete successfully; state retention verified | **PASS** |

---

## 2. Architecture Decisions Record (ADR-M03)

### DEC-01: Next.js 16 Proxy Architecture (`src/proxy.ts`)
- **Selected:** Implement session refresh, cookie propagation, and pre-routing boundaries in `src/proxy.ts` on the **default Node.js runtime**.
- **Rationale:** Next.js 16 proxy runs on the standard Node.js runtime by default, providing full Node.js crypto and cookie handling without Edge sandbox limitations. The proxy synchronizes `@supabase/ssr` cookies across `request.cookies`, `response.cookies`, and preserves cookies on redirect responses (`NextResponse.redirect`).
- **Alternatives Rejected:** Edge runtime proxy (`export const runtime = 'edge'`) — unnecessary sandbox constraints. Traditional `middleware.ts` — deprecated conventions in Next.js 16. Relying solely on client components — vulnerable to flash-of-unauthenticated-content and unverified cookies.
- **Tradeoffs:** Proxy executes on every non-static request; overhead minimized by fast path-matching.
- **Owner Approval:** Standard technical implementation.

---

### DEC-02: Server-Verifiable Administrator Authorization via `public.is_admin()` RPC
- **Selected:** Deploy a parameterless `SECURITY INVOKER` function `public.is_admin()` that delegates to `private.is_admin()`.
- **Rationale:** PostgREST only exposes schema `public`. A parameterless `SECURITY INVOKER` RPC allows Server Components to query admin status using the caller's JWT without exposing `private.admin_users` or requiring a superuser key.
- **M02 Schema Grants Alignment:** Auditing `supabase/migrations/20261116000001` confirmed `authenticated` already possesses `GRANT USAGE ON SCHEMA private` and `GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated`. Therefore, `public.is_admin()` requires zero additional grants on `private`.
- **Alternatives Rejected:** Exposing `private` schema in PostgREST (data leak risk). Using `SUPABASE_SERVICE_ROLE_KEY` in Server Components (bypasses RLS; severe leak risk). Direct TCP database connection pooler (resource-heavy on serverless).
- **Tradeoffs:** Requires one version-controlled SQL migration (`20261118000001_create_public_is_admin_rpc.sql`).
- **Owner Approval:** **REQUIRED (Approved as part of M03 Gate B SQL Migration).**

---

### DEC-03: Privilege Architecture for `public.is_admin()`
- **Selected:** Revoke `ALL` from `PUBLIC` and `anon`. Grant `EXECUTE` strictly to `authenticated`.
- **Rationale:** Only authenticated users possess an `auth.uid()` that can meaningfully be checked against the whitelist. Anonymous calls fail immediately at the database layer. PostgREST strictly matches the zero-argument signature and rejects any caller attempting to supply parameters.
- **Alternatives Rejected:** Granting to `anon` (unnecessary database load; anonymous visitors cannot be administrators).
- **Tradeoffs:** None; enforces least privilege.
- **Owner Approval:** Standard security practice.

---

### DEC-04: Dual Callback Flow Handling (PKCE `code` + Token Hash `token_hash`)
- **Selected:** Route handler `src/app/auth/callback/route.ts` inspects incoming parameters and dynamically executes either `exchangeCodeForSession(code)` or `verifyOtp({ token_hash, type })`.
- **Rationale:** Accommodates both modern PKCE email links and standard Supabase invitation/recovery token hashes without breaking if Supabase Auth configuration changes. Local testing utilizes Mailpit API (`127.0.0.1:54324/api/v1/messages`).
- **Alternatives Rejected:** Supporting PKCE only (breaks default token-hash invite templates). Supporting OTP only (breaks standard OAuth or PKCE flows).
- **Tradeoffs:** Slightly larger route handler; mitigated by strict parameter validation and shared redirect logic.
- **Owner Approval:** Standard technical implementation.

---

### DEC-05: Hosted Email Template Compatibility & Redirect Strategy
- **Selected:** Configure callback handler to accept standard Supabase email action links (`{{ .ConfirmationURL }}` directing to `/auth/v1/verify` then `/auth/callback`, or direct `<SITE_URL>/auth/callback?token_hash={{ .TokenHash }}`) and document exact template requirements for Gate D.
- **Rationale:** Prevents deployment failures caused by mismatches between hosted email templates and application routes.
- **Alternatives Rejected:** Assuming hosted templates match local defaults without verification.
- **Tradeoffs:** Requires owner review of hosted Auth settings during Gate D.
- **Owner Approval:** **REQUIRED at Gate D (Review hosted email templates and Site URL).**

---

### DEC-06: Decoupled Password Setup Route (`/auth/setup-password`)
- **Selected:** Place account onboarding at `/auth/setup-password` outside the `/admin/**` namespace, followed by `/auth/pending-approval`.
- **Rationale:** Eliminates the onboarding deadlock where an invited user cannot set their password because they are blocked by the administrator whitelist check on `/admin/**`. Grounded in verifiable facts: setting a password updates `auth.users`, but `public.is_admin()` remains `false` until the owner executes SQL whitelist insertion.
- **Alternatives Rejected:** Placing setup inside `/admin/setup-password` with complex proxy bypass rules (fragile; prone to authorization bypass leaks). Adding non-existent status columns to the database.
- **Tradeoffs:** Introduces two public auth routes; secured by requiring a valid invite session.
- **Owner Approval:** Standard architectural improvement.

---

### DEC-07: Cryptographic Session Verification (`getUser()` vs `getClaims()`)
- **Selected:** Use `supabase.auth.getUser()` for all authorization decisions, proxy token refreshes, and Server Action mutations.
- **Rationale:** `getUser()` contacts the Supabase Auth server and cryptographically validates the token against the active user database, immediately detecting revoked or deleted accounts. `getClaims()` only validates local signatures and cannot detect server-side revocations.
- **Alternatives Rejected:** Using `getSession()` (unsafe; reads unverified cookie data).
- **Tradeoffs:** Minimal network hop to Auth service; cached within request lifecycle.
- **Owner Approval:** Standard security standard.

---

### DEC-08: Real-Time Administrator Revocation Handling
- **Selected:** Every administrative Server Action and Server Component layout unconditionally queries `public.is_admin()`.
- **Rationale:** Even if a revoked administrator holds a valid 1-hour JWT, deleting their row from `private.admin_users` takes effect immediately on their very next request. Distinguishes local sign-out (browser cookies cleared) from global sign-out (GoTrue refresh token revoked) and live database whitelist revocation.
- **Alternatives Rejected:** Caching admin status in JWT custom claims (revocation delayed until token expiration).
- **Tradeoffs:** 1 fast database query per administrative page load; database index makes this sub-millisecond.
- **Owner Approval:** Core security requirement.

---

### DEC-09: SSR Cookie Model & Cache Isolation
- **Selected:** Document that `@supabase/ssr` cookies stored in the browser are client-readable (`httpOnly: false`) to allow `createBrowserClient` session hydration; enforce strict Content Security Policy (CSP) without `unsafe-inline` scripts as the primary XSS countermeasure; enforce `Cache-Control: private, no-store, must-revalidate` across `/admin` and `/auth` routes.
- **Rationale:** Transparently aligns architecture with `@supabase/ssr` reality while deploying defense-in-depth protections against XSS token exfiltration and reverse proxy caching.
- **Alternatives Rejected:** Inaccurately documenting cookies as HttpOnly.
- **Tradeoffs:** Requires strict adherence to CSP and React output escaping standards.
- **Owner Approval:** Core security requirement.

---

### DEC-10: Strict Local-First Verification Sequence (ADR-009)
- **Selected:** Implement and test all M03 components locally against disposable Supabase/GoTrue and Mailpit before requesting production deployment authorization.
- **Rationale:** Guarantees zero downtime, zero broken email links, and zero unauthorized production modifications.
- **Alternatives Rejected:** Developing directly against hosted production Supabase.
- **Tradeoffs:** Requires maintaining local test harness.
- **Owner Approval:** In accordance with `AGENTS.md`.

---

### DEC-11: Version-Controlled Authorization Migration
- **Selected:** Encapsulate `public.is_admin()` in migration file `supabase/migrations/20261118000001_create_public_is_admin_rpc.sql`.
- **Rationale:** Ensures exact repeatability across local development, CI testing, and hosted production.
- **Alternatives Rejected:** Manually running SQL in Supabase Dashboard SQL Editor without version control.
- **Tradeoffs:** Requires formal migration execution in Gate B (local) and Gate D (production).
- **Owner Approval:** **REQUIRED at Gate D for hosted push.**

---

### DEC-12: Human-in-the-Loop Production Bootstrap Safeguard
- **Selected:** The Project Owner personally dispatches the invitation, completes email verification, and executes the guarded SQL insertion into `private.admin_users` via the Supabase Dashboard.
- **Rationale:** Strictly prohibits AI coding agents from creating administrative accounts, bypassing email checks, or running automated superuser insertions on production databases.
- **Alternatives Rejected:** Automated bootstrap script using service-role key.
- **Tradeoffs:** Requires owner participation during production onboarding.
- **Owner Approval:** **REQUIRED (Owner executes directly).**
