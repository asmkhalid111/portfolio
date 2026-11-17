# M02 Row Level Security (RLS) Specification & Test Matrix (v0.3)

> **Milestone:** M02 — Database Integration & RLS Foundation
> **Document Version:** v0.3 (Post-ChatGPT Gate A v0.2 Corrections)
> **Status:** FINAL SECURITY SPECIFICATION (Awaiting ChatGPT Audit & Owner Approval)
> **Target Database:** PostgreSQL 15+ / Supabase Auth & RLS
> **Date:** 2026-11-17

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
                 │       └── Only 'public' exposed. 'private' schema is completely unexposed.
                 │
                 ├── 2. Table Privilege Check (SQL GRANT)
                 │       ├── Anon: SELECT only on public.projects & public.project_media.
                 │       ├── Authenticated: SELECT/INSERT/UPDATE/DELETE on public tables.
                 │       └── private.admin_users: ALL REVOKED from anon and authenticated.
                 │
                 └── 3. Row Level Security Evaluation (FORCE RLS)
                         ├── Anon: status = 'published' ONLY (never evaluates is_admin).
                         ├── Non-admin Authenticated: status = 'published' for reads; mutations rejected.
                         └── Admin Authenticated: private.is_admin() = TRUE -> FULL CRUD.
```

### 1.1 Revision History & Audit Correction Matrix (v0.2 → v0.3)

| Audit Item / Identified Issue | Security Resolution | Specific Section |
|:---|:---|:---:|
| **Administrator Whitelist Access** | Replaced contradictory direct RLS policies with zero-grant, zero-policy model on `private.admin_users`. No API user can query or mutate the whitelist. | Section 2.1, 2.2 |
| **Anonymous Schema Isolation** | Revoked `private` schema `USAGE` and `private.is_admin()` `EXECUTE` from `anon`. Anon queries on public tables evaluate `status = 'published'` without executing `is_admin()`. | Section 2.1, 2.2 |
| **Separation of Testing Mechanisms** | Explicitly bifurcated test harness into Data API tests (`@supabase/supabase-js`) and Direct PostgreSQL privilege tests (`SET ROLE` via SQL). | Section 3.1, 3.2 |
| **State Retention Assertions** | Added explicit post-mutation read assertions for all rejected UPDATE and DELETE attempts, confirming target rows remain completely unchanged. | Section 3.1, 3.2 |
| **Real Authenticated Forgery Tests** | Specified that forged metadata tests utilize valid, real test users with `raw_user_meta_data = '{"role": "admin"}'`, proving metadata is ignored. | Section 3.1 (API-23) |
| **Invalid / Expired JWT Tests** | Asserted actual HTTP 401 API rejection rather than assuming silent fallback to anonymous SQL transactions. | Section 3.1 (API-24, API-25) |
| **Modern API Key Formats** | Standardized on exact formats `sb_publishable_...` and `sb_secret_...`. | Section 1.2 |

---

### 1.2 API Key Architecture & Invariants
- **`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_...`)**: Modern public publishable client key. Deployed to browser and SSR runtimes. Constrained by SQL grants and RLS policies.
- **`SUPABASE_SECRET_KEY` (`sb_secret_...`)**: Secret administrative key. Bypasses RLS. Restricted strictly to offline test runners in isolated environments. **NEVER** placed in client bundles, public variables, or committed to Git.
- **`private.admin_users` Lockout**: Neither `anon` nor `authenticated` holds table privileges on `private.admin_users`. Even an authenticated administrator cannot mutate the whitelist via the PostgREST API. Whitelist management is strictly out-of-band.

---

## 2. Row Level Security Policy Definitions

### 2.1 Table: `private.admin_users` Policies
```sql
ALTER TABLE private.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.admin_users FORCE ROW LEVEL SECURITY;

-- CRITICAL DESIGN: Zero direct-access policies are granted to API roles (anon, authenticated).
-- All SQL privileges are REVOKED.
-- Access is restricted strictly to database-owner operations (postgres) and SECURITY DEFINER lookups.
```

---

### 2.2 Table: `public.projects` Policies

```sql
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects FORCE ROW LEVEL SECURITY;

-- 1. Public Read Policy: Anonymous and non-admin authenticated users can only view published projects.
-- NOTE: Does NOT evaluate private.is_admin() for anon. Simple status check.
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

### 2.3 Table: `public.project_media` Policies

