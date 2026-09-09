import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import ConsoleChrome, { ConsoleStatusCard } from "../components/console/ConsoleChrome";
import WalletMembershipPanel from "../components/console/WalletMembershipPanel";
import { ModuleGuard } from "../components/auth/ModuleGuard";
import {
  getSupabaseClient,
  isEnterpriseSupabaseConfigured,
} from "../services/supabaseClient";

interface EnterpriseProfile {
  enterprise_id: string;
  role: "super_admin" | "enterprise_admin" | "standard_user";
}

export default function WalletMembership() {
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
        if (!sessionData.session?.user?.id) {
          if (!cancelled) {
            setSignedIn(false);
            setLoading(false);
          }
          return;
        }

        const { data, error: profileError } = await supabase
          .from("profiles")
          .select("enterprise_id, role")
          .eq("id", sessionData.session.user.id)
          .maybeSingle();
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
    return () => {
      cancelled = true;
    };
  }, [configured]);

  if (loading) {
    return <ConsoleChrome title="Wallet membership" subtitle="Loading your enterprise profile…"><div className="rounded-3xl border border-hairline bg-surface p-8 text-[14px] text-ink-muted" role="status">Checking access…</div></ConsoleChrome>;
  }

  if (!configured) {
    return <ConsoleChrome title="Wallet membership"><ConsoleStatusCard eyebrow="Setup" title="Sign-in is not configured" role="alert"><p>Add Supabase Auth configuration before opening enterprise modules.</p></ConsoleStatusCard></ConsoleChrome>;
  }

  if (!signedIn) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (error || !profile?.enterprise_id) {
    return <ConsoleChrome title="Wallet membership"><ConsoleStatusCard eyebrow="Access" title="Enterprise profile required" role="alert"><p>{error || "This account has no enterprise profile. Ask an administrator to provision it."}</p></ConsoleStatusCard></ConsoleChrome>;
  }

  return (
    <ConsoleChrome
      eyebrow="Memberships"
      title="Apple Wallet membership"
      subtitle="Issue branded QR or barcode passes for your store, gym, rewards program, or club."
    >
      <ModuleGuard
        moduleKey="apple_wallet"
        enterpriseId={profile.enterprise_id}
        fallback={
          <ConsoleStatusCard eyebrow="Unavailable" title="Apple Wallet isn’t turned on">
            <p>An enterprise admin needs to enable the Apple Wallet module before membership cards can be issued.</p>
          </ConsoleStatusCard>
        }
      >
        <WalletMembershipPanel enterpriseId={profile.enterprise_id} role={profile.role} />
      </ModuleGuard>
    </ConsoleChrome>
  );
}
