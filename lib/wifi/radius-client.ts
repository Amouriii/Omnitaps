/**
 * RADIUS CoA / Disconnect client (UDP).
 *
 * Assumptions (RADIUS RFC 2865/5176 + common captive VSA practice):
 * - Disconnect-Request code = 40, CoA-Request code = 43
 * - Authenticator for CoA/Disconnect Request = MD5(Code+ID+Len+16zero+Attributes+Secret)
 * - Standard attrs: User-Name (1), NAS-IP-Address (4), Calling-Station-Id (31),
 *   Acct-Session-Id (44), Event-Timestamp (55)
 * - WISPr vendor id 14122: bandwidth up/down in bits-per-second (VSA types 7/8)
 * - Optional MikroTik vendor id 14988: VSA type 8 "rate-limit" string "rx/tx"
 */

import { createHash, randomBytes } from "node:crypto";
import { createSocket, type Socket } from "node:dgram";
import { normalizeMac } from "./mac-utils.js";

export const RADIUS_CODE = {
  DISCONNECT_REQUEST: 40,
  DISCONNECT_ACK: 41,
  DISCONNECT_NAK: 42,
  COA_REQUEST: 43,
  COA_ACK: 44,
  COA_NAK: 45,
} as const;

export const RADIUS_ATTR = {
  USER_NAME: 1,
  NAS_IP_ADDRESS: 4,
  FRAMED_IP_ADDRESS: 8,
  FILTER_ID: 11,
  REPLY_MESSAGE: 18,
  CALLING_STATION_ID: 31,
  ACCT_SESSION_ID: 44,
  EVENT_TIMESTAMP: 55,
  NAS_IDENTIFIER: 32,
  VENDOR_SPECIFIC: 26,
} as const;

export const VENDOR = {
  WISPR: 14122,
  MIKROTIK: 14988,
} as const;

export const WISPR_VSA = {
  BANDWIDTH_MAX_UP: 7,
  BANDWIDTH_MAX_DOWN: 8,
} as const;

export const MIKROTIK_VSA = {
  RATE_LIMIT: 8,
} as const;

export interface RadiusClientConfig {
  host: string;
  port?: number;
  secret: string;
  timeoutMs?: number;
  /** Identifier byte; random if omitted. */
  identifier?: number;
}

export interface CoABandwidthUpdate {
  /** Download cap in kbps (network → client). 0 skips WISPr down attr. */
  downloadKbps?: number;
  /** Upload cap in kbps (client → network). 0 skips WISPr up attr. */
  uploadKbps?: number;
  /** Also emit MikroTik rate-limit VSA string. */
  includeMikroTikRateLimit?: boolean;
}

export interface SessionTarget {
  /** Station MAC (any common format). Mapped to Calling-Station-Id. */
  mac?: string;
  userName?: string;
  acctSessionId?: string;
  nasIpAddress?: string;
  nasIdentifier?: string;
  framedIpAddress?: string;
  filterId?: string;
  replyMessage?: string;
}

export interface RadiusPacketResult {
  code: number;
  identifier: number;
  length: number;
  attributes: Array<{ type: number; value: Buffer }>;
  raw: Buffer;
  acknowledged: boolean;
}

function assertSecret(secret: string): Buffer {
  if (!secret || secret.trim().length === 0) {
    throw new Error("RADIUS shared secret is required.");
  }
  return Buffer.from(secret, "utf8");
}

function encodeIpAddress(ip: string): Buffer {
  const parts = ip.trim().split(".");
  if (parts.length !== 4 || parts.some((p) => !/^\d+$/.test(p))) {
    throw new Error(`Invalid IPv4 address: ${ip}`);
  }
  const octets = parts.map((part) => Number(part));
  if (octets.some((n) => n < 0 || n > 255)) {
    throw new Error(`Invalid IPv4 address: ${ip}`);
  }
  return Buffer.from(octets);
}

