/**
 * TASK-5.2 support — Enterprise Wi-Fi settings & plan catalog API.
 *
 * Assumptions:
 * 1. Bearer Supabase access token; writer must be enterprise owner/admin.
 * 2. PATCH updates `enterprises` free-tier defaults only — never mutates
 *    existing `wifi_sessions` (active guests keep their granted quota/speed).
 * 3. Plan create/update/deactivate similarly does not rewrite live sessions;
 *    new checkouts pick up plan changes going forward.
 * 4. DELETE soft-deactivates (`is_active=false`) to preserve FK history.
 */

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { requireProfileForEnterprise } from "../../../../../../lib/wifi/profiles-auth.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;

interface EnterprisePolicy {
  id: string;
  name: string;
  slug: string;
  freeQuotaMb: number;
  freeSessionMinutes: number;
  defaultDownloadKbps: number;
  defaultUploadKbps: number;
  radiusCoaHost: string | null;
  radiusCoaPort: number;
  isActive: boolean;
}

interface PlanRecord {
  id: string;
  enterpriseId: string;
  name: string;
  description: string | null;
  stripePriceId: string | null;
  priceCents: number;
  currency: string;
  interval: string;
  quotaMb: number | null;
  durationMinutes: number | null;
  downloadKbps: number;
  uploadKbps: number;
  sortOrder: number;
  isActive: boolean;
}

type ErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "enterprise_not_found"
  | "plan_not_found"
  | "misconfigured"
  | "db_error";

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function err(status: number, error: string, code: ErrorCode, details?: string): Response {
  return json(status, { ok: false, error, code, ...(details ? { details } : {}) });
}

function asString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function asInt(value: unknown, fallback?: number): number | undefined {
  if (value === undefined || value === null || value === "") return fallback;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return undefined;
  return Math.floor(n);
}

function asNullableInt(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return undefined;
  return Math.floor(n);
}

function getSupabaseService(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") || request.headers.get("Authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
}

async function requireAuthUser(request: Request): Promise<User | null> {
  const token = getBearerToken(request);
  if (!token) return null;
  const supabase = getSupabaseService();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

function mapEnterprise(row: JsonRecord): EnterprisePolicy {
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    freeQuotaMb: Number(row.free_quota_mb ?? 100),
    freeSessionMinutes: Number(row.free_session_minutes ?? 60),
    defaultDownloadKbps: Number(row.default_download_kbps ?? 0),
    defaultUploadKbps: Number(row.default_upload_kbps ?? 0),
    radiusCoaHost: row.radius_coa_host == null ? null : String(row.radius_coa_host),
    radiusCoaPort: Number(row.radius_coa_port ?? 3799),
    isActive: Boolean(row.is_active ?? true),
  };
}

function mapPlan(row: JsonRecord): PlanRecord {
  return {
    id: String(row.id),
    enterpriseId: String(row.enterprise_id),
    name: String(row.name),
    description: row.description == null ? null : String(row.description),
    stripePriceId: row.stripe_price_id == null ? null : String(row.stripe_price_id),
    priceCents: Number(row.price_cents ?? 0),
    currency: String(row.currency ?? "usd"),
    interval: String(row.interval ?? "session"),
    quotaMb: row.quota_mb == null ? null : Number(row.quota_mb),
    durationMinutes: row.duration_minutes == null ? null : Number(row.duration_minutes),
    downloadKbps: Number(row.download_kbps ?? 0),
    uploadKbps: Number(row.upload_kbps ?? 0),
    sortOrder: Number(row.sort_order ?? 0),
    isActive: Boolean(row.is_active ?? true),
  };
}

async function resolveEnterpriseId(
  supabase: SupabaseClient,
  request: Request,
  body?: Record<string, unknown>,
): Promise<string | null> {
  const url = new URL(request.url);
  const fromQuery =
    asString(url.searchParams.get("enterprise_id")) ||
    asString(url.searchParams.get("enterprise_slug")) ||
    asString(url.searchParams.get("slug"));
  const fromBody =
    asString(body?.enterprise_id) ||
    asString(body?.enterpriseId) ||
    asString(body?.enterprise_slug) ||
    asString(body?.slug);

  const raw = fromBody || fromQuery;
  if (!raw) return null;

  if (raw.includes("-") && raw.length > 20) {
    // likely uuid/text id
    const byId = await supabase.from("enterprises").select("id").eq("id", raw).maybeSingle();
    if (byId.data) return String((byId.data as JsonRecord).id);
  }

  const bySlug = await supabase.from("enterprises").select("id").eq("slug", raw).maybeSingle();
  if (bySlug.data) return String((bySlug.data as JsonRecord).id);

  const byId = await supabase.from("enterprises").select("id").eq("id", raw).maybeSingle();
  return byId.data ? String((byId.data as JsonRecord).id) : null;
}

