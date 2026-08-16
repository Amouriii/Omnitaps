/**
 * TASK-3.2 — Captive checkout create + Stripe payment webhook.
 *
 * Assumptions:
 * 1. No `stripe` npm package — use Stripe HTTPS API + native HMAC webhook verify
 *    (Stripe-Signature: t=…,v1=…) with STRIPE_WEBHOOK_SECRET / STRIPE_SECRET_KEY.
 * 2. POST without Stripe-Signature → create Checkout Session for a wifi session + plan.
 * 3. POST with Stripe-Signature → webhook; on checkout.session.completed upgrade DB
 *    quotas/speeds and fire RADIUS CoA bandwidth update immediately.
 * 4. Checkout Session metadata carries wifi_session_id, plan_id, enterprise_id, mac.
 * 5. Service-role Supabase for session/plan writes.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  type Enterprise,
  type SubscriptionPlan,
  type WifiDevice,
  type WifiSession,
} from "../../../../../db/schema/wifi.js";
import { createCaptiveController } from "../../../../../lib/network/createCaptiveController.js";
import { toNetworkSession } from "../../../../../lib/network/NetworkSessionController.js";
import type { NetworkSession } from "../../../../../lib/network/types.js";
import {
  buildQuotaEntitlements,
  calculateSessionQuota,
} from "../../../../../lib/wifi/quota-calculator.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;

interface CheckoutCreateSuccess {
  ok: true;
  mode: "checkout_create";
  checkoutSessionId: string;
  url: string;
  publishableKey: string | null;
}

interface CheckoutWebhookSuccess {
  ok: true;
  mode: "webhook";
  handled: boolean;
  eventType: string;
  wifiSessionId?: string;
  planId?: string;
  coa?: {
    attempted: boolean;
    acknowledged?: boolean;
    error?: string;
  };
  session?: {
    id: string;
    status: string;
    quotaBytes: number;
    downloadKbps: number;
    uploadKbps: number;
    endsAt: string | null;
  };
  quota?: {
    remainingBytes: number;
    remainingMb: number;
    remainingSeconds: number | null;
  };
}

interface CheckoutErrorBody {
  ok: false;
  error: string;
  code:
    | "bad_request"
    | "misconfigured"
    | "session_not_found"
    | "plan_not_found"
    | "plan_inactive"
    | "stripe_error"
    | "invalid_signature"
    | "db_error";
  details?: string;
}

function jsonResponse(
  status: number,
  body: CheckoutCreateSuccess | CheckoutWebhookSuccess | CheckoutErrorBody,
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

function mapSession(row: JsonRecord): WifiSession {
  return {
    id: String(row.id),
    enterpriseId: String(row.enterprise_id),
    deviceId: String(row.device_id),
    planId: row.plan_id == null ? null : String(row.plan_id),
    status: String(row.status) as WifiSession["status"],
    acctSessionId: row.acct_session_id == null ? null : String(row.acct_session_id),
    apId: row.ap_id == null ? null : String(row.ap_id),
    startedAt: String(row.started_at ?? new Date().toISOString()),
    endsAt: row.ends_at == null ? null : String(row.ends_at),
    disconnectedAt:
      row.disconnected_at == null ? null : String(row.disconnected_at),
    inputOctets: Number(row.input_octets ?? 0),
    outputOctets: Number(row.output_octets ?? 0),
    quotaBytes: Number(row.quota_bytes ?? 0),
    downloadKbps: Number(row.download_kbps ?? 0),
    uploadKbps: Number(row.upload_kbps ?? 0),
    stripeCheckoutSessionId:
      row.stripe_checkout_session_id == null
        ? null
        : String(row.stripe_checkout_session_id),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  };
}

function mapDevice(row: JsonRecord): WifiDevice {
  return {
    id: String(row.id),
    enterpriseId: String(row.enterprise_id),
    macAddress: String(row.mac_address),
    deviceFingerprint:
      row.device_fingerprint == null ? null : String(row.device_fingerprint),
    displayName: row.display_name == null ? null : String(row.display_name),
    status: String(row.status) as WifiDevice["status"],
    email: row.email == null ? null : String(row.email),
    phoneNumber: row.phone_number == null ? null : String(row.phone_number),
    identityVerifiedAt:
      row.identity_verified_at == null ? null : String(row.identity_verified_at),
    firstSeenAt: String(row.first_seen_at ?? new Date().toISOString()),
    lastSeenAt: String(row.last_seen_at ?? new Date().toISOString()),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  };
}

function mapPlan(row: JsonRecord): SubscriptionPlan {
  return {
    id: String(row.id),
    enterpriseId: String(row.enterprise_id),
    name: String(row.name),
    description: row.description == null ? null : String(row.description),
    stripePriceId: row.stripe_price_id == null ? null : String(row.stripe_price_id),
    priceCents: Number(row.price_cents ?? 0),
    currency: String(row.currency ?? "usd"),
    interval: String(row.interval) as SubscriptionPlan["interval"],
    quotaMb: row.quota_mb == null ? null : Number(row.quota_mb),
    durationMinutes:
      row.duration_minutes == null ? null : Number(row.duration_minutes),
    downloadKbps: Number(row.download_kbps ?? 0),
    uploadKbps: Number(row.upload_kbps ?? 0),
    sortOrder: Number(row.sort_order ?? 0),
    isActive: Boolean(row.is_active ?? true),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  };
}

function safeEqualHex(a: string, b: string): boolean {
  try {
    const left = Buffer.from(a, "hex");
    const right = Buffer.from(b, "hex");
    if (left.length !== right.length || left.length === 0) {
      return false;
    }
    return timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

/**
 * Verify Stripe webhook signature without the Stripe SDK.
 * https://stripe.com/docs/webhooks/signatures
 */
