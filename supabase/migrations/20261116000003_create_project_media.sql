-- Migration: 20261116000003_create_project_media.sql
-- Description: Create public.project_media table, foreign key cascade, index, grants, and RLS policies.

-- 1. Create Table: public.project_media
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

-- 2. Foreign Key & Media Ordering Index
CREATE INDEX idx_project_media_project_order
ON public.project_media (project_id, sort_order ASC);

-- 3. Table Grants & Privilege Management
REVOKE ALL ON TABLE public.project_media FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.project_media TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_media TO authenticated;

-- 4. Row Level Security Policies
ALTER TABLE public.project_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_media FORCE ROW LEVEL SECURITY;

-- Public Media Read: Only media attached to published projects is publicly visible
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

-- Admin Media Read: Confirmed administrators can view all project media
CREATE POLICY project_media_admin_select
ON public.project_media
FOR SELECT
TO authenticated
USING (
  private.is_admin()
);

-- Admin Media Insert: Only confirmed administrators can insert project media
CREATE POLICY project_media_admin_insert
ON public.project_media
FOR INSERT
TO authenticated
WITH CHECK (
  private.is_admin()
);

-- Admin Media Update: Only confirmed administrators can update project media
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

-- Admin Media Delete: Only confirmed administrators can delete project media
CREATE POLICY project_media_admin_delete
ON public.project_media
FOR DELETE
TO authenticated
USING (
  private.is_admin()
);
