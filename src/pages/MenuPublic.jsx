import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
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

export default function MenuPublic() {
  const { tenantId = "" } = useParams();
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
    <main className="min-h-screen bg-[linear-gradient(180deg,#faf9f7_0%,#f4f7fb_100%)] text-ink">
      <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-tap">Digital menu</p>
            <h1 className="mt-2 font-display text-[30px] font-semibold tracking-[-0.02em]">
              {data?.menu?.name || data?.tenant?.name || "Menu"}
            </h1>
          </div>
          <Link to="/" className="text-[14px] text-ink-muted hover:text-ink">
            OmniTaps
          </Link>
        </div>

        {loading ? (
          <p className="rounded-3xl border border-hairline bg-surface p-8 text-ink-muted">Loading menu…</p>
        ) : error ? (
          <div className="rounded-3xl border border-hairline bg-surface p-8" role="alert">
            <h2 className="font-display text-[22px] font-semibold">Menu unavailable</h2>
            <p className="mt-3 text-[15px] leading-[1.7] text-ink-muted">{error}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {data.menu.categories.map((category) => (
              <section key={category.id} className="rounded-3xl border border-hairline bg-surface p-6 sm:p-8">
                <h2 className="font-display text-[22px] font-semibold">{category.title}</h2>
                {category.description ? (
                  <p className="mt-2 text-[14px] leading-[1.7] text-ink-muted">{category.description}</p>
                ) : null}
                <ul className="mt-6 space-y-5">
                  {category.items.map((item) => (
                    <li key={item.id} className="border-b border-hairline pb-5 last:border-b-0 last:pb-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-ink">{item.name}</h3>
                            {item.badge ? (
                              <span className="rounded-full bg-brass-soft px-2 py-0.5 text-[11px] font-medium text-brass-dark">
                                {item.badge}
                              </span>
                            ) : null}
                          </div>
                          {item.description ? (
                            <p className="mt-1 text-[14px] leading-[1.7] text-ink-muted">{item.description}</p>
                          ) : null}
                          {item.allergens?.length ? (
                            <p className="mt-2 text-[12px] text-ink-faint">Allergens: {item.allergens.join(", ")}</p>
                          ) : null}
                        </div>
                        <span className="shrink-0 font-semibold text-ink">{item.price}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
