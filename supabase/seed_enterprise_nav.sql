-- Seed enterprise nav/admin domain after migrations 001–004.
-- Uses the first auth user matching SEED_ADMIN_EMAIL (edit below).

DO $$
DECLARE
  v_admin_email   TEXT := 'onouh7@gmail.com'; -- <-- match your Supabase Auth user
  v_user_id       UUID;
  v_enterprise_id UUID;
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

  RAISE NOTICE 'Seeded enterprise % for user % (%)', v_enterprise_id, v_admin_email, v_user_id;
END $$;
