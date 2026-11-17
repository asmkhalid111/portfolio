# Milestone Implementation Plan: M02 — Database Integration & RLS Foundation (v0.3)

> **Milestone ID:** M02
> **Document Version:** v0.3 (Post-ChatGPT Gate A v0.2 Corrections)
> **Status:** `AWAITING REVIEW`
> **Date:** 2026-11-17
> **Author:** Antigravity (Implementation Planner & Release Engineer)
> **Reviewer:** ChatGPT (Architecture & Security Reviewer)
> **Approval Authority:** Project Owner
> **Operating Mode:** PLANNING ONLY (Zero database code, migrations, or provisioning executed in this gate)

---

## 1. Revision History & Audit Correction Matrix

| Version | Date | Author | Summary of Changes |
|:---:|:---:|:---:|:---|
| **v0.1** | 2026-11-16 | Antigravity | Initial draft of M02 database architecture, schema specification, Row Level Security matrix, Supabase client integration plan, migration strategy, and multi-gate protocol. |
| **v0.2** | 2026-11-16 | Antigravity | ChatGPT Gate A audit corrections: private schema authorization (`private.is_admin()`, `private.admin_users`), modern key naming, 3-tier test isolation, SSR cookie handling, expanded test matrix. |
| **v0.3** | 2026-11-17 | Antigravity | **ChatGPT Gate A v0.2 Corrections Applied**:<br>1. Finalized private administrator model: zero direct-access policies and zero grants on `private.admin_users`; revoked `anon` schema usage and function execute.<br>2. Corrected trigger execution context to `SECURITY INVOKER` and rewrote publication timestamp state machine to override tampering and preserve timestamps on updates.<br>3. Standardized on exact modern Supabase key formats (`sb_publishable_...` and `sb_secret_...`).<br>4. Separated testing into 26 Data API tests (`@supabase/supabase-js`) and 12 Direct PostgreSQL privilege tests (`psql` / controlled roles), establishing an exact 38-test catalog with state-retention assertions.<br>5. Clarified SSR authentication using `getClaims()` for verified claims and `getUser()` for fresh user records; detailed `private, no-store` cache controls.<br>6. Justified `email` column in `private.admin_users` and documented M07 draft media storage isolation. |

---

## 2. Objective & Academic Relevance

### 2.1 Primary Objective
Establish a secure, declarative, and production-hardened PostgreSQL database layer on Supabase Free Tier for the personal portfolio. This includes:
1. Version-controlled SQL schema migrations for core portfolio entities (`private.admin_users`, `public.projects`, `public.project_media`).
2. Kernel-enforced Row Level Security (RLS) policies and granular table-level SQL grants.
3. Database-enforced administrator authorization via a hardened `private.is_admin()` security-definer function residing in an unexposed schema.
4. Safe, idiomatic Next.js App Router client integration using `@supabase/ssr` and `@supabase/supabase-js`.
5. Automated negative-access security tests validating that drafts are unreachable by anonymous visitors and unauthorized mutations are strictly rejected by the PostgreSQL engine.

### 2.2 Academic & University Grading Relevance
University evaluations assess data integrity, security boundaries, and architectural defensibility. Demonstrating that:
- Security is enforced at the database kernel rather than relying solely on client UI states or middleware redirects,
- Administrative identities are isolated in an internal, non-API schema (`private.admin_users`) with zero public access,
- Draft records are isolated at the query layer and return genuine HTTP 404s, and
- Database migrations are fully deterministic and trackable in version control,
provides rigorous evidence of professional full-stack software engineering.

---

## 3. Scope & Explicit Non-Goals

### 3.1 In Scope (M02)
- **Database Schema Migrations:** Declarative SQL migrations in `supabase/migrations/` for:
  - `private.admin_users` (UUID primary key referencing `auth.users(id)`, email, constraints).
  - `public.projects` (UUID primary key, title, unique slug, summary, problem/approach/outcome, technologies array, repository/demo URLs, draft/publish status, sort ordering, timestamps).
  - `public.project_media` (UUID primary key, foreign key CASCADE to `projects(id)`, storage path, alt text, sort order).
  - Row triggers for automatic `updated_at` timestamps and deterministic `published_at` synchronization.
