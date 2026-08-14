import type { IdentityKind, OtpChallengeRecord, QuotaLimit } from "../types.js";

export interface StoredDevice {
  id: string;
  enterpriseId: string;
  macAddress: string;
  status: string;
  email: string | null;
  phoneNumber: string | null;
  identityVerifiedAt: string | null;
  deviceFingerprint: string | null;
  displayName: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredSession {
  id: string;
  enterpriseId: string;
  deviceId: string;
  status: string;
  startedAt: string;
  endsAt: string | null;
  disconnectedAt: string | null;
  inputOctets: number;
  outputOctets: number;
  quotaBytes: number;
  downloadKbps: number;
  uploadKbps: number;
  acctSessionId: string | null;
  apId: string | null;
  planId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertDeviceInput {
  enterpriseId: string;
  macAddress: string;
  apId?: string | null;
  deviceFingerprint?: string | null;
  status?: string;
}

export interface CreateSessionInput {
  enterpriseId: string;
  deviceId: string;
  quotaBytes: number;
  endsAt: string | null;
  downloadKbps?: number;
  uploadKbps?: number;
  acctSessionId?: string | null;
  apId?: string | null;
  planId?: string | null;
  status?: string;
}

export interface CreateChallengeInput {
  enterpriseId: string;
  deviceId: string;
  identityKind: IdentityKind;
  identityValue: string;
  codeHash: string;
  expiresAt: string;
}

export interface DeviceIdentityPatch {
  email?: string | null;
  phoneNumber?: string | null;
  identityVerifiedAt?: string | null;
  status?: string;
}

export interface SessionStore {
  getDeviceById(id: string): Promise<StoredDevice | null>;
  getDeviceByMac(enterpriseId: string, macAddress: string): Promise<StoredDevice | null>;
  upsertDevice(input: UpsertDeviceInput): Promise<{ device: StoredDevice; isNew: boolean }>;
  updateDevice(id: string, patch: DeviceIdentityPatch): Promise<StoredDevice>;

  getSessionById(id: string): Promise<StoredSession | null>;
  findActiveSession(deviceId: string): Promise<StoredSession | null>;
  listActiveSessions(enterpriseId?: string): Promise<StoredSession[]>;
  createSession(input: CreateSessionInput): Promise<StoredSession>;
  updateSession(id: string, patch: Partial<StoredSession>): Promise<StoredSession>;

  getChallengeById(id: string): Promise<OtpChallengeRecord | null>;
  findLatestOpenChallenge(deviceId: string): Promise<OtpChallengeRecord | null>;
  createChallenge(input: CreateChallengeInput): Promise<OtpChallengeRecord>;
  updateChallenge(
    id: string,
    patch: Partial<Pick<OtpChallengeRecord, "attemptCount" | "consumedAt">>,
  ): Promise<OtpChallengeRecord>;
}

export type { QuotaLimit };
