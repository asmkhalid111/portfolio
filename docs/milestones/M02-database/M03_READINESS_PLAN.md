# Milestone M03 Readiness Plan: Administrator Identity & Auth Boundaries

> **Status:** PLANNING / SPECIFICATION ONLY (NOT IMPLEMENTED)<br>
> **Milestone:** M03 — Administrator Identity & Auth Boundaries<br>
> **Prerequisite:** M02 Database Infrastructure Accepted (Gate C2B Complete)<br>
> **Target:** Supabase Auth (GoTrue) + Next.js 16 SSR + `private.admin_users`<br>
> **Authors:** Senior Security Architect & Full-Stack Engineer

---

## 1. Context & Purpose

During Milestone M02 Gate C2B, the database infrastructure was successfully provisioned on hosted Supabase (`zvmjdssztebhzpplkcrn`) with all tables, constraints, RLS policies, and functions verified. 

When preparing the initial administrator identity bootstrap, an architectural evaluation revealed that the Next.js application in M01 deployed only a minimal public shell without an authentication callback route (`/auth/callback`) or a password setup form. Consequently:
- Supabase invitation links could not be completed by the recipient.
- Unconfirmed account verification links could not be processed.
- The only available shortcut was "Auto Confirm User" in the Supabase Dashboard, which bypasses round-trip email ownership verification.

The Project Owner explicitly rejected this shortcut:
> *"The initial administrator bootstrap is deferred until a genuine email-verification and account-setup flow is available. The previously granted administrator provisioning authorization must NOT be interpreted as permission to bypass email verification."*

This document defines the comprehensive readiness plan, technical architecture, and security acceptance criteria for **Milestone M03** to ensure that administrator identity onboarding and session boundaries are implemented with zero security compromises.

---

## 2. Core Architectural Components of M03

Milestone M03 will implement the complete authentication vertical slice across the following 10 pillars:

### 2.1 Supabase SSR Session Management
- **Library Baseline:** `@supabase/ssr` (already pinned and installed in `package.json`).
- **Client Implementation:**
  - Browser Client (`src/lib/supabase/client.ts`): Uses `createBrowserClient` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
  - Server Client (`src/lib/supabase/server.ts`): Uses `createServerClient` reading/writing cookies via `next/headers`.
- **Session Verification Standard:**
  - Never trust unverified client-side cookies for authorization.
  - Server components and Server Actions must invoke `supabase.auth.getUser()` to validate the JWT cryptographically against the Supabase Auth server, rather than relying on unverified local decode (`getSession()`).
  - Cache control: All authenticated views and actions must enforce `Cache-Control: private, no-store`.

### 2.2 Secure Authentication Confirmation & Callback Handling (`/auth/callback`)
- **Route Handler:** `src/app/auth/callback/route.ts` (Next.js App Router Route Handler).
- **PKCE Exchange:**
  - Extracts the authorization `code` parameter from the incoming request URL.
  - Exchanges the code for an authenticated session using `supabase.auth.exchangeCodeForSession(code)`.
- **Security Protections:**
  - **Open Redirect Guard:** Validates the `next` redirect parameter against an explicit whitelist of relative application paths (e.g., `/admin`, `/admin/setup-password`). Rejects absolute external URLs to prevent phishing/open-redirect attacks.
  - **Error Handling:** Gracefully handles invalid, expired, or reused authorization codes, returning user-friendly error views without exposing stack traces.

### 2.3 Invitation Completion & Password Setup Flow
- **Invitation Flow:**
  - Supabase Dashboard dispatches an invitation email to the intended administrator.
  - The invite link points to `<SITE_URL>/auth/callback?next=/admin/setup-password`.
  - The callback route exchanges the invite token for a valid session and redirects to `/admin/setup-password`.
- **Password Setup Page (`/admin/setup-password`):**
  - Renders a secure, client-side password creation form.
  - Enforces minimum complexity: $\ge 12$ characters, upper/lower case, numbers, special characters.
  - Submits the new password via `supabase.auth.updateUser({ password })`.
  - Upon success, redirects the verified administrator to `/admin`.

### 2.4 Strict Email Verification Requirement
- **No Auto Confirm:** Accounts must prove ownership of the administrative email address via genuine SMTP token exchange.
- **Confirmed Email Check:** All authorization gates verify `auth.users.email_confirmed_at IS NOT NULL`.

