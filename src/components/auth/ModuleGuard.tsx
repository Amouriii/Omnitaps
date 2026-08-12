/**
 * TASK-4.3: Feature module gate based on enterprise_modules.enablement.
 */

import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "../../context/AuthContext";
import { getSupabaseClient } from "../../services/supabaseClient";
import type { EnterpriseModule } from "../../types";

export interface ModuleGuardProps {
  moduleKey: string;
  children: ReactNode;
  fallback?: ReactNode;
}

interface ModuleGuardState {
  loading: boolean;
  enabled: boolean;
  error: string | null;
  module: EnterpriseModule | null;
}

function assertEnterpriseModule(row: unknown): EnterpriseModule {
  if (row === null || typeof row !== "object") {
    throw new Error("Invalid enterprise module payload.");
  }

  const value = row as Record<string, unknown>;
  return {
    id: String(value.id),
    enterprise_id: String(value.enterprise_id),
    module_key: String(value.module_key),
    is_enabled: Boolean(value.is_enabled),
    settings: (value.settings ?? {}) as Record<string, unknown>,
    updated_at: String(value.updated_at),
  };
}

export function ModuleGuard({ moduleKey, children, fallback }: ModuleGuardProps) {
  const { profile, loading: authLoading } = useAuth();
  const [state, setState] = useState<ModuleGuardState>({
    loading: true,
    enabled: false,
    error: null,
    module: null,
  });

  useEffect(() => {
    if (authLoading) {
      return;
    }

    const enterpriseId = profile?.enterprise_id;
    if (!enterpriseId) {
      setState({
        loading: false,
        enabled: false,
        error: "No enterprise profile is available for this user.",
        module: null,
      });
      return;
    }

    let cancelled = false;

    const load = async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("enterprise_modules")
          .select("*")
          .eq("enterprise_id", enterpriseId)
          .eq("module_key", moduleKey)
          .maybeSingle();

        if (error) {
          throw new Error(error.message);
        }

        if (cancelled) return;

        if (!data) {
          setState({
            loading: false,
            enabled: false,
            error: null,
            module: null,
          });
          return;
        }

        const moduleRow = assertEnterpriseModule(data);
        setState({
          loading: false,
          enabled: moduleRow.is_enabled,
          error: null,
          module: moduleRow,
        });
      } catch (err) {
        if (cancelled) return;
        setState({
          loading: false,
          enabled: false,
          error: err instanceof Error ? err.message : "Failed to load module state.",
          module: null,
        });
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [authLoading, profile?.enterprise_id, moduleKey]);

  if (authLoading || state.loading) {
    return <div aria-busy="true">Checking module access…</div>;
  }

  if (state.error) {
    return <div role="alert">Module check failed: {state.error}</div>;
  }

  if (!state.enabled) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div role="status" aria-live="polite">
        <h2>Module Disabled</h2>
        <p>
          The <strong>{moduleKey}</strong> module is not enabled for this enterprise.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
