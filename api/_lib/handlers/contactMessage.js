import { getPrisma, isDatabaseConfigured } from "../prisma.js";
import {
  enforceRateLimit,
  getClientIp,
  hashValue,
  methodNotAllowed,
  readJsonBody,
  sanitizeEmail,
  sanitizeText,
  sendJson,
} from "../security.js";
import { contactMessageSchema, parseWithSchema } from "../validation.js";

const RESEND_EMAILS_URL = "https://api.resend.com/emails";

function env(name) {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : null;
}

/**
 * Notify the team inbox via Resend (`RESEND_API_KEY`, `RESEND_EMAIL_FROM`).
 * The destination defaults to `CONTACT_NOTIFY_EMAIL`, falling back to the
 * configured sender address. Returns true only when the email was sent.
 */
async function sendEmailNotification({ name, email, company, message }) {
  const apiKey = env("RESEND_API_KEY");
  const from = env("RESEND_EMAIL_FROM");
  const to = env("CONTACT_NOTIFY_EMAIL") || from;

  if (!apiKey || !from || !to) {
    return false;
  }

  try {
    const response = await fetch(RESEND_EMAILS_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject: `New contact message from ${name}`,
        reply_to: email,
        text: [
          `Name: ${name}`,
          `Email: ${email}`,
          company ? `Company: ${company}` : null,
          "",
          message,
        ]
          .filter(Boolean)
          .join("\n"),
      }),
    });

    if (!response.ok) {
      console.error(
        "[contact-form] Resend notification failed",
        response.status,
        await response.text().catch(() => ""),
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error("[contact-form] Resend notification error", error);
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    methodNotAllowed(res, ["POST"]);
    return;
  }

  if (!enforceRateLimit(req, res, { keyPrefix: "contact-form", max: 10 })) {
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

  const parsed = parseWithSchema(contactMessageSchema, body);
  if (!parsed.success) {
    sendJson(res, 400, { error: parsed.error });
    return;
  }

  const payload = {
    name: sanitizeText(parsed.data.name, { maxLength: 120 }),
    email: sanitizeEmail(parsed.data.email),
    company: sanitizeText(parsed.data.company, { maxLength: 200 }),
    message: sanitizeText(parsed.data.message, { maxLength: 4000 }),
  };

  if (!payload.name || !payload.message) {
    sendJson(res, 400, { error: "Name and message are required." });
    return;
  }
  if (!payload.email) {
    sendJson(res, 400, { error: "Email address is invalid." });
    return;
  }

  const ipHash = hashValue(getClientIp(req) ?? "");
  const deliveredVia = [];

  // 1. Persist a durable record when the DB is available.
  if (isDatabaseConfigured()) {
    try {
      await getPrisma().contactMessage.create({
        data: {
          name: payload.name,
          email: payload.email,
          company: payload.company || null,
          message: payload.message,
          ipHash,
        },
        select: { id: true },
      });
      deliveredVia.push("database");
    } catch (error) {
      // P2021: table missing (migration 008 not applied yet) — fall through to
      // the other channels instead of failing the whole request.
      if (error?.code === "P2021") {
        console.warn("[contact-form] ContactMessage table missing — apply supabase/migrations/008_contact_messages.sql");
      } else {
        console.error("[contact-form] Failed to persist contact message", error);
      }
    }
  }

  // 2. Notify the team inbox when Resend is configured.
  const emailed = await sendEmailNotification(payload);
  if (emailed) {
    deliveredVia.push("email");
  }

  // 3. Local/demo fallback — never in production.
  if (deliveredVia.length === 0) {
    if (process.env.NODE_ENV !== "production") {
      console.info(
        `[contact-form] demo delivery — ${payload.name} <${payload.email}>` +
          (payload.company ? ` (${payload.company})` : "") +
          `: ${payload.message}`,
      );
      deliveredVia.push("console");
    } else {
      sendJson(res, 503, {
        error: "Contact delivery is not configured.",
        code: "CONTACT_DELIVERY_UNCONFIGURED",
      });
      return;
    }
  }

  sendJson(res, 201, { ok: true, deliveredVia });
}
