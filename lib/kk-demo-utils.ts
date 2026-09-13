export const KK_CART_STORAGE_KEY = "koffee-kulture-cart-v1";
const REFERENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export type PersistedCartLine = {
  id: string;
  name: string;
  size?: string;
  unitPrice: number;
  qty: number;
};

function isPersistedCartLine(value: unknown): value is PersistedCartLine {
  if (!value || typeof value !== "object") return false;
  const line = value as Record<string, unknown>;
  return (
    typeof line.id === "string" &&
    typeof line.name === "string" &&
    (line.size === undefined || typeof line.size === "string") &&
    typeof line.unitPrice === "number" &&
    Number.isFinite(line.unitPrice) &&
    line.unitPrice >= 0 &&
    typeof line.qty === "number" &&
    Number.isInteger(line.qty) &&
    line.qty >= 1 &&
    line.qty <= 50
  );
}

/** Read only a validated cart from this browser tab's session. */
export function readKoffeeKultureCart(): PersistedCartLine[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.sessionStorage.getItem(KK_CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isPersistedCartLine).slice(0, 40);
  } catch {
    // Storage can be unavailable in private browsing or blocked contexts.
    return [];
  }
}

/** Persist the cart without allowing storage failures to interrupt ordering. */
export function writeKoffeeKultureCart(cart: PersistedCartLine[]): void {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(
      KK_CART_STORAGE_KEY,
      JSON.stringify(cart.slice(0, 40)),
    );
  } catch {
    // The demo remains usable when sessionStorage is unavailable or full.
  }
}

/**
 * Create a compact, human-friendly reference that looks like a real branch
 * ticket while remaining deterministic enough to assert in tests.
 */
export function createDemoReference(
  prefix: "KK" | "RES",
  date = new Date(),
  random = Math.random(),
): string {
  const day = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");
  let seed = Math.floor(Math.max(0, Math.min(0.999999999, random)) * 1_000_000_000);
  let suffix = "";

  for (let index = 0; index < 4; index += 1) {
    suffix = REFERENCE_ALPHABET[seed % REFERENCE_ALPHABET.length] + suffix;
    seed = Math.floor(seed / REFERENCE_ALPHABET.length);
  }

  return `${prefix}-${day}-${suffix}`;
}
