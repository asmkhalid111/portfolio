-- Migration: 20261116000002_create_projects.sql
-- Description: Create public.projects table, helper functions, triggers, indexes, grants, and RLS policies.

-- 1. Trigger Function: Automatically synchronize updated_at
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

-- 2. Trigger Function: Publication timestamp state machine
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

-- 3. Create Table: public.projects
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

-- 4. Triggers
CREATE TRIGGER trg_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_projects_published_at
BEFORE INSERT OR UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.sync_project_published_at();

-- 5. Indexes
-- Note: uq_projects_slug automatically creates a unique B-tree index for slug lookups.
CREATE INDEX idx_projects_public_published
ON public.projects (sort_order ASC, created_at DESC)
WHERE status = 'published';

CREATE INDEX idx_projects_public_featured
ON public.projects (sort_order ASC, created_at DESC)
WHERE status = 'published' AND featured = true;

CREATE INDEX idx_projects_status
ON public.projects (status);

-- 6. Table Grants & Privilege Management
REVOKE ALL ON TABLE public.projects FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.projects TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.projects TO authenticated;

-- 7. Row Level Security Policies
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects FORCE ROW LEVEL SECURITY;

-- Public Read: Anonymous visitors and authenticated users can view published projects
CREATE POLICY projects_public_select
ON public.projects
FOR SELECT
TO anon, authenticated
USING (
  status = 'published'
);

-- Admin Read: Confirmed administrators can view all projects (drafts and published)
CREATE POLICY projects_admin_select
ON public.projects
FOR SELECT
TO authenticated
USING (
  private.is_admin()
);

-- Admin Insert: Only confirmed administrators can insert projects
CREATE POLICY projects_admin_insert
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (
  private.is_admin()
);

-- Admin Update: Only confirmed administrators can update projects
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

-- Admin Delete: Only confirmed administrators can delete projects
CREATE POLICY projects_admin_delete
ON public.projects
FOR DELETE
TO authenticated
USING (
  private.is_admin()
);
