# M02 Database Schema Specification

> **Milestone:** M02 — Database Integration & RLS Foundation  
> **Status:** PROPOSED ARCHITECTURE (Awaiting ChatGPT Audit & Owner Approval)  
> **Target Database:** PostgreSQL 15+ (Managed Supabase Free Tier)  
> **Date:** 2026-11-16  

---

## 1. Architectural Overview & Scoping Boundaries

This document defines the relational database schema, integrity constraints, triggers, indexes, and database-level functions for the Portfolio project.

### 1.1 Milestone Scoping Boundary: M02 vs M06
To prevent premature schema bloat and keep testing focused and robust:
- **Included in M02 (Core Foundation & Vertical Slice Prerequisites):**
  1. `admin_users`: Mandatory whitelist table for database-enforced authorization and `is_admin()` security checks.
  2. `projects`: Core entity required for M04 Projects CRUD vertical slice (draft/publish states, slugs, ordering, arrays).
  3. `project_media`: Relational media metadata table tied directly to projects (foreign key CASCADE, media ordering).
  4. Core functions and triggers: `is_admin()`, `update_updated_at_column()`, and publication timestamp triggers.
- **Explicitly Deferred to M06 (Remaining Content CRUD):**
  - `site_profile`, `experiences`, `education`, `skills`, and `certifications`.
  - These secondary tables are defined as forward-compatible designs in Section 6 below, but will be introduced via additive migrations in **M06** to keep M02 and M04 implementations strictly minimal and testable.

---

## 2. Helper Functions & Triggers

### 2.1 Function: `public.update_updated_at_column()`
Automatically synchronizes the `updated_at` column whenever a record is modified.

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

-- Revoke default public execution; allow internal trigger invocation
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO authenticated;
```

### 2.2 Function: `public.is_admin()`
Evaluates whether the executing authenticated context belongs to an approved administrator by querying the `public.admin_users` whitelist.

```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE id = (SELECT auth.uid())
  );
$$;

-- Restrict execution: anonymous visitors cannot run this function; authenticated users can
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
```

### 2.3 Function: `public.sync_project_published_at()`
Maintains publication timestamp integrity when project status transitions between `draft` and `published`.

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

REVOKE EXECUTE ON FUNCTION public.sync_project_published_at() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_project_published_at() TO authenticated;
```

---

## 3. Table Definitions (M02 Baseline)

### 3.1 Table: `public.admin_users`
Authorization table maintaining the list of `auth.users` UUIDs authorized to administer the portfolio.
- **Population:** Provisioned exclusively out-of-band by the database owner.
- **Self-Service:** Disallowed; zero public signups or auto-escalation.

```sql
CREATE TABLE public.admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  CONSTRAINT chk_admin_users_email_valid CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

COMMENT ON TABLE public.admin_users IS 'Whitelist table storing administrative identities authorized to bypass public read restrictions.';
```

### 3.2 Table: `public.projects`
Core showcase entity for software projects, research systems, and tools.

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

  -- Constraints
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

-- Triggers on public.projects
CREATE TRIGGER trg_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_projects_published_at
BEFORE INSERT OR UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.sync_project_published_at();

COMMENT ON TABLE public.projects IS 'Showcase projects with draft/publish status and slug isolation.';
```

### 3.3 Table: `public.project_media`
Media assets (screenshots, architectural diagrams, demo captures) associated with projects.

```sql
CREATE TABLE public.project_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  alt_text TEXT NOT NULL,
  caption TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),

  -- Constraints
  CONSTRAINT chk_project_media_path CHECK (char_length(trim(storage_path)) >= 3 AND char_length(storage_path) <= 500),
  CONSTRAINT chk_project_media_alt_text CHECK (char_length(trim(alt_text)) >= 3 AND char_length(alt_text) <= 300),
  CONSTRAINT chk_project_media_sort_order CHECK (sort_order >= 0)
);

COMMENT ON TABLE public.project_media IS 'Ordered screenshots and media assets belonging to projects.';
```

---

## 4. Indexing Strategy

Indexes are created to optimize high-frequency public reads and enforce relational integrity:

```sql
-- 1. Slug Lookup Index (Enforces instant O(1) project detail fetches)
-- Already guaranteed by UNIQUE constraint uq_projects_slug, creating index uq_projects_slug automatically.

