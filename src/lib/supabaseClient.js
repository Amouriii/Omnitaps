import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export function isAuthConfigured() {
  return Boolean(supabaseUrl.trim() && supabaseAnonKey.trim());
}

let client;

/**
 * Shared browser Supabase client (QR menu realtime, auth, enterprise admin).
 * Returns null when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are unset.
 */
export function getSupabaseBrowserClient() {
  if (!isAuthConfigured()) {
    return null;
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

/**
 * Same singleton as getSupabaseBrowserClient(), but throws if env is missing.
 * Use from menu hooks/components that require a live connection.
 */
export function requireSupabase() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
    );
  }
  return supabase;
}

/** Initialized client when configured; otherwise null. */
export const supabase = getSupabaseBrowserClient();
