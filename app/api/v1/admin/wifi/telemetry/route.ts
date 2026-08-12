/**
 * TASK-5.1 — Enterprise Wi-Fi telemetry API.
 *
 * Assumptions:
 * 1. Admin calls with `Authorization: Bearer <supabase_access_token>`.
 * 2. Caller must have a `profiles` row for the target enterprise (or super_admin).
 * 3. Aggregations use service-role Supabase (RLS bypass after membership check).
 * 4. Revenue ≈ sum(plan.price_cents) for sessions that have plan_id set in the window
 *    (paid upgrades). Currency taken from the majority plan currency (default usd).
 * 5. Bandwidth chart series is derived from session byte totals bucketed by
 *    `date_trunc('hour', started_at)` — no separate metrics table yet.
 */

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import {
  loadProfileMembership,
  requireProfileForEnterprise,
} from "../../../../../../lib/wifi/profiles-auth.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;

interface ActiveUserRow {
  sessionId: string;
  deviceId: string;
  macAddress: string;
  status: string;
  startedAt: string;
  endsAt: string | null;
  inputOctets: number;
  outputOctets: number;
  usedBytes: number;
  quotaBytes: number;
  downloadKbps: number;
  uploadKbps: number;
  planId: string | null;
  planName: string | null;
}

interface BandwidthPoint {
  hour: string;
  inputBytes: number;
  outputBytes: number;
  totalBytes: number;
  sessionCount: number;
}

interface TelemetrySuccess {
  ok: true;
  enterprise: {
    id: string;
    slug: string;
    name: string;
  };
  window: {
    from: string;
    to: string;
    hours: number;
  };
  metrics: {
    activeSessions: number;
    activeDevices: number;
    totalDevices: number;
    bytesIn: number;
    bytesOut: number;
    bytesTotal: number;
    avgDownloadKbps: number;
    avgUploadKbps: number;
    revenueCents: number;
    currency: string;
    paidSessions: number;
  };
  activeUsers: ActiveUserRow[];
  bandwidth: BandwidthPoint[];
}

interface TelemetryError {
  ok: false;
  error: string;
  code:
    | "bad_request"
    | "unauthorized"
    | "forbidden"
    | "enterprise_not_found"
    | "misconfigured"
    | "db_error";
  details?: string;
}

function jsonResponse(status: number, body: TelemetrySuccess | TelemetryError): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function asString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
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

function parseHours(raw: string | null): number {
  if (!raw) return 24;
  const n = Number(raw);
  if (!Number.isFinite(n)) return 24;
  return Math.min(168, Math.max(1, Math.floor(n)));
}

