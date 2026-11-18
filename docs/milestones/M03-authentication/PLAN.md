# Milestone M03 Implementation Plan — Administrator Identity & Auth Boundaries

> **Milestone:** M03 — Administrator Identity & Auth Boundaries<br>
> **Document Version:** v1.1 (Gate A.1 Architecture & Security Reconciliation)<br>
> **Status:** **PROPOSED — ARCHITECTURE RECONCILED (PASS WITH CONDITIONS) — AWAITING CHATGPT & PROJECT OWNER GATE B AUTHORIZATION**<br>
> **Date:** 2026-11-18<br>
> **Working Branch:** `feat/m02-database` (to branch to `feat/m03-auth` upon Gate B authorization)<br>
> **Target Hosted Project:** `zvmjdssztebhzpplkcrn` (`asmkhalid111's Portfolio`, region `ap-south-1` / Mumbai)<br>
> **Database Version:** PostgreSQL `17.12.0.000`<br>
> **Lead Architect:** Principal Next.js 16 & Supabase Security Architect

---

## Revision History

| Version | Date | Author | Summary of Changes | Status |
|:---:|:---:|:---|:---|:---:|
| **v1.0** | 2026-11-18 | Principal Next.js Architect | Initial Gate A architecture, threat model, and 25-test matrix specification. | Superseded |
| **v1.1** | 2026-11-18 | Principal Next.js Architect | **Gate A.1 Security Reconciliation:** Corrected Next.js 16 Proxy runtime to Node.js (default); reconciled SSR non-HttpOnly browser cookies with strict CSP defense; finalized parameterless `public.is_admin()` contract relying on verified M02 schema grants; updated `AUTH-06` to M03 test action; corrected `AUTH-23` for PostgREST parameter rejection; corrected `AUTH-25` lifecycle scope; updated Mailpit testing and token hash flows; locked Gate B. | Current (Pass with Conditions) |

---

## 1. Milestone Overview & Objectives

### 1.1 Mission & Scope
Milestone M03 establishes secure administrator identity verification, session management, and authorization boundaries for the portfolio application. It builds directly upon the accepted M02 database schema and Row-Level Security (RLS) foundation, providing the human authentication layer that connects Next.js 16 App Router server components and server actions to the database kernel.

### 1.2 Core Deliverables
1. **Next.js 16 Proxy Session Management (`src/proxy.ts`):** Node.js runtime proxy managing session refreshing via `@supabase/ssr`, request/response cookie synchronization, redirect cookie preservation, and pre-routing boundaries.
2. **PostgreSQL Authorization RPC (`public.is_admin()`):** A secure, parameterless `SECURITY INVOKER` RPC wrapper in schema `public` delegating to `private.is_admin()`, enabling server components to verify caller administrator status without exposing the `private` schema.
3. **Authentication Callback Handler (`src/app/auth/callback/route.ts`):** Unified handler supporting both PKCE authorization codes (`code`) and email token hashes (`token_hash`) for `invite`, `recovery`, `signup`, and `email` types, with open-redirect defenses.
4. **Onboarding & Password Setup Route (`src/app/auth/setup-password/page.tsx`):** Dedicated account completion form decoupled from protected administrator routes to eliminate onboarding deadlocks.
5. **Administrator Login Route (`src/app/admin/login/page.tsx`):** Publicly reachable authentication entry point with deterministic redirect loop prevention.
6. **Pending Approval Screen (`src/app/auth/pending-approval/page.tsx`):** Safe landing state for verified identities awaiting owner whitelist activation in `private.admin_users`.
7. **Password Recovery Flow (`/auth/forgot-password`, `/auth/reset-password`):** Secure self-service password recovery for the whitelisted administrator with generic enumeration protection.
8. **Protected Route Guards (`/admin/**`):** Multi-tier authorization enforcement across Node.js proxy, server component layouts, and server actions.
9. **ADR-009 Security Acceptance Test Suite (25 Tests):** Comprehensive automated testing (`AUTH-01` through `AUTH-25`) against a local disposable GoTrue and Mailpit stack, testing M03 actions (`testAdminAction`) without premature coupling to M04 CRUD.
10. **Controlled Out-of-Band Production Bootstrap (Gate D):** Project Owner manual invitation, email verification, and guarded SQL whitelist insertion.

### 1.3 Strict Non-Goals (Out of Scope for M03)
- Public portfolio styling or case-study views (deferred to M05).
- Projects CRUD dashboard UI or forms (deferred to M04).
- Storage bucket provisioning or media uploads (deferred to M07).
- Public self-registration for administrative roles (permanently prohibited).
- Auto Confirm bypasses in production (permanently prohibited).
- Use of the Supabase `service_role` key in frontend code or standard server components.
- Hosted production migrations or Auth provisioning during Gate A/B/C.