function encodeVendorUint32(vendorId: number, vendorType: number, value: number): Buffer {
  const vsaValue = Buffer.alloc(6);
  vsaValue.writeUInt8(vendorType, 0);
  vsaValue.writeUInt8(6, 1); // vendor-type + vendor-length + 4 data bytes
  vsaValue.writeUInt32BE(value >>> 0, 2);

  const attr = Buffer.alloc(2 + 4 + vsaValue.length);
  attr.writeUInt8(RADIUS_ATTR.VENDOR_SPECIFIC, 0);
  attr.writeUInt8(attr.length, 1);
  attr.writeUInt32BE(vendorId >>> 0, 2);
  vsaValue.copy(attr, 6);
  return attr;
}

function encodeVendorString(vendorId: number, vendorType: number, value: string): Buffer {
  const data = Buffer.from(value, "utf8");
  if (data.length > 253) {
    throw new Error("VSA string exceeds RADIUS length limits.");
  }
  const vsaValue = Buffer.alloc(2 + data.length);
  vsaValue.writeUInt8(vendorType, 0);
  vsaValue.writeUInt8(vsaValue.length, 1);
  data.copy(vsaValue, 2);

  const attr = Buffer.alloc(2 + 4 + vsaValue.length);
  attr.writeUInt8(RADIUS_ATTR.VENDOR_SPECIFIC, 0);
  attr.writeUInt8(attr.length, 1);
  attr.writeUInt32BE(vendorId >>> 0, 2);
  vsaValue.copy(attr, 6);
  return attr;
}

function encodeStringAttr(type: number, value: string): Buffer {
  const data = Buffer.from(value, "utf8");
  if (data.length > 253) {
    throw new Error(`Attribute ${type} value too long.`);
  }
  const buf = Buffer.alloc(2 + data.length);
  buf.writeUInt8(type, 0);
  buf.writeUInt8(buf.length, 1);
  data.copy(buf, 2);
  return buf;
}

function encodeIntegerAttr(type: number, value: number): Buffer {
  const buf = Buffer.alloc(6);
  buf.writeUInt8(type, 0);
  buf.writeUInt8(6, 1);
  buf.writeUInt32BE(value >>> 0, 2);
  return buf;
}

function encodeIpAttr(type: number, ip: string): Buffer {
  const addr = encodeIpAddress(ip);
  const buf = Buffer.alloc(6);
  buf.writeUInt8(type, 0);
  buf.writeUInt8(6, 1);
  addr.copy(buf, 2);
  return buf;
}

export function kbpsToBitsPerSecond(kbps: number): number {
  if (!Number.isFinite(kbps) || kbps <= 0) return 0;
  return Math.floor(kbps * 1000);
}

/**
 * Build attribute payload (no header) for a session targeting packet.
 */