async function assertMember(
  supabase: SupabaseClient,
  enterpriseId: string,
  user: User,
  requireAdmin: boolean,
): Promise<{ ok: true; role: string } | { ok: false; response: Response }> {
  const access = await requireProfileForEnterprise(supabase, user, enterpriseId, requireAdmin);
  if (!access.ok) {
    return {
      ok: false,
      response: err(
        access.status as 403 | 500,
        access.error,
        access.code as ErrorCode,
        access.details,
      ),
    };
  }
  return { ok: true, role: access.membership.role };
}

async function loadBundle(supabase: SupabaseClient, enterpriseId: string) {
  const [ent, plans] = await Promise.all([
    supabase.from("enterprises").select("*").eq("id", enterpriseId).maybeSingle(),
    supabase
      .from("subscription_plans")
      .select("*")
      .eq("enterprise_id", enterpriseId)
      .order("sort_order", { ascending: true }),
  ]);
  return { ent, plans };
}

export async function GET(request: Request): Promise<Response> {
  const supabase = getSupabaseService();
  if (!supabase) {
    return err(503, "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.", "misconfigured");
  }
  const user = await requireAuthUser(request);
  if (!user) return err(401, "Valid Bearer access token required.", "unauthorized");

  const enterpriseId = await resolveEnterpriseId(supabase, request);
  if (!enterpriseId) {
    return err(400, "enterprise_id or enterprise_slug is required.", "bad_request");
  }

  const member = await assertMember(supabase, enterpriseId, user, false);
  if (!member.ok) return member.response;

  const { ent, plans } = await loadBundle(supabase, enterpriseId);
  if (ent.error || plans.error) {
    return err(
      500,
      "Failed to load settings.",
      "db_error",
      ent.error?.message || plans.error?.message,
    );
  }
  if (!ent.data) return err(404, "Enterprise not found.", "enterprise_not_found");

  return json(200, {
    ok: true,
    role: member.role,
    enterprise: mapEnterprise(ent.data as JsonRecord),
    plans: (plans.data || []).map((row) => mapPlan(row as JsonRecord)),
  });
}

