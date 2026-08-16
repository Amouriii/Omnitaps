/**
 * TASK-5.2 — Enterprise Wi-Fi subscription plan management.
 *
 * Assumptions:
 * 1. Plans CRUD via `/api/v1/admin/wifi/settings` (POST create, PATCH update_plan,
 *    DELETE soft-deactivate).
 * 2. Editing/deactivating plans does not rewrite active wifi_sessions.
 */

"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  PlanCardEditor,
  emptyPlanValues,
  type PlanEditorValues,
} from "../../../../../components/wifi/dashboard/PlanCardEditor";

interface PlanRecord {
  id: string;
  enterpriseId: string;
  name: string;
  description: string | null;
  stripePriceId: string | null;
  priceCents: number;
  currency: string;
  interval: string;
  quotaMb: number | null;
  durationMinutes: number | null;
  downloadKbps: number;
  uploadKbps: number;
  sortOrder: number;
  isActive: boolean;
}

function readQuery() {
  if (typeof window === "undefined") {
    return {
      enterpriseId: null as string | null,
      enterpriseSlug: null as string | null,
      accessToken: null as string | null,
    };
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

function toEditor(plan: PlanRecord): PlanEditorValues {
  const interval = ["session", "hourly", "daily", "monthly"].includes(plan.interval)
    ? (plan.interval as PlanEditorValues["interval"])
    : "session";
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description || "",
    priceCents: plan.priceCents,
    currency: plan.currency,
    interval,
    quotaMb: plan.quotaMb,
    durationMinutes: plan.durationMinutes,
    downloadKbps: plan.downloadKbps,
    uploadKbps: plan.uploadKbps,
    sortOrder: plan.sortOrder,
    stripePriceId: plan.stripePriceId || "",
    isActive: plan.isActive,
  };
}

function formatPrice(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  } catch {
    return `${currency.toUpperCase()} ${(cents / 100).toFixed(2)}`;
  }
}

