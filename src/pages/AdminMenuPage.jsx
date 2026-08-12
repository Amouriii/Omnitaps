import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import AdminDashboard from "../components/admin/AdminDashboard";
import QRCodeGenerator from "../components/admin/QRCodeGenerator";
import {
  getSupabaseClient,
  isEnterpriseSupabaseConfigured,
} from "../services/supabaseClient";
import { resolveRestaurant } from "../lib/qrMenu/resolveRestaurant";

/**
 * QR food-menu admin page.
 * Resolves restaurant from URL param or the signed-in user's public.profiles row.
 */
export default function AdminMenuPage() {
  const { restaurantId: restaurantParam = "" } = useParams();
  const location = useLocation();
  const [restaurantId, setRestaurantId] = useState("");
  const [restaurantName, setRestaurantName] = useState("Restaurant");
  const [restaurantSlug, setRestaurantSlug] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!isEnterpriseSupabaseConfigured()) {
        if (!cancelled) {
          setError("Supabase is not configured.");
          setLoading(false);
        }
        return;
      }

      try {
        const supabase = getSupabaseClient();
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData.user) {
          if (!cancelled) {
            setNeedsLogin(true);
            setLoading(false);
          }
          return;
        }

        let resolvedId = "";
        let name = "Restaurant";
        let slug = "";

        if (restaurantParam.trim()) {
          const restaurant = await resolveRestaurant(restaurantParam);
          if (!restaurant) {
            throw new Error("No restaurant was found for this admin link.");
          }
          resolvedId = restaurant.id;
          name = restaurant.name;
          slug = restaurant.slug;
        } else {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("enterprise_id")
            .eq("id", authData.user.id)
            .maybeSingle();

          if (profileError) throw new Error(profileError.message);
          if (!profile?.enterprise_id) {
            throw new Error("No enterprise profile for this user.");
          }

          resolvedId = String(profile.enterprise_id);
          const restaurant = await resolveRestaurant(resolvedId);
          if (restaurant) {
            name = restaurant.name;
            slug = restaurant.slug;
          }
        }

        if (!cancelled) {
          setRestaurantId(resolvedId);
          setRestaurantName(name);
          setRestaurantSlug(slug);
          setError("");
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setRestaurantId("");
          setError(err instanceof Error ? err.message : "Unable to load menu admin.");
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [restaurantParam]);

  if (needsLogin) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-porcelain text-ink-muted"
        role="status"
      >
        Loading menu admin…
      </div>
    );
  }

  if (error || !restaurantId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-porcelain px-5 text-ink">
        <div className="max-w-md rounded-3xl border border-hairline bg-surface p-8" role="alert">
          <h1 className="font-display text-[24px] font-semibold">Menu admin unavailable</h1>
          <p className="mt-3 text-[15px] leading-[1.7] text-ink-muted">
            {error || "Sign in with an enterprise admin account to manage the QR menu."}
          </p>
          <Link to="/login" className="mt-5 inline-block text-[14px] text-tap hover:text-tap-dark">
            Go to login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-porcelain text-ink">
      <header className="border-b border-hairline bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <Link to="/demo/dashboard" className="text-[14px] text-ink-muted hover:text-ink">
            ← Enterprise console
          </Link>
          <Link to="/" className="text-[14px] text-ink-muted hover:text-ink">
            Omnitaps
          </Link>
        </div>
      </header>
      <AdminDashboard
        restaurantId={restaurantId}
        restaurantName={restaurantName}
        restaurantSlug={restaurantSlug}
        qrSlot={
          <QRCodeGenerator restaurantId={restaurantSlug || restaurantId} />
        }
      />
    </main>
  );
}
