# M02 Row Level Security (RLS) Specification & Test Matrix (v0.2)

> **Milestone:** M02 — Database Integration & RLS Foundation
> **Document Version:** v0.2 (Post-ChatGPT Gate A Audit Corrections)
> **Status:** REVISED SECURITY SPECIFICATION (Awaiting ChatGPT Audit & Owner Approval)
> **Target Database:** PostgreSQL 15+ / Supabase Auth & RLS
> **Date:** 2026-11-16

---

## 1. Security Architecture & Threat Model

The portfolio security model operates under defense-in-depth principles where the **PostgreSQL database kernel** serves as the definitive security boundary:

```
[Public Visitor / Publishable Key]
                 │
                 ▼
     [PostgREST / Supabase API]
                 │
                 ├── 1. Schema Exposure Barrier
                 │       └── Only 'public' exposed. 'private' schema is completely hidden.
                 │
                 ├── 2. Table Grants Check (SQL GRANT)
                 │       ├── Anon: SELECT only on public.projects & public.project_media.
                 │       ├── Authenticated: SELECT/INSERT/UPDATE/DELETE on public tables.
                 │       └── private.admin_users: ALL REVOKED from anon and authenticated.
                 │
                 └── 3. Row Level Security Evaluation (FORCE RLS)
                         ├── Anon: status = 'published' ONLY.
                         ├── Non-admin Authenticated: status = 'published' ONLY; mutations blocked.
                         └── Admin Authenticated: private.is_admin() = TRUE -> FULL CRUD.
```

### 1.1 Non-Negotiable Security Invariants
1. **Unexposed Administrative Schema**: The `private.admin_users` table resides in an internal PostgreSQL schema not exposed through PostgREST. Direct PostgREST queries to `admin_users` result in HTTP 404 / permission denied.
2. **Database-Kernel Enforcement**: RLS policies and table grants are evaluated by PostgreSQL for every row. Next.js edge guards (`proxy.ts`), Server Action checks, or UI element toggles are user-experience optimizations and **never** the primary security boundary.
3. **Draft Isolation & Public 404 Trigger**: Anonymous visitors querying PostgREST or `/api` cannot receive rows where `status != 'published'`. Public route queries for draft slugs yield 0 rows, driving Next.js `notFound()` without leaking draft titles, summaries, or metadata.
4. **Zero Automatic Authenticated Privilege**: A standard authenticated user (`authenticated` role) possesses zero administrative rights. They cannot read drafts or mutate any table unless their `auth.uid()` explicitly exists in `private.admin_users`.
5. **No Reliance on User Metadata**: Authorization checks strictly ignore user-controlled JWT claims or `raw_user_meta_data`. An attacker forging a `role: 'admin'` metadata field is completely blocked.
6. **Search-Path & Recursion Defense**: `private.is_admin()` is declared with `SECURITY DEFINER SET search_path = ''` owned by `postgres`. It queries `private.admin_users` which does not call `is_admin()`, guaranteeing $O(1)$ evaluation with zero recursive loops.
7. **Modern API Key Separation**:
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_pub_...`): Used by browser and SSR clients; strictly constrained by SQL grants and RLS.
   - `SUPABASE_SECRET_KEY` (`sb_sec_...`): Used strictly by offline CLI or test tooling in isolated environments; NEVER placed in client bundles, public environment variables, or committed to Git.

---

## 2. Row Level Security Policy Definitions

### 2.1 Enable & Force RLS Across All Tables
```sql
ALTER TABLE private.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_media ENABLE ROW LEVEL SECURITY;

-- Guarantee RLS applies even to table owners during local test scripts
ALTER TABLE private.admin_users FORCE ROW LEVEL SECURITY;
ALTER TABLE public.projects FORCE ROW LEVEL SECURITY;
ALTER TABLE public.project_media FORCE ROW LEVEL SECURITY;
```

---

### 2.2 Table: `private.admin_users` Policies

Even though `private.admin_users` is hidden from the Data API and all table privileges are revoked from `anon` and `authenticated`, RLS policies provide an additional defense-in-depth lock:

```sql
-- Only the database owner (postgres) or security-definer functions can read/mutate admin_users
CREATE POLICY admin_users_admin_access
ON private.admin_users
FOR ALL
TO authenticated
USING (
  private.is_admin()
)
WITH CHECK (
  private.is_admin()
);
```

---

### 2.3 Table: `public.projects` Policies

```sql
-- 1. Public Read Policy: Anonymous and non-admin authenticated users can only view published projects
CREATE POLICY projects_public_select
ON public.projects
FOR SELECT
TO anon, authenticated
USING (
  status = 'published'
);

-- 2. Administrator Read Policy: Confirmed admins can view all projects (drafts and published)
CREATE POLICY projects_admin_select
ON public.projects
FOR SELECT
TO authenticated
USING (
  private.is_admin()
);

