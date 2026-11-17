# M02 Database Schema Specification (v0.3)

> **Milestone:** M02 — Database Integration & RLS Foundation
> **Document Version:** v0.3 (Post-ChatGPT Gate A v0.2 Corrections)
> **Status:** FINAL ARCHITECTURE SPECIFICATION (Awaiting ChatGPT Audit & Owner Approval)
> **Target Database:** PostgreSQL 15+ (Managed Supabase Free Tier)
> **Date:** 2026-11-17

---

## 1. Architectural Overview & Scoping Boundaries

This document defines the definitive PostgreSQL relational schema, integrity constraints, security-definer authorization functions, triggers, indexes, and privilege grants for Milestone M02 of the Portfolio project.

### 1.1 Revision History & Audit Correction Matrix (v0.2 → v0.3)

| Audit Item / Identified Issue | Architectural Resolution | Specific Section |
|:---|:---|:---:|
| **Administrator Privilege Model** | Replaced contradictory direct-access RLS policies with zero-grant, zero-policy enforcement on `private.admin_users`. Revoked unnecessary `anon` access to `private` schema and `private.is_admin()`. | Section 2.1, 2.2, 2.3 |
| **Publication Timestamp Semantics** | Rewrote `sync_project_published_at()` with explicit `TG_OP` checks handling all insert/update transitions, preserving existing timestamps on updates, and overriding client tampering. Changed from `SECURITY DEFINER` to `SECURITY INVOKER`. | Section 4.2 |
| **Row Trigger Execution Context** | Converted `update_updated_at_column()` and `sync_project_published_at()` to `SECURITY INVOKER`, justifying least-privilege execution since elevated rights are unnecessary. | Section 4.1, 4.2 |
| **Modern API Key Formats** | Standardized on exact 2026 Supabase key naming: `sb_publishable_...` and `sb_secret_...`. | Section 6.2 |
| **Admin PII & Email Justification** | Formally documented that `id UUID` is the sole authorization key; `email` is strictly operational metadata for human administration and auditability. | Section 2.2 |
| **Storage Media Draft Isolation** | Documented M07 storage bucket policy requirement: public reads in `project-media` must verify that parent project status is `published`. | Section 7.2 |

---

## 2. Schemas & Private Administrator Authorization

### 2.1 Schema Declaration & Access Boundaries
Supabase exposes the `public` schema over PostgREST (the Data API). To enforce an absolute perimeter around administrator identities, we maintain an unexposed internal `private` schema:

```sql
-- 1. Create internal private schema
CREATE SCHEMA IF NOT EXISTS private;

-- 2. Revoke all public privileges
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

-- 3. Grant USAGE strictly to authenticated (needed when authenticated users trigger is_admin() in RLS)
-- NOTE: anon is explicitly DENIED schema usage; anon never evaluates is_admin().
GRANT USAGE ON SCHEMA private TO authenticated;
```

### 2.2 Table: `private.admin_users`
Maintains the whitelist of `auth.users` UUIDs authorized to administer the portfolio.
- **Physical Isolation**: Located in `private` schema (completely hidden from PostgREST).
- **Table Privileges**: Zero SQL privileges granted to `anon` or `authenticated` (`REVOKE ALL`).
- **Row Level Security**: Enabled and forced (`FORCE ROW LEVEL SECURITY`). **Zero direct-access policies are defined for API roles.**
- **Administration**: Managed exclusively out-of-band by the database owner using the Supabase Dashboard SQL Editor or direct psql connection as `postgres`.
- **PII & Data Minimization**: Stores only `id UUID`, `email TEXT`, and `created_at TIMESTAMPTZ`.
  - *Justification for `email`*: The cryptographic authorization boundary relies strictly on the immutable `id UUID PRIMARY KEY REFERENCES auth.users(id)`. The `email` column is retained solely for administrative auditability in the dashboard (avoiding confusing cross-schema joins to `auth.users`) and ensuring that human operators do not assign admin roles to erroneous UUIDs. It is never queried by authorization logic.

```sql
CREATE TABLE private.admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  CONSTRAINT chk_admin_users_email_valid CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Revoke all table access from API roles
REVOKE ALL ON TABLE private.admin_users FROM PUBLIC, anon, authenticated;

-- Enforce RLS with NO policies for ordinary API roles
ALTER TABLE private.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.admin_users FORCE ROW LEVEL SECURITY;

COMMENT ON TABLE private.admin_users IS 'Internal administrative whitelist table residing in unexposed private schema. Zero API access.';
```

### 2.3 Function: `private.is_admin()`
Evaluates whether the executing authenticated session belongs to an authorized administrator.

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

-- Assign explicit ownership to postgres
ALTER FUNCTION private.is_admin() OWNER TO postgres;

-- Revoke execution from PUBLIC and anon; grant strictly to authenticated
REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated;

