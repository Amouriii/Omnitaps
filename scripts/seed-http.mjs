#!/usr/bin/env node
/**
 * Seed OmniTaps over HTTPS (Supabase Auth Admin + PostgREST).
 * Use when local Postgres TCP is blocked but Supabase API works.
 * Prerequisite: run supabase-init.sql in the Supabase SQL Editor first.
 */
import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "node:crypto";
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

function cuidLike() {
  return `c${randomBytes(12).toString("hex")}`;
}

function nowIso() {
  return new Date().toISOString();
}

function withTimestamps(row) {
  const ts = nowIso();
  return { ...row, createdAt: ts, updatedAt: ts };
}

function wifiPayload({ ssid, authType, password, hidden = false }) {
  const escape = (value) => String(value).replace(/([\\;,:"])/g, "\\$1");
  const parts = [`WIFI:T:${authType}`, `S:${escape(ssid)}`];
  if (authType !== "OPEN") parts.push(`P:${escape(password)}`);
  parts.push(`H:${hidden ? "true" : "false"}`);
  return `${parts.join(";")};`;
}

hydrateEnv();

const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const tenantSlug = process.env.SEED_TENANT_SLUG || "demo";
const tenantName = process.env.SEED_TENANT_NAME || "Demo Café";
const adminEmail = (process.env.SEED_ADMIN_EMAIL || "").trim().toLowerCase();
const adminPassword = process.env.SEED_ADMIN_PASSWORD || "";

if (!url || !serviceKey) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function rest(method, table, { body, query = "", upsert = false } = {}) {
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
    Prefer: upsert ? "resolution=merge-duplicates,return=representation" : "return=representation",
  };
  if (upsert) headers.Prefer = "resolution=merge-duplicates,return=representation";

  const response = await fetch(`${url}/rest/v1/${table}${query}`, {
    method,
    headers,
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

async function assertSchemaReady() {
  const response = await fetch(`${url}/rest/v1/Tenant?select=id&limit=1`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (response.status === 404) {
    console.error(`
Schema not found in Supabase yet.

1. Open Supabase → SQL Editor
2. Paste contents of: supabase-init.sql
3. Run it
4. Re-run: npm run db:seed-http
`);
    process.exit(1);
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Schema check failed (${response.status}): ${text}`);
  }
}

async function ensureAdmin() {
  if (!adminEmail || !adminPassword || adminEmail.includes("example.com") || adminPassword === "change-me-now") {
    console.log("• Skipping admin (set SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD first)");
    return null;
  }

  const listed = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listed.error) throw listed.error;
  let authUser = listed.data.users.find((user) => user.email?.toLowerCase() === adminEmail);

  if (!authUser) {
    const created = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
    });
    if (created.error) throw created.error;
    authUser = created.data.user;
    console.log(`• Created auth user ${adminEmail}`);
  } else {
    console.log(`• Reusing auth user ${adminEmail}`);
  }

  const existing = await rest("GET", "User", {
    query: `?authId=eq.${encodeURIComponent(authUser.id)}&select=*`,
  });

  if (existing?.length) {
    return existing[0];
  }

  const byEmail = await rest("GET", "User", {
    query: `?email=eq.${encodeURIComponent(adminEmail)}&select=*`,
  });
  if (byEmail?.length) {
    const updated = await rest("PATCH", "User", {
      query: `?id=eq.${byEmail[0].id}`,
      body: { authId: authUser.id, role: "OWNER", name: "OmniTaps Admin", updatedAt: nowIso() },
    });
    return updated[0];
  }

  const createdUser = await rest("POST", "User", {
    body: withTimestamps({
      id: cuidLike(),
      authId: authUser.id,
      email: adminEmail,
      name: "OmniTaps Admin",
      role: "OWNER",
    }),
  });
  console.log("• Linked Prisma User row");
  return createdUser[0];
}

async function upsertTenant(ownerUserId) {
  const existing = await rest("GET", "Tenant", {
    query: `?slug=eq.${encodeURIComponent(tenantSlug)}&select=*`,
  });

  let tenant = existing?.[0];
  if (tenant) {
    const updated = await rest("PATCH", "Tenant", {
      query: `?id=eq.${tenant.id}`,
      body: {
        name: tenantName,
        status: "ACTIVE",
        plan: "GROWTH",
        ownerUserId: ownerUserId || null,
        updatedAt: nowIso(),
      },
    });
    tenant = updated[0];
  } else {
    const created = await rest("POST", "Tenant", {
      body: withTimestamps({
        id: cuidLike(),
        name: tenantName,
        slug: tenantSlug,
        subdomain: tenantSlug,
        status: "ACTIVE",
        plan: "GROWTH",
        ownerUserId: ownerUserId || null,
        timezone: "UTC",
        locale: "en",
      }),
    });
    tenant = created[0];
  }

  if (ownerUserId) {
    const memberships = await rest("GET", "TenantMember", {
      query: `?tenantId=eq.${tenant.id}&userId=eq.${ownerUserId}&select=id`,
    });
    if (!memberships?.length) {
      await rest("POST", "TenantMember", {
        body: withTimestamps({
          id: cuidLike(),
          tenantId: tenant.id,
          userId: ownerUserId,
          role: "OWNER",
        }),
      });
    }
  }

  return tenant;
}

async function seedModules(tenant) {
  // Menu
  let menus = await rest("GET", "Menu", { query: `?tenantId=eq.${tenant.id}&select=*` });
  let menu = menus?.[0];
  if (!menu) {
    menu = (
      await rest("POST", "Menu", {
        body: withTimestamps({
          id: cuidLike(),
          tenantId: tenant.id,
          name: `${tenantName} Menu`,
          slug: "main",
          isPublished: true,
          primaryColor: "#155eef",
          secondaryColor: "#b8873b",
        }),
      })
    )[0];
  } else {
    await rest("PATCH", "Menu", {
      query: `?id=eq.${menu.id}`,
      body: { isPublished: true, name: `${tenantName} Menu`, updatedAt: nowIso() },
    });
  }

  // Reset simple categories/items for demo
  const categories = await rest("GET", "MenuCategory", {
    query: `?menuId=eq.${menu.id}&select=id`,
  });
  for (const category of categories || []) {
    await rest("DELETE", "MenuItem", { query: `?categoryId=eq.${category.id}` });
  }
  await rest("DELETE", "MenuCategory", { query: `?menuId=eq.${menu.id}` });

  const drinks = (
    await rest("POST", "MenuCategory", {
      body: withTimestamps({
        id: cuidLike(),
        menuId: menu.id,
        slug: "drinks",
        name: "Drinks",
        description: "Coffee and cold drinks",
        sortOrder: 0,
        isVisible: true,
      }),
    })
  )[0];

  await rest("POST", "MenuItem", {
    body: [
      withTimestamps({
        id: cuidLike(),
        categoryId: drinks.id,
        slug: "house-latte",
        name: "House Latte",
        description: "Espresso, steamed milk",
        priceCents: 450,
        currency: "USD",
        isAvailable: true,
        sortOrder: 0,
      }),
      withTimestamps({
        id: cuidLike(),
        categoryId: drinks.id,
        slug: "iced-tea",
        name: "Iced Tea",
        description: "Freshly brewed",
        priceCents: 350,
        currency: "USD",
        isAvailable: true,
        sortOrder: 1,
      }),
    ],
  });

  // Review profile
  const profiles = await rest("GET", "ReviewProfile", {
    query: `?tenantId=eq.${tenant.id}&select=*`,
  });
  if (!profiles?.length) {
    await rest("POST", "ReviewProfile", {
      body: withTimestamps({
        id: cuidLike(),
        tenantId: tenant.id,
        publicSlug: tenantSlug,
        googlePlaceId: `demo-${tenantSlug}-${createHash("sha1").update(tenant.id).digest("hex").slice(0, 12)}`,
        googleReviewUrl: `https://www.google.com/search?q=${encodeURIComponent(`${tenantName} reviews`)}`,
        thresholdRating: 4,
        isActive: true,
      }),
    });
  } else {
    await rest("PATCH", "ReviewProfile", {
      query: `?id=eq.${profiles[0].id}`,
      body: { isActive: true, publicSlug: tenantSlug, updatedAt: nowIso() },
    });
  }

  // Wifi
  const wifiRows = await rest("GET", "WifiNetwork", {
    query: `?tenantId=eq.${tenant.id}&qrSlug=eq.main&select=*`,
  });
  const payload = wifiPayload({
    ssid: `${tenantSlug}-guest`,
    authType: "WPA2",
    password: "omnitaps-demo",
  });
  if (!wifiRows?.length) {
    await rest("POST", "WifiNetwork", {
      body: withTimestamps({
        id: cuidLike(),
        tenantId: tenant.id,
        name: "Guest Wi‑Fi",
        ssid: `${tenantSlug}-guest`,
        password: "omnitaps-demo",
        authType: "WPA2",
        hidden: false,
        qrSlug: "main",
        qrPayload: payload,
        isActive: true,
        leadCaptureEnabled: false,
      }),
    });
  } else {
    await rest("PATCH", "WifiNetwork", {
      query: `?id=eq.${wifiRows[0].id}`,
      body: {
        ssid: `${tenantSlug}-guest`,
        password: "omnitaps-demo",
        qrPayload: payload,
        isActive: true,
        updatedAt: nowIso(),
      },
    });
  }

  // Website + page + blocks
  let websites = await rest("GET", "Website", { query: `?tenantId=eq.${tenant.id}&select=*` });
  let website = websites?.[0];
  if (!website) {
    website = (
      await rest("POST", "Website", {
        body: withTimestamps({
          id: cuidLike(),
          tenantId: tenant.id,
          name: tenantName,
          slug: tenantSlug,
          subdomain: tenantSlug,
          isPublished: true,
        }),
      })
    )[0];
  } else {
    await rest("PATCH", "Website", {
      query: `?id=eq.${website.id}`,
      body: { isPublished: true, name: tenantName, updatedAt: nowIso() },
    });
  }

  let pages = await rest("GET", "WebsitePage", {
    query: `?websiteId=eq.${website.id}&path=eq./&select=*`,
  });
  let page = pages?.[0];
  if (!page) {
    page = (
      await rest("POST", "WebsitePage", {
        body: withTimestamps({
          id: cuidLike(),
          websiteId: website.id,
          slug: "home",
          path: "/",
          title: tenantName,
          metaTitle: `${tenantName} | OmniTaps`,
          metaDescription: "Digital hospitality powered by OmniTaps.",
          isHome: true,
          isPublished: true,
          sortOrder: 0,
        }),
      })
    )[0];
  }

  await rest("DELETE", "WebsiteBlock", { query: `?pageId=eq.${page.id}` });
  await rest("POST", "WebsiteBlock", {
    body: [
      withTimestamps({
        id: cuidLike(),
        pageId: page.id,
        blockType: "HERO",
        sortOrder: 0,
        config: {
          eyebrow: "Welcome",
          title: tenantName,
          description: "Menus, reviews, Wi‑Fi, and support — one tap away.",
          primaryCta: { label: "View menu", href: `/menu/${tenantSlug}` },
          secondaryCta: { label: "Leave a review", href: `/r/${tenantSlug}/review` },
        },
      }),
      withTimestamps({
        id: cuidLike(),
        pageId: page.id,
        blockType: "MENU_EMBED",
        sortOrder: 1,
        config: {
          title: "Guest favorites",
          categories: [
            {
              title: "Drinks",
              items: [
                { name: "House Latte", price: "$4.50" },
                { name: "Iced Tea", price: "$3.50" },
              ],
            },
          ],
        },
      }),
    ],
  });

  // Chatbot
  const bots = await rest("GET", "ChatbotBot", { query: `?tenantId=eq.${tenant.id}&select=*` });
  if (!bots?.length) {
    await rest("POST", "ChatbotBot", {
      body: withTimestamps({
        id: cuidLike(),
        tenantId: tenant.id,
        name: `${tenantName} Assistant`,
        slug: "main",
        publicPath: `/s/${tenantSlug}`,
        isActive: true,
        confidenceThreshold: 0.65,
        handoverThreshold: 0.4,
      }),
    });
  } else {
    await rest("PATCH", "ChatbotBot", {
      query: `?id=eq.${bots[0].id}`,
      body: { isActive: true, updatedAt: nowIso() },
    });
  }
}

const admin = await (async () => {
  await assertSchemaReady();
  return ensureAdmin();
})();

const tenant = await upsertTenant(admin?.id);
await seedModules(tenant);

console.log("\n✓ HTTPS seed complete");
console.log(`  /menu/${tenantSlug}`);
console.log(`  /r/${tenantSlug}/review`);
console.log(`  /r/${tenantSlug}/wifi`);
console.log(`  /s/${tenantSlug}`);
if (admin) console.log(`  /login  (${adminEmail})`);
console.log("\nNote: local Prisma TCP may still be blocked; Vercel deploy often works from the cloud.");
