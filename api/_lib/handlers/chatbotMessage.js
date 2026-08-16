import {
  databaseUnavailable,
  enforceRateLimit,
  methodNotAllowed,
  readJsonBody,
  sanitizeText,
  sendJson,
} from "../security.js";
import { getPrisma, isDatabaseConfigured, resolveTenantByParam } from "../tenants.js";
import { z } from "zod";
import { parseWithSchema } from "../validation.js";
import {
  FALLBACK_REPLY,
  buildGuestSystemPrompt,
  buildKnowledgeContext,
  generateChatReply,
  isLlmEnabled,
  loadActiveKnowledgeSources,
  matchChatbotReply,
} from "../chatbot/index.js";
import { getDemoCafeKnowledgeSources, isDemoTenantParam } from "../demoCafe.js";

const chatbotMessageSchema = z.object({
  tenantId: z.string().trim().min(1).max(128),
  message: z.string().trim().min(1).max(2000),
  conversationId: z.string().trim().min(1).max(128).optional(),
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    methodNotAllowed(res, ["POST"]);
    return;
  }

  if (!enforceRateLimit(req, res, { keyPrefix: "chatbot-message", max: 30 })) {
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

  const parsed = parseWithSchema(chatbotMessageSchema, body);
  if (!parsed.success) {
    sendJson(res, 400, { error: parsed.error });
    return;
  }

  const message = sanitizeText(parsed.data.message, { maxLength: 2000 });
  if (!message) {
    sendJson(res, 400, { error: "Message is required." });
    return;
  }

  if (!isDatabaseConfigured()) {
    if (isDemoTenantParam(parsed.data.tenantId)) {
      sendJson(res, 200, {
        conversationId: parsed.data.conversationId || "demo-local",
        reply: matchChatbotReply(message, getDemoCafeKnowledgeSources(), FALLBACK_REPLY),
        botName: "Demo Café",
      });
      return;
    }
    databaseUnavailable(res);
    return;
  }

  const prisma = getPrisma();

  try {
    const tenant = await resolveTenantByParam(parsed.data.tenantId);
    if (!tenant || tenant.status === "SUSPENDED") {
      if (isDemoTenantParam(parsed.data.tenantId)) {
        sendJson(res, 200, {
          conversationId: parsed.data.conversationId || "demo-local",
          reply: matchChatbotReply(message, getDemoCafeKnowledgeSources(), FALLBACK_REPLY),
          botName: "Demo Café",
        });
        return;
      }
      sendJson(res, 404, { error: "Tenant not found.", code: "TENANT_NOT_FOUND" });
      return;
    }

    const bot = await prisma.chatbotBot.findUnique({
      where: { tenantId: tenant.id },
      select: {
        id: true,
        name: true,
        isActive: true,
      },
    });

    if (!bot || !bot.isActive) {
      if (isDemoTenantParam(parsed.data.tenantId)) {
        sendJson(res, 200, {
          conversationId: parsed.data.conversationId || "demo-local",
          reply: matchChatbotReply(message, getDemoCafeKnowledgeSources(), FALLBACK_REPLY),
          botName: "Demo Café",
        });
        return;
      }
      sendJson(res, 404, {
        error: "Chatbot is not configured for this tenant.",
        code: "CHATBOT_NOT_FOUND",
      });
      return;
    }

    let conversationId = parsed.data.conversationId;
    if (conversationId) {
      const existing = await prisma.chatbotConversation.findFirst({
        where: { id: conversationId, botId: bot.id, tenantId: tenant.id },
        select: { id: true },
      });
      if (!existing) {
        conversationId = undefined;
      }
    }

    if (!conversationId) {
      const conversation = await prisma.chatbotConversation.create({
        data: {
          botId: bot.id,
          tenantId: tenant.id,
          status: "OPEN",
        },
        select: { id: true },
      });
      conversationId = conversation.id;
    }

    await prisma.chatbotMessage.create({
      data: {
        conversationId,
        role: "USER",
        content: message,
      },
    });

    const sources = await loadActiveKnowledgeSources(prisma, bot.id);

    let reply = null;
    if (isLlmEnabled()) {
      try {
        const recent = await prisma.chatbotMessage.findMany({
          where: { conversationId },
          orderBy: { createdAt: "asc" },
          take: 20,
          select: { role: true, content: true },
        });
        reply = await generateChatReply({
          systemPrompt: buildGuestSystemPrompt({
            botName: bot.name,
            tenantPrompt: buildKnowledgeContext(sources),
          }),
          messages: recent.map((entry) => ({
            role: entry.role === "USER" ? "user" : "assistant",
            content: entry.content,
          })),
        });
      } catch (error) {
        console.error("[chatbot-llm]", error);
        reply = null;
      }
    }

    if (!reply) {
      reply = matchChatbotReply(message, sources, FALLBACK_REPLY);
    }

    await prisma.chatbotMessage.create({
      data: {
        conversationId,
        role: "ASSISTANT",
        content: reply,
      },
    });

    sendJson(res, 200, {
      conversationId,
      reply,
      botName: bot.name,
    });
  } catch (error) {
    console.error("[chatbot-message]", error);
    if (isDemoTenantParam(parsed.data.tenantId)) {
      sendJson(res, 200, {
        conversationId: parsed.data.conversationId || "demo-local",
        reply: matchChatbotReply(message, getDemoCafeKnowledgeSources(), FALLBACK_REPLY),
        botName: "Demo Café",
      });
      return;
    }
    sendJson(res, 500, { error: "Unable to process chat message." });
  }
}
