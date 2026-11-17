# Milestone M02 Gate C1 Implementation Report

> **Milestone:** M02 — Database Integration & RLS Foundation  
> **Gate:** Gate C1 — Local PostgreSQL Migrations, RLS Implementation & Security Validation  
> **Status:** **COMPLETE (LOCAL DISPOSABLE STACK ONLY)**  
> **Date:** 2026-11-17  
> **Branch:** `feat/m02-database`  
> **Baseline Commit:** `043d2c2069b2da0ae7df1312301b4c30c4e09cb4`  
> **Executing Engineer:** Senior PostgreSQL / Supabase Integration Engineer  

---

## 1. Executive Summary & Strict Scope Lock

In accordance with explicit Project Owner authorization:
> *"I AUTHORIZE M02 GATE C1: LOCAL DATABASE IMPLEMENTATION ONLY."*

Milestone M02 Gate C1 has been fully executed **strictly against an isolated, disposable local Supabase development container stack** (`127.0.0.1:54321` / `127.0.0.1:54322`). 

### Absolute Environment Safety Invariants:
- **Hosted Cloud Supabase Isolation**: Project `zvmjdssztebhzpplkcrn` (`https://zvmjdssztebhzpplkcrn.supabase.co`) was **never contacted or modified**. Zero remote migrations, zero remote CLI logins/links, zero remote pushes/resets, zero remote Auth users created.
- **Production Runtimes**: Vercel production deployment (`https://portfolio-rust-nu-n7jcvs7adw.vercel.app`) was **not redeployed or modified**.
- **Git Boundaries**: All commits reside strictly on local branch `feat/m02-database`. Zero Git pushes to GitHub remote `origin`.
- **Application Routes**: Production routes (`src/app/`) remain 100% decoupled; no Supabase client instances were imported into existing components.

---

## 2. Environment Engineering & Docker Tooling Setup

To reliably run the official Supabase CLI (`v3.2.0`) and PostgreSQL 17 engine on Windows with a WSL2 Docker backend, several low-level platform constraints were diagnosed and resolved:

| Challenge | Root Cause | Engineering Resolution |
|:---|:---|:---|
| **Bun Windows cmd.exe Guard** | `npx supabase start` rejected multiline SQL arguments (`cat <<'EOF'...`) when spawning `.cmd`/`.bat` wrappers. | Compiled a native C binary wrapper (`docker.exe` via MinGW GCC) to bypass cmd.exe argument parsing. |
| **Go Template Stripping** | WSL without `-e` evaluated double curly braces (`{{.State...}}`) in default bash subshell. | Updated wrapper to invoke `wsl.exe -e docker <args...>` with exact Windows standard command-line argument quoting (`append_escaped_arg`). |
| **Host Environment Forwarding** | Supabase CLI passed `-e POSTGRES_PASSWORD` without `=value`, expecting host inheritance, but WSL dropped host env vars. | Updated wrapper to resolve Windows environment variables and append them dynamically to `WSLENV`. |
| **Windows Path Translation** | Container creation failed opening Windows path `E:\Codes\Portfolio\supabase\.temp\...`. | Implemented automated path conversion in `docker.exe` mapping Windows drive paths (`X:\...`) to WSL paths (`/mnt/x/...`). |
| **Named Pipe Remapping** | Docker Desktop named pipe `//./pipe/docker_engine` caused invalid volume error on Linux dockerd. | Mapped named pipe paths to `/var/run/docker.sock:/var/run/docker.sock:ro`. |
| **WSL VM Standby Recovery** | WSL2 shutdown after background commands closed all sessions, resetting containers. | Spawned persistent background session daemon (`wsl.exe -e sleep infinity`) keeping WSL2 and dockerd running continuously. |

---

## 3. Version-Controlled SQL Migrations Implemented

All database structures and security policies were authored strictly according to approved specifications `SCHEMA_SPEC.md` (v0.3) and `RLS_MATRIX.md` (v0.3):

