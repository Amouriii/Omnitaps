import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { ApiError, fetchAdminOverview } from "../lib/apiClient";

export default function AdminDashboard() {
  const { profile, accessToken, signOut } = useAuth();
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return undefined;

    let cancelled = false;
    setLoading(true);
    setError("");

    fetchAdminOverview(accessToken)
      .then((payload) => {
        if (!cancelled) setOverview(payload);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Unable to load dashboard.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const summary = overview?.summary;

  return (
    <main className="min-h-screen bg-porcelain text-ink">
      <header className="border-b border-hairline bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-tap">Admin</p>
            <h1 className="font-display text-[24px] font-semibold tracking-[-0.02em]">
              {profile?.user?.name || profile?.user?.email || "Dashboard"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-[14px] text-ink-muted hover:text-ink">
              Site
            </Link>
            <button
              type="button"
              onClick={() => signOut()}
              className="rounded-xl border border-hairline bg-porcelain px-3 py-2 text-[13px] font-medium hover:border-hairline-strong"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        {loading ? (
          <p className="text-ink-muted" role="status">
            Loading overview…
          </p>
        ) : error ? (
          <div className="rounded-3xl border border-hairline bg-surface p-6" role="alert">
            <h2 className="font-display text-[20px] font-semibold">Dashboard unavailable</h2>
            <p className="mt-2 text-[15px] text-ink-muted">{error}</p>
          </div>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Tenants", value: summary?.tenantCount ?? 0 },
                { label: "Open feedback", value: summary?.openFeedback ?? 0 },
                { label: "Menu scans (7d)", value: summary?.menuScans7d ?? 0 },
                { label: "Active Wi‑Fi nets", value: summary?.activeWifiNetworks ?? 0 },
              ].map((card) => (
                <div key={card.label} className="rounded-3xl border border-hairline bg-surface p-5">
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">{card.label}</p>
                  <p className="mt-3 font-display text-[32px] font-semibold">{card.value}</p>
                </div>
              ))}
            </section>

            <section className="mt-8 rounded-3xl border border-hairline bg-surface p-6 sm:p-8">
              <h2 className="font-display text-[22px] font-semibold">Your tenants</h2>
              <p className="mt-2 text-[14px] text-ink-muted">
                Data is loaded from your provisioned memberships — nothing is invented client-side.
              </p>

              {overview?.tenants?.length ? (
                <ul className="mt-6 divide-y divide-hairline">
                  {overview.tenants.map((tenant) => (
                    <li key={tenant.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                      <div>
                        <p className="font-semibold text-ink">{tenant.name}</p>
                        <p className="text-[13px] text-ink-muted">
                          {tenant.slug} · {tenant.status} · {tenant.plan}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-3 text-[13px]">
                        <Link className="text-tap hover:underline" to={`/menu/${tenant.slug}`}>
                          Menu
                        </Link>
                        <Link className="text-tap hover:underline" to={`/r/${tenant.slug}/review`}>
                          Reviews
                        </Link>
                        <Link className="text-tap hover:underline" to={`/r/${tenant.slug}/wifi`}>
                          Wi‑Fi
                        </Link>
                        <Link className="text-tap hover:underline" to={`/s/${tenant.slug}`}>
                          Site
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-6 rounded-2xl bg-porcelain px-4 py-3 text-[14px] text-ink-muted">
                  No tenants are linked to this account yet.
                </p>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
