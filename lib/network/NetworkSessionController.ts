import { buildQuotaEntitlements, calculateSessionQuota } from "../wifi/quota-calculator.js";
import type { NetworkAdapter } from "./NetworkAdapterInterface.js";
import { QuotaEventEmitter } from "./QuotaEventEmitter.js";
import {
  IdentityVerificationService,
} from "./IdentityVerificationService.js";
import {
  DeviceNotFoundError,
  DuplicateConnectionError,
  SessionNotFoundError,
} from "./errors.js";
import type { SessionStore, StoredDevice, StoredSession } from "./stores/SessionStore.js";
import {
  DEMO_DEFAULT_QUOTA_MB,
  DEMO_DEFAULT_SESSION_MINUTES,
  NetworkStatus,
  QUOTA_EVENTS,
  type IssueOtpResult,
  type NetworkSession,
  type QuotaLimit,
  type RadiusAdapterContext,
  type RecordUsageInput,
  type UserIdentity,
} from "./types.js";

export function mapDbSessionStatus(status: string): NetworkStatus {
  switch (status) {
    case "active":
      return NetworkStatus.CONNECTED;
    case "quota_exceeded":
      return NetworkStatus.QUOTA_EXCEEDED;
    case "disconnected":
    case "expired":
    case "upgraded":
      return NetworkStatus.DISCONNECTED;
    default:
      return NetworkStatus.DISCONNECTED;
  }
}

export function toNetworkSession(
  session: StoredSession,
  device: StoredDevice,
): NetworkSession {
  const identity: UserIdentity | null = device.identityVerifiedAt
    ? device.email
      ? { kind: "email", value: device.email, verifiedAt: device.identityVerifiedAt }
      : device.phoneNumber
        ? { kind: "phone", value: device.phoneNumber, verifiedAt: device.identityVerifiedAt }
        : null
    : null;

  return {
    id: session.id,
    enterpriseId: session.enterpriseId,
    deviceId: session.deviceId,
    macAddress: device.macAddress,
    identity,
    status: mapDbSessionStatus(session.status),
    startedAt: session.startedAt,
    endsAt: session.endsAt,
    bytesUp: session.inputOctets,
    bytesDown: session.outputOctets,
    quotaBytes: session.quotaBytes,
    downloadKbps: session.downloadKbps,
    uploadKbps: session.uploadKbps,
    acctSessionId: session.acctSessionId,
    apId: session.apId,
  };
}

export function limitsFromEnterprise(enterprise: {
  freeQuotaMb: number;
  freeSessionMinutes: number;
}): QuotaLimit {
  return {
    maxBytes: Math.max(0, Math.floor(enterprise.freeQuotaMb * 1024 * 1024)),
    maxDurationSeconds: Math.max(0, enterprise.freeSessionMinutes * 60),
  };
}

function entitlementsFromLimits(limits: QuotaLimit, startedAt: string) {
  const quotaMb =
    limits.maxBytes == null
      ? DEMO_DEFAULT_QUOTA_MB
      : limits.maxBytes / (1024 * 1024);
  const durationMinutes =
    limits.maxDurationSeconds == null
      ? DEMO_DEFAULT_SESSION_MINUTES
      : limits.maxDurationSeconds / 60;
  return buildQuotaEntitlements({
    quotaMb,
    durationMinutes,
    startedAt,
  });
}

export interface NetworkSessionControllerOptions {
  store: SessionStore;
  adapter: NetworkAdapter;
  events?: QuotaEventEmitter;
  identity?: IdentityVerificationService;
  radius?: RadiusAdapterContext | null;
}

export class NetworkSessionController {
  readonly store: SessionStore;
  readonly adapter: NetworkAdapter;
  readonly events: QuotaEventEmitter;
  readonly identity: IdentityVerificationService;
  readonly radius: RadiusAdapterContext | null;

  constructor(options: NetworkSessionControllerOptions) {
    this.store = options.store;
    this.adapter = options.adapter;
    this.events = options.events ?? new QuotaEventEmitter();
    this.identity =
      options.identity ?? new IdentityVerificationService({ store: options.store });
    this.radius = options.radius ?? null;
  }

  async onboard(input: {
    enterpriseId: string;
    macAddress: string;
    apId?: string | null;
    deviceFingerprint?: string | null;
  }): Promise<{ device: StoredDevice; isNew: boolean; status: NetworkStatus }> {
    const { device, isNew } = await this.store.upsertDevice({
      enterpriseId: input.enterpriseId,
      macAddress: input.macAddress,
      apId: input.apId,
      deviceFingerprint: input.deviceFingerprint,
      status: "pending",
    });
    if (device.identityVerifiedAt) {
      const active = await this.findHealthySession(device.id);
      return {
        device,
        isNew,
        status: active ? NetworkStatus.CONNECTED : NetworkStatus.PENDING_VERIFICATION,
      };
    }
    return { device, isNew, status: NetworkStatus.PENDING_VERIFICATION };
  }

