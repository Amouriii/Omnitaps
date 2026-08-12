import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { QrCodeSvg } from "../lib/qr";
import { ApiError, apiRequest } from "../lib/apiClient";

function statusMessage(error) {
  if (!(error instanceof ApiError)) {
    return "Unable to load WiFi access right now.";
  }
  if (error.code === "DB_UNAVAILABLE") {
    return "WiFi service is temporarily unavailable.";
  }
  if (error.code === "WIFI_NOT_FOUND" || error.code === "TENANT_NOT_FOUND") {
    return "No active guest WiFi network was found for this business.";
  }
  return error.message;
}

export default function WifiAccess() {
  const { tenantId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const networkSlug = searchParams.get("network") || "";
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    const query = networkSlug ? `?network=${encodeURIComponent(networkSlug)}` : "";
    apiRequest(`/api/tenants/${encodeURIComponent(tenantId)}/wifi${query}`)
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch((err) => {
        if (!cancelled) setError(statusMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tenantId, networkSlug]);

  const splash = data?.network?.splashPage;
  const headline = splash?.headline || `Join ${data?.tenant?.name || "guest"} Wi‑Fi`;
  const body =
    splash?.body ||
    "Scan the QR code with your camera to join the network. No front-desk password lookup required.";

  const qrValue = useMemo(() => data?.network?.wifiPayload || "", [data]);
  const password = data?.network?.password || "";
  const [copied, setCopied] = useState(false);

  async function copyPassword() {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <main className="min-h-screen bg-porcelain text-ink font-body">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-5 py-10 sm:px-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-tap">Guest Wi‑Fi</p>
          {tenantId === "demo" ? null : (
            <Link to="/" className="text-[14px] text-ink-muted hover:text-ink">
              Omnitaps
            </Link>
          )}
        </div>

        {loading ? (
          <p className="rounded-3xl border border-hairline bg-surface p-8 text-ink-muted">Loading Wi‑Fi access…</p>
        ) : error ? (
          <div className="rounded-3xl border border-hairline bg-surface p-8" role="alert">
            <h1 className="font-display text-[28px] font-semibold">Wi‑Fi unavailable</h1>
            <p className="mt-3 text-[15px] leading-[1.7] text-ink-muted">{error}</p>
          </div>
        ) : (
          <section className="rounded-3xl border border-hairline bg-surface p-6 shadow-[0_28px_60px_-42px_rgba(18,21,26,0.38)] sm:p-10">
            <h1 className="font-display text-[30px] font-semibold tracking-[-0.02em]">{headline}</h1>
            <p className="mt-4 max-w-xl text-[15px] leading-[1.7] text-ink-muted">{body}</p>

            <div className="mt-8 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
              <QrCodeSvg
                value={qrValue}
                size={220}
                frameLabel={data.network.ssid}
                frameCaption={`${data.network.authType} network`}
              />
              <div className="space-y-3 text-[14px] text-ink-muted">
                <p>
                  Network: <span className="font-semibold text-ink">{data.network.ssid}</span>
                </p>
                <p>
                  Security: <span className="font-semibold text-ink">{data.network.authType}</span>
                </p>
                {password ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <p>
                      Password: <span className="font-mono font-semibold text-ink">{password}</span>
                    </p>
                    <button
                      type="button"
                      onClick={copyPassword}
                      className="rounded-full border border-hairline bg-porcelain px-3 py-1 text-[12px] font-medium text-ink hover:border-hairline-strong"
                    >
                      {copied ? "Copied" : "Copy password"}
                    </button>
                  </div>
                ) : null}
                <p className="max-w-sm leading-[1.7]">
                  Open your camera app, scan the code, and confirm the Wi‑Fi join prompt on your device. On a laptop, copy the password and join {data.network.ssid} from system settings.
                </p>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
