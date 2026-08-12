/**
 * Resolve a URL param (enterprise slug or UUID) to a restaurant record.
 * Keeps DB access out of presentational menu components.
 */

import { requireSupabase } from "../supabaseClient";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * @param {string} param
 * @returns {Promise<{ id: string, name: string, slug: string } | null>}
 */
export async function resolveRestaurant(param) {
  const trimmed = String(param || "").trim();
  if (!trimmed) {
    return null;
  }

  const supabase = requireSupabase();
  const column = UUID_RE.test(trimmed) ? "id" : "slug";

  const { data, error } = await supabase
    .from("enterprises")
    .select("id, name, slug")
    .eq(column, trimmed)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return {
    id: String(data.id),
    name: String(data.name),
    slug: String(data.slug),
  };
}
