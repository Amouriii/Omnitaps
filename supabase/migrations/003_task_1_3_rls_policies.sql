-- TASK-1.3: Row Level Security Policies

ALTER TABLE public.enterprises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_modules ENABLE ROW LEVEL SECURITY;

-- enterprises
DROP POLICY IF EXISTS enterprises_select_same_enterprise ON public.enterprises;
CREATE POLICY enterprises_select_same_enterprise
  ON public.enterprises
  FOR SELECT
  TO authenticated
  USING (id = public.get_user_enterprise_id());

-- profiles
DROP POLICY IF EXISTS profiles_select_same_enterprise ON public.profiles;
CREATE POLICY profiles_select_same_enterprise
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (enterprise_id = public.get_user_enterprise_id());

-- menu_items SELECT
DROP POLICY IF EXISTS menu_items_select_same_enterprise ON public.menu_items;
CREATE POLICY menu_items_select_same_enterprise
  ON public.menu_items
  FOR SELECT
  TO authenticated
  USING (enterprise_id = public.get_user_enterprise_id());

-- menu_items INSERT / UPDATE / DELETE (admins only)
DROP POLICY IF EXISTS menu_items_insert_admin ON public.menu_items;
CREATE POLICY menu_items_insert_admin
  ON public.menu_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    enterprise_id = public.get_user_enterprise_id()
    AND public.get_user_role() IN ('super_admin', 'enterprise_admin')
  );

DROP POLICY IF EXISTS menu_items_update_admin ON public.menu_items;
CREATE POLICY menu_items_update_admin
  ON public.menu_items
  FOR UPDATE
  TO authenticated
  USING (
    enterprise_id = public.get_user_enterprise_id()
    AND public.get_user_role() IN ('super_admin', 'enterprise_admin')
  )
  WITH CHECK (
    enterprise_id = public.get_user_enterprise_id()
    AND public.get_user_role() IN ('super_admin', 'enterprise_admin')
  );

DROP POLICY IF EXISTS menu_items_delete_admin ON public.menu_items;
CREATE POLICY menu_items_delete_admin
  ON public.menu_items
  FOR DELETE
  TO authenticated
  USING (
    enterprise_id = public.get_user_enterprise_id()
    AND public.get_user_role() IN ('super_admin', 'enterprise_admin')
  );

-- enterprise_modules SELECT
DROP POLICY IF EXISTS enterprise_modules_select_same_enterprise ON public.enterprise_modules;
CREATE POLICY enterprise_modules_select_same_enterprise
  ON public.enterprise_modules
  FOR SELECT
  TO authenticated
  USING (enterprise_id = public.get_user_enterprise_id());

-- enterprise_modules INSERT / UPDATE / DELETE (admins only)
DROP POLICY IF EXISTS enterprise_modules_insert_admin ON public.enterprise_modules;
CREATE POLICY enterprise_modules_insert_admin
  ON public.enterprise_modules
  FOR INSERT
  TO authenticated
  WITH CHECK (
    enterprise_id = public.get_user_enterprise_id()
    AND public.get_user_role() IN ('super_admin', 'enterprise_admin')
  );

DROP POLICY IF EXISTS enterprise_modules_update_admin ON public.enterprise_modules;
CREATE POLICY enterprise_modules_update_admin
  ON public.enterprise_modules
  FOR UPDATE
  TO authenticated
  USING (
    enterprise_id = public.get_user_enterprise_id()
    AND public.get_user_role() IN ('super_admin', 'enterprise_admin')
  )
  WITH CHECK (
    enterprise_id = public.get_user_enterprise_id()
    AND public.get_user_role() IN ('super_admin', 'enterprise_admin')
  );

DROP POLICY IF EXISTS enterprise_modules_delete_admin ON public.enterprise_modules;
CREATE POLICY enterprise_modules_delete_admin
  ON public.enterprise_modules
  FOR DELETE
  TO authenticated
  USING (
    enterprise_id = public.get_user_enterprise_id()
    AND public.get_user_role() IN ('super_admin', 'enterprise_admin')
  );

GRANT SELECT ON public.enterprises TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enterprise_modules TO authenticated;

GRANT ALL ON public.enterprises TO service_role;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.menu_items TO service_role;
GRANT ALL ON public.enterprise_modules TO service_role;