export function verifyStripeWebhookSignature(input: {
  rawBody: string;
  signatureHeader: string | null;
  secret: string;
  toleranceSeconds?: number;
  nowSeconds?: number;
}): { ok: true; timestamp: number } | { ok: false; reason: string } {
  const header = input.signatureHeader?.trim();
  if (!header) {
    return { ok: false, reason: "missing_header" };
  }
  if (!input.secret) {
    return { ok: false, reason: "missing_secret" };
  }

  const parts = header.split(",").map((part) => part.trim());
  let timestamp: number | null = null;
  const v1Signatures: string[] = [];

  for (const part of parts) {
    const [key, value] = part.split("=");
    if (key === "t" && value) {
      timestamp = Number(value);
    } else if (key === "v1" && value) {
      v1Signatures.push(value);
    }
  }

  if (!timestamp || !Number.isFinite(timestamp) || v1Signatures.length === 0) {
    return { ok: false, reason: "malformed_header" };
  }

  const tolerance = input.toleranceSeconds ?? 300;
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > tolerance) {
    return { ok: false, reason: "timestamp_skew" };
  }

  const signedPayload = `${timestamp}.${input.rawBody}`;
  const expected = createHmac("sha256", input.secret)
    .update(signedPayload, "utf8")
    .digest("hex");

  const matched = v1Signatures.some((candidate) => safeEqualHex(candidate, expected));
  if (!matched) {
    return { ok: false, reason: "signature_mismatch" };
  }

  return { ok: true, timestamp };
}

async function stripeApi(
  method: "GET" | "POST",
  path: string,
  body?: URLSearchParams,
): Promise<{ ok: true; data: JsonRecord } | { ok: false; status: number; message: string }> {
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret) {
    return { ok: false, status: 503, message: "STRIPE_SECRET_KEY is not configured." };
  }

  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      authorization: `Bearer ${secret}`,
      ...(body
        ? { "content-type": "application/x-www-form-urlencoded" }
        : {}),
    },
    body: body?.toString(),
  });

  const json = (await response.json()) as JsonRecord;
  if (!response.ok) {
    const message =
      typeof json.error === "object" &&
      json.error &&
      "message" in (json.error as object)
        ? String((json.error as { message?: string }).message)
        : `Stripe API error (${response.status})`;
    return { ok: false, status: response.status, message };
  }

  return { ok: true, data: json };
}

