import { getPrisma, isDatabaseConfigured } from "../prisma.js";
import {
  databaseUnavailable,
  enforceRateLimit,
  getClientIp,
  hashValue,
  methodNotAllowed,
  readJsonBody,
  sanitizeText,
  sendJson,
} from "../security.js";
import { parseWithSchema, reviewVisitSchema } from "../validation.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    methodNotAllowed(res, ["POST"]);
    return;
  }

  if (!enforceRateLimit(req, res, { keyPrefix: "review-visit", max: 40 })) {
    return;
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    sendJson(res, error.message === "Payload too large" ? 413 : 400, {
      error: error.message === "Payload too large" ? "Payload too large." : "Invalid JSON body.",
    });
    return;
  }

  const parsed = parseWithSchema(reviewVisitSchema, body);
  if (!parsed.success) {
    sendJson(res, 400, { error: parsed.error });
    return;
  }

  const payload = {
    ...parsed.data,
    routePath: sanitizeText(parsed.data.routePath || "", { maxLength: 500 }),
  };

  if (!isDatabaseConfigured()) {
    databaseUnavailable(res);
    return;
  }

  const prisma = getPrisma();

  try {
    const tenant = await prisma.tenant.findFirst({
      where: {
        OR: [{ id: payload.tenantId }, { slug: payload.tenantId }],
      },
      select: {
        id: true,
        name: true,
        reviewProfile: {
          select: { id: true, isActive: true, googleReviewUrl: true },
        },
      },
    });

    if (!tenant?.reviewProfile?.isActive) {
      sendJson(res, 404, {
        error: "Review profile not found for this tenant.",
        code: "REVIEW_PROFILE_MISSING",
      });
      return;
    }

    const visit = await prisma.reviewGateVisit.create({
      data: {
        tenantId: tenant.id,
        profileId: tenant.reviewProfile.id,
        source: "GATE",
        rating: payload.rating ?? undefined,
        routePath: payload.routePath || `/r/${payload.tenantId}/review`,
        referrer:
          typeof req.headers.referer === "string"
            ? sanitizeText(req.headers.referer, { maxLength: 500 })
            : undefined,
        userAgent: hashValue(
          typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : null,
        ),
        ipHash: hashValue(getClientIp(req)),
        googleRedirectedAt: payload.googleRedirected ? new Date() : undefined,
      },
      select: { id: true, createdAt: true },
    });

    sendJson(res, 201, {
      id: visit.id,
      createdAt: visit.createdAt,
      tenantName: tenant.name,
      googleReviewUrl: tenant.reviewProfile.googleReviewUrl || null,
    });
  } catch (error) {
    console.error("[review-visit]", error);
    sendJson(res, 500, { error: "Unable to record review visit." });
  }
}
