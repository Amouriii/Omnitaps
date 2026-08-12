/**
 * TASK-5.1 — Enterprise Wi-Fi dashboard overview.
 *
 * Assumptions:
 * 1. Path matches task: `app/(dashboard)/enterprise/wifi/page.tsx`.
 * 2. No `next` / Tremor packages — portable client page using fetch + SVG chart.
 * 3. Auth token from `localStorage.omnitaps_access_token` or
 *    `sessionStorage.supabase.auth.token` fallback; also accepts `?access_token=`.
 * 4. Telemetry from `/api/v1/admin/wifi/telemetry` with Bearer token.
 * 5. Enterprise selected via `?enterprise_id=` / `?enterprise_slug=` / `?slug=`.
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActiveUsersTable,
  type ActiveUserRow,
} from "../../../../components/wifi/dashboard/ActiveUsersTable";
import {
  BandwidthChart,
  type BandwidthPoint,
} from "../../../../components/wifi/dashboard/BandwidthChart";

interface TelemetrySuccess {
  ok: true;
  enterprise: { id: string; slug: string; name: string };
  window: { from: string; to: string; hours: number };
  metrics: {
    activeSessions: number;
    activeDevices: number;
    totalDevices: number;
    bytesIn: number;
    bytesOut: number;
    bytesTotal: number;
    avgDownloadKbps: number;
    avgUploadKbps: number;
    revenueCents: number;
    currency: string;
    paidSessions: number;
  };
  activeUsers: ActiveUserRow[];
  bandwidth: BandwidthPoint[];
}

interface TelemetryFailure {
  ok: false;
  error?: string;
  code?: string;
}

type Phase = "booting" | "ready" | "error";

function readQuery(): {
  enterpriseId: string | null;
  enterpriseSlug: string | null;
  hours: number;
  accessToken: string | null;
} {
  if (typeof window === "undefined") {
    return { enterpriseId: null, enterpriseSlug: null, hours: 24, accessToken: null };
  }
  const q = new URLSearchParams(window.location.search);
  const hoursRaw = Number(q.get("hours") || "24");
  return {
    enterpriseId: (q.get("enterprise_id") || "").trim() || null,
    enterpriseSlug: (q.get("enterprise_slug") || q.get("slug") || "").trim() || null,
    hours: Number.isFinite(hoursRaw) ? Math.min(168, Math.max(1, Math.floor(hoursRaw))) : 24,
    accessToken: (q.get("access_token") || "").trim() || null,
  };
}

function resolveAccessToken(queryToken: string | null): string | null {
  if (queryToken) return queryToken;
  if (typeof window === "undefined") return null;
  const direct =
    window.localStorage.getItem("omnitaps_access_token") ||
    window.sessionStorage.getItem("omnitaps_access_token");
  if (direct?.trim()) return direct.trim();

  // Supabase JS often persists a JSON session blob.
  for (const store of [window.localStorage, window.sessionStorage]) {
    for (let i = 0; i < store.length; i += 1) {
      const key = store.key(i);
      if (!key) continue;
      if (!key.includes("auth-token") && !key.includes("supabase")) continue;
      try {
        const raw = store.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw) as {
          access_token?: string;
          currentSession?: { access_token?: string };
        };
        const token = parsed.access_token || parsed.currentSession?.access_token;
        if (token) return token;
      } catch {
        // ignore
      }
    }
  }
  return null;
}

function formatBytes(bytes: number): string {
  const safe = Math.max(0, bytes);
  if (safe >= 1024 ** 3) return `${(safe / 1024 ** 3).toFixed(2)} GB`;
  if (safe >= 1024 ** 2) return `${(safe / 1024 ** 2).toFixed(1)} MB`;
  if (safe >= 1024) return `${Math.round(safe / 1024)} KB`;
  return `${safe} B`;
}

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

function MetricCard(props: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e7e4dd",
        borderRadius: 16,
        padding: "16px 16px 14px",
        minHeight: 96,
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 11,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#9a9fa8",
          fontWeight: 650,
        }}
      >
        {props.label}
      </p>
      <p
        style={{
          margin: "10px 0 0",
          fontSize: "clamp(1.35rem, 3vw, 1.7rem)",
          fontWeight: 650,
          letterSpacing: "-0.02em",
          color: "#12151a",
          fontFamily: 'var(--font-mono, "IBM Plex Mono", monospace)',
        }}
      >
        {props.value}
      </p>
      {props.hint ? (
        <p style={{ margin: "6px 0 0", fontSize: 12, color: "#5c6470" }}>{props.hint}</p>
      ) : null}
    </div>
  );
}

export default function EnterpriseWifiDashboardPage() {
  const initial = useMemo(() => readQuery(), []);
  const [hours, setHours] = useState(initial.hours);
  const [phase, setPhase] = useState<Phase>("booting");
  const [errorMessage, setErrorMessage] = useState("");
  const [data, setData] = useState<TelemetrySuccess | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const token = resolveAccessToken(initial.accessToken);
    if (!token) {
      setPhase("error");
      setErrorMessage(
        "Sign in required. Provide a Supabase access token (localStorage omnitaps_access_token or ?access_token=).",
      );
      return;
    }

    const url = new URL("/api/v1/admin/wifi/telemetry", window.location.origin);
    url.searchParams.set("hours", String(hours));
    if (initial.enterpriseId) url.searchParams.set("enterprise_id", initial.enterpriseId);
    if (initial.enterpriseSlug) {
      url.searchParams.set("enterprise_slug", initial.enterpriseSlug);
    }

    setRefreshing(true);
    try {
      const response = await fetch(url.toString(), {
        headers: {
          accept: "application/json",
          authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });
      const body = (await response.json()) as TelemetrySuccess | TelemetryFailure;
      if (!response.ok || !body || body.ok !== true) {
        const fail = body as TelemetryFailure;
        throw new Error(fail.error || `Telemetry failed (${response.status})`);
      }
      setData(body);
      setPhase("ready");
      setErrorMessage("");
    } catch (error) {
      setPhase("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load Wi‑Fi telemetry.",
      );
    } finally {
      setRefreshing(false);
    }
  }, [hours, initial.accessToken, initial.enterpriseId, initial.enterpriseSlug]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      void load();
    }, 15_000);
    return () => clearInterval(timer);
  }, [load]);

  const metrics = data?.metrics;

  return (
    <main
      style={{
        minHeight: "100dvh",
        margin: 0,
        background:
          "linear-gradient(180deg, #f3efe6 0%, #faf9f7 28%, #faf9f7 100%)",
        color: "#12151a",
        fontFamily: 'var(--font-body, "Instrument Sans", system-ui, sans-serif)',
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "28px 20px 48px",
          display: "grid",
          gap: 18,
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            alignItems: "flex-end",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: 12,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#9a9fa8",
                fontWeight: 600,
              }}
            >
              Enterprise Wi‑Fi
            </p>
            <h1
              style={{
                margin: "8px 0 0",
                fontSize: "clamp(1.75rem, 4vw, 2.25rem)",
                letterSpacing: "-0.02em",
                fontWeight: 650,
              }}
            >
              {data?.enterprise.name || "Telemetry"}
            </h1>
            <p style={{ margin: "8px 0 0", color: "#5c6470", fontSize: 14 }}>
              Live captive-portal metrics
              {data ? ` · last ${data.window.hours}h` : ""}
              {refreshing ? " · refreshing" : ""}
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {[24, 72, 168].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setHours(value)}
                style={{
                  appearance: "none",
                  border: hours === value ? "1px solid #155eef" : "1px solid #e7e4dd",
                  background: hours === value ? "#eaf0fe" : "#fff",
                  color: hours === value ? "#0e3fb0" : "#12151a",
                  borderRadius: 999,
                  padding: "8px 12px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {value === 24 ? "24h" : value === 72 ? "3d" : "7d"}
              </button>
            ))}
            <button
              type="button"
              onClick={() => void load()}
              style={{
                appearance: "none",
                border: "none",
                background: "#155eef",
                color: "#fff",
                borderRadius: 999,
                padding: "8px 14px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Refresh
            </button>
          </div>
        </header>

        {phase === "error" ? (
          <div
            style={{
              background: "#fff5f5",
              border: "1px solid #f3d4d4",
              borderRadius: 14,
              padding: 16,
              color: "#c24141",
            }}
          >
            {errorMessage}
          </div>
        ) : null}

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
          }}
        >
          <MetricCard
            label="Active sessions"
            value={String(metrics?.activeSessions ?? "—")}
            hint={`${metrics?.activeDevices ?? 0} devices online`}
          />
          <MetricCard
            label="Data consumed"
            value={metrics ? formatBytes(metrics.bytesTotal) : "—"}
            hint={
              metrics
                ? `↓ ${formatBytes(metrics.bytesIn)} · ↑ ${formatBytes(metrics.bytesOut)}`
                : undefined
            }
          />
          <MetricCard
            label="Avg speed"
            value={
              metrics
                ? `${Math.round(metrics.avgDownloadKbps)}/${Math.round(metrics.avgUploadKbps)}`
                : "—"
            }
            hint="Download / upload kbps"
          />
          <MetricCard
            label="Revenue"
            value={
              metrics ? formatMoney(metrics.revenueCents, metrics.currency) : "—"
            }
            hint={metrics ? `${metrics.paidSessions} paid upgrades` : undefined}
          />
        </section>

        <BandwidthChart
          points={data?.bandwidth ?? []}
          loading={phase === "booting" || refreshing}
        />

        <ActiveUsersTable
          rows={data?.activeUsers ?? []}
          loading={phase === "booting" || refreshing}
        />
      </div>
    </main>
  );
}