async function createCheckoutSession(request: Request): Promise<Response> {
  const supabase = getSupabaseService();
  if (!supabase) {
    return jsonResponse(503, {
      ok: false,
      error: "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.",
      code: "misconfigured",
    });
  }

  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    return jsonResponse(503, {
      ok: false,
      error: "STRIPE_SECRET_KEY is required to create checkout sessions.",
      code: "misconfigured",
    });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse(400, {
      ok: false,
      error: "JSON body required.",
      code: "bad_request",
    });
  }

  const wifiSessionId = asString(body.session_id) ?? asString(body.wifi_session_id);
  const planId = asString(body.plan_id);
  const successUrl =
    asString(body.success_url) ??
    process.env.STRIPE_CHECKOUT_SUCCESS_URL?.trim() ??
    undefined;
  const cancelUrl =
    asString(body.cancel_url) ??
    process.env.STRIPE_CHECKOUT_CANCEL_URL?.trim() ??
    undefined;

  if (!wifiSessionId || !planId) {
    return jsonResponse(400, {
      ok: false,
      error: "session_id and plan_id are required.",
      code: "bad_request",
    });
  }
  if (!successUrl || !cancelUrl) {
    return jsonResponse(400, {
      ok: false,
      error: "success_url and cancel_url are required (or set STRIPE_CHECKOUT_*_URL).",
      code: "bad_request",
    });
  }

  const { data: sessionRow, error: sessionError } = await supabase
    .from("wifi_sessions")
    .select("*")
    .eq("id", wifiSessionId)
    .maybeSingle();
  if (sessionError) {
    return jsonResponse(500, {
      ok: false,
      error: "Failed to load wifi session.",
      code: "db_error",
      details: sessionError.message,
    });
  }
  if (!sessionRow) {
    return jsonResponse(404, {
      ok: false,
      error: "Wifi session not found.",
      code: "session_not_found",
    });
  }
  const session = mapSession(sessionRow as JsonRecord);

  const { data: planRow, error: planError } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("id", planId)
    .eq("enterprise_id", session.enterpriseId)
    .maybeSingle();
  if (planError) {
    return jsonResponse(500, {
      ok: false,
      error: "Failed to load plan.",
      code: "db_error",
      details: planError.message,
    });
  }
  if (!planRow) {
    return jsonResponse(404, {
      ok: false,
      error: "Subscription plan not found.",
      code: "plan_not_found",
    });
  }
  const plan = mapPlan(planRow as JsonRecord);
  if (!plan.isActive) {
    return jsonResponse(400, {
      ok: false,
      error: "Subscription plan is inactive.",
      code: "plan_inactive",
    });
  }

  const { data: deviceRow } = await supabase
    .from("wifi_devices")
    .select("*")
    .eq("id", session.deviceId)
    .maybeSingle();
  const device = deviceRow ? mapDevice(deviceRow as JsonRecord) : null;

  const form = new URLSearchParams();
  form.set("mode", "payment");
  form.set("success_url", successUrl);
  form.set("cancel_url", cancelUrl);
  form.set("client_reference_id", session.id);
  form.set("metadata[wifi_session_id]", session.id);
  form.set("metadata[plan_id]", plan.id);
  form.set("metadata[enterprise_id]", session.enterpriseId);
  if (device) {
    form.set("metadata[mac]", device.macAddress);
  }

  if (plan.stripePriceId) {
    form.set("line_items[0][price]", plan.stripePriceId);
    form.set("line_items[0][quantity]", "1");
  } else {
    form.set("line_items[0][price_data][currency]", plan.currency.toLowerCase());
    form.set("line_items[0][price_data][unit_amount]", String(plan.priceCents));
    form.set("line_items[0][price_data][product_data][name]", plan.name);
    if (plan.description) {
      form.set(
        "line_items[0][price_data][product_data][description]",
        plan.description.slice(0, 500),
      );
    }
    form.set("line_items[0][quantity]", "1");
  }

  const stripe = await stripeApi("POST", "/checkout/sessions", form);
  if (!stripe.ok) {
    return jsonResponse(stripe.status >= 400 && stripe.status < 600 ? stripe.status : 502, {
      ok: false,
      error: stripe.message,
      code: "stripe_error",
    });
  }

  const checkoutId = String(stripe.data.id ?? "");
  const url = asString(stripe.data.url);
  if (!checkoutId || !url) {
    return jsonResponse(502, {
      ok: false,
      error: "Stripe did not return a checkout URL.",
      code: "stripe_error",
    });
  }

  await supabase
    .from("wifi_sessions")
    .update({ stripe_checkout_session_id: checkoutId })
    .eq("id", session.id);

  return jsonResponse(200, {
    ok: true,
    mode: "checkout_create",
    checkoutSessionId: checkoutId,
    url,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY?.trim() || null,
  });
}

async function applyPlanUpgrade(input: {
  supabase: SupabaseClient;
  wifiSessionId: string;
  planId: string;
  checkoutSessionId: string;
}): Promise<
  | {
      ok: true;
      session: NetworkSession;
      plan: SubscriptionPlan;
      coa: CheckoutWebhookSuccess["coa"];
    }
  | { ok: false; status: number; body: CheckoutErrorBody }
