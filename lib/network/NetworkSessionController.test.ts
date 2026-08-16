import { describe, expect, it } from "vitest";
import { MockNetworkAdapter } from "./adapters/MockNetworkAdapter.js";
import { IdentityVerificationService } from "./IdentityVerificationService.js";
import { QuotaEventEmitter } from "./QuotaEventEmitter.js";
import { InMemorySessionStore } from "./stores/InMemorySessionStore.js";
import {
  DuplicateConnectionError,
  SessionNotFoundError,
} from "./errors.js";
import {
  limitsFromEnterprise,
  mapDbSessionStatus,
  NetworkSessionController,
} from "./NetworkSessionController.js";
import {
  NetworkStatus,
  QUOTA_EVENTS,
} from "./types.js";

function makeController(overrides: { events?: QuotaEventEmitter } = {}) {
  const store = new InMemorySessionStore();
  const adapter = new MockNetworkAdapter({ silent: true });
  const events = overrides.events ?? new QuotaEventEmitter();
  const controller = new NetworkSessionController({ store, adapter, events });
  return { store, adapter, events, controller };
}

async function onboardVerified(
  controller: NetworkSessionController,
  store: InMemorySessionStore,
  mac = "aa:bb:cc:dd:ee:01",
) {
  const { device } = await controller.onboard({
    enterpriseId: "ent-1",
    macAddress: mac,
    apId: "ap-1",
  });
  return store.updateDevice(device.id, {
    email: "guest@example.com",
    identityVerifiedAt: new Date().toISOString(),
    status: "active",
  });
}

describe("onboard", () => {
  it("creates a pending device for a new MAC", async () => {
    const { store, controller } = makeController();
    const result = await controller.onboard({
      enterpriseId: "ent-1",
      macAddress: "aa:bb:cc:dd:ee:01",
      apId: "ap-1",
    });
    expect(result.isNew).toBe(true);
    expect(result.device.status).toBe("pending");
    expect(result.status).toBe(NetworkStatus.PENDING_VERIFICATION);
    expect(store.devices.size).toBe(1);
  });

  it("keeps an existing unverified device pending", async () => {
    const { controller } = makeController();
    await controller.onboard({ enterpriseId: "ent-1", macAddress: "aa:bb:cc:dd:ee:01" });
    const second = await controller.onboard({ enterpriseId: "ent-1", macAddress: "aa:bb:cc:dd:ee:01" });
    expect(second.isNew).toBe(false);
    expect(second.device.status).toBe("pending");
  });

  it("preserves the status of a verified device", async () => {
    const { store, controller } = makeController();
    const device = await onboardVerified(controller, store);
    expect(device.status).toBe("active");
    const again = await controller.onboard({
      enterpriseId: "ent-1",
      macAddress: device.macAddress,
    });
    expect(again.device.status).toBe("active");
  });

  it("never resets a blocked device to pending", async () => {
    const { store, controller } = makeController();
    const device = await onboardVerified(controller, store);
    await store.updateDevice(device.id, { status: "blocked" });
    const again = await controller.onboard({
      enterpriseId: "ent-1",
      macAddress: device.macAddress,
    });
    expect(again.device.status).toBe("blocked");
  });
});

describe("provisionSession", () => {
  it("creates an in-quota session and grants access", async () => {
    const { store, adapter, events, controller } = makeController();
    const device = await onboardVerified(controller, store);
    const statusChanges: unknown[] = [];
    events.on(QUOTA_EVENTS.ON_STATUS_CHANGE, (payload) => statusChanges.push(payload));
    const session = await controller.provisionSession({
      deviceId: device.id,
      limits: { maxBytes: 100, maxDurationSeconds: 3600 },
      downloadKbps: 5000,
      uploadKbps: 2000,
    });
    expect(session.status).toBe(NetworkStatus.CONNECTED);
    expect(session.quotaBytes).toBe(100);
    expect(session.downloadKbps).toBe(5000);
    expect(adapter.grants).toHaveLength(1);
    expect(statusChanges).toHaveLength(1);
  });

  it("rejects a duplicate active session by default", async () => {
    const { store, controller } = makeController();
    const device = await onboardVerified(controller, store);
    await controller.provisionSession({ deviceId: device.id, limits: { maxBytes: 100 } });
    await expect(
      controller.provisionSession({ deviceId: device.id, limits: { maxBytes: 100 } }),
    ).rejects.toBeInstanceOf(DuplicateConnectionError);
  });

  it("allows duplicates when allowDuplicate is set", async () => {
    const { store, controller } = makeController();
    const device = await onboardVerified(controller, store);
    await controller.provisionSession({ deviceId: device.id, limits: { maxBytes: 100 } });
    await expect(
      controller.provisionSession({
        deviceId: device.id,
        limits: { maxBytes: 100 },
        allowDuplicate: true,
      }),
    ).resolves.toMatchObject({ status: NetworkStatus.CONNECTED });
  });

  it("throws DeviceNotFoundError for an unknown device", async () => {
    const { controller } = makeController();
    await expect(
      controller.provisionSession({ deviceId: "missing", limits: { maxBytes: 100 } }),
    ).rejects.toThrow(/not found/i);
  });
});

