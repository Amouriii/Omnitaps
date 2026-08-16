/**
 * Owner insights — read-only monitor for the Demo Café owner console.
 *
 * Renders three panels backed by `/api/v1/admin/insights`:
 *   - Wi‑Fi connections (active captive sessions)
 *   - Payments (live Stripe checkout sessions + collected charges)
 *   - Orders (Wi‑Fi plan subscriptions + QR menu scans)
 *
 * Auth token comes from the active Supabase session (the user is already
 * signed in to reach /demo/dashboard).
 */

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";

interface ConnectionRow {
  sessionId: string;
  macAddress: string;
  planName: string | null;
  startedAt: string;
}

interface CheckoutRow {
  id: string;
  amountTotalCents: number;
  currency: string;
  paymentStatus: string;
  email: string | null;
  createdAt: string;
}

interface SubscriptionRow {
  sessionId: string;
  planName: string;
  priceCents: number;
  currency: string;
  startedAt: string;
}

interface ScanRow {
  id: string;
  eventType: string;
  scannedAt: string;
  landingPath: string | null;
}

interface InsightsData {
  ok: true;
  enterprise: { id: string; slug: string; name: string };
  wifi: {
    activeSessions: number;
    activeDevices: number;
    totalDevices: number;
    connections: ConnectionRow[];
  };
  payments: {
    collectedCents: number;
    chargesCount: number;
    currency: string;
    note: string | null;
    recent: CheckoutRow[];
  };
  orders: {
    subscriptions: SubscriptionRow[];
    menuScans: { total: number; recent: ScanRow[] };
  };
}

type Phase = "loading" | "ready" | "error";

function formatMoney(cents: number, currency: string): string {
  const amount = Math.max(0, cents) / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.toUpperCase(),
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency.toUpperCase()} ${amount.toFixed(2)}`;
  }
}

function formatWhen(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Panel({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-hairline bg-surface p-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">{eyebrow}</p>
      <h3 className="mt-1 font-display text-lg font-semibold tracking-[-0.02em] text-ink">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function EmptyRow({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl bg-porcelain px-4 py-3 text-[13px] text-ink-muted">{children}</p>;
}

function StatusPill({ status }: { status: string }) {
  const paid = status === "paid";
  const open = status === "open" || status === "unpaid";
  const tone = paid
    ? "bg-tap-soft text-tap"
    : open
      ? "bg-brass-soft text-brass-dark"
      : "bg-porcelain text-ink-faint";
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em] ${tone}`}
    >
      {status}
    </span>
  );
}

