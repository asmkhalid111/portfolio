# Milestone Implementation Plan: M02 — Database Integration & RLS Foundation

> **Milestone ID:** M02  
> **Status:** `AWAITING REVIEW`  
> **Date:** 2026-11-16  
> **Author:** Antigravity (Implementation Planner & Release Engineer)  
> **Reviewer:** ChatGPT (Architecture & Security Reviewer)  
> **Approval Authority:** Project Owner  
> **Operating Mode:** PLANNING ONLY (No database code or provisioning executed in this gate)  

---

## 1. Revision History

| Version | Date | Author | Summary of Changes |
|:---:|:---:|:---:|:---|
| **v0.1** | 2026-11-16 | Antigravity | Initial draft of M02 database architecture, schema specification, Row Level Security matrix, Supabase client integration plan, migration strategy, and multi-gate implementation protocol. |

---

## 2. Objective & Academic Relevance

### 2.1 Primary Objective
Establish a secure, declarative, and robust PostgreSQL database layer on Supabase Free Tier for the personal portfolio. This includes:
1. Version-controlled SQL schema migrations for core portfolio entities (`admin_users`, `projects`, `project_media`).
2. Kernel-enforced Row Level Security (RLS) policies and granular table-level SQL grants.
3. Database-enforced administrator authorization via a hardened `is_admin()` security-definer function.
4. Safe, idiomatic Next.js App Router client integration using `@supabase/ssr` and `@supabase/supabase-js`.
5. Automated negative-access security tests validating that drafts are unreachable by anonymous visitors and unauthorized mutations are strictly rejected by the PostgreSQL engine.

### 2.2 Academic & University Grading Relevance
University evaluations assess data integrity, security boundaries, and architectural defensibility. Demonstrating that:
- Security is enforced at the database kernel rather than relying solely on client UI states or middleware redirects,
- Administrative privileges are restricted out-of-band and verified against a database whitelist,
- Draft records are isolated at the query layer and return genuine HTTP 404s, and
- Database migrations are fully deterministic and trackable in version control,
provides rigorous evidence of professional full-stack software engineering.

---

## 3. Scope & Explicit Non-Goals

### 3.1 In Scope (M02)
- **Database Schema Migrations:** Declarative SQL migrations in `supabase/migrations/` for:
  - `admin_users` (UUID primary key referencing `auth.users(id)`, email, constraints).
  - `projects` (UUID primary key, title, unique slug, summary, problem/approach/outcome, technologies array, repository/demo URLs, draft/publish status, sort ordering, timestamps).
  - `project_media` (UUID primary key, foreign key CASCADE to `projects(id)`, storage path, alt text, sort order).
  - Triggers for automatic `updated_at` timestamps and `published_at` synchronization.
- **Security & Authorization Infrastructure:**
  - Table-level SQL grants (`REVOKE ALL FROM PUBLIC`, selective `GRANT` to `anon` and `authenticated`).
  - Strict RLS policies for `admin_users`, `projects`, and `project_media`.
  - Hardened `public.is_admin()` function with `SECURITY DEFINER SET search_path = ''`.
- **Client Integration Layer:**
  - Installation of `@supabase/supabase-js` and `@supabase/ssr`.
  - Typed client factories: Browser client (`createBrowserClient`) and Server client (`createServerClient` with Next.js `cookies()`).
  - Scrubbed `.env.example` documenting required environment variables.
- **Verification & Testing:**
  - Real database negative-access RLS tests (`tests/database/rls.test.ts`).
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

