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
