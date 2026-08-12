-- TASK-1.4: Indexes & Realtime Publication

CREATE INDEX IF NOT EXISTS profiles_enterprise_id_idx
  ON public.profiles (enterprise_id);

CREATE INDEX IF NOT EXISTS menu_items_enterprise_id_sort_order_idx
  ON public.menu_items (enterprise_id, sort_order);

CREATE INDEX IF NOT EXISTS enterprise_modules_enterprise_id_idx
  ON public.enterprise_modules (enterprise_id);

CREATE INDEX IF NOT EXISTS menu_items_parent_id_idx
  ON public.menu_items (parent_id);

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
      AND tablename = 'menu_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_items;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'enterprise_modules'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.enterprise_modules;
  END IF;
END $$;