-- 3. Administrator Insert Policy: Only confirmed admins can insert projects
CREATE POLICY projects_admin_insert
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (
  private.is_admin()
);

-- 4. Administrator Update Policy: Only confirmed admins can update projects
CREATE POLICY projects_admin_update
ON public.projects
FOR UPDATE
TO authenticated
USING (
  private.is_admin()
)
WITH CHECK (
  private.is_admin()
);

-- 5. Administrator Delete Policy: Only confirmed admins can delete projects
CREATE POLICY projects_admin_delete
ON public.projects
FOR DELETE
TO authenticated
USING (
  private.is_admin()
);
```

---

### 2.4 Table: `public.project_media` Policies

Media visibility is strictly inherited from the associated project's publication status:

```sql
-- 1. Public Media Read Policy: Only media attached to published projects is publicly visible
CREATE POLICY project_media_public_select
ON public.project_media
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = project_media.project_id
      AND p.status = 'published'
  )
);

-- 2. Administrator Media Read Policy: Confirmed admins can view all media
CREATE POLICY project_media_admin_select
ON public.project_media
FOR SELECT
TO authenticated
USING (
  private.is_admin()
);

-- 3. Administrator Media Insert Policy
CREATE POLICY project_media_admin_insert
ON public.project_media
FOR INSERT
TO authenticated
WITH CHECK (
  private.is_admin()
);

-- 4. Administrator Media Update Policy
CREATE POLICY project_media_admin_update
ON public.project_media
FOR UPDATE
TO authenticated
USING (
  private.is_admin()
)
WITH CHECK (
  private.is_admin()
);

