import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PublicMenu from "../components/menu/PublicMenu";
import { resolveRestaurant } from "../lib/qrMenu/resolveRestaurant";

export default function CustomerMenuPage() {
  const { restaurantId: restaurantParam = "" } = useParams();
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setRestaurant(null);

    resolveRestaurant(restaurantParam)
      .then((result) => {
        if (cancelled) return;
        if (!result) {
          setError("No restaurant was found for this menu link.");
          return;
        }
        setRestaurant(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load this menu.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [restaurantParam]);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#faf9f7_0%,#f4f7fb_100%)] text-ink">
      <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-tap">
              Digital menu
            </p>
            <h1 className="mt-2 font-display text-[30px] font-semibold tracking-[-0.02em]">
              {restaurant?.name || "Menu"}
            </h1>
          </div>
          <Link to="/" className="text-[14px] text-ink-muted hover:text-ink">
            OmniTaps
          </Link>
        </div>

        {loading ? (
          <p className="rounded-3xl border border-hairline bg-surface p-8 text-ink-muted" role="status">
            Loading menu…
          </p>
        ) : error ? (
          <div className="rounded-3xl border border-hairline bg-surface p-8" role="alert">
            <h2 className="font-display text-[22px] font-semibold">Menu unavailable</h2>
            <p className="mt-3 text-[15px] leading-[1.7] text-ink-muted">{error}</p>
          </div>
        ) : restaurant ? (
          <PublicMenu restaurantId={restaurant.id} title={restaurant.name} />
        ) : null}
      </div>
    </main>
  );
}
