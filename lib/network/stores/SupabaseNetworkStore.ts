import type { SupabaseClient } from "@supabase/supabase-js";
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

type JsonRecord = Record<string, unknown>;

function mapDevice(row: JsonRecord): StoredDevice {
  return {
    id: String(row.id),
    enterpriseId: String(row.enterprise_id),
    macAddress: String(row.mac_address),
    status: String(row.status),
    email: row.email == null ? null : String(row.email),
    phoneNumber: row.phone_number == null ? null : String(row.phone_number),
    identityVerifiedAt:
      row.identity_verified_at == null ? null : String(row.identity_verified_at),
    deviceFingerprint:
      row.device_fingerprint == null ? null : String(row.device_fingerprint),
    displayName: row.display_name == null ? null : String(row.display_name),
    firstSeenAt: String(row.first_seen_at ?? new Date().toISOString()),
    lastSeenAt: String(row.last_seen_at ?? new Date().toISOString()),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  };
}

function mapSession(row: JsonRecord): StoredSession {
  return {
    id: String(row.id),
    enterpriseId: String(row.enterprise_id),
    deviceId: String(row.device_id),
    status: String(row.status),
    startedAt: String(row.started_at ?? new Date().toISOString()),
    endsAt: row.ends_at == null ? null : String(row.ends_at),
    disconnectedAt: row.disconnected_at == null ? null : String(row.disconnected_at),
    inputOctets: Number(row.input_octets ?? 0),
    outputOctets: Number(row.output_octets ?? 0),
    quotaBytes: Number(row.quota_bytes ?? 0),
    downloadKbps: Number(row.download_kbps ?? 0),
    uploadKbps: Number(row.upload_kbps ?? 0),
    acctSessionId: row.acct_session_id == null ? null : String(row.acct_session_id),
    apId: row.ap_id == null ? null : String(row.ap_id),
    planId: row.plan_id == null ? null : String(row.plan_id),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  };
}