- **Security & Authorization Infrastructure:**
  - Internal `private` schema unexposed to PostgREST / Data API.
  - Table-level SQL grants (`REVOKE ALL FROM PUBLIC`, selective `GRANT` to `anon` and `authenticated`).
  - Strict RLS policies for `private.admin_users`, `public.projects`, and `public.project_media`.
  - Hardened `private.is_admin()` function with `SECURITY DEFINER SET search_path = ''` owned by `postgres`.
- **Client Integration Layer:**
  - Installation of `@supabase/supabase-js` and `@supabase/ssr`.
  - Modern API key architecture (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`).
  - Typed client factories: Browser client (`createBrowserClient`) and Server client (`createServerClient` with Next.js `cookies()`).
  - Scrubbed `.env.example` documenting required environment variables.
- **Verification & Testing:**
  - Comprehensive 38-test security and constraint test suite (26 Data API tests + 12 Direct PostgreSQL tests) executed against an isolated test environment (Tier A/B).
  - Full compliance with the ADR-009 12-point alternative verification protocol.

### 3.2 Explicit Non-Goals (Deferred to Later Milestones)
- **Supabase Auth UI & Admin Login Page:** Deferred to **M03** (`/admin/login`, session cookies, passwordless/OAuth flow).
- **Projects CRUD Admin Dashboard & UI:** Deferred to **M04** (Admin create/edit/delete forms, Server Actions, draft/publish controls).
- **Secondary Domain Tables (`site_profile`, `experiences`, `education`, `skills`, `certifications`):** Deferred to **M06** to keep M02 focused strictly on core database integrity and vertical slice prerequisites.
- **Supabase Storage Bucket & Image Upload UI:** Deferred to **M07** (Storage bucket `project-media`, upload handlers, file size limits).
- **Self-Service Admin Registration:** Prohibited permanently.
- **Service-Role Key Usage in Next.js Client Bundles:** Prohibited permanently.

---

## 4. Preconditions & Dependencies

1. **M01 Milestone Closure:** M01 finalized with the annotated tag `m01-complete` published to GitHub and production verified on Vercel. *(Verified: tag `m01-complete` at `699cfd0`, main at `a3146a2`)*.
2. **Review & Approval Gate:** This plan (`docs/milestones/M02-database/PLAN.md`), `SCHEMA_SPEC.md`, and `RLS_MATRIX.md` must be reviewed and accepted by ChatGPT, followed by explicit Project Owner authorization before Gate B provisioning.
3. **Owner Cloud Account:** The Project Owner must possess or create an account on Supabase (`supabase.com`) on the Free Tier ($0/mo).
4. **Local Tools:** Supabase CLI installed as a local dev dependency or invoked via `npx supabase@latest`.

---

## 5. File System Tree & Change Outline

```
portfolio/
├── docs/
│   ├── milestones/
│   │   └── M02-database/
│   │       ├── PLAN.md              # [REVISED v0.3] This implementation plan
│   │       ├── SCHEMA_SPEC.md       # [REVISED v0.3] Hardened PostgreSQL schema specification
│   │       └── RLS_MATRIX.md        # [REVISED v0.3] Hardened RLS policies and 38-case test matrix
├── supabase/
│   ├── config.toml                  # [PLANNED Gate B] Supabase CLI configuration
│   ├── seed.sql                     # [PLANNED Gate C] Local/test fixtures (draft & published projects)
│   └── migrations/
│       ├── 20261116000001_create_private_schema_and_admin_users.sql   # [PLANNED Gate C] private schema & is_admin()
│       ├── 20261116000002_create_projects.sql                         # [PLANNED Gate C] projects table & RLS
│       └── 20261116000003_create_project_media.sql                    # [PLANNED Gate C] project_media table & RLS
├── src/
│   └── lib/
│       └── supabase/
│           ├── client.ts            # [PLANNED Gate C] Browser Supabase client (@supabase/ssr)
│           ├── server.ts            # [PLANNED Gate C] Server Supabase client (@supabase/ssr)
│           └── types.ts             # [PLANNED Gate C] Generated database TypeScript definitions
├── tests/
│   └── database/
│       ├── rls.api.test.ts          # [PLANNED Gate D] Data API security tests (26 cases via @supabase/supabase-js)
│       └── rls.sql.test.ts          # [PLANNED Gate D] Direct PostgreSQL privilege & kernel tests (12 cases via SQL)
├── .env.example                     # [PLANNED Gate B] Modern scrubbed environment variables template
└── package.json                     # [PLANNED Gate B] Add @supabase/supabase-js & @supabase/ssr
```

---

## 6. Supabase Integration Architecture & Next.js SSR Security

### 6.1 Package Selection & Roles
- **`@supabase/supabase-js`:** Core isomorphic client providing query building, PostgREST filtering, Auth primitives, and error handling.
- **`@supabase/ssr`:** Official Supabase package designed specifically for Next.js App Router. Handles cookie serialization, session refreshes, and prevents cookie-handling vulnerabilities across Server Components, Server Actions, and Route Handlers.

### 6.2 Modern API Key Architecture
Supabase uses modern API key conventions that replace legacy JWT-based `anon` and `service_role` keys:
- **`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_...`)**: Public publishable key used by browser and server runtimes. Governed entirely by PostgreSQL SQL grants and Row Level Security.
- **`SUPABASE_SECRET_KEY` (`sb_secret_...`)**: Secret administrative key. Bypasses RLS. Restricted strictly to offline maintenance and test scripts in isolated environments. **NEVER** exposed to client bundles, public variables, or application runtime.

| Variable Name | Scope | Sensitivity | Purpose | Format |
|:---|:---|:---:|:---|:---:|
| `NEXT_PUBLIC_SUPABASE_URL` | Public (Client + Server) | Low (Public URL) | Base URL of the Supabase project REST API. | `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public (Client + Server) | Low (Subject to RLS) | Modern publishable client key. | `sb_publishable_...` |
| `SUPABASE_SECRET_KEY` | Private (Offline Test/Admin Only) | **CRITICAL (Bypasses RLS)** | Never in client code; never in Vercel public settings; ignored by Git. | `sb_secret_...` |
| `SUPABASE_DB_PASSWORD` | Private (Owner Only) | **CRITICAL** | Direct PostgreSQL connection password for Supabase CLI. | Plaintext secret |

### 6.3 Next.js SSR Client Factories
1. **Browser Client (`src/lib/supabase/client.ts`):**
   ```typescript
   import { createBrowserClient } from '@supabase/ssr';
   import type { Database } from './types';

   export function createClient() {
     return createBrowserClient<Database>(
       process.env.NEXT_PUBLIC_SUPABASE_URL!,
       process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
     );
   }
   ```
2. **Server Client (`src/lib/supabase/server.ts`):**
   ```typescript
   import { createServerClient } from '@supabase/ssr';
   import { cookies } from 'next/headers';
   import type { Database } from './types';

   export async function createClient() {
     const cookieStore = await cookies();

     return createServerClient<Database>(
       process.env.NEXT_PUBLIC_SUPABASE_URL!,
       process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
       {
         cookies: {
           getAll() {
             return cookieStore.getAll();
           },
           setAll(cookiesToSet) {
             try {
               cookiesToSet.forEach(({ name, value, options }) =>
                 cookieStore.set(name, value, options)
               );
             } catch {
               // The `setAll` method was called from a Server Component.
               // This can be ignored if middleware is refreshing user sessions.
             }
           },
         },
       }
     );
   }
   ```

### 6.4 Server-Side Authentication & Cache Security
1. **Verified Claims vs User Record (`getClaims()` and `getUser()`):**
   - In Next.js Server Components, fast reads can verify identity claims via `await supabase.auth.getClaims()`.
   - Before executing sensitive Server Actions or administrative mutations, authentication must **always** be verified via `await supabase.auth.getUser()`, which contacts the Supabase Auth server to guarantee the session has not been revoked.
   - Authorizing operations based solely on `supabase.auth.getSession()` is strictly prohibited because `getSession()` reads unverified client cookie payloads without contacting the Auth server.
2. **Cache-Control & Private Data Protection:**
   - Any Server Action, API Route, or page rendering authenticated/admin content must emit HTTP headers:
     `Cache-Control: private, no-store, max-age=0`
   - Prevents intermediate proxies, CDNs, or Vercel Edge Cache from storing or serving private admin responses.
3. **Defense-in-Depth Query Filtering:**
   - Even though database RLS strictly isolates drafts from anonymous requests, public queries will explicitly include `.eq('status', 'published')`. This prevents accidental cache pollution and provides multi-layered defense.

---

## 7. Database Test Isolation Architecture

To protect production data and prevent destructive operations against live environments, M02 enforces a 3-tier database segregation model:

```
┌────────────────────────────────┐
│   Tier A: Local Disposable     │ ──► Used for: Migrations replay, destructive tests,
│   (npx supabase start / Docker)│     temporary Auth users, seed testing, 'db reset'.
└────────────────────────────────┘
                 │
┌────────────────────────────────┐
│   Tier B: Isolated Staging     │ ──► Used for: Remote migration verification before
│   (Optional cloud test ref)    │     production apply, automated pre-release test suite.
└────────────────────────────────┘
                 │
┌────────────────────────────────┐
│   Tier C: Live Production      │ ──► Used for: Real portfolio traffic only.
│   (supabase.com project)       │     RULES: Zero test users. Zero destructive tests.
└────────────────────────────────┘     'supabase db reset' is PERMANENTLY PROHIBITED.
```

### Strict Test Rules:
- **Destructive RLS Tests**: All 38 security and constraint tests must execute against **Tier A** (local container) or **Tier B** (isolated staging).
- **Production Safety Invariant**: The production Supabase project must **NEVER** be subjected to `supabase db reset`, automated test user creation, or test mutation suites.
- **Seed Data Discipline**: `supabase/seed.sql` is strictly for local development and test fixtures. Production content seeding is performed separately and verified by the owner.

---

## 8. Migration & Rollback Strategy

### 8.1 Migration Workflow (Supabase CLI)
1. **Local Setup:**
   `npx supabase init` creates `supabase/config.toml`.
2. **Chronological Migration Files:**
   Migrations reside in `supabase/migrations/` using UTC timestamp prefixes:
   - `20261116000001_create_private_schema_and_admin_users.sql`
   - `20261116000002_create_projects.sql`
   - `20261116000003_create_project_media.sql`
3. **Local Replay & Verification:**
   Before applying migrations to any remote environment, migrations are verified locally via `npx supabase db reset` on Tier A.
4. **Remote Migration Application:**
   `npx supabase link --project-ref <project-ref>` followed by `npx supabase db push` applies unapplied migrations deterministically.
5. **Type Generation:**
   `npx supabase gen types typescript --linked > src/lib/supabase/types.ts` produces complete end-to-end type safety from the remote PostgreSQL schema.

### 8.2 Roll-Forward & Recovery Discipline
- Rollbacks in remote environments are executed strictly as **roll-forward additive migrations** (`2026..._fix_...sql`).
- Destructive commands (`DROP TABLE CASCADE` or `supabase db reset`) are strictly prohibited in production.

---

## 9. Multi-Gate Implementation Protocol

M02 will execute across four sequential, gated checkpoints:

```
[ Gate A: Plan & Spec v0.3 ] ──► (ChatGPT Audit & Owner Approval)
                                            │
[ Gate B: Provisioning & Config ] ─────────► (Owner Supplies Credentials)
                                            │
[ Gate C: Migrations & Client ] ───────────► (SQL Schema & Types Applied)
                                            │
[ Gate D: RLS Tests & Audit ] ─────────────► (38 Tests Green & Final Report)
```

### Gate A — Database Architecture and Security Planning (CURRENT GATE)
- **Deliverables:** `PLAN.md` (v0.3), `SCHEMA_SPEC.md` (v0.3), `RLS_MATRIX.md` (v0.3) on branch `feat/m02-database`.
- **Exit Criteria:** ChatGPT architecture and security audit accepted; explicit Project Owner authorization to proceed to Gate B.
- **Actions:** Zero code changes; zero Supabase provisioning.

### Gate B — Owner-Approved Supabase Provisioning and Local Configuration
- **Prerequisites:** Project Owner provisions a new project on Supabase Free Tier.
- **Deliverables:**
  - Owner populates `.env.local` with real project URL and publishable key (`sb_publishable_...`).
  - Antigravity updates `.env.example` with modern scrubbed placeholders.
  - Install `@supabase/supabase-js` and `@supabase/ssr` via `npm install`.
  - Initialize Supabase CLI configuration (`supabase/config.toml`).
  - Verify network connectivity to the Supabase endpoint.
- **Exit Criteria:** `npm ci`, lint, and typecheck pass; connectivity verified.

### Gate C — SQL Migrations, Schema Constraints, and RLS Implementation
- **Deliverables:**
  - Create migration files in `supabase/migrations/`.
  - Apply migrations to the Supabase project via `npx supabase db push`.
  - Generate TypeScript database types in `src/lib/supabase/types.ts`.
  - Implement browser and server client factories in `src/lib/supabase/client.ts` and `src/lib/supabase/server.ts`.
  - Seed test data via `supabase/seed.sql` (sample draft and published projects) in Tier A/B.
- **Exit Criteria:** Remote PostgreSQL schema verified; TypeScript compiles cleanly (`npm run typecheck`).

### Gate D — Real Database Security Tests, Integration Verification & Milestone Audit
- **Deliverables:**
  - Create and execute `tests/database/rls.api.test.ts` (26 Data API tests) and `tests/database/rls.sql.test.ts` (12 Direct PostgreSQL tests) against an isolated test database (Tier A/B).
  - Verify all 38 test cases pass, including explicit state retention assertions.
  - Execute the full ADR-009 12-point alternative verification protocol (lint, typecheck, Vitest, build, Playwright, npm audit, secret scan).
  - Produce `docs/milestones/M02-database/COMPLETION.md`.
- **Exit Criteria:** 38/38 database security and constraint tests pass; zero secret leaks; ChatGPT completion audit passed.

---

## 10. Testing & ADR-009 Compliance Plan

Because GitHub Actions runner execution remains blocked under `ERR-006` and waived under `ADR-009`, M02 verification relies on the mandatory 12-point alternative verification protocol:

1. **Clean Working Tree:** `git status --short` verified before and after each gate.
2. **Deterministic Install:** `npm ci` executes without discrepancies.
3. **Static Linting:** `npm run lint` passes with 0 errors and 0 warnings.
4. **TypeScript Strict Typechecking:** `npm run typecheck` passes with 0 errors across strict mode.
5. **Component Tests:** `npm test` passes 100% of Vitest suites.
6. **E2E Browser Tests:** `npm run test:e2e` passes across desktop and mobile viewports.
7. **Production Compilation:** `npm run build` compiles cleanly with static prerendering intact.
8. **Dependency Audit:** `npm audit --omit=dev` reports 0 vulnerabilities in runtime dependencies.
9. **Secrets & Privacy Audit:** Regex scan across repository ensuring no secret keys or personal data exist in tracked files.
10. **Real Database RLS Verification:** Automated test scripts executing 38 tests across Data API and Direct SQL harnesses against an isolated database.
11. **Durable On-Disk Documentation:** Actual commands, exit codes, and test outputs recorded in `docs/milestones/M02-database/`.
12. **Independent ChatGPT Audit:** Milestone reviewed by ChatGPT before closure.

---

## 11. Risks & Decision Checklist for Project Owner

| Risk / Decision | Severity | Proposed Mitigation | Owner Action Required |
|:---|:---:|:---|:---|
| **Free-Tier 7-Day Inactivity Pause** | Medium | Supabase pauses projects after 7 days of inactivity. Homepage is designed to render fallback static copy gracefully. | Confirm acceptance of 1-click unpause procedure in Supabase Dashboard. |
| **Secret Key Leakage** | Critical | Secret keys bypass all RLS. | Do NOT commit `SUPABASE_SECRET_KEY`. Keep in `.env.local` only. |
| **Out-of-Band Admin Provisioning** | Medium | No UI exists to register admins. | Owner will run SQL snippet in Supabase SQL Editor to insert their own `auth.users` UUID into `private.admin_users`. |
| **Vercel Build Environment Variables** | Medium | Next.js build prerendering might attempt DB access if not properly guarded. | Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in Vercel project settings when ready. |
| **Production Database Integrity** | Critical | Accidental destructive reset on live DB. | `supabase db reset` strictly forbidden against production project. |
