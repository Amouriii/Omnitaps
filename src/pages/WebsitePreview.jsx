import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { isDemoSlug } from "../components/demo/DemoChrome";
import BlockRenderer from "../modules/website/components/BlockRenderer";
import ChatWidget from "../modules/chatbot/components/ChatWidget";
import { ApiError, apiRequest } from "../lib/apiClient";

function statusMessage(error) {
  if (!(error instanceof ApiError)) {
    return "Unable to load this website right now.";
  }
  if (error.code === "DB_UNAVAILABLE") {
    return "Website service is temporarily unavailable.";
  }
  if (
    error.code === "WEBSITE_NOT_FOUND" ||
    error.code === "PAGE_NOT_FOUND" ||
    error.code === "TENANT_NOT_FOUND"
  ) {
    return "No published website was found for this business.";
  }
  return error.message;
}

export default function WebsitePreview() {
  const { tenantId = "" } = useParams();
  const demo = isDemoSlug(tenantId);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest(`/api/tenants/${encodeURIComponent(tenantId)}/website`)
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(statusMessage(err));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  useEffect(() => {
    if (!data?.page) return;
    document.title = data.page.metaTitle || data.page.title || data.website?.name || "Omnitaps";
  }, [data]);

  return (
    <main className="min-h-screen min-w-0 bg-porcelain text-ink font-body">
      {demo ? null : (
        <div className="border-b border-hairline bg-porcelain/85 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-tap">Tenant site</p>
              <h1 className="font-display text-[20px] font-semibold">
                {data?.website?.name || data?.tenant?.name || "Website"}
              </h1>
            </div>
            <Link to="/" className="text-[14px] text-ink-muted hover:text-ink">
              Omnitaps
            </Link>
          </div>
        </div>
      )}

      <div className={`mx-auto max-w-6xl px-5 sm:px-8 ${demo ? "pb-32 pt-8 sm:pt-10" : "py-10"}`}>
        {loading ? (
          <p className="rounded-3xl border border-hairline bg-surface p-8 text-ink-muted">Loading website…</p>
        ) : error ? (
          <div className="rounded-3xl border border-hairline bg-surface p-8" role="alert">
            <h2 className="font-display text-[24px] font-semibold">Website unavailable</h2>
            <p className="mt-3 text-[15px] leading-[1.7] text-ink-muted">{error}</p>
          </div>
        ) : (
          <BlockRenderer blocks={data.page.blocks} />
        )}
      </div>

      {tenantId ? (
        <ChatWidget tenantId={tenantId} botName={data?.tenant?.name || data?.website?.name} />
      ) : null}
    </main>
  );
}
