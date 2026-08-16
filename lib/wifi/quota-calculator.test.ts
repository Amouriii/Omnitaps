import { describe, expect, it } from "vitest";
import {
  buildQuotaEntitlements,
  calculateSessionQuota,
  combineOctetCounter,
  mbToBytes,
  remainingSessionSeconds,
} from "./quota-calculator.js";

describe("calculateSessionQuota", () => {
  const startedAt = "2026-01-01T00:00:00.000Z";
  const endsAt = "2026-01-01T01:00:00.000Z";

  it("computes used/remaining/percent from octet counters", () => {
    const snap = calculateSessionQuota({
      inputOctets: 100,
      outputOctets: 300,
      quotaBytes: 1024 * 1024,
      startedAt,
      endsAt,
      now: "2026-01-01T00:30:00.000Z",
    });
    expect(snap.usedBytes).toBe(400);
    expect(snap.remainingBytes).toBe(1024 * 1024 - 400);
    expect(snap.percentUsed).toBeCloseTo(0.04, 2);
    expect(snap.isExhausted).toBe(false);
    expect(snap.isTimeExpired).toBe(false);
  });

  it("flags exhaustion when bytes are spent", () => {
    const snap = calculateSessionQuota({
      inputOctets: 80,
      outputOctets: 80,
      quotaBytes: 100,
      startedAt,
      endsAt,
      now: "2026-01-01T00:30:00.000Z",
    });
    expect(snap.remainingBytes).toBe(0);
    expect(snap.isExhausted).toBe(true);
  });

  it("flags time expiry when the deadline has passed", () => {
    const snap = calculateSessionQuota({
      inputOctets: 0,
      outputOctets: 0,
      quotaBytes: 1_000_000,
      startedAt,
      endsAt: "2020-01-01T00:00:00.000Z",
    });
    expect(snap.isTimeExpired).toBe(true);
    expect(snap.isExhausted).toBe(true);
    expect(snap.remainingSeconds).toBe(0);
  });

  it("returns null remaining seconds when no end is set", () => {
    const snap = calculateSessionQuota({
      inputOctets: 0,
      outputOctets: 0,
      quotaBytes: 100,
      startedAt,
      endsAt: null,
    });
    expect(snap.remainingSeconds).toBeNull();
    expect(snap.isTimeExpired).toBe(false);
  });

  it("combines gigawords and low octets", () => {
    expect(combineOctetCounter(100, 1)).toBe(2 ** 32 + 100);
    expect(combineOctetCounter(undefined)).toBe(0);
  });
});

describe("buildQuotaEntitlements", () => {
  it("maps MB + minutes to bytes + ISO end", () => {
    const startedAt = new Date("2026-01-01T00:00:00.000Z");
    const entitlements = buildQuotaEntitlements({
      quotaMb: 500,
      durationMinutes: 60,
      startedAt,
    });
    expect(entitlements.quotaBytes).toBe(500 * 1024 * 1024);
    expect(entitlements.endsAt).toBe("2026-01-01T01:00:00.000Z");
  });

  it("treats a null quota as unlimited (MAX_SAFE_INTEGER)", () => {
    const entitlements = buildQuotaEntitlements({ quotaMb: null, durationMinutes: null });
    expect(entitlements.quotaBytes).toBe(Number.MAX_SAFE_INTEGER);
    expect(entitlements.endsAt).toBeNull();
  });

  it("omits the deadline when duration is null", () => {
    const entitlements = buildQuotaEntitlements({ quotaMb: 100, durationMinutes: null });
    expect(entitlements.endsAt).toBeNull();
  });
});

describe("helpers", () => {
  it("converts MB to bytes", () => {
    expect(mbToBytes(1)).toBe(1024 * 1024);
    expect(mbToBytes(0)).toBe(0);
    expect(mbToBytes(-5)).toBe(0);
  });

  it("computes remaining wall-clock seconds", () => {
    const now = new Date("2026-01-01T00:30:00.000Z");
    expect(
      remainingSessionSeconds(
        "2026-01-01T00:00:00.000Z",
        "2026-01-01T01:00:00.000Z",
        now,
      ),
    ).toBe(1800);
    expect(
      remainingSessionSeconds(
        "2026-01-01T00:00:00.000Z",
        "2026-01-01T00:10:00.000Z",
        now,
      ),
    ).toBe(0);
    expect(remainingSessionSeconds("2026-01-01T00:00:00.000Z", null, now)).toBeNull();
  });
});
