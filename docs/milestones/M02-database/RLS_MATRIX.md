# M02 Row Level Security (RLS) Specification & Test Matrix

> **Milestone:** M02 — Database Integration & RLS Foundation  
> **Status:** PROPOSED SECURITY SPECIFICATION (Awaiting ChatGPT Audit & Owner Approval)  
> **Target Database:** PostgreSQL 15+ / Supabase Auth & RLS  
> **Date:** 2026-11-16  

---

## 1. Security Architecture & Threat Model

Row-Level Security (RLS) is the primary security boundary of the portfolio database. The system adheres to defense-in-depth principles:

```
[Public Visitor / Anon Key]
         │
         ▼
[PostgREST / Supabase API]
         │
         ├── 1. Table Grants Check (SQL GRANT)
         │       └── Anon granted SELECT only on projects/project_media; ALL REVOKED on admin_users.
         │
         └── 2. Row Level Security Evaluation
                 ├── Anon: (status = 'published') ONLY.
                 ├── Non-admin Authenticated: (status = 'published') for SELECT; mutations rejected by is_admin().
                 └── Admin Authenticated: public.is_admin() = TRUE -> FULL SELECT, INSERT, UPDATE, DELETE.
```

### 1.1 Invariants & Non-Negotiable Security Rules
1. **Database-Kernel Enforcement:** RLS policies are evaluated by the PostgreSQL kernel on every row. Edge guards (`proxy.ts`), server action guards, or client UI state are secondary defense layers and never the primary boundary.
2. **Anonymous Draft Isolation:** Anonymous visitors querying `/api` or through PostgREST must never receive rows where `status != 'published'`. Public routes querying draft slugs must yield zero rows, driving Next.js `notFound()`.
3. **No Automatic Authenticated Privilege:** An arbitrary user with a valid Supabase Auth session (`authenticated` role) possesses zero administrative rights. They cannot read drafts, create projects, edit projects, or delete projects unless their `auth.uid()` explicitly exists in `public.admin_users`.
4. **Out-of-Band Administration:** The `public.admin_users` table has zero public registration endpoints. Admin identities are added directly by the database owner.
5. **Hardened `SECURITY DEFINER`:** Helper functions (`public.is_admin()`) use `SECURITY DEFINER SET search_path = ''` to prevent search-path hijacking attacks, with execution explicitly revoked from `PUBLIC` and `anon`.
6. **Key Separation:** The `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS and is strictly prohibited in client bundles, Next.js public environment variables, or standard runtime operations.

---

## 2. Row Level Security Policy Definitions

### 2.1 Enable RLS on All Tables
```sql
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_media ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owners to avoid accidental bypass in local tests
ALTER TABLE public.admin_users FORCE ROW LEVEL SECURITY;
ALTER TABLE public.projects FORCE ROW LEVEL SECURITY;
ALTER TABLE public.project_media FORCE ROW LEVEL SECURITY;
```

---

### 2.2 Table: `public.admin_users` Policies

`admin_users` holds the authorization whitelist. It must not be readable by the public or non-admin users.

```sql
-- Policy 1: Only confirmed administrators can read admin_users
CREATE POLICY admin_users_admin_select
ON public.admin_users
FOR SELECT
TO authenticated
USING (
  public.is_admin()
);

-- Policy 2: Mutations to admin_users are strictly locked
-- Only an existing admin can add or remove admin identities via authenticated API
CREATE POLICY admin_users_admin_insert
ON public.admin_users
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
);

CREATE POLICY admin_users_admin_delete
ON public.admin_users
FOR DELETE
TO authenticated
USING (
  public.is_admin()
);
```

---

### 2.3 Table: `public.projects` Policies

`projects` is the showcase entity with published (public) and draft (admin-only) states.

```sql
-- Policy 1: Public read access for published projects
-- Anonymous visitors and non-admin authenticated users can only view published projects
CREATE POLICY projects_public_select
ON public.projects
FOR SELECT
TO anon, authenticated
USING (
  status = 'published'
);

-- Policy 2: Administrator read access (all projects including drafts)
CREATE POLICY projects_admin_select
ON public.projects
FOR SELECT
TO authenticated
USING (
  public.is_admin()
);

-- Policy 3: Administrator insert access
CREATE POLICY projects_admin_insert
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
);

-- Policy 4: Administrator update access
CREATE POLICY projects_admin_update
ON public.projects
FOR UPDATE
TO authenticated
USING (
  public.is_admin()
)
WITH CHECK (
  public.is_admin()
);

-- Policy 5: Administrator delete access
CREATE POLICY projects_admin_delete
ON public.projects
FOR DELETE
TO authenticated
USING (
  public.is_admin()
);
```

---

### 2.4 Table: `public.project_media` Policies

Media records inherit their public visibility from the associated project's publication status.

```sql
-- Policy 1: Public read access for media belonging to published projects
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

-- Policy 2: Administrator read access for all project media
CREATE POLICY project_media_admin_select
ON public.project_media
FOR SELECT
TO authenticated
USING (
  public.is_admin()
);

-- Policy 3: Administrator insert access
CREATE POLICY project_media_admin_insert
ON public.project_media
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
);

-- Policy 4: Administrator update access
CREATE POLICY project_media_admin_update
ON public.project_media
FOR UPDATE
TO authenticated
USING (
  public.is_admin()
)
WITH CHECK (
  public.is_admin()
);

