-- Migration: 20261118000001_create_public_is_admin_rpc.sql
-- Description: Create public-facing parameterless is_admin() RPC wrapper in schema public.
-- Security Model: SECURITY INVOKER; derives identity strictly from JWT context (auth.uid()).
-- Execution revoked from PUBLIC and anon; granted strictly to authenticated.

-- 1. Create public-facing authorization function wrapper
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.is_admin();
$$;

-- 2. Revoke all privileges from public and anon
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;

-- 3. Grant execution strictly to authenticated callers
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- 4. Document function behavior and security contract
COMMENT ON FUNCTION public.is_admin() IS
'Returns administrator authorization for the current authenticated identity without exposing the private whitelist.';
