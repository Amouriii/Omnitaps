import { describe, expect, it, vi } from "vitest";
import {
  IdentityVerificationService,
  normalizeIdentity,
  parseIdentityInput,
  shouldEchoCaptiveOtp,
} from "./IdentityVerificationService.js";
import {
  IdentityRequiredError,
  OtpChallengeNotFoundError,
  OtpExpiredError,
  OtpInvalidCodeError,
  OtpResendCooldownError,
  OtpTooManyAttemptsError,
} from "./errors.js";
import { InMemorySessionStore } from "./stores/InMemorySessionStore.js";
import {
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_TTL_MS,
} from "./types.js";

const T0 = new Date("2026-01-01T00:00:00.000Z");

function makeService(overrides: { delivery?: { deliver: (input: unknown) => Promise<void> }; now?: () => Date } = {}) {
  const store = new InMemorySessionStore();
  const service = new IdentityVerificationService({
    store,
    delivery: overrides.delivery ?? { deliver: async () => {} },
    now: overrides.now ?? (() => T0),
  });
  return { store, service };
}

async function issuePhone(service: IdentityVerificationService, store: InMemorySessionStore, phone = "+15550101000") {
  const { device } = await store.upsertDevice({
    enterpriseId: "ent-1",
    macAddress: "aa:bb:cc:dd:ee:01",
  });
  const issued = await service.issue({
    enterpriseId: "ent-1",
    deviceId: device.id,
    identity: { kind: "phone", value: phone },
    echoCode: true,
  });
  return { device, issued };
}

describe("issue", () => {
  it("creates a challenge and delivers an echoed 6-digit code", async () => {
    const { store, service } = makeService();
    const { device, issued } = await issuePhone(service, store);
    expect(issued.code).toMatch(/^\d{6}$/);
    expect(issued.expiresAt).toBe(new Date(T0.getTime() + OTP_TTL_MS).toISOString());
    expect(issued.resendAvailableAt).toBe(
      new Date(T0.getTime() + OTP_RESEND_COOLDOWN_MS).toISOString(),
    );
    const challenge = await store.getChallengeById(issued.challengeId);
    expect(challenge?.codeHash).toBeTruthy();
    // Never store the plaintext code.
    expect(challenge?.codeHash).not.toContain(issued.code ?? "000000");
    expect(store.challenges.size).toBe(1);
    void device;
  });

  it("echoes the code only when echoCode is requested", async () => {
    const store = new InMemorySessionStore();
    const service = new IdentityVerificationService({ store, now: () => T0, delivery: { deliver: async () => {} } });
    const { device } = await store.upsertDevice({
      enterpriseId: "ent-1",
      macAddress: "aa:bb:cc:dd:ee:01",
    });
    const silent = await service.issue({
      enterpriseId: "ent-1",
      deviceId: device.id,
      identity: { kind: "email", value: "guest@example.com" },
    });
    expect(silent.code).toBeUndefined();
  });

  it("blocks resends during the cooldown window", async () => {
    const store = new InMemorySessionStore();
    const service = new IdentityVerificationService({ store, delivery: { deliver: async () => {} } });
    const { device } = await store.upsertDevice({
      enterpriseId: "ent-1",
      macAddress: "aa:bb:cc:dd:ee:01",
    });
    await service.issue({
      enterpriseId: "ent-1",
      deviceId: device.id,
      identity: { kind: "phone", value: "+15550101000" },
    });
    // Immediate re-issue is inside the 60s cooldown.
    await expect(
      service.issue({
        enterpriseId: "ent-1",
        deviceId: device.id,
        identity: { kind: "phone", value: "+15550101000" },
      }),
    ).rejects.toBeInstanceOf(OtpResendCooldownError);
  });

  it("allows a resend after the cooldown elapses", async () => {
    const store = new InMemorySessionStore();
    let current = new Date();
    const service = new IdentityVerificationService({ store, now: () => current, delivery: { deliver: async () => {} } });
    const { device } = await store.upsertDevice({
      enterpriseId: "ent-1",
      macAddress: "aa:bb:cc:dd:ee:01",
    });
    await service.issue({
      enterpriseId: "ent-1",
      deviceId: device.id,
      identity: { kind: "phone", value: "+15550101000" },
    });
    // The store stamps challenges with wall-clock time; advance past the cooldown.
    current = new Date(current.getTime() + OTP_RESEND_COOLDOWN_MS + 1000);
    await expect(
      service.issue({
        enterpriseId: "ent-1",
        deviceId: device.id,
        identity: { kind: "phone", value: "+15550101000" },
        echoCode: true,
      }),
    ).resolves.toMatchObject({ code: expect.any(String) });
  });

  it("removes the challenge when delivery fails so resend is not blocked", async () => {
    const { store, service } = makeService({
      delivery: { deliver: async () => { throw new Error("provider down"); } },
    });
    const { device } = await store.upsertDevice({
      enterpriseId: "ent-1",
      macAddress: "aa:bb:cc:dd:ee:01",
    });
    await expect(
      service.issue({
        enterpriseId: "ent-1",
        deviceId: device.id,
        identity: { kind: "phone", value: "+15550101000" },
      }),
    ).rejects.toThrow("provider down");
    expect(store.challenges.size).toBe(0);
  });
});