1. **M01 Milestone Closure:** M01 must be finalized with the annotated tag `m01-complete` published to GitHub and production verified on Vercel. *(Verified: tag `m01-complete` at `699cfd0`, main at `a3146a2`)*.
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
│   │       ├── PLAN.md              # [CREATED] This implementation plan
│   │       ├── SCHEMA_SPEC.md       # [CREATED] Detailed PostgreSQL schema specification
│   │       └── RLS_MATRIX.md        # [CREATED] Detailed RLS policies and test matrix
├── supabase/
│   ├── config.toml                  # [PLANNED Gate B] Supabase CLI configuration
│   ├── seed.sql                     # [PLANNED Gate C] Test fixtures (published & draft projects)
│   └── migrations/
│       ├── 20261116000001_create_admin_users.sql   # [PLANNED Gate C] admin_users & is_admin()
│       ├── 20261116000002_create_projects.sql      # [PLANNED Gate C] projects table & RLS
│       └── 20261116000003_create_project_media.sql # [PLANNED Gate C] project_media table & RLS
├── src/
│   └── lib/
│       └── supabase/
│           ├── client.ts            # [PLANNED Gate C] Browser Supabase client (@supabase/ssr)
│           ├── server.ts            # [PLANNED Gate C] Server Supabase client (@supabase/ssr)
│           └── types.ts             # [PLANNED Gate C] Generated database TypeScript definitions
├── tests/
│   └── database/
│       └── rls.test.ts              # [PLANNED Gate D] Real database RLS negative test suite
├── .env.example                     # [PLANNED Gate B] Scrubbed environment variables template
└── package.json                     # [PLANNED Gate B] Add @supabase/supabase-js & @supabase/ssr
```

---

## 6. Supabase Integration Architecture

### 6.1 Package Selection & Roles
- **`@supabase/supabase-js`:** Core isomorphic client providing query building, PostgREST filtering, Auth primitives, and error handling.
- **`@supabase/ssr`:** Official Supabase package designed specifically for Next.js App Router. Replaces legacy `@supabase/auth-helpers-nextjs`. Handles cookie serialization, session refreshes, and prevents cookie-handling vulnerabilities across Server Components, Server Actions, and Route Handlers.

### 6.2 Client Separation Model
1. **Browser Client (`src/lib/supabase/client.ts`):**
   ```typescript
   import { createBrowserClient } from '@supabase/ssr';
   import type { Database } from './types';

   export function createClient() {
     return createBrowserClient<Database>(
       process.env.NEXT_PUBLIC_SUPABASE_URL!,
       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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
       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
               // This can be ignored if you have middleware refreshing sessions.
             }
           },
         },
       }
     );
   }
   ```
3. **Administrative / Test Runner Operations:**
   - Migration management is conducted exclusively via `npx supabase db push` or direct psql execution.
   - Test harness (`tests/database/rls.test.ts`) uses temporary test identities and the publishable anon key to test RLS boundaries.
   - The `SUPABASE_SERVICE_ROLE_KEY` is restricted strictly to local database teardown/seed scripts and is NEVER bundled into application code.

### 6.3 Environment Variables & Configuration
| Variable Name | Scope | Sensitivity | Purpose |
|:---|:---|:---:|:---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public (Client + Server) | Low (Public URL) | Base URL of the Supabase project REST API. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (Client + Server) | Low (Subject to RLS) | Publishable client key. Encodes `anon` role. |
| `SUPABASE_SERVICE_ROLE_KEY` | Private (Local test/admin only) | **CRITICAL (Bypasses RLS)** | Never in client code; never in Vercel public settings; ignored by Git. |
| `SUPABASE_DB_PASSWORD` | Private (Owner only) | **CRITICAL** | Direct PostgreSQL connection password for Supabase CLI. |

---

## 7. Migration & Rollback Strategy

### 7.1 Migration Workflow (Supabase CLI)
1. **Local Setup:**
   `npx supabase init` creates `supabase/config.toml`.
2. **Migration Files:**
   Migrations are created in `supabase/migrations/` with UTC timestamp prefixes:
   - `20261116000001_create_admin_users.sql`
   - `20261116000002_create_projects.sql`
   - `20261116000003_create_project_media.sql`
3. **Execution to Remote Project:**
   `npx supabase link --project-ref <project-id>` links the project, followed by:
   `npx supabase db push` to apply unapplied migrations deterministically.
4. **Type Generation:**
   `npx supabase gen types typescript --linked > src/lib/supabase/types.ts` produces end-to-end type safety from the remote PostgreSQL schema.

### 7.2 Roll-Forward & Recovery Strategy
- In accordance with production database best practices, rollbacks on remote databases will be executed as **roll-forward migrations** (e.g., `20261116000004_fix_...sql`).
- Destructive operations (`DROP TABLE CASCADE` or `DROP SCHEMA`) are prohibited in production environments.
- Fresh local or staging environments can be completely rebuilt via `npx supabase db reset`.

---

## 8. Multi-Gate Implementation Protocol

M02 will be implemented across four sequential, gated stages:

```
[ Gate A: Plan & Spec ] ──► (ChatGPT Audit & Owner Approval)
                                       │
[ Gate B: Provisioning & Config ] ────► (Owner Supplies Credentials)
                                       │
[ Gate C: Migrations & Client ] ──────► (SQL Schema & Types Applied)
                                       │
