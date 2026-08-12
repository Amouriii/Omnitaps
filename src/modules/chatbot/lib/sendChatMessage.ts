import { apiRequest } from "../../../lib/apiClient";
import type { ChatMessageRequest, ChatMessageResponse } from "../types";

export async function sendChatMessage(payload: ChatMessageRequest): Promise<ChatMessageResponse> {
  return apiRequest("/api/chatbot/message", {
    method: "POST",
    body: payload,
  });
}
