import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DemoChrome from "../components/demo/DemoChrome";
import PrismaPublicMenu from "../components/menu/PrismaPublicMenu";
import { ApiError, apiRequest } from "../lib/apiClient";

function statusMessage(error) {
  if (!(error instanceof ApiError)) {
    return "Unable to load this menu right now.";
  }
  if (error.code === "DB_UNAVAILABLE") {
    return "Menu service is temporarily unavailable.";
  }
  if (error.code === "MENU_NOT_FOUND" || error.code === "TENANT_NOT_FOUND") {
    return "No published menu was found for this business.";
  }
  return error.message;
}

export default function MenuPublic({ tenantId: tenantIdProp } = {}) {
  const params = useParams();
  const tenantId = tenantIdProp || params.tenantId || "";
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest(`/api/tenants/${encodeURIComponent(tenantId)}/menu`)
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
  }, [tenantId]);

  return (
    <main className="min-h-screen bg-porcelain text-ink font-body">
      <DemoChrome slug={tenantId} />
      <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-tap">Digital menu</p>
            <h1 className="mt-2 font-display text-[30px] font-semibold tracking-[-0.02em]">
              {data?.menu?.name || data?.tenant?.name || "Menu"}
            </h1>
          </div>
          <Link to="/" className="text-[14px] text-ink-muted hover:text-ink">
            Omnitaps
          </Link>
        </div>

        <PrismaPublicMenu data={data} loading={loading} error={error} />
      </div>
    </main>
  );
}
