-- 005: Enterprise captive-portal schema (merged with nav enterprises UUID model)
-- Do NOT apply raw db/schema/wifi.ts wifiSchemaSql — it conflicts with 001 enterprises.
-- Captive tables coexist with Prisma "WifiNetwork" / "WifiSession" (different names).

-- Captive policy columns on existing enterprises
ALTER TABLE public.enterprises
  ADD COLUMN IF NOT EXISTS free_quota_mb INTEGER NOT NULL DEFAULT 100
    CHECK (free_quota_mb >= 0),
  ADD COLUMN IF NOT EXISTS free_session_minutes INTEGER NOT NULL DEFAULT 60
    CHECK (free_session_minutes > 0),
  ADD COLUMN IF NOT EXISTS default_download_kbps INTEGER NOT NULL DEFAULT 5000
    CHECK (default_download_kbps >= 0),
  ADD COLUMN IF NOT EXISTS default_upload_kbps INTEGER NOT NULL DEFAULT 2000
    CHECK (default_upload_kbps >= 0),
  ADD COLUMN IF NOT EXISTS gateway_hmac_secret TEXT,
  ADD COLUMN IF NOT EXISTS radius_coa_host TEXT,
  ADD COLUMN IF NOT EXISTS radius_coa_port INTEGER NOT NULL DEFAULT 3799
    CHECK (radius_coa_port BETWEEN 1 AND 65535),
  ADD COLUMN IF NOT EXISTS radius_secret TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Enums for captive domain