COMMENT ON FUNCTION private.is_admin() IS 'Hardened security-definer check verifying whether auth.uid() exists in private.admin_users.';
```

#### Exact Privilege & Execution Model:
1. **Unreachable by Anonymous Visitors**: `anon` has zero privileges on schema `private` and zero `EXECUTE` privileges on `private.is_admin()`. Public visitors querying `public.projects` evaluate `status = 'published'` without ever touching `private.is_admin()`.
2. **Search-Path Override Defense**: `SET search_path = ''` prevents search-path hijacking attacks, requiring schema-qualified object references (`private.admin_users`, `auth.uid()`).
3. **Safe Bypassing of Whitelist RLS**: Because `private.is_admin()` is declared `SECURITY DEFINER` and owned by `postgres` (the table owner and superuser), PostgreSQL evaluates the query body with `postgres` privileges, safely reading `private.admin_users`.
4. **Zero RLS Recursion**: `private.admin_users` has zero RLS policies calling `is_admin()`. Evaluation terminates in an $O(1)$ primary key lookup.
5. **Immunity to Token Forgery**: Evaluates strictly against `auth.uid()` (derived from the cryptographically verified JWT `sub` claim). User-editable metadata (`raw_user_meta_data`) is completely ignored.
6. **API Mutation Lockout**: Because neither `anon`, `authenticated`, nor even an authorized admin user holds table-level SQL grants or RLS policies on `private.admin_users`, **no user can read or mutate the whitelist through the PostgREST API**. All whitelist mutations require direct database-owner access.

---

## 3. Core Domain Tables (`public` Schema)

### 3.1 Table: `public.projects`
Showcase entity for software projects, research systems, and open-source tools.

```sql
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  summary TEXT NOT NULL,
  problem TEXT,
  approach TEXT,
  outcome TEXT,
  technologies TEXT[] NOT NULL DEFAULT '{}',
  repository_url TEXT,
  live_demo_url TEXT,
  featured BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'draft',
  sort_order INT NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),

  -- Integrity Constraints
  CONSTRAINT uq_projects_slug UNIQUE (slug),
  CONSTRAINT chk_projects_title_length CHECK (char_length(trim(title)) >= 2 AND char_length(title) <= 200),
  CONSTRAINT chk_projects_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' AND char_length(slug) <= 100),
  CONSTRAINT chk_projects_summary_length CHECK (char_length(trim(summary)) >= 10 AND char_length(summary) <= 600),
  CONSTRAINT chk_projects_status CHECK (status IN ('draft', 'published')),
  CONSTRAINT chk_projects_sort_order CHECK (sort_order >= 0),
  CONSTRAINT chk_projects_repo_url CHECK (repository_url IS NULL OR repository_url ~* '^https?://'),
  CONSTRAINT chk_projects_demo_url CHECK (live_demo_url IS NULL OR live_demo_url ~* '^https?://'),
  CONSTRAINT chk_projects_technologies_dims CHECK (array_ndims(technologies) IS NULL OR array_ndims(technologies) = 1)
);

COMMENT ON TABLE public.projects IS 'Showcase projects with draft/publish status and unique slug isolation.';
```

### 3.2 Table: `public.project_media`
Screenshots, architecture diagrams, and interface captures belonging to projects.

```sql
CREATE TABLE public.project_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  alt_text TEXT NOT NULL,
  caption TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),

  -- Integrity Constraints
  CONSTRAINT chk_project_media_path CHECK (char_length(trim(storage_path)) >= 3 AND char_length(storage_path) <= 500),
  CONSTRAINT chk_project_media_alt_text CHECK (char_length(trim(alt_text)) >= 3 AND char_length(alt_text) <= 300),
  CONSTRAINT chk_project_media_sort_order CHECK (sort_order >= 0)
);

COMMENT ON TABLE public.project_media IS 'Relational media metadata linked to projects with cascade deletion.';
```

---

## 4. Helper Functions & Row Trigger Semantics

### 4.1 Trigger Function: `public.update_updated_at_column()`
Automatically synchronizes the `updated_at` column whenever a record is modified.
- **Execution Context**: `SECURITY INVOKER`. Elevated privileges are unnecessary because this trigger only modifies row fields (`NEW.updated_at`) of the table currently undergoing mutation.
- **API Safety**: `SET search_path = ''` prevents search-path hijacking. Execution revoked from `PUBLIC` and `anon`; granted to `authenticated`.

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = pg_catalog.clock_timestamp();
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO authenticated;

CREATE TRIGGER trg_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
```

### 4.2 Trigger Function: `public.sync_project_published_at()`
Enforces deterministic publication timestamp rules and prevents client tampering.
- **Execution Context**: `SECURITY INVOKER`. Modifies only `NEW.published_at` on the record being inserted or updated.
- **Behavior Matrix**:
  - `INSERT draft`: `published_at` is set to `NULL` (overriding client-supplied values).
  - `INSERT published`: `published_at` is set to `clock_timestamp()` (overriding client-supplied values).
  - `UPDATE draft -> published`: `published_at` is set to `clock_timestamp()`.
  - `UPDATE published -> draft`: `published_at` is reset to `NULL`.
  - `UPDATE published -> published`: `published_at` retains its existing timestamp (`OLD.published_at`); client tampering is overwritten.
  - `UPDATE draft -> draft`: `published_at` remains `NULL`.

