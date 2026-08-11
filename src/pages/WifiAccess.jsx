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

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#faf9f7_0%,#eef2f8_100%)] text-ink">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-5 py-10 sm:px-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-tap">Guest Wi‑Fi</p>
          <Link to="/" className="text-[14px] text-ink-muted hover:text-ink">
            OmniTaps
          </Link>
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
                <p className="max-w-sm leading-[1.7]">
                  Open your camera app, scan the code, and confirm the Wi‑Fi join prompt on your device.
                </p>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
