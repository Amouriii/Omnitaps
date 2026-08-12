/**
 * CRUD helpers for public.qr_menu_items (QR food menu).
 * Keeps Supabase writes out of presentational admin components.
 */

import { requireSupabase } from "../lib/supabaseClient";

/**
 * @typedef {Object} QrMenuItemInput
 * @property {string} restaurant_id
 * @property {string} name
 * @property {string} [description]
 * @property {number} price
 * @property {number | null} [calories]
 * @property {Record<string, unknown>} [nutritional_info]
 * @property {boolean} [is_available]
 */

/**
 * @param {unknown} row
 */
function normalize(row) {
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
 * @param {QrMenuItemInput} input
 */
export async function createQrMenuItem(input) {
  const name = String(input.name || "").trim();
  const price = Number(input.price);

  if (!input.restaurant_id) {
    throw new Error("restaurant_id is required.");
  }
  if (!name) {
    throw new Error("Name is required.");
  }
  if (!Number.isFinite(price) || price < 0) {
    throw new Error("Price must be a non-negative number.");
  }

  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("qr_menu_items")
    .insert({
      restaurant_id: input.restaurant_id,
      name,
      description: input.description?.trim() ? input.description.trim() : null,
      price,
      calories:
        input.calories === null || input.calories === undefined
          ? null
          : Number(input.calories),
      nutritional_info: input.nutritional_info ?? {},
      is_available: input.is_available !== false,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalize(data);
}

/**
 * @param {string} id
 * @param {boolean} isAvailable
 */
export async function setQrMenuItemAvailability(id, isAvailable) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("qr_menu_items")
    .update({ is_available: Boolean(isAvailable) })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalize(data);
}

/**
 * @param {string} id
 */
export async function deleteQrMenuItem(id) {
  const supabase = requireSupabase();
  const { error } = await supabase.from("qr_menu_items").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}