describe("verifyAndProvision (OTP → session)", () => {
  it("records the verified identity and provisions a session", async () => {
    const store = new InMemorySessionStore();
    const adapter = new MockNetworkAdapter({ silent: true });
    const identity = new IdentityVerificationService({
      store,
      delivery: { deliver: async () => {} },
    });
    const controller = new NetworkSessionController({ store, adapter, identity });

    const { device } = await controller.onboard({
      enterpriseId: "ent-1",
      macAddress: "aa:bb:cc:dd:ee:02",
    });
    const issued = await controller.issueVerification({
      enterpriseId: "ent-1",
      deviceId: device.id,
      identity: { kind: "email", value: "Guest@Example.com" },
      echoCode: true,
    });

    const session = await controller.verifyAndProvision({
      deviceId: device.id,
      code: issued.code ?? "",
      limits: { maxBytes: 100 },
    });

    const updated = await store.getDeviceById(device.id);
    expect(updated?.email).toBe("guest@example.com");
    expect(updated?.identityVerifiedAt).not.toBeNull();
    expect(updated?.status).toBe("active");
    expect(session.status).toBe(NetworkStatus.CONNECTED);
    expect(adapter.grants).toHaveLength(1);
  });
});

describe("recordUsage", () => {
  it("accumulates octets while under quota", async () => {
    const { store, controller } = makeController();
    const device = await onboardVerified(controller, store);
    const session = await controller.provisionSession({
      deviceId: device.id,
      limits: { maxBytes: 1000, maxDurationSeconds: 3600 },
    });
    const after = await controller.recordUsage({
      sessionId: session.id,
      bytesUp: 100,
      bytesDown: 50,
    });
    expect(after.bytesUp).toBe(100);
    expect(after.bytesDown).toBe(50);
    expect(after.status).toBe(NetworkStatus.CONNECTED);
  });

  it("closes the session when the byte quota is exhausted and revokes access", async () => {
    const { store, adapter, events, controller } = makeController();
    const device = await onboardVerified(controller, store);
    const session = await controller.provisionSession({
      deviceId: device.id,
      limits: { maxBytes: 100, maxDurationSeconds: 3600 },
    });

    const quotaEvents: unknown[] = [];
    events.on(QUOTA_EVENTS.ON_QUOTA_EXCEEDED, (payload) => quotaEvents.push(payload));
    const statusEvents: unknown[] = [];
    events.on(QUOTA_EVENTS.ON_STATUS_CHANGE, (payload) => statusEvents.push(payload));

    const after = await controller.recordUsage({
      sessionId: session.id,
      bytesUp: 60,
      bytesDown: 60,
    });

    expect(after.status).toBe(NetworkStatus.QUOTA_EXCEEDED);
    expect(quotaEvents).toHaveLength(1);
    expect(statusEvents).toHaveLength(1);
    expect(adapter.revokes).toHaveLength(1);
    expect(adapter.revokes[0]?.reason).toBe("quota_exceeded");

    const stored = await store.getSessionById(session.id);
    expect(stored?.status).toBe("quota_exceeded");
    expect(stored?.disconnectedAt).not.toBeNull();
  });

  it("marks time-expired sessions as expired (not quota_exceeded)", async () => {
    const { store, adapter, controller } = makeController();
    const device = await onboardVerified(controller, store);
    const session = await controller.provisionSession({
      deviceId: device.id,
      limits: { maxBytes: 1_000_000, maxDurationSeconds: 60 },
    });
    await store.updateSession(session.id, {
      endsAt: new Date(Date.now() - 5000).toISOString(),
    });
    const after = await controller.recordUsage({ sessionId: session.id, bytesUp: 10 });
    // Time expiry maps to DISCONNECTED at the network layer while the DB row
    // is marked "expired" (distinct from byte exhaustion).
    expect(after.status).toBe(NetworkStatus.DISCONNECTED);
    const stored = await store.getSessionById(session.id);
    expect(stored?.status).toBe("expired");
    expect(adapter.revokes[0]?.reason).toBe("expired");
  });

  it("throws SessionNotFoundError for an unknown session", async () => {
    const { controller } = makeController();
    await expect(
      controller.recordUsage({ sessionId: "missing", bytesUp: 1 }),
    ).rejects.toBeInstanceOf(SessionNotFoundError);
  });
});

