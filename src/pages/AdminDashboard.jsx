import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ConsoleChrome, {
  ConsoleSkeleton,
  ConsoleStatusCard,
} from "../components/console/ConsoleChrome";
import { useAuth } from "../lib/auth";
import { ApiError, fetchAdminOverview } from "../lib/apiClient";

const TENANT_LINKS = [
  { label: "Menu", path: (slug) => `/menu/${slug}` },
  { label: "Reviews", path: (slug) => `/r/${slug}/review` },
  { label: "Wi‑Fi", path: (slug) => `/r/${slug}/wifi` },
  { label: "Website", path: (slug) => `/s/${slug}` },
];

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
  const displayName = profile?.user?.name || profile?.user?.email || "Admin";

  return (
    <ConsoleChrome
      eyebrow="Admin"
      title={displayName}
      subtitle="Locations linked to this account — guest pages stay public."
      active="admin"
      actions={
        <button
          type="button"
          onClick={() => signOut()}
          className="rounded-xl border border-hairline bg-surface px-3 py-2 text-[13px] font-medium hover:border-hairline-strong"
        >
          Sign out
        </button>
      }
    >
      {loading ? (
        <ConsoleSkeleton cards={4} />
      ) : error ? (
        <ConsoleStatusCard eyebrow="Error" title="Couldn’t load admin" role="alert">
          <p>{error}</p>
        </ConsoleStatusCard>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Locations", value: summary?.tenantCount ?? 0 },
              { label: "Open feedback", value: summary?.openFeedback ?? 0 },
              { label: "Menu scans (7d)", value: summary?.menuScans7d ?? 0 },
              { label: "Active Wi‑Fi nets", value: summary?.activeWifiNetworks ?? 0 },
            ].map((card) => (
              <div key={card.label} className="rounded-3xl border border-hairline bg-surface p-5">
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">
                  {card.label}
                </p>
                <p className="mt-3 font-display text-[32px] font-semibold tracking-[-0.02em]">
                  {card.value}
                </p>
              </div>
            ))}
          </section>

          <section className="mt-8 rounded-3xl border border-hairline bg-surface p-6 sm:p-8">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-tap">Locations</p>
            <h2 className="mt-2 font-display text-[22px] font-semibold tracking-[-0.02em]">
              Your locations
            </h2>
            <p className="mt-2 text-[14px] leading-[1.7] text-ink-muted">
              Open the same guest surfaces customers see, or jump to the live dashboard demo.
            </p>

            {overview?.tenants?.length ? (
              <ul className="mt-6 divide-y divide-hairline">
                {overview.tenants.map((tenant) => (
                  <li
                    key={tenant.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-4"
                  >
                    <div>
                      <p className="font-semibold text-ink">{tenant.name}</p>
                      <p className="mt-1 font-mono text-[12px] text-ink-faint">
                        {tenant.slug}
                        {tenant.status ? ` · ${tenant.status}` : ""}
                        {tenant.plan ? ` · ${tenant.plan}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3 text-[13px]">
                      {TENANT_LINKS.map((link) => (
                        <Link
                          key={link.label}
                          className="font-medium text-tap hover:text-ink"
                          to={link.path(tenant.slug)}
                        >
                          {link.label}
                        </Link>
                      ))}
                      {String(tenant.slug).toLowerCase() === "demo" ? (
                        <Link className="font-medium text-tap hover:text-ink" to="/demo">
                          Guest hub
                        </Link>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-6 rounded-2xl border border-hairline bg-porcelain px-5 py-6">
                <p className="font-medium text-ink">No locations yet</p>
                <p className="mt-2 text-[14px] leading-[1.7] text-ink-muted">
                  This account isn’t linked to a café. You can still walk Demo Café as a guest.
                </p>
                <Link
                  to="/demo"
                  className="btn-primary mt-4 inline-flex rounded-xl px-4 py-2.5 text-[13px] font-semibold"
                >
                  Open Demo Café
                </Link>
              </div>
            )}
          </section>
        </>
      )}
    </ConsoleChrome>
  );
}