---

## 2. Roadmap Reconciliation & Architecture Alignment

The following table reconciles the authoritative roadmap (`docs/ROADMAP.md`), the preliminary M02 readiness plan, and this reconciled Gate A.1 architecture:

| Roadmap Requirement | M02 Readiness Plan Interpretation | Reconciled Gate A.1 Design | Compatibility | Security / Sequencing Note | Owner Approval Needed? | Target Gate |
|:---|:---|:---|:---:|:---|:---:|:---:|
| **Supabase Auth session management** | Middleware edge guard with unverified cookie checks | Next.js 16 `src/proxy.ts` on **Node.js runtime** handling cookie sync + mandatory `supabase.auth.getUser()` in Server Components | **Full** | Eliminates cookie-spoofing vulnerability; aligns with Next.js 16 Node.js proxy runtime and `@supabase/ssr` chunked cookies | No (Standard) | Gate B / C |
| **`/admin/login` page without redirect loops** | Login page with basic redirect logic | Public `/admin/login` with strict state machine and referrer validation | **Full** | Prevents loopback when already authenticated or when session expires | No (Standard) | Gate C |
| **Out-of-band admin provisioning verification** | Manual dashboard "Create user" with Auto Confirm | Genuine email invitation flow + `/auth/setup-password` + guarded SQL insertion into `private.admin_users` | **Full** | Eliminates Auto Confirm workaround; enforces genuine round-trip SMTP token verification (Mailpit locally, hosted SMTP in Gate D) | **Yes (Owner executes)** | Gate C / D |
| **Protected server actions & unauthorized mutation rejection** | Server actions relying on middleware redirects | Independent `public.is_admin()` check inside every Server Action + PostgreSQL RLS kernel enforcement (tested via `testAdminAction` in M03) | **Full** | Multi-tier defense-in-depth; API calls cannot bypass UI edge guards; decoupled from M04 project CRUD | No (Standard) | Gate C |
| **Database administrator status check** | Server Component queries `private.admin_users` directly | New migration adding `public.is_admin()` zero-argument `SECURITY INVOKER` function | **Full** | Resolves PostgREST unexposed schema barrier; relies on existing M02 grants (`USAGE ON SCHEMA private` and `EXECUTE ON FUNCTION private.is_admin() TO authenticated`) | **Yes (SQL Migration)** | Gate B (local) / Gate D (hosted) |
| **Invitation completion route** | `/admin/setup-password` inside protected `/admin/**` | Decoupled `/auth/setup-password` outside `/admin/**` namespace | **Full** | Resolves onboarding deadlock where unwhitelisted invitee is blocked by admin guard | No (Architecture) | Gate C |

---

## 3. Multi-Gate Implementation Protocol for M03

Following established project governance, Milestone M03 is divided into four strictly gated stages:

```
[ Gate A / A.1: Architecture & Security Design ] ──► (ChatGPT Audit & Owner Approval)
                      │
[ Gate B: Local Database Authorization Migration & Proxy ] ──► (Local Migration & Proxy Tests)
                      │
[ Gate C: Auth Routes, SSR Integration & 25 Tests ] ───────► (All Local Tests Pass Green)
                      │
[ Gate D: Owner Production Bootstrap & Verification ] ─────► (Owner Invites, Confirms & Whitelists)
```

### Gate A / A.1 — Architecture, Threat Model & Specification (CURRENT GATE - PASS WITH CONDITIONS)
- **Status:** Reconciled & Complete (Documentation Only).
- **Deliverables:** `PLAN.md`, `ARCHITECTURE.md`, `THREAT_MODEL.md`, `REQUIREMENTS_MATRIX.md`, `GATE_A_REVIEW.md`.
- **Exit Criteria:** ChatGPT architecture and security audit passed; explicit Project Owner authorization to proceed to Gate B.
- **Constraints:** Zero application code, zero package installs, zero database writes, zero hosted operations.

### Gate B — Local Database Authorization Migration & Next.js 16 Proxy (STRICTLY LOCKED)
- **Prerequisites:** Gate A.1 approved by ChatGPT and Project Owner.
- **Scope Boundary:** **STRICTLY LOCAL**. All operations target local disposable Supabase stack (`127.0.0.1:54321`). Zero hosted mutations.
- **Deliverables:**
  - Version-controlled migration: `supabase/migrations/20261118000001_create_public_is_admin_rpc.sql`.
  - Applied to local disposable Supabase stack (`127.0.0.1:54321`).
  - Next.js 16 `src/proxy.ts` on Node.js runtime implementing session refresh, cookie propagation, and edge boundary filtering.
  - Integration tests for `public.is_admin()` RPC (asserting zero arguments and rejection of unexpected arguments) and proxy cookie propagation.
