import {
  databaseUnavailable,
  enforceRateLimit,
  methodNotAllowed,
  sendJson,
} from "../_lib/security.js";
import { getPrisma, isDatabaseConfigured } from "../_lib/prisma.js";
import { isSupabaseConfigured, requireAuthUser } from "../_lib/auth.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    methodNotAllowed(res, ["GET"]);
    return;
  }

  if (!enforceRateLimit(req, res, { keyPrefix: "admin-session", max: 60 })) {
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
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        ownedTenants: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            plan: true,
          },
          orderBy: { name: "asc" },
        },
        memberships: {
          select: {
            role: true,
            tenant: {
              select: {
                id: true,
                name: true,
                slug: true,
                status: true,
                plan: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!user) {
      sendJson(res, 403, {
        error: "No OmniTaps account is linked to this login.",
        code: "USER_NOT_PROVISIONED",
      });
      return;
    }

    const tenantsById = new Map();
    for (const tenant of user.ownedTenants) {
      tenantsById.set(tenant.id, { ...tenant, membershipRole: "OWNER" });
    }
    for (const membership of user.memberships) {
      if (!tenantsById.has(membership.tenant.id)) {
        tenantsById.set(membership.tenant.id, {
          ...membership.tenant,
          membershipRole: membership.role,
        });
      }
    }

    sendJson(res, 200, {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
      tenants: Array.from(tenantsById.values()),
      auth: {
        id: authUser.id,
        email: authUser.email,
      },
    });
  } catch (error) {
    console.error("[admin-session]", error);
    sendJson(res, 500, { error: "Unable to load session." });
  }
}
