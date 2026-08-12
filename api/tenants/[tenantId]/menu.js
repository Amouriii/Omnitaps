import {
  databaseUnavailable,
  enforceRateLimit,
  methodNotAllowed,
  sendJson,
} from "../../_lib/security.js";
import { getPrisma, isDatabaseConfigured, resolveTenantByParam } from "../../_lib/tenants.js";

function formatPrice(priceCents, currency = "USD") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(priceCents / 100);
  } catch {
    return `${(priceCents / 100).toFixed(2)} ${currency}`;
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    methodNotAllowed(res, ["GET"]);
    return;
  }

  if (!enforceRateLimit(req, res, { keyPrefix: "tenant-menu", max: 60 })) {
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
    const tenant = await resolveTenantByParam(tenantId);
    if (!tenant || tenant.status === "SUSPENDED") {
      sendJson(res, 404, { error: "Tenant not found.", code: "TENANT_NOT_FOUND" });
      return;
    }

    const menu = await prisma.menu.findUnique({
      where: { tenantId: tenant.id },
      select: {
        id: true,
        name: true,
        slug: true,
        isPublished: true,
        primaryColor: true,
        secondaryColor: true,
        logoUrl: true,
        categories: {
          where: { isVisible: true },
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            name: true,
            description: true,
            items: {
              orderBy: { sortOrder: "asc" },
              select: {
                id: true,
                name: true,
                description: true,
                priceCents: true,
                currency: true,
                imageUrl: true,
                isAvailable: true,
                outOfStockNote: true,
                allergenLinks: {
                  select: {
                    menuAllergen: {
                      select: { name: true, slug: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!menu || !menu.isPublished) {
      sendJson(res, 404, { error: "Published menu not found.", code: "MENU_NOT_FOUND" });
      return;
    }

    sendJson(res, 200, {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
      },
      menu: {
        id: menu.id,
        name: menu.name,
        slug: menu.slug,
        primaryColor: menu.primaryColor,
        secondaryColor: menu.secondaryColor,
        logoUrl: menu.logoUrl,
        categories: menu.categories.map((category) => ({
          id: category.id,
          title: category.name,
          description: category.description,
          items: category.items.map((item) => ({
            id: item.id,
            name: item.name,
            description: item.description,
            price: formatPrice(item.priceCents, item.currency),
            priceCents: item.priceCents,
            currency: item.currency,
            imageUrl: item.imageUrl,
            isAvailable: item.isAvailable,
            outOfStockNote: item.outOfStockNote,
            allergens: item.allergenLinks.map((link) => link.menuAllergen.name),
            badge: item.isAvailable
              ? item.outOfStockNote || undefined
              : item.outOfStockNote || "Sold out",
          })),
        })),
      },
    });
  } catch (error) {
    console.error("[tenant-menu]", error);
    sendJson(res, 500, { error: "Unable to load menu." });
  }
}