function hourKey(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "invalid";
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const h = String(d.getUTCHours()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:00:00.000Z`;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, n) => acc + n, 0);
  return Math.round((sum / values.length) * 100) / 100;
}

export async function GET(request: Request): Promise<Response> {
  const supabase = getSupabaseService();
  if (!supabase) {
    return jsonResponse(503, {
      ok: false,
      error: "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.",
      code: "misconfigured",
    });
  }

  const user = await requireAuthUser(request);
  if (!user) {
    return jsonResponse(401, {
      ok: false,
      error: "Valid Bearer access token required.",
      code: "unauthorized",
    });
  }

  const url = new URL(request.url);
  const enterpriseIdParam = asString(url.searchParams.get("enterprise_id"));
  const enterpriseSlug =
    asString(url.searchParams.get("enterprise_slug")) ??
    asString(url.searchParams.get("slug"));
  const hours = parseHours(url.searchParams.get("hours"));

  let enterpriseId = enterpriseIdParam;
  if (!enterpriseId && enterpriseSlug) {
    const { data, error } = await supabase
      .from("enterprises")
      .select("id")
      .eq("slug", enterpriseSlug)
      .maybeSingle();
    if (error) {
      return jsonResponse(500, {
        ok: false,
        error: "Failed to resolve enterprise.",
        code: "db_error",
        details: error.message,
      });
    }
    if (!data) {
      return jsonResponse(404, {
        ok: false,
        error: "Enterprise not found.",
        code: "enterprise_not_found",
      });
    }
    enterpriseId = String((data as JsonRecord).id);
  }

  if (!enterpriseId) {
    // Default to caller's profile enterprise when unspecified.
    const loaded = await loadProfileMembership(supabase, user.id);
    if (loaded.error) {
      return jsonResponse(500, {
        ok: false,
        error: "Failed to load profile.",
        code: "db_error",
        details: loaded.error,
      });
    }
    enterpriseId = loaded.membership?.enterpriseId;
  }

  if (!enterpriseId) {
    return jsonResponse(400, {
      ok: false,
      error: "enterprise_id or enterprise_slug is required.",
      code: "bad_request",
    });
  }

  const access = await requireProfileForEnterprise(supabase, user, enterpriseId, false);
  if (!access.ok) {
    return jsonResponse(access.status, {
      ok: false,
      error: access.error,
      code: access.code as TelemetryError["code"],
      details: access.details,
    });
  }

  const { data: enterpriseRow, error: enterpriseError } = await supabase
    .from("enterprises")
    .select("id, slug, name")
    .eq("id", enterpriseId)
    .maybeSingle();

  if (enterpriseError || !enterpriseRow) {
    return jsonResponse(404, {
      ok: false,
      error: "Enterprise not found.",
      code: "enterprise_not_found",
      details: enterpriseError?.message,
    });
  }

  const to = new Date();
  const from = new Date(to.getTime() - hours * 60 * 60 * 1000);
  const fromIso = from.toISOString();
  const toIso = to.toISOString();

  const [
    activeSessionsResult,
    devicesResult,
    windowSessionsResult,
    plansResult,
  ] = await Promise.all([
    supabase
      .from("wifi_sessions")
      .select(
        "id, device_id, status, started_at, ends_at, input_octets, output_octets, quota_bytes, download_kbps, upload_kbps, plan_id, wifi_devices(mac_address)",
      )
      .eq("enterprise_id", enterpriseId)
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(200),
    supabase
      .from("wifi_devices")
      .select("id, status")
      .eq("enterprise_id", enterpriseId),
    supabase
      .from("wifi_sessions")
      .select(
        "id, started_at, input_octets, output_octets, download_kbps, upload_kbps, plan_id, status",
      )
      .eq("enterprise_id", enterpriseId)
      .gte("started_at", fromIso)
      .lte("started_at", toIso)
      .limit(5000),
    supabase
      .from("subscription_plans")
      .select("id, name, price_cents, currency")
      .eq("enterprise_id", enterpriseId),
  ]);

  if (activeSessionsResult.error || devicesResult.error || windowSessionsResult.error) {
    return jsonResponse(500, {
      ok: false,
      error: "Failed to aggregate telemetry.",
      code: "db_error",
      details:
        activeSessionsResult.error?.message ||
        devicesResult.error?.message ||
        windowSessionsResult.error?.message,
    });
  }

  const planById = new Map<string, { name: string; priceCents: number; currency: string }>();
  for (const row of plansResult.data || []) {
    const rec = row as JsonRecord;
    planById.set(String(rec.id), {
      name: String(rec.name),
      priceCents: Number(rec.price_cents ?? 0),
      currency: String(rec.currency ?? "usd"),
    });
  }

  const activeUsers: ActiveUserRow[] = (activeSessionsResult.data || []).map((row) => {
    const rec = row as JsonRecord;
    const deviceJoin = rec.wifi_devices;
    let mac = "";
    if (deviceJoin && typeof deviceJoin === "object" && !Array.isArray(deviceJoin)) {
      mac = String((deviceJoin as JsonRecord).mac_address ?? "");
    } else if (Array.isArray(deviceJoin) && deviceJoin[0]) {
      mac = String((deviceJoin[0] as JsonRecord).mac_address ?? "");
    }
    const inputOctets = Number(rec.input_octets ?? 0);
    const outputOctets = Number(rec.output_octets ?? 0);
    const planId = rec.plan_id == null ? null : String(rec.plan_id);
    return {
      sessionId: String(rec.id),
      deviceId: String(rec.device_id),
      macAddress: mac,
      status: String(rec.status),
      startedAt: String(rec.started_at),
      endsAt: rec.ends_at == null ? null : String(rec.ends_at),
      inputOctets,
      outputOctets,
      usedBytes: inputOctets + outputOctets,
      quotaBytes: Number(rec.quota_bytes ?? 0),
      downloadKbps: Number(rec.download_kbps ?? 0),
      uploadKbps: Number(rec.upload_kbps ?? 0),
      planId,
      planName: planId ? planById.get(planId)?.name ?? null : null,
    };
  });

  const activeDeviceIds = new Set(activeUsers.map((u) => u.deviceId));
  const totalDevices = (devicesResult.data || []).length;

  const windowSessions = (windowSessionsResult.data || []) as JsonRecord[];
  let bytesIn = 0;
  let bytesOut = 0;
  const downloadSpeeds: number[] = [];
  const uploadSpeeds: number[] = [];
  let revenueCents = 0;
  let paidSessions = 0;
  const currencyCounts = new Map<string, number>();

  const bucketMap = new Map<string, BandwidthPoint>();

  for (const rec of windowSessions) {
    const input = Number(rec.input_octets ?? 0);
    const output = Number(rec.output_octets ?? 0);
    bytesIn += input;
    bytesOut += output;
    downloadSpeeds.push(Number(rec.download_kbps ?? 0));
    uploadSpeeds.push(Number(rec.upload_kbps ?? 0));

    const planId = rec.plan_id == null ? null : String(rec.plan_id);
    if (planId && planById.has(planId)) {
      const plan = planById.get(planId)!;
      revenueCents += plan.priceCents;
      paidSessions += 1;
      currencyCounts.set(plan.currency, (currencyCounts.get(plan.currency) || 0) + 1);
    }

    const key = hourKey(String(rec.started_at));
    if (key === "invalid") continue;
    const existing = bucketMap.get(key) ?? {
      hour: key,
      inputBytes: 0,
      outputBytes: 0,
      totalBytes: 0,
      sessionCount: 0,
    };
    existing.inputBytes += input;
    existing.outputBytes += output;
    existing.totalBytes += input + output;
    existing.sessionCount += 1;
    bucketMap.set(key, existing);
  }

  // Fill empty hours for a continuous chart.
  const bandwidth: BandwidthPoint[] = [];
  for (let i = hours - 1; i >= 0; i -= 1) {
    const t = new Date(to.getTime() - i * 60 * 60 * 1000);
    const key = hourKey(t.toISOString());
    bandwidth.push(
      bucketMap.get(key) ?? {
        hour: key,
        inputBytes: 0,
        outputBytes: 0,
        totalBytes: 0,
        sessionCount: 0,
      },
    );
  }

  let currency = "usd";
  let best = 0;
  for (const [code, count] of currencyCounts) {
    if (count > best) {
      best = count;
      currency = code;
    }
  }

  return jsonResponse(200, {
    ok: true,
    enterprise: {
      id: String((enterpriseRow as JsonRecord).id),
      slug: String((enterpriseRow as JsonRecord).slug),
      name: String((enterpriseRow as JsonRecord).name),
    },
    window: { from: fromIso, to: toIso, hours },
    metrics: {
      activeSessions: activeUsers.length,
      activeDevices: activeDeviceIds.size,
      totalDevices,
      bytesIn,
      bytesOut,
      bytesTotal: bytesIn + bytesOut,
      avgDownloadKbps: average(downloadSpeeds),
      avgUploadKbps: average(uploadSpeeds),
      revenueCents,
      currency,
      paidSessions,
    },
    activeUsers,
    bandwidth,
  });
}
