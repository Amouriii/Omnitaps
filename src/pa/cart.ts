import { MENU } from "./menu";

export type CartLine = {
  id: string;
  name: string;
  size?: string;
  unitPrice: number;
  qty: number;
};

const STORAGE_KEY = "pa-demo-cart-v1";
const MAX_QTY_PER_LINE = 99;

function menuIndex() {
  const index = new Map<string, { name: string; unitPrice: number }>();
  for (const section of MENU) {
    for (const item of section.items) {
      for (const price of item.prices) {
        const id = item.id + (price.label ? `-${price.label}` : "");
        index.set(id, { name: item.name, unitPrice: price.price });
      }
    }
  }
  return index;
}

export function loadCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const index = menuIndex();
    return parsed.flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];
      const value = entry as Record<string, unknown>;
      const id = typeof value.id === "string" ? value.id : "";
      const qty = typeof value.qty === "number" && Number.isFinite(value.qty)
        ? Math.floor(value.qty)
        : 0;
      const menuEntry = index.get(id);
      if (!menuEntry || qty <= 0) return [];
      return [{
        id,
        name: menuEntry.name,
        unitPrice: menuEntry.unitPrice,
        qty: Math.min(qty, MAX_QTY_PER_LINE),
        ...(typeof value.size === "string" && value.size ? { size: value.size } : {}),
      }];
    });
  } catch {
    return [];
  }
}

export function saveCart(lines: CartLine[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    // Persistence is best-effort; the in-memory cart remains usable.
  }
}
