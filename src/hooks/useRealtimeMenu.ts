/**
 * TASK-3.2: Real-time menu subscription for a single enterprise.
 */

import { useCallback, useEffect, useState } from "react";
import type { MenuItem } from "../types";
import { fetchMenuItems } from "../services/menuService";
import { getSupabaseClient } from "../services/supabaseClient";

export interface UseRealtimeMenuResult {
  menuItems: MenuItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

let realtimeMenuSubscriberId = 0;

export function useRealtimeMenu(enterpriseId: string): UseRealtimeMenuResult {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [subscriberId] = useState(() => {
    realtimeMenuSubscriberId += 1;
    return realtimeMenuSubscriberId;
  });

  const refresh = useCallback(async () => {
    if (!enterpriseId) {
      setMenuItems([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    try {
      const items = await fetchMenuItems(enterpriseId);
      setMenuItems(items);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load menu items.";
      setError(message);
      setMenuItems([]);
    } finally {
      setLoading(false);
    }
  }, [enterpriseId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enterpriseId) {
      return undefined;
    }

    const supabase = getSupabaseClient();
    const channelName = `menu_items:enterprise:${enterpriseId}:${subscriberId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "menu_items",
          filter: `enterprise_id=eq.${enterpriseId}`,
        },
        () => {
          void refresh();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enterpriseId, refresh, subscriberId]);

  return {
    menuItems,
    loading,
    error,
    refresh,
  };
}