DO $$ BEGIN
  CREATE TYPE public.wifi_device_status AS ENUM ('active', 'blocked', 'pending');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.wifi_session_status AS ENUM (
    'active', 'expired', 'disconnected', 'quota_exceeded', 'upgraded'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.subscription_plan_interval AS ENUM (
    'session', 'hourly', 'daily', 'monthly'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.wifi_devices (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enterprise_id       UUID NOT NULL REFERENCES public.enterprises(id) ON DELETE CASCADE,
  mac_address         TEXT NOT NULL,
  device_fingerprint  TEXT,
  display_name        TEXT,
  status              public.wifi_device_status NOT NULL DEFAULT 'active',
  first_seen_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT wifi_devices_mac_format_chk
    CHECK (mac_address ~ '^[0-9a-f]{2}(:[0-9a-f]{2}){5}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS wifi_devices_enterprise_mac_uidx
  ON public.wifi_devices (enterprise_id, mac_address);
CREATE INDEX IF NOT EXISTS wifi_devices_mac_address_idx
  ON public.wifi_devices (mac_address);
CREATE INDEX IF NOT EXISTS wifi_devices_enterprise_status_idx
  ON public.wifi_devices (enterprise_id, status);

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enterprise_id     UUID NOT NULL REFERENCES public.enterprises(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  description       TEXT,
  stripe_price_id   TEXT,
  price_cents       INTEGER NOT NULL CHECK (price_cents >= 0),
  currency          TEXT NOT NULL DEFAULT 'usd',
  interval          public.subscription_plan_interval NOT NULL DEFAULT 'session',
  quota_mb          INTEGER CHECK (quota_mb IS NULL OR quota_mb >= 0),
  duration_minutes  INTEGER CHECK (duration_minutes IS NULL OR duration_minutes > 0),
  download_kbps     INTEGER NOT NULL DEFAULT 0 CHECK (download_kbps >= 0),
  upload_kbps       INTEGER NOT NULL DEFAULT 0 CHECK (upload_kbps >= 0),
  sort_order        INTEGER NOT NULL DEFAULT 0,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS subscription_plans_enterprise_active_sort_idx
  ON public.subscription_plans (enterprise_id, is_active, sort_order);
CREATE UNIQUE INDEX IF NOT EXISTS subscription_plans_enterprise_stripe_price_uidx
  ON public.subscription_plans (enterprise_id, stripe_price_id)
  WHERE stripe_price_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.wifi_sessions (
  id                         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enterprise_id              UUID NOT NULL REFERENCES public.enterprises(id) ON DELETE CASCADE,
  device_id                  UUID NOT NULL REFERENCES public.wifi_devices(id) ON DELETE CASCADE,
  plan_id                    UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  status                     public.wifi_session_status NOT NULL DEFAULT 'active',
  acct_session_id            TEXT,
  ap_id                      TEXT,
  started_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at                    TIMESTAMPTZ,
  disconnected_at            TIMESTAMPTZ,
  input_octets               BIGINT NOT NULL DEFAULT 0 CHECK (input_octets >= 0),
  output_octets              BIGINT NOT NULL DEFAULT 0 CHECK (output_octets >= 0),
  quota_bytes                BIGINT NOT NULL CHECK (quota_bytes >= 0),
  download_kbps              INTEGER NOT NULL DEFAULT 0 CHECK (download_kbps >= 0),
  upload_kbps                INTEGER NOT NULL DEFAULT 0 CHECK (upload_kbps >= 0),
  stripe_checkout_session_id TEXT,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS wifi_sessions_device_status_started_idx
  ON public.wifi_sessions (device_id, status, started_at DESC);
CREATE INDEX IF NOT EXISTS wifi_sessions_enterprise_status_started_idx
  ON public.wifi_sessions (enterprise_id, status, started_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS wifi_sessions_enterprise_acct_session_uidx
  ON public.wifi_sessions (enterprise_id, acct_session_id)
  WHERE acct_session_id IS NOT NULL;

DROP TRIGGER IF EXISTS wifi_devices_set_updated_at ON public.wifi_devices;
CREATE TRIGGER wifi_devices_set_updated_at
  BEFORE UPDATE ON public.wifi_devices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS wifi_sessions_set_updated_at ON public.wifi_sessions;
CREATE TRIGGER wifi_sessions_set_updated_at
  BEFORE UPDATE ON public.wifi_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS subscription_plans_set_updated_at ON public.subscription_plans;
CREATE TRIGGER subscription_plans_set_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS: authenticated members via profiles; service_role bypasses for captive APIs
ALTER TABLE public.wifi_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wifi_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wifi_devices_select_member ON public.wifi_devices;
CREATE POLICY wifi_devices_select_member ON public.wifi_devices
  FOR SELECT TO authenticated
  USING (enterprise_id = public.get_user_enterprise_id());

DROP POLICY IF EXISTS wifi_devices_write_admin ON public.wifi_devices;
CREATE POLICY wifi_devices_write_admin ON public.wifi_devices
  FOR ALL TO authenticated
  USING (
    enterprise_id = public.get_user_enterprise_id()
    AND public.get_user_role() IN ('super_admin', 'enterprise_admin')
  )
  WITH CHECK (
    enterprise_id = public.get_user_enterprise_id()
    AND public.get_user_role() IN ('super_admin', 'enterprise_admin')
  );

DROP POLICY IF EXISTS wifi_sessions_select_member ON public.wifi_sessions;
CREATE POLICY wifi_sessions_select_member ON public.wifi_sessions
  FOR SELECT TO authenticated
  USING (enterprise_id = public.get_user_enterprise_id());

DROP POLICY IF EXISTS wifi_sessions_write_admin ON public.wifi_sessions;
CREATE POLICY wifi_sessions_write_admin ON public.wifi_sessions
  FOR ALL TO authenticated
  USING (
    enterprise_id = public.get_user_enterprise_id()
    AND public.get_user_role() IN ('super_admin', 'enterprise_admin')
  )
  WITH CHECK (
    enterprise_id = public.get_user_enterprise_id()
    AND public.get_user_role() IN ('super_admin', 'enterprise_admin')
  );

DROP POLICY IF EXISTS subscription_plans_select_member ON public.subscription_plans;
CREATE POLICY subscription_plans_select_member ON public.subscription_plans
  FOR SELECT TO authenticated
  USING (enterprise_id = public.get_user_enterprise_id());

DROP POLICY IF EXISTS subscription_plans_write_admin ON public.subscription_plans;
CREATE POLICY subscription_plans_write_admin ON public.subscription_plans
  FOR ALL TO authenticated
  USING (
    enterprise_id = public.get_user_enterprise_id()
    AND public.get_user_role() IN ('super_admin', 'enterprise_admin')
  )
  WITH CHECK (
    enterprise_id = public.get_user_enterprise_id()
    AND public.get_user_role() IN ('super_admin', 'enterprise_admin')
  );

-- Allow authenticated enterprise admins to update captive columns on enterprises
DROP POLICY IF EXISTS enterprises_update_admin ON public.enterprises;
CREATE POLICY enterprises_update_admin ON public.enterprises
  FOR UPDATE TO authenticated
  USING (
    id = public.get_user_enterprise_id()
    AND public.get_user_role() IN ('super_admin', 'enterprise_admin')
  )
  WITH CHECK (
    id = public.get_user_enterprise_id()
    AND public.get_user_role() IN ('super_admin', 'enterprise_admin')
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wifi_devices TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wifi_sessions TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_plans TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
