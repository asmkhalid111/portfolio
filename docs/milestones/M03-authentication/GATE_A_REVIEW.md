# Milestone M03 Gate A Review Report — Architecture & Security Design

> **Milestone:** M03 — Administrator Identity & Auth Boundaries<br>
> **Gate:** Gate A / Gate A.1 — Local-Only Architecture & Security Design Reconciliation<br>
> **Status:** **PASS WITH CONDITIONS (GATE A.1 RECONCILED — AWAITING INDEPENDENT CHATGPT & OWNER GATE B AUTHORIZATION)**<br>
> **Date:** 2026-11-18<br>
> **Working Branch:** `feat/m02-database`<br>
> **Lead Architect:** Principal Next.js 16 & Supabase Security Architect

---

## 1. Gate A Scope & Compliance Statement

In accordance with explicit Project Owner authorization:
> *"I AUTHORIZE M03 GATE A: LOCAL-ONLY AUTHENTICATION ARCHITECTURE AND SECURITY DESIGN."*

Gate A and the Gate A.1 reconciliation were executed strictly as a **local-only architectural and threat-modeling review**.
- **Zero Application Code Authored:** No TypeScript/TSX code written or modified.
- **Zero Packages Installed or Removed:** `package.json` and `package-lock.json` are untouched.
- **Zero Database Operations:** No SQL migrations executed, no hosted database commands run.
- **Zero Auth Changes:** No Supabase Auth accounts created or invited; Auto Confirm prohibited.
- **Zero Remote Mutations:** No Vercel deployments, no GitHub remote pushes or branch merges.

---

## 2. Review of the Architectural Corrections (Gate A & Gate A.1)

### Correction 1: Next.js 16 Proxy Runtime & Cookie Propagation (`src/proxy.ts`)
- **Correction:** Next.js 16 proxy runs on the **default Node.js runtime** (not Edge).
- **Cookie Pipeline:** Proxy synchronizes cookies across incoming `request.cookies` (for downstream Server Components) and outgoing `response.cookies` (for the browser).
- **Redirect Cookie Preservation:** On any redirect response (`NextResponse.redirect`), all mutated cookies from the Supabase client response are copied onto the redirect response object, preventing session drops during navigation.
- **Cache-Control:** Injects `Cache-Control: private, no-store, must-revalidate` across all `/admin` and `/auth` routes.
- **Boundary Role:** The proxy is strictly an edge session refresher and route filter; it does **not** grant admin rights or query `private.admin_users`.

### Correction 2: SSR Cookie Security Model & CSP XSS Defense
- **Correction:** Documented that `@supabase/ssr` (`0.12.7`) browser cookies **are NOT `HttpOnly`**. `createBrowserClient` must read `document.cookie` in React client components to hydrate the initial session, fire `onAuthStateChange`, and set token refresh timers.
- **Defense-in-Depth:** Because cookies are readable by JavaScript, Content Security Policy (CSP) is the primary line of defense. Enforced strict CSP (`script-src 'self'`), React 19 auto-escaping, prohibition of `dangerouslySetInnerHTML`, and `Secure` + `SameSite: Lax` flags.

### Correction 3: Private Administrator Authorization (`public.is_admin()`) & M02 Grants
- **Correction:** Designed a parameterless `SECURITY INVOKER` function in schema `public` delegating to `private.is_admin()`.
- **M02 Schema Grants Alignment:** Audited `supabase/migrations/20261116000001_create_private_schema_and_admin_users.sql` and confirmed:
  - Line 13: `GRANT USAGE ON SCHEMA private TO authenticated;`
  - Line 52: `GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated;`
  - Line 50: `REVOKE EXECUTE ON FUNCTION private.is_admin() FROM PUBLIC, anon;`
  Because `authenticated` already possesses these privileges, creating `public.is_admin()` requires zero additional grants on schema `private`.
- **PostgREST Enforcement:** PostgREST strictly matches parameter signatures. Calling `public.is_admin()` with unexpected arguments returns an HTTP 404 / `PGRST202` parameter mismatch error, failing closed.

