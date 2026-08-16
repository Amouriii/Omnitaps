export {
  DEMO_DEFAULT_QUOTA_MB,
  DEMO_DEFAULT_SESSION_MINUTES,
  IdentityKind,
  NetworkStatus,
  OTP_DIGITS,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_TTL_MS,
  QUOTA_EVENTS,
} from "./types.js";
export type {
  IssueOtpResult,
  NetworkSession,
  OtpChallengeRecord,
  QuotaEventMap,
  QuotaExceededPayload,
  QuotaLimit,
  RadiusAdapterContext,
  RecordUsageInput,
  StatusChangePayload,
  UserIdentity,
} from "./types.js";

export {
  AdapterFailureError,
  DeviceNotFoundError,
  DuplicateConnectionError,
  IdentityRequiredError,
  NetworkModuleError,
  OtpChallengeNotFoundError,
  OtpExpiredError,
  OtpInvalidCodeError,
  OtpResendCooldownError,
  OtpTooManyAttemptsError,
  SessionNotFoundError,
} from "./errors.js";

export {
  IdentityVerificationService,
  hashOtpCode,
  normalizeIdentity,
  parseIdentityInput,
  shouldEchoCaptiveOtp,
} from "./IdentityVerificationService.js";

export { QuotaEventEmitter } from "./QuotaEventEmitter.js";
export type { NetworkAdapter } from "./NetworkAdapterInterface.js";
export {
  NetworkSessionController,
  limitsFromEnterprise,
  mapDbSessionStatus,
  toNetworkSession,
} from "./NetworkSessionController.js";

export { MockNetworkAdapter, NoopNetworkAdapter } from "./adapters/MockNetworkAdapter.js";
export {
  RadiusNetworkAdapter,
  radiusContextFromEnterprise,
} from "./adapters/RadiusNetworkAdapter.js";
export { InMemorySessionStore } from "./stores/InMemorySessionStore.js";
export { SupabaseNetworkStore } from "./stores/SupabaseNetworkStore.js";
export { ConsoleOtpDelivery, NoopOtpDelivery } from "./delivery/OtpDelivery.js";
export {
  HttpOtpDelivery,
  ResendOtpDelivery,
  TwilioSmsOtpDelivery,
} from "./delivery/HttpOtpDelivery.js";
export { captiveQuotaEvents, ensureDefaultQuotaSubscriber } from "./captiveQuota.js";