  async issueVerification(input: {
    enterpriseId: string;
    deviceId: string;
    identity: UserIdentity;
    echoCode?: boolean;
  }): Promise<IssueOtpResult> {
    const device = await this.requireDevice(input.deviceId);
    return this.identity.issue({
      enterpriseId: input.enterpriseId || device.enterpriseId,
      deviceId: device.id,
      identity: input.identity,
      echoCode: input.echoCode,
    });
  }

  async verifyAndProvision(input: {
    deviceId: string;
    code: string;
    challengeId?: string;
    limits?: QuotaLimit;
    downloadKbps?: number;
    uploadKbps?: number;
    acctSessionId?: string | null;
    apId?: string | null;
    allowDuplicate?: boolean;
  }): Promise<NetworkSession> {
    const verified = await this.identity.verify({
      deviceId: input.deviceId,
      code: input.code,
      challengeId: input.challengeId,
    });

    const patch =
      verified.identityKind === "email"
        ? { email: verified.identityValue, phoneNumber: null as string | null }
        : { phoneNumber: verified.identityValue, email: null as string | null };

    await this.store.updateDevice(input.deviceId, {
      ...patch,
      identityVerifiedAt: verified.identity.verifiedAt ?? new Date().toISOString(),
      status: "active",
    });

    return this.provisionSession({
      deviceId: input.deviceId,
      limits: input.limits,
      downloadKbps: input.downloadKbps,
      uploadKbps: input.uploadKbps,
      acctSessionId: input.acctSessionId,
      apId: input.apId,
      allowDuplicate: input.allowDuplicate,
    });
  }

  async provisionSession(input: {
    deviceId: string;
    limits?: QuotaLimit;
    downloadKbps?: number;
    uploadKbps?: number;
    acctSessionId?: string | null;
    apId?: string | null;
    allowDuplicate?: boolean;
  }): Promise<NetworkSession> {
    const device = await this.requireDevice(input.deviceId);
    const existing = await this.findHealthySession(device.id);
    if (existing && !input.allowDuplicate) {
      throw new DuplicateConnectionError();
    }

    const startedAt = new Date().toISOString();
    const limits = input.limits ?? {
      maxBytes: DEMO_DEFAULT_QUOTA_MB * 1024 * 1024,
      maxDurationSeconds: DEMO_DEFAULT_SESSION_MINUTES * 60,
    };
    const entitlements = entitlementsFromLimits(limits, startedAt);
    const created = await this.store.createSession({
      enterpriseId: device.enterpriseId,
      deviceId: device.id,
      quotaBytes: entitlements.quotaBytes,
      endsAt: entitlements.endsAt,
      downloadKbps: input.downloadKbps ?? 0,
      uploadKbps: input.uploadKbps ?? 0,
      acctSessionId: input.acctSessionId ?? null,
      apId: input.apId ?? null,
    });
    const session = toNetworkSession(created, device);
    await this.adapter.grantAccess({
      session,
      downloadKbps: session.downloadKbps,
      uploadKbps: session.uploadKbps,
    });
    this.events.emit(QUOTA_EVENTS.ON_STATUS_CHANGE, {
      session,
      previous: NetworkStatus.PENDING_VERIFICATION,
      next: NetworkStatus.CONNECTED,
    });
    return session;
  }

  async recordUsage(input: RecordUsageInput): Promise<NetworkSession> {
    const stored = await this.store.getSessionById(input.sessionId);
    if (!stored) throw new SessionNotFoundError();
    const device = await this.requireDevice(stored.deviceId);

    const nextUp = stored.inputOctets + Math.max(0, Math.floor(input.bytesUp ?? 0));
    const nextDown = stored.outputOctets + Math.max(0, Math.floor(input.bytesDown ?? 0));
    let updated = await this.store.updateSession(stored.id, {
      inputOctets: nextUp,
      outputOctets: nextDown,
    });

    const snap = calculateSessionQuota({
      inputOctets: updated.inputOctets,
      outputOctets: updated.outputOctets,
      quotaBytes: updated.quotaBytes,
      startedAt: updated.startedAt,
      endsAt: updated.endsAt,
    });

    const wasActive = stored.status === "active";
    if (wasActive && snap.isExhausted) {
      const nextStatus = snap.remainingBytes <= 0 ? "quota_exceeded" : "expired";
      updated = await this.store.updateSession(updated.id, {
        status: nextStatus,
        disconnectedAt: new Date().toISOString(),
      });
      const session = toNetworkSession(updated, device);
      this.events.emit(QUOTA_EVENTS.ON_STATUS_CHANGE, {
        session,
        previous: NetworkStatus.CONNECTED,
        next: session.status,
      });
      this.events.emit(QUOTA_EVENTS.ON_QUOTA_EXCEEDED, {
        session,
        usedBytes: snap.usedBytes,
        remainingBytes: snap.remainingBytes,
        isTimeExpired: snap.isTimeExpired,
        radius: this.radius,
      });
      await this.adapter.revokeAccess({
        session,
        reason: nextStatus === "quota_exceeded" ? "quota_exceeded" : "expired",
      });
      return session;
    }

    return toNetworkSession(updated, device);
  }