export default function OwnerInsights({ enterpriseId }: { enterpriseId: string }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [data, setData] = useState<InsightsData | null>(null);

  const load = useCallback(async () => {
    setPhase("loading");
    try {
      const supabase = getSupabaseClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setPhase("error");
        setErrorMessage("Sign in required to load insights.");
        return;
      }

      const url = new URL("/api/v1/admin/insights", window.location.origin);
      url.searchParams.set("enterprise_id", enterpriseId);

      const response = await fetch(url.toString(), {
        headers: { accept: "application/json", authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const body = (await response.json()) as InsightsData | { ok: false; error?: string };
      if (!response.ok || !("ok" in body) || body.ok !== true) {
        throw new Error(
          ("error" in body && body.error) || `Insights failed (${response.status})`,
        );
      }
      setData(body as InsightsData);
      setErrorMessage("");
      setPhase("ready");
    } catch (error) {
      setPhase("error");
      setErrorMessage(error instanceof Error ? error.message : "Unable to load insights.");
    }
  }, [enterpriseId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (phase === "error") {
    return (
      <div className="rounded-3xl border border-hairline bg-surface p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">
          {errorMessage}
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-4 rounded-xl border border-hairline bg-porcelain px-4 py-2 text-[13px] font-semibold hover:border-hairline-strong"
        >
          Retry
        </button>
      </div>
    );
  }

  const wifi = data?.wifi;
  const payments = data?.payments;
  const orders = data?.orders;

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Online now", value: wifi ? String(wifi.activeSessions) : "—", hint: wifi ? `${wifi.activeDevices} devices` : undefined },
          { label: "Subscriptions", value: orders ? String(orders.subscriptions.length) : "—", hint: "Paid Wi‑Fi plans" },
          { label: "Payments", value: payments ? formatMoney(payments.collectedCents, payments.currency) : "—", hint: payments ? `${payments.chargesCount} charges` : undefined },
          { label: "Menu scans", value: orders ? String(orders.menuScans.total) : "—", hint: "All time" },
        ].map((card) => (
          <div key={card.label} className="rounded-3xl border border-hairline bg-surface p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">{card.label}</p>
            <p className="mt-3 font-display text-[26px] font-semibold tracking-[-0.02em]">{card.value}</p>
            {card.hint ? <p className="mt-1 text-[12px] text-ink-muted">{card.hint}</p> : null}
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel eyebrow="Network" title="Wi‑Fi connections">
          {phase === "loading" ? (
            <EmptyRow>Loading connections…</EmptyRow>
          ) : wifi && wifi.connections.length > 0 ? (
            <ul className="divide-y divide-hairline">
              {wifi.connections.map((c) => (
                <li key={c.sessionId} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-mono text-[12px] text-ink">{c.macAddress || "unknown"}</p>
                    <p className="mt-0.5 text-[12px] text-ink-muted">{c.planName ?? "Free session"}</p>
                  </div>
                  <span className="shrink-0 text-[12px] text-ink-faint">{formatWhen(c.startedAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyRow>No active connections.</EmptyRow>
          )}
        </Panel>

        <Panel eyebrow="Stripe" title="Payments">
          {phase === "loading" ? (
            <EmptyRow>Loading payments…</EmptyRow>
          ) : payments && payments.recent.length > 0 ? (
            <ul className="divide-y divide-hairline">
              {payments.recent.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-ink">
                      {formatMoney(p.amountTotalCents, p.currency)}
                    </p>
                    <p className="mt-0.5 truncate text-[12px] text-ink-muted">{p.email ?? "Guest"}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <StatusPill status={p.paymentStatus} />
                    <span className="text-[11px] text-ink-faint">{formatWhen(p.createdAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyRow>
              {payments?.note ? payments.note : "No Stripe checkouts yet."}
            </EmptyRow>
          )}
        </Panel>

        <Panel eyebrow="Activity" title="Orders">
          {phase === "loading" ? (
            <EmptyRow>Loading orders…</EmptyRow>
          ) : (
            <div className="grid gap-5">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
                  Wi‑Fi subscriptions
                </p>
                {orders && orders.subscriptions.length > 0 ? (
                  <ul className="mt-2 divide-y divide-hairline">
                    {orders.subscriptions.map((s) => (
                      <li key={s.sessionId} className="flex items-center justify-between gap-3 py-2.5">
                        <div>
                          <p className="text-[13px] font-medium text-ink">{s.planName}</p>
                          <p className="text-[12px] text-ink-muted">{formatWhen(s.startedAt)}</p>
                        </div>
                        <span className="text-[13px] font-semibold text-ink">
                          {formatMoney(s.priceCents, s.currency)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyRow>No plan purchases yet.</EmptyRow>
                )}
              </div>

              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
                  Menu scans
                </p>
                {orders && orders.menuScans.recent.length > 0 ? (
                  <ul className="mt-2 divide-y divide-hairline">
                    {orders.menuScans.recent.map((s) => (
                      <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                        <div>
                          <p className="text-[13px] font-medium text-ink">
                            {s.eventType === "SCAN" ? "QR scan" : s.eventType.toLowerCase()}
                          </p>
                          <p className="truncate text-[12px] text-ink-muted">{s.landingPath ?? "Menu"}</p>
                        </div>
                        <span className="shrink-0 text-[12px] text-ink-faint">{formatWhen(s.scannedAt)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyRow>No menu scans yet.</EmptyRow>
                )}
              </div>
            </div>
          )}
        </Panel>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-xl border border-hairline bg-surface px-4 py-2 text-[13px] font-semibold hover:border-hairline-strong"
        >
          Refresh
        </button>
      </div>
    </div>
  );
}
