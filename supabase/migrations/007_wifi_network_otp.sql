-- 007: Guest identity + OTP challenges for captive Wi-Fi
-- Does not alter wifi_session_status. Service role bypasses RLS for Path A captive APIs.

ALTER TABLE public.wifi_devices
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS identity_verified_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.wifi_otp_challenges (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enterprise_id    UUID NOT NULL REFERENCES public.enterprises(id) ON DELETE CASCADE,
  device_id        UUID NOT NULL REFERENCES public.wifi_devices(id) ON DELETE CASCADE,
  identity_kind    TEXT NOT NULL CHECK (identity_kind IN ('email', 'phone')),
  identity_value   TEXT NOT NULL,
  code_hash        TEXT NOT NULL,
  expires_at       TIMESTAMPTZ NOT NULL,
  attempt_count    INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  consumed_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS wifi_otp_challenges_device_open_idx
  ON public.wifi_otp_challenges (device_id, created_at DESC)
  WHERE consumed_at IS NULL;

CREATE INDEX IF NOT EXISTS wifi_otp_challenges_expires_at_idx
  ON public.wifi_otp_challenges (expires_at);

ALTER TABLE public.wifi_otp_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wifi_otp_challenges_select_member ON public.wifi_otp_challenges;
CREATE POLICY wifi_otp_challenges_select_member ON public.wifi_otp_challenges
  FOR SELECT TO authenticated
  USING (enterprise_id = public.get_user_enterprise_id());

DROP POLICY IF EXISTS wifi_otp_challenges_write_admin ON public.wifi_otp_challenges;
CREATE POLICY wifi_otp_challenges_write_admin ON public.wifi_otp_challenges
  FOR ALL TO authenticated
  USING (
    enterprise_id = public.get_user_enterprise_id()
    AND public.get_user_role() IN ('super_admin', 'enterprise_admin')
  )
  WITH CHECK (
    enterprise_id = public.get_user_enterprise_id()
    AND public.get_user_role() IN ('super_admin', 'enterprise_admin')
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wifi_otp_challenges TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
