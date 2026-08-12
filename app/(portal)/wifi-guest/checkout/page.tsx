/**
 * TASK-4.2 — Tier upgrade / Stripe Checkout handoff.
 *
 * Assumptions:
 * 1. Query: session_id + enterprise_id|enterprise_slug.
 * 2. Plans from GET `/api/v1/captive/checkout?enterprise_id=…` (service-role catalog).
 * 3. Selecting a tier POSTs to `/api/v1/captive/checkout` and redirects to Stripe `url`.
 * 4. After payment, Stripe webhook upgrades session + fires RADIUS CoA; guest returns via
 *    success_url (defaults to session monitor with `upgraded=1`).
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  SubscriptionTierCard,
  type SubscriptionTierPlan,
} from "../../../../components/wifi/portal/SubscriptionTierCard";

interface PlanCatalogSuccess {
  ok: true;
  mode: "plan_catalog";
  enterpriseId: string;
  plans: SubscriptionTierPlan[];
}

interface CheckoutCreateSuccess {
  ok: true;
  mode: "checkout_create";
  checkoutSessionId: string;
  url: string;
}

interface ApiFailure {
  ok: false;
  error?: string;
  code?: string;
}

type Phase = "loading" | "ready" | "redirecting" | "error";

function readQuery(): {
  sessionId: string | null;
  enterpriseId: string | null;
  enterpriseSlug: string | null;
  canceled: boolean;
  upgraded: boolean;
} {
  if (typeof window === "undefined") {
    return {
      sessionId: null,
      enterpriseId: null,
      enterpriseSlug: null,
      canceled: false,
      upgraded: false,
    };
  }
  const q = new URLSearchParams(window.location.search);
  return {
    sessionId: (q.get("session_id") || "").trim() || null,
    enterpriseId: (q.get("enterprise_id") || "").trim() || null,
    enterpriseSlug:
      (q.get("enterprise_slug") || q.get("slug") || "").trim() || null,
    canceled: q.get("canceled") === "1",
    upgraded: q.get("upgraded") === "1",
  };
}

export default function WifiGuestCheckoutPage() {
  const initial = useMemo(() => readQuery(), []);
  const [phase, setPhase] = useState<Phase>(
    initial.sessionId && (initial.enterpriseId || initial.enterpriseSlug)
      ? "loading"
      : "error",
  );
  const [plans, setPlans] = useState<SubscriptionTierPlan[]>([]);
  const [enterpriseId, setEnterpriseId] = useState(initial.enterpriseId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState(() => {
    if (!initial.sessionId) return "Missing session_id.";
    if (!initial.enterpriseId && !initial.enterpriseSlug) {
      return "Missing enterprise_id or enterprise_slug.";
    }
    return "";
  });
  const [banner, setBanner] = useState<string | null>(() => {
    if (initial.canceled) return "Checkout canceled — pick a plan when you are ready.";
    if (initial.upgraded) return "Payment received — returning you to your session.";
    return null;
  });

  const loadPlans = useCallback(async () => {
    const url = new URL("/api/v1/captive/checkout", window.location.origin);
    if (initial.enterpriseId) url.searchParams.set("enterprise_id", initial.enterpriseId);
    if (initial.enterpriseSlug) {
      url.searchParams.set("enterprise_slug", initial.enterpriseSlug);
    }
    const response = await fetch(url.toString(), {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    const body = (await response.json()) as PlanCatalogSuccess | ApiFailure;
    if (!response.ok || !body || body.ok !== true) {
      const fail = body as ApiFailure;
      throw new Error(fail.error || `Failed to load plans (${response.status})`);
    }
    setPlans(body.plans);
    setEnterpriseId(body.enterpriseId);
    setPhase("ready");
    if (body.plans.length > 0) {
      setSelectedId(body.plans[0].id);
    }
  }, [initial.enterpriseId, initial.enterpriseSlug]);

  useEffect(() => {
    if (phase !== "loading") return;
    let cancelled = false;
    (async () => {
      try {
        await loadPlans();
      } catch (error) {
        if (cancelled) return;
        setPhase("error");
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load subscription plans.",
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadPlans, phase]);

  useEffect(() => {
    if (!initial.upgraded || !initial.sessionId) return;
    const timer = setTimeout(() => {
      const next = new URL("/wifi-guest/session", window.location.origin);
      next.searchParams.set("session_id", initial.sessionId!);
      if (initial.enterpriseSlug) {
        next.searchParams.set("enterprise_slug", initial.enterpriseSlug);
      }
      window.location.assign(`${next.pathname}${next.search}`);
    }, 1400);
    return () => clearTimeout(timer);
  }, [initial.enterpriseSlug, initial.sessionId, initial.upgraded]);

  const startCheckout = async (plan: SubscriptionTierPlan) => {
    if (!initial.sessionId) return;
    setSelectedId(plan.id);
    setBusyPlanId(plan.id);
    setBanner(null);

    const success = new URL("/wifi-guest/checkout", window.location.origin);
    success.searchParams.set("session_id", initial.sessionId);
    success.searchParams.set("upgraded", "1");
    if (enterpriseId) success.searchParams.set("enterprise_id", enterpriseId);
    if (initial.enterpriseSlug) {
      success.searchParams.set("enterprise_slug", initial.enterpriseSlug);
    }

    const cancel = new URL("/wifi-guest/checkout", window.location.origin);
    cancel.searchParams.set("session_id", initial.sessionId);
    cancel.searchParams.set("canceled", "1");
    if (enterpriseId) cancel.searchParams.set("enterprise_id", enterpriseId);
    if (initial.enterpriseSlug) {
      cancel.searchParams.set("enterprise_slug", initial.enterpriseSlug);
    }

    try {
      const response = await fetch("/api/v1/captive/checkout", {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          session_id: initial.sessionId,
          plan_id: plan.id,
          success_url: success.toString(),
          cancel_url: cancel.toString(),
        }),
      });
      const body = (await response.json()) as CheckoutCreateSuccess | ApiFailure;
      if (!response.ok || !body || body.ok !== true || body.mode !== "checkout_create") {
        const fail = body as ApiFailure;
        throw new Error(fail.error || `Checkout failed (${response.status})`);
      }
      setPhase("redirecting");
      window.location.assign(body.url);
    } catch (error) {
      setBusyPlanId(null);
      setBanner(
        error instanceof Error ? error.message : "Could not start Stripe Checkout.",
      );
    }
  };

  const backToSession = () => {
    if (!initial.sessionId) return;
    const next = new URL("/wifi-guest/session", window.location.origin);
    next.searchParams.set("session_id", initial.sessionId);
    if (initial.enterpriseSlug) {
      next.searchParams.set("enterprise_slug", initial.enterpriseSlug);
    }
    window.location.assign(`${next.pathname}${next.search}`);
  };

  return (
    <main
      style={{
        minHeight: "100dvh",
        margin: 0,
        background:
          "radial-gradient(120% 80% at 50% -10%, #f6eede 0%, #faf9f7 40%, #eaf0fe 100%)",
        color: "#12151a",
        fontFamily: 'var(--font-body, "Instrument Sans", system-ui, sans-serif)',
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          margin: "0 auto",
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          padding: "28px 20px 36px",
          boxSizing: "border-box",
          gap: 18,
        }}
      >
        <header>
          <button
            type="button"
            onClick={backToSession}
            style={{
              appearance: "none",
              border: "none",
              background: "transparent",
              color: "#155eef",
              fontWeight: 600,
              fontSize: 13,
              padding: 0,
              cursor: "pointer",
              marginBottom: 12,
            }}
          >
            ← Back to session
          </button>
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
            Upgrade
          </p>
          <h1
            style={{
              margin: "10px 0 0",
              fontSize: "clamp(1.6rem, 5.5vw, 2rem)",
              lineHeight: 1.15,
              fontWeight: 650,
              letterSpacing: "-0.02em",
            }}
          >
            Choose a Wi‑Fi plan
          </h1>
          <p style={{ margin: "8px 0 0", color: "#5c6470", fontSize: 15, lineHeight: 1.45 }}>
            Unlock more data and faster speeds. Payment is handled securely by Stripe.
          </p>
        </header>

        {banner ? (
          <p
            role="status"
            style={{
              margin: 0,
              padding: "12px 14px",
              borderRadius: 12,
              background: "#fff",
              border: "1px solid #e7e4dd",
              color: "#5c6470",
              fontSize: 14,
              lineHeight: 1.45,
            }}
          >
            {banner}
          </p>
        ) : null}

        {phase === "loading" || phase === "redirecting" ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                border: "3px solid #e7e4dd",
                borderTopColor: "#155eef",
                animation: "wifiGuestSpin 0.85s linear infinite",
              }}
              aria-hidden="true"
            />
            <p style={{ margin: 0, color: "#5c6470", fontSize: 14 }}>
              {phase === "redirecting" ? "Redirecting to Stripe…" : "Loading plans…"}
            </p>
            <style>{`@keyframes wifiGuestSpin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : null}

        {phase === "error" ? (
          <div>
            <p style={{ color: "#c24141", fontSize: 15, lineHeight: 1.5 }}>{errorMessage}</p>
            <button
              type="button"
              onClick={() => {
                setPhase("loading");
                setErrorMessage("");
              }}
              style={{
                appearance: "none",
                marginTop: 12,
                border: "none",
                borderRadius: 999,
                background: "#155eef",
                color: "#fff",
                fontWeight: 600,
                fontSize: 14,
                padding: "11px 18px",
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          </div>
        ) : null}

        {phase === "ready" ? (
          <section style={{ display: "grid", gap: 12 }}>
            {plans.length === 0 ? (
              <p style={{ margin: 0, color: "#5c6470", fontSize: 15 }}>
                No active plans are published for this venue yet.
              </p>
            ) : (
              plans.map((plan, index) => (
                <SubscriptionTierCard
                  key={plan.id}
                  plan={plan}
                  selected={selectedId === plan.id}
                  busy={busyPlanId === plan.id}
                  disabled={busyPlanId !== null && busyPlanId !== plan.id}
                  badge={index === 0 ? "Popular" : undefined}
                  ctaLabel="Continue to payment"
                  onSelect={(next) => {
                    void startCheckout(next);
                  }}
                />
              ))
            )}
          </section>
        ) : null}
      </div>
    </main>
  );
}
