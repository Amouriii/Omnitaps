import {
  databaseUnavailable,
  enforceRateLimit,
  methodNotAllowed,
  sendJson,
} from "../../_lib/security.js";
import { getDemoCafeWebsitePayload, isDemoTenantParam } from "../../_lib/demoCafe.js";
import { getPrisma, isDatabaseConfigured, resolveTenantByParam } from "../../_lib/tenants.js";

const BLOCK_TYPE_MAP = {
  HERO: "hero",
  HOURS: "hours",
  MENU_EMBED: "menu",
  GALLERY: "gallery",
  CTA: "cta",
  MAP: "map",
  CONTACT_FORM: "contact_form",
  CUSTOM: "custom",
};

function normalizeBlock(block) {
  const type = BLOCK_TYPE_MAP[block.blockType] || String(block.blockType || "").toLowerCase();
  const config =
    block.config && typeof block.config === "object" && !Array.isArray(block.config)
      ? block.config
      : {};

  return {
    type,
    ...config,
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    methodNotAllowed(res, ["GET"]);
    return;
  }

  if (!enforceRateLimit(req, res, { keyPrefix: "tenant-website", max: 60 })) {
    return;
  }

  const tenantId =
    typeof req.query.tenantId === "string" ? req.query.tenantId.trim() : "";

  if (!tenantId) {
    sendJson(res, 400, { error: "Missing tenantId parameter." });
    return;
  }

  if (!isDatabaseConfigured()) {
    if (isDemoTenantParam(tenantId)) {
      sendJson(res, 200, getDemoCafeWebsitePayload());
      return;
    }
    databaseUnavailable(res);
    return;
  }

  const prisma = getPrisma();

  try {
    const tenant = await resolveTenantByParam(tenantId);
    if (!tenant || tenant.status === "SUSPENDED") {
      if (isDemoTenantParam(tenantId)) {
        sendJson(res, 200, getDemoCafeWebsitePayload());
        return;
      }
      sendJson(res, 404, { error: "Tenant not found.", code: "TENANT_NOT_FOUND" });
      return;
    }

    const website = await prisma.website.findUnique({
      where: { tenantId: tenant.id },
      select: {
        id: true,
        name: true,
        slug: true,
        isPublished: true,
        themeJson: true,
        jsonLd: true,
        pages: {
          where: { isPublished: true },
          orderBy: [{ isHome: "desc" }, { sortOrder: "asc" }],
          select: {
            id: true,
            slug: true,
            path: true,
            title: true,
            metaTitle: true,
            metaDescription: true,
            isHome: true,
            blocks: {
              orderBy: { sortOrder: "asc" },
              select: {
                id: true,
                blockType: true,
                config: true,
                sortOrder: true,
              },
            },
          },
        },
      },
    });

    if (!website || !website.isPublished) {
      if (isDemoTenantParam(tenantId)) {
        sendJson(res, 200, getDemoCafeWebsitePayload());
        return;
      }
      sendJson(res, 404, { error: "Published website not found.", code: "WEBSITE_NOT_FOUND" });
      return;
    }

    const page =
      website.pages.find((entry) => entry.isHome) ||
      website.pages[0] ||
      null;

    if (!page) {
      if (isDemoTenantParam(tenantId)) {
        sendJson(res, 200, getDemoCafeWebsitePayload());
        return;
      }
      sendJson(res, 404, { error: "No published pages found.", code: "PAGE_NOT_FOUND" });
      return;
    }

    sendJson(res, 200, {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
      },
      website: {
        id: website.id,
        name: website.name,
        slug: website.slug,
        themeJson: website.themeJson,
        jsonLd: website.jsonLd,
      },
      page: {
        id: page.id,
        slug: page.slug,
        path: page.path,
        title: page.title,
        metaTitle: page.metaTitle,
        metaDescription: page.metaDescription,
        isHome: page.isHome,
        blocks: page.blocks.map(normalizeBlock),
      },
    });
  } catch (error) {
    console.error("[tenant-website]", error);
    if (isDemoTenantParam(tenantId)) {
      sendJson(res, 200, getDemoCafeWebsitePayload());
      return;
    }
    sendJson(res, 500, { error: "Unable to load website." });
  }
}
