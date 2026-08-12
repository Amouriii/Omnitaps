/**
 * TASK-4.1 — Guest captive portal landing / auto-login.
 *
 * Assumptions:
 * 1. Placed at the task path `app/(portal)/wifi-guest/page.tsx` (Next App Router).
 * 2. No `next` package in this Vite repo — parse query via `window.location` /
 *    `URLSearchParams` and navigate with `window.location.assign` so the page
 *    stays a portable client component.
 * 3. Gateway redirect supplies mac, ap_id, challenge, sig|hmac|token, and
 *    enterprise_id or enterprise_slug (also accepts `slug`).
 * 4. Authenticate hits `/api/v1/captive/authenticate`; on grant, brief welcome
 *    then redirect to `/wifi-guest/session?session_id=…`.
 */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  UsageProgressCircle,
} from "../../../components/wifi/portal/UsageProgressCircle";

type AuthPhase =
  | "booting"
  | "missing_params"
  | "authenticating"
  | "welcome"
  | "redirecting"
  | "error";

interface GatewayParams {
  mac: string;
  ap_id: string;
  challenge: string;
  sig: string;
  enterprise_id?: string;
  enterprise_slug?: string;
  acct_session_id?: string;
  ts?: string;
}

interface AuthenticateSuccess {
  ok: true;
  isNewDevice: boolean;
  isNewSession: boolean;
  enterprise: { id: string; slug: string; name: string };
  device: { id: string; macAddress: string; status: string };
  session: {
    id: string;
    status: string;
    startedAt: string;
    endsAt: string | null;
    downloadKbps: number;
    uploadKbps: number;
    quotaBytes: number;
  };
  quota: {
    usedBytes: number;
    remainingBytes: number;
    usedMb: number;
    remainingMb: number;
    percentUsed: number;
    remainingSeconds: number | null;
    isExhausted: boolean;
  };
  speedRules: { downloadKbps: number; uploadKbps: number };
}

interface AuthenticateFailure {
  ok: false;
  error?: string;
  code?: string;
  details?: string;
}

function readGatewayParams(search: string): {
  params: GatewayParams | null;
  missing: string[];
} {
  const q = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  const mac = (q.get("mac") || "").trim();
  const apId = (q.get("ap_id") || q.get("apId") || "").trim();
  const challenge = (q.get("challenge") || "").trim();
  const sig = (q.get("sig") || q.get("hmac") || q.get("token") || "").trim();
  const enterpriseId = (q.get("enterprise_id") || "").trim() || undefined;
  const enterpriseSlug =
    (q.get("enterprise_slug") || q.get("slug") || "").trim() || undefined;
  const acctSessionId = (q.get("acct_session_id") || "").trim() || undefined;
  const ts = (q.get("ts") || "").trim() || undefined;

  const missing: string[] = [];
  if (!mac) missing.push("mac");
  if (!apId) missing.push("ap_id");
  if (!challenge) missing.push("challenge");
  if (!sig) missing.push("sig");
  if (!enterpriseId && !enterpriseSlug) missing.push("enterprise_id|enterprise_slug");

  if (missing.length > 0) {
    return { params: null, missing };
  }

  return {
    params: {
      mac,
      ap_id: apId,
      challenge,
      sig,
      enterprise_id: enterpriseId,
      enterprise_slug: enterpriseSlug,
      acct_session_id: acctSessionId,
      ts,
    },
    missing: [],
  };
}

function buildAuthenticateUrl(params: GatewayParams): string {
  const q = new URLSearchParams();
  q.set("mac", params.mac);
  q.set("ap_id", params.ap_id);
  q.set("challenge", params.challenge);
  q.set("sig", params.sig);
  if (params.enterprise_id) q.set("enterprise_id", params.enterprise_id);
  if (params.enterprise_slug) q.set("enterprise_slug", params.enterprise_slug);
  if (params.acct_session_id) q.set("acct_session_id", params.acct_session_id);
  if (params.ts) q.set("ts", params.ts);
  return `/api/v1/captive/authenticate?${q.toString()}`;
}