-- 5. Administrator Media Delete Policy
CREATE POLICY project_media_admin_delete
ON public.project_media
FOR DELETE
TO authenticated
USING (
  private.is_admin()
);
```

---

## 3. Comprehensive Security & Constraint Test Matrix

During **M02 Gate D**, all 26 security scenarios and 7 constraint scenarios must be executed against an **isolated test database** (local disposable container or dedicated staging project). Testing against production is strictly prohibited.

### 3.1 RLS Authorization Test Scenarios (26 Cases)

| ID | Test Scenario | Executing Role | Target Entity | Operation | Condition / Payload | Expected Result | Exact Verification Assertion |
|:---|:---|:---|:---|:---:|:---|:---|:---|
| **RLS-01** | Public read of published projects | `anon` | `projects` | `SELECT` | Query all projects | Success | Rows with `status = 'published'` returned |
| **RLS-02** | Public read of draft projects | `anon` | `projects` | `SELECT` | `WHERE status = 'draft'` | Empty set | 0 rows returned (triggers Next.js 404) |
| **RLS-03** | Public direct project insert | `anon` | `projects` | `INSERT` | Valid project payload | Rejection | SQL error 42501 (Permission Denied); 0 rows created |
| **RLS-04** | Public direct project update | `anon` | `projects` | `UPDATE` | `SET title = 'Hacked'` | Rejection / 0 rows | Error 42501; target project in DB unchanged |
| **RLS-05** | Public direct project delete | `anon` | `projects` | `DELETE` | `WHERE id = <valid_id>` | Rejection / 0 rows | Error 42501; target project in DB remains |
| **RLS-06** | Public media read of published project | `anon` | `project_media` | `SELECT` | Media linked to published project | Success | Media rows returned |
| **RLS-07** | Public media read of draft project | `anon` | `project_media` | `SELECT` | Media linked to draft project | Empty set | 0 rows returned |
| **RLS-08** | Public direct media insert | `anon` | `project_media` | `INSERT` | Valid media payload | Rejection | Error 42501 (Permission Denied); 0 rows created |
| **RLS-09** | Public direct media update/delete | `anon` | `project_media` | `UPDATE/DELETE`| Modify existing media | Rejection | Error 42501; database row remains unchanged |
| **RLS-10** | Non-admin auth read published | `authenticated` (non-admin) | `projects` | `SELECT` | Query all projects | Success | Rows with `status = 'published'` returned |
| **RLS-11** | Non-admin auth read draft | `authenticated` (non-admin) | `projects` | `SELECT` | `WHERE status = 'draft'` | Empty set | 0 rows returned |
| **RLS-12** | Non-admin auth direct project insert | `authenticated` (non-admin) | `projects` | `INSERT` | Valid project payload | Rejection | RLS WITH CHECK violation (error 42501); row not created |
| **RLS-13** | Non-admin auth direct project update | `authenticated` (non-admin) | `projects` | `UPDATE` | `SET title = 'Unauthorized'` | 0 rows affected | 0 rows modified; database row remains unchanged |
| **RLS-14** | Non-admin auth direct project delete | `authenticated` (non-admin) | `projects` | `DELETE` | `WHERE id = <id>` | 0 rows affected | 0 rows deleted; database row remains |
| **RLS-15** | Non-admin auth query admin_users | `authenticated` (non-admin) | `private.admin_users` | `SELECT` | `SELECT * FROM private.admin_users` | Rejection | SQL error 42501 (Permission Denied); schema unexposed |
| **RLS-16** | Non-admin auth execute is_admin() | `authenticated` (non-admin) | Function | `SELECT` | `SELECT private.is_admin()` | Evaluates false | Returns `false` |
| **RLS-17** | Anonymous query admin_users | `anon` | `private.admin_users` | `SELECT` | `SELECT * FROM private.admin_users` | Rejection | SQL error 42501 (Permission Denied) |
| **RLS-18** | Anonymous execute is_admin() | `anon` | Function | `SELECT` | `SELECT private.is_admin()` | Evaluates false | Returns `false` (auth.uid() is NULL) |
| **RLS-19** | Admin auth read all projects | `authenticated` (admin) | `projects` | `SELECT` | Query all projects | Success | All published AND draft rows returned |
| **RLS-20** | Admin auth insert draft project | `authenticated` (admin) | `projects` | `INSERT` | Draft project payload | Success | Row created; `published_at` is NULL |
| **RLS-21** | Admin auth insert published project | `authenticated` (admin) | `projects` | `INSERT` | Published project payload | Success | Row created; `published_at` populated by trigger |
| **RLS-22** | Admin auth update draft to published | `authenticated` (admin) | `projects` | `UPDATE` | `SET status = 'published'` | Success | Row updated; `published_at` populated by trigger |
| **RLS-23** | Admin auth update published to draft | `authenticated` (admin) | `projects` | `UPDATE` | `SET status = 'draft'` | Success | `published_at` set to NULL; instantly drops from anon SELECT |
| **RLS-24** | Admin auth delete project | `authenticated` (admin) | `projects` | `DELETE` | `WHERE id = <id>` | Success | Project deleted; foreign key CASCADE removes linked media |
| **RLS-25** | Forged JWT user metadata bypass | `authenticated` (forged claim)| `projects` | `INSERT` | JWT with `role: 'admin'` metadata | Rejection | Fails RLS check; `private.is_admin()` reads table, not JWT |
| **RLS-26** | Expired or invalid JWT token | Invalid Auth token | `projects` | `INSERT` | Expired session token | Rejection | Treated as `anon` (Error 42501 Permission Denied) |

---

### 3.2 SQL Integrity & Constraint Test Scenarios (7 Cases)

| ID | Test Scenario | Executing Role | Target Table | Trigger Condition | Expected Error Code | Exact Assertion |
|:---|:---|:---|:---|:---|:---:|:---|
| **CON-01** | Duplicate project slug | Admin | `projects` | Insert duplicate `slug` | `23505` | `unique_violation: uq_projects_slug` |
| **CON-02** | Invalid slug characters | Admin | `projects` | `slug = 'My Invalid Slug!'` | `23514` | `check_violation: chk_projects_slug_format` |
| **CON-03** | Invalid project status | Admin | `projects` | `status = 'archived'` | `23514` | `check_violation: chk_projects_status` |
| **CON-04** | Title length boundary | Admin | `projects` | `title = 'A'` (<2 chars) | `23514` | `check_violation: chk_projects_title_length` |
| **CON-05** | Summary length boundary | Admin | `projects` | `summary = 'Short'` (<10 chars) | `23514` | `check_violation: chk_projects_summary_length` |
| **CON-06** | Invalid media foreign key | Admin | `project_media`| `project_id = gen_random_uuid()` | `23503` | `foreign_key_violation` |
| **CON-07** | Invalid admin email format | Direct SQL | `admin_users` | `email = 'not-an-email'` | `23514` | `check_violation: chk_admin_users_email_valid` |

---

## 4. Test Execution & Isolation Protocol (Gate D)

- **Environment Isolation**:
  - Tests will run in an isolated environment (`tests/database/rls.test.ts`) using the official `@supabase/supabase-js` client.
  - Test suites connect to a **local disposable Supabase container** (`npx supabase start`) or an isolated staging project.
  - **PROHIBITION**: Destructive RLS test suites and temporary auth user creation must **NEVER** run against the production Supabase project.
- **Client Test Setup**:
  1. `anonClient`: Configured with `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
  2. `nonAdminClient`: Authenticated via temporary test user (`test-visitor@example.com`).
  3. `adminClient`: Authenticated via temporary test admin whose UUID is seeded into `private.admin_users`.
- **Teardown & Verification**:
  - Test script asserts that unauthorized UPDATE and DELETE attempts result in zero modifications to existing rows.
  - All test fixtures are wiped from the test database upon completion.
