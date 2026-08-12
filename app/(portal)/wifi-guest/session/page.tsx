/**
 * TASK-4.2 — Active session monitor (live quota + countdown).
 *
 * Assumptions:
 * 1. Query: session_id (required). Optional enterprise_slug for checkout handoff.
 * 2. Polls `/api/v1/captive/session-status` every 5s; uses SSE when supported.
 * 3. On exhaustion, shows upgrade CTA and routes to `/wifi-guest/checkout`.
 * 4. No `next` package — client navigation via window.location.
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { UsageProgressCircle } from "../../../../components/wifi/portal/UsageProgressCircle";

interface StatusSuccess {
  ok: true;
  session: {
    id: string;
    status: string;
    startedAt: string;
    endsAt: string | null;
    planId: string | null;
    downloadKbps: number;
    uploadKbps: number;
    quotaBytes: number;
  };
  device: { id: string; macAddress: string };
  enterprise: { id: string; slug: string; name: string };
  quota: {
    usedBytes: number;
    remainingBytes: number;
    usedMb: number;
    remainingMb: number;
    percentUsed: number;
    remainingSeconds: number | null;
    isExhausted: boolean;
    isTimeExpired: boolean;
  };
  speedRules: { downloadKbps: number; uploadKbps: number };
}

interface StatusFailure {
  ok: false;
  error?: string;
  code?: string;
}

type Phase = "loading" | "live" | "exhausted" | "error";

function readQuery(): { sessionId: string | null; enterpriseSlug: string | null } {
  if (typeof window === "undefined") {
    return { sessionId: null, enterpriseSlug: null };
  }
  const q = new URLSearchParams(window.location.search);
  return {
    sessionId: (q.get("session_id") || "").trim() || null,
    enterpriseSlug:
      (q.get("enterprise_slug") || q.get("slug") || "").trim() || null,
  };
}

function formatClock(totalSeconds: number | null): string {
  if (totalSeconds === null || !Number.isFinite(totalSeconds)) return "—";
  const safe = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function shellStyle(): CSSProperties {
  return {
    minHeight: "100dvh",
    margin: 0,
    background:
      "radial-gradient(120% 80% at 50% -10%, #eaf0fe 0%, #faf9f7 42%, #f3efe6 100%)",
    color: "#12151a",
    fontFamily: 'var(--font-body, "Instrument Sans", system-ui, sans-serif)',
  };
}

export default function WifiGuestSessionPage() {
  const initial = useMemo(() => readQuery(), []);
  const [sessionId] = useState(initial.sessionId);
  const [phase, setPhase] = useState<Phase>(sessionId ? "loading" : "error");
  const [status, setStatus] = useState<StatusSuccess | null>(null);
  const [errorMessage, setErrorMessage] = useState(
    sessionId ? "" : "Missing session_id. Return to the portal landing page.",
  );
  const [localRemainingSeconds, setLocalRemainingSeconds] = useState<number | null>(
    null,
  );
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const applyStatus = useCallback((body: StatusSuccess) => {
    setStatus(body);
    setLocalRemainingSeconds(body.quota.remainingSeconds);
    setPhase(body.quota.isExhausted ? "exhausted" : "live");
  }, []);

  const fetchStatusOnce = useCallback(async () => {
    if (!sessionId) return;
    const url = new URL("/api/v1/captive/session-status", window.location.origin);
    url.searchParams.set("session_id", sessionId);
    const response = await fetch(url.toString(), {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    const body = (await response.json()) as StatusSuccess | StatusFailure;
    if (!response.ok || !body || body.ok !== true) {
      const fail = body as StatusFailure;
      throw new Error(fail.error || `Status failed (${response.status})`);
    }
    applyStatus(body);
  }, [applyStatus, sessionId]);

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;

    (async () => {
      try {
        await fetchStatusOnce();
      } catch (error) {
        if (cancelled) return;
        setPhase("error");
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load session status.",
        );
      }
    })();

    // Prefer SSE when available; fall back to JSON polling.
    try {
      const streamUrl = new URL("/api/v1/captive/session-status", window.location.origin);
      streamUrl.searchParams.set("session_id", sessionId);
      streamUrl.searchParams.set("stream", "1");
      streamUrl.searchParams.set("interval_ms", "5000");
      const es = new EventSource(streamUrl.toString());
      eventSourceRef.current = es;

      es.addEventListener("session", (event) => {
        if (cancelled) return;
        try {
          const body = JSON.parse((event as MessageEvent).data) as StatusSuccess | StatusFailure;
          if (body && body.ok === true) {
            applyStatus(body);
            if (body.quota.isExhausted) {
              es.close();
            }
          }
        } catch {
          // ignore malformed frames
        }
      });

      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;
        if (cancelled || pollRef.current) return;
        pollRef.current = setInterval(() => {
          void fetchStatusOnce().catch(() => {
            /* keep last good snapshot */
          });
        }, 5000);
      };
    } catch {
      pollRef.current = setInterval(() => {
        void fetchStatusOnce().catch(() => undefined);
      }, 5000);
    }

    const clock = setInterval(() => {
      setLocalRemainingSeconds((prev) => {
        if (prev === null) return prev;
        return Math.max(0, prev - 1);
      });
    }, 1000);

    return () => {
      cancelled = true;
      clearInterval(clock);
      if (pollRef.current) clearInterval(pollRef.current);
      eventSourceRef.current?.close();
    };
  }, [applyStatus, fetchStatusOnce, sessionId]);

  useEffect(() => {
    if (localRemainingSeconds === 0 && phase === "live") {
      setPhase("exhausted");
    }
  }, [localRemainingSeconds, phase]);

  const goCheckout = () => {
    if (!status) return;
    const next = new URL("/wifi-guest/checkout", window.location.origin);
    next.searchParams.set("session_id", status.session.id);
    next.searchParams.set("enterprise_id", status.enterprise.id);
    next.searchParams.set("enterprise_slug", status.enterprise.slug);
    window.location.assign(`${next.pathname}${next.search}`);
  };

  const exhausted =
    phase === "exhausted" || Boolean(status?.quota.isExhausted) || localRemainingSeconds === 0;

  return (
    <main style={shellStyle()}>
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
        }}
      >
        <header style={{ marginBottom: 22 }}>
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
            OmniTaps Portal
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
            {status?.enterprise.name || "Your session"}
          </h1>
          <p style={{ margin: "8px 0 0", color: "#5c6470", fontSize: 15 }}>
            {phase === "loading" && "Loading live usage…"}
            {phase === "live" && "Connected — usage updates live."}
            {phase === "exhausted" && "Allowance used up — upgrade to stay online."}
            {phase === "error" && "Session status unavailable."}
          </p>
        </header>

        {phase === "error" ? (
          <section style={{ flex: 1 }}>
            <p style={{ color: "#c24141", fontSize: 15, lineHeight: 1.5 }}>{errorMessage}</p>
          </section>
        ) : (
          <section
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 20,
            }}
          >
            <UsageProgressCircle
              percentUsed={status?.quota.percentUsed ?? 0}
              remainingMb={status?.quota.remainingMb ?? null}
              remainingSeconds={localRemainingSeconds}
              exhausted={exhausted}
              size={188}
            />

            <div
              style={{
                width: "100%",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #e7e4dd",
                  borderRadius: 14,
                  padding: "14px 12px",
                  textAlign: "center",
                }}
              >
                <p style={{ margin: 0, fontSize: 11, color: "#9a9fa8", letterSpacing: "0.06em" }}>
                  TIME LEFT
                </p>
                <p
                  style={{
                    margin: "8px 0 0",
                    fontFamily: 'var(--font-mono, "IBM Plex Mono", monospace)',
                    fontSize: 22,
                    fontWeight: 500,
                    color: exhausted ? "#c24141" : "#12151a",
                  }}
                >
                  {formatClock(localRemainingSeconds)}
                </p>
              </div>
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #e7e4dd",
                  borderRadius: 14,
                  padding: "14px 12px",
                  textAlign: "center",
                }}
              >
                <p style={{ margin: 0, fontSize: 11, color: "#9a9fa8", letterSpacing: "0.06em" }}>
                  SPEED
                </p>
                <p
                  style={{
                    margin: "8px 0 0",
                    fontFamily: 'var(--font-mono, "IBM Plex Mono", monospace)',
                    fontSize: 15,
                    fontWeight: 500,
                    color: "#12151a",
                  }}
                >
                  ↓{status?.speedRules.downloadKbps || 0}
                  <span style={{ color: "#9a9fa8" }}> / </span>↑
                  {status?.speedRules.uploadKbps || 0}
                  <span style={{ display: "block", fontSize: 11, color: "#9a9fa8", marginTop: 2 }}>
                    kbps
                  </span>
                </p>
              </div>
            </div>

            {status ? (
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  color: "#9a9fa8",
                  fontFamily: 'var(--font-mono, "IBM Plex Mono", monospace)',
                }}
              >
                {status.device.macAddress} · {status.session.id.slice(0, 10)}
              </p>
            ) : null}

            {exhausted ? (
              <div
                role="alert"
                style={{
                  width: "100%",
                  background: "#fff5f5",
                  border: "1px solid #f3d4d4",
                  borderRadius: 16,
                  padding: "16px",
                  textAlign: "left",
                }}
              >
                <p style={{ margin: 0, fontWeight: 650, color: "#c24141" }}>
                  Data or time exhausted
                </p>
                <p style={{ margin: "8px 0 14px", fontSize: 14, color: "#5c6470", lineHeight: 1.45 }}>
                  Choose a paid tier to restore access and raise your speed limits instantly.
                </p>
                <button
                  type="button"
                  onClick={goCheckout}
                  style={{
                    appearance: "none",
                    border: "none",
                    borderRadius: 999,
                    background: "#155eef",
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: 15,
                    padding: "12px 20px",
                    cursor: "pointer",
                    width: "100%",
                  }}
                >
                  View upgrade plans
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={goCheckout}
                style={{
                  appearance: "none",
                  border: "1px solid #e7e4dd",
                  borderRadius: 999,
                  background: "#fff",
                  color: "#12151a",
                  fontWeight: 600,
                  fontSize: 14,
                  padding: "11px 18px",
                  cursor: "pointer",
                }}
              >
                Upgrade plan
              </button>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