  async getOnlineStatus(sessionOrDeviceId: string): Promise<NetworkStatus> {
    const session = await this.store.getSessionById(sessionOrDeviceId);
    if (session) {
      if (session.status === "active") {
        const healthy = this.sessionInQuota(session);
        return healthy ? NetworkStatus.CONNECTED : NetworkStatus.QUOTA_EXCEEDED;
      }
      return mapDbSessionStatus(session.status);
    }
    const device = await this.store.getDeviceById(sessionOrDeviceId);
    if (!device) return NetworkStatus.UNAUTHENTICATED;
    const active = await this.findHealthySession(device.id);
    if (active) return NetworkStatus.CONNECTED;
    if (!device.identityVerifiedAt) return NetworkStatus.PENDING_VERIFICATION;
    return NetworkStatus.DISCONNECTED;
  }

  async listActiveSessions(enterpriseId?: string): Promise<NetworkSession[]> {
    const rows = await this.store.listActiveSessions(enterpriseId);
    const out: NetworkSession[] = [];
    for (const row of rows) {
      const device = await this.store.getDeviceById(row.deviceId);
      if (device) out.push(toNetworkSession(row, device));
    }
    return out;
  }

  async resetQuota(sessionId: string, limits?: QuotaLimit): Promise<NetworkSession> {
    const stored = await this.requireSession(sessionId);
    const device = await this.requireDevice(stored.deviceId);
    const startedAt = new Date().toISOString();
    const entitlements = entitlementsFromLimits(
      limits ?? {
        maxBytes: stored.quotaBytes,
        maxDurationSeconds: stored.endsAt
          ? Math.max(
              60,
              Math.round((new Date(stored.endsAt).getTime() - new Date(stored.startedAt).getTime()) / 1000),
            )
          : DEMO_DEFAULT_SESSION_MINUTES * 60,
      },
      startedAt,
    );
    const updated = await this.store.updateSession(sessionId, {
      status: "active",
      inputOctets: 0,
      outputOctets: 0,
      quotaBytes: entitlements.quotaBytes,
      endsAt: entitlements.endsAt,
      startedAt,
      disconnectedAt: null,
    });
    const session = toNetworkSession(updated, device);
    await this.adapter.grantAccess({ session });
    return session;
  }

  async extendQuota(
    sessionId: string,
    extra: { extraBytes?: number; extraSeconds?: number },
  ): Promise<NetworkSession> {
    const stored = await this.requireSession(sessionId);
    const device = await this.requireDevice(stored.deviceId);
    const nextBytes = stored.quotaBytes + Math.max(0, extra.extraBytes ?? 0);
    let nextEnds = stored.endsAt;
    if (extra.extraSeconds && extra.extraSeconds > 0) {
      const base = stored.endsAt ? new Date(stored.endsAt).getTime() : Date.now();
      nextEnds = new Date(base + extra.extraSeconds * 1000).toISOString();
    }
    const updated = await this.store.updateSession(sessionId, {
      quotaBytes: nextBytes,
      endsAt: nextEnds,
      status: "active",
      disconnectedAt: null,
    });
    return toNetworkSession(updated, device);
  }

  async updateLimits(sessionId: string, limits: QuotaLimit): Promise<NetworkSession> {
    const stored = await this.requireSession(sessionId);
    const device = await this.requireDevice(stored.deviceId);
    const entitlements = entitlementsFromLimits(limits, stored.startedAt);
    const updated = await this.store.updateSession(sessionId, {
      quotaBytes: entitlements.quotaBytes,
      endsAt: entitlements.endsAt,
    });
    const session = toNetworkSession(updated, device);
    await this.adapter.throttleConnection({
      session,
      downloadKbps: session.downloadKbps,
      uploadKbps: session.uploadKbps,
    });
    return session;
  }

  sessionInQuota(session: StoredSession): boolean {
    const snap = calculateSessionQuota({
      inputOctets: session.inputOctets,
      outputOctets: session.outputOctets,
      quotaBytes: session.quotaBytes,
      startedAt: session.startedAt,
      endsAt: session.endsAt,
    });
    return !snap.isExhausted;
  }

  private async findHealthySession(deviceId: string): Promise<StoredSession | null> {
    const active = await this.store.findActiveSession(deviceId);
    if (!active) return null;
    if (this.sessionInQuota(active)) return active;
    await this.store.updateSession(active.id, {
      status: "quota_exceeded",
      disconnectedAt: new Date().toISOString(),
    });
    return null;
  }

  private async requireDevice(id: string): Promise<StoredDevice> {
    const device = await this.store.getDeviceById(id);
    if (!device) throw new DeviceNotFoundError();
    return device;
  }

  private async requireSession(id: string): Promise<StoredSession> {
    const session = await this.store.getSessionById(id);
    if (!session) throw new SessionNotFoundError();
    return session;
  }
}