```sql
CREATE OR REPLACE FUNCTION public.sync_project_published_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'published' THEN
      NEW.published_at = pg_catalog.clock_timestamp();
    ELSE
      NEW.published_at = NULL;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'published' AND OLD.status = 'draft' THEN
      NEW.published_at = pg_catalog.clock_timestamp();
    ELSIF NEW.status = 'draft' THEN
      NEW.published_at = NULL;
    ELSIF NEW.status = 'published' AND OLD.status = 'published' THEN
      -- Preserve original publication timestamp; prevent client tampering
      NEW.published_at = COALESCE(OLD.published_at, pg_catalog.clock_timestamp());
    ELSE
      NEW.published_at = NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.sync_project_published_at() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.sync_project_published_at() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_project_published_at() TO authenticated;

CREATE TRIGGER trg_projects_published_at
BEFORE INSERT OR UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.sync_project_published_at();
```

---

## 5. Indexing Strategy

Indexes are created strictly to accelerate high-frequency queries without redundant overhead:

```sql
-- 1. Slug Lookup Index (Instant O(1) project detail fetches)
-- NOTE: In PostgreSQL, declaring 'CONSTRAINT uq_projects_slug UNIQUE (slug)' automatically
-- creates a unique B-tree index named 'uq_projects_slug'. No secondary CREATE INDEX is needed.

-- 2. Partial Index for Public Published Projects (Homepage & Project List SSR)
CREATE INDEX idx_projects_public_published
ON public.projects (sort_order ASC, created_at DESC)
WHERE status = 'published';

-- 3. Partial Index for Featured Public Projects (Homepage Featured Showcase)
CREATE INDEX idx_projects_public_featured
ON public.projects (sort_order ASC, created_at DESC)
WHERE status = 'published' AND featured = true;

-- 4. Status Filter Index (Admin Dashboard Filtering)
CREATE INDEX idx_projects_status
ON public.projects (status);

-- 5. Foreign Key & Media Ordering Index (Project Media Eager Fetches)
CREATE INDEX idx_project_media_project_order
ON public.project_media (project_id, sort_order ASC);
```

---

## 6. Table Grants & Privilege Management

PostgreSQL permissions are configured with minimal privileges per role:

```sql
-- Revoke all default table privileges
REVOKE ALL ON TABLE public.projects FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.project_media FROM PUBLIC, anon, authenticated;

-- public.projects grants:
-- Anonymous visitors can only SELECT (RLS limits to status = 'published')
GRANT SELECT ON TABLE public.projects TO anon;
-- Authenticated users can SELECT, INSERT, UPDATE, DELETE (RLS gates mutations to admins)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.projects TO authenticated;

-- public.project_media grants:
-- Anonymous visitors can only SELECT (RLS limits to media of published projects)
GRANT SELECT ON TABLE public.project_media TO anon;
-- Authenticated users can SELECT, INSERT, UPDATE, DELETE (RLS gates mutations to admins)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_media TO authenticated;
```

---

## 7. Forward-Compatible Specifications & M07 Storage Boundary

### 7.1 Secondary Domain Tables (Deferred to M06)
Secondary content entities (`site_profile`, `experiences`, `education`, `skills`, `certifications`) are deferred to **M06**. When created via additive migrations in M06, they will adhere to this exact security pattern:
- Reside in `public` with `REVOKE ALL FROM PUBLIC`.
- Read access granted to `anon` and `authenticated`.
- Mutations granted to `authenticated` and gated strictly by `private.is_admin()`.

### 7.2 Storage Bucket Media Isolation (Deferred to M07)
In **M07**, Supabase Storage will host project screenshots and architectural diagrams in bucket `project-media`. To ensure draft images do not leak via storage endpoints:
- Storage bucket policies in `storage.objects` must verify via SQL join that any requested media object corresponds to a record in `public.project_media` whose parent `public.projects` has `status = 'published'`.
- Public visitors attempting direct storage GET requests for draft media will be rejected with HTTP 403 / 404.

---

## 8. Migration File Organization Plan

Migrations will reside in `supabase/migrations/` using chronological UTC timestamps:
1. `20261116000001_create_private_schema_and_admin_users.sql`: Schema `private`, table `private.admin_users`, function `private.is_admin()`, ownership, and grants.
2. `20261116000002_create_projects.sql`: Table `public.projects`, constraints, indexes, triggers, grants, and RLS policies.
3. `20261116000003_create_project_media.sql`: Table `public.project_media`, cascade foreign key, index, grants, and RLS policies.
4. `supabase/seed.sql`: Local development and testing fixtures containing published and draft projects. Strictly prohibited from running on production.