export async function PATCH(request: Request): Promise<Response> {
  const supabase = getSupabaseService();
  if (!supabase) {
    return err(503, "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.", "misconfigured");
  }
  const user = await requireAuthUser(request);
  if (!user) return err(401, "Valid Bearer access token required.", "unauthorized");

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return err(400, "JSON body required.", "bad_request");
  }

  const enterpriseId = await resolveEnterpriseId(supabase, request, body);
  if (!enterpriseId) {
    return err(400, "enterprise_id or enterprise_slug is required.", "bad_request");
  }

  const member = await assertMember(supabase, enterpriseId, user, true);
  if (!member.ok) return member.response;

  const action = asString(body.action) || "update_policy";

  if (action === "update_plan") {
    const planId = asString(body.plan_id) || asString(body.planId);
    if (!planId) return err(400, "plan_id is required.", "bad_request");

    const patch: Record<string, unknown> = {};
    if (asString(body.name) !== undefined) patch.name = asString(body.name);
    if (body.description !== undefined) {
      patch.description = body.description === null ? null : asString(body.description) || null;
    }
    if (body.stripe_price_id !== undefined || body.stripePriceId !== undefined) {
      const v = body.stripe_price_id ?? body.stripePriceId;
      patch.stripe_price_id = v === null || v === "" ? null : asString(v) || null;
    }
    const priceCents = asInt(body.price_cents ?? body.priceCents);
    if (priceCents !== undefined) {
      if (priceCents < 0) return err(400, "price_cents must be >= 0.", "bad_request");
      patch.price_cents = priceCents;
    }
    if (asString(body.currency)) patch.currency = asString(body.currency)!.toLowerCase();
    if (asString(body.interval)) patch.interval = asString(body.interval);
    const quotaMb = asNullableInt(body.quota_mb ?? body.quotaMb);
    if (quotaMb !== undefined) {
      if (quotaMb !== null && quotaMb < 0) return err(400, "quota_mb invalid.", "bad_request");
      patch.quota_mb = quotaMb;
    }
    const durationMinutes = asNullableInt(body.duration_minutes ?? body.durationMinutes);
    if (durationMinutes !== undefined) {
      if (durationMinutes !== null && durationMinutes < 1) {
        return err(400, "duration_minutes must be >= 1 when set.", "bad_request");
      }
      patch.duration_minutes = durationMinutes;
    }
    const downloadKbps = asInt(body.download_kbps ?? body.downloadKbps);
    if (downloadKbps !== undefined) {
      if (downloadKbps < 0) return err(400, "download_kbps invalid.", "bad_request");
      patch.download_kbps = downloadKbps;
    }
    const uploadKbps = asInt(body.upload_kbps ?? body.uploadKbps);
    if (uploadKbps !== undefined) {
      if (uploadKbps < 0) return err(400, "upload_kbps invalid.", "bad_request");
      patch.upload_kbps = uploadKbps;
    }
    const sortOrder = asInt(body.sort_order ?? body.sortOrder);
    if (sortOrder !== undefined) patch.sort_order = Math.max(0, sortOrder);
    if (typeof body.is_active === "boolean" || typeof body.isActive === "boolean") {
      patch.is_active = Boolean(body.is_active ?? body.isActive);
    }

    if (Object.keys(patch).length === 0) {
      return err(400, "No plan fields to update.", "bad_request");
    }

    const { data, error } = await supabase
      .from("subscription_plans")
      .update(patch)
      .eq("id", planId)
      .eq("enterprise_id", enterpriseId)
      .select("*")
      .maybeSingle();

    if (error) return err(500, "Failed to update plan.", "db_error", error.message);
    if (!data) return err(404, "Plan not found.", "plan_not_found");

    return json(200, {
      ok: true,
      action: "update_plan",
      plan: mapPlan(data as JsonRecord),
      note: "Active wifi_sessions were not modified.",
    });
  }

  // Default: update enterprise free-tier policy only.
  const patch: Record<string, unknown> = {};
  const freeQuotaMb = asInt(body.free_quota_mb ?? body.freeQuotaMb);
  if (freeQuotaMb !== undefined) {
    if (freeQuotaMb < 0) return err(400, "free_quota_mb must be >= 0.", "bad_request");
    patch.free_quota_mb = freeQuotaMb;
  }
  const freeSessionMinutes = asInt(body.free_session_minutes ?? body.freeSessionMinutes);
  if (freeSessionMinutes !== undefined) {
    if (freeSessionMinutes < 1) {
      return err(400, "free_session_minutes must be >= 1.", "bad_request");
    }
    patch.free_session_minutes = freeSessionMinutes;
  }
  const defaultDownloadKbps = asInt(body.default_download_kbps ?? body.defaultDownloadKbps);
  if (defaultDownloadKbps !== undefined) {
    if (defaultDownloadKbps < 0) return err(400, "default_download_kbps invalid.", "bad_request");
    patch.default_download_kbps = defaultDownloadKbps;
  }
  const defaultUploadKbps = asInt(body.default_upload_kbps ?? body.defaultUploadKbps);
  if (defaultUploadKbps !== undefined) {
    if (defaultUploadKbps < 0) return err(400, "default_upload_kbps invalid.", "bad_request");
    patch.default_upload_kbps = defaultUploadKbps;
  }
  if (body.radius_coa_host !== undefined || body.radiusCoaHost !== undefined) {
    const v = body.radius_coa_host ?? body.radiusCoaHost;
    patch.radius_coa_host = v === null || v === "" ? null : asString(v) || null;
  }
  const radiusCoaPort = asInt(body.radius_coa_port ?? body.radiusCoaPort);
  if (radiusCoaPort !== undefined) {
    if (radiusCoaPort < 1 || radiusCoaPort > 65535) {
      return err(400, "radius_coa_port out of range.", "bad_request");
    }
    patch.radius_coa_port = radiusCoaPort;
  }
  if (typeof body.is_active === "boolean" || typeof body.isActive === "boolean") {
    patch.is_active = Boolean(body.is_active ?? body.isActive);
  }

  if (Object.keys(patch).length === 0) {
    return err(400, "No policy fields to update.", "bad_request");
  }

  const { data, error } = await supabase
    .from("enterprises")
    .update(patch)
    .eq("id", enterpriseId)
    .select("*")
    .maybeSingle();

  if (error) return err(500, "Failed to update enterprise policy.", "db_error", error.message);
  if (!data) return err(404, "Enterprise not found.", "enterprise_not_found");

  return json(200, {
    ok: true,
    action: "update_policy",
    enterprise: mapEnterprise(data as JsonRecord),
    note: "Active wifi_sessions were not modified; new authentications use these defaults.",
  });
}

