/**
 * TASK-3.3 — Captive OTP identity verification (start / verify).
 *
 * HMAC gateway params prove AP/device context; OTP proves guest identity before
 * a free-tier session is provisioned via NetworkSessionController.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Enterprise } from "../../../../../db/schema/wifi.js";
import {
  NetworkModuleError,
  OtpResendCooldownError,
} from "../../../../../lib/network/errors.js";
import {
  limitsFromEnterprise,
  toNetworkSession,
} from "../../../../../lib/network/NetworkSessionController.js";
import {
  parseIdentityInput,
  shouldEchoCaptiveOtp,
} from "../../../../../lib/network/IdentityVerificationService.js";
import { createCaptiveController } from "../../../../../lib/network/createCaptiveController.js";
import { calculateSessionQuota } from "../../../../../lib/wifi/quota-calculator.js";
import {
  parseGatewayQuery,
  verifyGatewayHmac,
  type GatewayQueryParams,
} from "../../../../../lib/wifi/HMAC-verifier.js";
import { normalizeMac } from "../../../../../lib/wifi/mac-utils.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;

interface OtpSuccessBody {
  ok: true;
  action: "start" | "verify";
  challengeId?: string;
  expiresAt?: string;
  resendAvailableAt?: string;
  code?: string;
  session?: {
    id: string;
    status: string;
    startedAt: string;
    endsAt: string | null;
    quotaBytes: number;
    downloadKbps: number;
    uploadKbps: number;
  };
  quota?: {
    usedBytes: number;
    remainingBytes: number;
    usedMb: number;
    remainingMb: number;
    percentUsed: number;
    remainingSeconds: number | null;
    isExhausted: boolean;
  };
  enterprise: { id: string; slug: string; name: string };
  device: { id: string; macAddress: string };
}

interface OtpErrorBody {
  ok: false;
  error: string;
  code: string;
  retryAfterSeconds?: number;
  details?: string;
}

function jsonResponse(status: number, body: OtpSuccessBody | OtpErrorBody): Response {
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
  if (!url || !key) return null;
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

async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return (await request.json()) as Record<string, unknown>;
    }
  } catch {
    // fall through
  }
  return {};
}

function gatewayParamsFromBody(body: Record<string, unknown>): GatewayQueryParams & {
  enterprise_id?: string;
  enterprise_slug?: string;
} {
  const url = new URL("http://local");
  for (const [key, value] of Object.entries(body)) {
    if (value === undefined || value === null) continue;
    url.searchParams.set(key, String(value));
  }
  const parsed = parseGatewayQuery(url.search);
  return {
    ...parsed,
    enterprise_id: asString(body.enterprise_id),
    enterprise_slug:
      asString(body.enterprise_slug) ?? asString(body.slug),
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

async function validateGateway(
  supabase: SupabaseClient,
  body: Record<string, unknown>,
): Promise<
  | { ok: true; enterprise: Enterprise; deviceId: string; mac: string; apId: string | null; acctSessionId: string | null }
  | { ok: false; status: number; body: OtpErrorBody }
> {
  const params = gatewayParamsFromBody(body);
  const enterpriseId = params.enterprise_id;
  const enterpriseSlug = params.enterprise_slug;

  if (!enterpriseId && !enterpriseSlug) {
    return {
      ok: false,
      status: 400,
      body: { ok: false, error: "Provide enterprise_id or enterprise_slug.", code: "missing_enterprise" },
    };
  }

  const loaded = await loadEnterprise(supabase, {
    enterprise_id: enterpriseId,
    enterprise_slug: enterpriseSlug,
  });
  if (loaded.error) {
    return {
      ok: false,
      status: 500,
      body: { ok: false, error: "Failed to load enterprise.", code: "db_error", details: loaded.error },
    };
  }
  if (!loaded.enterprise) {
    return {
      ok: false,
      status: 404,
      body: { ok: false, error: "Enterprise not found.", code: "enterprise_not_found" },
    };
  }

  const enterprise = loaded.enterprise;
  if (!enterprise.isActive) {
    return {
      ok: false,
      status: 403,
      body: { ok: false, error: "Enterprise is inactive.", code: "enterprise_inactive" },
    };
  }
  if (!enterprise.gatewayHmacSecret || enterprise.gatewayHmacSecret.length < 16) {
    return {
      ok: false,
      status: 503,
      body: { ok: false, error: "Gateway HMAC secret not configured.", code: "misconfigured" },
    };
  }

  const hmac = verifyGatewayHmac(params, {
    secret: enterprise.gatewayHmacSecret,
    maxSkewSeconds: 300,
  });
  if (!hmac.ok) {
    const status = hmac.reason === "invalid_mac" ? 400 : 401;
    return {
      ok: false,
      status,
      body: {
        ok: false,
        error: `Gateway signature verification failed (${hmac.reason ?? "unknown"}).`,
        code: hmac.reason === "invalid_mac" ? "invalid_mac" : "invalid_signature",
        details: hmac.reason,
      },
    };
  }

  const normalized = normalizeMac(params.mac);
  if (!normalized) {
    return {
      ok: false,
      status: 400,
      body: { ok: false, error: "Invalid station MAC address.", code: "invalid_mac" },
    };
  }

  const deviceId = asString(body.device_id);
  if (!deviceId) {
    return {
      ok: false,
      status: 400,
      body: { ok: false, error: "device_id is required.", code: "bad_request" },
    };
  }

  const { data: deviceRow, error: deviceError } = await supabase
    .from("wifi_devices")
    .select("*")
    .eq("id", deviceId)
    .eq("enterprise_id", enterprise.id)
    .eq("mac_address", normalized.canonical)
    .maybeSingle();

  if (deviceError || !deviceRow) {
    return {
      ok: false,
      status: 404,
      body: { ok: false, error: "Device not found for MAC.", code: "device_not_found" },
    };
  }

  return {
    ok: true,
    enterprise,
    deviceId,
    mac: normalized.canonical,
    apId: asString(params.ap_id) ?? null,
    acctSessionId: asString(body.acct_session_id) ?? asString(params.acct_session_id) ?? null,
  };
}

function buildVerifySuccess(
  enterprise: Enterprise,
  mac: string,
  session: ReturnType<typeof toNetworkSession>,
): OtpSuccessBody {
  const quota = calculateSessionQuota({
    inputOctets: session.bytesUp,
    outputOctets: session.bytesDown,
    quotaBytes: session.quotaBytes,
    startedAt: session.startedAt,
    endsAt: session.endsAt,
  });

  return {
    ok: true,
    action: "verify",
    enterprise: { id: enterprise.id, slug: enterprise.slug, name: enterprise.name },
    device: { id: session.deviceId, macAddress: mac },
    session: {
      id: session.id,
      status: session.status,
      startedAt: session.startedAt,
      endsAt: session.endsAt,
      quotaBytes: session.quotaBytes,
      downloadKbps: session.downloadKbps,
      uploadKbps: session.uploadKbps,
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
  };
}

async function handleOtp(request: Request): Promise<Response> {
  const supabase = getSupabaseService();
  if (!supabase) {
    return jsonResponse(503, {
      ok: false,
      error: "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.",
      code: "misconfigured",
    });
  }

  const body = await readBody(request);
  const action = asString(body.action);
  if (action !== "start" && action !== "verify") {
    return jsonResponse(400, {
      ok: false,
      error: 'action must be "start" or "verify".',
      code: "bad_request",
    });
  }

  const gate = await validateGateway(supabase, body);
  if (!gate.ok) {
    return jsonResponse(gate.status, gate.body);
  }

  const { enterprise, deviceId, mac, apId, acctSessionId } = gate;
  const controller = createCaptiveController(supabase, enterprise);

  try {
    if (action === "start") {
      const identity = parseIdentityInput({
        email: asString(body.email),
        phone: asString(body.phone),
        phone_number: asString(body.phone_number),
        kind: asString(body.kind),
        value: asString(body.value),
      });

      const issued = await controller.issueVerification({
        enterpriseId: enterprise.id,
        deviceId,
        identity,
        echoCode: shouldEchoCaptiveOtp(),
      });

      return jsonResponse(200, {
        ok: true,
        action: "start",
        challengeId: issued.challengeId,
        expiresAt: issued.expiresAt,
        resendAvailableAt: issued.resendAvailableAt,
        ...(issued.code ? { code: issued.code } : {}),
        enterprise: { id: enterprise.id, slug: enterprise.slug, name: enterprise.name },
        device: { id: deviceId, macAddress: mac },
      });
    }

    const code = asString(body.code);
    if (!code) {
      return jsonResponse(400, {
        ok: false,
        error: "code is required for verify.",
        code: "bad_request",
      });
    }

    const session = await controller.verifyAndProvision({
      deviceId,
      code,
      challengeId: asString(body.challenge_id),
      limits: limitsFromEnterprise(enterprise),
      downloadKbps: enterprise.defaultDownloadKbps,
      uploadKbps: enterprise.defaultUploadKbps,
      acctSessionId,
      apId,
    });

    return jsonResponse(200, buildVerifySuccess(enterprise, mac, session));
  } catch (error) {
    if (error instanceof OtpResendCooldownError) {
      return jsonResponse(429, {
        ok: false,
        error: error.message,
        code: error.code,
        retryAfterSeconds: error.retryAfterSeconds,
      });
    }
    if (error instanceof NetworkModuleError) {
      const status =
        error.code === "duplicate_connection"
          ? 409
          : error.code.startsWith("otp_")
            ? 400
            : 404;
      return jsonResponse(status, {
        ok: false,
        error: error.message,
        code: error.code,
      });
    }
    return jsonResponse(500, {
      ok: false,
      error: error instanceof Error ? error.message : "OTP request failed.",
      code: "internal_error",
    });
  }
}

export async function POST(request: Request): Promise<Response> {
  return handleOtp(request);
}