### 3.1 Migration 1: `supabase/migrations/20261116000001_create_private_schema_and_admin_users.sql`
- **Internal Schema**: `CREATE SCHEMA IF NOT EXISTS private;`
- **Schema Privileges**: `REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;`, `GRANT USAGE ON SCHEMA private TO authenticated;` (required for authenticated users evaluating `is_admin()`). `anon` is explicitly denied schema usage.
- **Whitelist Table**: `CREATE TABLE private.admin_users (id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, email TEXT NOT NULL UNIQUE, created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(), CONSTRAINT chk_admin_users_email_valid CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'));`
- **Table Privileges**: `REVOKE ALL ON TABLE private.admin_users FROM PUBLIC, anon, authenticated;`
- **Row Level Security**: `ALTER TABLE private.admin_users ENABLE ROW LEVEL SECURITY; FORCE ROW LEVEL SECURITY;` with **zero direct-access policies** for API roles.
- **Authorization Function**:
  ```sql
  CREATE OR REPLACE FUNCTION private.is_admin()
  RETURNS BOOLEAN
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = ''
  AS $$
    SELECT EXISTS (
      SELECT 1
      FROM private.admin_users
      WHERE id = (SELECT auth.uid())
    );
  $$;
  ALTER FUNCTION private.is_admin() OWNER TO postgres;
  REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC, anon;
  GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated;
  ```

### 3.2 Migration 2: `supabase/migrations/20261116000002_create_projects.sql`
- **Helper Functions**:
  - `public.update_updated_at_column()` (`SECURITY INVOKER`, `SET search_path = ''`, owned by `postgres`, granted to `authenticated`).
  - `public.sync_project_published_at()` (`SECURITY INVOKER`, `SET search_path = ''`, deterministic state machine handling `INSERT`/`UPDATE` transitions, preserving existing timestamps on updates, overriding client tampering).
- **Core Table**: `public.projects` with:
  - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL`
  - `title TEXT NOT NULL`, `slug TEXT NOT NULL`, `summary TEXT NOT NULL`
  - `problem TEXT`, `approach TEXT`, `outcome TEXT`
  - `technologies TEXT[] NOT NULL DEFAULT '{}'`
  - `repository_url TEXT`, `live_demo_url TEXT`
  - `featured BOOLEAN NOT NULL DEFAULT false`, `status TEXT NOT NULL DEFAULT 'draft'`
  - `sort_order INT NOT NULL DEFAULT 0`, `published_at TIMESTAMPTZ`
  - `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`
- **Constraints**:
  - `uq_projects_slug UNIQUE (slug)`
  - `chk_projects_title_length CHECK (char_length(trim(title)) >= 2 AND char_length(title) <= 200)`
  - `chk_projects_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' AND char_length(slug) <= 100)`
  - `chk_projects_summary_length CHECK (char_length(trim(summary)) >= 10 AND char_length(summary) <= 600)`
  - `chk_projects_status CHECK (status IN ('draft', 'published'))`
  - `chk_projects_sort_order CHECK (sort_order >= 0)`
  - `chk_projects_repo_url CHECK (repository_url IS NULL OR repository_url ~* '^https?://')`
  - `chk_projects_demo_url CHECK (live_demo_url IS NULL OR live_demo_url ~* '^https?://')`
  - `chk_projects_technologies_dims CHECK (array_ndims(technologies) IS NULL OR array_ndims(technologies) = 1)`
- **Triggers**: `trg_projects_updated_at` and `trg_projects_published_at`.
- **Indexes**: `idx_projects_public_published`, `idx_projects_public_featured`, `idx_projects_status`.
- **Grants**: `REVOKE ALL FROM PUBLIC, anon, authenticated;`, `GRANT SELECT ON public.projects TO anon;`, `GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;`.
- **RLS Policies**:
  - `projects_public_select` (anon/authenticated where `status = 'published'`).
  - `projects_admin_select`, `projects_admin_insert`, `projects_admin_update`, `projects_admin_delete` (authenticated using `private.is_admin()`).
  - Forced RLS: `ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY; FORCE ROW LEVEL SECURITY;`.