- **Exit Criteria:** Clean local migration replay; TypeScript compiles cleanly; proxy tests pass.

### Gate C — Authentication Routes, SSR Integration & Test Suite
- **Prerequisites:** Gate B approved.
- **Deliverables:**
  - Route handlers: `src/app/auth/callback/route.ts`.
  - Pages: `/admin/login`, `/auth/setup-password`, `/auth/pending-approval`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/error`.
  - Multi-tier edge guards on `/admin/**` server layouts and server actions.
  - Complete 25-test security suite (`tests/auth/auth.test.ts`) covering `AUTH-01` through `AUTH-25` against local GoTrue and Mailpit.
  - Full ADR-009 12-point alternative verification protocol execution.
- **Exit Criteria:** 25/25 local auth tests pass green; 0 lint errors; 0 type errors; clean production build.

### Gate D — Hosted Deployment, Owner Invitation Bootstrap & Final Audit
- **Prerequisites:** Gate C approved; explicit Project Owner deployment authorization.
- **Deliverables:**
  - Owner-authorized migration of `public.is_admin()` to hosted Supabase (`zvmjdssztebhzpplkcrn`).
  - Production Vercel deployment of verified M03 application code.
  - Project Owner dispatches official Supabase email invitation to administrative address.
  - Project Owner accepts invitation via email link, lands on `/auth/setup-password`, sets secure password.
  - Project Owner lands on `/auth/pending-approval`.
  - Project Owner executes guarded SQL transaction in Supabase Dashboard SQL Editor inserting UUID into `private.admin_users`.
  - Project Owner accesses `/admin` and verifies full administrative access.
  - Production completion report: `docs/milestones/M03-authentication/COMPLETION.md`.
- **Exit Criteria:** Full end-to-end verified administrator login in production; zero Auto Confirm shortcuts; ChatGPT completion audit passed.

---

## 4. Dependencies & Prerequisites for Production Deployment (Gate D Only)

Before any production deployment or invitation dispatch can take place in Gate D:
1. **Hosted Supabase Site URL:** Must be configured to the production Vercel URL (`https://portfolio-rust-nu-n7jcvs7adw.vercel.app`) with redirect allowlist matching `/auth/callback`.
2. **Email Template Compatibility:** Hosted Supabase email templates must format invitation and recovery links to direct users either via default `{{ .ConfirmationURL }}` (to `/auth/v1/verify` which redirects to `/auth/callback`) or directly to `<SITE_URL>/auth/callback?token_hash={{ .TokenHash }}&type=invite`.
3. **Database Migration Applied:** The `public.is_admin()` RPC migration must be applied to hosted Supabase via the established preflight dry-run protocol.
4. **Application Code Deployed:** Vercel production must run the approved M03 code so that incoming invitation links hit the live `/auth/callback` handler.

---

## 5. Reviewer Checklist for Gate A.1

- [x] Next.js 16 `src/proxy.ts` design specifies the **Node.js runtime** by default, addresses session refresh, cookie propagation, and redirect cookie preservation.
- [x] SSR cookie security model explicitly documents that browser cookies are **not** `HttpOnly` in `@supabase/ssr` due to `createBrowserClient` reading `document.cookie`, and establishes strict CSP as the primary XSS countermeasure.
- [x] Administrator authorization architecture (`public.is_admin()`) is parameterless, `SECURITY INVOKER`, relies on existing audited M02 schema grants, and PostgREST rejects unexpected arguments.
- [x] Onboarding state machine is simplified to verifiable database states without inventing non-existent status columns, and prevents deadlocks via decoupled `/auth/` routes.
- [x] Callback architecture handles both PKCE `code` and token hash `token_hash`, with local Mailpit verification.
- [x] Threat model replaces "zero residual risk" with realistic residual risk analysis, accurately reflecting stateless JWT lifetime vs real-time database lookup.
- [x] Test matrix covers 25 comprehensive automated scenarios (`AUTH-01` through `AUTH-25`) using M03 test action `testAdminAction` (decoupled from M04).
- [x] Gate B is explicitly locked and defined as strictly local.
- [x] Zero production mutations, application code, or package installations authored during Gate A.1.
