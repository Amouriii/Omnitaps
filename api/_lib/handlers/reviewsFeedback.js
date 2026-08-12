import { getPrisma, isDatabaseConfigured } from "../prisma.js";
import {
  databaseUnavailable,
  enforceRateLimit,
  methodNotAllowed,
  readJsonBody,
  sanitizeEmail,
  sanitizeText,
  sendJson,
} from "../security.js";
import { parseWithSchema, reviewFeedbackSchema } from "../validation.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    methodNotAllowed(res, ["POST"]);
    return;
  }

  if (!enforceRateLimit(req, res, { keyPrefix: "review-feedback", max: 20 })) {
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

  const parsed = parseWithSchema(reviewFeedbackSchema, body);
  if (!parsed.success) {
    sendJson(res, 400, { error: parsed.error });
    return;
  }

  const payload = {
    ...parsed.data,
    name: sanitizeText(parsed.data.name, { maxLength: 120 }),
    email: sanitizeEmail(parsed.data.email),
    subject: sanitizeText(parsed.data.subject, { maxLength: 200 }),
    message: sanitizeText(parsed.data.message, { maxLength: 4000 }),
  };

  if (!payload.subject || !payload.message) {
    sendJson(res, 400, { error: "Subject and message are required." });
    return;
  }

  if (parsed.data.email && !payload.email) {
    sendJson(res, 400, { error: "Email address is invalid." });
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
        OR: [{ id: payload.tenantId }, { slug: payload.tenantId }],
      },
      select: {
        id: true,
        reviewProfile: {
          select: { id: true, isActive: true },
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

    const messageWithMeta = [
      payload.message,
      payload.name ? `Name: ${payload.name}` : null,
      payload.email ? `Email: ${payload.email}` : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    const feedback = await prisma.reviewFeedback.create({
      data: {
        tenantId: tenant.id,
        profileId: tenant.reviewProfile.id,
        gateVisitId: payload.gateVisitId || undefined,
        source: "FORM",
        status: "NEW",
        rating: payload.rating,
        subject: payload.subject,
        message: messageWithMeta,
      },
      select: { id: true, createdAt: true },
    });

    sendJson(res, 201, {
      id: feedback.id,
      createdAt: feedback.createdAt,
    });
  } catch (error) {
    console.error("[review-feedback]", error);
    sendJson(res, 500, { error: "Unable to save feedback." });
  }
}