### Correction 4: Auth Callback & Dual-Flow Invitation Support
- **Correction:** Designed dual-flow callback handler (`src/app/auth/callback/route.ts`):
  - Handles PKCE codes via `exchangeCodeForSession(code)`.
  - Handles token hashes via `verifyOtp({ token_hash, type })` with strict type allowlisting (`invite`, `recovery`, `signup`, `email`).
  - Distinguishes hosted default `{{ .ConfirmationURL }}` (directing to `/auth/v1/verify` which redirects to `/auth/callback`) from custom direct token templates.
  - Specified local test strategy using Mailpit API (`127.0.0.1:54324/api/v1/messages`).
  - Enforces strict open-redirect guards rejecting external domains, `//`, and `\`.

### Correction 5: Simplified Onboarding State Machine & Deadlock Prevention
- **Correction:** Grounded the onboarding state machine strictly in **verifiable database facts** without inventing non-existent status columns (no `status`, `is_invited`, or `pending_approval` columns):
  1. `UNAUTHENTICATED`: No active GoTrue session.
  2. `INVITED_CALLBACK_IN_FLIGHT`: Inbound request with token.
  3. `AUTHENTICATED_UNWHITELISTED`: Active session (`getUser() !== null`), but `public.is_admin() === false`. Allowed to access `/auth/setup-password` and `/auth/pending-approval`.
  4. `AUTHENTICATED_ADMINISTRATOR`: Active session AND `public.is_admin() === true`. Allowed access to `/admin/**`.
  5. `SESSION_EXPIRED_OR_REVOKED`: Expired or invalidated session.
- **Invariance:** Password setup alone does **not** grant admin rights. Admin access is granted only when the Project Owner manually inserts the user's UUID into `private.admin_users`.

### Correction 6: Decoupled Security Test Suite
- **Correction:**
  - `AUTH-06`: Decoupled from M04 project CRUD. Tests unauthorized mutation rejection using an M03 server action (`testAdminAction`).
  - `AUTH-23`: Asserts PostgREST rejection of unexpected arguments for parameterless RPCs.
  - `AUTH-25`: Covers the full M03 auth lifecycle (invite -> verify -> setup password -> pending approval -> whitelist -> login -> testAdminAction -> logout).

### Correction 7: Realistic Residual Risk & Revocation Semantics
- **Correction:** Replaced inaccurate claims of "zero residual risk" with realistic threat assessments:
  - Distinguishes local sign-out (browser cookies cleared) from global sign-out (GoTrue refresh tokens revoked).
  - Clarified that stateless JWTs remain valid until expiration (typically 1 hour), but administrative authorization does not rely on JWT claims.
  - Whitelist revocation takes effect **instantly on the next fresh database query** to `public.is_admin()`, locking out revoked administrators immediately.

---

## 3. Threat Model & Defense-in-Depth Assessment

A comprehensive threat analysis was updated in [`THREAT_MODEL.md`](file:///e:/Codes/Portfolio/docs/milestones/M03-authentication/THREAT_MODEL.md) covering 21 specific threat scenarios across 6 trust boundaries:
- **Client Spoofing:** Rejected because identity is cryptographically grounded in the Supabase Auth JWT and verified live against the database whitelist.
- **RPC Parameter Injection:** PostgREST rejects unexpected parameters for parameterless RPCs.
- **Anonymous Probing:** Rejected at database kernel level via revoked `EXECUTE` privileges.
- **Open Redirect Phishing:** Prevented via relative URL validation and internal route allowlisting.
- **Account Enumeration:** Prevented by returning generic success responses on password recovery.
- **Instant Revocation:** Active because Server Components and Actions query live database tables on every request, overriding 1-hour JWT lifetimes.
- **XSS Mitigation:** Strict CSP (`script-src 'self'`), React 19 escaping, and zero `dangerouslySetInnerHTML` protect non-HttpOnly `@supabase/ssr` cookies.

---

## 4. Test Matrix & Verification Standard

The 25-scenario test matrix (`AUTH-01` through `AUTH-25`) defined in [`REQUIREMENTS_MATRIX.md`](file:///e:/Codes/Portfolio/docs/milestones/M03-authentication/REQUIREMENTS_MATRIX.md) will be executed during Gate C against an isolated, disposable local Supabase stack (`127.0.0.1:54321`) using local GoTrue and Mailpit:
- Covers unauthenticated access, non-admin rejection, admin access, password setup, token reuse, open redirects, logout, password recovery, cache isolation, PostgREST parameter rejection, and M03 lifecycle resilience.
- Zero reliance on production credentials or hosted Auth users for testing.

---

## 5. Gate A.1 Review Checklist & Classification

- [x] Next.js 16 Proxy session and cookie synchronization designed for Node.js runtime with redirect cookie preservation.
- [x] SSR non-HttpOnly cookie model accurately documented with strict CSP mitigations.
- [x] Defense-in-depth established across 4 independent security tiers.
- [x] Private administrator authorization solved via parameterless `SECURITY INVOKER` RPC using audited M02 schema grants.
- [x] PostgREST rejection of unexpected parameters documented.
- [x] Auth callback handles both PKCE `code` and `token_hash` flows with Mailpit verification.
- [x] Open-redirect defenses specified with internal path whitelist.
- [x] Onboarding deadlock resolved with decoupled `/auth/` routes and grounded database states.
- [x] Threat model covers 21 distinct threats with realistic residual risk assessments.
- [x] 25 automated security tests specified (`AUTH-01` through `AUTH-25`), decoupled from M04.
- [x] 12 architectural decisions formally recorded (DEC-01 through DEC-12).
- [x] Gate B is explicitly defined as local-only and remains strictly LOCKED.
- [x] Zero application code, package changes, SQL migrations, or production mutations executed.

### **FINAL GATE A.1 CLASSIFICATION: PASS WITH CONDITIONS**

**Conditions for Gate B Commencement:**
1. Independent review and approval of Gate A.1 reconciled artifacts by ChatGPT and Project Owner.
2. Explicit Project Owner authorization to branch to `feat/m03-auth` and begin M03 Gate B (Local Database Authorization Migration & Proxy implementation).
3. Absolute restriction: Gate B is **STRICTLY LOCAL** (`127.0.0.1:54321`). Zero hosted mutations permitted until Gate D.