```sql
ALTER TABLE public.project_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_media FORCE ROW LEVEL SECURITY;

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

-- 2. Administrator Media Read Policy
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

## 3. Comprehensive Security & Privilege Test Matrix

Testing is explicitly bifurcated into:
- **Mechanism A (Data API Tests)**: Executed via `@supabase/supabase-js` over HTTP/REST using real Auth sessions. Asserts what clients and attackers experience through the network.
- **Mechanism B (Direct PostgreSQL Tests)**: Executed via direct SQL connection using controlled role contexts (`SET ROLE anon;`, `SET ROLE authenticated;`, `SET ROLE postgres;`). Asserts raw kernel SQLSTATE error codes and schema isolation.

**ENVIRONMENT ISOLATION**: All tests run exclusively against **Tier A** (local disposable container) or **Tier B** (isolated staging). Running test suites against production is strictly prohibited.

---

### 3.1 Mechanism A: Data API Security Tests (26 Tests)

| ID | Test Scenario | Executing Role / Context | Target Endpoint / Table | Operation | Input / Condition | Expected HTTP / API Result | Exact Verification & State Retention Assertion |
|:---|:---|:---|:---|:---:|:---|:---|:---|
| **API-01** | Anonymous public projects read | `anon` (`sb_publishable_...`) | `/rest/v1/projects` | `GET` | Query all records | HTTP 200 OK | Array contains only records where `status === 'published'`. |
| **API-02** | Anonymous draft project read | `anon` (`sb_publishable_...`) | `/rest/v1/projects` | `GET` | `?slug=eq.<draft-slug>` | HTTP 200 OK | Empty array `[]` (drives Next.js `notFound()` 404). |
| **API-03** | Anonymous direct project insert | `anon` (`sb_publishable_...`) | `/rest/v1/projects` | `POST` | Valid project payload | HTTP 401 / 403 / 42501 | Error returned; subsequent query confirms project NOT created. |
| **API-04** | Anonymous direct project update | `anon` (`sb_publishable_...`) | `/rest/v1/projects` | `PATCH` | `?id=eq.<id>`, `title='Hacked'` | HTTP 401 / 403 / 42501 | Error or 0 rows modified; subsequent query asserts original title unchanged. |
| **API-05** | Anonymous direct project delete | `anon` (`sb_publishable_...`) | `/rest/v1/projects` | `DELETE`| `?id=eq.<id>` | HTTP 401 / 403 / 42501 | Error or 0 rows modified; subsequent query asserts project remains in DB. |
| **API-06** | Anonymous published media read | `anon` (`sb_publishable_...`) | `/rest/v1/project_media` | `GET` | Media of published project | HTTP 200 OK | Array contains published media records. |
| **API-07** | Anonymous draft media read | `anon` (`sb_publishable_...`) | `/rest/v1/project_media` | `GET` | Media of draft project | HTTP 200 OK | Empty array `[]`. |
| **API-08** | Anonymous media insert attempt | `anon` (`sb_publishable_...`) | `/rest/v1/project_media` | `POST` | Valid media payload | HTTP 401 / 403 / 42501 | Error returned; subsequent query confirms media NOT created. |
| **API-09** | Anonymous media update attempt | `anon` (`sb_publishable_...`) | `/rest/v1/project_media` | `PATCH` | `?id=eq.<id>`, `alt_text='Hacked'` | HTTP 401 / 403 / 42501 | Error or 0 rows modified; original alt text unchanged. |
| **API-10** | Non-admin auth read published | `authenticated` (non-admin user) | `/rest/v1/projects` | `GET` | Query all records | HTTP 200 OK | Returns published projects only. |
| **API-11** | Non-admin auth read draft | `authenticated` (non-admin user) | `/rest/v1/projects` | `GET` | `?slug=eq.<draft-slug>` | HTTP 200 OK | Empty array `[]`. |
| **API-12** | Non-admin auth project insert | `authenticated` (non-admin user) | `/rest/v1/projects` | `POST` | Valid project payload | HTTP 403 Forbidden / 42501 | RLS WITH CHECK violation; project NOT created in DB. |
| **API-13** | Non-admin auth project update | `authenticated` (non-admin user) | `/rest/v1/projects` | `PATCH` | `?id=eq.<id>`, `title='Tampered'`| HTTP 200 / 204 (0 rows) | 0 rows affected; subsequent query asserts original project unchanged. |
| **API-14** | Non-admin auth project delete | `authenticated` (non-admin user) | `/rest/v1/projects` | `DELETE`| `?id=eq.<id>` | HTTP 200 / 204 (0 rows) | 0 rows affected; subsequent query asserts project remains in DB. |
| **API-15** | Non-admin query admin_users | `authenticated` (non-admin user) | `/rest/v1/admin_users` | `GET` | Query table | HTTP 404 Not Found | PostgREST schema cache rejection; private schema not exposed. |
| **API-16** | Anonymous query admin_users | `anon` (`sb_publishable_...`) | `/rest/v1/admin_users` | `GET` | Query table | HTTP 404 Not Found | PostgREST schema cache rejection. |
| **API-17** | Admin auth read all projects | `authenticated` (admin user) | `/rest/v1/projects` | `GET` | Query all records | HTTP 200 OK | Both draft AND published projects returned. |
| **API-18** | Admin auth insert draft project | `authenticated` (admin user) | `/rest/v1/projects` | `POST` | `status = 'draft'` | HTTP 201 Created | Project created; `published_at` is confirmed `null`. |
| **API-19** | Admin auth insert published | `authenticated` (admin user) | `/rest/v1/projects` | `POST` | `status = 'published'` | HTTP 201 Created | Project created; `published_at` is populated by trigger. |
| **API-20** | Admin auth publish draft | `authenticated` (admin user) | `/rest/v1/projects` | `PATCH` | `?id=eq.<draft-id>`, `status='published'` | HTTP 200 OK | Status updated; `published_at` populated by trigger. |
| **API-21** | Admin auth revert to draft | `authenticated` (admin user) | `/rest/v1/projects` | `PATCH` | `?id=eq.<pub-id>`, `status='draft'` | HTTP 200 OK | `status='draft'`; `published_at` reset to `null`; drops from anon view. |
| **API-22** | Admin auth delete project | `authenticated` (admin user) | `/rest/v1/projects` | `DELETE`| `?id=eq.<id>` | HTTP 200 / 204 | Project deleted; cascade deletes linked `project_media`. |
| **API-23** | Forged user metadata bypass | `authenticated` (real user with metadata `role: 'admin'`) | `/rest/v1/projects` | `POST` | Valid project payload | HTTP 403 Forbidden / 42501 | Rejected by RLS; `private.is_admin()` evaluates database table, not JWT metadata. |
| **API-24** | Expired JWT authentication | Expired JWT session | `/rest/v1/projects` | `GET` | Request with expired bearer token | HTTP 401 Unauthorized | PostgREST rejects expired token directly; does NOT process query. |
| **API-25** | Malformed JWT authentication | Malformed / invalid signature JWT | `/rest/v1/projects` | `GET` | Request with bad bearer token | HTTP 401 Unauthorized | PostgREST rejects invalid signature directly. |
| **API-26** | Admin API mutation on whitelist | `authenticated` (admin user) | `/rest/v1/admin_users` | `POST` | Attempt to insert new admin | HTTP 404 Not Found | Schema unexposed; even admins cannot modify whitelist over PostgREST API. |

---

### 3.2 Mechanism B: Direct PostgreSQL Privilege & Kernel Tests (12 Tests)

| ID | Test Scenario | Controlled SQL Role Context | Target Entity | Operation / Command | Expected SQLSTATE / Kernel Outcome | Exact Assertion |
|:---|:---|:---|:---|:---|:---:|:---|
| **SQL-01** | Anonymous schema usage on private | `SET ROLE anon;` | `SCHEMA private` | `SELECT private.is_admin();` | `42501` (`insufficient_privilege`) | Permission denied for schema `private`. |
| **SQL-02** | Authenticated schema usage on private | `SET ROLE authenticated;` | `SCHEMA private` | Evaluates function | Success | Schema USAGE permitted. |
| **SQL-03** | Direct SQL query on admin_users | `SET ROLE authenticated;` | `private.admin_users` | `SELECT * FROM private.admin_users;` | `42501` (`insufficient_privilege`) | Permission denied for table `admin_users`. |
| **SQL-04** | Direct SQL mutation on admin_users | `SET ROLE authenticated;` | `private.admin_users` | `INSERT INTO private.admin_users ...` | `42501` (`insufficient_privilege`) | Permission denied; zero API role mutations possible. |
| **SQL-05** | Duplicate project slug constraint | `SET ROLE postgres;` | `public.projects` | Insert duplicate `slug` | `23505` (`unique_violation`) | Violates `uq_projects_slug`. |
| **SQL-06** | Invalid slug format constraint | `SET ROLE postgres;` | `public.projects` | Insert `slug = 'Bad Slug!'` | `23514` (`check_violation`) | Violates `chk_projects_slug_format`. |
| **SQL-07** | Invalid project status constraint | `SET ROLE postgres;` | `public.projects` | Insert `status = 'archived'` | `23514` (`check_violation`) | Violates `chk_projects_status`. |
| **SQL-08** | Title length constraint | `SET ROLE postgres;` | `public.projects` | Insert `title = 'A'` (<2 chars) | `23514` (`check_violation`) | Violates `chk_projects_title_length`. |
| **SQL-09** | Summary length constraint | `SET ROLE postgres;` | `public.projects` | Insert `summary = 'Short'` (<10 chars) | `23514` (`check_violation`) | Violates `chk_projects_summary_length`. |
| **SQL-10** | Foreign key cascade integrity | `SET ROLE postgres;` | `public.project_media` | Insert with non-existent `project_id` | `23503` (`foreign_key_violation`) | Rejects non-existent project reference. |
| **SQL-11** | Admin email format constraint | `SET ROLE postgres;` | `private.admin_users` | Insert `email = 'bad-email'` | `23514` (`check_violation`) | Violates `chk_admin_users_email_valid`. |
| **SQL-12** | Client timestamp tampering override | `SET ROLE postgres;` | `public.projects` | Insert draft with `published_at = now()` | Trigger Execution | `published_at` is forced to `NULL` by `sync_project_published_at()`. |

---

## 4. Test Execution & Gate D Acceptance Standard

- **Total Test Catalog**: **38 Distinct Tests** (26 Data API Tests + 12 Direct PostgreSQL Tests).
- **Gate D Pass Criteria**: 100% (38/38) tests must pass in an isolated test environment (Tier A/B).
- **State Invariant**: Every unauthorized mutation test must empirically verify that the underlying database state was not modified.