function formatSpeed(kbps: number): string {
  if (!Number.isFinite(kbps) || kbps <= 0) return "Full speed";
  if (kbps >= 1000) return `${(kbps / 1000).toFixed(kbps % 1000 === 0 ? 0 : 1)} Mbps`;
  return `${kbps} kbps`;
}

function phaseTitle(phase: AuthPhase): string {
  switch (phase) {
    case "booting":
      return "Preparing portal";
    case "missing_params":
      return "Gateway link incomplete";
    case "authenticating":
      return "Connecting you…";
    case "welcome":
      return "You're online";
    case "redirecting":
      return "Opening session";
    case "error":
      return "Couldn’t connect";
    default:
      return "Guest Wi‑Fi";
  }
}

export default function WifiGuestLandingPage() {
  const [phase, setPhase] = useState<AuthPhase>("booting");
  const [missing, setMissing] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [errorCode, setErrorCode] = useState<string>("");
  const [result, setResult] = useState<AuthenticateSuccess | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [search, setSearch] = useState<string | null>(null);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSearch(window.location.search || "");
  }, [retryToken]);

  const parsed = useMemo(
    () => (search === null ? null : readGatewayParams(search)),
    [search],
  );

  useEffect(() => {
    return () => {
      if (redirectTimer.current) {
        clearTimeout(redirectTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!parsed) {
      return;
    }

    let cancelled = false;

    if (parsed.missing.length > 0 || !parsed.params) {
      setPhase("missing_params");
      setMissing(parsed.missing);
      return;
    }

    setPhase("authenticating");
    setErrorMessage("");
    setErrorCode("");
    setResult(null);

    const url = buildAuthenticateUrl(parsed.params);

    (async () => {
      try {
        const response = await fetch(url, {
          method: "GET",
          headers: { accept: "application/json" },
          cache: "no-store",
        });
        const body = (await response.json()) as AuthenticateSuccess | AuthenticateFailure;

        if (cancelled) return;

        if (!response.ok || !body || body.ok !== true) {
          const fail = body as AuthenticateFailure;
          setPhase("error");
          setErrorCode(fail.code || `http_${response.status}`);
          setErrorMessage(fail.error || "Authentication failed.");
          return;
        }

        setResult(body);
        setPhase("welcome");

        redirectTimer.current = setTimeout(() => {
          if (cancelled) return;
          setPhase("redirecting");
          const next = new URL("/wifi-guest/session", window.location.origin);
          next.searchParams.set("session_id", body.session.id);
          next.searchParams.set("enterprise_slug", body.enterprise.slug);
          window.location.assign(`${next.pathname}${next.search}`);
        }, 1600);
      } catch (error) {
        if (cancelled) return;
        setPhase("error");
        setErrorCode("network_error");
        setErrorMessage(
          error instanceof Error ? error.message : "Network error during authentication.",
        );
      }
    })();

    return () => {
      cancelled = true;
      if (redirectTimer.current) {
        clearTimeout(redirectTimer.current);
        redirectTimer.current = null;
      }
    };
  }, [parsed, retryToken]);

  const brandName = result?.enterprise.name || "Guest Wi‑Fi";

  return (
    <main
      style={{
        minHeight: "100dvh",
        margin: 0,
        background:
          "radial-gradient(120% 80% at 50% -10%, #eaf0fe 0%, #faf9f7 42%, #f3efe6 100%)",
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
        }}
      >
        <header style={{ marginBottom: 28 }}>
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
              fontSize: "clamp(1.75rem, 6vw, 2.15rem)",
              lineHeight: 1.15,
              fontWeight: 650,
              letterSpacing: "-0.02em",
            }}
          >
            {brandName}
          </h1>
          <p style={{ margin: "10px 0 0", color: "#5c6470", fontSize: 15, lineHeight: 1.45 }}>
            {phaseTitle(phase)}
          </p>
        </header>

        <section
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 22,
            textAlign: "center",
          }}
          aria-live="polite"
        >
          {(phase === "booting" || phase === "authenticating") && (
            <>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  border: "3px solid #e7e4dd",
                  borderTopColor: "#155eef",
                  animation: "wifiGuestSpin 0.85s linear infinite",
                }}
                aria-hidden="true"
              />
              <p style={{ margin: 0, color: "#5c6470", fontSize: 15 }}>
                Verifying your device with the access point…
              </p>
            </>
          )}

          {phase === "missing_params" && (
            <div style={{ width: "100%" }}>
              <p style={{ margin: "0 0 12px", color: "#5c6470", fontSize: 15, lineHeight: 1.5 }}>
                This page must be opened from a signed gateway redirect. Missing:
              </p>
              <ul
                style={{
                  margin: 0,
                  padding: "14px 16px",
                  listStyle: "none",
                  background: "#fff",
                  border: "1px solid #e7e4dd",
                  borderRadius: 14,
                  textAlign: "left",
                }}
              >
                {missing.map((item) => (
                  <li
                    key={item}
                    style={{
                      fontFamily: 'var(--font-mono, "IBM Plex Mono", monospace)',
                      fontSize: 13,
                      color: "#12151a",
                      padding: "4px 0",
                    }}
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {phase === "error" && (
            <div style={{ width: "100%" }}>
              <p style={{ margin: "0 0 8px", color: "#c24141", fontSize: 15, lineHeight: 1.5 }}>
                {errorMessage}
              </p>
              {errorCode ? (
                <p
                  style={{
                    margin: "0 0 18px",
                    fontFamily: 'var(--font-mono, "IBM Plex Mono", monospace)',
                    fontSize: 12,
                    color: "#9a9fa8",
                  }}
                >
                  {errorCode}
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => setRetryToken((value) => value + 1)}
                style={{
                  appearance: "none",
                  border: "none",
                  borderRadius: 999,
                  background: "#155eef",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 15,
                  padding: "12px 22px",
                  cursor: "pointer",
                }}
              >
                Try again
              </button>
            </div>
          )}

          {(phase === "welcome" || phase === "redirecting") && result ? (
            <>
              <UsageProgressCircle
                percentUsed={result.quota.percentUsed}
                remainingMb={result.quota.remainingMb}
                remainingSeconds={result.quota.remainingSeconds}
                exhausted={result.quota.isExhausted}
                size={180}
                label="Free allowance"
              />
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 18,
                    fontWeight: 600,
                    letterSpacing: "-0.01em",
                  }}
                >
                  Welcome{result.isNewDevice ? "" : " back"}
                </p>
                <p style={{ margin: "8px 0 0", color: "#5c6470", fontSize: 14, lineHeight: 1.45 }}>
                  Down {formatSpeed(result.speedRules.downloadKbps)} · Up{" "}
                  {formatSpeed(result.speedRules.uploadKbps)}
                </p>
                <p style={{ margin: "14px 0 0", color: "#9a9fa8", fontSize: 13 }}>
                  {phase === "redirecting"
                    ? "Taking you to live session status…"
                    : "Connection granted — opening your session monitor…"}
                </p>
              </div>
              <a
                href={`/wifi-guest/session?session_id=${encodeURIComponent(result.session.id)}&enterprise_slug=${encodeURIComponent(result.enterprise.slug)}`}
                style={{
                  marginTop: 4,
                  color: "#155eef",
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Continue now
              </a>
            </>
          ) : null}
        </section>

        <footer
          style={{
            marginTop: 32,
            paddingTop: 16,
            borderTop: "1px solid #e7e4dd",
            color: "#9a9fa8",
            fontSize: 12,
            textAlign: "center",
          }}
        >
          Secure captive access · session quotas enforced in real time
        </footer>
      </div>

      <style>{`
        @keyframes wifiGuestSpin {
          to { transform: rotate(360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; transition: none !important; }
        }
      `}</style>
    </main>
  );
}
