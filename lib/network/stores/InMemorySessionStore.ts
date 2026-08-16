import { randomUUID } from "node:crypto";
import type { OtpChallengeRecord } from "../types.js";
import type {
  CreateChallengeInput,
  CreateSessionInput,
  DeviceIdentityPatch,
  SessionStore,
  StoredDevice,
  StoredSession,
  UpsertDeviceInput,
} from "./SessionStore.js";

function nowIso(): string {
  return new Date().toISOString();
}

export class InMemorySessionStore implements SessionStore {
  readonly devices = new Map<string, StoredDevice>();
  readonly sessions = new Map<string, StoredSession>();
  readonly challenges = new Map<string, OtpChallengeRecord>();

  async getDeviceById(id: string): Promise<StoredDevice | null> {
    return this.devices.get(id) ?? null;
  }

  async getDeviceByMac(enterpriseId: string, macAddress: string): Promise<StoredDevice | null> {
    for (const device of this.devices.values()) {
      if (device.enterpriseId === enterpriseId && device.macAddress === macAddress) {
        return device;
      }
    }
    return null;
  }

  async upsertDevice(input: UpsertDeviceInput): Promise<{ device: StoredDevice; isNew: boolean }> {
    const existing = await this.getDeviceByMac(input.enterpriseId, input.macAddress);
    const ts = nowIso();
    if (existing) {
      const updated: StoredDevice = {
        ...existing,
        lastSeenAt: ts,
        updatedAt: ts,
        deviceFingerprint: input.deviceFingerprint ?? existing.deviceFingerprint,
        status: input.status ?? existing.status,
      };
      this.devices.set(existing.id, updated);
      return { device: updated, isNew: false };
    }

    const device: StoredDevice = {
      id: randomUUID(),
      enterpriseId: input.enterpriseId,
      macAddress: input.macAddress,
      status: input.status ?? "pending",
      email: null,
      phoneNumber: null,
      identityVerifiedAt: null,
      deviceFingerprint: input.deviceFingerprint ?? null,
      displayName: null,
      firstSeenAt: ts,
      lastSeenAt: ts,
      createdAt: ts,
      updatedAt: ts,
    };
    this.devices.set(device.id, device);
    return { device, isNew: true };
  }

  async updateDevice(id: string, patch: DeviceIdentityPatch): Promise<StoredDevice> {
    const current = this.devices.get(id);
    if (!current) {
      throw new Error(`Device ${id} not found`);
    }
    const updated: StoredDevice = {
      ...current,
      ...patch,
      updatedAt: nowIso(),
    };
    this.devices.set(id, updated);
    return updated;
  }

  async getSessionById(id: string): Promise<StoredSession | null> {
    return this.sessions.get(id) ?? null;
  }

  async findActiveSession(deviceId: string): Promise<StoredSession | null> {
    const matches = [...this.sessions.values()]
      .filter((row) => row.deviceId === deviceId && row.status === "active")
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    return matches[0] ?? null;
  }

  async listActiveSessions(enterpriseId?: string): Promise<StoredSession[]> {
    return [...this.sessions.values()].filter(
      (row) => row.status === "active" && (!enterpriseId || row.enterpriseId === enterpriseId),
    );
  }

  async createSession(input: CreateSessionInput): Promise<StoredSession> {
    const ts = nowIso();
    const session: StoredSession = {
      id: randomUUID(),
      enterpriseId: input.enterpriseId,
      deviceId: input.deviceId,
      status: input.status ?? "active",
      startedAt: ts,
      endsAt: input.endsAt,
      disconnectedAt: null,
      inputOctets: 0,
      outputOctets: 0,
      quotaBytes: input.quotaBytes,
      downloadKbps: input.downloadKbps ?? 0,
      uploadKbps: input.uploadKbps ?? 0,
      acctSessionId: input.acctSessionId ?? null,
      apId: input.apId ?? null,
      planId: input.planId ?? null,
      stripeCheckoutSessionId: input.stripeCheckoutSessionId ?? null,
      createdAt: ts,
      updatedAt: ts,
    };
    this.sessions.set(session.id, session);
    return session;
  }

  async updateSession(id: string, patch: Partial<StoredSession>): Promise<StoredSession> {
    const current = this.sessions.get(id);
    if (!current) {
      throw new Error(`Session ${id} not found`);
    }
    const updated: StoredSession = {
      ...current,
      ...patch,
      id: current.id,
      updatedAt: nowIso(),
    };
    this.sessions.set(id, updated);
    return updated;
  }

  async getChallengeById(id: string): Promise<OtpChallengeRecord | null> {
    return this.challenges.get(id) ?? null;
  }

  async findLatestOpenChallenge(deviceId: string): Promise<OtpChallengeRecord | null> {
    const matches = [...this.challenges.values()]
      .filter((row) => row.deviceId === deviceId && !row.consumedAt)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return matches[0] ?? null;
  }

  async createChallenge(input: CreateChallengeInput): Promise<OtpChallengeRecord> {
    const row: OtpChallengeRecord = {
      id: randomUUID(),
      enterpriseId: input.enterpriseId,
      deviceId: input.deviceId,
      identityKind: input.identityKind,
      identityValue: input.identityValue,
      codeHash: input.codeHash,
      expiresAt: input.expiresAt,
      attemptCount: 0,
      consumedAt: null,
      createdAt: nowIso(),
    };
    this.challenges.set(row.id, row);
    return row;
  }

  async updateChallenge(
    id: string,
    patch: Partial<Pick<OtpChallengeRecord, "attemptCount" | "consumedAt">>,
  ): Promise<OtpChallengeRecord> {
    const current = this.challenges.get(id);
    if (!current) {
      throw new Error(`Challenge ${id} not found`);
    }
    const updated = { ...current, ...patch };
    this.challenges.set(id, updated);
    return updated;
  }

  async deleteChallenge(id: string): Promise<void> {
    this.challenges.delete(id);
  }
}