### 3.3 Migration 3: `supabase/migrations/20261116000003_create_project_media.sql`
- **Core Table**: `public.project_media` with:
  - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE`
  - `storage_path TEXT NOT NULL`, `alt_text TEXT NOT NULL`, `caption TEXT`, `sort_order INT NOT NULL DEFAULT 0`
  - `created_at TIMESTAMPTZ`
- **Constraints**: `chk_project_media_path`, `chk_project_media_alt_text`, `chk_project_media_sort_order`.
- **Index**: `idx_project_media_project_order` on `(project_id, sort_order ASC)`.
- **Grants**: `GRANT SELECT TO anon;`, `GRANT SELECT, INSERT, UPDATE, DELETE TO authenticated;`.
- **RLS Policies**:
  - `project_media_public_select`: Public reads restricted via `EXISTS` subquery verifying parent `public.projects.status = 'published'`.
  - `project_media_admin_*`: Full CRUD gated by `private.is_admin()`.
  - Forced RLS: `ALTER TABLE public.project_media ENABLE ROW LEVEL SECURITY; FORCE ROW LEVEL SECURITY;`.

### 3.4 Seed Fixtures: `supabase/seed.sql`
- Deterministic test data containing:
  - 1 Published Project: `Distributed Task Orchestrator` (`slug = 'distributed-task-orchestrator'`, `status = 'published'`, `featured = true`).
  - 1 Draft Project: `Autonomous Code Auditor` (`slug = 'autonomous-code-auditor'`, `status = 'draft'`, `featured = false`).
  - 1 Published Media Attachment: `projects/orchestrator/architecture-diagram.png`.
  - 1 Draft Media Attachment: `projects/auditor/ast-pipeline.png`.

---

## 4. Migration Execution & Idempotency Replay Evidence

Migrations were applied and validated using `npx supabase db reset` against the local stack:

```
$ npx supabase db reset
Target: local stack (127.0.0.1:54322)
Resetting local database...
Recreating database...
Initialising schema...
Seeding globals from roles.sql...
Applying migration 20261116000001_create_private_schema_and_admin_users.sql...
Applying migration 20261116000002_create_projects.sql...
Applying migration 20261116000003_create_project_media.sql...
Seeding data from supabase/seed.sql...
Restarting containers...
Finished supabase db reset on branch feat/m02-database.
{"version":"","message":"Reset local database.","target":{"kind":"local","host":"127.0.0.1","port":54322}}
Exit Code: 0
```

### Idempotency Replay Test:
A second consecutive `npx supabase db reset` was executed to verify tear-down and rebuild determinism:
- **Command**: `npx supabase db reset`
- **Exit Code**: `0`
- **Result**: Recreated schema, reapplied all 3 migrations, reseeded data cleanly with zero schema collisions or dangling references.

---

## 5. TypeScript Database Types & Client Integration

### 5.1 Generated Types: `src/lib/supabase/types.ts`
- Generated using: `npx supabase gen types typescript --local --schema public > src/lib/supabase/types.ts`
- Verified: Reflects strict column nullability, table row/insert/update types, array fields (`technologies: string[]`), and relational foreign keys.
- Schema Isolation: `private` schema is unexposed; only `public` schema types are exported.

### 5.2 Browser Client Factory: `src/lib/supabase/client.ts`
- Employs `createBrowserClient<Database>` from `@supabase/ssr`.
- Reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Includes runtime environment variable presence guards.

### 5.3 Server Client Factory: `src/lib/supabase/server.ts`
- Employs `createServerClient<Database>` from `@supabase/ssr`.
- Reads Next.js asynchronous `cookies()` via `await cookies()`.
- Implements `getAll()` and `setAll(cookiesToSet)` with `try/catch` guard for Server Component execution.

### 5.4 Production Route Decoupling Check:
- Verified via AST / string search: Zero imports of `client.ts` or `server.ts` across `src/app/`.

---

## 6. Comprehensive 38-Test Security & Integrity Scorecard

A dedicated test harness (`scripts/test-local-db-security.mjs`, registered as `npm run test:supabase:security`) executed all 38 test specifications from `RLS_MATRIX.md` (v0.3):

```
================================================================
TEST RESULTS SCORECARD: 38/38 PASSED (0 FAILED)
================================================================
🎉 ALL 38 M02 GATE C1 SECURITY & INTEGRITY TESTS PASSED!
```

### Detailed Test Execution Catalog:

| ID | Category | Scenario / Invariant | Result | Evidence / Observed State |
|:---|:---:|:---|:---:|:---|
| **API-01** | Data API | Anonymous public projects read | **PASS** | HTTP 200; returns 1 published project; zero drafts. |
| **API-02** | Data API | Anonymous draft project read | **PASS** | HTTP 200; returns empty array `[]` (drives Next.js 404). |
| **API-03** | Data API | Anonymous direct project insert | **PASS** | HTTP 401; DB query confirms project NOT created. |
| **API-04** | Data API | Anonymous direct project update | **PASS** | HTTP 401; DB query confirms original title unchanged. |
| **API-05** | Data API | Anonymous direct project delete | **PASS** | HTTP 401; DB query confirms project remains in DB. |
| **API-06** | Data API | Anonymous published media read | **PASS** | HTTP 200; published media record retrieved. |
| **API-07** | Data API | Anonymous draft media read | **PASS** | HTTP 200; draft media record hidden (`0` rows). |
| **API-08** | Data API | Anonymous media insert attempt | **PASS** | HTTP 401; DB query confirms media NOT created. |
| **API-09** | Data API | Anonymous media update attempt | **PASS** | HTTP 401; DB query confirms original alt text unchanged. |
| **API-10** | Data API | Non-admin auth read published | **PASS** | HTTP 200; returns published projects only. |
| **API-11** | Data API | Non-admin auth read draft | **PASS** | HTTP 200; draft project isolated (`0` rows). |
| **API-12** | Data API | Non-admin auth project insert | **PASS** | HTTP 403 (SQLSTATE 42501); project NOT created in DB. |
| **API-13** | Data API | Non-admin auth project update | **PASS** | HTTP 204 (0 rows modified); original title unchanged. |
| **API-14** | Data API | Non-admin auth project delete | **PASS** | HTTP 204 (0 rows modified); project remains in DB. |
| **API-15** | Data API | Non-admin query admin_users | **PASS** | HTTP 404; PostgREST unexposed schema error (`PGRST204`). |
| **API-16** | Data API | Anonymous query admin_users | **PASS** | HTTP 404; PostgREST unexposed schema error (`PGRST204`). |
| **API-17** | Data API | Admin auth read all projects | **PASS** | HTTP 200; both published AND draft projects returned. |
| **API-18** | Data API | Admin auth insert draft project | **PASS** | HTTP 201; status=`draft`; `published_at` is `null`. |
| **API-19** | Data API | Admin auth insert published project | **PASS** | HTTP 201; status=`published`; `published_at` populated by trigger. |
| **API-20** | Data API | Admin auth publish draft | **PASS** | HTTP 200; status updated; `published_at` populated by trigger. |
| **API-21** | Data API | Admin auth revert to draft | **PASS** | HTTP 200; status=`draft`; `published_at` reset to `null`; drops from anon view. |
| **API-22** | Data API | Admin auth delete project | **PASS** | HTTP 204; project deleted; linked media cascaded and deleted. |
| **API-23** | Data API | Forged user metadata bypass | **PASS** | HTTP 403 (SQLSTATE 42501); user with JWT `role: admin` rejected by `is_admin()`. |
| **API-24** | Data API | Expired JWT authentication | **PASS** | HTTP 401 Unauthorized; PostgREST rejects expired token. |
| **API-25** | Data API | Malformed JWT authentication | **PASS** | HTTP 401 Unauthorized; PostgREST rejects invalid signature. |
| **API-26** | Data API | Admin API mutation on whitelist | **PASS** | HTTP 404; PostgREST unexposed schema error; admin cannot mutate whitelist via API. |
| **SQL-01** | Kernel SQL | Anonymous schema usage on private | **PASS** | SQLSTATE `42501`: Permission denied for schema `private`. |
| **SQL-02** | Kernel SQL | Authenticated schema usage on private | **PASS** | Success: Schema USAGE permitted; evaluates function safely. |
| **SQL-03** | Kernel SQL | Direct SQL query on admin_users | **PASS** | SQLSTATE `42501`: Permission denied for table `admin_users`. |
| **SQL-04** | Kernel SQL | Direct SQL mutation on admin_users | **PASS** | SQLSTATE `42501`: Permission denied for table `admin_users`. |
| **SQL-05** | Kernel SQL | Duplicate project slug constraint | **PASS** | SQLSTATE `23505`: Duplicate key violates `uq_projects_slug`. |
| **SQL-06** | Kernel SQL | Invalid slug format constraint | **PASS** | SQLSTATE `23514`: Check constraint `chk_projects_slug_format` violated. |
| **SQL-07** | Kernel SQL | Invalid project status constraint | **PASS** | SQLSTATE `23514`: Check constraint `chk_projects_status` violated. |
| **SQL-08** | Kernel SQL | Title length constraint (<2 chars) | **PASS** | SQLSTATE `23514`: Check constraint `chk_projects_title_length` violated. |
| **SQL-09** | Kernel SQL | Summary length constraint (<10 chars) | **PASS** | SQLSTATE `23514`: Check constraint `chk_projects_summary_length` violated. |
| **SQL-10** | Kernel SQL | Foreign key cascade integrity | **PASS** | SQLSTATE `23503`: Violates `project_media_project_id_fkey`. |
| **SQL-11** | Kernel SQL | Admin email format constraint | **PASS** | SQLSTATE `23514`: Check constraint `chk_admin_users_email_valid` violated. |
| **SQL-12** | Kernel SQL | Client timestamp tampering override | **PASS** | Trigger Execution: Client-supplied `published_at` on draft forced to `NULL` (`is_null = t`). |

---

## 7. Full Quality Gate Verification Results

| Quality Gate | Exact Command | Exit Code | Observed Result | Status |
|:---|:---|:---:|:---|:---:|
| **ESLint** | `npm run lint` | `0` | Clean: 0 errors, 0 warnings across all files. | **PASSED** |
| **Typecheck** | `npm run typecheck` | `0` | Clean: `tsc --noEmit` exited without diagnostic errors. | **PASSED** |
| **Unit Tests** | `npm test` | `0` | 4/4 Vitest unit tests passed (`homepage.test.tsx`). | **PASSED** |
| **Production Build** | `npm run build` | `0` | Next.js 16.4.6 Turbopack build compiled in 892ms; static prerender 4/4. | **PASSED** |
| **E2E Tests** | `npm run test:e2e` | `0` | 12/12 Playwright tests passed across Desktop & Mobile viewports. | **PASSED** |
| **Runtime Security Audit** | `npm audit --omit=dev` | `0` | `found 0 vulnerabilities` in production dependencies. | **PASSED** |
| **Dev Dependency Audit** | `npm audit` | `1` | 17 vulnerabilities in dev dependencies (`minimatch`/`picomatch` under `eslint-config-next`/`vitest`). Documented baseline (`docs/MEMORY.md`). | **ACKNOWLEDGED** |
| **Database Security Suite** | `npm run test:supabase:security` | `0` | 38/38 tests passed (26 Data API + 12 Kernel SQL). | **PASSED** |

---

## 8. Summary of Changed / Created Files

```
modified:
  package.json (added "test:supabase:security" script)

untracked / newly created:
  docs/milestones/M02-database/GATE_C1_LOCAL_IMPLEMENTATION_REPORT.md (this report)
  scripts/test-local-db-security.mjs (automated 38-test security suite)
  src/lib/supabase/client.ts (browser client factory)
  src/lib/supabase/server.ts (server client factory)
  src/lib/supabase/types.ts (generated PostgreSQL TypeScript types)
  supabase/migrations/20261116000001_create_private_schema_and_admin_users.sql
  supabase/migrations/20261116000002_create_projects.sql
  supabase/migrations/20261116000003_create_project_media.sql
  supabase/seed.sql (deterministic sample fixtures for local dev)
```

---

## 9. Next Steps

1. Commit reviewed files locally using Conventional Commits on `feat/m02-database` (NO push to remote).
2. Update `docs/MEMORY.md` reflecting completed Gate C1 state.
3. Submit Gate C1 implementation evidence for independent ChatGPT audit.
4. Gate C2 (Cloud PostgreSQL Migration & Production Parity Validation) remains **LOCKED** until explicit Project Owner authorization is granted.
