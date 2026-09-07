import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";

// Server-reported transient conditions (DB unavailable, 5xx, timeout) — the
// account itself is fine, so offer a retry instead of the provisioning warning.
const TRANSIENT_PROFILE_CODES = new Set(["PROFILE_UNAVAILABLE", "PROFILE_TIMEOUT"]);

export default function RequireAuth({ children }) {
  const { configured, loading, isAuthenticated, profile, profileError, profileErrorCode, session, refreshProfile } =
    useAuth();
  const location = useLocation();

  if (!configured) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-porcelain px-5 text-ink">
        <div className="max-w-md rounded-3xl border border-hairline bg-surface p-8" role="alert">
          <h1 className="font-display text-[24px] font-semibold">Admin auth not configured</h1>
          <p className="mt-3 text-[15px] leading-[1.7] text-ink-muted">
            Set <code className="font-mono text-[13px]">VITE_SUPABASE_URL</code> and{" "}
            <code className="font-mono text-[13px]">VITE_SUPABASE_ANON_KEY</code>, plus server{" "}
            <code className="font-mono text-[13px]">SUPABASE_URL</code> / service or anon key, then restart the app.
          </p>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-porcelain text-ink-muted" role="status">
        Checking session…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (profileError && !profile) {
    if (TRANSIENT_PROFILE_CODES.has(profileErrorCode)) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-porcelain px-5 text-ink">
          <div className="max-w-md rounded-3xl border border-hairline bg-surface p-8 text-center" role="status">
            <h1 className="font-display text-[24px] font-semibold">Can’t reach your account</h1>
            <p className="mt-3 text-[15px] leading-[1.7] text-ink-muted">
              We couldn’t load your account details. This is usually temporary — check your connection and try
              again.
            </p>
            <button
              type="button"
              onClick={() => refreshProfile(session)}
              className="mt-6 rounded-full bg-ink px-6 py-2.5 text-[14px] font-medium text-surface transition-opacity hover:opacity-90"
            >
              Try again
            </button>
          </div>
        </main>
      );
    }

    return (
      <main className="flex min-h-screen items-center justify-center bg-porcelain px-5 text-ink">
        <div className="max-w-md rounded-3xl border border-hairline bg-surface p-8" role="alert">
          <h1 className="font-display text-[24px] font-semibold">Access blocked</h1>
          <p className="mt-3 text-[15px] leading-[1.7] text-ink-muted">{profileError}</p>
          <p className="mt-4 text-[14px] text-ink-muted">
            Sign in succeeded, but this account is not provisioned in OmniTaps yet. An admin must link your Supabase user
            id to a <code className="font-mono text-[13px]">User.authId</code> row.
          </p>
        </div>
      </main>
    );
  }

  return children;
}
