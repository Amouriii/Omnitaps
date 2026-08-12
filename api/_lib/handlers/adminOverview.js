import {
  databaseUnavailable,
  enforceRateLimit,
  methodNotAllowed,
  sendJson,
} from "../security.js";
import { getPrisma, isDatabaseConfigured } from "../prisma.js";
import { isSupabaseConfigured, requireAuthUser } from "../auth.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    methodNotAllowed(res, ["GET"]);
    return;
  }

  if (!enforceRateLimit(req, res, { keyPrefix: "admin-overview", max: 40 })) {
    return;
  }

  if (!isSupabaseConfigured()) {
    sendJson(res, 503, {
      error: "Authentication is not configured.",
      code: "AUTH_UNAVAILABLE",
    });
    return;
  }

  const authUser = await requireAuthUser(req, res);
  if (!authUser) {
    sendJson(res, res.statusCode === 503 ? 503 : 401, {
      error: res.statusCode === 503 ? "Authentication is not configured." : "Unauthorized.",
      code: res.statusCode === 503 ? "AUTH_UNAVAILABLE" : "UNAUTHORIZED",
    });
    return;
  }

  if (!isDatabaseConfigured()) {
    databaseUnavailable(res);
    return;
  }

  const prisma = getPrisma();

  try {
    const user = await prisma.user.findUnique({
      where: { authId: authUser.id },
      select: {
        id: true,
        role: true,
        ownedTenants: { select: { id: true } },
        memberships: { select: { tenantId: true } },
      },
    });

    if (!user) {
      sendJson(res, 403, {
        error: "No OmniTaps account is linked to this login.",
        code: "USER_NOT_PROVISIONED",
      });
      return;
    }

    const tenantIds = Array.from(
      new Set([
        ...user.ownedTenants.map((tenant) => tenant.id),
        ...user.memberships.map((membership) => membership.tenantId),
      ]),
    );

    if (tenantIds.length === 0) {
      sendJson(res, 200, {
        summary: {
          tenantCount: 0,
          openFeedback: 0,
          menuScans7d: 0,
          activeWifiNetworks: 0,
        },
        tenants: [],
      });
      return;
    }

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [tenants, openFeedback, menuScans7d, activeWifiNetworks] = await Promise.all([
      prisma.tenant.findMany({
        where: { id: { in: tenantIds } },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          plan: true,
          _count: {
            select: {
              reviewFeedback: true,
              menuScanEvents: true,
              wifiNetworks: true,
            },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.reviewFeedback.count({
        where: {
          tenantId: { in: tenantIds },
          status: "NEW",
        },
      }),
      prisma.menuScanEvent.count({
        where: {
          tenantId: { in: tenantIds },
          scannedAt: { gte: weekAgo },
        },
      }),
      prisma.wifiNetwork.count({
        where: {
          tenantId: { in: tenantIds },
          isActive: true,
        },
      }),
    ]);

    sendJson(res, 200, {
      summary: {
        tenantCount: tenants.length,
        openFeedback,
        menuScans7d,
        activeWifiNetworks,
      },
      tenants: tenants.map((tenant) => ({
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        status: tenant.status,
        plan: tenant.plan,
        counts: {
          feedback: tenant._count.reviewFeedback,
          menuScans: tenant._count.menuScanEvents,
          wifiNetworks: tenant._count.wifiNetworks,
        },
      })),
    });
  } catch (error) {
    console.error("[admin-overview]", error);
    sendJson(res, 500, { error: "Unable to load admin overview." });
  }
}
