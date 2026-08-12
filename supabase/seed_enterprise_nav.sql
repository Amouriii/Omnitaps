-- Seed enterprise nav/admin domain after migrations 001–004.
-- Uses the first auth user matching SEED_ADMIN_EMAIL (edit below).

DO $$
DECLARE
  v_admin_email   TEXT := 'onouh7@gmail.com'; -- <-- match your Supabase Auth user
  v_user_id       UUID;
  v_enterprise_id UUID;
  v_cafe_id       UUID;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower(v_admin_email)
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No auth.users row for %. Create the user in Supabase Auth first.', v_admin_email;
  END IF;

  INSERT INTO public.enterprises (name, slug, domain, branding, is_active)
  VALUES (
    'Demo Enterprise',
    'demo-enterprise',
    'demo.omnitaps.local',
    '{"primaryColor":"#0f766e","logoUrl":null}'::jsonb,
    TRUE
  )
  ON CONFLICT (slug) DO UPDATE
    SET name = EXCLUDED.name,
        domain = EXCLUDED.domain,
        branding = EXCLUDED.branding,
        is_active = TRUE,
        updated_at = NOW()
  RETURNING id INTO v_enterprise_id;

  IF v_enterprise_id IS NULL THEN
    SELECT id INTO v_enterprise_id
    FROM public.enterprises
    WHERE slug = 'demo-enterprise';
  END IF;

  INSERT INTO public.profiles (id, enterprise_id, role, first_name, last_name)
  VALUES (v_user_id, v_enterprise_id, 'enterprise_admin', 'Demo', 'Admin')
  ON CONFLICT (id) DO UPDATE
    SET enterprise_id = EXCLUDED.enterprise_id,
        role = EXCLUDED.role,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        updated_at = NOW();

  DELETE FROM public.menu_items WHERE enterprise_id = v_enterprise_id;

  INSERT INTO public.menu_items (
    enterprise_id, parent_id, label, url_path, icon_name, sort_order, is_visible, required_roles
  )
  VALUES
    (
      v_enterprise_id, NULL, 'Dashboard', '/demo/dashboard', 'LayoutDashboard', 0, TRUE,
      ARRAY['super_admin','enterprise_admin','standard_user']::public.user_role[]
    ),
    (
      v_enterprise_id, NULL, 'Menu Editor', '/demo/dashboard', 'Menu', 1, TRUE,
      ARRAY['super_admin','enterprise_admin']::public.user_role[]
    ),
    (
      v_enterprise_id, NULL, 'Modules', '/demo/dashboard', 'Boxes', 2, TRUE,
      ARRAY['super_admin','enterprise_admin','standard_user']::public.user_role[]
    ),
    (
      v_enterprise_id, NULL, 'Website demo', '/s/demo', 'Globe', 3, TRUE,
      ARRAY['super_admin','enterprise_admin','standard_user']::public.user_role[]
    ),
    (
      v_enterprise_id, NULL, 'Wi-Fi Captive', '/enterprise/wifi', 'Wifi', 4, TRUE,
      ARRAY['super_admin','enterprise_admin','standard_user']::public.user_role[]
    ),
    (
      v_enterprise_id, NULL, 'Wi-Fi Settings', '/enterprise/wifi/settings', 'Settings', 5, TRUE,
      ARRAY['super_admin','enterprise_admin']::public.user_role[]
    ),
    (
      v_enterprise_id, NULL, 'Wi-Fi Plans', '/enterprise/wifi/plans', 'CreditCard', 6, TRUE,
      ARRAY['super_admin','enterprise_admin']::public.user_role[]
    );

  INSERT INTO public.enterprise_modules (enterprise_id, module_key, is_enabled, settings)
  VALUES
    (v_enterprise_id, 'nav_console', TRUE, '{"label":"Enterprise Nav Console"}'::jsonb),
    (v_enterprise_id, 'wifi', TRUE, '{"label":"Captive Wi-Fi Portal"}'::jsonb)
  ON CONFLICT (enterprise_id, module_key) DO UPDATE
    SET is_enabled = EXCLUDED.is_enabled,
        settings = EXCLUDED.settings,
        updated_at = NOW();

  -- Captive portal demo secret (override in production)
  UPDATE public.enterprises
  SET
    gateway_hmac_secret = COALESCE(gateway_hmac_secret, 'demo-gateway-hmac-secret-change-me'),
    free_quota_mb = COALESCE(free_quota_mb, 100),
    free_session_minutes = COALESCE(free_session_minutes, 60),
    default_download_kbps = COALESCE(default_download_kbps, 5000),
    default_upload_kbps = COALESCE(default_upload_kbps, 2000),
    updated_at = NOW()
  WHERE id = v_enterprise_id;

  INSERT INTO public.subscription_plans (
    enterprise_id, name, description, price_cents, currency, interval,
    quota_mb, duration_minutes, download_kbps, upload_kbps, sort_order, is_active
  )
  SELECT
    v_enterprise_id,
    p.name,
    p.description,
    p.price_cents,
    'usd',
    p.interval::public.subscription_plan_interval,
    p.quota_mb,
    p.duration_minutes,
    p.download_kbps,
    p.upload_kbps,
    p.sort_order,
    TRUE
  FROM (
    VALUES
      ('Day Pass', 'Full-day high-speed access', 499, 'daily', 2048, 1440, 25000, 10000, 10),
      ('Hour Boost', '1 hour speed boost', 199, 'hourly', 1024, 60, 50000, 20000, 20),
      ('Session Plus', 'Extra quota for this session', 99, 'session', 512, NULL, 15000, 5000, 30)
  ) AS p(name, description, price_cents, interval, quota_mb, duration_minutes, download_kbps, upload_kbps, sort_order)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.subscription_plans sp
    WHERE sp.enterprise_id = v_enterprise_id AND sp.name = p.name
  );

  -- Guest QR café so /menu/demo resolves on Supabase (console stays demo-enterprise)
  INSERT INTO public.enterprises (name, slug, domain, branding, is_active)
  VALUES (
    'Demo Café',
    'demo',
    'cafe.omnitaps.local',
    '{"primaryColor":"#c45c26","logoUrl":null}'::jsonb,
    TRUE
  )
  ON CONFLICT (slug) DO UPDATE
    SET name = EXCLUDED.name,
        domain = EXCLUDED.domain,
        branding = EXCLUDED.branding,
        is_active = TRUE,
        updated_at = NOW()
  RETURNING id INTO v_cafe_id;

  IF v_cafe_id IS NULL THEN
    SELECT id INTO v_cafe_id FROM public.enterprises WHERE slug = 'demo';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'qr_menu_items'
  ) THEN
    DELETE FROM public.qr_menu_items
    WHERE restaurant_id IN (v_enterprise_id, v_cafe_id);

    INSERT INTO public.qr_menu_items (
      restaurant_id, name, description, price, calories, nutritional_info, is_available
    )
    SELECT
      e.rid,
      i.name,
      i.description,
      i.price,
      i.calories,
      i.nutritional_info::jsonb,
      i.is_available
    FROM (VALUES (v_enterprise_id), (v_cafe_id)) AS e(rid)
    CROSS JOIN (
      VALUES
        ('House Latte', 'Double espresso with steamed milk and a thin layer of foam.', 4.50, 180, '{"protein":"9 g","carbs":"14 g","fat":"7 g","allergens":"Dairy","category":"Drinks"}', TRUE),
        ('Flat White', 'Ristretto shots stretched with velvety microfoam.', 4.75, 160, '{"protein":"8 g","carbs":"12 g","fat":"6 g","allergens":"Dairy","category":"Drinks"}', TRUE),
        ('Iced Oat Cortado', 'Equal parts espresso and oat milk over ice.', 5.25, 90, '{"protein":"2 g","carbs":"10 g","fat":"3 g","allergens":"None listed","category":"Drinks"}', TRUE),
        ('Citrus Iced Tea', 'House-brewed black tea with lemon peel and mint.', 3.50, 35, '{"protein":"0 g","carbs":"8 g","fat":"0 g","category":"Drinks"}', TRUE),
        ('House Filter', 'Rotating single origin, batch-brewed.', 3.75, 5, '{"protein":"0 g","carbs":"0 g","fat":"0 g","category":"Drinks"}', TRUE),
        ('Avocado Toast', 'Sourdough, smashed avocado, chili flake, lemon, and olive oil.', 12.00, 420, '{"protein":"10 g","carbs":"38 g","fat":"22 g","allergens":"Gluten","category":"Plates"}', TRUE),
        ('Seasonal Shakshuka', 'Tomato-pepper stew, baked eggs, and grilled focaccia.', 14.50, 510, '{"protein":"22 g","carbs":"36 g","fat":"28 g","allergens":"Egg, Gluten","category":"Plates"}', FALSE),
        ('Citrus Grain Bowl', 'Farro, roasted squash, herbs, and tahini lemon dressing.', 13.50, 480, '{"protein":"14 g","carbs":"58 g","fat":"18 g","allergens":"Gluten","category":"Plates"}', TRUE),
        ('Ham & Gruyère Croissant', 'Buttery croissant, smoked ham, melted Gruyère, Dijon.', 9.50, 390, '{"protein":"18 g","carbs":"28 g","fat":"22 g","allergens":"Gluten, Dairy","category":"Plates"}', TRUE),
        ('Olive Oil Cake', 'Citrus loaf with a crackly sugar top.', 6.50, 320, '{"protein":"5 g","carbs":"38 g","fat":"16 g","allergens":"Gluten, Egg","category":"Sweets"}', TRUE),
        ('Dark Chocolate Cookie', 'Sea salt, 70% chocolate, toasted hazelnut.', 4.25, 280, '{"protein":"4 g","carbs":"32 g","fat":"14 g","allergens":"Gluten, Tree nuts, Egg","category":"Sweets"}', TRUE),
        ('Affogato', 'Vanilla gelato drowned in a hot espresso shot.', 6.00, 210, '{"protein":"4 g","carbs":"22 g","fat":"10 g","allergens":"Dairy","category":"Sweets"}', TRUE)
    ) AS i(name, description, price, calories, nutritional_info, is_available)
    WHERE e.rid IS NOT NULL;
  END IF;

  RAISE NOTICE 'Seeded enterprise % and café % for user % (%)', v_enterprise_id, v_cafe_id, v_admin_email, v_user_id;
END $$;
