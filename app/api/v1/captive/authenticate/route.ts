/**
 * TASK-3.1 — Captive portal authenticate endpoint.
 *
 * Device onboarding, blocked checks, and in-quota session reuse are handled by
 * NetworkSessionController (lib/network); this route owns gateway validation
 * (HMAC, enterprise, MAC) and response shaping only.
 *
 * Assumptions (stated):
 * 1. Gateway redirects with signed query params: mac, ap_id, challenge, sig|hmac|token,
 *    plus enterprise_id or enterprise_slug to select the tenant.
 * 2. Optional: acct_session_id, ts (unix seconds for skew checks).
 * 3. Captive traffic is unauthenticated → Supabase service role
 *    (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY) bypasses RLS for device/session writes.
 * 4. Handler uses Web Request/Response (Next.js App Router compatible) without importing
 *    `next/server`, so this Vite-based OmniTaps repo does not require the `next` package.
 * 5. Free-tier quotas come from enterprises.free_quota_mb / free_session_minutes;
 *    speeds from default_download_kbps / default_upload_kbps.
 * 6. Verified devices with an in-quota ACTIVE session are reused; otherwise the guest
 *    must complete OTP identity verification before a free session is provisioned.
 *    Blocked devices receive HTTP 403.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Enterprise } from "../../../../../db/schema/wifi.js";
import { createCaptiveController } from "../../../../../lib/network/createCaptiveController.js";
import { NetworkStatus } from "../../../../../lib/network/types.js";
import type { NetworkSession } from "../../../../../lib/network/types.js";
import type { StoredDevice } from "../../../../../lib/network/stores/SessionStore.js";
import {
  parseGatewayQuery,
  verifyGatewayHmac,
  type GatewayQueryParams,
} from "../../../../../lib/wifi/HMAC-verifier.js";
import { buildDeviceFingerprint, normalizeMac } from "../../../../../lib/wifi/mac-utils.js";
import { calculateSessionQuota } from "../../../../../lib/wifi/quota-calculator.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;

interface AuthenticatePendingBody {
  ok: true;
  needsVerification: true;
  networkStatus: typeof NetworkStatus.PENDING_VERIFICATION;
  isNewDevice: boolean;
  enterprise: {
    id: string;
    slug: string;
    name: string;
  };
  device: {
    id: string;
    macAddress: string;
    status: string;
    deviceFingerprint: string | null;
  };
}

interface AuthenticateSuccessBody {
  ok: true;
  needsVerification?: false;
  networkStatus?: typeof NetworkStatus.CONNECTED;
  isNewDevice: boolean;
  isNewSession: boolean;
  enterprise: {
    id: string;
    slug: string;
    name: string;
  };
  device: {
    id: string;
    macAddress: string;
    status: string;
    deviceFingerprint: string | null;
  };
  session: {
    id: string;
    status: string;
    startedAt: string;
    endsAt: string | null;
    acctSessionId: string | null;
    apId: string | null;
    downloadKbps: number;
    uploadKbps: number;
    quotaBytes: number;
  };
  quota: {
    usedBytes: number;
    remainingBytes: number;
    usedMb: number;
    remainingMb: number;
    percentUsed: number;
    remainingSeconds: number | null;
    isExhausted: boolean;
  };
  speedRules: {
    downloadKbps: number;
    uploadKbps: number;
  };
}

interface AuthenticateErrorBody {
  ok: false;
  error: string;
  code:
    | "bad_request"
    | "missing_enterprise"
    | "enterprise_not_found"
    | "enterprise_inactive"
    | "invalid_signature"
    | "invalid_mac"
    | "device_blocked"
    | "misconfigured"
    | "db_error";
  details?: string;
}

function jsonResponse(
  status: number,
  body: AuthenticateSuccessBody | AuthenticatePendingBody | AuthenticateErrorBody,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function getSupabaseService(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    return null;
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function asString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function mapEnterprise(row: JsonRecord): Enterprise {
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    freeQuotaMb: Number(row.free_quota_mb ?? 100),
    freeSessionMinutes: Number(row.free_session_minutes ?? 60),
    defaultDownloadKbps: Number(row.default_download_kbps ?? 0),
    defaultUploadKbps: Number(row.default_upload_kbps ?? 0),
    gatewayHmacSecret: String(row.gateway_hmac_secret ?? ""),
    radiusCoaHost: row.radius_coa_host == null ? null : String(row.radius_coa_host),
    radiusCoaPort: Number(row.radius_coa_port ?? 3799),
    radiusSecret: row.radius_secret == null ? null : String(row.radius_secret),
    stripeCustomerId:
      row.stripe_customer_id == null ? null : String(row.stripe_customer_id),
    isActive: Boolean(row.is_active ?? true),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  };
}

async function readParams(request: Request): Promise<GatewayQueryParams & {
  enterprise_id?: string;
  enterprise_slug?: string;
  acct_session_id?: string;
}> {
  const url = new URL(request.url);
  const fromQuery = parseGatewayQuery(url.search);

  let fromBody: Record<string, string> = {};
  if (request.method === "POST" || request.method === "PUT") {
    const contentType = request.headers.get("content-type") || "";
    try {
      if (contentType.includes("application/json")) {
        const raw = (await request.json()) as Record<string, unknown>;
        for (const [key, value] of Object.entries(raw)) {
          if (value === undefined || value === null) continue;
          fromBody[key] = String(value);
        }
      } else if (
        contentType.includes("application/x-www-form-urlencoded") ||
        contentType.includes("multipart/form-data")
      ) {
        const form = await request.formData();
        for (const [key, value] of form.entries()) {
          if (typeof value === "string") {
            fromBody[key] = value;
          }
        }
      }
    } catch {
      // fall through with query-only params
    }
  }

  return {
    ...fromQuery,
    ...fromBody,
    enterprise_id: asString(fromBody.enterprise_id) ?? asString(url.searchParams.get("enterprise_id")),
    enterprise_slug:
      asString(fromBody.enterprise_slug) ??
      asString(url.searchParams.get("enterprise_slug")) ??
      asString(fromBody.slug) ??
      asString(url.searchParams.get("slug")),
    acct_session_id:
      asString(fromBody.acct_session_id) ??
      asString(url.searchParams.get("acct_session_id")),
  };
}

async function loadEnterprise(
  supabase: SupabaseClient,
  params: { enterprise_id?: string; enterprise_slug?: string },
): Promise<{ enterprise: Enterprise | null; error?: string }> {
  if (params.enterprise_id) {
    const { data, error } = await supabase
      .from("enterprises")
      .select("*")
      .eq("id", params.enterprise_id)
      .maybeSingle();
    if (error) return { enterprise: null, error: error.message };
    return { enterprise: data ? mapEnterprise(data as JsonRecord) : null };
  }

  if (params.enterprise_slug) {
    const { data, error } = await supabase
      .from("enterprises")
      .select("*")
      .eq("slug", params.enterprise_slug)
      .maybeSingle();
    if (error) return { enterprise: null, error: error.message };
    return { enterprise: data ? mapEnterprise(data as JsonRecord) : null };
  }

  return { enterprise: null };
}

function buildPending(input: {
  enterprise: Enterprise;
  device: StoredDevice;
  isNewDevice: boolean;
}): AuthenticatePendingBody {
  const { enterprise, device, isNewDevice } = input;
  return {
    ok: true,
    needsVerification: true,
    networkStatus: NetworkStatus.PENDING_VERIFICATION,
    isNewDevice,
    enterprise: {
      id: enterprise.id,
      slug: enterprise.slug,
      name: enterprise.name,
    },
    device: {
      id: device.id,
      macAddress: device.macAddress,
      status: device.status,
      deviceFingerprint: device.deviceFingerprint,
    },
  };
}

function buildSuccess(input: {
  enterprise: Enterprise;
  device: StoredDevice;
  session: NetworkSession;
  isNewDevice: boolean;
  isNewSession: boolean;
}): AuthenticateSuccessBody {
  const { enterprise, device, session, isNewDevice, isNewSession } = input;
  const quota = calculateSessionQuota({
    inputOctets: session.bytesUp,
    outputOctets: session.bytesDown,
    quotaBytes: session.quotaBytes,
    startedAt: session.startedAt,
    endsAt: session.endsAt,
  });

  return {
    ok: true,
    needsVerification: false,
    networkStatus: NetworkStatus.CONNECTED,
    isNewDevice,
    isNewSession,
    enterprise: {
      id: enterprise.id,
      slug: enterprise.slug,
      name: enterprise.name,
    },
    device: {
      id: device.id,
      macAddress: device.macAddress,
      status: device.status,
      deviceFingerprint: device.deviceFingerprint,
    },
    session: {
      id: session.id,
      status: session.status,
      startedAt: session.startedAt,
      endsAt: session.endsAt,
      acctSessionId: session.acctSessionId,
      apId: session.apId,
      downloadKbps: session.downloadKbps,
      uploadKbps: session.uploadKbps,
      quotaBytes: session.quotaBytes,
    },
    quota: {
      usedBytes: quota.usedBytes,
      remainingBytes: quota.remainingBytes,
      usedMb: quota.usedMb,
      remainingMb: quota.remainingMb,
      percentUsed: quota.percentUsed,
      remainingSeconds: quota.remainingSeconds,
      isExhausted: quota.isExhausted,
    },
    speedRules: {
      downloadKbps: session.downloadKbps,
      uploadKbps: session.uploadKbps,
    },
  };
}

async function handleAuthenticate(request: Request): Promise<Response> {
  const supabase = getSupabaseService();
  if (!supabase) {
    return jsonResponse(503, {
      ok: false,
      error: "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.",
      code: "misconfigured",
    });
  }

  const params = await readParams(request);
  const enterpriseId = asString(params.enterprise_id);
  const enterpriseSlug = asString(params.enterprise_slug);

  if (!enterpriseId && !enterpriseSlug) {
    return jsonResponse(400, {
      ok: false,
      error: "Provide enterprise_id or enterprise_slug.",
      code: "missing_enterprise",
    });
  }

  if (!asString(params.mac) || !asString(params.ap_id) || !asString(params.challenge)) {
    return jsonResponse(400, {
      ok: false,
      error: "mac, ap_id, and challenge are required.",
      code: "bad_request",
    });
  }

  if (!asString(params.sig) && !asString(params.hmac) && !asString(params.token)) {
    return jsonResponse(400, {
      ok: false,
      error: "Missing gateway signature (sig, hmac, or token).",
      code: "bad_request",
    });
  }

  const loaded = await loadEnterprise(supabase, {
    enterprise_id: enterpriseId,
    enterprise_slug: enterpriseSlug,
  });

  if (loaded.error) {
    return jsonResponse(500, {
      ok: false,
      error: "Failed to load enterprise.",
      code: "db_error",
      details: loaded.error,
    });
  }

  if (!loaded.enterprise) {
    return jsonResponse(404, {
      ok: false,
      error: "Enterprise not found.",
      code: "enterprise_not_found",
    });
  }

  const enterprise = loaded.enterprise;
  if (!enterprise.isActive) {
    return jsonResponse(403, {
      ok: false,
      error: "Enterprise is inactive.",
      code: "enterprise_inactive",
    });
  }

  if (!enterprise.gatewayHmacSecret || enterprise.gatewayHmacSecret.length < 16) {
    return jsonResponse(503, {
      ok: false,
      error: "Enterprise gateway HMAC secret is not configured.",
      code: "misconfigured",
    });
  }

  const hmac = verifyGatewayHmac(params, {
    secret: enterprise.gatewayHmacSecret,
    maxSkewSeconds: 300,
  });

  if (!hmac.ok) {
    const status = hmac.reason === "invalid_mac" ? 400 : 401;
    return jsonResponse(status, {
      ok: false,
      error: `Gateway signature verification failed (${hmac.reason ?? "unknown"}).`,
      code: hmac.reason === "invalid_mac" ? "invalid_mac" : "invalid_signature",
      details: hmac.reason,
    });
  }

  const normalized = normalizeMac(params.mac);
  if (!normalized) {
    return jsonResponse(400, {
      ok: false,
      error: "Invalid station MAC address.",
      code: "invalid_mac",
    });
  }

  const apId = asString(params.ap_id) ?? null;
  const acctSessionId = asString(params.acct_session_id) ?? null;

  const controller = createCaptiveController(supabase, enterprise);

  const { device, isNew: isNewDevice } = await controller.onboard({
    enterpriseId: enterprise.id,
    macAddress: normalized.canonical,
    apId,
    deviceFingerprint: buildDeviceFingerprint(normalized.canonical, [apId]),
  });

  if (device.status === "blocked") {
    return jsonResponse(403, {
      ok: false,
      error: "Device is blocked from this network.",
      code: "device_blocked",
    });
  }

  if (!device.identityVerifiedAt) {
    return jsonResponse(
      200,
      buildPending({
        enterprise,
        device,
        isNewDevice,
      }),
    );
  }

  let session = await controller.getActiveSession(device.id);
  if (!session) {
    return jsonResponse(
      200,
      buildPending({
        enterprise,
        device,
        isNewDevice,
      }),
    );
  }

  if (acctSessionId && !session.acctSessionId) {
    session = await controller.attachAcctContext(session.id, {
      acctSessionId,
      apId,
    });
  }

  return jsonResponse(
    200,
    buildSuccess({
      enterprise,
      device,
      session,
      isNewDevice,
      isNewSession: false,
    }),
  );
}

export async function GET(request: Request): Promise<Response> {
  return handleAuthenticate(request);
}

export async function POST(request: Request): Promise<Response> {
  return handleAuthenticate(request);
}
