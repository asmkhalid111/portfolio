# M02 Database Schema Specification (v0.2)

> **Milestone:** M02 — Database Integration & RLS Foundation
> **Document Version:** v0.2 (Post-ChatGPT Gate A Audit Corrections)
> **Status:** REVISED ARCHITECTURE (Awaiting ChatGPT Audit & Owner Approval)
> **Target Database:** PostgreSQL 15+ (Managed Supabase Free Tier)
> **Date:** 2026-11-16

---

## 1. Architectural Overview & Scoping Boundaries

This document specifies the PostgreSQL relational schema, integrity constraints, security-definer authorization functions, triggers, indexes, and privilege grants for the Portfolio project.

### 1.1 Key Revisions in v0.2
- **Hardened Private Schema Authorization**: Replaced `public.is_admin()` and `public.admin_users` with `private.is_admin()` and `private.admin_users`. The `private` schema is unexposed to Supabase's PostgREST / Data API, preventing direct API discovery, query, or enumeration.
- **Modern Supabase Key Architecture**: Standardized on modern Supabase API key conventions (`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` with format `sb_pub_...`), deprecating legacy JWT `anon`/`service_role` defaults. Privileged tooling uses `SUPABASE_SECRET_KEY` (`sb_sec_...`) strictly in isolated local/test environments.
- **Strict Scoping Boundary**: M02 implements exclusively the core tables (`private.admin_users`, `public.projects`, `public.project_media`). Secondary content tables (`site_profile`, `experiences`, `education`, `skills`, `certifications`) are deferred to **M06**. Supabase Storage buckets and file uploads are deferred to **M07**.

---

## 2. Schemas & Authorization Infrastructure

### 2.1 Private Schema Declaration
Supabase's Data API (PostgREST) exposes the `public` schema by default. To create an impenetrable boundary for administrative credentials, we introduce an internal `private` schema:

```sql
-- Create isolated private schema
CREATE SCHEMA IF NOT EXISTS private;

-- Revoke all default public permissions
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

-- Grant USAGE to authenticated and anon so they can invoke private.is_admin() in RLS expressions
GRANT USAGE ON SCHEMA private TO authenticated, anon;
```

### 2.2 Table: `private.admin_users`
Maintains the whitelist of `auth.users` UUIDs authorized to administer the portfolio.
- **Storage Location**: `private` schema (completely hidden from PostgREST).
- **Public & API Privileges**: Zero SQL privileges granted to `anon` or `authenticated`. Direct REST or GraphQL access is impossible.
- **Population**: Admin accounts are provisioned exclusively out-of-band by the database owner via the Supabase Dashboard SQL Editor.

```sql
CREATE TABLE private.admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  CONSTRAINT chk_admin_users_email_valid CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Completely revoke all privileges from API roles
REVOKE ALL ON TABLE private.admin_users FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE private.admin_users IS 'Internal administrative whitelist table residing in unexposed private schema.';
```

### 2.3 Function: `private.is_admin()`
Evaluates whether the executing authenticated context belongs to an authorized administrator.

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

-- Ensure function ownership is assigned to postgres
ALTER FUNCTION private.is_admin() OWNER TO postgres;

-- Revoke execution from PUBLIC; grant explicitly to API roles
REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated, anon;

COMMENT ON FUNCTION private.is_admin() IS 'Hardened security-definer check verifying whether auth.uid() exists in private.admin_users.';
```

#### Security Proof & Recursion Prevention:
1. **Search Path Hijacking Defense**: `SET search_path = ''` forces full schema qualification (`private.admin_users`, `auth.uid()`), neutralizing malicious search-path override attacks.
2. **Zero RLS Recursion**: `private.is_admin()` queries `private.admin_users`. `private.admin_users` has zero RLS policies calling `is_admin()`. It is protected by PostgreSQL schema and table privilege grants (`REVOKE ALL`). When invoked by RLS policies on `public.projects`, execution evaluates with an $O(1)$ primary-key index lookup and terminates immediately without recursion.
3. **Immutable Identity**: Uses `auth.uid()`, which is cryptographically derived from the verified JWT `sub` claim. User-editable metadata (`raw_user_meta_data`) is completely ignored.
4. **Anonymous Safety**: When invoked by unauthenticated callers, `auth.uid()` evaluates to `NULL`, returning `false` safely.

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

COMMENT ON TABLE public.projects IS 'Showcase projects with draft/publish status and slug uniqueness.';
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

## 4. Helper Functions & Automation Triggers

### 4.1 Trigger Function: `public.update_updated_at_column()`
```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = pg_catalog.clock_timestamp();
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO authenticated, anon;

CREATE TRIGGER trg_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
```

### 4.2 Trigger Function: `public.sync_project_published_at()`
Ensures that publication timestamp semantics are strictly maintained by the database kernel:
- When status changes to `published`, `published_at` is set to `clock_timestamp()` if not previously populated.
- When status reverts to `draft`, `published_at` is cleared to `NULL`.

```sql
CREATE OR REPLACE FUNCTION public.sync_project_published_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'published' AND OLD.published_at IS NULL THEN
    NEW.published_at = pg_catalog.clock_timestamp();
  ELSIF NEW.status = 'draft' THEN
    NEW.published_at = NULL;
  END IF;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.sync_project_published_at() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.sync_project_published_at() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_project_published_at() TO authenticated;

CREATE TRIGGER trg_projects_published_at
BEFORE INSERT OR UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.sync_project_published_at();
```

---

## 5. Indexing Strategy

Indexes are created strictly to accelerate high-frequency queries without unnecessary write-overhead:

```sql
-- 1. Slug Lookup Index (Instant O(1) project detail fetches)
-- Generated automatically by the UNIQUE constraint: uq_projects_slug

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

## 7. Forward-Compatible Specifications for M06 Tables

The secondary tables (`site_profile`, `experiences`, `education`, `skills`, `certifications`) are fully documented in the v0.1 specification and will be created via additive migrations in **M06**. They will follow the exact same security conventions established here:
- Reside in `public` with `REVOKE ALL FROM PUBLIC`.
- Read access granted to `anon` and `authenticated`.
- Mutation access granted to `authenticated` and gated strictly by `private.is_admin()`.

---

## 8. Migration File Organization Plan

Migrations will reside in `supabase/migrations/` using chronological UTC timestamps:
1. `20261116000001_create_private_schema_and_admin_users.sql`: Schema `private`, table `private.admin_users`, function `private.is_admin()`, ownership, and grants.
2. `20261116000002_create_projects.sql`: Table `public.projects`, constraints, indexes, triggers, grants, and RLS policies.
3. `20261116000003_create_project_media.sql`: Table `public.project_media`, cascade foreign key, index, grants, and RLS policies.
4. `supabase/seed.sql`: Local/testing development fixtures containing published and draft projects. Strictly prohibited from running on production.
