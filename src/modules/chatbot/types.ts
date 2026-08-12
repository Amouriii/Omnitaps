export type ChatRole = "user" | "assistant";

export type ChatTurn = {
  role: ChatRole;
  content: string;
};

export type ChatWidgetProps = {
  tenantId: string;
  botName?: string;
  className?: string;
};

export type ChatMessageRequest = {
  tenantId: string;
  message: string;
  conversationId?: string;
};

export type ChatMessageResponse = {
  conversationId: string;
  reply: string;
  botName?: string;
};

/** Mirrors prisma ChatbotKnowledgeSourceType — schema stays in prisma/schema.prisma. */
export type KnowledgeSourceType =
  | "MENU"
  | "HOURS"
  | "WIFI"
  | "FAQ"
  | "DOCUMENT"
  | "URL"
  | "MANUAL";
