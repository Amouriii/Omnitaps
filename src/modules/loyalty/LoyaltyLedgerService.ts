// Module 3: E2E App, Loyalty Ledger & Reward Milestones
// LoyaltyLedgerService - Event-driven loyalty service adapted from architecture guide
// ============================================================
// Uses the in-process event bus from the architecture guide instead of direct Prisma queries.
// Emits 'loyalty.updated' events that wallet and other modules can subscribe to.

import { emitLoyaltyUpdated } from "../chatbot/lib/eventEmitter";

// No Prisma dependency - this service emits events that other modules subscribe to
// Points earn/redeem logic should be implemented in API routes that call this service

/**
 * Process order paid - emits loyalty update event for wallet sync
 * 
 * Following the architecture guide's pattern: instead of direct Prisma operations,
 * this service emits 'loyalty.updated' events that the wallet module subscribes to.
 * The actual Prisma transaction should happen in the API route, then this is called.
 */
export function processOrderPaidEmitEvent(
  customerId: string,
  pointsEarned: number,
  tierName: string,
  newlyUnlockedMilestones: string[] = []
) {
  emitLoyaltyUpdated({
    customerId,
    pointsBalance: pointsEarned, // In real usage, this would be the new balance
    tierName,
    newlyUnlockedMilestones,
  });
}

/**
 * Get customer loyalty status - subscribes to event history
 * 
 * In the architecture guide pattern, loyalty state is maintained via the event bus
 * and durable storage (D1/R2 or database). This function provides a read interface.
 */
export function getCustomerLoyaltyStatus(
  customerId: string
): {
  pointsBalance: number;
  tierName: string;
  recentlyUnlocked: string[];
} {
  // Return default status - in a full implementation, this would query
  // the database or D1 for the customer's loyalty state
  return {
    pointsBalance: 0,
    tierName: "Member",
    recentlyUnlocked: [],
  };
}