import type { NetworkSession } from "./types.js";

export interface GrantAccessInput {
  session: NetworkSession;
  downloadKbps?: number;
  uploadKbps?: number;
}

export interface RevokeAccessInput {
  session: NetworkSession;
  reason?: string;
}

export interface ThrottleConnectionInput {
  session: NetworkSession;
  downloadKbps: number;
  uploadKbps: number;
}

export interface LinkMetrics {
  rssi?: number;
  latencyMs?: number;
}

export interface NetworkAdapter {
  grantAccess(input: GrantAccessInput): Promise<void>;
  revokeAccess(input: RevokeAccessInput): Promise<void>;
  throttleConnection(input: ThrottleConnectionInput): Promise<void>;
  getLinkMetrics?(session: NetworkSession): Promise<LinkMetrics | null>;
}
