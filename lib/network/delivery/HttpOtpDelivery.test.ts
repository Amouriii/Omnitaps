import { describe, expect, it } from "vitest";
import {
  HttpOtpDelivery,
  ResendOtpDelivery,
  TwilioSmsOtpDelivery,
} from "./HttpOtpDelivery.js";

interface Call {
  url: string;
  init: RequestInit;
}

const okResponse = { ok: true, status: 200, text: async () => "" };

function capture(collect: Call[]) {
  return async (url: string, init: RequestInit) => {
    collect.push({ url, init });
    return okResponse;
  };
}

const identity = (kind: "email" | "phone", value: string) => ({
  identity: { kind, value },
  code: "123456",
  deviceId: "d1",
  expiresAt: "2026-01-01T00:05:00.000Z",
});

describe("ResendOtpDelivery", () => {
  it("POSTs the expected payload to api.resend.com/emails", async () => {
    const calls: Call[] = [];
    const delivery = new ResendOtpDelivery({
      apiKey: "re_test",
      from: "OmniTaps Wi-Fi <wifi@example.com>",
      transport: capture(calls),
    });
    await delivery.deliver(identity("email", "guest@example.com"));

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://api.resend.com/emails");
    expect(calls[0].init.method).toBe("POST");
    expect((calls[0].init.headers as Record<string, string>).authorization).toBe(
      "Bearer re_test",
    );
    const body = JSON.parse(calls[0].init.body as string) as Record<string, unknown>;
    expect(body.from).toBe("OmniTaps Wi-Fi <wifi@example.com>");
    expect(body.to).toBe("guest@example.com");
    expect(String(body.text)).toContain("123456");
  });

  it("surfaces provider HTTP errors", async () => {
    const delivery = new ResendOtpDelivery({
      apiKey: "re_test",
      from: "a@b.c",
      transport: async () => ({ ok: false, status: 401, text: async () => "bad key" }),
    });
    await expect(delivery.deliver(identity("email", "a@b.c"))).rejects.toThrow(/401/);
  });
});

describe("TwilioSmsOtpDelivery", () => {
  it("POSTs the expected form payload to the Twilio Messages API", async () => {
    const calls: Call[] = [];
    const delivery = new TwilioSmsOtpDelivery({
      accountSid: "AC123",
      authToken: "tok",
      from: "+15551234567",
      transport: capture(calls),
    });
    await delivery.deliver(identity("phone", "+15550101000"));

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(
      "https://api.twilio.com/2010-04-01/Accounts/AC123/Messages.json",
    );
    expect(calls[0].init.method).toBe("POST");
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.authorization).toMatch(/^Basic /);
    expect(headers["content-type"]).toContain("application/x-www-form-urlencoded");

    const body = new URLSearchParams(calls[0].init.body as string);
    expect(body.get("To")).toBe("+15550101000");
    expect(body.get("From")).toBe("+15551234567");
    expect(String(body.get("Body"))).toContain("123456");
  });
});

describe("HttpOtpDelivery", () => {
  it("routes email identities to Resend and phone identities to Twilio", async () => {
    const routed: string[] = [];
    const email = new ResendOtpDelivery({
      apiKey: "re_x",
      from: "a@b.c",
      transport: async () => {
        routed.push("email");
        return okResponse;
      },
    });
    const sms = new TwilioSmsOtpDelivery({
      accountSid: "AC1",
      authToken: "t",
      from: "+1",
      transport: async () => {
        routed.push("sms");
        return okResponse;
      },
    });
    const router = new HttpOtpDelivery({ email, sms, allowConsoleFallback: false });
    await router.deliver(identity("email", "a@b.c"));
    await router.deliver(identity("phone", "+15550101000"));
    expect(routed).toEqual(["email", "sms"]);
  });

  it("falls back to console logging in dev when a channel is unconfigured", async () => {
    const router = new HttpOtpDelivery({ allowConsoleFallback: true });
    await expect(router.deliver(identity("phone", "+15550101000"))).resolves.toBeUndefined();
  });

  it("throws a config error in production when a channel is unconfigured", async () => {
    const router = new HttpOtpDelivery({ allowConsoleFallback: false });
    await expect(router.deliver(identity("email", "a@b.c"))).rejects.toThrow(
      "RESEND_API_KEY",
    );
    await expect(router.deliver(identity("phone", "+15550101000"))).rejects.toThrow(
      "TWILIO_ACCOUNT_SID",
    );
  });
});
