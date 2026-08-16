import { collectText } from "./match.js";

/**
 * Server-side prompt assembly. Guest copy templates also live in
 * src/modules/chatbot/prompts/ (SPA). Keep this file Node-safe (no React).
 */
export function buildGuestSystemPrompt({ botName, tenantPrompt } = {}) {
  const name = botName || "Omnitaps";
  const extra = typeof tenantPrompt === "string" ? tenantPrompt.trim() : "";
  const base = `You are the guest support assistant for ${name}. Answer from the business knowledge provided. If you are unsure, offer a short handover instead of inventing details.`;
  return extra ? `${base}\n\n${extra}` : base;
}

/**
 * Turn active knowledge sources into grounded context for the system prompt.
 * JSON content (menu items, hours, Wi‑Fi, FAQ) is flattened to readable text.
 */
export function buildKnowledgeContext(sources) {
  const sections = [];
  for (const source of sources || []) {
    if (!source || source.isActive === false) continue;
    const text = collectText(source.content);
    if (!text) continue;
    const title = source.title || "Knowledge";
    const type = source.sourceType ? ` (${source.sourceType})` : "";
    sections.push(`## ${title}${type}\n${text}`);
  }
  return sections.length ? `Business knowledge:\n\n${sections.join("\n\n")}` : "";
}
