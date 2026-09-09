import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import ConsoleChrome, { ConsoleStatusCard } from "../components/console/ConsoleChrome";
import LoyaltyProgramPanel from "../components/console/LoyaltyProgramPanel";
import { ModuleGuard } from "../components/auth/ModuleGuard";
import { getSupabaseClient, isEnterpriseSupabaseConfigured } from "../services/supabaseClient";

interface EnterpriseProfile {
  enterprise_id: string;
  role: "super_admin" | "enterprise_admin" | "standard_user";
}

export default function LoyaltyProgram() {
  const configured = isEnterpriseSupabaseConfigured();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [profile, setProfile] = useState<EnterpriseProfile | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        const userId = sessionData.session?.user?.id;
        if (!userId) {
          if (!cancelled) { setSignedIn(false); setLoading(false); }
          return;
        }
        const { data, error: profileError } = await supabase.from("profiles").select("enterprise_id, role").eq("id", userId).maybeSingle();
        if (profileError) throw profileError;
        if (!cancelled) {
          setSignedIn(true);
          setProfile(data ? (data as EnterpriseProfile) : null);
          setError("");
          setLoading(false);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load enterprise profile.");
          setLoading(false);
        }
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [configured]);

  if (loading) return <ConsoleChrome title="Loyalty program" subtitle="Loading your enterprise profile…"><div className="rounded-3xl border border-hairline bg-surface p-8 text-[14px] text-ink-muted" role="status">Checking access…</div></ConsoleChrome>;
  if (!configured) return <ConsoleChrome title="Loyalty program"><ConsoleStatusCard eyebrow="Setup" title="Sign-in is not configured" role="alert"><p>Add Supabase Auth configuration before opening enterprise modules.</p></ConsoleStatusCard></ConsoleChrome>;
  if (!signedIn) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (error || !profile?.enterprise_id) return <ConsoleChrome title="Loyalty program"><ConsoleStatusCard eyebrow="Access" title="Enterprise profile required" role="alert"><p>{error || "This account has no enterprise profile. Ask an administrator to provision it."}</p></ConsoleStatusCard></ConsoleChrome>;

  return <ConsoleChrome eyebrow="Retention" title="Loyalty program" subtitle="Configure points, rewards, members, and the customer journey from one place."><ModuleGuard moduleKey="loyalty" enterpriseId={profile.enterprise_id} fallback={<ConsoleStatusCard eyebrow="Unavailable" title="Loyalty isn’t turned on"><p>An enterprise admin needs to enable the Loyalty module before rewards can be configured.</p></ConsoleStatusCard>}><LoyaltyProgramPanel enterpriseId={profile.enterprise_id} role={profile.role} /></ModuleGuard></ConsoleChrome>;
}
