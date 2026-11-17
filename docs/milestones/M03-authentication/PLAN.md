# Milestone M03 Implementation Plan — Administrator Identity & Auth Boundaries

> **Milestone:** M03 — Administrator Identity & Auth Boundaries<br>
> **Document Version:** v1.0 (Gate A Architecture & Security Design)<br>
> **Status:** **PROPOSED — AWAITING CHATGPT & PROJECT OWNER GATE A APPROVAL**<br>
> **Date:** 2026-11-18<br>
> **Working Branch:** `feat/m02-database` (to transition to `feat/m03-auth` upon Gate B authorization)<br>
> **Target Hosted Project:** `zvmjdssztebhzpplkcrn` (`asmkhalid111's Portfolio`, region `ap-south-1` / Mumbai)<br>
> **Database Version:** PostgreSQL `17.12.0.000`<br>
> **Lead Architect:** Principal Next.js 16 & Supabase Security Architect

---

## 1. Milestone Overview & Objectives

### 1.1 Mission & Scope
Milestone M03 establishes secure administrator identity verification, session management, and authorization boundaries for the portfolio application. It builds directly upon the accepted M02 database schema and Row-Level Security (RLS) foundation, providing the human authentication layer that connects Next.js 16 App Router server components and server actions to the database kernel.

### 1.2 Core Deliverables
1. **Next.js 16 Proxy Session Management (`src/proxy.ts`):** Edge-layer session refreshing, cookie synchronization, and pre-routing boundaries.
2. **PostgreSQL Authorization RPC (`public.is_admin()`):** A secure, `SECURITY INVOKER` RPC wrapper enabling server components to verify caller administrator status without exposing the `private` schema.
3. **Authentication Callback Handler (`src/app/auth/callback/route.ts`):** Unified handler supporting both PKCE authorization codes and email token hashes (`invite`, `recovery`, `signup`) with open-redirect defenses.
4. **Onboarding & Password Setup Route (`src/app/auth/setup-password/page.tsx`):** Dedicated account completion form decoupled from protected administrator routes to eliminate onboarding deadlocks.
5. **Administrator Login Route (`src/app/admin/login/page.tsx`):** Publicly reachable authentication entry point with redirect loop prevention.
6. **Pending Approval Screen (`src/app/auth/pending-approval/page.tsx`):** Safe landing state for verified identities awaiting owner whitelist activation.
7. **Password Recovery Flow (`/auth/forgot-password`, `/auth/reset-password`):** Secure self-service password recovery for the whitelisted administrator.
8. **Protected Route Edge Guards (`/admin/**`):** Multi-tier authorization enforcement across proxy, server component layouts, and server actions.
9. **ADR-009 Security Acceptance Test Suite (25 Tests):** Comprehensive automated testing (`AUTH-01` through `AUTH-25`) against a local disposable GoTrue stack.
10. **Controlled Out-of-Band Production Bootstrap:** Project Owner manual invitation, email verification, and guarded SQL whitelist insertion.

### 1.3 Strict Non-Goals (Out of Scope for M03)
- Public portfolio styling or case-study views (deferred to M05).
- Projects CRUD dashboard UI or forms (deferred to M04).
- Storage bucket provisioning or media uploads (deferred to M07).
- Public self-registration for administrative roles (permanently prohibited).
- Auto Confirm bypasses in production (permanently prohibited).
- Use of the Supabase `service_role` key in frontend code or standard server components.

---

## 2. Roadmap Reconciliation & Architecture Alignment

The following table reconciles the authoritative roadmap (`docs/ROADMAP.md`), the preliminary M02 readiness plan, and this proposed Gate A architecture:

| Roadmap Requirement | M02 Readiness Plan Interpretation | Proposed Gate A Design | Compatibility | Security / Sequencing Note | Owner Approval Needed? | Target Gate |
|:---|:---|:---|:---:|:---|:---:|:---:|
| **Supabase Auth session management** | Middleware edge guard with unverified cookie checks | Next.js 16 `src/proxy.ts` handling cookie sync + mandatory `supabase.auth.getUser()` in Server Components | **Full** | Eliminates cookie-spoofing vulnerability; aligns with Next.js 16 Turbopack proxy conventions | No (Standard) | Gate B / C |
| **`/admin/login` page without redirect loops** | Login page with basic redirect logic | Public `/admin/login` with strict state machine and referrer validation | **Full** | Prevents loopback when already authenticated or when session expires | No (Standard) | Gate C |
| **Out-of-band admin provisioning verification** | Manual dashboard "Create user" with Auto Confirm | Genuine email invitation flow + `/auth/setup-password` + guarded SQL insertion into `private.admin_users` | **Full** | Eliminates Auto Confirm workaround; enforces genuine round-trip SMTP token verification | **Yes (Owner executes)** | Gate C / D |
| **Protected server actions & unauthorized mutation rejection** | Server actions relying on middleware redirects | Independent `is_admin()` check inside every Server Action + PostgreSQL RLS kernel enforcement | **Full** | Multi-tier defense-in-depth; API calls cannot bypass UI edge guards | No (Standard) | Gate C |
| **Database administrator status check** | Server Component queries `private.admin_users` directly | New migration adding `public.is_admin()` `SECURITY INVOKER` function | **Full** | Resolves PostgREST unexposed schema barrier without weakening private schema RLS | **Yes (SQL Migration)** | Gate B |
| **Invitation completion route** | `/admin/setup-password` inside protected `/admin/**` | Decoupled `/auth/setup-password` outside `/admin/**` namespace | **Full** | Resolves onboarding deadlock where unwhitelisted invitee is blocked by admin guard | No (Architecture) | Gate C |

