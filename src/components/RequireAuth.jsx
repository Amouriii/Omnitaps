import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";

export default function RequireAuth({ children }) {
  const { configured, loading, isAuthenticated, profile, profileError } = useAuth();
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
