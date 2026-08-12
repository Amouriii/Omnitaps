/**
 * TASK-2.2: Browser Supabase client for the enterprise nav/admin layer.
 * Reuses the app's shared browser client to avoid dual GoTrue lock contention.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabaseBrowserClient,
  isAuthConfigured,
} from "../lib/supabaseClient";

export function isEnterpriseSupabaseConfigured(): boolean {
  return isAuthConfigured();
}

export function getSupabaseClient(): SupabaseClient {
  const client = getSupabaseBrowserClient();
  if (!client) {
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
    );
  }
  return client as SupabaseClient;
}
