/**
 * Load active Prisma knowledge rows for a bot.
 * Schema lives in prisma/schema.prisma (ChatbotKnowledgeSource) — do not duplicate it here.
 */
export async function loadActiveKnowledgeSources(prisma, botId) {
  return prisma.chatbotKnowledgeSource.findMany({
    where: { botId, isActive: true },
    select: {
      title: true,
      sourceType: true,
      content: true,
      isActive: true,
    },
  });
}
