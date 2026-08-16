#!/usr/bin/env node
/**
 * Seed the Supabase enterprise domain (nav console + captive Wi-Fi + QR menu)
 * over HTTPS via PostgREST + Auth Admin, mirroring supabase/seed_enterprise_nav.sql.
 * Use when psql / Supabase CLI are unavailable but the service-role key works.
 * Prerequisite: supabase/migrations 001–007 applied (tables + RLS exist).
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function hydrateEnv() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

hydrateEnv();

const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = (process.env.SEED_ADMIN_EMAIL || "onouh7@gmail.com").trim().toLowerCase();

if (!url || !serviceKey) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const HEADERS = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  "Content-Type": "application/json",
};

async function rest(method, table, { body, query = "" } = {}) {
  const prefer =
    method === "POST" && query.includes("on_conflict")
      ? "resolution=merge-duplicates,return=representation"
      : "return=representation";
  const response = await fetch(`${url}/rest/v1/${table}${query}`, {
    method,
    headers: { ...HEADERS, Prefer: prefer },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  if (!response.ok) {
    const message = typeof json === "object" ? JSON.stringify(json) : String(json);
    throw new Error(`${method} ${table} failed (${response.status}): ${message}`);
  }
  return json;
}

const NAV_ITEMS = [
  ["Dashboard", "/demo/dashboard", "LayoutDashboard", 0],
  ["Menu Editor", "/demo/dashboard", "Menu", 1],
  ["Modules", "/demo/dashboard", "Boxes", 2],
  ["Website demo", "/s/demo", "Globe", 3],
  ["Wi-Fi Captive", "/enterprise/wifi", "Wifi", 4],
  ["Wi-Fi Settings", "/enterprise/wifi/settings", "Settings", 5],
  ["Wi-Fi Plans", "/enterprise/wifi/plans", "CreditCard", 6],
].map(([label, urlPath, iconName, sortOrder]) => ({
  label,
  url_path: urlPath,
  icon_name: iconName,
  sort_order: sortOrder,
}));

const PLANS = [
  ["Day Pass", "Full-day high-speed access", 499, "daily", 2048, 1440, 25000, 10000, 10],
  ["Hour Boost", "1 hour speed boost", 199, "hourly", 1024, 60, 50000, 20000, 20],
  ["Session Plus", "Extra quota for this session", 99, "session", 512, null, 15000, 5000, 30],
].map(([name, description, priceCents, interval, quotaMb, durationMin, dl, ul, sortOrder]) => ({
  name,
  description,
  price_cents: priceCents,
  interval,
  quota_mb: quotaMb,
  duration_minutes: durationMin,
  download_kbps: dl,
  upload_kbps: ul,
  sort_order: sortOrder,
}));

const QR_ITEMS = [
  ["House Latte", "Double espresso with steamed milk and a thin layer of foam.", 4.5, 180, { protein: "9 g", carbs: "14 g", fat: "7 g", allergens: "Dairy", category: "Drinks" }, true],
  ["Flat White", "Ristretto shots stretched with velvety microfoam.", 4.75, 160, { protein: "8 g", carbs: "12 g", fat: "6 g", allergens: "Dairy", category: "Drinks" }, true],
  ["Iced Oat Cortado", "Equal parts espresso and oat milk over ice.", 5.25, 90, { protein: "2 g", carbs: "10 g", fat: "3 g", allergens: "None listed", category: "Drinks" }, true],
  ["Citrus Iced Tea", "House-brewed black tea with lemon peel and mint.", 3.5, 35, { protein: "0 g", carbs: "8 g", fat: "0 g", category: "Drinks" }, true],
  ["House Filter", "Rotating single origin, batch-brewed.", 3.75, 5, { protein: "0 g", carbs: "0 g", fat: "0 g", category: "Drinks" }, true],
  ["Avocado Toast", "Sourdough, smashed avocado, chili flake, lemon, and olive oil.", 12.0, 420, { protein: "10 g", carbs: "38 g", fat: "22 g", allergens: "Gluten", category: "Plates" }, true],
  ["Seasonal Shakshuka", "Tomato-pepper stew, baked eggs, and grilled focaccia.", 14.5, 510, { protein: "22 g", carbs: "36 g", fat: "28 g", allergens: "Egg, Gluten", category: "Plates" }, false],
  ["Citrus Grain Bowl", "Farro, roasted squash, herbs, and tahini lemon dressing.", 13.5, 480, { protein: "14 g", carbs: "58 g", fat: "18 g", allergens: "Gluten", category: "Plates" }, true],
  ["Ham & Gruyère Croissant", "Buttery croissant, smoked ham, melted Gruyère, Dijon.", 9.5, 390, { protein: "18 g", carbs: "28 g", fat: "22 g", allergens: "Gluten, Dairy", category: "Plates" }, true],
  ["Olive Oil Cake", "Citrus loaf with a crackly sugar top.", 6.5, 320, { protein: "5 g", carbs: "38 g", fat: "16 g", allergens: "Gluten, Egg", category: "Sweets" }, true],
  ["Dark Chocolate Cookie", "Sea salt, 70% chocolate, toasted hazelnut.", 4.25, 280, { protein: "4 g", carbs: "32 g", fat: "14 g", allergens: "Gluten, Tree nuts, Egg", category: "Sweets" }, true],
  ["Affogato", "Vanilla gelato drowned in a hot espresso shot.", 6.0, 210, { protein: "4 g", carbs: "22 g", fat: "10 g", allergens: "Dairy", category: "Sweets" }, true],
].map(([name, description, price, calories, nutritionalInfo, isAvailable]) => ({
  name,
  description,
  price,
  calories,
  nutritional_info: nutritionalInfo,
  is_available: isAvailable,
}));

const ALL_ROLES = ["super_admin", "enterprise_admin", "standard_user"];

async function upsertEnterprise(slug, name, domain, branding) {
  const rows = await rest("POST", "enterprises", {
    query: `?on_conflict=slug`,
    body: {
      slug,
      name,
      domain,
      branding,
      is_active: true,
    },
  });
  return rows?.[0]?.id;
}

async function main() {
  const listed = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listed.error) throw listed.error;
  const authUser = listed.data.users.find((u) => u.email?.toLowerCase() === adminEmail);
  if (!authUser) {
    console.error(`No auth user for ${adminEmail}. Create it in Supabase Auth first.`);
    process.exit(1);
  }

  const enterpriseId = await upsertEnterprise(
    "demo-enterprise",
    "Demo Enterprise",
    "demo.omnitaps.local",
    { primaryColor: "#0f766e", logoUrl: null },
  );

  // Profile (admin role) for the auth user.
  await rest("POST", "profiles", {
    query: `?on_conflict=id`,
    body: {
      id: authUser.id,
      enterprise_id: enterpriseId,
      role: "enterprise_admin",
      first_name: "Demo",
      last_name: "Admin",
    },
  });

  // Navigation menu items (idempotent: clear then re-insert).
  await rest("DELETE", "menu_items", { query: `?enterprise_id=eq.${enterpriseId}` });
  await rest("POST", "menu_items", {
    body: NAV_ITEMS.map((item) => ({
      enterprise_id: enterpriseId,
      parent_id: null,
      is_visible: true,
      required_roles: ALL_ROLES,
      ...item,
    })),
  });

  // Modules: nav_console + wifi.
  for (const [moduleKey, label] of [
    ["nav_console", "Enterprise Nav Console"],
    ["wifi", "Captive Wi-Fi Portal"],
  ]) {
    await rest("POST", "enterprise_modules", {
      query: `?on_conflict=enterprise_id,module_key`,
      body: {
        enterprise_id: enterpriseId,
        module_key: moduleKey,
        is_enabled: true,
        settings: { label },
      },
    });
  }

  // Captive defaults. Only set a demo HMAC secret when none exists, so a
  // rotated production secret is never overwritten by a re-seed.
  const [current] = await rest("GET", "enterprises", {
    query: `?id=eq.${enterpriseId}&select=gateway_hmac_secret`,
  });
  const patch = {
    free_quota_mb: 100,
    free_session_minutes: 60,
    default_download_kbps: 5000,
    default_upload_kbps: 2000,
  };
  if (!current?.gateway_hmac_secret) {
    patch.gateway_hmac_secret = "demo-gateway-hmac-secret-change-me";
  }
  await rest("PATCH", "enterprises", { query: `?id=eq.${enterpriseId}`, body: patch });

  // Subscription plans (insert only the ones missing by name).
  const existingPlans = await rest("GET", "subscription_plans", {
    query: `?enterprise_id=eq.${enterpriseId}&select=name`,
  });
  const existingNames = new Set((existingPlans || []).map((p) => p.name));
  const missingPlans = PLANS.filter((p) => !existingNames.has(p.name));
  if (missingPlans.length) {
    await rest("POST", "subscription_plans", {
      body: missingPlans.map((p) => ({
        enterprise_id: enterpriseId,
        currency: "usd",
        is_active: true,
        ...p,
      })),
    });
  }

  // Guest QR café so /menu/demo resolves on Supabase.
  const cafeId = await upsertEnterprise(
    "demo",
    "Demo Café",
    "cafe.omnitaps.local",
    { primaryColor: "#c45c26", logoUrl: null },
  );

  // QR menu items for both the console enterprise and the café.
  await rest("DELETE", "qr_menu_items", {
    query: `?restaurant_id=in.(${enterpriseId},${cafeId})`,
  });
  for (const restaurantId of [enterpriseId, cafeId]) {
    await rest("POST", "qr_menu_items", {
      body: QR_ITEMS.map((item) => ({ restaurant_id: restaurantId, ...item })),
    });
  }

  console.log(`✓ Seeded enterprise ${enterpriseId} (demo-enterprise) and café ${cafeId} (demo) for ${adminEmail}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
