/**
 * Gateway HMAC verification for captive-portal redirect query parameters.
 *
 * Assumption (stated): APs sign requests with HMAC-SHA256 over a canonical
 * message of selected params. Default message is:
 *   mac=<canonical>&ap_id=<id>&challenge=<nonce>
 * using lowercase hex MAC (aa:bb:cc:dd:ee:ff). Signature may arrive as
 * `sig`, `hmac`, or `token` (hex or base64).
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { normalizeMac } from "./mac-utils.js";

export const DEFAULT_SIGNED_PARAM_KEYS = ["mac", "ap_id", "challenge"] as const;

export type GatewaySignedParamKey = (typeof DEFAULT_SIGNED_PARAM_KEYS)[number];

export interface GatewayQueryParams {
  mac?: string;
  ap_id?: string;
  challenge?: string;
  sig?: string;
  hmac?: string;
  token?: string;
  ts?: string;
  [key: string]: string | undefined;
}

export interface HmacVerifyOptions {
  /** Shared secret configured on the enterprise / AP controller. */
  secret: string;
  /** Params that participate in the signed message (order matters for fixed-mode). */
  signedKeys?: readonly string[];
  /**
   * - `fixed`: join `key=value` for signedKeys in the given order (default).
   * - `sorted`: include all non-signature params sorted by key (API-gateway style).
   */
  canonicalMode?: "fixed" | "sorted";
  /** Max age for optional `ts` (unix seconds). Ignored if `ts` absent. */
  maxSkewSeconds?: number;
  /** Accept hex and/or base64 signatures (default both). */
  encodings?: Array<"hex" | "base64">;
  now?: () => number;
}

export interface HmacVerifyResult {
  ok: boolean;
  reason?:
    | "missing_secret"
    | "missing_signature"
    | "missing_signed_field"
    | "invalid_mac"
    | "timestamp_skew"
    | "signature_mismatch"
    | "bad_signature_encoding";
  canonicalMessage?: string;
  normalizedMac?: string;
  providedSignature?: string;
}

const SIGNATURE_KEYS = new Set(["sig", "hmac", "token", "signature"]);

function toBufferFromSignature(
  value: string,
  encodings: Array<"hex" | "base64">,
): Buffer | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  for (const encoding of encodings) {
    try {
      if (encoding === "hex") {
        if (!/^[0-9a-fA-F]+$/.test(trimmed) || trimmed.length % 2 !== 0) {
          continue;
        }
        return Buffer.from(trimmed, "hex");
      }
      // base64 / base64url
      const normalized = trimmed.replace(/-/g, "+").replace(/_/g, "/");
      const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
      const buf = Buffer.from(padded, "base64");
      if (buf.length > 0) {
        return buf;
      }
    } catch {
      // try next encoding
    }
  }

  return null;
}