describe("verify", () => {
  it("consumes the challenge on a correct code", async () => {
    const { store, service } = makeService();
    const { device, issued } = await issuePhone(service, store);
    const result = await service.verify({
      deviceId: device.id,
      code: issued.code ?? "",
    });
    expect(result.identity.value).toBe("+15550101000");
    expect(result.identity.verifiedAt).toBe(T0.toISOString());
    const challenge = await store.getChallengeById(issued.challengeId);
    expect(challenge?.consumedAt).toBe(T0.toISOString());
  });

  it("rejects a wrong code and increments the attempt counter", async () => {
    const { store, service } = makeService();
    const { device, issued } = await issuePhone(service, store);
    await expect(
      service.verify({ deviceId: device.id, code: "000000" }),
    ).rejects.toBeInstanceOf(OtpInvalidCodeError);
    const challenge = await store.getChallengeById(issued.challengeId);
    expect(challenge?.attemptCount).toBe(1);
  });

  it("rejects expired challenges", async () => {
    const store = new InMemorySessionStore();
    const now = vi.fn(() => T0);
    const service = new IdentityVerificationService({ store, now: now as () => Date, delivery: { deliver: async () => {} } });
    const { device } = await store.upsertDevice({
      enterpriseId: "ent-1",
      macAddress: "aa:bb:cc:dd:ee:01",
    });
    const issued = await service.issue({
      enterpriseId: "ent-1",
      deviceId: device.id,
      identity: { kind: "phone", value: "+15550101000" },
      echoCode: true,
    });
    now.mockReturnValue(new Date(T0.getTime() + OTP_TTL_MS + 1));
    await expect(
      service.verify({ deviceId: device.id, code: issued.code ?? "" }),
    ).rejects.toBeInstanceOf(OtpExpiredError);
  });

  it("locks out after too many attempts", async () => {
    const { store, service } = makeService();
    const { device, issued } = await issuePhone(service, store);
    for (let i = 0; i < OTP_MAX_ATTEMPTS; i += 1) {
      const attempt = service.verify({ deviceId: device.id, code: "000000" });
      if (i < OTP_MAX_ATTEMPTS - 1) {
        await expect(attempt).rejects.toBeInstanceOf(OtpInvalidCodeError);
      } else {
        // The attempt that reaches the cap is rejected as too many.
        await expect(attempt).rejects.toBeInstanceOf(OtpTooManyAttemptsError);
      }
    }
    // Locked out: even the correct code is now rejected.
    await expect(
      service.verify({ deviceId: device.id, code: issued.code ?? "" }),
    ).rejects.toBeInstanceOf(OtpTooManyAttemptsError);
  });

  it("rejects a challenge already consumed", async () => {
    const { store, service } = makeService();
    const { device, issued } = await issuePhone(service, store);
    await service.verify({ deviceId: device.id, code: issued.code ?? "" });
    await expect(
      service.verify({ deviceId: device.id, code: issued.code ?? "" }),
    ).rejects.toBeInstanceOf(OtpChallengeNotFoundError);
  });

  it("rejects a challenge that belongs to another device", async () => {
    const { store, service } = makeService();
    const { issued } = await issuePhone(service, store);
    const { device: other } = await store.upsertDevice({
      enterpriseId: "ent-1",
      macAddress: "aa:bb:cc:dd:ee:02",
    });
    await expect(
      service.verify({ deviceId: other.id, challengeId: issued.challengeId, code: "123456" }),
    ).rejects.toBeInstanceOf(OtpChallengeNotFoundError);
  });

  it("rejects non-numeric codes up front", async () => {
    const { store, service } = makeService();
    const { device } = await store.upsertDevice({
      enterpriseId: "ent-1",
      macAddress: "aa:bb:cc:dd:ee:01",
    });
    await expect(
      service.verify({ deviceId: device.id, code: "abc" }),
    ).rejects.toBeInstanceOf(OtpInvalidCodeError);
  });
});

describe("identity normalization", () => {
  it("normalizes email to lowercase and validates it", () => {
    expect(normalizeIdentity({ kind: "email", value: " Guest@Example.COM " })).toEqual({
      kind: "email",
      value: "guest@example.com",
    });
    expect(() =>
      normalizeIdentity({ kind: "email", value: "not-an-email" }),
    ).toThrow(IdentityRequiredError);
  });

  it("normalizes and validates phone numbers", () => {
    expect(
      normalizeIdentity({ kind: "phone", value: "+1 (555) 010-1000" }),
    ).toEqual({ kind: "phone", value: "+15550101000" });
    expect(() => normalizeIdentity({ kind: "phone", value: "abc" })).toThrow(
      IdentityRequiredError,
    );
  });

  it("parses email/phone from request-style input", () => {
    expect(parseIdentityInput({ email: " a@b.c " })).toEqual({
      kind: "email",
      value: "a@b.c",
    });
    expect(parseIdentityInput({ phone_number: "+15550101000" })).toEqual({
      kind: "phone",
      value: "+15550101000",
    });
    expect(parseIdentityInput({ kind: "phone", value: "+15550101000" })).toEqual({
      kind: "phone",
      value: "+15550101000",
    });
    expect(() => parseIdentityInput({})).toThrow(IdentityRequiredError);
  });
});

describe("shouldEchoCaptiveOtp", () => {
  it("reads the CAPTIVE_OTP_ECHO env flag", () => {
    expect(shouldEchoCaptiveOtp({ CAPTIVE_OTP_ECHO: "1" })).toBe(true);
    expect(shouldEchoCaptiveOtp({ CAPTIVE_OTP_ECHO: "0" })).toBe(false);
    expect(shouldEchoCaptiveOtp({})).toBe(false);
  });
});
