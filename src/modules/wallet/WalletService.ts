// Module 4: Wallet Loyalty Badge
// WalletService - Wallet service from architecture guide
// ============================================================
// Provides the Apple/Google/Samsung Wallet pass generation logic.
// Uses the in-process event bus from the architecture guide for loyalty updates.
// The actual pass generation should use the server-side signing credentials.

import { emitLoyaltyUpdated } from "../chatbot/lib/eventEmitter";

/** Customer profile minimal interface for wallet */
export interface CustomerProfileForWallet {
  id: string;
  pointsBalance: number;
  tierName: string;
  memberCode: string;
}

/** Apple Wallet pass JSON template */
export function buildAppleLoyaltyPassJson(
  customer: CustomerProfileForWallet,
  tierName: string,
  nextMilestoneText: string
) {
  return {
    formatVersion: 1,
    passTypeIdentifier: process.env.APPLE_PASS_TYPE_ID || "pass.example.store",
    serialNumber: customer.id,
    teamIdentifier: process.env.APPLE_TEAM_ID || "TEAMIdentifier",
    organizationName: process.env.STORE_NAME || "Store Name",
    description: `${process.env.STORE_NAME || "Store"} Loyalty Pass`,
    logoText: process.env.STORE_NAME || "Store Name",
    foregroundColor: "rgb(248, 250, 252)",
    backgroundColor: "rgb(15, 23, 42)",
    labelColor: "rgb(56, 189, 248)",
    webServiceURL: `${process.env.PUBLIC_URL || "http://localhost"}/api/v1/wallet/apple`,
    authenticationToken: customer.memberCode,
    barcodes: [
      {
        format: "PKBarcodeFormatQR",
        message: customer.memberCode,
        messageEncoding: "iso-8859-1",
        altText: customer.memberCode,
      },
    ],
    storeCard: {
      headerFields: [
        { key: "points", label: "POINTS", value: customer.pointsBalance.toString() },
      ],
      primaryFields: [
        { key: "tier", label: "MEMBERSHIP TIER", value: tierName },
      ],
      secondaryFields: [
        {
          key: "milestone",
          label: "NEXT REWARD MILESTONE",
          value: nextMilestoneText,
          changeMessage: "Reward Milestone Update: %@",
        },
      ],
    },
  };
}

/** Google Wallet loyalty object builder */
export function buildGoogleLoyaltyObject(
  customerId: string,
  pointsBalance: number,
  tierName: string,
  nextMilestoneText: string
) {
  // In a full implementation, this would sign a RS256 JWT for Google Wallet
  // For now, return the structure that would be used
  return {
    customerId,
    loyaltyClassId: process.env.GOOGAL_LOYALTY_CLASS_ID || "class.example",
    loyaltyObjectId: process.env.GOOGAL_LOYALTY_OBJECT_ID || "object.example",
    state: "ACTIVE",
    loyaltyPoints: pointsBalance,
    tier: tierName,
    nextMilestone: nextMilestoneText,
  };
}

/** Samsung Wallet payload builder */
export function buildSamsungWalletPayload(
  customerId: string,
  pointsBalance: number,
  tierName: string
) {
  // In a full implementation, this would sign Cdata JWT for Samsung Wallet
  // For now, return the structure
  return {
    cardId: customerId,
    balance: pointsBalance,
    tier: tierName,
  };
}

/** Process loyalty update - emits event for subscribers */
export function processLoyaltyUpdate(
  customerId: string,
  pointsBalance: number,
  tierName: string,
  newlyUnlockedMilestones: string[]
) {
  emitLoyaltyUpdated({
    customerId,
    pointsBalance,
    tierName,
    newlyUnlockedMilestones,
  });
}