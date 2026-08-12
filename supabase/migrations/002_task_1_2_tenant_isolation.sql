-- TASK-1.2: Tenant Isolation Helper Function

CREATE OR REPLACE FUNCTION public.get_user_enterprise_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.enterprise_id
  FROM public.profiles AS p
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_user_enterprise_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_enterprise_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_enterprise_id() TO service_role;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.role
  FROM public.profiles AS p
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO service_role;
