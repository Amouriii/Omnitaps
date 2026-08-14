import {
  sendCoABandwidthUpdate,
  sendDisconnectRequest,
  type RadiusClientConfig,
} from "../../wifi/radius-client.js";
import { AdapterFailureError } from "../errors.js";
import type {
  GrantAccessInput,
  NetworkAdapter,
  RevokeAccessInput,
  ThrottleConnectionInput,
} from "../NetworkAdapterInterface.js";
import type { RadiusAdapterContext } from "../types.js";

export class RadiusNetworkAdapter implements NetworkAdapter {
  private readonly config: RadiusClientConfig;
  /** When true, UDP CoA/Disconnect is fired without awaiting (Vercel-safe). */
  private readonly nonBlocking: boolean;

  constructor(context: RadiusAdapterContext, options?: { nonBlocking?: boolean; timeoutMs?: number }) {
    this.config = {
      host: context.host,
      port: context.port || 3799,
      secret: context.secret,
      timeoutMs: options?.timeoutMs ?? 1500,
    };
    this.nonBlocking = options?.nonBlocking ?? true;
  }

  async grantAccess(input: GrantAccessInput): Promise<void> {
    await this.run(
      () =>
        sendCoABandwidthUpdate(
          {
            mac: input.session.macAddress,
            acctSessionId: input.session.acctSessionId ?? undefined,
            nasIdentifier: input.session.apId ?? undefined,
            replyMessage: "OmniTaps session granted",
          },
          {
            downloadKbps: input.downloadKbps ?? input.session.downloadKbps,
            uploadKbps: input.uploadKbps ?? input.session.uploadKbps,
            includeMikroTikRateLimit: true,
          },
          this.config,
        ),
      "grantAccess",
    );
  }

  async revokeAccess(input: RevokeAccessInput): Promise<void> {
    await this.run(
      () =>
        sendDisconnectRequest(
          {
            mac: input.session.macAddress,
            acctSessionId: input.session.acctSessionId ?? undefined,
            nasIdentifier: input.session.apId ?? undefined,
            replyMessage: input.reason ?? "OmniTaps session revoked",
          },
          this.config,
        ),
      "revokeAccess",
    );
  }

  async throttleConnection(input: ThrottleConnectionInput): Promise<void> {
    await this.run(
      () =>
        sendCoABandwidthUpdate(
          {
            mac: input.session.macAddress,
            acctSessionId: input.session.acctSessionId ?? undefined,
            nasIdentifier: input.session.apId ?? undefined,
            replyMessage: "OmniTaps throttle",
          },
          {
            downloadKbps: input.downloadKbps,
            uploadKbps: input.uploadKbps,
            includeMikroTikRateLimit: true,
          },
          this.config,
        ),
      "throttleConnection",
    );
  }

  private async run(op: () => Promise<unknown>, label: string): Promise<void> {
    const task = op().catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[radius-adapter] ${label} failed:`, message);
      if (!this.nonBlocking) {
        throw new AdapterFailureError(message);
      }
    });
    if (this.nonBlocking) {
      void task;
      return;
    }
    await task;
  }
}

export function radiusContextFromEnterprise(enterprise: {
  radiusCoaHost: string | null;
  radiusCoaPort: number;
  radiusSecret: string | null;
}): RadiusAdapterContext | null {
  if (!enterprise.radiusCoaHost || !enterprise.radiusSecret) {
    return null;
  }
  return {
    host: enterprise.radiusCoaHost,
    port: enterprise.radiusCoaPort || 3799,
    secret: enterprise.radiusSecret,
  };
}
