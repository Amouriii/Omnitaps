/**
 * Server-side WIFI: payload builder (mirrors src/modules/wifi/utils/wifiPayload.ts).
 */
function escapeWifiValue(value) {
  return String(value).replace(/([\\;,:"])/g, "\\$1");
}

export function buildWifiPayload({ ssid, authType, password, hidden = false }) {
  const parts = [`WIFI:T:${authType}`, `S:${escapeWifiValue(ssid)}`];

  if (authType !== "OPEN") {
    if (!password) {
      throw new Error("Password is required for secured WiFi networks.");
    }
    parts.push(`P:${escapeWifiValue(password)}`);
  }

  parts.push(`H:${hidden ? "true" : "false"}`);
  return `${parts.join(";")};`;
}
