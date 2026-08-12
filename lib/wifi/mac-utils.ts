/**
 * MAC address sanitization & validation for captive-portal gateways.
 *
 * Handles common AP formats (colon, hyphen, Cisco dot, bare hex) and
 * flags locally-administered / randomized privacy MACs (U/L bit).
 */

export type MacFormat =
  | "colon"
  | "hyphen"
  | "cisco"
  | "bare"
  | "unknown";

export interface NormalizedMac {
  /** Canonical lowercase colon form: aa:bb:cc:dd:ee:ff */
  canonical: string;
  /** Bare lowercase hex without separators */
  bare: string;
  /** Original cleaned input before canonicalization */
  raw: string;
  detectedFormat: MacFormat;
  /** IEEE U/L bit set → locally administered (often OS randomized). */
  isLocallyAdministered: boolean;
  /** IEEE I/G bit set → multicast/broadcast (invalid for a station MAC). */
  isMulticast: boolean;
  /** Convenience: locally administered unicast (typical privacy MAC). */
  isPrivacyMac: boolean;
}

const HEX_PAIR = "[0-9A-Fa-f]{2}";
const COLON_RE = new RegExp(`^(${HEX_PAIR}:){5}${HEX_PAIR}$`);
const HYPHEN_RE = new RegExp(`^(${HEX_PAIR}-){5}${HEX_PAIR}$`);
const CISCO_RE = new RegExp(`^[0-9A-Fa-f]{4}\\.[0-9A-Fa-f]{4}\\.[0-9A-Fa-f]{4}$`);
const BARE_RE = /^[0-9A-Fa-f]{12}$/;

/**
 * Strip whitespace/zero-width characters and common URL encoding artifacts.
 */
export function sanitizeMacInput(input: unknown): string {
  if (typeof input !== "string") {
    return "";
  }

  return input
    .trim()
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/%3[Aa]/g, ":")
    .replace(/%2[Dd]/g, "-")
    .replace(/\s+/g, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "");
}

export function detectMacFormat(value: string): MacFormat {
  if (COLON_RE.test(value)) return "colon";
  if (HYPHEN_RE.test(value)) return "hyphen";
  if (CISCO_RE.test(value)) return "cisco";
  if (BARE_RE.test(value)) return "bare";
  return "unknown";
}

/**
 * Extract 12 hex digits from a sanitized MAC-like string.
 * Returns null when the payload is not exactly one MAC worth of hex.
 */
export function extractMacHex(sanitized: string): string | null {
  const format = detectMacFormat(sanitized);
  let hex = "";

  switch (format) {
    case "colon":
    case "hyphen":
      hex = sanitized.replace(/[:-]/g, "");
      break;
    case "cisco":
      hex = sanitized.replace(/\./g, "");
      break;
    case "bare":
      hex = sanitized;
      break;
    default: {
      // Last-resort: pull hex chars only if we get exactly 12.
      const digits = sanitized.replace(/[^0-9A-Fa-f]/g, "");
      if (digits.length !== 12) {
        return null;
      }
      hex = digits;
    }
  }

  if (!BARE_RE.test(hex)) {
    return null;
  }

  return hex.toLowerCase();
}

export function formatMacColon(bareHex: string): string {
  const hex = bareHex.toLowerCase();
  if (!BARE_RE.test(hex)) {
    throw new Error("formatMacColon expects 12 hex digits.");
  }
  return hex.match(/.{2}/g)!.join(":");
}

export function formatMacCisco(bareHex: string): string {
  const hex = bareHex.toLowerCase();
  if (!BARE_RE.test(hex)) {
    throw new Error("formatMacCisco expects 12 hex digits.");
  }
  return `${hex.slice(0, 4)}.${hex.slice(4, 8)}.${hex.slice(8, 12)}`;
}

function readOuiBits(bareHex: string): {
  isLocallyAdministered: boolean;
  isMulticast: boolean;
} {
  const firstOctet = Number.parseInt(bareHex.slice(0, 2), 16);
  return {
    // Bit 1 (0x02) = locally administered
    isLocallyAdministered: (firstOctet & 0x02) === 0x02,
    // Bit 0 (0x01) = multicast/broadcast
    isMulticast: (firstOctet & 0x01) === 0x01,
  };
}

/**
 * Validate and normalize a MAC address.
 * Returns null for invalid / multicast station addresses when `allowMulticast` is false.
 */
export function normalizeMac(
  input: unknown,
  options: { allowMulticast?: boolean } = {},
): NormalizedMac | null {
  const allowMulticast = options.allowMulticast === true;
  const raw = sanitizeMacInput(input);
  if (!raw) {
    return null;
  }

  const detectedFormat = detectMacFormat(raw);
  const bare = extractMacHex(raw);
  if (!bare) {
    return null;
  }

  const bits = readOuiBits(bare);
  if (bits.isMulticast && !allowMulticast) {
    return null;
  }

  const canonical = formatMacColon(bare);

  return {
    canonical,
    bare,
    raw,
    detectedFormat: detectedFormat === "unknown" ? "bare" : detectedFormat,
    isLocallyAdministered: bits.isLocallyAdministered,
    isMulticast: bits.isMulticast,
    isPrivacyMac: bits.isLocallyAdministered && !bits.isMulticast,
  };
}

export function isValidMac(input: unknown): boolean {
  return normalizeMac(input) !== null;
}

/**
 * Compare two MAC inputs after normalization (format-agnostic).
 */
export function macEquals(a: unknown, b: unknown): boolean {
  const left = normalizeMac(a, { allowMulticast: true });
  const right = normalizeMac(b, { allowMulticast: true });
  if (!left || !right) {
    return false;
  }
  return left.bare === right.bare;
}

/**
 * Stable device cohort key for randomized MACs when the gateway also sends
 * a stable probe id / fingerprint. Falls back to the MAC itself.
 */
export function buildDeviceFingerprint(
  mac: unknown,
  stableHints: Array<string | null | undefined> = [],
): string | null {
  const normalized = normalizeMac(mac, { allowMulticast: true });
  if (!normalized) {
    return null;
  }

  const hints = stableHints
    .map((hint) => (typeof hint === "string" ? hint.trim().toLowerCase() : ""))
    .filter((hint) => hint.length > 0);

  if (!normalized.isPrivacyMac || hints.length === 0) {
    return `mac:${normalized.bare}`;
  }

  return `privacy:${normalized.bare}:${hints.join("|")}`;
}