describe("getActiveSession / getOnlineStatus", () => {
  it("returns the in-quota session and null once exhausted", async () => {
    const { store, controller } = makeController();
    const device = await onboardVerified(controller, store);
    const session = await controller.provisionSession({
      deviceId: device.id,
      limits: { maxBytes: 100, maxDurationSeconds: 3600 },
    });

    await expect(controller.getActiveSession(device.id)).resolves.toMatchObject({
      id: session.id,
    });

    await controller.recordUsage({ sessionId: session.id, bytesUp: 200 });
    await expect(controller.getActiveSession(device.id)).resolves.toBeNull();
    const stored = await store.getSessionById(session.id);
    expect(stored?.status).toBe("quota_exceeded");
  });

  it("maps online status for devices and sessions", async () => {
    const { store, controller } = makeController();
    expect(await controller.getOnlineStatus("unknown")).toBe(NetworkStatus.UNAUTHENTICATED);

    const { device } = await controller.onboard({
      enterpriseId: "ent-1",
      macAddress: "aa:bb:cc:dd:ee:03",
    });
    expect(await controller.getOnlineStatus(device.id)).toBe(
      NetworkStatus.PENDING_VERIFICATION,
    );

    await store.updateDevice(device.id, {
      email: "a@b.c",
      identityVerifiedAt: new Date().toISOString(),
      status: "active",
    });
    expect(await controller.getOnlineStatus(device.id)).toBe(NetworkStatus.DISCONNECTED);

    const session = await controller.provisionSession({
      deviceId: device.id,
      limits: { maxBytes: 100, maxDurationSeconds: 3600 },
    });
    expect(await controller.getOnlineStatus(device.id)).toBe(NetworkStatus.CONNECTED);
    expect(await controller.getOnlineStatus(session.id)).toBe(NetworkStatus.CONNECTED);

    await controller.recordUsage({ sessionId: session.id, bytesUp: 500 });
    expect(await controller.getOnlineStatus(session.id)).toBe(
      NetworkStatus.QUOTA_EXCEEDED,
    );
  });
});

describe("attachAcctContext", () => {
  it("attaches gateway acct-session and ap context", async () => {
    const { store, controller } = makeController();
    const device = await onboardVerified(controller, store);
    const session = await controller.provisionSession({
      deviceId: device.id,
      limits: { maxBytes: 100 },
    });
    expect(session.acctSessionId).toBeNull();

    const attached = await controller.attachAcctContext(session.id, {
      acctSessionId: "acct-123",
      apId: "ap-2",
    });
    expect(attached.acctSessionId).toBe("acct-123");
    expect(attached.apId).toBe("ap-2");
    const stored = await store.getSessionById(session.id);
    expect(stored?.acctSessionId).toBe("acct-123");
  });
});

describe("applyPaidUpgrade", () => {
  it("credits purchased allowance on top of used bytes and throttles to plan speeds", async () => {
    const { store, adapter, controller } = makeController();
    const device = await onboardVerified(controller, store);
    const session = await controller.provisionSession({
      deviceId: device.id,
      limits: { maxBytes: 1000, maxDurationSeconds: 3600 },
    });
    await controller.recordUsage({ sessionId: session.id, bytesUp: 100, bytesDown: 50 });

    const upgraded = await controller.applyPaidUpgrade(session.id, {
      planId: "plan-1",
      stripeCheckoutSessionId: "cs_123",
      quotaBytes: 5000,
      endsAt: new Date(Date.now() + 3600_000).toISOString(),
      downloadKbps: 10000,
      uploadKbps: 4000,
    });

    expect(upgraded.quotaBytes).toBe(150 + 5000);
    expect(upgraded.downloadKbps).toBe(10000);
    expect(upgraded.uploadKbps).toBe(4000);
    expect(upgraded.status).toBe(NetworkStatus.CONNECTED);

    const stored = await store.getSessionById(session.id);
    expect(stored?.planId).toBe("plan-1");
    expect(stored?.stripeCheckoutSessionId).toBe("cs_123");
    expect(stored?.disconnectedAt).toBeNull();

    expect(adapter.throttles).toHaveLength(1);
    expect(adapter.throttles[0]?.downloadKbps).toBe(10000);
    expect(adapter.throttles[0]?.uploadKbps).toBe(4000);
  });

  it("caps unlimited plans at MAX_SAFE_INTEGER", async () => {
    const { store, controller } = makeController();
    const device = await onboardVerified(controller, store);
    const session = await controller.provisionSession({
      deviceId: device.id,
      limits: { maxBytes: 100 },
    });
    const upgraded = await controller.applyPaidUpgrade(session.id, {
      planId: "plan-unlimited",
      stripeCheckoutSessionId: "cs_9",
      quotaBytes: Number.MAX_SAFE_INTEGER,
      endsAt: null,
      downloadKbps: 0,
      uploadKbps: 0,
    });
    expect(upgraded.quotaBytes).toBe(Number.MAX_SAFE_INTEGER);
  });
});

