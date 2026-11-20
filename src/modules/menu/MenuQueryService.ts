// Module 1: Interactive Menu & Web-Menu
// MenuQueryService - Service interface from architecture guide
// ============================================================
// Defines the MenuQueryService contract for querying the menu catalog.
// The actual Prisma implementation should use the existing database schema.
// This service emits 'menu.stock_updated' events when inventory changes.

import { emitMenuStockUpdated } from "../chatbot/lib/eventEmitter";

/** Filter query for menu items */
export interface MenuFilterQuery {
  storeId: string;
  onlyAvailable?: boolean;
  excludeAllergens?: string[];
  requiredDietaryTags?: string[];
  maxPriceCents?: number;
  maxSpiceLevel?: number;
  flavorKeywords?: string[];
}

/** Menu modifier */
export interface MenuModifier {
  id: string;
  name: string;
  priceCents: number;
  isAvailable: boolean;
}

/** Menu modifier group */
export interface MenuModifierGroup {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  modifiers: MenuModifier[];
}

/** Menu item interface */
export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  imageUrl: string | null;
  isAvailable: boolean;
  stockCount: number | null; // Null = unlimited; 0 = auto-86'd
  prepTimeMinutes: number;
  calories: number | null;
  spiceLevel: number; // 0-5 scale
  allergens: string[]; // Strict exclusion list for AI Waiter safety filter
  dietaryTags: string[]; // ["vegan", "gluten-free", "halal", "keto"]
  flavorTags: string[]; // ["smoky", "citrusy", "creamy", "umami", "refreshing"]
  pairingItemIds: string[]; // Explicit cross-sell pairings
  modifierGroups: MenuModifierGroup[];
}

/** Menu item with modifier groups included */
export interface MenuItemWithModifiers extends MenuItem {
  modifierGroups: MenuModifierGroup[];
}

/** Menu query service contract */
export class MenuQueryService {
  /** Query available menu items with filters */
  async queryAvailableItems(
    filter: MenuFilterQuery
  ): Promise<MenuItemWithModifiers[]> {
    // TODO: Implement with Prisma using existing schema
    // This should filter menu items by store, availability, allergens, dietary tags, price, etc.
    return [];
  }

  /** Get a menu item by ID */
  async getItemById(itemId: string): Promise<MenuItemWithModifiers | null> {
    // TODO: Implement with Prisma using existing schema
    return null;
  }

  /** Emit stock update event when inventory changes */
  async emitStockUpdated(
    menuItemId: string,
    isAvailable: boolean,
    stockCount: number | null,
    storeId: string
  ) {
    emitMenuStockUpdated(storeId, menuItemId, isAvailable, stockCount);
  }
}