> {
  const { supabase, wifiSessionId, planId, checkoutSessionId } = input;

  const { data: sessionRow, error: sessionError } = await supabase
    .from("wifi_sessions")
    .select("*")
    .eq("id", wifiSessionId)
    .maybeSingle();
  if (sessionError) {
    return {
      ok: false,
      status: 500,
      body: {
        ok: false,
        error: "Failed to load wifi session.",
        code: "db_error",
        details: sessionError.message,
      },
    };
  }
  if (!sessionRow) {
    return {
      ok: false,
      status: 404,
      body: { ok: false, error: "Wifi session not found.", code: "session_not_found" },
    };
  }
  const existing = mapSession(sessionRow as JsonRecord);

  // Idempotent: already upgraded to this checkout
  if (
    existing.stripeCheckoutSessionId === checkoutSessionId &&
    existing.planId === planId
  ) {
    const { data: deviceRow } = await supabase
      .from("wifi_devices")
      .select("*")
      .eq("id", existing.deviceId)
      .maybeSingle();
    const { data: planRow } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("id", planId)
      .maybeSingle();

    if (!deviceRow || !planRow) {
      return {
        ok: false,
        status: 404,
        body: { ok: false, error: "Related rows missing for idempotent upgrade.", code: "db_error" },
      };
    }

    return {
      ok: true,
      session: toNetworkSession(existing, mapDevice(deviceRow as JsonRecord)),
      plan: mapPlan(planRow as JsonRecord),
      coa: { attempted: false },
    };
  }

  const { data: planRow, error: planError } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("id", planId)
    .eq("enterprise_id", existing.enterpriseId)
    .maybeSingle();
  if (planError || !planRow) {
    return {
      ok: false,
      status: planError ? 500 : 404,
      body: {
        ok: false,
        error: planError ? "Failed to load plan." : "Plan not found.",
        code: planError ? "db_error" : "plan_not_found",
        details: planError?.message,
      },
    };
  }
  const plan = mapPlan(planRow as JsonRecord);

  const entitlements = buildQuotaEntitlements({
    quotaMb: plan.quotaMb,
    durationMinutes: plan.durationMinutes,
    startedAt: new Date().toISOString(),
  });

  const { data: enterpriseRow, error: enterpriseError } = await supabase
    .from("enterprises")
    .select("*")
    .eq("id", existing.enterpriseId)
    .maybeSingle();
  if (enterpriseError || !enterpriseRow) {
    return {
      ok: false,
      status: 500,
      body: {
        ok: false,
        error: "Failed to load enterprise for upgrade.",
        code: "db_error",
        details: enterpriseError?.message,
      },
    };
  }
  const enterprise = mapEnterprise(enterpriseRow as JsonRecord);

  // Session write + non-blocking RADIUS CoA (plan speeds) via the controller.
  let session: NetworkSession;
  try {
    const controller = createCaptiveController(supabase, enterprise);
    session = await controller.applyPaidUpgrade(existing.id, {
      planId: plan.id,
      stripeCheckoutSessionId: checkoutSessionId,
      quotaBytes: entitlements.quotaBytes,
      endsAt: entitlements.endsAt,
      downloadKbps: plan.downloadKbps,
      uploadKbps: plan.uploadKbps,
    });
  } catch (error) {
    return {
      ok: false,
      status: 500,
      body: {
        ok: false,
        error: "Failed to upgrade wifi session.",
        code: "db_error",
        details: error instanceof Error ? error.message : String(error),
      },
    };
  }

  const coa: CheckoutWebhookSuccess["coa"] = {
    attempted: Boolean(enterprise.radiusCoaHost && enterprise.radiusSecret),
    acknowledged: false,
  };

  return { ok: true, session, plan, coa };
}