function safeEqualBuffers(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

/**
 * Build the canonical string that must match the AP's signing input.
 */
export function buildCanonicalGatewayMessage(
  params: GatewayQueryParams,
  options: {
    signedKeys?: readonly string[];
    canonicalMode?: "fixed" | "sorted";
    normalizedMac?: string;
  } = {},
): string | null {
  const mode = options.canonicalMode ?? "fixed";
  const signedKeys = options.signedKeys ?? DEFAULT_SIGNED_PARAM_KEYS;

  if (mode === "sorted") {
    const entries = Object.entries(params)
      .filter(([key, value]) => {
        if (value === undefined || value === null || value === "") return false;
        if (SIGNATURE_KEYS.has(key.toLowerCase())) return false;
        return true;
      })
      .map(([key, value]) => {
        if (key === "mac" && options.normalizedMac) {
          return ["mac", options.normalizedMac] as const;
        }
        return [key, String(value)] as const;
      })
      .sort(([a], [b]) => a.localeCompare(b));

    if (entries.length === 0) {
      return null;
    }

    return entries.map(([key, value]) => `${key}=${value}`).join("&");
  }

  const parts: string[] = [];
  for (const key of signedKeys) {
    let value = params[key];
    if (key === "mac" && options.normalizedMac) {
      value = options.normalizedMac;
    }
    if (value === undefined || value === null || String(value).trim() === "") {
      return null;
    }
    parts.push(`${key}=${String(value).trim()}`);
  }

  return parts.join("&");
}

export function extractProvidedSignature(params: GatewayQueryParams): string | null {
  const candidate = params.sig ?? params.hmac ?? params.token ?? params.signature;
  if (typeof candidate !== "string" || candidate.trim() === "") {
    return null;
  }
  return candidate.trim();
}

export function signGatewayMessage(
  message: string,
  secret: string,
  encoding: "hex" | "base64" = "hex",
): string {
  const digest = createHmac("sha256", secret).update(message, "utf8").digest();
  return encoding === "hex" ? digest.toString("hex") : digest.toString("base64");
}

/**
 * Verify AP redirect / captive portal query signature.
 */
export function verifyGatewayHmac(
  params: GatewayQueryParams,
  options: HmacVerifyOptions,
): HmacVerifyResult {
  const secret = options.secret?.trim();
  if (!secret) {
    return { ok: false, reason: "missing_secret" };
  }

  const providedSignature = extractProvidedSignature(params);
  if (!providedSignature) {
    return { ok: false, reason: "missing_signature" };
  }

  const macNormalized = normalizeMac(params.mac);
  if (!macNormalized) {
    return { ok: false, reason: "invalid_mac", providedSignature };
  }

  const maxSkew = options.maxSkewSeconds ?? 300;
  const nowFn = options.now ?? (() => Math.floor(Date.now() / 1000));
  if (params.ts !== undefined && params.ts !== "") {
    const ts = Number(params.ts);
    if (!Number.isFinite(ts)) {
      return {
        ok: false,
        reason: "timestamp_skew",
        providedSignature,
        normalizedMac: macNormalized.canonical,
      };
    }
    if (Math.abs(nowFn() - ts) > maxSkew) {
      return {
        ok: false,
        reason: "timestamp_skew",
        providedSignature,
        normalizedMac: macNormalized.canonical,
      };
    }
  }

  const canonicalMessage = buildCanonicalGatewayMessage(params, {
    signedKeys: options.signedKeys,
    canonicalMode: options.canonicalMode,
    normalizedMac: macNormalized.canonical,
  });

  if (!canonicalMessage) {
    return {
      ok: false,
      reason: "missing_signed_field",
      providedSignature,
      normalizedMac: macNormalized.canonical,
    };
  }

  const encodings = options.encodings ?? ["hex", "base64"];
  const providedBuf = toBufferFromSignature(providedSignature, encodings);
  if (!providedBuf) {
    return {
      ok: false,
      reason: "bad_signature_encoding",
      canonicalMessage,
      providedSignature,
      normalizedMac: macNormalized.canonical,
    };
  }

  const expectedBuf = createHmac("sha256", secret)
    .update(canonicalMessage, "utf8")
    .digest();

  if (!safeEqualBuffers(providedBuf, expectedBuf)) {
    return {
      ok: false,
      reason: "signature_mismatch",
      canonicalMessage,
      providedSignature,
      normalizedMac: macNormalized.canonical,
    };
  }

  return {
    ok: true,
    canonicalMessage,
    providedSignature,
    normalizedMac: macNormalized.canonical,
  };
}

/**
 * Parse a gateway redirect URL (or relative query string) into params.
 */
export function parseGatewayQuery(input: string): GatewayQueryParams {
  const trimmed = input.trim();
  let search = trimmed;

  try {
    if (trimmed.includes("://") || trimmed.startsWith("//")) {
      search = new URL(trimmed).search;
    } else if (trimmed.includes("?")) {
      search = trimmed.slice(trimmed.indexOf("?"));
    } else if (!trimmed.startsWith("?") && trimmed.includes("=")) {
      search = `?${trimmed}`;
    }
  } catch {
    search = trimmed.startsWith("?") ? trimmed : `?${trimmed}`;
  }

  const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  const result: GatewayQueryParams = {};
  for (const [key, value] of params.entries()) {
    result[key] = value;
  }
  return result;
}

/**
 * One-shot helper: parse URL + verify HMAC.
 */
export function verifyGatewayRequestUrl(
  urlOrQuery: string,
  options: HmacVerifyOptions,
): HmacVerifyResult {
  return verifyGatewayHmac(parseGatewayQuery(urlOrQuery), options);
}
