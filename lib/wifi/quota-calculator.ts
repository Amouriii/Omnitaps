/**
 * RADIUS byte-accounting & quota helpers.
 *
 * Assumption: Gateways report RADIUS Acct-Input-Octets / Acct-Output-Octets
 * (and optional Gigawords). Session quota is a hard byte ceiling; time quota
 * is wall-clock from startedAt → endsAt.
 */

export const BYTES_PER_KB = 1024;
export const BYTES_PER_MB = 1024 * 1024;
export const BYTES_PER_GB = 1024 * 1024 * 1024;

export interface RadiusOctetCounters {
  /** Acct-Input-Octets (client → network), low 32 bits */
  acctInputOctets?: number | null;
  /** Acct-Output-Octets (network → client), low 32 bits */
  acctOutputOctets?: number | null;
  /** Acct-Input-Gigawords — high 32 bits for input */
  acctInputGigawords?: number | null;
  /** Acct-Output-Gigawords — high 32 bits for output */
  acctOutputGigawords?: number | null;
}

export interface SessionQuotaSnapshot {
  inputBytes: number;
  outputBytes: number;
  usedBytes: number;
  quotaBytes: number;
  remainingBytes: number;
  usedMb: number;
  remainingMb: number;
  usedGb: number;
  remainingGb: number;
  percentUsed: number;
  isExhausted: boolean;
  remainingSeconds: number | null;
  isTimeExpired: boolean;
}

function toUInt32(value: number | null | undefined): number {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 0;
  }
  // RADIUS counters are unsigned 32-bit.
  return value >>> 0;
}

/**
 * Combine Gigawords + Octets into a full byte count.
 * total = gigawords * 2^32 + octets
 */
export function combineOctetCounter(
  octets: number | null | undefined,
  gigawords: number | null | undefined = 0,
): number {
  const low = toUInt32(octets);
  const high = toUInt32(gigawords);
  return high * 2 ** 32 + low;
}

export function totalBytesFromRadiusCounters(counters: RadiusOctetCounters): {
  inputBytes: number;
  outputBytes: number;
  usedBytes: number;
} {
  const inputBytes = combineOctetCounter(
    counters.acctInputOctets,
    counters.acctInputGigawords,
  );
  const outputBytes = combineOctetCounter(
    counters.acctOutputOctets,
    counters.acctOutputGigawords,
  );
  return {
    inputBytes,
    outputBytes,
    usedBytes: inputBytes + outputBytes,
  };
}

export function bytesToMb(bytes: number, digits = 3): number {
  const value = Math.max(0, bytes) / BYTES_PER_MB;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function bytesToGb(bytes: number, digits = 3): number {
  const value = Math.max(0, bytes) / BYTES_PER_GB;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function mbToBytes(mb: number): number {
  if (!Number.isFinite(mb) || mb <= 0) return 0;
  return Math.floor(mb * BYTES_PER_MB);
}

export function gbToBytes(gb: number): number {
  if (!Number.isFinite(gb) || gb <= 0) return 0;
  return Math.floor(gb * BYTES_PER_GB);
}

export function formatBytes(bytes: number): string {
  const safe = Math.max(0, bytes);
  if (safe >= BYTES_PER_GB) {
    return `${bytesToGb(safe)} GB`;
  }
  if (safe >= BYTES_PER_MB) {
    return `${bytesToMb(safe)} MB`;
  }
  if (safe >= BYTES_PER_KB) {
    return `${Math.round((safe / BYTES_PER_KB) * 10) / 10} KB`;
  }
  return `${safe} B`;
}

export function remainingQuotaBytes(usedBytes: number, quotaBytes: number): number {
  return Math.max(0, Math.floor(quotaBytes) - Math.max(0, Math.floor(usedBytes)));
}

export function remainingSessionSeconds(
  startedAt: Date | string | number,
  endsAt: Date | string | number | null | undefined,
  now: Date | string | number = Date.now(),
): number | null {
  if (endsAt === null || endsAt === undefined || endsAt === "") {
    return null;
  }
  const endMs = new Date(endsAt).getTime();
  const nowMs = new Date(now).getTime();
  if (!Number.isFinite(endMs) || !Number.isFinite(nowMs)) {
    return null;
  }
  // startedAt retained for API symmetry / future grace windows
  void startedAt;
  return Math.max(0, Math.floor((endMs - nowMs) / 1000));
}

export function calculateSessionQuota(input: {
  counters?: RadiusOctetCounters;
  inputOctets?: number;
  outputOctets?: number;
  inputGigawords?: number;
  outputGigawords?: number;
  quotaBytes: number;
  startedAt?: Date | string | number;
  endsAt?: Date | string | number | null;
  now?: Date | string | number;
}): SessionQuotaSnapshot {
  const counters: RadiusOctetCounters = input.counters ?? {
    acctInputOctets: input.inputOctets,
    acctOutputOctets: input.outputOctets,
    acctInputGigawords: input.inputGigawords,
    acctOutputGigawords: input.outputGigawords,
  };

  const { inputBytes, outputBytes, usedBytes } = totalBytesFromRadiusCounters(counters);
  const quotaBytes = Math.max(0, Math.floor(input.quotaBytes));
  const remainingBytes = remainingQuotaBytes(usedBytes, quotaBytes);
  const percentUsed =
    quotaBytes === 0 ? 100 : Math.min(100, Math.round((usedBytes / quotaBytes) * 10000) / 100);

  const remainingSeconds =
    input.startedAt !== undefined
      ? remainingSessionSeconds(input.startedAt, input.endsAt ?? null, input.now)
      : input.endsAt
        ? remainingSessionSeconds(Date.now(), input.endsAt, input.now)
        : null;

  const isTimeExpired = remainingSeconds === 0;
  const isExhausted = remainingBytes <= 0 || isTimeExpired;

  return {
    inputBytes,
    outputBytes,
    usedBytes,
    quotaBytes,
    remainingBytes,
    usedMb: bytesToMb(usedBytes),
    remainingMb: bytesToMb(remainingBytes),
    usedGb: bytesToGb(usedBytes),
    remainingGb: bytesToGb(remainingBytes),
    percentUsed,
    isExhausted,
    remainingSeconds,
    isTimeExpired,
  };
}

/**
 * Derive a session quota ceiling from plan / free-tier MB + optional duration.
 */
export function buildQuotaEntitlements(input: {
  quotaMb: number | null | undefined;
  durationMinutes: number | null | undefined;
  startedAt?: Date | string | number;
}): { quotaBytes: number; endsAt: string | null } {
  const quotaBytes =
    input.quotaMb === null || input.quotaMb === undefined
      ? Number.MAX_SAFE_INTEGER
      : mbToBytes(input.quotaMb);

  if (input.durationMinutes === null || input.durationMinutes === undefined) {
    return { quotaBytes, endsAt: null };
  }

  const start = input.startedAt ? new Date(input.startedAt) : new Date();
  const ends = new Date(start.getTime() + Math.max(0, input.durationMinutes) * 60_000);
  return { quotaBytes, endsAt: ends.toISOString() };
}