export function encodeSessionAttributes(
  target: SessionTarget,
  bandwidth?: CoABandwidthUpdate,
): Buffer {
  const chunks: Buffer[] = [];

  if (target.userName) {
    chunks.push(encodeStringAttr(RADIUS_ATTR.USER_NAME, target.userName));
  }

  if (target.mac) {
    const mac = normalizeMac(target.mac, { allowMulticast: true });
    if (!mac) {
      throw new Error(`Invalid Calling-Station-Id MAC: ${target.mac}`);
    }
    chunks.push(encodeStringAttr(RADIUS_ATTR.CALLING_STATION_ID, mac.canonical));
    if (!target.userName) {
      // Many NAS implementations key CoA by User-Name == MAC.
      chunks.push(encodeStringAttr(RADIUS_ATTR.USER_NAME, mac.canonical));
    }
  }

  if (target.acctSessionId) {
    chunks.push(encodeStringAttr(RADIUS_ATTR.ACCT_SESSION_ID, target.acctSessionId));
  }
  if (target.nasIpAddress) {
    chunks.push(encodeIpAttr(RADIUS_ATTR.NAS_IP_ADDRESS, target.nasIpAddress));
  }
  if (target.nasIdentifier) {
    chunks.push(encodeStringAttr(RADIUS_ATTR.NAS_IDENTIFIER, target.nasIdentifier));
  }
  if (target.framedIpAddress) {
    chunks.push(encodeIpAttr(RADIUS_ATTR.FRAMED_IP_ADDRESS, target.framedIpAddress));
  }
  if (target.filterId) {
    chunks.push(encodeStringAttr(RADIUS_ATTR.FILTER_ID, target.filterId));
  }
  if (target.replyMessage) {
    chunks.push(encodeStringAttr(RADIUS_ATTR.REPLY_MESSAGE, target.replyMessage));
  }

  chunks.push(encodeIntegerAttr(RADIUS_ATTR.EVENT_TIMESTAMP, Math.floor(Date.now() / 1000)));

  if (bandwidth) {
    const upBps = kbpsToBitsPerSecond(bandwidth.uploadKbps ?? 0);
    const downBps = kbpsToBitsPerSecond(bandwidth.downloadKbps ?? 0);

    if (upBps > 0) {
      chunks.push(encodeVendorUint32(VENDOR.WISPR, WISPR_VSA.BANDWIDTH_MAX_UP, upBps));
    }
    if (downBps > 0) {
      chunks.push(encodeVendorUint32(VENDOR.WISPR, WISPR_VSA.BANDWIDTH_MAX_DOWN, downBps));
    }

    if (bandwidth.includeMikroTikRateLimit && (upBps > 0 || downBps > 0)) {
      // MikroTik rate-limit: rx,tx (bits) — rx=download, tx=upload from station view varies by vendor;
      // common form is "up/down" as upload/download in bps.
      const rx = downBps > 0 ? downBps : upBps;
      const tx = upBps > 0 ? upBps : downBps;
      chunks.push(
        encodeVendorString(VENDOR.MIKROTIK, MIKROTIK_VSA.RATE_LIMIT, `${rx}/${tx}`),
      );
    }
  }

  return Buffer.concat(chunks);
}

/**
 * Compute Request Authenticator for CoA/Disconnect.
 * MD5(Code + ID + Length + 16 zero octets + Request Attributes + Shared Secret)
 */
export function computeRequestAuthenticator(
  code: number,
  identifier: number,
  attributes: Buffer,
  secret: string,
): Buffer {
  const length = 20 + attributes.length;
  const header = Buffer.alloc(4);
  header.writeUInt8(code, 0);
  header.writeUInt8(identifier & 0xff, 1);
  header.writeUInt16BE(length, 2);

  const zeros = Buffer.alloc(16, 0);
  const secretBuf = assertSecret(secret);
  return createHash("md5")
    .update(header)
    .update(zeros)
    .update(attributes)
    .update(secretBuf)
    .digest();
}

export function buildRadiusPacket(input: {
  code: number;
  identifier?: number;
  attributes: Buffer;
  secret: string;
}): Buffer {
  const identifier = input.identifier ?? randomBytes(1)[0];
  const authenticator = computeRequestAuthenticator(
    input.code,
    identifier,
    input.attributes,
    input.secret,
  );
  const length = 20 + input.attributes.length;
  const packet = Buffer.alloc(length);
  packet.writeUInt8(input.code, 0);
  packet.writeUInt8(identifier & 0xff, 1);
  packet.writeUInt16BE(length, 2);
  authenticator.copy(packet, 4);
  input.attributes.copy(packet, 20);
  return packet;
}

export function parseRadiusPacket(raw: Buffer): RadiusPacketResult {
  if (raw.length < 20) {
    throw new Error("RADIUS packet too short.");
  }
  const code = raw.readUInt8(0);
  const identifier = raw.readUInt8(1);
  const length = raw.readUInt16BE(2);
  if (length > raw.length) {
    throw new Error("RADIUS packet length exceeds buffer.");
  }

  const attributes: Array<{ type: number; value: Buffer }> = [];
  let offset = 20;
  while (offset < length) {
    const type = raw.readUInt8(offset);
    const attrLen = raw.readUInt8(offset + 1);
    if (attrLen < 2 || offset + attrLen > length) {
      break;
    }
    attributes.push({
      type,
      value: raw.subarray(offset + 2, offset + attrLen),
    });
    offset += attrLen;
  }

  const acknowledged =
    code === RADIUS_CODE.DISCONNECT_ACK || code === RADIUS_CODE.COA_ACK;

  return {
    code,
    identifier,
    length,
    attributes,
    raw: raw.subarray(0, length),
    acknowledged,
  };
}

