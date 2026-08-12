/**
 * Future Vercel AI SDK hook (Vite + Vercel Node handlers — not Next.js App Router).
 *
 * When a later pass installs `ai` (and optionally `@ai-sdk/react` for the widget):
 * - Call generateText / streamText from api/chatbot/* (e.g. a new stream handler).
 * - Prefer AI Gateway model strings over direct provider SDKs.
 * - Keep ChatWidget on JSON POST /api/chatbot/message until streaming is wired.
 *
 * This stub must not import `ai` until that package is added.
 */
export function isLlmEnabled() {
  return false;
}

export async function generateChatReply(_input) {
  return null;
}