---

## 3. Multi-Gate Implementation Protocol for M03

Following the established project governance, Milestone M03 is divided into four strictly gated stages:

```
[ Gate A: Architecture & Security Design ] ──► (ChatGPT Audit & Owner Approval)
                      │
[ Gate B: Local Database Authorization Migration & Proxy ] ──► (Local Migration & Proxy Tests)
                      │
[ Gate C: Auth Routes, SSR Integration & 25 Tests ] ───────► (All Local Tests Pass Green)
                      │
[ Gate D: Owner Production Bootstrap & Verification ] ─────► (Owner Invites, Confirms & Whitelists)
```

### Gate A — Architecture, Threat Model & Specification (CURRENT GATE)
- **Status:** In Progress (Documentation Only).
- **Deliverables:** `PLAN.md`, `ARCHITECTURE.md`, `THREAT_MODEL.md`, `REQUIREMENTS_MATRIX.md`, `GATE_A_REVIEW.md`.
- **Exit Criteria:** ChatGPT architecture and security audit passed; explicit Project Owner authorization to proceed to Gate B.
- **Constraints:** Zero application code, zero package installs, zero database writes.

### Gate B — Local Database Authorization Migration & Next.js 16 Proxy
- **Prerequisites:** Gate A approved by ChatGPT and Project Owner.
- **Deliverables:**
  - Version-controlled migration: `supabase/migrations/20261118000001_create_public_is_admin_rpc.sql`.
  - Applied to local disposable Supabase stack (`127.0.0.1:54321`).
  - Next.js 16 `src/proxy.ts` implementing session refresh and edge boundary filtering.
  - Integration tests for `public.is_admin()` RPC and proxy cookie propagation.
- **Exit Criteria:** Clean local migration replay; TypeScript compiles cleanly; proxy tests pass.

### Gate C — Authentication Routes, SSR Integration & Test Suite
- **Prerequisites:** Gate B approved.
- **Deliverables:**
  - Route handlers: `src/app/auth/callback/route.ts`.
  - Pages: `/admin/login`, `/auth/setup-password`, `/auth/pending-approval`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/error`.
  - Multi-tier edge guards on `/admin/**` server layouts and server actions.
  - Complete 25-test security suite (`tests/auth/auth.test.ts`) covering `AUTH-01` through `AUTH-25`.
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

## 4. Dependencies & Prerequisites for Production Deployment

Before any production deployment or invitation dispatch can take place in Gate D:
1. **Hosted Supabase Site URL:** Must be configured to the production Vercel URL (`https://portfolio-rust-nu-n7jcvs7adw.vercel.app`) with redirect allowlist matching `/auth/callback`.
2. **Email Template Compatibility:** Hosted Supabase email templates must format invitation and recovery links to direct users to `<SITE_URL>/auth/callback`.
3. **Database Migration Applied:** The `public.is_admin()` RPC migration must be applied to hosted Supabase via the established preflight dry-run protocol.
4. **Application Code Deployed:** Vercel production must run the approved M03 code so that incoming invitation links hit the live `/auth/callback` handler.

---

## 5. Reviewer Checklist for Gate A

- [ ] Next.js 16 `src/proxy.ts` design addresses session refresh and rejects open redirects.
- [ ] Administrator authorization architecture (`public.is_admin()`) avoids exposing `private` schema and rejects caller-supplied identities.
- [ ] Onboarding deadlock resolved by placing `/auth/setup-password` outside protected `/admin/**`.
- [ ] Callback architecture handles both PKCE `code` and token hash `token_hash`.
- [ ] Threat model covers 18+ attack vectors with concrete mitigations.
- [ ] Test matrix defines 25 comprehensive automated scenarios (`AUTH-01` through `AUTH-25`).
- [ ] Zero production mutations or application code authored during Gate A.