[ Gate D: RLS Tests & Audit ] ────────► (16 RLS Tests Green & Final Report)
```

### Gate A — Database Architecture and Security Planning (CURRENT GATE)
- **Deliverables:** `PLAN.md`, `SCHEMA_SPEC.md`, `RLS_MATRIX.md` on branch `feat/m02-database`.
- **Exit Criteria:** ChatGPT architecture and security audit accepted; explicit Project Owner authorization to proceed to Gate B.
- **Actions:** Zero code changes; zero Supabase provisioning.

### Gate B — Owner-Approved Supabase Provisioning and Local Configuration
- **Prerequisites:** Project Owner provisions a new project on Supabase Free Tier.
- **Deliverables:**
  - Owner populates `.env.local` with real project URL and publishable anon key.
  - Antigravity updates `.env.example` with scrubbed placeholder keys.
  - Install `@supabase/supabase-js` and `@supabase/ssr` via `npm install`.
  - Initialize Supabase CLI configuration (`supabase/config.toml`).
  - Verify network connectivity to Supabase endpoint.
- **Exit Criteria:** `npm ci`, lint, and typecheck pass; connectivity verified.

### Gate C — SQL Migrations, Schema Constraints, and RLS Implementation
- **Deliverables:**
  - Create migration files in `supabase/migrations/`.
  - Apply migrations to the Supabase project via `npx supabase db push`.
  - Generate TypeScript database types in `src/lib/supabase/types.ts`.
  - Implement browser and server client factories in `src/lib/supabase/client.ts` and `src/lib/supabase/server.ts`.
  - Seed test data via `supabase/seed.sql` (sample draft and published projects).
- **Exit Criteria:** Remote PostgreSQL schema verified; TypeScript compiles cleanly (`npm run typecheck`).

### Gate D — Real Database Security Tests, Integration Verification & Milestone Audit
- **Deliverables:**
  - Create and execute `tests/database/rls.test.ts` against the live Supabase instance.
  - Verify all 16 RLS matrix test cases and 7 constraint violation test cases.
  - Execute the full ADR-009 12-point alternative verification protocol (lint, typecheck, Vitest, build, Playwright, npm audit, secret scan).
  - Produce `docs/milestones/M02-database/COMPLETION.md`.
- **Exit Criteria:** 100% of RLS negative tests pass; zero secret leaks; ChatGPT completion audit passed.

---

## 9. Testing & ADR-009 Compliance Plan

Because GitHub Actions runner execution remains blocked under `ERR-006` and waived under `ADR-009`, M02 verification relies on the mandatory 12-point alternative verification protocol:

1. **Clean Working Tree:** `git status --short` verified before and after each gate.
2. **Deterministic Install:** `npm ci` executes without discrepancies.
3. **Static Linting:** `npm run lint` passes with 0 errors and 0 warnings.
4. **TypeScript Strict Typechecking:** `npm run typecheck` passes with 0 errors across strict mode.
5. **Component Tests:** `npm test` passes 100% of Vitest suites.
6. **E2E Browser Tests:** `npm run test:e2e` passes across desktop and mobile viewports.
7. **Production Compilation:** `npm run build` compiles cleanly with static prerendering intact.
8. **Dependency Audit:** `npm audit --omit=dev` reports 0 vulnerabilities in runtime dependencies.
9. **Secrets & Privacy Audit:** Regex scan across repository ensuring no `SUPABASE_SERVICE_ROLE_KEY` or personal data exists in tracked files.
10. **Real Database RLS Verification:** Automated Node.js/Vitest test script executing 16 RLS tests against live Supabase database.
11. **Durable On-Disk Documentation:** Actual commands, exit codes, and test outputs recorded in `docs/milestones/M02-database/`.
12. **Independent ChatGPT Audit:** Milestone reviewed by ChatGPT before closure.

---

## 10. Risks & Decision Checklist for Project Owner

| Risk / Decision | Severity | Proposed Mitigation | Owner Action Required |
|:---|:---:|:---|:---|
| **Free-Tier 7-Day Inactivity Pause** | Medium | Supabase pauses projects after 7 days of inactivity. Homepage is designed to render fallback static copy gracefully. | Confirm acceptance of 1-click unpause procedure in Supabase Dashboard. |
| **Service-Role Key Leakage** | Critical | Service-role key bypasses all RLS. | Do NOT commit `SUPABASE_SERVICE_ROLE_KEY`. Keep in `.env.local` only. |
| **Out-of-Band Admin Provisioning** | Medium | No UI exists to register admins. | Owner will run SQL snippet in Supabase SQL Editor to insert their own `auth.users` UUID into `admin_users`. |
| **Vercel Build Environment Variables** | Medium | Next.js build prerendering might attempt DB access if not properly guarded. | Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel project settings when ready. |
