-- 010: Modern loyalty program for rewards, gyms, clubs, and retail.
-- Balances are maintained by database functions so earn/redeem operations are atomic.

CREATE TABLE IF NOT EXISTS public.loyalty_programs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id       UUID NOT NULL UNIQUE REFERENCES public.enterprises(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  points_name         TEXT NOT NULL DEFAULT 'points',
  earn_rate           NUMERIC(10,2) NOT NULL DEFAULT 1.00,
  welcome_points      INTEGER NOT NULL DEFAULT 0,
  primary_color       TEXT NOT NULL DEFAULT '#155eef',
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT loyalty_programs_name_nonempty_chk CHECK (char_length(trim(name)) > 0),
  CONSTRAINT loyalty_programs_points_name_chk CHECK (char_length(trim(points_name)) BETWEEN 2 AND 32),
  CONSTRAINT loyalty_programs_earn_rate_chk CHECK (earn_rate > 0 AND earn_rate <= 100),
  CONSTRAINT loyalty_programs_welcome_points_chk CHECK (welcome_points >= 0 AND welcome_points <= 100000),
  CONSTRAINT loyalty_programs_color_chk CHECK (primary_color ~ '^#[0-9a-fA-F]{6}$')
);

CREATE TABLE IF NOT EXISTS public.loyalty_rewards (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id   UUID NOT NULL REFERENCES public.loyalty_programs(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  value_text   TEXT,
  points_cost  INTEGER NOT NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT loyalty_rewards_name_nonempty_chk CHECK (char_length(trim(name)) > 0),
  CONSTRAINT loyalty_rewards_cost_chk CHECK (points_cost > 0 AND points_cost <= 1000000)
);

CREATE TABLE IF NOT EXISTS public.loyalty_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id      UUID NOT NULL REFERENCES public.loyalty_programs(id) ON DELETE CASCADE,
  member_number   TEXT NOT NULL,
  first_name      TEXT NOT NULL,
  last_name       TEXT,
  email           TEXT,
  points_balance  INTEGER NOT NULL DEFAULT 0,
  lifetime_points INTEGER NOT NULL DEFAULT 0,
  tier            TEXT NOT NULL DEFAULT 'Member',
  status          TEXT NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT loyalty_members_number_nonempty_chk CHECK (char_length(trim(member_number)) > 0),
  CONSTRAINT loyalty_members_first_name_nonempty_chk CHECK (char_length(trim(first_name)) > 0),
  CONSTRAINT loyalty_members_balance_chk CHECK (points_balance >= 0),
  CONSTRAINT loyalty_members_lifetime_chk CHECK (lifetime_points >= 0),
  CONSTRAINT loyalty_members_status_chk CHECK (status IN ('active', 'paused', 'revoked')),
  CONSTRAINT loyalty_members_program_number_uidx UNIQUE (program_id, member_number)
);

CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id       UUID NOT NULL REFERENCES public.loyalty_members(id) ON DELETE CASCADE,
  reward_id       UUID REFERENCES public.loyalty_rewards(id) ON DELETE SET NULL,
  transaction_type TEXT NOT NULL,
  points_change   INTEGER NOT NULL,
  description     TEXT NOT NULL,
  idempotency_key TEXT UNIQUE,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT loyalty_transactions_type_chk CHECK (transaction_type IN ('earn', 'redeem', 'adjust', 'reversal')),
  CONSTRAINT loyalty_transactions_change_chk CHECK (points_change <> 0)
);

CREATE INDEX IF NOT EXISTS loyalty_rewards_program_active_idx ON public.loyalty_rewards (program_id, is_active, sort_order);
CREATE INDEX IF NOT EXISTS loyalty_members_program_status_idx ON public.loyalty_members (program_id, status);
CREATE INDEX IF NOT EXISTS loyalty_transactions_member_created_idx ON public.loyalty_transactions (member_id, created_at DESC);

