/**
 * Groq integration for open-source LLMs (Llama / Qwen / Mixtral), OpenAI Chat
 * Completions compatible, called with plain `fetch` (no SDKs) — same convention
 * as the Stripe/Resend/Twilio integrations. Configure `GROQ_API_KEY` to enable;
 * `CHATBOT_MODEL` selects the model slug (defaults to Llama 3.3 70B).
 *
 * When the key is missing, callers fall back to the keyword matcher.
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

export function isLlmEnabled() {
  const key = process.env.GROQ_API_KEY?.trim();
  return Boolean(key);
}

/**
 * Generate an assistant reply from a system prompt + message history.
 * @returns {Promise<string|null>} the reply text, or null when unavailable.
 */
export async function generateChatReply({ systemPrompt, messages, model } = {}) {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) return null;

  const chatMessages = [];
  if (systemPrompt) {
    chatMessages.push({ role: "system", content: systemPrompt });
  }
  for (const message of messages || []) {
    if (!message || typeof message.content !== "string" || !message.content.trim()) continue;
    chatMessages.push({
      role: message.role === "user" ? "user" : "assistant",
      content: message.content,
    });
  }
  if (chatMessages.length === 0) return null;

  const selectedModel =
    (model && model.trim()) ||
    process.env.CHATBOT_MODEL?.trim() ||
    DEFAULT_MODEL;

  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: selectedModel,
      messages: chatMessages,
      temperature: 0.3,
      max_tokens: 600,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Groq failed (${response.status}): ${detail.slice(0, 300)}`);
  }

  const json = await response.json();
  const content = json?.choices?.[0]?.message?.content;
  return typeof content === "string" && content.trim() ? content.trim() : null;
}
