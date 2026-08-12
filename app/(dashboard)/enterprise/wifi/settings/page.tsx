/**
 * TASK-5.2 — Enterprise Wi-Fi free-tier policy settings.
 *
 * Assumptions:
 * 1. Auth token via localStorage `omnitaps_access_token` or `?access_token=`.
 * 2. PATCH `/api/v1/admin/wifi/settings` updates enterprise defaults only —
 *    active sessions are intentionally left unchanged.
 */

"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  QuotaConfigForm,
  type QuotaPolicyValues,
} from "../../../../../components/wifi/dashboard/QuotaConfigForm";

interface EnterprisePolicy {
  id: string;
  name: string;
  slug: string;
  freeQuotaMb: number;
  freeSessionMinutes: number;
  defaultDownloadKbps: number;
  defaultUploadKbps: number;
  radiusCoaHost: string | null;
  radiusCoaPort: number;
  isActive: boolean;
}

function readQuery() {
  if (typeof window === "undefined") {
    return { enterpriseId: null as string | null, enterpriseSlug: null as string | null, accessToken: null as string | null };
  }
  const q = new URLSearchParams(window.location.search);
  return {
    enterpriseId: (q.get("enterprise_id") || "").trim() || null,
    enterpriseSlug: (q.get("enterprise_slug") || q.get("slug") || "").trim() || null,
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
  for (const store of [window.localStorage, window.sessionStorage]) {
    for (let i = 0; i < store.length; i += 1) {
      const key = store.key(i);
      if (!key || (!key.includes("auth-token") && !key.includes("supabase"))) continue;
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

export default function EnterpriseWifiSettingsPage() {
  const initial = useMemo(() => readQuery(), []);
  const [enterprise, setEnterprise] = useState<EnterprisePolicy | null>(null);
  const [values, setValues] = useState<QuotaPolicyValues | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [role, setRole] = useState<string>("");

  const enterpriseQuery = useMemo(() => {
    const url = new URLSearchParams();
    if (initial.enterpriseId) url.set("enterprise_id", initial.enterpriseId);
    if (initial.enterpriseSlug) url.set("enterprise_slug", initial.enterpriseSlug);
    return url;
  }, [initial.enterpriseId, initial.enterpriseSlug]);

  const load = useCallback(async () => {
    const token = resolveAccessToken(initial.accessToken);
    if (!token) {
      setError("Sign in required (omnitaps_access_token or ?access_token=).");
      return;
    }
    if (!initial.enterpriseId && !initial.enterpriseSlug) {
      setError("Provide enterprise_id or enterprise_slug.");
      return;
    }

    const response = await fetch(`/api/v1/admin/wifi/settings?${enterpriseQuery}`, {
      headers: { accept: "application/json", authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const body = (await response.json()) as {
      ok: boolean;
      error?: string;
      role?: string;
      enterprise?: EnterprisePolicy;
    };
    if (!response.ok || !body.ok || !body.enterprise) {
      throw new Error(body.error || `Failed to load settings (${response.status})`);
    }
    setEnterprise(body.enterprise);
    setRole(body.role || "");
    setValues({
      freeQuotaMb: body.enterprise.freeQuotaMb,
      freeSessionMinutes: body.enterprise.freeSessionMinutes,
      defaultDownloadKbps: body.enterprise.defaultDownloadKbps,
      defaultUploadKbps: body.enterprise.defaultUploadKbps,
      radiusCoaHost: body.enterprise.radiusCoaHost || "",
      radiusCoaPort: body.enterprise.radiusCoaPort || 3799,
    });
    setError("");
  }, [enterpriseQuery, initial.accessToken, initial.enterpriseId, initial.enterpriseSlug]);

  useEffect(() => {
    void load().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Unable to load settings.");
    });
  }, [load]);

  const save = async (next: QuotaPolicyValues) => {
    const token = resolveAccessToken(initial.accessToken);
    if (!token || !enterprise) return;
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/v1/admin/wifi/settings", {
        method: "PATCH",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          enterprise_id: enterprise.id,
          freeQuotaMb: next.freeQuotaMb,
          freeSessionMinutes: next.freeSessionMinutes,
          defaultDownloadKbps: next.defaultDownloadKbps,
          defaultUploadKbps: next.defaultUploadKbps,
          radiusCoaHost: next.radiusCoaHost || null,
          radiusCoaPort: next.radiusCoaPort,
        }),
      });
      const body = (await response.json()) as {
        ok: boolean;
        error?: string;
        note?: string;
        enterprise?: EnterprisePolicy;
      };
      if (!response.ok || !body.ok || !body.enterprise) {
        throw new Error(body.error || `Save failed (${response.status})`);
      }
      setEnterprise(body.enterprise);
      setValues({
        freeQuotaMb: body.enterprise.freeQuotaMb,
        freeSessionMinutes: body.enterprise.freeSessionMinutes,
        defaultDownloadKbps: body.enterprise.defaultDownloadKbps,
        defaultUploadKbps: body.enterprise.defaultUploadKbps,
        radiusCoaHost: body.enterprise.radiusCoaHost || "",
        radiusCoaPort: body.enterprise.radiusCoaPort || 3799,
      });
      setNotice(body.note || "Policy saved. Active sessions unchanged.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  const canWrite = role === "owner" || role === "admin";

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "linear-gradient(180deg, #f3efe6 0%, #faf9f7 30%, #faf9f7 100%)",
        fontFamily: 'var(--font-body, "Instrument Sans", system-ui, sans-serif)',
        color: "#12151a",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "28px 20px 48px", display: "grid", gap: 16 }}>
        <header>
          <p style={{ margin: 0, fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: "#9a9fa8", fontWeight: 600 }}>
            Enterprise Wi‑Fi
          </p>
          <h1 style={{ margin: "8px 0 0", fontSize: "clamp(1.6rem, 4vw, 2rem)", fontWeight: 650, letterSpacing: "-0.02em" }}>
            {enterprise?.name || "Policy settings"}
          </h1>
          <p style={{ margin: "8px 0 0", color: "#5c6470", fontSize: 14 }}>
            Free guest defaults · {canWrite ? `editing as ${role}` : role ? `view-only (${role})` : "loading"}
          </p>
          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a href={`/enterprise/wifi${windowQuery(initial)}`} style={linkStyle}>Dashboard</a>
            <a href={`/enterprise/wifi/plans${windowQuery(initial)}`} style={linkStyle}>Plans</a>
          </div>
        </header>

        {error ? (
          <div style={{ background: "#fff5f5", border: "1px solid #f3d4d4", borderRadius: 12, padding: 14, color: "#c24141" }}>
            {error}
          </div>
        ) : null}

        {values ? (
          <QuotaConfigForm
            values={values}
            onChange={setValues}
            onSubmit={save}
            busy={busy}
            disabled={!canWrite}
            notice={notice}
          />
        ) : !error ? (
          <p style={{ color: "#5c6470" }}>Loading policy…</p>
        ) : null}
      </div>
    </main>
  );
}

function windowQuery(initial: { enterpriseId: string | null; enterpriseSlug: string | null; accessToken: string | null }) {
  const q = new URLSearchParams();
  if (initial.enterpriseId) q.set("enterprise_id", initial.enterpriseId);
  if (initial.enterpriseSlug) q.set("enterprise_slug", initial.enterpriseSlug);
  if (initial.accessToken) q.set("access_token", initial.accessToken);
  const s = q.toString();
  return s ? `?${s}` : "";
}

const linkStyle: CSSProperties = {
  color: "#155eef",
  fontWeight: 600,
  fontSize: 13,
  textDecoration: "none",
};