DROP TRIGGER IF EXISTS loyalty_programs_set_updated_at ON public.loyalty_programs;
CREATE TRIGGER loyalty_programs_set_updated_at BEFORE UPDATE ON public.loyalty_programs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS loyalty_rewards_set_updated_at ON public.loyalty_rewards;
CREATE TRIGGER loyalty_rewards_set_updated_at BEFORE UPDATE ON public.loyalty_rewards FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS loyalty_members_set_updated_at ON public.loyalty_members;
CREATE TRIGGER loyalty_members_set_updated_at BEFORE UPDATE ON public.loyalty_members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.loyalty_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY loyalty_programs_select_same_enterprise ON public.loyalty_programs FOR SELECT TO authenticated USING (enterprise_id = public.get_user_enterprise_id());
CREATE POLICY loyalty_programs_admin_write ON public.loyalty_programs FOR ALL TO authenticated USING (enterprise_id = public.get_user_enterprise_id() AND public.get_user_role() IN ('super_admin', 'enterprise_admin')) WITH CHECK (enterprise_id = public.get_user_enterprise_id() AND public.get_user_role() IN ('super_admin', 'enterprise_admin'));
CREATE POLICY loyalty_rewards_select_same_enterprise ON public.loyalty_rewards FOR SELECT TO authenticated USING (program_id IN (SELECT id FROM public.loyalty_programs WHERE enterprise_id = public.get_user_enterprise_id()));
CREATE POLICY loyalty_rewards_admin_write ON public.loyalty_rewards FOR ALL TO authenticated USING (program_id IN (SELECT id FROM public.loyalty_programs WHERE enterprise_id = public.get_user_enterprise_id()) AND public.get_user_role() IN ('super_admin', 'enterprise_admin')) WITH CHECK (program_id IN (SELECT id FROM public.loyalty_programs WHERE enterprise_id = public.get_user_enterprise_id()) AND public.get_user_role() IN ('super_admin', 'enterprise_admin'));
CREATE POLICY loyalty_members_select_same_enterprise ON public.loyalty_members FOR SELECT TO authenticated USING (program_id IN (SELECT id FROM public.loyalty_programs WHERE enterprise_id = public.get_user_enterprise_id()));
CREATE POLICY loyalty_members_admin_write ON public.loyalty_members FOR ALL TO authenticated USING (program_id IN (SELECT id FROM public.loyalty_programs WHERE enterprise_id = public.get_user_enterprise_id()) AND public.get_user_role() IN ('super_admin', 'enterprise_admin')) WITH CHECK (program_id IN (SELECT id FROM public.loyalty_programs WHERE enterprise_id = public.get_user_enterprise_id()) AND public.get_user_role() IN ('super_admin', 'enterprise_admin'));
CREATE POLICY loyalty_transactions_select_same_enterprise ON public.loyalty_transactions FOR SELECT TO authenticated USING (member_id IN (SELECT lm.id FROM public.loyalty_members lm JOIN public.loyalty_programs lp ON lp.id = lm.program_id WHERE lp.enterprise_id = public.get_user_enterprise_id()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.loyalty_programs, public.loyalty_rewards, public.loyalty_members, public.loyalty_transactions TO authenticated, service_role;

-- Atomic operator actions. The API performs the tenant/role check before calling these functions.
CREATE OR REPLACE FUNCTION public.loyalty_award_points(p_member_id UUID, p_points INTEGER, p_description TEXT, p_idempotency_key TEXT DEFAULT NULL)
RETURNS public.loyalty_members LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_member public.loyalty_members;
BEGIN
  IF p_points <= 0 OR p_points > 100000 THEN RAISE EXCEPTION 'POINTS_INVALID'; END IF;
  IF p_idempotency_key IS NOT NULL AND EXISTS (SELECT 1 FROM public.loyalty_transactions WHERE idempotency_key = p_idempotency_key) THEN
    SELECT lm.* INTO v_member FROM public.loyalty_members lm WHERE lm.id = p_member_id;
    RETURN v_member;
  END IF;
  UPDATE public.loyalty_members SET points_balance = points_balance + p_points, lifetime_points = lifetime_points + p_points WHERE id = p_member_id AND status = 'active' RETURNING * INTO v_member;
  IF NOT FOUND THEN RAISE EXCEPTION 'MEMBER_NOT_FOUND'; END IF;
  INSERT INTO public.loyalty_transactions (member_id, transaction_type, points_change, description, idempotency_key) VALUES (p_member_id, 'earn', p_points, COALESCE(NULLIF(trim(p_description), ''), 'Points earned'), p_idempotency_key);
  RETURN v_member;
END; $$;

CREATE OR REPLACE FUNCTION public.loyalty_redeem_reward(p_member_id UUID, p_reward_id UUID, p_idempotency_key TEXT DEFAULT NULL)
RETURNS public.loyalty_members LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_member public.loyalty_members; v_reward public.loyalty_rewards;
BEGIN
  IF p_idempotency_key IS NOT NULL AND EXISTS (SELECT 1 FROM public.loyalty_transactions WHERE idempotency_key = p_idempotency_key) THEN
    SELECT lm.* INTO v_member FROM public.loyalty_members lm WHERE lm.id = p_member_id;
    RETURN v_member;
  END IF;
  SELECT lr.* INTO v_reward FROM public.loyalty_rewards lr WHERE lr.id = p_reward_id AND lr.is_active = TRUE;
  IF NOT FOUND THEN RAISE EXCEPTION 'REWARD_NOT_FOUND'; END IF;
  UPDATE public.loyalty_members SET points_balance = points_balance - v_reward.points_cost WHERE id = p_member_id AND status = 'active' AND points_balance >= v_reward.points_cost RETURNING * INTO v_member;
  IF NOT FOUND THEN RAISE EXCEPTION 'INSUFFICIENT_POINTS'; END IF;
  INSERT INTO public.loyalty_transactions (member_id, reward_id, transaction_type, points_change, description, idempotency_key, metadata) VALUES (p_member_id, p_reward_id, 'redeem', -v_reward.points_cost, v_reward.name, p_idempotency_key, jsonb_build_object('value', v_reward.value_text));
  RETURN v_member;
END; $$;

GRANT EXECUTE ON FUNCTION public.loyalty_award_points(UUID, INTEGER, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.loyalty_redeem_reward(UUID, UUID, TEXT) TO service_role;
NOTIFY pgrst, 'reload schema';
