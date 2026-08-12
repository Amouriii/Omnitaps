export { default as ChatWidget } from "./components/ChatWidget";
export { sendChatMessage } from "./lib/sendChatMessage";
export { DEFAULT_GREETING, GUEST_SYSTEM_PROMPT } from "./prompts/guestSupport";
export type {
  ChatMessageRequest,
  ChatMessageResponse,
  ChatRole,
  ChatTurn,
  ChatWidgetProps,
  KnowledgeSourceType,
} from "./types";
