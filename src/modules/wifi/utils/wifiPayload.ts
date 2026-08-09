import { z } from "zod";

const escapedWifiValue = z.string().trim().min(1);

const wifiPayloadBaseSchema = z.object({
  ssid: escapedWifiValue,
  hidden: z.boolean().optional().default(false),
});

const openWifiPayloadSchema = wifiPayloadBaseSchema.extend({
  authType: z.literal("OPEN"),
  password: z.undefined().optional(),
});

const securedWifiPayloadSchema = wifiPayloadBaseSchema.extend({
  authType: z.enum(["WPA", "WPA2", "WPA3"]),
  password: escapedWifiValue,
});

export const wifiPayloadSchema = z.union([openWifiPayloadSchema, securedWifiPayloadSchema]);

export type WifiPayloadInput = z.input<typeof wifiPayloadSchema>;
export type WifiPayload = z.output<typeof wifiPayloadSchema>;

function escapeWifiValue(value: string) {
  return value.replace(/([\\;,:"])/g, "\\$1");
}

export function buildWifiPayload(input: WifiPayloadInput) {
  const payload = wifiPayloadSchema.parse(input);
  const parts = [`WIFI:T:${payload.authType}`, `S:${escapeWifiValue(payload.ssid)}`];

  if (payload.authType !== "OPEN") {
    parts.push(`P:${escapeWifiValue(payload.password)}`);
  }

  parts.push(`H:${payload.hidden ? "true" : "false"}`);

  return `${parts.join(";")};`;
}

export function parseWifiPayloadInput(input: unknown) {
  return wifiPayloadSchema.parse(input);
}