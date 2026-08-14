/**
 * Network injection & quota engine types.
 * NetworkStatus is the engine view; Postgres wifi_session_status is unchanged.
 */

export const NetworkStatus = {
  UNAUTHENTICATED: "UNAUTHENTICATED",
  PENDING_VERIFICATION: "PENDING_VERIFICATION",
  CONNECTED: "CONNECTED",
  QUOTA_EXCEEDED: "QUOTA_EXCEEDED",
  DISCONNECTED: "DISCONNECTED",
} as const;

export type NetworkStatus = (typeof NetworkStatus)[keyof typeof NetworkStatus];

export const IdentityKind = {
  EMAIL: "email",
  PHONE: "phone",
} as const;

export type IdentityKind = (typeof IdentityKind)[keyof typeof IdentityKind];

export interface UserIdentity {
  kind: IdentityKind;
  value: string;
  verifiedAt?: string | null;
}

export interface QuotaLimit {
  /** Hard byte ceiling. Null/undefined = no byte cap. */
  maxBytes?: number | null;
  /** Wall-clock session length. Null/undefined = no time cap. */
  maxDurationSeconds?: number | null;
}

export interface NetworkSession {
  id: string;
  enterpriseId: string;
  deviceId: string;
  macAddress: string;
  identity: UserIdentity | null;
  status: NetworkStatus;
  startedAt: string;
  endsAt: string | null;
  /** RADIUS Acct-Input-Octets (client → network). */
  bytesUp: number;
  /** RADIUS Acct-Output-Octets (network → client). */
  bytesDown: number;
  quotaBytes: number;
  downloadKbps: number;
  uploadKbps: number;
  acctSessionId: string | null;
  apId: string | null;
}

export const QUOTA_EVENTS = {
  ON_QUOTA_EXCEEDED: "ON_QUOTA_EXCEEDED",
  ON_STATUS_CHANGE: "ON_STATUS_CHANGE",
} as const;

export type QuotaEventName = (typeof QUOTA_EVENTS)[keyof typeof QUOTA_EVENTS];

export interface RadiusAdapterContext {
  host: string;
  port: number;
  secret: string;
}

export interface QuotaExceededPayload {
  session: NetworkSession;
  usedBytes: number;
  remainingBytes: number;
  isTimeExpired: boolean;
  radius?: RadiusAdapterContext | null;
}

export interface StatusChangePayload {
  session: NetworkSession;
  previous: NetworkStatus;
  next: NetworkStatus;
}

export interface QuotaEventMap {
  [QUOTA_EVENTS.ON_QUOTA_EXCEEDED]: QuotaExceededPayload;
  [QUOTA_EVENTS.ON_STATUS_CHANGE]: StatusChangePayload;
}

export interface OtpChallengeRecord {
  id: string;
  enterpriseId: string;
  deviceId: string;
  identityKind: IdentityKind;
  identityValue: string;
  codeHash: string;
  expiresAt: string;
  attemptCount: number;
  consumedAt: string | null;
  createdAt: string;
}

export interface IssueOtpResult {
  challengeId: string;
  expiresAt: string;
  resendAvailableAt: string;
  /** Present only when the caller requested echo (demo / CAPTIVE_OTP_ECHO). */
  code?: string;
}

export interface RecordUsageInput {
  sessionId: string;
  bytesUp?: number;
  bytesDown?: number;
}

export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
export const OTP_DIGITS = 6;

/** Demo-only free-tier defaults (live captive uses enterprise free_quota_mb / minutes). */
export const DEMO_DEFAULT_QUOTA_MB = 500;
export const DEMO_DEFAULT_SESSION_MINUTES = 60;