function sendAndWait(
  packet: Buffer,
  config: RadiusClientConfig,
): Promise<RadiusPacketResult> {
  const host = config.host?.trim();
  if (!host) {
    return Promise.reject(new Error("RADIUS host is required."));
  }
  const port = config.port ?? 3799;
  const timeoutMs = config.timeoutMs ?? 3000;
  assertSecret(config.secret);

  return new Promise((resolve, reject) => {
    const socket: Socket = createSocket("udp4");
    let settled = false;

    const finish = (error?: Error, result?: RadiusPacketResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        socket.close();
      } catch {
        // ignore
      }
      if (error) reject(error);
      else resolve(result!);
    };

    const timer = setTimeout(() => {
      finish(new Error(`RADIUS timeout waiting for response from ${host}:${port}`));
    }, timeoutMs);

    socket.on("error", (error) => finish(error));
    socket.on("message", (msg) => {
      try {
        finish(undefined, parseRadiusPacket(msg));
      } catch (error) {
        finish(error instanceof Error ? error : new Error(String(error)));
      }
    });

    socket.send(packet, port, host, (error) => {
      if (error) {
        finish(error);
      }
    });
  });
}

export function buildDisconnectRequestPacket(
  target: SessionTarget,
  config: Pick<RadiusClientConfig, "secret" | "identifier">,
): Buffer {
  const attributes = encodeSessionAttributes({
    ...target,
    replyMessage: target.replyMessage ?? "OmniTaps quota exhausted / admin disconnect",
  });
  return buildRadiusPacket({
    code: RADIUS_CODE.DISCONNECT_REQUEST,
    identifier: config.identifier,
    attributes,
    secret: config.secret,
  });
}

export function buildCoARequestPacket(
  target: SessionTarget,
  bandwidth: CoABandwidthUpdate,
  config: Pick<RadiusClientConfig, "secret" | "identifier">,
): Buffer {
  const attributes = encodeSessionAttributes(target, bandwidth);
  return buildRadiusPacket({
    code: RADIUS_CODE.COA_REQUEST,
    identifier: config.identifier,
    attributes,
    secret: config.secret,
  });
}

export async function sendDisconnectRequest(
  target: SessionTarget,
  config: RadiusClientConfig,
): Promise<RadiusPacketResult> {
  const packet = buildDisconnectRequestPacket(target, config);
  return sendAndWait(packet, config);
}

export async function sendCoABandwidthUpdate(
  target: SessionTarget,
  bandwidth: CoABandwidthUpdate,
  config: RadiusClientConfig,
): Promise<RadiusPacketResult> {
  const packet = buildCoARequestPacket(target, bandwidth, config);
  return sendAndWait(packet, config);
}

/**
 * Encode-only helper for tests / packet captures (no socket I/O).
 */
export function inspectCoAPacket(
  target: SessionTarget,
  bandwidth: CoABandwidthUpdate,
  secret: string,
  identifier = 1,
): { packet: Buffer; hex: string; length: number; code: number } {
  const packet = buildCoARequestPacket(target, bandwidth, { secret, identifier });
  return {
    packet,
    hex: packet.toString("hex"),
    length: packet.length,
    code: packet.readUInt8(0),
  };
}

export function inspectDisconnectPacket(
  target: SessionTarget,
  secret: string,
  identifier = 1,
): { packet: Buffer; hex: string; length: number; code: number } {
  const packet = buildDisconnectRequestPacket(target, { secret, identifier });
  return {
    packet,
    hex: packet.toString("hex"),
    length: packet.length,
    code: packet.readUInt8(0),
  };
}
