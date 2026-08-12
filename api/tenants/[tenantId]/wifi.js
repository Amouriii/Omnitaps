import {
  databaseUnavailable,
  enforceRateLimit,
  methodNotAllowed,
  sendJson,
} from "../../_lib/security.js";
import { getPrisma, isDatabaseConfigured, resolveTenantByParam } from "../../_lib/tenants.js";
import { buildWifiPayload } from "../../_lib/wifiPayload.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    methodNotAllowed(res, ["GET"]);
    return;
  }

  if (!enforceRateLimit(req, res, { keyPrefix: "tenant-wifi", max: 60 })) {
    return;
  }

  const tenantId =
    typeof req.query.tenantId === "string" ? req.query.tenantId.trim() : "";
  const networkSlug =
    typeof req.query.network === "string" ? req.query.network.trim() : "";

  if (!tenantId) {
    sendJson(res, 400, { error: "Missing tenantId parameter." });
    return;
  }

  if (!isDatabaseConfigured()) {
    databaseUnavailable(res);
    return;
  }

  const prisma = getPrisma();

  try {
    const tenant = await resolveTenantByParam(tenantId);
    if (!tenant || tenant.status === "SUSPENDED") {
      sendJson(res, 404, { error: "Tenant not found.", code: "TENANT_NOT_FOUND" });
      return;
    }

    const network = await prisma.wifiNetwork.findFirst({
      where: {
        tenantId: tenant.id,
        isActive: true,
        ...(networkSlug ? { qrSlug: networkSlug } : {}),
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        ssid: true,
        password: true,
        authType: true,
        hidden: true,
        qrSlug: true,
        qrPayload: true,
        leadCaptureEnabled: true,
        splashPage: {
          select: {
            headline: true,
            body: true,
            consentLabel: true,
            captureEmail: true,
            capturePhone: true,
            requiresConsent: true,
            revealCredentialsAfterSubmit: true,
          },
        },
      },
    });

    if (!network) {
      sendJson(res, 404, { error: "Active WiFi network not found.", code: "WIFI_NOT_FOUND" });
      return;
    }

    let wifiPayload = network.qrPayload;
    if (!wifiPayload) {
      wifiPayload = buildWifiPayload({
        ssid: network.ssid,
        authType: network.authType,
        password: network.password || undefined,
        hidden: network.hidden,
      });
    }

    sendJson(res, 200, {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
      },
      network: {
        id: network.id,
        name: network.name,
        ssid: network.ssid,
        authType: network.authType,
        qrSlug: network.qrSlug,
        leadCaptureEnabled: network.leadCaptureEnabled,
        splashPage: network.splashPage,
        // Guest QR embeds join credentials; password is also returned for laptop copy-to-clipboard.
        password: network.password || null,
        wifiPayload,
      },
    });
  } catch (error) {
    console.error("[tenant-wifi]", error);
    sendJson(res, 500, { error: "Unable to load WiFi access details." });
  }
}
