import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { ModuleGuard } from "./auth/ModuleGuard";
import { getSupabaseClient, isEnterpriseSupabaseConfigured } from "../services/supabaseClient";

/**
 * Gates captive Wi-Fi admin UI behind Supabase session + enterprise_modules.wifi.
 * Uses public.profiles (nav domain), not Prisma /api/admin/session.
 */
export default function WifiModuleGate({ children }) {
  const location = useLocation();
  const [enterpriseId, setEnterpriseId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!isEnterpriseSupabaseConfigured()) {
        if (!cancelled) {
          setError("Supabase is not configured for enterprise modules.");
          setLoading(false);
        }
        return;
      }

      try {
        const supabase = getSupabaseClient();
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData.user) {
          if (!cancelled) {
            setNeedsLogin(true);
            setLoading(false);
          }
          return;
        }

        const { data, error: profileError } = await supabase
          .from("profiles")
          .select("enterprise_id")
          .eq("id", authData.user.id)
          .maybeSingle();

        if (profileError) throw new Error(profileError.message);
        if (!data?.enterprise_id) {
          throw new Error("No enterprise profile for this user.");
        }

        if (!cancelled) {
          setEnterpriseId(String(data.enterprise_id));
          setError("");
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setEnterpriseId("");
          setError(err instanceof Error ? err.message : "Unable to load enterprise profile.");
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (needsLogin) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-porcelain text-ink-muted" role="status">
        Loading Wi‑Fi module…
      </div>
    );
  }

  if (error || !enterpriseId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-porcelain px-5 text-ink">
        <div className="max-w-md rounded-3xl border border-hairline bg-surface p-8" role="alert">
          <h1 className="font-display text-[24px] font-semibold">Enterprise profile required</h1>
          <p className="mt-3 text-[15px] leading-[1.7] text-ink-muted">
            {error || "Sign in with an account that has a public.profiles row."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <ModuleGuard
      moduleKey="wifi"
      enterpriseId={enterpriseId}
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-porcelain px-5 text-ink">
          <div className="max-w-md rounded-3xl border border-hairline bg-surface p-8" role="alert">
            <h1 className="font-display text-[24px] font-semibold">Wi‑Fi module disabled</h1>
            <p className="mt-3 text-[15px] leading-[1.7] text-ink-muted">
              Enable the <code className="font-mono text-[13px]">wifi</code> module for this enterprise
              to access captive-portal telemetry and settings.
            </p>
          </div>
        </main>
      }
    >
      {children}
    </ModuleGuard>
  );
}
