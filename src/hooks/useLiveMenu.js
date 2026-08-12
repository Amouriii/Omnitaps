/**
 * Live QR food-menu subscription for a restaurant (enterprise).
 * Backed by public.qr_menu_items — not the nav table public.menu_items.
 */

import { useCallback, useEffect, useState } from "react";
import { requireSupabase } from "../lib/supabaseClient";

/**
 * @typedef {Object} QrMenuItem
 * @property {string} id
 * @property {string} restaurant_id
 * @property {string} name
 * @property {string | null} description
 * @property {number} price
 * @property {number | null} calories
 * @property {Record<string, unknown>} nutritional_info
 * @property {boolean} is_available
 * @property {string} created_at
 * @property {string} [updated_at]
 */

/**
 * @param {unknown} row
 * @returns {QrMenuItem}
 */
function normalizeQrMenuItem(row) {
  if (row === null || typeof row !== "object") {
    throw new Error("Invalid qr_menu_items row.");
  }

  const value = /** @type {Record<string, unknown>} */ (row);
  const nutritionalInfo =
    value.nutritional_info !== null &&
    typeof value.nutritional_info === "object" &&
    !Array.isArray(value.nutritional_info)
      ? /** @type {Record<string, unknown>} */ (value.nutritional_info)
      : {};

  return {
    id: String(value.id),
    restaurant_id: String(value.restaurant_id),
    name: String(value.name),
    description:
      value.description === null || value.description === undefined
        ? null
        : String(value.description),
    price: Number(value.price),
    calories:
      value.calories === null || value.calories === undefined
        ? null
        : Number(value.calories),
    nutritional_info: nutritionalInfo,
    is_available: Boolean(value.is_available),
    created_at: String(value.created_at),
    updated_at:
      value.updated_at === null || value.updated_at === undefined
        ? undefined
        : String(value.updated_at),
  };
}

/**
 * @param {string} restaurantId enterprise UUID (public.enterprises.id)
 */
export function useLiveMenu(restaurantId) {
  /** @type {[QrMenuItem[], import("react").Dispatch<import("react").SetStateAction<QrMenuItem[]>>]} */
  const [items, setItems] = useState(/** @type {QrMenuItem[]} */ ([]));
  const [loading, setLoading] = useState(true);
  /** @type {[string | null, import("react").Dispatch<import("react").SetStateAction<string | null>>]} */
  const [error, setError] = useState(/** @type {string | null} */ (null));

  const refresh = useCallback(async () => {
    if (!restaurantId) {
      setItems([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    try {
      const supabase = requireSupabase();
      const { data, error: queryError } = await supabase
        .from("qr_menu_items")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: true });

      if (queryError) {
        throw new Error(queryError.message);
      }

      setItems((data ?? []).map(normalizeQrMenuItem));
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load menu items.";
      setError(message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!restaurantId) {
      return undefined;
    }

    let supabase;
    try {
      supabase = requireSupabase();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Supabase is not configured.");
      return undefined;
    }

    const channel = supabase
      .channel(`qr_menu_items:restaurant:${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "qr_menu_items",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const eventType = payload.eventType;

          if (eventType === "INSERT" && payload.new) {
            const next = normalizeQrMenuItem(payload.new);
            setItems((prev) => {
              if (prev.some((item) => item.id === next.id)) {
                return prev;
              }
              return [...prev, next].sort((a, b) =>
                a.created_at.localeCompare(b.created_at),
              );
            });
            return;
          }

          if (eventType === "UPDATE" && payload.new) {
            const next = normalizeQrMenuItem(payload.new);
            setItems((prev) =>
              prev.map((item) => (item.id === next.id ? next : item)),
            );
            return;
          }

          if (eventType === "DELETE" && payload.old) {
            const removedId = String(
              /** @type {Record<string, unknown>} */ (payload.old).id,
            );
            setItems((prev) => prev.filter((item) => item.id !== removedId));
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [restaurantId]);

  return {
    items,
    loading,
    error,
    refresh,
  };
}