export default function EnterpriseWifiPlansPage() {
  const initial = useMemo(() => readQuery(), []);
  const [enterpriseId, setEnterpriseId] = useState<string | null>(initial.enterpriseId);
  const [enterpriseName, setEnterpriseName] = useState("");
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [role, setRole] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<PlanEditorValues>(() => emptyPlanValues());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<PlanEditorValues | null>(null);

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

    const response = await fetch(`/api/v1/admin/wifi/settings?${enterpriseQuery}`, {
      headers: { accept: "application/json", authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const body = (await response.json()) as {
      ok: boolean;
      error?: string;
      role?: string;
      enterprise?: { id: string; name: string };
      plans?: PlanRecord[];
    };
    if (!response.ok || !body.ok || !body.enterprise) {
      throw new Error(body.error || `Failed to load plans (${response.status})`);
    }
    setEnterpriseId(body.enterprise.id);
    setEnterpriseName(body.enterprise.name);
    setPlans(body.plans || []);
    setRole(body.role || "");
    setError("");
    setDraft(emptyPlanValues((body.plans || []).length));
  }, [enterpriseQuery, initial.accessToken, initial.enterpriseId, initial.enterpriseSlug]);

  useEffect(() => {
    void load().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Unable to load plans.");
    });
  }, [load]);

  const canWrite = role === "owner" || role === "admin";

  const createPlan = async (values: PlanEditorValues) => {
    const token = resolveAccessToken(initial.accessToken);
    if (!token || !enterpriseId) return;
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/v1/admin/wifi/settings", {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          enterprise_id: enterpriseId,
          name: values.name,
          description: values.description || null,
          priceCents: values.priceCents,
          currency: values.currency,
          interval: values.interval,
          quotaMb: values.quotaMb,
          durationMinutes: values.durationMinutes,
          downloadKbps: values.downloadKbps,
          uploadKbps: values.uploadKbps,
          sortOrder: values.sortOrder,
          stripePriceId: values.stripePriceId || null,
          isActive: values.isActive,
        }),
      });
      const body = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !body.ok) {
        throw new Error(body.error || `Create failed (${response.status})`);
      }
      setCreating(false);
      setNotice("Plan created. Active sessions unchanged.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed.");
    } finally {
      setBusy(false);
    }
  };

  const savePlan = async (values: PlanEditorValues) => {
    const token = resolveAccessToken(initial.accessToken);
    if (!token || !enterpriseId || !values.id) return;
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
          action: "update_plan",
          enterprise_id: enterpriseId,
          plan_id: values.id,
          name: values.name,
          description: values.description || null,
          priceCents: values.priceCents,
          currency: values.currency,
          interval: values.interval,
          quotaMb: values.quotaMb,
          durationMinutes: values.durationMinutes,
          downloadKbps: values.downloadKbps,
          uploadKbps: values.uploadKbps,
          sortOrder: values.sortOrder,
          stripePriceId: values.stripePriceId || null,
          isActive: values.isActive,
        }),
      });
      const body = (await response.json()) as { ok: boolean; error?: string; note?: string };
      if (!response.ok || !body.ok) {
        throw new Error(body.error || `Update failed (${response.status})`);
      }
      setEditingId(null);
      setEditDraft(null);
      setNotice(body.note || "Plan updated. Active sessions unchanged.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setBusy(false);
    }
  };

  const deactivatePlan = async (values: PlanEditorValues) => {
    const token = resolveAccessToken(initial.accessToken);
    if (!token || !enterpriseId || !values.id) return;
    setBusy(true);
    try {
      const q = new URLSearchParams({
        enterprise_id: enterpriseId,
        plan_id: values.id,
      });
      const response = await fetch(`/api/v1/admin/wifi/settings?${q}`, {
        method: "DELETE",
        headers: { accept: "application/json", authorization: `Bearer ${token}` },
      });
      const body = (await response.json()) as { ok: boolean; error?: string; note?: string };
      if (!response.ok || !body.ok) {
        throw new Error(body.error || `Deactivate failed (${response.status})`);
      }
      setEditingId(null);
      setEditDraft(null);
      setNotice(body.note || "Plan deactivated.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deactivate failed.");
    } finally {
      setBusy(false);
    }
  };

  const q = windowQuery(initial);

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "linear-gradient(180deg, #eaf0fe 0%, #faf9f7 28%, #faf9f7 100%)",
        fontFamily: 'var(--font-body, "Instrument Sans", system-ui, sans-serif)',
        color: "#12151a",
      }}
    >
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "28px 20px 48px", display: "grid", gap: 16 }}>
        <header>
          <p style={{ margin: 0, fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: "#9a9fa8", fontWeight: 600 }}>
            Enterprise Wi‑Fi
          </p>
          <h1 style={{ margin: "8px 0 0", fontSize: "clamp(1.6rem, 4vw, 2rem)", fontWeight: 650, letterSpacing: "-0.02em" }}>
            {enterpriseName || "Subscription plans"}
          </h1>
          <p style={{ margin: "8px 0 0", color: "#5c6470", fontSize: 14 }}>
            Paid tiers for captive portal upgrades
          </p>
          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a href={`/enterprise/wifi${q}`} style={linkStyle}>Dashboard</a>
            <a href={`/enterprise/wifi/settings${q}`} style={linkStyle}>Settings</a>
          </div>
        </header>

        {error ? (
          <div style={{ background: "#fff5f5", border: "1px solid #f3d4d4", borderRadius: 12, padding: 14, color: "#c24141" }}>
            {error}
          </div>
        ) : null}

        {notice ? (
          <div style={{ background: "#eaf0fe", borderRadius: 12, padding: 12, color: "#0e3fb0", fontSize: 13 }}>
            {notice}
          </div>
        ) : null}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 650 }}>Plans ({plans.length})</h2>
          {canWrite ? (
            <button
              type="button"
              onClick={() => {
                setCreating(true);
                setEditingId(null);
                setEditDraft(null);
                setDraft(emptyPlanValues(plans.length));
              }}
              style={primaryBtn}
            >
              New plan
            </button>
          ) : null}
        </div>

        {creating ? (
          <PlanCardEditor
            mode="create"
            values={draft}
            onChange={setDraft}
            onSubmit={createPlan}
            onCancel={() => setCreating(false)}
            busy={busy}
          />
        ) : null}

        <div style={{ display: "grid", gap: 12 }}>
          {plans.map((plan) =>
            editingId === plan.id && editDraft ? (
              <PlanCardEditor
                key={plan.id}
                mode="edit"
                values={editDraft}
                onChange={setEditDraft}
                onSubmit={savePlan}
                onCancel={() => {
                  setEditingId(null);
                  setEditDraft(null);
                }}
                onDeactivate={deactivatePlan}
                busy={busy}
              />
            ) : (
              <article
                key={plan.id}
                style={{
                  background: "#fff",
                  border: "1px solid #e7e4dd",
                  borderRadius: 16,
                  padding: 16,
                  display: "grid",
                  gap: 8,
                  opacity: plan.isActive ? 1 : 0.65,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 650 }}>{plan.name}</h3>
                    <p style={{ margin: "4px 0 0", color: "#5c6470", fontSize: 13 }}>
                      {plan.description || "No description"}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: 'var(--font-mono, "IBM Plex Mono", monospace)', fontWeight: 600 }}>
                      {formatPrice(plan.priceCents, plan.currency)}
                    </div>
                    <div style={{ fontSize: 12, color: plan.isActive ? "#155eef" : "#c24141" }}>
                      {plan.isActive ? "Active" : "Inactive"} · {plan.interval}
                    </div>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: "#9a9fa8", fontFamily: 'var(--font-mono, "IBM Plex Mono", monospace)' }}>
                  {plan.quotaMb == null ? "∞ MB" : `${plan.quotaMb} MB`} ·{" "}
                  {plan.durationMinutes == null ? "∞ min" : `${plan.durationMinutes} min`} · ↓
                  {plan.downloadKbps}/{plan.uploadKbps}↑ kbps
                </p>
                {canWrite ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCreating(false);
                      setEditingId(plan.id);
                      setEditDraft(toEditor(plan));
                    }}
                    style={secondaryBtn}
                  >
                    Edit
                  </button>
                ) : null}
              </article>
            ),
          )}
          {plans.length === 0 && !creating ? (
            <p style={{ color: "#5c6470", fontSize: 14 }}>No plans yet. Create a paid tier for guest upgrades.</p>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function windowQuery(initial: {
  enterpriseId: string | null;
  enterpriseSlug: string | null;
  accessToken: string | null;
}) {
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

const primaryBtn: CSSProperties = {
  appearance: "none",
  border: "none",
  borderRadius: 999,
  background: "#155eef",
  color: "#fff",
  fontWeight: 600,
  fontSize: 13,
  padding: "8px 14px",
  cursor: "pointer",
};

const secondaryBtn: CSSProperties = {
  appearance: "none",
  justifySelf: "start",
  border: "1px solid #e7e4dd",
  borderRadius: 999,
  background: "#fff",
  color: "#12151a",
  fontWeight: 600,
  fontSize: 13,
  padding: "8px 14px",
  cursor: "pointer",
};
