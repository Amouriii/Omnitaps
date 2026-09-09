-- 009: Apple Wallet membership cards for stores, gyms, clubs, and rewards programs.
-- Secrets are never stored here: member pass URLs use a one-way token hash.

CREATE TABLE IF NOT EXISTS public.apple_wallet_programs (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id      UUID NOT NULL UNIQUE REFERENCES public.enterprises(id) ON DELETE CASCADE,
  name               TEXT NOT NULL,
  program_type       TEXT NOT NULL DEFAULT 'membership',
  logo_text          TEXT,
  logo_url           TEXT,
  primary_color      TEXT NOT NULL DEFAULT '#155eef',
  background_color   TEXT NOT NULL DEFAULT '#12151a',
  label_color        TEXT NOT NULL DEFAULT '#ffffff',
  barcode_format     TEXT NOT NULL DEFAULT 'QR',
  support_url        TEXT,
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT apple_wallet_programs_name_nonempty_chk CHECK (char_length(trim(name)) > 0),
  CONSTRAINT apple_wallet_programs_type_chk CHECK (program_type IN ('membership', 'rewards', 'gym', 'sports_club')),
  CONSTRAINT apple_wallet_programs_barcode_chk CHECK (barcode_format IN ('QR', 'PDF417', 'CODE128', 'AZTEC')),
  CONSTRAINT apple_wallet_programs_primary_color_chk CHECK (primary_color ~ '^#[0-9a-fA-F]{6}$'),
  CONSTRAINT apple_wallet_programs_background_color_chk CHECK (background_color ~ '^#[0-9a-fA-F]{6}$'),
  CONSTRAINT apple_wallet_programs_label_color_chk CHECK (label_color ~ '^#[0-9a-fA-F]{6}$')
);

CREATE TABLE IF NOT EXISTS public.apple_wallet_members (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id        UUID NOT NULL REFERENCES public.apple_wallet_programs(id) ON DELETE CASCADE,
  member_number     TEXT NOT NULL,
  first_name        TEXT NOT NULL,
  last_name         TEXT,
  email             TEXT,
  tier              TEXT,
  expires_at        DATE,
  status            TEXT NOT NULL DEFAULT 'active',
  access_token_hash TEXT NOT NULL UNIQUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT apple_wallet_members_number_nonempty_chk CHECK (char_length(trim(member_number)) > 0),
  CONSTRAINT apple_wallet_members_first_name_nonempty_chk CHECK (char_length(trim(first_name)) > 0),
  CONSTRAINT apple_wallet_members_status_chk CHECK (status IN ('active', 'paused', 'revoked')),
  CONSTRAINT apple_wallet_members_program_number_uidx UNIQUE (program_id, member_number)
);

CREATE INDEX IF NOT EXISTS apple_wallet_programs_enterprise_active_idx
  ON public.apple_wallet_programs (enterprise_id, is_active);
CREATE INDEX IF NOT EXISTS apple_wallet_members_program_status_idx
  ON public.apple_wallet_members (program_id, status);
CREATE INDEX IF NOT EXISTS apple_wallet_members_expires_at_idx
  ON public.apple_wallet_members (expires_at);

DROP TRIGGER IF EXISTS apple_wallet_programs_set_updated_at ON public.apple_wallet_programs;
CREATE TRIGGER apple_wallet_programs_set_updated_at
  BEFORE UPDATE ON public.apple_wallet_programs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS apple_wallet_members_set_updated_at ON public.apple_wallet_members;
CREATE TRIGGER apple_wallet_members_set_updated_at
  BEFORE UPDATE ON public.apple_wallet_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.apple_wallet_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apple_wallet_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS apple_wallet_programs_select_member ON public.apple_wallet_programs;
CREATE POLICY apple_wallet_programs_select_member ON public.apple_wallet_programs
  FOR SELECT TO authenticated
  USING (enterprise_id = public.get_user_enterprise_id());

DROP POLICY IF EXISTS apple_wallet_programs_write_admin ON public.apple_wallet_programs;
CREATE POLICY apple_wallet_programs_write_admin ON public.apple_wallet_programs
  FOR ALL TO authenticated
  USING (
    enterprise_id = public.get_user_enterprise_id()
    AND public.get_user_role() IN ('super_admin', 'enterprise_admin')
  )
  WITH CHECK (
    enterprise_id = public.get_user_enterprise_id()
    AND public.get_user_role() IN ('super_admin', 'enterprise_admin')
  );

DROP POLICY IF EXISTS apple_wallet_members_select_member ON public.apple_wallet_members;
CREATE POLICY apple_wallet_members_select_member ON public.apple_wallet_members
  FOR SELECT TO authenticated
  USING (
    program_id IN (
      SELECT id FROM public.apple_wallet_programs
      WHERE enterprise_id = public.get_user_enterprise_id()
    )
  );

DROP POLICY IF EXISTS apple_wallet_members_write_admin ON public.apple_wallet_members;
CREATE POLICY apple_wallet_members_write_admin ON public.apple_wallet_members
  FOR ALL TO authenticated
  USING (
    program_id IN (
      SELECT id FROM public.apple_wallet_programs
      WHERE enterprise_id = public.get_user_enterprise_id()
    )
    AND public.get_user_role() IN ('super_admin', 'enterprise_admin')
  )
  WITH CHECK (
    program_id IN (
      SELECT id FROM public.apple_wallet_programs
      WHERE enterprise_id = public.get_user_enterprise_id()
    )
    AND public.get_user_role() IN ('super_admin', 'enterprise_admin')
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.apple_wallet_programs TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.apple_wallet_members TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