-- Policy 5: Administrator delete access
CREATE POLICY project_media_admin_delete
ON public.project_media
FOR DELETE
TO authenticated
USING (
  public.is_admin()
);
```

---

## 3. Explicit RLS Test Matrix

During M02 Gate D, these 16 test cases must be executed against a live Supabase PostgreSQL database using an automated test runner (`tests/database/rls.test.ts`).

| ID | Test Scenario | Executing Role / Actor | Target Table | Operation | Input / Condition | Expected Result | Pass Criteria |
|:---|:---|:---|:---|:---:|:---|:---|:---|
| **RLS-01** | Public read of published projects | `anon` (publishable key) | `projects` | `SELECT` | `WHERE status = 'published'` | Rows returned | HTTP 200 / records visible |
| **RLS-02** | Public read of draft projects | `anon` (publishable key) | `projects` | `SELECT` | `WHERE status = 'draft'` | Zero rows returned | Length === 0 (Strict 404 trigger) |
| **RLS-03** | Public direct insert attempt | `anon` (publishable key) | `projects` | `INSERT` | Valid project payload | Rejection | SQL error 42501 (Permission Denied) |
| **RLS-04** | Public direct update attempt | `anon` (publishable key) | `projects` | `UPDATE` | `SET title = 'Hacked'` | Rejection / 0 rows | SQL error 42501 or 0 rows modified |
| **RLS-05** | Public direct delete attempt | `anon` (publishable key) | `projects` | `DELETE` | `WHERE id = <valid_id>` | Rejection / 0 rows | SQL error 42501 or 0 rows modified |
| **RLS-06** | Public media read of published project | `anon` (publishable key) | `project_media` | `SELECT` | Media linked to published project | Rows returned | Media records visible |
| **RLS-07** | Public media read of draft project | `anon` (publishable key) | `project_media` | `SELECT` | Media linked to draft project | Zero rows returned | Length === 0 |
| **RLS-08** | Non-admin auth read published | `authenticated` (non-admin JWT) | `projects` | `SELECT` | `WHERE status = 'published'` | Rows returned | Records visible |
| **RLS-09** | Non-admin auth read draft | `authenticated` (non-admin JWT) | `projects` | `SELECT` | `WHERE status = 'draft'` | Zero rows returned | Length === 0 |
| **RLS-10** | Non-admin auth insert attempt | `authenticated` (non-admin JWT) | `projects` | `INSERT` | Valid project payload | Rejection | RLS policy violation (error 42501) |
| **RLS-11** | Non-admin auth query admin_users | `authenticated` (non-admin JWT) | `admin_users` | `SELECT` | `SELECT * FROM admin_users` | Zero rows returned | Length === 0 |
| **RLS-12** | Admin auth read drafts & published | `authenticated` (admin JWT) | `projects` | `SELECT` | All records | All rows returned | Published AND draft records visible |
| **RLS-13** | Admin auth project insert | `authenticated` (admin JWT) | `projects` | `INSERT` | New draft project | Row created | Success, id returned |
| **RLS-14** | Admin auth project update & publish | `authenticated` (admin JWT) | `projects` | `UPDATE` | `status = 'published'` | Row updated | `published_at` populated by trigger |
| **RLS-15** | Admin auth project delete | `authenticated` (admin JWT) | `projects` | `DELETE` | `WHERE id = <id>` | Row deleted | Cascade deletes linked `project_media` |
| **RLS-16** | Forged JWT / Custom claims bypass | `authenticated` (forged user) | `projects` | `INSERT` | User metadata claims `role: 'admin'` | Rejection | Fails because `is_admin()` strictly reads `public.admin_users` |

---

## 4. Constraint & Integrity Negative Test Matrix

In addition to RLS policies, PostgreSQL table constraints must reject malformed data regardless of user privileges:

| ID | Test Scenario | Executing Role | Table | Operation | Trigger Condition | Expected Database Error |
|:---|:---|:---|:---|:---:|:---|:---|
| **CON-01** | Duplicate project slug | Admin | `projects` | `INSERT` | Insert project with existing `slug` | `23505 (unique_violation)` |
| **CON-02** | Invalid slug characters | Admin | `projects` | `INSERT` | `slug = 'My Project!'` (spaces/symbols) | `23514 (check_violation: chk_projects_slug_format)` |
| **CON-03** | Invalid project status | Admin | `projects` | `INSERT` | `status = 'archived'` | `23514 (check_violation: chk_projects_status)` |
| **CON-04** | Title too short | Admin | `projects` | `INSERT` | `title = 'A'` | `23514 (check_violation: chk_projects_title_length)` |
| **CON-05** | Summary too short | Admin | `projects` | `INSERT` | `summary = 'Short'` | `23514 (check_violation: chk_projects_summary_length)` |
| **CON-06** | Invalid media foreign key | Admin | `project_media` | `INSERT` | `project_id = gen_random_uuid()` (nonexistent) | `23503 (foreign_key_violation)` |
| **CON-07** | Invalid admin email | Direct SQL | `admin_users` | `INSERT` | `email = 'not-an-email'` | `23514 (check_violation: chk_admin_users_email_valid)` |

---

## 5. Automated Verification Plan (Gate D)

A dedicated Node.js/TypeScript test suite (`tests/database/rls.test.ts`) will be implemented in Gate D using `@supabase/supabase-js`:
1. **Setup:**
   - Client A (`anonClient`): Initialized with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - Client B (`nonAdminClient`): Authenticated via a temporary disposable test user (`test-nonadmin@example.com`).
   - Client C (`adminClient`): Authenticated via an authorized test admin whose UUID is seeded into `public.admin_users`.
2. **Execution:**
   - Run Vitest / test script against the real provisioned Supabase instance.
   - Assert all 16 RLS scenarios and 7 constraint violation scenarios.
3. **Teardown & Cleanup:**
   - Remove test rows created during testing.
   - Delete temporary test auth users.
   - Verify database returns to clean baseline state.