describe("resetQuota / extendQuota / updateLimits", () => {
  it("resets counters, quota, and deadline and re-grants access", async () => {
    const { store, adapter, controller } = makeController();
    const device = await onboardVerified(controller, store);
    const session = await controller.provisionSession({
      deviceId: device.id,
      limits: { maxBytes: 100, maxDurationSeconds: 60 },
    });
    await controller.recordUsage({ sessionId: session.id, bytesUp: 90 });

    const reset = await controller.resetQuota(session.id, {
      maxBytes: 500,
      maxDurationSeconds: 300,
    });
    expect(reset.bytesUp).toBe(0);
    expect(reset.quotaBytes).toBe(500);
    expect(reset.status).toBe(NetworkStatus.CONNECTED);
    expect(adapter.grants.length).toBeGreaterThanOrEqual(2);
    expect((await store.getSessionById(session.id))?.status).toBe("active");
  });

  it("extends quota by bytes and seconds", async () => {
    const { store, controller } = makeController();
    const device = await onboardVerified(controller, store);
    const session = await controller.provisionSession({
      deviceId: device.id,
      limits: { maxBytes: 100, maxDurationSeconds: 60 },
    });
    const originalEnds = session.endsAt;
    const extended = await controller.extendQuota(session.id, {
      extraBytes: 900,
      extraSeconds: 600,
    });
    expect(extended.quotaBytes).toBe(1000);
    const stored = await store.getSessionById(session.id);
    expect(stored?.endsAt).not.toBeNull();
    expect(
      new Date(stored?.endsAt ?? 0).getTime() - new Date(originalEnds ?? 0).getTime(),
    ).toBe(600_000);
  });

  it("updates limits and throttles", async () => {
    const fixture = makeController();
    const device = await onboardVerified(fixture.controller, fixture.store);
    const session = await fixture.controller.provisionSession({
      deviceId: device.id,
      limits: { maxBytes: 100, maxDurationSeconds: 60 },
    });
    const updated = await fixture.controller.updateLimits(session.id, {
      maxBytes: 200,
      maxDurationSeconds: 120,
    });
    expect(updated.quotaBytes).toBe(200);
    expect(fixture.adapter.throttles).toHaveLength(1);
  });
});

describe("listActiveSessions", () => {
  it("returns only active sessions, optionally filtered by enterprise", async () => {
    const { store, controller } = makeController();
    const device = await onboardVerified(controller, store);
    await controller.provisionSession({ deviceId: device.id, limits: { maxBytes: 100 } });
    const second = await onboardVerified(controller, store, "aa:bb:cc:dd:ee:04");
    await controller.provisionSession({ deviceId: second.id, limits: { maxBytes: 100 } });

    const all = await controller.listActiveSessions();
    expect(all).toHaveLength(2);
    const ent = await controller.listActiveSessions("ent-1");
    expect(ent).toHaveLength(2);
  });
});

describe("helpers", () => {
  it("maps db session statuses to network statuses", () => {
    expect(mapDbSessionStatus("active")).toBe(NetworkStatus.CONNECTED);
    expect(mapDbSessionStatus("quota_exceeded")).toBe(NetworkStatus.QUOTA_EXCEEDED);
    expect(mapDbSessionStatus("disconnected")).toBe(NetworkStatus.DISCONNECTED);
    expect(mapDbSessionStatus("expired")).toBe(NetworkStatus.DISCONNECTED);
    expect(mapDbSessionStatus("upgraded")).toBe(NetworkStatus.DISCONNECTED);
    expect(mapDbSessionStatus("nonsense")).toBe(NetworkStatus.DISCONNECTED);
  });

  it("converts enterprise free-tier settings to limits", () => {
    expect(limitsFromEnterprise({ freeQuotaMb: 500, freeSessionMinutes: 60 })).toEqual({
      maxBytes: 500 * 1024 * 1024,
      maxDurationSeconds: 3600,
    });
    expect(limitsFromEnterprise({ freeQuotaMb: -5, freeSessionMinutes: -10 })).toEqual({
      maxBytes: 0,
      maxDurationSeconds: 0,
    });
  });
});
