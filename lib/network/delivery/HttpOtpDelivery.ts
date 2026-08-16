/**
 * Real OTP delivery over HTTPS (plain fetch, no SDKs — same convention as the
 * Stripe integration).
 *
 * - Email channel → Resend:  POST https://api.resend.com/emails
 * - SMS channel   → Twilio: POST /2010-04-01/Accounts/{sid}/Messages.json
 *
 * The router picks the channel from the guest identity kind. When a channel's
 * provider is not configured, `HttpOtpDelivery` either falls back to logging
 * the code (local/demo only — never in production) or throws a clear
 * configuration error so a missing API key can never silently drop codes.
 */

import { ConsoleOtpDelivery, type OtpDeliveryAdapter } from "./OtpDelivery.js";

const RESEND_EMAILS_URL = "https://api.resend.com/emails";
const TWILIO_BASE_URL = "https://api.twilio.com/2010-04-01/Accounts";

type OtpDeliveryInput = Parameters<OtpDeliveryAdapter["deliver"]>[0];

type HttpTransport = (
  url: string,
  init: RequestInit,
) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;

function env(name: string): string | null {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : null;
}

async function responseError(prefix: string, response: { status: number; text(): Promise<string> }): Promise<Error> {
  const detail = await response.text().catch(() => "");
  return new Error(`${prefix} failed (${response.status}): ${detail.slice(0, 300)}`);
}

/** Email OTP via Resend (`RESEND_API_KEY`, `RESEND_EMAIL_FROM`). */
export class ResendOtpDelivery implements OtpDeliveryAdapter {
  private readonly apiKey: string | null;
  private readonly from: string | null;
  private readonly transport: HttpTransport;

  constructor(options: {
    apiKey?: string;
    from?: string;
    transport?: HttpTransport;
  } = {}) {
    this.apiKey = options.apiKey ?? env("RESEND_API_KEY");
    this.from = options.from ?? env("RESEND_EMAIL_FROM");
    this.transport = options.transport ?? ((url, init) => fetch(url, init));
  }

  get configured(): boolean {
    return this.apiKey !== null && this.from !== null;
  }

  async deliver(input: OtpDeliveryInput): Promise<void> {
    if (!this.apiKey || !this.from) {
      throw new Error("RESEND_API_KEY and RESEND_EMAIL_FROM are required to send OTP emails.");
    }
    const response = await this.transport(RESEND_EMAILS_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: this.from,
        to: input.identity.value,
        subject: "Your Wi‑Fi verification code",
        text: `Your OmniTaps Wi‑Fi verification code is ${input.code}. It expires in 5 minutes.`,
      }),
    });
    if (!response.ok) {
      throw await responseError("Resend email delivery", response);
    }
  }
}

/** SMS OTP via Twilio (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`). */
export class TwilioSmsOtpDelivery implements OtpDeliveryAdapter {
  private readonly accountSid: string | null;
  private readonly authToken: string | null;
  private readonly from: string | null;
  private readonly transport: HttpTransport;

  constructor(options: {
    accountSid?: string;
    authToken?: string;
    from?: string;
    transport?: HttpTransport;
  } = {}) {
    this.accountSid = options.accountSid ?? env("TWILIO_ACCOUNT_SID");
    this.authToken = options.authToken ?? env("TWILIO_AUTH_TOKEN");
    this.from = options.from ?? env("TWILIO_PHONE_NUMBER");
    this.transport = options.transport ?? ((url, init) => fetch(url, init));
  }

  get configured(): boolean {
    return this.accountSid !== null && this.authToken !== null && this.from !== null;
  }

  async deliver(input: OtpDeliveryInput): Promise<void> {
    if (!this.accountSid || !this.authToken || !this.from) {
      throw new Error(
        "TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER are required to send OTP SMS.",
      );
    }
    const body = new URLSearchParams({
      From: this.from,
      To: input.identity.value,
      Body: `OmniTaps Wi‑Fi code: ${input.code}. Expires in 5 minutes.`,
    });
    const credentials = Buffer.from(
      `${this.accountSid}:${this.authToken}`,
      "utf8",
    ).toString("base64");
    const response = await this.transport(
      `${TWILIO_BASE_URL}/${encodeURIComponent(this.accountSid)}/Messages.json`,
      {
        method: "POST",
        headers: {
          authorization: `Basic ${credentials}`,
          "content-type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      },
    );
    if (!response.ok) {
      throw await responseError("Twilio SMS delivery", response);
    }
  }
}

/**
 * Channel-aware router used by the captive OTP flow. Email identities go to
 * Resend, phone identities to Twilio; unconfigured channels log the code when
 * `allowConsoleFallback` is set (dev/demo) or throw otherwise.
 */
export class HttpOtpDelivery implements OtpDeliveryAdapter {
  private readonly email: ResendOtpDelivery;
  private readonly sms: TwilioSmsOtpDelivery;
  private readonly allowConsoleFallback: boolean;
  private readonly consoleFallback = new ConsoleOtpDelivery();

  constructor(options: {
    email?: ResendOtpDelivery;
    sms?: TwilioSmsOtpDelivery;
    allowConsoleFallback?: boolean;
  } = {}) {
    this.email = options.email ?? new ResendOtpDelivery();
    this.sms = options.sms ?? new TwilioSmsOtpDelivery();
    this.allowConsoleFallback = options.allowConsoleFallback ?? false;
  }

  async deliver(input: OtpDeliveryInput): Promise<void> {
    const channel =
      input.identity.kind === "email" ? this.email : this.sms;
    if (channel.configured) {
      await channel.deliver(input);
      return;
    }
    if (this.allowConsoleFallback) {
      await this.consoleFallback.deliver(input);
      return;
    }
    const missing =
      input.identity.kind === "email"
        ? "RESEND_API_KEY/RESEND_EMAIL_FROM"
        : "TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_PHONE_NUMBER";
    throw new Error(`OTP ${input.identity.kind} delivery is not configured (missing ${missing}).`);
  }
}
