import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { isDemoSlug } from "../components/demo/DemoChrome";
import PublicMenu from "../components/menu/PublicMenu";
import { resolveRestaurant } from "../lib/qrMenu/resolveRestaurant";
import MenuPublic from "./MenuPublic";

export default function CustomerMenuPage() {
  const { restaurantId: restaurantParam = "" } = useParams();

  if (isDemoSlug(restaurantParam)) {
    return <MenuPublic tenantId={restaurantParam} />;
  }

  return <EnterpriseOrPrismaMenu restaurantParam={restaurantParam} />;
}

function EnterpriseOrPrismaMenu({ restaurantParam }) {
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [usePrismaFallback, setUsePrismaFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setRestaurant(null);
    setUsePrismaFallback(false);

    resolveRestaurant(restaurantParam)
      .then((result) => {
        if (cancelled) return;
        if (!result) {
          setUsePrismaFallback(true);
          return;
        }
        setRestaurant(result);
      })
      .catch(() => {
        if (!cancelled) {
          setUsePrismaFallback(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [restaurantParam]);

  if (usePrismaFallback) {
    return <MenuPublic tenantId={restaurantParam} />;
  }

  return (
    <main className="min-h-screen bg-porcelain text-ink font-body">
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
            Omnitaps
          </Link>
        </div>

        {loading ? (
          <p className="rounded-3xl border border-hairline bg-surface p-8 text-ink-muted" role="status">
            Loading menu…
          </p>
        ) : restaurant ? (
          <PublicMenu restaurantId={restaurant.id} title={restaurant.name} />
        ) : null}
      </div>
    </main>
  );
}
