/**
 * TASK-2.2: Browser Supabase client for the enterprise nav/admin layer.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl: string = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabaseAnonKey: string = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

let client: SupabaseClient | null = null;

export function isEnterpriseSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl.trim() && supabaseAnonKey.trim());
}

export function getSupabaseClient(): SupabaseClient {
  if (!isEnterpriseSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
    );
  }

  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return client;
}

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, property, receiver) {
    const instance = getSupabaseClient();
    const value = Reflect.get(instance, property, receiver);
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
});
