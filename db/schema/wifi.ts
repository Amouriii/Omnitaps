/**
 * Enterprise Wi-Fi Captive Portal — Database Schema & Types
 *
 * TASK-1.1: Typed table models, relations, composite indexes, and RLS policy SQL
 * for Supabase / PostgreSQL.
 *
 * Assumptions:
 * - Supabase Auth (`auth.uid()`) identifies operators.
 * - `enterprise_members` bridges auth users ↔ enterprises for RLS isolation.
 * - MAC addresses are stored normalized (lowercase, colon-separated).
 * - Session byte counters follow RADIUS Acct-Input/Output-Octets semantics.
 * - Quotas: free tier seeded per enterprise; paid tiers via subscription_plans.
 */

import { z } from "zod";

/* -------------------------------------------------------------------------- */
/* Enums                                                                      */
/* -------------------------------------------------------------------------- */

export const WifiDeviceStatus = {
  ACTIVE: "active",
  BLOCKED: "blocked",
  PENDING: "pending",
} as const;
export type WifiDeviceStatus =
  (typeof WifiDeviceStatus)[keyof typeof WifiDeviceStatus];

export const WifiSessionStatus = {
  ACTIVE: "active",
  EXPIRED: "expired",
  DISCONNECTED: "disconnected",
  QUOTA_EXCEEDED: "quota_exceeded",
  UPGRADED: "upgraded",
} as const;
export type WifiSessionStatus =
  (typeof WifiSessionStatus)[keyof typeof WifiSessionStatus];

export const SubscriptionPlanInterval = {
  SESSION: "session",
  HOURLY: "hourly",
  DAILY: "daily",
  MONTHLY: "monthly",
} as const;
export type SubscriptionPlanInterval =
  (typeof SubscriptionPlanInterval)[keyof typeof SubscriptionPlanInterval];

export const EnterpriseMemberRole = {
  OWNER: "owner",
  ADMIN: "admin",
  ANALYST: "analyst",
  SUPPORT: "support",
} as const;
export type EnterpriseMemberRole =
  (typeof EnterpriseMemberRole)[keyof typeof EnterpriseMemberRole];

/* -------------------------------------------------------------------------- */
/* Row types                                                                  */
/* -------------------------------------------------------------------------- */

