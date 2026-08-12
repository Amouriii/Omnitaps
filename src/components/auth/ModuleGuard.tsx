/**
 * TASK-4.3: Feature module gate based on enterprise_modules.enablement.
 */

import { useEffect, useState, type ReactNode } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";
import type { EnterpriseModule } from "../../types";

export interface ModuleGuardProps {
  moduleKey: string;
  enterpriseId: string;
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

export function ModuleGuard({
  moduleKey,
  enterpriseId,
  children,
  fallback,
}: ModuleGuardProps) {
  const [state, setState] = useState<ModuleGuardState>({
    loading: true,
    enabled: false,
    error: null,
    module: null,
  });

  useEffect(() => {
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
  }, [enterpriseId, moduleKey]);

  if (state.loading) {
    return <div className="text-[14px] text-ink-muted" aria-busy="true">Checking module access…</div>;
  }

  if (state.error) {
    return (
      <div className="rounded-2xl border border-hairline bg-porcelain px-4 py-3 text-[14px] text-ink" role="alert">
        Module check failed: {state.error}
      </div>
    );
  }

  if (!state.enabled) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div role="status" aria-live="polite" className="rounded-2xl border border-brass/20 bg-brass-soft/60 p-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-brass-dark">
          Module disabled
        </p>
        <h2 className="mt-2 font-display text-[18px] font-semibold">Module Disabled</h2>
        <p className="mt-2 text-[14px] leading-[1.7] text-ink">
          The <strong>{moduleKey}</strong> module is not enabled for this enterprise.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
