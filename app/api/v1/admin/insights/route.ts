/**
 * Owner insights dashboard (read-only monitor).
 *
 * Aggregates three surfaces for the Demo Café owner:
 *   1. Wi‑Fi connections — live active sessions/devices (Supabase captive tables).
 *   2. Payments — live Stripe checkout sessions + collected charges (STRIPE_SECRET_KEY).
 *   3. Orders — Wi‑Fi plan subscriptions (wifi_sessions with plan_id) + QR menu scans
 *      (Prisma MenuScanEvent for the demo tenant).
 *
 * Auth: `Authorization: Bearer <supabase_access_token>` + a `profiles` row for the
 * enterprise (any member may view; read-only).
 */

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import {
  loadProfileMembership,
  requireProfileForEnterprise,
} from "../../../../../lib/wifi/profiles-auth.js";
import { getPrisma } from "../../../../../api/_lib/prisma.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;

interface InsightsSuccess {
  ok: true;
  enterprise: { id: string; slug: string; name: string };
  wifi: {
    activeSessions: number;
    activeDevices: number;
    totalDevices: number;
    connections: Array<{
      sessionId: string;
      macAddress: string;
      planName: string | null;
      startedAt: string;
    }>;
  };
  payments: {
    collectedCents: number;
    chargesCount: number;
    currency: string;
    note: string | null;
    recent: Array<{
      id: string;
      amountTotalCents: number;
      currency: string;
      paymentStatus: string;
      email: string | null;
      createdAt: string;
    }>;
  };
  orders: {
    subscriptions: Array<{
      sessionId: string;
      planName: string;
      priceCents: number;
      currency: string;
      startedAt: string;
    }>;
    menuScans: {
      total: number;
      recent: Array<{
        id: string;
        eventType: string;
        scannedAt: string;
        landingPath: string | null;
      }>;
    };
  };
}

interface InsightsError {
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

/** Demo Café Prisma tenant that records QR menu scans. */
const MENU_SCAN_TENANT_SLUG = "demo";

function jsonResponse(status: number, body: InsightsSuccess | InsightsError): Response {
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
  const header =
    request.headers.get("authorization") || request.headers.get("Authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
}

async function requireAuthUser(request: Request, supabase: SupabaseClient): Promise<User | null> {
  const token = getBearerToken(request);
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

async function stripeGet(path: string): Promise<JsonRecord | null> {
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret) return null;
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { authorization: `Bearer ${secret}` },
  });
  if (!response.ok) return null;
  return (await response.json()) as JsonRecord;
}

