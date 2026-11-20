// Module 2: AI Assistant Waiter Chatbot
// WaiterAi - System prompt and response schema from architecture guide
// ============================================================
// Provides the system prompt and JSON schema contract for the AI Waiter.
// The actual tool calling (search_live_menu, get_customer_loyalty_perks) should
// be implemented in the API route handler, not in this module.

/**
 * System Prompt for the AI Waiter
 * 
 * From the architecture guide - the AI Waiter MUST invoke search_live_menu
 * to retrieve currently available dishes filtered by the customer's allergens
 * in SQL before generating recommendations.
 */
export const WAITER_AI_SYSTEM_PROMPT = `
You are an expert, warm, and concise AI Sommelier & Waiter for {{STORE_NAME}}.
Your job is to help the guest decide what to order based ONLY on live available menu items returned by your tools.

RULES:
1. Always call 'search_live_menu' with the guest's allergens, dietary restrictions, and budget first.
2. Never recommend an item that is out of stock or contains an excluded allergen.
3. For every dish you recommend, provide explicit, personalized REASONING explaining:
   - Why its flavor profile and texture match the user's craving.
   - How it fits their dietary/allergen requirements and budget.
   - A specific pairing or modifier suggestion (e.g., drink or side pairing).
4. If the user has an available Loyalty Milestone Reward (check via 'get_customer_loyalty_perks'), proactively suggest how they can redeem it on this order.
5. Respond strictly matching the WaiterAiResponseSchema JSON contract.
`.trim();

/**
 * Waiter Ai Response Schema
 * 
 * Strict JSON contract for all LLM outputs. Every recommended item ID must be
 * validated against the database response before returning to the client.
 */
export const WaiterAiResponseSchema = {
  type: "object",
  required: [
    "conversationalReply",
    "reasoningSummary",
    "recommendations",
    "followUpSuggestions",
  ],
  properties: {
    conversationalReply: {
      type: "string",
      description: "Warm, natural response addressing the guest's request.",
    },
    reasoningSummary: {
      type: "string",
      description: "Transparent explanation of how items were filtered (allergens excluded, budget & flavor match).",
    },
    recommendations: {
      type: "array",
      items: {
        type: "object",
        required: [
          "menuItemId",
          "name",
          "priceCents",
          "matchScore",
          "reasoning",
          "suggestedModifierIds",
        ],
        properties: {
          menuItemId: { type: "string" },
          name: { type: "string" },
          priceCents: { type: "integer" },
          matchScore: {
            type: "number",
            description: "0.0 to 1.0 confidence score",
          },
          reasoning: {
            type: "string",
            description: "Specific reason why this dish fits the guest's craving, dietary profile, and price point.",
          },
          pairingNote: { type: "string" },
          suggestedModifierIds: {
            type: "array",
            items: { type: "string" },
          },
          canRedeemMilestoneId: {
            type: "string",
            nullable: true,
          },
        },
      },
      description: "Array of recommended menu items with full reasoning.",
    },
    followUpSuggestions: {
      type: "array",
      items: { type: "string" },
      description:
        "2-3 quick tap chips for the user (e.g., 'Make it spicier', 'Pair with a mocktail', 'Add top pick to cart').",
    },
  },
} as const;

/**
 * Type-safe response type (narrowed from the schema)
 */
export type WaiterAiResponse = {
  conversationalReply: string;
  reasoningSummary: string;
  recommendations: Array<{
    menuItemId: string;
    name: string;
    priceCents: number;
    matchScore: number;
    reasoning: string;
    suggestedModifierIds?: string[];
    canRedeemMilestoneId?: string | null;
    pairingNote?: string;
  }>;
  followUpSuggestions: string[];
};

/**
 * Build a waiter AI response from partial data
 */
export function buildWaiterResponse(
  options: {
    conversationalReply: string;
    reasoningSummary: string;
    recommendations: WaiterAiResponse["recommendations"];
    followUpSuggestions: WaiterAiResponse["followUpSuggestions"];
  }
): WaiterAiResponse {
  return {
    conversationalReply: options.conversationalReply,
    reasoningSummary: options.reasoningSummary,
    recommendations: options.recommendations,
    followUpSuggestions: options.followUpSuggestions,
  };
}

/**
 * Placeholder: search live menu function
 * 
 * In the architecture guide, the AI Waiter must call this tool to get live
 * available menu items filtered by allergens before making recommendations.
 * The actual implementation queries the database and returns MenuItem[].
 */
export function searchLiveMenu(
  allergens: string[],
  dietaryPreferences: string[],
  maxPriceCents?: number,
  maxSpiceLevel?: number
): any {
  // TODO: Implement tool call to retrieve live menu items
  // Must filter by allergens in SQL before returning results
  return [];
}

/**
 * Placeholder: get customer loyalty perks
 * 
 * In the architecture guide, the AI Waiter should check if the user has
 * an available Loyalty Milestone Reward before generating recommendations.
 * Returns whether a milestone is available and its details.
 */
export function getCustomerLoyaltyPerks(
  customerId: string
): {
  hasAvailableMilestone: boolean;
  milestoneId?: string;
  milestoneTitle?: string;
  redeemValueCents?: number;
} {
  return { hasAvailableMilestone: false };
}