function mapChallenge(row: JsonRecord): OtpChallengeRecord {
  return {
    id: String(row.id),
    enterpriseId: String(row.enterprise_id),
    deviceId: String(row.device_id),
    identityKind: row.identity_kind === "email" ? "email" : "phone",
    identityValue: String(row.identity_value),
    codeHash: String(row.code_hash),
    expiresAt: String(row.expires_at),
    attemptCount: Number(row.attempt_count ?? 0),
    consumedAt: row.consumed_at == null ? null : String(row.consumed_at),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

export class SupabaseNetworkStore implements SessionStore {
  constructor(private readonly supabase: SupabaseClient) {}

  async getDeviceById(id: string): Promise<StoredDevice | null> {
    const { data, error } = await this.supabase
      .from("wifi_devices")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapDevice(data as JsonRecord) : null;
  }

  async getDeviceByMac(enterpriseId: string, macAddress: string): Promise<StoredDevice | null> {
    const { data, error } = await this.supabase
      .from("wifi_devices")
      .select("*")
      .eq("enterprise_id", enterpriseId)
      .eq("mac_address", macAddress)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapDevice(data as JsonRecord) : null;
  }

  async upsertDevice(input: UpsertDeviceInput): Promise<{ device: StoredDevice; isNew: boolean }> {
    const existing = await this.getDeviceByMac(input.enterpriseId, input.macAddress);
    const ts = new Date().toISOString();
    if (existing) {
      const { data, error } = await this.supabase
        .from("wifi_devices")
        .update({
          last_seen_at: ts,
          ...(input.status ? { status: input.status } : {}),
          ...(input.deviceFingerprint
            ? { device_fingerprint: input.deviceFingerprint }
            : {}),
        })
        .eq("id", existing.id)
        .select("*")
        .single();
      if (error || !data) throw new Error(error?.message ?? "device_update_failed");
      return { device: mapDevice(data as JsonRecord), isNew: false };
    }

    const { data, error } = await this.supabase
      .from("wifi_devices")
      .insert({
        enterprise_id: input.enterpriseId,
        mac_address: input.macAddress,
        device_fingerprint: input.deviceFingerprint ?? null,
        status: input.status ?? "pending",
        first_seen_at: ts,
        last_seen_at: ts,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "device_insert_failed");
    return { device: mapDevice(data as JsonRecord), isNew: true };
  }

  async updateDevice(id: string, patch: DeviceIdentityPatch): Promise<StoredDevice> {
    const row: Record<string, unknown> = {};
    if (patch.email !== undefined) row.email = patch.email;
    if (patch.phoneNumber !== undefined) row.phone_number = patch.phoneNumber;
    if (patch.identityVerifiedAt !== undefined) {
      row.identity_verified_at = patch.identityVerifiedAt;
    }
    if (patch.status !== undefined) row.status = patch.status;
    const { data, error } = await this.supabase
      .from("wifi_devices")
      .update(row)
      .eq("id", id)
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "device_update_failed");
    return mapDevice(data as JsonRecord);
  }

  async getSessionById(id: string): Promise<StoredSession | null> {
    const { data, error } = await this.supabase
      .from("wifi_sessions")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapSession(data as JsonRecord) : null;
  }

  async findActiveSession(deviceId: string): Promise<StoredSession | null> {
    const { data, error } = await this.supabase
      .from("wifi_sessions")
      .select("*")
      .eq("device_id", deviceId)
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapSession(data as JsonRecord) : null;
  }

  async listActiveSessions(enterpriseId?: string): Promise<StoredSession[]> {
    let query = this.supabase.from("wifi_sessions").select("*").eq("status", "active");
    if (enterpriseId) {
      query = query.eq("enterprise_id", enterpriseId);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => mapSession(row as JsonRecord));
  }

  async createSession(input: CreateSessionInput): Promise<StoredSession> {
    const { data, error } = await this.supabase
      .from("wifi_sessions")
      .insert({
        enterprise_id: input.enterpriseId,
        device_id: input.deviceId,
        plan_id: input.planId ?? null,
        status: input.status ?? "active",
        acct_session_id: input.acctSessionId ?? null,
        ap_id: input.apId ?? null,
        ends_at: input.endsAt,
        input_octets: 0,
        output_octets: 0,
        quota_bytes: input.quotaBytes,
        download_kbps: input.downloadKbps ?? 0,
        upload_kbps: input.uploadKbps ?? 0,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "session_insert_failed");
    return mapSession(data as JsonRecord);
  }

  async updateSession(id: string, patch: Partial<StoredSession>): Promise<StoredSession> {
    const row: Record<string, unknown> = {};
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.endsAt !== undefined) row.ends_at = patch.endsAt;
    if (patch.disconnectedAt !== undefined) row.disconnected_at = patch.disconnectedAt;
    if (patch.inputOctets !== undefined) row.input_octets = patch.inputOctets;
    if (patch.outputOctets !== undefined) row.output_octets = patch.outputOctets;
    if (patch.quotaBytes !== undefined) row.quota_bytes = patch.quotaBytes;
    if (patch.downloadKbps !== undefined) row.download_kbps = patch.downloadKbps;
    if (patch.uploadKbps !== undefined) row.upload_kbps = patch.uploadKbps;
    if (patch.acctSessionId !== undefined) row.acct_session_id = patch.acctSessionId;
    if (patch.apId !== undefined) row.ap_id = patch.apId;
    const { data, error } = await this.supabase
      .from("wifi_sessions")
      .update(row)
      .eq("id", id)
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "session_update_failed");
    return mapSession(data as JsonRecord);
  }

  async getChallengeById(id: string): Promise<OtpChallengeRecord | null> {
    const { data, error } = await this.supabase
      .from("wifi_otp_challenges")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapChallenge(data as JsonRecord) : null;
  }

  async findLatestOpenChallenge(deviceId: string): Promise<OtpChallengeRecord | null> {
    const { data, error } = await this.supabase
      .from("wifi_otp_challenges")
      .select("*")
      .eq("device_id", deviceId)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapChallenge(data as JsonRecord) : null;
  }

  async createChallenge(input: CreateChallengeInput): Promise<OtpChallengeRecord> {
    const { data, error } = await this.supabase
      .from("wifi_otp_challenges")
      .insert({
        enterprise_id: input.enterpriseId,
        device_id: input.deviceId,
        identity_kind: input.identityKind,
        identity_value: input.identityValue,
        code_hash: input.codeHash,
        expires_at: input.expiresAt,
        attempt_count: 0,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "otp_insert_failed");
    return mapChallenge(data as JsonRecord);
  }

  async updateChallenge(
    id: string,
    patch: Partial<Pick<OtpChallengeRecord, "attemptCount" | "consumedAt">>,
  ): Promise<OtpChallengeRecord> {
    const row: Record<string, unknown> = {};
    if (patch.attemptCount !== undefined) row.attempt_count = patch.attemptCount;
    if (patch.consumedAt !== undefined) row.consumed_at = patch.consumedAt;
    const { data, error } = await this.supabase
      .from("wifi_otp_challenges")
      .update(row)
      .eq("id", id)
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "otp_update_failed");
    return mapChallenge(data as JsonRecord);
  }
}