### 2.5 Administrator Login Route (`/admin/login`)
- **Public Reachability:** `/admin/login` must remain publicly accessible to unauthenticated visitors.
- **Form UI:** Email and password input fields with client and server-side validation.
- **Authentication Action:** Submits credentials via `supabase.auth.signInWithPassword({ email, password })`.
- **Loopback & Redirect Loop Prevention:**
  - If an already authenticated administrator accesses `/admin/login`, they are redirected to `/admin`.
  - If an unauthenticated user accesses `/admin/*`, they are redirected to `/admin/login?next=/admin/...`.
  - The login page never redirects to itself.

### 2.6 Protected Administrator Routes & Multi-Tier Edge Guards
- **Route Namespace:** `src/app/admin/**`.
- **Multi-Tier Authorization Model:**
  1. **Tier 1 (Middleware / Proxy Edge Guard):** Fast rejection if no Supabase Auth session cookie exists.
  2. **Tier 2 (Server Component Layout):** Invokes `getUser()` to obtain the verified `auth.uid()`.
  3. **Tier 3 (Database Kernel Authorization):** Verifies that `auth.uid()` exists in `private.admin_users`. Non-whitelisted authenticated users are rejected with HTTP 404 (preventing discovery of admin routes) or HTTP 403.

### 2.7 Safe Password Recovery
- **Request Route:** `/auth/forgot-password` allowing the administrator to request a password reset email.
- **Reset Route:** `/auth/reset-password` handling the reset callback securely with rate limiting and expired-token guards.

### 2.8 Local Authentication Testing Suite (ADR-009 Compliance)
- **Local Test Environment:** Uses the local disposable Supabase stack (`127.0.0.1:54321`) with its local GoTrue auth service.
- **Automated Test Scenarios:**
  - `AUTH-01`: Unauthenticated request to `/admin` redirects to `/admin/login`.
  - `AUTH-02`: Valid credentials authenticate and establish session cookies.
  - `AUTH-03`: Authenticated non-admin user is rejected from admin dashboard.
  - `AUTH-04`: Authenticated whitelisted admin user successfully accesses admin dashboard.
  - `AUTH-05`: `/auth/callback` exchanges PKCE code and rejects external redirect URLs.
  - `AUTH-06`: Logout clears session cookies and revokes access.
  - `AUTH-07`: Expired sessions trigger clean re-authentication prompt without infinite loops.

### 2.9 Production Deployment Approval Protocol
- All M03 code must pass local lint, typecheck, unit tests, local E2E tests, build, and security scans.
- Production deployment occurs only after explicit Project Owner authorization.

### 2.10 Subsequent Guarded Whitelist Insertion (`private.admin_users`)
Once the owner's Auth identity is created and verified via the M03 invitation flow:
- The Project Owner executes the guarded SQL transaction via Supabase Dashboard SQL Editor:
  ```sql
  BEGIN;
  DO $$
  DECLARE
      v_user_id UUID := '<VERIFIED_OWNER_UUID>'::UUID;
      v_email TEXT := '<VERIFIED_OWNER_EMAIL>';
      v_auth RECORD;
  BEGIN
      SELECT id, email, email_confirmed_at INTO v_auth FROM auth.users WHERE id = v_user_id;
      IF v_auth.id IS NULL THEN RAISE EXCEPTION 'User not found in auth.users'; END IF;
      IF v_auth.email != v_email THEN RAISE EXCEPTION 'Email mismatch'; END IF;
      IF v_auth.email_confirmed_at IS NULL THEN RAISE EXCEPTION 'Email not confirmed'; END IF;
      IF (SELECT count(*) FROM private.admin_users) > 0 THEN RAISE EXCEPTION 'Admin already exists'; END IF;
      INSERT INTO private.admin_users (id, email) VALUES (v_user_id, v_email);
  END $$;
  SELECT * FROM private.admin_users;
  COMMIT;
  ```

---

## 3. Security Acceptance Criteria for M03
- Zero plain-text credentials in logs, URLs, or client bundles.
- Zero service-role keys exposed in browser or client code.
- Zero Auto Confirm workarounds in production.
- RLS unconditionally enforced on all database mutations.
- Unauthenticated or non-admin requests to protected assets return 404/403.
- All code verified locally before production deployment.

---

## 4. Sequence & Dependency Lock
Milestone M03 cannot proceed until Milestone M02 is reviewed and accepted by ChatGPT and the Project Owner. No M03 application code may be authored under this turn.