async function handleStripeWebhook(request: Request): Promise<Response> {
  const rawBody = await request.text();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    return jsonResponse(503, {
      ok: false,
      error: "STRIPE_WEBHOOK_SECRET is required.",
      code: "misconfigured",
    });
  }

  const verified = verifyStripeWebhookSignature({
    rawBody,
    signatureHeader: request.headers.get("stripe-signature"),
    secret: webhookSecret,
  });
  if (!verified.ok) {
    return jsonResponse(401, {
      ok: false,
      error: `Invalid Stripe signature (${verified.reason}).`,
      code: "invalid_signature",
      details: verified.reason,
    });
  }

  let event: JsonRecord;
  try {
    event = JSON.parse(rawBody) as JsonRecord;
  } catch {
    return jsonResponse(400, {
      ok: false,
      error: "Invalid JSON payload.",
      code: "bad_request",
    });
  }

  const eventType = String(event.type ?? "");
  if (eventType !== "checkout.session.completed") {
    return jsonResponse(200, {
      ok: true,
      mode: "webhook",
      handled: false,
      eventType,
    });
  }

  const supabase = getSupabaseService();
  if (!supabase) {
    return jsonResponse(503, {
      ok: false,
      error: "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.",
      code: "misconfigured",
    });
  }

  const object =
    event.data && typeof event.data === "object"
      ? ((event.data as JsonRecord).object as JsonRecord | undefined)
      : undefined;

  if (!object || typeof object !== "object") {
    return jsonResponse(400, {
      ok: false,
      error: "Missing checkout session object.",
      code: "bad_request",
    });
  }

  const checkoutSessionId = String(object.id ?? "");
  const metadata =
    object.metadata && typeof object.metadata === "object"
      ? (object.metadata as Record<string, unknown>)
      : {};

  const wifiSessionId =
    asString(metadata.wifi_session_id) ?? asString(object.client_reference_id);
  const planId = asString(metadata.plan_id);

  if (!wifiSessionId || !planId || !checkoutSessionId) {
    return jsonResponse(400, {
      ok: false,
      error: "Webhook missing wifi_session_id / plan_id metadata.",
      code: "bad_request",
    });
  }

  const upgraded = await applyPlanUpgrade({
    supabase,
    wifiSessionId,
    planId,
    checkoutSessionId,
  });

  if (!upgraded.ok) {
    return jsonResponse(upgraded.status, upgraded.body);
  }

  const quota = calculateSessionQuota({
    inputOctets: upgraded.session.bytesUp,
    outputOctets: upgraded.session.bytesDown,
    quotaBytes: upgraded.session.quotaBytes,
    startedAt: upgraded.session.startedAt,
    endsAt: upgraded.session.endsAt,
  });

  return jsonResponse(200, {
    ok: true,
    mode: "webhook",
    handled: true,
    eventType,
    wifiSessionId: upgraded.session.id,
    planId: upgraded.plan.id,
    coa: upgraded.coa,
    session: {
      id: upgraded.session.id,
      status: upgraded.session.status,
      quotaBytes: upgraded.session.quotaBytes,
      downloadKbps: upgraded.session.downloadKbps,
      uploadKbps: upgraded.session.uploadKbps,
      endsAt: upgraded.session.endsAt,
    },
    quota: {
      remainingBytes: quota.remainingBytes,
      remainingMb: quota.remainingMb,
      remainingSeconds: quota.remainingSeconds,
    },
  });
}

export async function POST(request: Request): Promise<Response> {
  if (request.headers.get("stripe-signature")) {
    return handleStripeWebhook(request);
  }
  return createCheckoutSession(request);
}

/**
 * Guest-safe plan catalog for the captive checkout UI.
 * GET /api/v1/captive/checkout?enterprise_id=… | enterprise_slug=…
 */
export async function GET(request: Request): Promise<Response> {
  const supabase = getSupabaseService();
  if (!supabase) {
    return jsonResponse(503, {
      ok: false,
      error: "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.",
      code: "misconfigured",
    });
  }

  const url = new URL(request.url);
  const enterpriseId = asString(url.searchParams.get("enterprise_id"));
  const enterpriseSlug =
    asString(url.searchParams.get("enterprise_slug")) ??
    asString(url.searchParams.get("slug"));

  let resolvedEnterpriseId = enterpriseId;
  if (!resolvedEnterpriseId && enterpriseSlug) {
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
        code: "plan_not_found",
      });
    }
    resolvedEnterpriseId = String((data as JsonRecord).id);
  }

  if (!resolvedEnterpriseId) {
    return jsonResponse(400, {
      ok: false,
      error: "enterprise_id or enterprise_slug is required.",
      code: "bad_request",
    });
  }

  const { data, error } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("enterprise_id", resolvedEnterpriseId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    return jsonResponse(500, {
      ok: false,
      error: "Failed to load subscription plans.",
      code: "db_error",
      details: error.message,
    });
  }

  const plans = (data || []).map((row) => {
    const plan = mapPlan(row as JsonRecord);
    return {
      id: plan.id,
      enterpriseId: plan.enterpriseId,
      name: plan.name,
      description: plan.description,
      priceCents: plan.priceCents,
      currency: plan.currency,
      interval: plan.interval,
      quotaMb: plan.quotaMb,
      durationMinutes: plan.durationMinutes,
      downloadKbps: plan.downloadKbps,
      uploadKbps: plan.uploadKbps,
      sortOrder: plan.sortOrder,
      stripePriceId: plan.stripePriceId,
    };
  });

  return new Response(
    JSON.stringify({
      ok: true,
      mode: "plan_catalog",
      enterpriseId: resolvedEnterpriseId,
      plans,
    }),
    {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    },
  );
}
