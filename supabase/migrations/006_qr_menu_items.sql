-- 006: QR food-menu items (realtime customer menu + admin CRUD)
-- Separate from public.menu_items (enterprise navigation).
-- restaurant_id maps to public.enterprises.id (OmniTaps tenant/enterprise).

CREATE TABLE IF NOT EXISTS public.qr_menu_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id     UUID NOT NULL REFERENCES public.enterprises(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  description       TEXT,
  price             NUMERIC(10, 2) NOT NULL,
  calories          INTEGER,
  nutritional_info  JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_available      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT qr_menu_items_name_nonempty_chk
    CHECK (char_length(trim(name)) > 0),
  CONSTRAINT qr_menu_items_price_nonneg_chk
    CHECK (price >= 0),
  CONSTRAINT qr_menu_items_calories_nonneg_chk
    CHECK (calories IS NULL OR calories >= 0)
);

CREATE INDEX IF NOT EXISTS qr_menu_items_restaurant_id_idx
  ON public.qr_menu_items (restaurant_id);

CREATE INDEX IF NOT EXISTS qr_menu_items_restaurant_available_idx
  ON public.qr_menu_items (restaurant_id, is_available);

DROP TRIGGER IF EXISTS qr_menu_items_set_updated_at ON public.qr_menu_items;
CREATE TRIGGER qr_menu_items_set_updated_at
  BEFORE UPDATE ON public.qr_menu_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Realtime publication (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'qr_menu_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.qr_menu_items;
  END IF;
END $$;

ALTER TABLE public.qr_menu_items ENABLE ROW LEVEL SECURITY;

-- Public guest menus (QR) — readable without login; includes unavailable for sold-out UI
DROP POLICY IF EXISTS qr_menu_items_public_select ON public.qr_menu_items;
CREATE POLICY qr_menu_items_public_select
  ON public.qr_menu_items
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS qr_menu_items_insert_admin ON public.qr_menu_items;
CREATE POLICY qr_menu_items_insert_admin
  ON public.qr_menu_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    restaurant_id = public.get_user_enterprise_id()
    AND public.get_user_role() IN ('super_admin', 'enterprise_admin')
  );

DROP POLICY IF EXISTS qr_menu_items_update_admin ON public.qr_menu_items;
CREATE POLICY qr_menu_items_update_admin
  ON public.qr_menu_items
  FOR UPDATE
  TO authenticated
  USING (
    restaurant_id = public.get_user_enterprise_id()
    AND public.get_user_role() IN ('super_admin', 'enterprise_admin')
  )
  WITH CHECK (
    restaurant_id = public.get_user_enterprise_id()
    AND public.get_user_role() IN ('super_admin', 'enterprise_admin')
  );

DROP POLICY IF EXISTS qr_menu_items_delete_admin ON public.qr_menu_items;
CREATE POLICY qr_menu_items_delete_admin
  ON public.qr_menu_items
  FOR DELETE
  TO authenticated
  USING (
    restaurant_id = public.get_user_enterprise_id()
    AND public.get_user_role() IN ('super_admin', 'enterprise_admin')
  );

GRANT SELECT ON public.qr_menu_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.qr_menu_items TO authenticated;
GRANT ALL ON public.qr_menu_items TO service_role;

-- Guest QR links use /menu/:slug — anon must resolve active enterprises by slug/id
DROP POLICY IF EXISTS enterprises_anon_select_active ON public.enterprises;
CREATE POLICY enterprises_anon_select_active
  ON public.enterprises
  FOR SELECT
  TO anon
  USING (is_active = true);

GRANT SELECT ON public.enterprises TO anon;