function unixToIso(seconds: number | undefined | null): string {
  if (!seconds) return "";
  const ms = Number(seconds) * 1000;
  return Number.isFinite(ms) ? new Date(ms).toISOString() : "";
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

  const user = await requireAuthUser(request, supabase);
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
      code: access.code as InsightsError["code"],
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

  // --- Wi-Fi + plans (Supabase) -------------------------------------------------
  const [activeSessionsResult, devicesResult, subscriptionsResult, plansResult] =
    await Promise.all([
      supabase
        .from("wifi_sessions")
        .select(
          "id, device_id, status, started_at, plan_id, wifi_devices(mac_address)",
        )
        .eq("enterprise_id", enterpriseId)
        .eq("status", "active")
        .order("started_at", { ascending: false })
        .limit(50),
      supabase
        .from("wifi_devices")
        .select("id")
        .eq("enterprise_id", enterpriseId),
      supabase
        .from("wifi_sessions")
        .select("id, plan_id, started_at")
        .eq("enterprise_id", enterpriseId)
        .not("plan_id", "is", null)
        .order("started_at", { ascending: false })
        .limit(50),
      supabase
        .from("subscription_plans")
        .select("id, name, price_cents, currency")
        .eq("enterprise_id", enterpriseId),
    ]);

  if (
    activeSessionsResult.error ||
    devicesResult.error ||
    subscriptionsResult.error ||
    plansResult.error
  ) {
    return jsonResponse(500, {
      ok: false,
      error: "Failed to aggregate Wi‑Fi data.",
      code: "db_error",
      details:
        activeSessionsResult.error?.message ||
        devicesResult.error?.message ||
        subscriptionsResult.error?.message ||
        plansResult.error?.message,
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

  const connections = (activeSessionsResult.data || []).map((row) => {
    const rec = row as JsonRecord;
    const deviceJoin = rec.wifi_devices;
    let mac = "";
    if (deviceJoin && typeof deviceJoin === "object" && !Array.isArray(deviceJoin)) {
      mac = String((deviceJoin as JsonRecord).mac_address ?? "");
    } else if (Array.isArray(deviceJoin) && deviceJoin[0]) {
      mac = String((deviceJoin[0] as JsonRecord).mac_address ?? "");
    }
    const planId = rec.plan_id == null ? null : String(rec.plan_id);
    return {
      sessionId: String(rec.id),
      macAddress: mac,
      planName: planId ? planById.get(planId)?.name ?? null : null,
      startedAt: String(rec.started_at ?? ""),
    };
  });

  const activeDeviceIds = new Set(
    (activeSessionsResult.data || []).map((row) => String((row as JsonRecord).device_id ?? "")),
  );
  activeDeviceIds.delete("");
  const activeDevices = activeDeviceIds.size;

  const subscriptions = (subscriptionsResult.data || []).map((row) => {
    const rec = row as JsonRecord;
    const planId = rec.plan_id == null ? null : String(rec.plan_id);
    const plan = planId ? planById.get(planId) : undefined;
    return {
      sessionId: String(rec.id),
      planName: plan?.name ?? "Plan",
      priceCents: plan?.priceCents ?? 0,
      currency: plan?.currency ?? "usd",
      startedAt: String(rec.started_at ?? ""),
    };
  });

  // --- Payments (Stripe, non-fatal) ---------------------------------------------
  let collectedCents = 0;
  let chargesCount = 0;
  let currency = "usd";
  let paymentNote: string | null = null;
  const recentCheckouts: InsightsSuccess["payments"]["recent"] = [];

  try {
    const [sessions, charges] = await Promise.all([
      stripeGet("/checkout/sessions?limit=20"),
      stripeGet("/charges?limit=20"),
    ]);

    if (sessions) {
      for (const row of (sessions.data as JsonRecord[]) || []) {
        recentCheckouts.push({
          id: String(row.id ?? ""),
          amountTotalCents: Number(row.amount_total ?? 0),
          currency: String(row.currency ?? "usd"),
          paymentStatus: String(row.payment_status ?? "unknown"),
          email: row.customer_details
            ? String((row.customer_details as JsonRecord).email ?? "") || null
            : null,
          createdAt: unixToIso(Number(row.created)),
        });
      }
    }

    if (charges) {
      const rows = (charges.data as JsonRecord[]) || [];
      chargesCount = rows.length;
      collectedCents = rows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
      if (rows.length > 0) {
        currency = String(rows[0].currency ?? "usd");
      }
    }
  } catch {
    paymentNote = "Stripe is unavailable right now.";
  }

  // --- Orders: menu scans (Prisma, non-fatal) ------------------------------------
  let menuScans: InsightsSuccess["orders"]["menuScans"] = { total: 0, recent: [] };
  const prisma = getPrisma();
  if (prisma) {
    try {
      const tenant = await prisma.tenant.findFirst({
        where: { slug: MENU_SCAN_TENANT_SLUG },
        select: { id: true },
      });
      if (tenant) {
        const [total, recent] = await Promise.all([
          prisma.menuScanEvent.count({ where: { tenantId: tenant.id } }),
          prisma.menuScanEvent.findMany({
            where: { tenantId: tenant.id },
            orderBy: { scannedAt: "desc" },
            take: 10,
            select: { id: true, eventType: true, scannedAt: true, landingPath: true },
          }),
        ]);
        menuScans = {
          total,
          recent: recent.map(
            (row: {
              id: string;
              eventType: string;
              scannedAt: Date;
              landingPath: string | null;
            }) => ({
              id: row.id,
              eventType: row.eventType,
              scannedAt: row.scannedAt.toISOString(),
              landingPath: row.landingPath,
            }),
          ),
        };
      }
    } catch {
      // Keep empty; menu scans are optional for the dashboard.
    }
  }

  return jsonResponse(200, {
    ok: true,
    enterprise: {
      id: String((enterpriseRow as JsonRecord).id),
      slug: String((enterpriseRow as JsonRecord).slug),
      name: String((enterpriseRow as JsonRecord).name),
    },
    wifi: {
      activeSessions: connections.length,
      activeDevices,
      totalDevices: (devicesResult.data || []).length,
      connections,
    },
    payments: {
      collectedCents,
      chargesCount,
      currency,
      note: paymentNote,
      recent: recentCheckouts,
    },
    orders: {
      subscriptions,
      menuScans,
    },
  });
}
