import { describe, expect, it } from "vitest";
import { InMemorySessionStore } from "./InMemorySessionStore.js";

describe("InMemorySessionStore", () => {
  it("upserts devices by (enterprise, mac)", async () => {
    const store = new InMemorySessionStore();
    const first = await store.upsertDevice({
      enterpriseId: "ent-1",
      macAddress: "aa:bb:cc:dd:ee:01",
    });
    expect(first.isNew).toBe(true);
    const second = await store.upsertDevice({
      enterpriseId: "ent-1",
      macAddress: "aa:bb:cc:dd:ee:01",
    });
    expect(second.isNew).toBe(false);
    expect(second.device.id).toBe(first.device.id);
  });

  it("updates devices and sessions", async () => {
    const store = new InMemorySessionStore();
    const { device } = await store.upsertDevice({
      enterpriseId: "ent-1",
      macAddress: "aa:bb:cc:dd:ee:01",
    });
    const updated = await store.updateDevice(device.id, { email: "a@b.c" });
    expect(updated.email).toBe("a@b.c");

    const session = await store.createSession({
      enterpriseId: "ent-1",
      deviceId: device.id,
      quotaBytes: 100,
      endsAt: null,
    });
    const patched = await store.updateSession(session.id, { status: "quota_exceeded" });
    expect(patched.status).toBe("quota_exceeded");
  });

  it("finds the latest active session and lists active sessions", async () => {
    const store = new InMemorySessionStore();
    const { device } = await store.upsertDevice({
      enterpriseId: "ent-1",
      macAddress: "aa:bb:cc:dd:ee:01",
    });
    const first = await store.createSession({ enterpriseId: "ent-1", deviceId: device.id, quotaBytes: 10, endsAt: null });
    // Break the startedAt tie so ordering is deterministic.
    await store.updateSession(first.id, { startedAt: "2026-01-01T00:00:00.000Z" });
    const second = await store.createSession({
      enterpriseId: "ent-1",
      deviceId: device.id,
      quotaBytes: 20,
      endsAt: null,
    });
    await expect(store.findActiveSession(device.id)).resolves.toMatchObject({
      id: second.id,
      quotaBytes: 20,
    });
    await expect(store.listActiveSessions("ent-1")).resolves.toHaveLength(2);
    await expect(store.listActiveSessions("ent-other")).resolves.toHaveLength(0);
  });

  it("round-trips challenges and supports delete", async () => {
    const store = new InMemorySessionStore();
    const { device } = await store.upsertDevice({
      enterpriseId: "ent-1",
      macAddress: "aa:bb:cc:dd:ee:01",
    });
    const challenge = await store.createChallenge({
      enterpriseId: "ent-1",
      deviceId: device.id,
      identityKind: "email",
      identityValue: "a@b.c",
      codeHash: "x".repeat(64),
      expiresAt: "2026-01-01T00:05:00.000Z",
    });
    await expect(store.findLatestOpenChallenge(device.id)).resolves.toMatchObject({
      id: challenge.id,
    });
    await store.updateChallenge(challenge.id, { attemptCount: 2 });
    await expect(store.getChallengeById(challenge.id)).resolves.toMatchObject({
      attemptCount: 2,
    });
    await store.deleteChallenge(challenge.id);
    await expect(store.getChallengeById(challenge.id)).resolves.toBeNull();
    await expect(store.findLatestOpenChallenge(device.id)).resolves.toBeNull();
  });
});
