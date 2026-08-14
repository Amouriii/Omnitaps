import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import {
  ConsoleOtpDelivery,
  type OtpDeliveryAdapter,
} from "./delivery/OtpDelivery.js";
import {
  IdentityRequiredError,
  OtpChallengeNotFoundError,
  OtpExpiredError,
  OtpInvalidCodeError,
  OtpResendCooldownError,
  OtpTooManyAttemptsError,
} from "./errors.js";
import {
  IdentityKind,
  OTP_DIGITS,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_TTL_MS,
  type IdentityKind as IdentityKindType,
  type IssueOtpResult,
  type UserIdentity,
} from "./types.js";
import type { SessionStore } from "./stores/SessionStore.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[1-9]\d{6,14}$/;

export function normalizeIdentity(identity: UserIdentity): UserIdentity {
  const kind = identity.kind;
  const raw = identity.value.trim();
  if (kind === IdentityKind.EMAIL) {
    const value = raw.toLowerCase();
    if (!EMAIL_RE.test(value)) {
      throw new IdentityRequiredError("Invalid email address.");
    }
    return { kind, value };
  }
  const digits = raw.replace(/[^\d+]/g, "");
  const value = digits.startsWith("+") ? `+${digits.replace(/\D/g, "")}` : digits.replace(/\D/g, "");
  if (!PHONE_RE.test(value)) {
    throw new IdentityRequiredError("Invalid phone number.");
  }
  return { kind: IdentityKind.PHONE, value };
}

export function parseIdentityInput(input: {
  email?: string | null;
  phone?: string | null;
  phone_number?: string | null;
  kind?: string | null;
  value?: string | null;
}): UserIdentity {
  const email = input.email?.trim();
  const phone = (input.phone ?? input.phone_number)?.trim();
  if (email && !phone) {
    return normalizeIdentity({ kind: IdentityKind.EMAIL, value: email });
  }
  if (phone && !email) {
    return normalizeIdentity({ kind: IdentityKind.PHONE, value: phone });
  }
  if (input.kind && input.value) {
    const kind = input.kind === "email" ? IdentityKind.EMAIL : IdentityKind.PHONE;
    return normalizeIdentity({ kind, value: input.value });
  }
  throw new IdentityRequiredError();
}

export function hashOtpCode(input: {
  enterpriseId: string;
  deviceId: string;
  identityValue: string;
  code: string;
}): string {
  return createHash("sha256")
    .update(
      `${input.enterpriseId}:${input.deviceId}:${input.identityValue}:${input.code}`,
      "utf8",
    )
    .digest("hex");
}

function hashesEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  if (left.length !== right.length || left.length === 0) {
    return false;
  }
  return timingSafeEqual(left, right);
}

function generateNumericCode(digits = OTP_DIGITS): string {
  const max = 10 ** digits;
  return String(randomInt(0, max)).padStart(digits, "0");
}

export interface IdentityVerificationServiceOptions {
  store: SessionStore;
  delivery?: OtpDeliveryAdapter;
  ttlMs?: number;
  maxAttempts?: number;
  resendCooldownMs?: number;
  now?: () => Date;
}

export class IdentityVerificationService {
  private readonly store: SessionStore;
  private readonly delivery: OtpDeliveryAdapter;
  private readonly ttlMs: number;
  private readonly maxAttempts: number;
  private readonly resendCooldownMs: number;
  private readonly now: () => Date;

  constructor(options: IdentityVerificationServiceOptions) {
    this.store = options.store;
    this.delivery = options.delivery ?? new ConsoleOtpDelivery();
    this.ttlMs = options.ttlMs ?? OTP_TTL_MS;
    this.maxAttempts = options.maxAttempts ?? OTP_MAX_ATTEMPTS;
    this.resendCooldownMs = options.resendCooldownMs ?? OTP_RESEND_COOLDOWN_MS;
    this.now = options.now ?? (() => new Date());
  }

  async issue(input: {
    enterpriseId: string;
    deviceId: string;
    identity: UserIdentity;
    echoCode?: boolean;
  }): Promise<IssueOtpResult> {
    const identity = normalizeIdentity(input.identity);
    const now = this.now();
    const existing = await this.store.findLatestOpenChallenge(input.deviceId);
    if (existing) {
      const created = new Date(existing.createdAt).getTime();
      const elapsed = now.getTime() - created;
      if (elapsed >= 0 && elapsed < this.resendCooldownMs) {
        const retryAfterSeconds = Math.ceil((this.resendCooldownMs - elapsed) / 1000);
        throw new OtpResendCooldownError(retryAfterSeconds);
      }
    }

    const code = generateNumericCode();
    const expiresAt = new Date(now.getTime() + this.ttlMs).toISOString();
    const codeHash = hashOtpCode({
      enterpriseId: input.enterpriseId,
      deviceId: input.deviceId,
      identityValue: identity.value,
      code,
    });

    const challenge = await this.store.createChallenge({
      enterpriseId: input.enterpriseId,
      deviceId: input.deviceId,
      identityKind: identity.kind,
      identityValue: identity.value,
      codeHash,
      expiresAt,
    });

    await this.delivery.deliver({
      identity,
      code,
      deviceId: input.deviceId,
      expiresAt,
    });

    const result: IssueOtpResult = {
      challengeId: challenge.id,
      expiresAt,
      resendAvailableAt: new Date(now.getTime() + this.resendCooldownMs).toISOString(),
    };
    if (input.echoCode) {
      result.code = code;
    }
    return result;
  }

  async verify(input: {
    deviceId: string;
    code: string;
    challengeId?: string;
  }): Promise<{
    identity: UserIdentity;
    challengeId: string;
    identityKind: IdentityKindType;
    identityValue: string;
  }> {
    const code = input.code.trim();
    if (!/^\d{6}$/.test(code)) {
      throw new OtpInvalidCodeError();
    }

    const challenge = input.challengeId
      ? await this.store.getChallengeById(input.challengeId)
      : await this.store.findLatestOpenChallenge(input.deviceId);

    if (!challenge || challenge.deviceId !== input.deviceId) {
      throw new OtpChallengeNotFoundError();
    }
    if (challenge.consumedAt) {
      throw new OtpChallengeNotFoundError("Verification code already used.");
    }

    const now = this.now();
    if (new Date(challenge.expiresAt).getTime() <= now.getTime()) {
      throw new OtpExpiredError();
    }
    if (challenge.attemptCount >= this.maxAttempts) {
      throw new OtpTooManyAttemptsError();
    }

    const expected = hashOtpCode({
      enterpriseId: challenge.enterpriseId,
      deviceId: challenge.deviceId,
      identityValue: challenge.identityValue,
      code,
    });

    if (!hashesEqual(expected, challenge.codeHash)) {
      await this.store.updateChallenge(challenge.id, {
        attemptCount: challenge.attemptCount + 1,
      });
      if (challenge.attemptCount + 1 >= this.maxAttempts) {
        throw new OtpTooManyAttemptsError();
      }
      throw new OtpInvalidCodeError();
    }

    await this.store.updateChallenge(challenge.id, {
      consumedAt: now.toISOString(),
    });

    return {
      identity: {
        kind: challenge.identityKind,
        value: challenge.identityValue,
        verifiedAt: now.toISOString(),
      },
      challengeId: challenge.id,
      identityKind: challenge.identityKind,
      identityValue: challenge.identityValue,
    };
  }
}

export function shouldEchoCaptiveOtp(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.CAPTIVE_OTP_ECHO === "1";
}
