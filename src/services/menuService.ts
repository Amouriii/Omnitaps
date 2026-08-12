/**
 * TASK-2.3: Menu data service backed by public.menu_items.
 */

import type { MenuItem } from "../types";
import { getSupabaseClient } from "./supabaseClient";

export interface MenuItemOrderUpdate {
  id: string;
  sort_order: number;
}

function assertMenuItem(row: unknown): MenuItem {
  if (row === null || typeof row !== "object") {
    throw new Error("Invalid menu item payload.");
  }

  const value = row as Record<string, unknown>;
  const requiredRoles = value.required_roles;

  if (!Array.isArray(requiredRoles)) {
    throw new Error("Menu item required_roles must be an array.");
  }

  return {
    id: String(value.id),
    enterprise_id: String(value.enterprise_id),
    parent_id: value.parent_id === null || value.parent_id === undefined ? null : String(value.parent_id),
    label: String(value.label),
    url_path: String(value.url_path),
    icon_name:
      value.icon_name === null || value.icon_name === undefined
        ? null
        : String(value.icon_name),
    sort_order: Number(value.sort_order),
    is_visible: Boolean(value.is_visible),
    required_roles: requiredRoles.map((role) => String(role)) as MenuItem["required_roles"],
    created_at: String(value.created_at),
    updated_at: String(value.updated_at),
  };
}

export async function fetchMenuItems(enterpriseId: string): Promise<MenuItem[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("menu_items")
    .select("*")
    .eq("enterprise_id", enterpriseId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(assertMenuItem);
}

export async function updateMenuItemOrder(
  items: MenuItemOrderUpdate[],
): Promise<MenuItem[]> {
  if (items.length === 0) {
    return [];
  }

  const supabase = getSupabaseClient();
  const updated: MenuItem[] = [];

  for (const item of items) {
    const { data, error } = await supabase
      .from("menu_items")
      .update({ sort_order: item.sort_order })
      .eq("id", item.id)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    updated.push(assertMenuItem(data));
  }

  return updated;
}

export async function toggleMenuItemVisibility(
  id: string,
  isVisible: boolean,
): Promise<MenuItem> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("menu_items")
    .update({ is_visible: isVisible })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return assertMenuItem(data);
}

export async function createMenuItem(item: Omit<MenuItem, "id">): Promise<MenuItem> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("menu_items")
    .insert({
      enterprise_id: item.enterprise_id,
      parent_id: item.parent_id,
      label: item.label,
      url_path: item.url_path,
      icon_name: item.icon_name,
      sort_order: item.sort_order,
      is_visible: item.is_visible,
      required_roles: item.required_roles,
      created_at: item.created_at,
      updated_at: item.updated_at,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return assertMenuItem(data);
}

export async function updateMenuItemFields(
  id: string,
  fields: Partial<Pick<MenuItem, "label" | "url_path" | "icon_name" | "parent_id">>,
): Promise<MenuItem> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("menu_items")
    .update(fields)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return assertMenuItem(data);
}