-- 2. Partial Index for Public Published Projects (Used by / and /projects queries)
CREATE INDEX idx_projects_public_published 
ON public.projects (sort_order ASC, created_at DESC) 
WHERE status = 'published';

-- 3. Partial Index for Featured Public Projects (Used by Homepage Hero / Featured section)
CREATE INDEX idx_projects_public_featured 
ON public.projects (sort_order ASC, created_at DESC) 
WHERE status = 'published' AND featured = true;

-- 4. Status Filter Index (Used by Admin dashboard views)
CREATE INDEX idx_projects_status 
ON public.projects (status);

-- 5. Project Media Foreign Key & Ordering Index
CREATE INDEX idx_project_media_project_order 
ON public.project_media (project_id, sort_order ASC);
```

---

## 5. Privilege Management (SQL Grants)

PostgreSQL permissions are explicitly revoked from `PUBLIC` and restricted per role:

```sql
-- Revoke all default table privileges
REVOKE ALL ON TABLE public.admin_users FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.projects FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.project_media FROM PUBLIC, anon, authenticated;

-- admin_users grants:
-- anon has zero access. Authenticated users may SELECT only through RLS.
GRANT SELECT ON TABLE public.admin_users TO authenticated;

-- projects grants:
-- anon may read (RLS limits to published)
GRANT SELECT ON TABLE public.projects TO anon;
-- authenticated may read, insert, update, delete (RLS gates mutations to admins)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.projects TO authenticated;

-- project_media grants:
-- anon may read (RLS limits to media of published projects)
GRANT SELECT ON TABLE public.project_media TO anon;
-- authenticated may mutate (RLS gates to admins)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_media TO authenticated;
```

---

## 6. Forward-Compatible Specifications for M06 Tables

The following entities are designed now for relational harmony, but will be created in **M06** via additive migrations:

### 6.1 `public.site_profile` (Deferred to M06)
```sql
-- Single-row editable biographical metadata
CREATE TABLE public.site_profile (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Singleton constraint
  full_name TEXT NOT NULL,
  headline TEXT NOT NULL,
  bio_short TEXT NOT NULL,
  bio_full TEXT,
  location TEXT NOT NULL,
  available_for_hire BOOLEAN NOT NULL DEFAULT false,
  github_url TEXT,
  linkedin_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp()
);
```

### 6.2 `public.experiences` (Deferred to M06)
```sql
CREATE TABLE public.experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  is_current BOOLEAN NOT NULL DEFAULT false,
  description TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp()
);
```

### 6.3 `public.education` (Deferred to M06)
```sql
CREATE TABLE public.education (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution TEXT NOT NULL,
  degree TEXT NOT NULL,
  field_of_study TEXT NOT NULL,
  start_year INT NOT NULL,
  end_year INT,
  grade TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp()
);
```

### 6.4 `public.skills` (Deferred to M06)
```sql
CREATE TABLE public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('Languages', 'Frameworks & Libraries', 'Databases & Tools', 'Architectures & Paradigms')),
  proficiency TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp()
);
```

### 6.5 `public.certifications` (Deferred to M06)
```sql
CREATE TABLE public.certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  issuer TEXT NOT NULL,
  issue_date DATE NOT NULL,
  credential_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp()
);
```

---

## 7. Migration File Organization Plan

The migrations will be stored in `supabase/migrations/` using timestamp prefixes:
- `20261116000001_create_admin_users.sql`: `admin_users` table, `is_admin()` function, SQL grants, and RLS policies.
- `20261116000002_create_projects.sql`: `projects` table, constraints, timestamps, updated_at trigger, indexes, SQL grants, and RLS policies.
- `20261116000003_create_project_media.sql`: `project_media` table, cascade foreign key, indexes, SQL grants, and RLS policies.
- `supabase/seed.sql`: Realistic test fixtures containing published projects, draft projects, and media attachments for automated verification.
