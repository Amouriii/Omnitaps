/**
 * TASK-3.2 — Captive session status (polling + SSE).
 *
 * Assumptions:
 * 1. Guests poll with session_id, or enterprise_id|slug + mac.
 * 2. Optional body/query octet counters update accounting between RADIUS interim updates.
 * 3. Accept: text/event-stream → Server-Sent Events stream (WebSocket-like push without
 *    adding a WS server); otherwise JSON poll response.
 * 4. Exhausted sessions are closed in DB; optional RADIUS Disconnect when CoA host/secret set.
 * 5. Service-role Supabase (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  WifiSessionStatus,
  type Enterprise,
  type WifiDevice,
  type WifiSession,
} from "../../../../../db/schema/wifi.js";
import {
  captiveQuotaEvents,
  ensureDefaultQuotaSubscriber,
} from "../../../../../lib/network/captiveQuota.js";
import {
  toNetworkSession,
} from "../../../../../lib/network/NetworkSessionController.js";
import { radiusContextFromEnterprise } from "../../../../../lib/network/adapters/RadiusNetworkAdapter.js";
import { QUOTA_EVENTS, NetworkStatus } from "../../../../../lib/network/types.js";
import { normalizeMac } from "../../../../../lib/wifi/mac-utils.js";
import { calculateSessionQuota } from "../../../../../lib/wifi/quota-calculator.js";
import { sendDisconnectRequest } from "../../../../../lib/wifi/radius-client.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;

interface StatusSuccessBody {
  ok: true;
  session: {
    id: string;
    status: string;
    startedAt: string;
    endsAt: string | null;
    planId: string | null;
    downloadKbps: number;
    uploadKbps: number;
    quotaBytes: number;
    acctSessionId: string | null;
    apId: string | null;
  };
  device: {
    id: string;
    macAddress: string;
  };
  enterprise: {
    id: string;
    slug: string;
    name: string;
  };
  quota: {
    usedBytes: number;
    remainingBytes: number;
    usedMb: number;
    remainingMb: number;
    percentUsed: number;
    remainingSeconds: number | null;
    isExhausted: boolean;
    isTimeExpired: boolean;
  };
  speedRules: {
    downloadKbps: number;
    uploadKbps: number;
  };
  disconnect?: {
    attempted: boolean;
    acknowledged?: boolean;
    error?: string;
  };
}

interface StatusErrorBody {
  ok: false;
  error: string;
  code:
    | "bad_request"
    | "session_not_found"
    | "enterprise_not_found"
    | "invalid_mac"
    | "misconfigured"
    | "db_error";
  details?: string;
}

function jsonResponse(
  status: number,
  body: StatusSuccessBody | StatusErrorBody,
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

function asNonNegInt(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.floor(n);
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

async function readInput(request: Request): Promise<{
  session_id?: string;
  enterprise_id?: string;
  enterprise_slug?: string;
  mac?: string;
  input_octets?: number;
  output_octets?: number;
  interval_ms?: number;
}> {
  const url = new URL(request.url);
  const out: {
    session_id?: string;
    enterprise_id?: string;
    enterprise_slug?: string;
    mac?: string;
    input_octets?: number;
    output_octets?: number;
    interval_ms?: number;
  } = {
    session_id: asString(url.searchParams.get("session_id")),
    enterprise_id: asString(url.searchParams.get("enterprise_id")),
    enterprise_slug:
      asString(url.searchParams.get("enterprise_slug")) ??
      asString(url.searchParams.get("slug")),
    mac: asString(url.searchParams.get("mac")),
    input_octets: asNonNegInt(url.searchParams.get("input_octets")),
    output_octets: asNonNegInt(url.searchParams.get("output_octets")),
    interval_ms: asNonNegInt(url.searchParams.get("interval_ms")),
  };

  if (request.method === "POST" || request.method === "PUT" || request.method === "PATCH") {
    try {
      const contentType = request.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const body = (await request.json()) as Record<string, unknown>;
        out.session_id = asString(body.session_id) ?? out.session_id;
        out.enterprise_id = asString(body.enterprise_id) ?? out.enterprise_id;
        out.enterprise_slug =
          asString(body.enterprise_slug) ?? asString(body.slug) ?? out.enterprise_slug;
        out.mac = asString(body.mac) ?? out.mac;
        out.input_octets = asNonNegInt(body.input_octets) ?? out.input_octets;
        out.output_octets = asNonNegInt(body.output_octets) ?? out.output_octets;
        out.interval_ms = asNonNegInt(body.interval_ms) ?? out.interval_ms;
      }
    } catch {
      // ignore body parse errors; query params may still be enough
    }
  }

  return out;
}

async function loadSessionBundle(
  supabase: SupabaseClient,
  input: {
    session_id?: string;
    enterprise_id?: string;
    enterprise_slug?: string;
    mac?: string;
  },
): Promise<
  | {
      ok: true;
      session: WifiSession;
      device: WifiDevice;
      enterprise: Enterprise;
    }
  | { ok: false; status: number; body: StatusErrorBody }
> {
  let sessionRow: JsonRecord | null = null;

  if (input.session_id) {
    const { data, error } = await supabase
      .from("wifi_sessions")
      .select("*")
      .eq("id", input.session_id)
      .maybeSingle();
    if (error) {
      return {
        ok: false,
        status: 500,
        body: { ok: false, error: "Failed to load session.", code: "db_error", details: error.message },
      };
    }
    sessionRow = (data as JsonRecord | null) ?? null;
  } else {
    const enterpriseId = input.enterprise_id;
    let resolvedEnterpriseId = enterpriseId;

    if (!resolvedEnterpriseId && input.enterprise_slug) {
      const { data: ent, error } = await supabase
        .from("enterprises")
        .select("id")
        .eq("slug", input.enterprise_slug)
        .maybeSingle();
      if (error) {
        return {
          ok: false,
          status: 500,
          body: { ok: false, error: "Failed to load enterprise.", code: "db_error", details: error.message },
        };
      }
      if (!ent) {
        return {
          ok: false,
          status: 404,
          body: { ok: false, error: "Enterprise not found.", code: "enterprise_not_found" },
        };
      }
      resolvedEnterpriseId = String((ent as JsonRecord).id);
    }

    if (!resolvedEnterpriseId || !input.mac) {
      return {
        ok: false,
        status: 400,
        body: {
          ok: false,
          error: "Provide session_id, or enterprise_id|enterprise_slug + mac.",
          code: "bad_request",
        },
      };
    }

    const mac = normalizeMac(input.mac);
    if (!mac) {
      return {
        ok: false,
        status: 400,
        body: { ok: false, error: "Invalid MAC address.", code: "invalid_mac" },
      };
    }

    const { data: device, error: deviceError } = await supabase
      .from("wifi_devices")
      .select("*")
      .eq("enterprise_id", resolvedEnterpriseId)
      .eq("mac_address", mac.canonical)
      .maybeSingle();

    if (deviceError) {
      return {
        ok: false,
        status: 500,
        body: { ok: false, error: "Failed to load device.", code: "db_error", details: deviceError.message },
      };
    }
    if (!device) {
      return {
        ok: false,
        status: 404,
        body: { ok: false, error: "Session not found for MAC.", code: "session_not_found" },
      };
    }

    const { data: sessions, error: sessionError } = await supabase
      .from("wifi_sessions")
      .select("*")
      .eq("device_id", String((device as JsonRecord).id))
      .order("started_at", { ascending: false })
      .limit(1);

    if (sessionError) {
      return {
        ok: false,
        status: 500,
        body: { ok: false, error: "Failed to load session.", code: "db_error", details: sessionError.message },
      };
    }
    sessionRow = (sessions?.[0] as JsonRecord | undefined) ?? null;
  }

  if (!sessionRow) {
    return {
      ok: false,
      status: 404,
      body: { ok: false, error: "Session not found.", code: "session_not_found" },
    };
  }

  const session = mapSession(sessionRow);

  const { data: deviceRow, error: deviceLoadError } = await supabase
    .from("wifi_devices")
    .select("*")
    .eq("id", session.deviceId)
    .maybeSingle();
  if (deviceLoadError || !deviceRow) {
    return {
      ok: false,
      status: 404,
      body: {
        ok: false,
        error: "Device for session not found.",
        code: "session_not_found",
        details: deviceLoadError?.message,
      },
    };
  }

  const { data: enterpriseRow, error: enterpriseError } = await supabase
    .from("enterprises")
    .select("*")
    .eq("id", session.enterpriseId)
    .maybeSingle();
  if (enterpriseError || !enterpriseRow) {
    return {
      ok: false,
      status: 404,
      body: {
        ok: false,
        error: "Enterprise for session not found.",
        code: "enterprise_not_found",
        details: enterpriseError?.message,
      },
    };
  }

  return {
    ok: true,
    session,
    device: mapDevice(deviceRow as JsonRecord),
    enterprise: mapEnterprise(enterpriseRow as JsonRecord),
  };
}

async function applyOctetUpdate(
  supabase: SupabaseClient,
  session: WifiSession,
  inputOctets: number | undefined,
  outputOctets: number | undefined,
): Promise<WifiSession> {
  if (inputOctets === undefined && outputOctets === undefined) {
    return session;
  }

  const nextInput =
    inputOctets === undefined ? session.inputOctets : Math.max(session.inputOctets, inputOctets);
  const nextOutput =
    outputOctets === undefined ? session.outputOctets : Math.max(session.outputOctets, outputOctets);

  if (nextInput === session.inputOctets && nextOutput === session.outputOctets) {
    return session;
  }

  const { data, error } = await supabase
    .from("wifi_sessions")
    .update({
      input_octets: nextInput,
      output_octets: nextOutput,
    })
    .eq("id", session.id)
    .select("*")
    .maybeSingle();

  if (error || !data) {
    return {
      ...session,
      inputOctets: nextInput,
      outputOctets: nextOutput,
    };
  }
  return mapSession(data as JsonRecord);
}

async function closeIfExhausted(
  supabase: SupabaseClient,
  session: WifiSession,
  enterprise: Enterprise,
  device: WifiDevice,
): Promise<{ session: WifiSession; disconnect?: StatusSuccessBody["disconnect"] }> {
  if (session.status !== WifiSessionStatus.ACTIVE) {
    return { session };
  }

  const quota = calculateSessionQuota({
    inputOctets: session.inputOctets,
    outputOctets: session.outputOctets,
    quotaBytes: session.quotaBytes,
    startedAt: session.startedAt,
    endsAt: session.endsAt,
  });

  if (!quota.isExhausted) {
    return { session };
  }

  const nextStatus =
    quota.remainingBytes <= 0
      ? WifiSessionStatus.QUOTA_EXCEEDED
      : WifiSessionStatus.EXPIRED;

  const { data } = await supabase
    .from("wifi_sessions")
    .update({
      status: nextStatus,
      disconnected_at: new Date().toISOString(),
    })
    .eq("id", session.id)
    .eq("status", WifiSessionStatus.ACTIVE)
    .select("*")
    .maybeSingle();

  const closed = data ? mapSession(data as JsonRecord) : { ...session, status: nextStatus };

  ensureDefaultQuotaSubscriber();
  const storedDevice = mapDevice({
    id: device.id,
    enterprise_id: device.enterpriseId,
    mac_address: device.macAddress,
    device_fingerprint: device.deviceFingerprint,
    display_name: device.displayName,
    status: device.status,
    email: device.email,
    phone_number: device.phoneNumber,
    identity_verified_at: device.identityVerifiedAt,
    first_seen_at: device.firstSeenAt,
    last_seen_at: device.lastSeenAt,
    created_at: device.createdAt,
    updated_at: device.updatedAt,
  });
  const networkSession = toNetworkSession(
    {
      id: closed.id,
      enterpriseId: closed.enterpriseId,
      deviceId: closed.deviceId,
      status: closed.status,
      startedAt: closed.startedAt,
      endsAt: closed.endsAt,
      disconnectedAt: closed.disconnectedAt,
      inputOctets: closed.inputOctets,
      outputOctets: closed.outputOctets,
      quotaBytes: closed.quotaBytes,
      downloadKbps: closed.downloadKbps,
      uploadKbps: closed.uploadKbps,
      acctSessionId: closed.acctSessionId,
      apId: closed.apId,
      planId: closed.planId,
      stripeCheckoutSessionId: closed.stripeCheckoutSessionId,
      createdAt: closed.createdAt,
      updatedAt: closed.updatedAt,
    },
    {
      id: storedDevice.id,
      enterpriseId: storedDevice.enterpriseId,
      macAddress: storedDevice.macAddress,
      status: storedDevice.status,
      email: storedDevice.email,
      phoneNumber: storedDevice.phoneNumber,
      identityVerifiedAt: storedDevice.identityVerifiedAt,
      deviceFingerprint: storedDevice.deviceFingerprint,
      displayName: storedDevice.displayName,
      firstSeenAt: storedDevice.firstSeenAt,
      lastSeenAt: storedDevice.lastSeenAt,
      createdAt: storedDevice.createdAt,
      updatedAt: storedDevice.updatedAt,
    },
  );

  captiveQuotaEvents.emit(QUOTA_EVENTS.ON_STATUS_CHANGE, {
    session: networkSession,
    previous: NetworkStatus.CONNECTED,
    next: networkSession.status,
  });
  captiveQuotaEvents.emit(QUOTA_EVENTS.ON_QUOTA_EXCEEDED, {
    session: networkSession,
    usedBytes: quota.usedBytes,
    remainingBytes: quota.remainingBytes,
    isTimeExpired: quota.isTimeExpired,
    radius: radiusContextFromEnterprise(enterprise),
  });

  let disconnect: StatusSuccessBody["disconnect"] = { attempted: false };

  if (enterprise.radiusCoaHost && enterprise.radiusSecret) {
    try {
      const result = await sendDisconnectRequest(
        {
          mac: device.macAddress,
          acctSessionId: closed.acctSessionId ?? undefined,
          nasIdentifier: closed.apId ?? undefined,
          replyMessage: "OmniTaps session exhausted",
        },
        {
          host: enterprise.radiusCoaHost,
          port: enterprise.radiusCoaPort || 3799,
          secret: enterprise.radiusSecret,
          timeoutMs: 2500,
        },
      );
      disconnect = {
        attempted: true,
        acknowledged: result.acknowledged,
      };
    } catch (error) {
      disconnect = {
        attempted: true,
        acknowledged: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  return { session: closed, disconnect };
}

function buildStatusBody(input: {
  session: WifiSession;
  device: WifiDevice;
  enterprise: Enterprise;
  disconnect?: StatusSuccessBody["disconnect"];
}): StatusSuccessBody {
  const { session, device, enterprise, disconnect } = input;
  const quota = calculateSessionQuota({
    inputOctets: session.inputOctets,
    outputOctets: session.outputOctets,
    quotaBytes: session.quotaBytes,
    startedAt: session.startedAt,
    endsAt: session.endsAt,
  });

  return {
    ok: true,
    session: {
      id: session.id,
      status: session.status,
      startedAt: session.startedAt,
      endsAt: session.endsAt,
      planId: session.planId,
      downloadKbps: session.downloadKbps,
      uploadKbps: session.uploadKbps,
      quotaBytes: session.quotaBytes,
      acctSessionId: session.acctSessionId,
      apId: session.apId,
    },
    device: {
      id: device.id,
      macAddress: device.macAddress,
    },
    enterprise: {
      id: enterprise.id,
      slug: enterprise.slug,
      name: enterprise.name,
    },
    quota: {
      usedBytes: quota.usedBytes,
      remainingBytes: quota.remainingBytes,
      usedMb: quota.usedMb,
      remainingMb: quota.remainingMb,
      percentUsed: quota.percentUsed,
      remainingSeconds: quota.remainingSeconds,
      isExhausted: quota.isExhausted || session.status !== WifiSessionStatus.ACTIVE,
      isTimeExpired: quota.isTimeExpired,
    },
    speedRules: {
      downloadKbps: session.downloadKbps,
      uploadKbps: session.uploadKbps,
    },
    ...(disconnect ? { disconnect } : {}),
  };
}

async function resolveStatus(
  supabase: SupabaseClient,
  input: Awaited<ReturnType<typeof readInput>>,
): Promise<{ status: number; body: StatusSuccessBody | StatusErrorBody }> {
  const loaded = await loadSessionBundle(supabase, input);
  if (!loaded.ok) {
    return { status: loaded.status, body: loaded.body };
  }

  let session = await applyOctetUpdate(
    supabase,
    loaded.session,
    input.input_octets,
    input.output_octets,
  );

  const closed = await closeIfExhausted(
    supabase,
    session,
    loaded.enterprise,
    loaded.device,
  );
  session = closed.session;

  return {
    status: 200,
    body: buildStatusBody({
      session,
      device: loaded.device,
      enterprise: loaded.enterprise,
      disconnect: closed.disconnect,
    }),
  };
}

function wantsEventStream(request: Request): boolean {
  const accept = request.headers.get("accept") || "";
  const url = new URL(request.url);
  return (
    accept.includes("text/event-stream") ||
    url.searchParams.get("stream") === "1" ||
    url.searchParams.get("sse") === "1"
  );
}

async function handleJson(request: Request): Promise<Response> {
  const supabase = getSupabaseService();
  if (!supabase) {
    return jsonResponse(503, {
      ok: false,
      error: "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.",
      code: "misconfigured",
    });
  }

  const input = await readInput(request);
  const result = await resolveStatus(supabase, input);
  return jsonResponse(result.status, result.body);
}

async function handleSse(request: Request): Promise<Response> {
  const supabase = getSupabaseService();
  if (!supabase) {
    return jsonResponse(503, {
      ok: false,
      error: "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.",
      code: "misconfigured",
    });
  }

  const input = await readInput(request);
  const intervalMs = Math.min(Math.max(input.interval_ms ?? 5000, 1000), 30_000);
  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return;
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      const tick = async () => {
        if (closed) return;
        try {
          const result = await resolveStatus(supabase, {
            session_id: input.session_id,
            enterprise_id: input.enterprise_id,
            enterprise_slug: input.enterprise_slug,
            mac: input.mac,
            // octets only applied on first tick / explicit POST poll
          });
          send(result.status === 200 ? "session" : "error", result.body);
          if (
            result.status === 200 &&
            result.body.ok === true &&
            result.body.quota.isExhausted
          ) {
            closed = true;
            controller.close();
          }
        } catch (error) {
          send("error", {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
            code: "db_error",
          });
        }
      };

      void tick();
      const timer = setInterval(() => {
        void tick();
      }, intervalMs);

      const abort = () => {
        if (closed) return;
        closed = true;
        clearInterval(timer);
        try {
          controller.close();
        } catch {
          // ignore
        }
      };

      request.signal.addEventListener("abort", abort);
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}

export async function GET(request: Request): Promise<Response> {
  if (wantsEventStream(request)) {
    return handleSse(request);
  }
  return handleJson(request);
}

export async function POST(request: Request): Promise<Response> {
  if (wantsEventStream(request)) {
    return handleSse(request);
  }
  return handleJson(request);
}

export async function PATCH(request: Request): Promise<Response> {
  return handleJson(request);
}