export async function POST(request: Request): Promise<Response> {
  const supabase = getSupabaseService();
  if (!supabase) {
    return err(503, "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.", "misconfigured");
  }
  const user = await requireAuthUser(request);
  if (!user) return err(401, "Valid Bearer access token required.", "unauthorized");

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return err(400, "JSON body required.", "bad_request");
  }

  const enterpriseId = await resolveEnterpriseId(supabase, request, body);
  if (!enterpriseId) {
    return err(400, "enterprise_id or enterprise_slug is required.", "bad_request");
  }

  const member = await assertMember(supabase, enterpriseId, user, true);
  if (!member.ok) return member.response;

  const name = asString(body.name);
  if (!name) return err(400, "name is required.", "bad_request");

  const priceCents = asInt(body.price_cents ?? body.priceCents, 0);
  if (priceCents === undefined || priceCents < 0) {
    return err(400, "price_cents must be >= 0.", "bad_request");
  }

  const interval = asString(body.interval) || "session";
  const allowed = new Set(["session", "hourly", "daily", "monthly"]);
  if (!allowed.has(interval)) {
    return err(400, "interval must be session|hourly|daily|monthly.", "bad_request");
  }

  const insert: Record<string, unknown> = {
    enterprise_id: enterpriseId,
    name,
    description: asString(body.description) || null,
    stripe_price_id:
      asString(body.stripe_price_id) || asString(body.stripePriceId) || null,
    price_cents: priceCents,
    currency: (asString(body.currency) || "usd").toLowerCase(),
    interval,
    quota_mb: asNullableInt(body.quota_mb ?? body.quotaMb) ?? null,
    duration_minutes: asNullableInt(body.duration_minutes ?? body.durationMinutes) ?? null,
    download_kbps: asInt(body.download_kbps ?? body.downloadKbps, 0) ?? 0,
    upload_kbps: asInt(body.upload_kbps ?? body.uploadKbps, 0) ?? 0,
    sort_order: asInt(body.sort_order ?? body.sortOrder, 0) ?? 0,
    is_active: body.is_active === false || body.isActive === false ? false : true,
  };

  const { data, error } = await supabase
    .from("subscription_plans")
    .insert(insert)
    .select("*")
    .single();

  if (error || !data) {
    return err(500, "Failed to create plan.", "db_error", error?.message);
  }

  return json(201, {
    ok: true,
    action: "create_plan",
    plan: mapPlan(data as JsonRecord),
  });
}

export async function DELETE(request: Request): Promise<Response> {
  const supabase = getSupabaseService();
  if (!supabase) {
    return err(503, "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.", "misconfigured");
  }
  const user = await requireAuthUser(request);
  if (!user) return err(401, "Valid Bearer access token required.", "unauthorized");

  const url = new URL(request.url);
  const planId = asString(url.searchParams.get("plan_id"));
  if (!planId) return err(400, "plan_id query param required.", "bad_request");

  const enterpriseId = await resolveEnterpriseId(supabase, request);
  if (!enterpriseId) {
    return err(400, "enterprise_id or enterprise_slug is required.", "bad_request");
  }

  const member = await assertMember(supabase, enterpriseId, user, true);
  if (!member.ok) return member.response;

  const { data, error } = await supabase
    .from("subscription_plans")
    .update({ is_active: false })
    .eq("id", planId)
    .eq("enterprise_id", enterpriseId)
    .select("*")
    .maybeSingle();

  if (error) return err(500, "Failed to deactivate plan.", "db_error", error.message);
  if (!data) return err(404, "Plan not found.", "plan_not_found");

  return json(200, {
    ok: true,
    action: "deactivate_plan",
    plan: mapPlan(data as JsonRecord),
    note: "Plan deactivated; existing sessions keep their current entitlements.",
  });
}
