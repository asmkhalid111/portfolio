-- Migration: 20261116000001_create_private_schema_and_admin_users.sql
-- Description: Create internal unexposed private schema, administrator whitelist table, and security-definer authorization function.
-- Security Model: Zero direct-access policies on private.admin_users for API roles. anon is denied schema usage and function execution.

-- 1. Create internal private schema
CREATE SCHEMA IF NOT EXISTS private;

-- 2. Revoke default schema privileges
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

-- 3. Grant schema USAGE strictly to authenticated (required when authenticated users evaluate is_admin() in RLS)
-- anon is explicitly DENIED schema usage; anonymous requests evaluate status = 'published' directly.
GRANT USAGE ON SCHEMA private TO authenticated;

-- 4. Create administrator whitelist table
CREATE TABLE private.admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  CONSTRAINT chk_admin_users_email_valid CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- 5. Revoke all table access from API roles
REVOKE ALL ON TABLE private.admin_users FROM PUBLIC, anon, authenticated;

-- 6. Enforce Row Level Security with ZERO direct-access policies for ordinary API roles
ALTER TABLE private.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.admin_users FORCE ROW LEVEL SECURITY;

COMMENT ON TABLE private.admin_users IS 'Internal administrative whitelist table residing in unexposed private schema. Zero API access.';

-- 7. Create hardened security-definer authorization function
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

-- 8. Assign explicit ownership to postgres
ALTER FUNCTION private.is_admin() OWNER TO postgres;

-- 9. Revoke execution from PUBLIC and anon; grant strictly to authenticated
REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated;

COMMENT ON FUNCTION private.is_admin() IS 'Hardened security-definer check verifying whether auth.uid() exists in private.admin_users.';