export interface Enterprise {
  id: string;
  name: string;
  slug: string;
  /** Default free data allowance in megabytes for new guest sessions. */
  freeQuotaMb: number;
  /** Default free session duration in minutes. */
  freeSessionMinutes: number;
  /** Default download throttle in kbps (0 = unlimited). */
  defaultDownloadKbps: number;
  /** Default upload throttle in kbps (0 = unlimited). */
  defaultUploadKbps: number;
  /** Shared secret for AP gateway HMAC signatures. */
  gatewayHmacSecret: string;
  /** RADIUS NAS / CoA target host. */
  radiusCoaHost: string | null;
  /** RADIUS CoA UDP port (standard 3799). */
  radiusCoaPort: number;
  /** RADIUS shared secret for CoA/Disconnect. */
  radiusSecret: string | null;
  stripeCustomerId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EnterpriseMember {
  id: string;
  enterpriseId: string;
  /** Supabase auth.users.id */
  userId: string;
  role: EnterpriseMemberRole;
  createdAt: string;
  updatedAt: string;
}

export interface WifiDevice {
  id: string;
  enterpriseId: string;
  /** Normalized MAC: aa:bb:cc:dd:ee:ff */
  macAddress: string;
  /** Optional randomized-MAC cohort key when privacy MAC rotates. */
  deviceFingerprint: string | null;
  displayName: string | null;
  status: WifiDeviceStatus;
  firstSeenAt: string;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface WifiSession {
  id: string;
  enterpriseId: string;
  deviceId: string;
  planId: string | null;
  status: WifiSessionStatus;
  /** RADIUS Acct-Session-Id when provided by the gateway. */
  acctSessionId: string | null;
  /** Calling-Station-Id / gateway AP identifier. */
  apId: string | null;
  startedAt: string;
  endsAt: string | null;
  disconnectedAt: string | null;
  /** Cumulative RADIUS Acct-Input-Octets (client → network). */
  inputOctets: number;
  /** Cumulative RADIUS Acct-Output-Octets (network → client). */
  outputOctets: number;
  /** Hard cap in bytes for this session (free or paid). */
  quotaBytes: number;
  downloadKbps: number;
  uploadKbps: number;
  stripeCheckoutSessionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionPlan {
  id: string;
  enterpriseId: string;
  name: string;
  description: string | null;
  /** Stripe Price ID for Checkout. */
  stripePriceId: string | null;
  priceCents: number;
  currency: string;
  interval: SubscriptionPlanInterval;
  /** Data allowance in megabytes (null = unlimited). */
  quotaMb: number | null;
  /** Session duration in minutes (null = unlimited / plan interval). */
  durationMinutes: number | null;
  downloadKbps: number;
  uploadKbps: number;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Relations (typed graph for application use)                                */
/* -------------------------------------------------------------------------- */

export interface EnterpriseRelations {
  members: EnterpriseMember[];
  devices: WifiDevice[];
  sessions: WifiSession[];
  plans: SubscriptionPlan[];
}

export interface WifiDeviceRelations {
  enterprise: Enterprise;
  sessions: WifiSession[];
}

export interface WifiSessionRelations {
  enterprise: Enterprise;
  device: WifiDevice;
  plan: SubscriptionPlan | null;
}

export interface SubscriptionPlanRelations {
  enterprise: Enterprise;
  sessions: WifiSession[];
}

export const wifiRelations = {
  enterprises: {
    members: { table: "enterprise_members", type: "one-to-many" as const },
    devices: { table: "wifi_devices", type: "one-to-many" as const },
    sessions: { table: "wifi_sessions", type: "one-to-many" as const },
    plans: { table: "subscription_plans", type: "one-to-many" as const },
  },
  wifi_devices: {
    enterprise: { table: "enterprises", type: "many-to-one" as const },
    sessions: { table: "wifi_sessions", type: "one-to-many" as const },
  },
  wifi_sessions: {
    enterprise: { table: "enterprises", type: "many-to-one" as const },
    device: { table: "wifi_devices", type: "many-to-one" as const },
    plan: { table: "subscription_plans", type: "many-to-one" as const },
  },
  subscription_plans: {
    enterprise: { table: "enterprises", type: "many-to-one" as const },
    sessions: { table: "wifi_sessions", type: "one-to-many" as const },
  },
} as const;

/* -------------------------------------------------------------------------- */
/* Zod schemas (runtime validation for inserts/updates)                       */
/* -------------------------------------------------------------------------- */

export const enterpriseInsertSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().trim().min(1).max(200),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  freeQuotaMb: z.number().int().min(0).max(1_000_000).default(100),
  freeSessionMinutes: z.number().int().min(1).max(10_080).default(60),
  defaultDownloadKbps: z.number().int().min(0).max(10_000_000).default(5_000),
  defaultUploadKbps: z.number().int().min(0).max(10_000_000).default(2_000),
  gatewayHmacSecret: z.string().min(16).max(256),
  radiusCoaHost: z.string().trim().max(255).nullable().optional(),
  radiusCoaPort: z.number().int().min(1).max(65535).default(3799),
  radiusSecret: z.string().min(1).max(256).nullable().optional(),
  stripeCustomerId: z.string().trim().max(255).nullable().optional(),
  isActive: z.boolean().default(true),
});

export const wifiDeviceInsertSchema = z.object({
  id: z.string().min(1).optional(),
  enterpriseId: z.string().min(1),
  macAddress: z
    .string()
    .trim()
    .regex(/^([0-9a-f]{2}:){5}[0-9a-f]{2}$/i, "MAC must be aa:bb:cc:dd:ee:ff"),
  deviceFingerprint: z.string().trim().max(128).nullable().optional(),
  displayName: z.string().trim().max(120).nullable().optional(),
  status: z
    .enum([
      WifiDeviceStatus.ACTIVE,
      WifiDeviceStatus.BLOCKED,
      WifiDeviceStatus.PENDING,
    ])
    .default(WifiDeviceStatus.ACTIVE),
});

export const wifiSessionInsertSchema = z.object({
  id: z.string().min(1).optional(),
  enterpriseId: z.string().min(1),
  deviceId: z.string().min(1),
  planId: z.string().min(1).nullable().optional(),
  status: z
    .enum([
      WifiSessionStatus.ACTIVE,
      WifiSessionStatus.EXPIRED,
      WifiSessionStatus.DISCONNECTED,
      WifiSessionStatus.QUOTA_EXCEEDED,
      WifiSessionStatus.UPGRADED,
    ])
    .default(WifiSessionStatus.ACTIVE),
  acctSessionId: z.string().trim().max(128).nullable().optional(),
  apId: z.string().trim().max(128).nullable().optional(),
  startedAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  inputOctets: z.number().int().min(0).default(0),
  outputOctets: z.number().int().min(0).default(0),
  quotaBytes: z.number().int().min(0),
  downloadKbps: z.number().int().min(0).default(0),
  uploadKbps: z.number().int().min(0).default(0),
  stripeCheckoutSessionId: z.string().trim().max(255).nullable().optional(),
});

export const subscriptionPlanInsertSchema = z.object({
  id: z.string().min(1).optional(),
  enterpriseId: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).nullable().optional(),
  stripePriceId: z.string().trim().max(255).nullable().optional(),
  priceCents: z.number().int().min(0),
  currency: z.string().trim().length(3).default("usd"),
  interval: z.enum([
    SubscriptionPlanInterval.SESSION,
    SubscriptionPlanInterval.HOURLY,
    SubscriptionPlanInterval.DAILY,
    SubscriptionPlanInterval.MONTHLY,
  ]),
  quotaMb: z.number().int().min(0).nullable().optional(),
  durationMinutes: z.number().int().min(1).nullable().optional(),
  downloadKbps: z.number().int().min(0).default(0),
  uploadKbps: z.number().int().min(0).default(0),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export type EnterpriseInsert = z.infer<typeof enterpriseInsertSchema>;
export type WifiDeviceInsert = z.infer<typeof wifiDeviceInsertSchema>;
export type WifiSessionInsert = z.infer<typeof wifiSessionInsertSchema>;
export type SubscriptionPlanInsert = z.infer<typeof subscriptionPlanInsertSchema>;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/** Convert MB allowance to bytes for session quota_bytes. */
export function mbToBytes(mb: number): number {
  return Math.max(0, Math.floor(mb)) * 1024 * 1024;
}

/** Total session consumption from RADIUS octet counters. */
export function sessionBytesUsed(session: Pick<WifiSession, "inputOctets" | "outputOctets">): number {
  return Math.max(0, session.inputOctets) + Math.max(0, session.outputOctets);
}

export function sessionBytesRemaining(session: Pick<WifiSession, "inputOctets" | "outputOctets" | "quotaBytes">): number {
  return Math.max(0, session.quotaBytes - sessionBytesUsed(session));
}

/* -------------------------------------------------------------------------- */
/* PostgreSQL / Supabase DDL + indexes + RLS                                  */
/* -------------------------------------------------------------------------- */

/**
 * Full migration SQL for the captive-portal domain.
 * Apply via Supabase SQL Editor or `psql`. Idempotent where practical.
 */
export const wifiSchemaSql = `
-- Enums
DO $$ BEGIN
  CREATE TYPE wifi_device_status AS ENUM ('active', 'blocked', 'pending');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE wifi_session_status AS ENUM (
    'active', 'expired', 'disconnected', 'quota_exceeded', 'upgraded'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_plan_interval AS ENUM (
    'session', 'hourly', 'daily', 'monthly'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE enterprise_member_role AS ENUM (
    'owner', 'admin', 'analyst', 'support'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- enterprises
CREATE TABLE IF NOT EXISTS enterprises (
  id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name                  TEXT NOT NULL,
  slug                  TEXT NOT NULL UNIQUE,
  free_quota_mb         INTEGER NOT NULL DEFAULT 100 CHECK (free_quota_mb >= 0),
  free_session_minutes  INTEGER NOT NULL DEFAULT 60 CHECK (free_session_minutes > 0),
  default_download_kbps INTEGER NOT NULL DEFAULT 5000 CHECK (default_download_kbps >= 0),
  default_upload_kbps   INTEGER NOT NULL DEFAULT 2000 CHECK (default_upload_kbps >= 0),
  gateway_hmac_secret   TEXT NOT NULL,
  radius_coa_host       TEXT,
  radius_coa_port       INTEGER NOT NULL DEFAULT 3799 CHECK (radius_coa_port BETWEEN 1 AND 65535),
  radius_secret         TEXT,
  stripe_customer_id    TEXT,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS enterprises_is_active_idx
  ON enterprises (is_active);

-- enterprise_members (RLS bridge to auth.users)
CREATE TABLE IF NOT EXISTS enterprise_members (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  enterprise_id  TEXT NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role           enterprise_member_role NOT NULL DEFAULT 'admin',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (enterprise_id, user_id)
);

CREATE INDEX IF NOT EXISTS enterprise_members_user_id_idx
  ON enterprise_members (user_id);

CREATE INDEX IF NOT EXISTS enterprise_members_enterprise_role_idx
  ON enterprise_members (enterprise_id, role);

-- wifi_devices
CREATE TABLE IF NOT EXISTS wifi_devices (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  enterprise_id       TEXT NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  mac_address         TEXT NOT NULL,
  device_fingerprint  TEXT,
  display_name        TEXT,
  status              wifi_device_status NOT NULL DEFAULT 'active',
  first_seen_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT wifi_devices_mac_format_chk
    CHECK (mac_address ~ '^[0-9a-f]{2}(:[0-9a-f]{2}){5}$')
);

-- Fast MAC lookup within an enterprise (captive authenticate hot path)
CREATE UNIQUE INDEX IF NOT EXISTS wifi_devices_enterprise_mac_uidx
  ON wifi_devices (enterprise_id, mac_address);

CREATE INDEX IF NOT EXISTS wifi_devices_mac_address_idx
  ON wifi_devices (mac_address);

CREATE INDEX IF NOT EXISTS wifi_devices_enterprise_status_idx
  ON wifi_devices (enterprise_id, status);

CREATE INDEX IF NOT EXISTS wifi_devices_enterprise_last_seen_idx
  ON wifi_devices (enterprise_id, last_seen_at DESC);

-- subscription_plans
CREATE TABLE IF NOT EXISTS subscription_plans (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  enterprise_id     TEXT NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  description       TEXT,
  stripe_price_id   TEXT,
  price_cents       INTEGER NOT NULL CHECK (price_cents >= 0),
  currency          TEXT NOT NULL DEFAULT 'usd',
  interval          subscription_plan_interval NOT NULL DEFAULT 'session',
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
  ON subscription_plans (enterprise_id, is_active, sort_order);

CREATE UNIQUE INDEX IF NOT EXISTS subscription_plans_enterprise_stripe_price_uidx
  ON subscription_plans (enterprise_id, stripe_price_id)
  WHERE stripe_price_id IS NOT NULL;

-- wifi_sessions
CREATE TABLE IF NOT EXISTS wifi_sessions (
  id                         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  enterprise_id              TEXT NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  device_id                  TEXT NOT NULL REFERENCES wifi_devices(id) ON DELETE CASCADE,
  plan_id                    TEXT REFERENCES subscription_plans(id) ON DELETE SET NULL,
  status                     wifi_session_status NOT NULL DEFAULT 'active',
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

-- Active session lookup by device (re-auth / status poll)
CREATE INDEX IF NOT EXISTS wifi_sessions_device_status_started_idx
  ON wifi_sessions (device_id, status, started_at DESC);

-- Enterprise telemetry: active sessions + time range
CREATE INDEX IF NOT EXISTS wifi_sessions_enterprise_status_started_idx
  ON wifi_sessions (enterprise_id, status, started_at DESC);

-- Byte accounting rollups
CREATE INDEX IF NOT EXISTS wifi_sessions_enterprise_bytes_idx
  ON wifi_sessions (enterprise_id, input_octets, output_octets);

CREATE UNIQUE INDEX IF NOT EXISTS wifi_sessions_enterprise_acct_session_uidx
  ON wifi_sessions (enterprise_id, acct_session_id)
  WHERE acct_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS wifi_sessions_plan_id_idx
  ON wifi_sessions (plan_id)
  WHERE plan_id IS NOT NULL;

-- updated_at trigger
CREATE OR REPLACE FUNCTION wifi_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enterprises_set_updated_at ON enterprises;
CREATE TRIGGER enterprises_set_updated_at
  BEFORE UPDATE ON enterprises
  FOR EACH ROW EXECUTE FUNCTION wifi_set_updated_at();

DROP TRIGGER IF EXISTS enterprise_members_set_updated_at ON enterprise_members;
CREATE TRIGGER enterprise_members_set_updated_at
  BEFORE UPDATE ON enterprise_members
  FOR EACH ROW EXECUTE FUNCTION wifi_set_updated_at();

DROP TRIGGER IF EXISTS wifi_devices_set_updated_at ON wifi_devices;
CREATE TRIGGER wifi_devices_set_updated_at
  BEFORE UPDATE ON wifi_devices
  FOR EACH ROW EXECUTE FUNCTION wifi_set_updated_at();

DROP TRIGGER IF EXISTS wifi_sessions_set_updated_at ON wifi_sessions;
CREATE TRIGGER wifi_sessions_set_updated_at
  BEFORE UPDATE ON wifi_sessions
  FOR EACH ROW EXECUTE FUNCTION wifi_set_updated_at();

DROP TRIGGER IF EXISTS subscription_plans_set_updated_at ON subscription_plans;
CREATE TRIGGER subscription_plans_set_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW EXECUTE FUNCTION wifi_set_updated_at();

-- Membership helper for RLS
CREATE OR REPLACE FUNCTION is_enterprise_member(target_enterprise_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM enterprise_members em
    WHERE em.enterprise_id = target_enterprise_id
      AND em.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION is_enterprise_admin(target_enterprise_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM enterprise_members em
    WHERE em.enterprise_id = target_enterprise_id
      AND em.user_id = auth.uid()
      AND em.role IN ('owner', 'admin')
  );
$$;

ALTER TABLE enterprises ENABLE ROW LEVEL SECURITY;
ALTER TABLE enterprise_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE wifi_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE wifi_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- enterprises policies
DROP POLICY IF EXISTS enterprises_select_member ON enterprises;
CREATE POLICY enterprises_select_member ON enterprises
  FOR SELECT TO authenticated
  USING (is_enterprise_member(id));

DROP POLICY IF EXISTS enterprises_update_admin ON enterprises;
CREATE POLICY enterprises_update_admin ON enterprises
  FOR UPDATE TO authenticated
  USING (is_enterprise_admin(id))
  WITH CHECK (is_enterprise_admin(id));

-- service_role bypasses RLS by default in Supabase; captive APIs use it server-side.

-- enterprise_members policies
DROP POLICY IF EXISTS enterprise_members_select_member ON enterprise_members;
CREATE POLICY enterprise_members_select_member ON enterprise_members
  FOR SELECT TO authenticated
  USING (is_enterprise_member(enterprise_id));

DROP POLICY IF EXISTS enterprise_members_write_admin ON enterprise_members;
CREATE POLICY enterprise_members_write_admin ON enterprise_members
  FOR ALL TO authenticated
  USING (is_enterprise_admin(enterprise_id))
  WITH CHECK (is_enterprise_admin(enterprise_id));

-- wifi_devices policies
DROP POLICY IF EXISTS wifi_devices_select_member ON wifi_devices;
CREATE POLICY wifi_devices_select_member ON wifi_devices
  FOR SELECT TO authenticated
  USING (is_enterprise_member(enterprise_id));

DROP POLICY IF EXISTS wifi_devices_write_admin ON wifi_devices;
CREATE POLICY wifi_devices_write_admin ON wifi_devices
  FOR ALL TO authenticated
  USING (is_enterprise_admin(enterprise_id))
  WITH CHECK (is_enterprise_admin(enterprise_id));

-- wifi_sessions policies
DROP POLICY IF EXISTS wifi_sessions_select_member ON wifi_sessions;
CREATE POLICY wifi_sessions_select_member ON wifi_sessions
  FOR SELECT TO authenticated
  USING (is_enterprise_member(enterprise_id));

DROP POLICY IF EXISTS wifi_sessions_write_admin ON wifi_sessions;
CREATE POLICY wifi_sessions_write_admin ON wifi_sessions
  FOR ALL TO authenticated
  USING (is_enterprise_admin(enterprise_id))
  WITH CHECK (is_enterprise_admin(enterprise_id));

-- subscription_plans policies
DROP POLICY IF EXISTS subscription_plans_select_member ON subscription_plans;
CREATE POLICY subscription_plans_select_member ON subscription_plans
  FOR SELECT TO authenticated
  USING (is_enterprise_member(enterprise_id));

DROP POLICY IF EXISTS subscription_plans_write_admin ON subscription_plans;
CREATE POLICY subscription_plans_write_admin ON subscription_plans
  FOR ALL TO authenticated
  USING (is_enterprise_admin(enterprise_id))
  WITH CHECK (is_enterprise_admin(enterprise_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON enterprises TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON enterprise_members TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON wifi_devices TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON wifi_sessions TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON subscription_plans TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
`.trim();

/** Table catalog for codegen / admin tooling. */
export const wifiTables = [
  "enterprises",
  "enterprise_members",
  "wifi_devices",
  "wifi_sessions",
  "subscription_plans",
] as const;

export type WifiTableName = (typeof wifiTables)[number];
