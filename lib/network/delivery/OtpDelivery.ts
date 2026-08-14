import type { UserIdentity } from "../types.js";

export interface OtpDeliveryAdapter {
  deliver(input: {
    identity: UserIdentity;
    code: string;
    deviceId: string;
    expiresAt: string;
  }): Promise<void>;
}

/** Demo / local delivery — logs the code. Production APIs must not log plaintext. */
export class ConsoleOtpDelivery implements OtpDeliveryAdapter {
  async deliver(input: {
    identity: UserIdentity;
    code: string;
    deviceId: string;
    expiresAt: string;
  }): Promise<void> {
    console.info(
      `[network-otp] demo delivery to ${input.identity.kind}:${input.identity.value} device=${input.deviceId} code=${input.code} expires=${input.expiresAt}`,
    );
  }
}

export class NoopOtpDelivery implements OtpDeliveryAdapter {
  async deliver(): Promise<void> {
    // Production path: a real SMS/email provider is out of scope.
  }
}
