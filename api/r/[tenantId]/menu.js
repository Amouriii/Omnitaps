import { getPrisma, isDatabaseConfigured } from "../../_lib/prisma.js";
import {
  databaseUnavailable,
  enforceRateLimit,
  getClientIp,
  hashValue,
  methodNotAllowed,
  sendJson,
} from "../../_lib/security.js";

/**
 * Port of src/app/r/[tenantId]/menu/route.ts for Vite + Vercel Functions.
 * Live path: /r/:tenantId/menu → rewritten to this function.
 */
export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    methodNotAllowed(res, ["GET", "HEAD"]);
    return;
  }

  if (!enforceRateLimit(req, res, { keyPrefix: "menu-scan", max: 60 })) {
    return;
  }

  const tenantId =
    typeof req.query.tenantId === "string" ? req.query.tenantId.trim() : "";

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
    const tenant = await prisma.tenant.findFirst({
      where: {
        OR: [{ id: tenantId }, { slug: tenantId }],
      },
      select: {
        id: true,
        menu: {
          select: { id: true },
        },
      },
    });

    if (!tenant?.menu) {
      sendJson(res, 404, { error: "Menu not found for this tenant." });
      return;
    }

    try {
      const ipHash = hashValue(getClientIp(req));
      const userAgent = hashValue(
        typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : null,
      );
      const referrer =
        typeof req.headers.referer === "string" ? req.headers.referer.slice(0, 500) : null;

      await prisma.menuScanEvent.create({
        data: {
          tenantId: tenant.id,
          menuId: tenant.menu.id,
          userAgent,
          ipHash,
          referrer,
          landingPath: `/r/${tenantId}/menu`,
        },
      });
    } catch {
      // Analytics must not block the guest redirect.
    }

    const redirectUrl = new URL(`/menu/${encodeURIComponent(tenantId)}`, absoluteOrigin(req));
    const incomingQuery = typeof req.url === "string" ? req.url.split("?")[1] : "";
    if (incomingQuery) {
      redirectUrl.search = incomingQuery;
    }

    res.writeHead(307, {
      Location: redirectUrl.toString(),
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    res.end();
  } catch (error) {
    console.error("[menu-shortlink]", error);
    sendJson(res, 500, { error: "Unable to resolve menu short link." });
  }
}

function absoluteOrigin(req) {
  const protoHeader = req.headers["x-forwarded-proto"];
  const proto = typeof protoHeader === "string" ? protoHeader.split(",")[0] : "https";
  const host = req.headers["x-forwarded-host"] ?? req.headers.host ?? "localhost";
  return `${proto}://${host}`;
}
