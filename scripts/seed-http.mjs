#!/usr/bin/env node
/**
 * Seed OmniTaps over HTTPS (Supabase Auth Admin + PostgREST).
 * Use when local Postgres TCP is blocked but Supabase API works.
 * Prerequisite: run supabase-init.sql in the Supabase SQL Editor first.
 */
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
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
const WIFI_PASSWORD = "omnitaps-demo";
const CAFE_ADDRESS = "14 Harbor Lane, Demo City";
const CAFE_HOURS = [
  { label: "Monday – Friday", hours: "7:00 AM – 6:00 PM" },
  { label: "Saturday – Sunday", hours: "8:00 AM – 5:00 PM" },
];
const CAFE_HOURS_TEXT = `${tenantName} is open Monday–Friday 7:00 AM–6:00 PM and Saturday–Sunday 8:00 AM–5:00 PM. The kitchen closes 30 minutes before the door. Walk-ins welcome; we do not take table reservations.`;

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
          primaryColor: "#c45c26",
          secondaryColor: "#c4a35a",
        }),
      })
    )[0];
  } else {
    await rest("PATCH", "Menu", {
      query: `?id=eq.${menu.id}`,
      body: {
        isPublished: true,
        name: `${tenantName} Menu`,
        primaryColor: "#c45c26",
        secondaryColor: "#c4a35a",
        updatedAt: nowIso(),
      },
    });
  }

  const categories = await rest("GET", "MenuCategory", {
    query: `?menuId=eq.${menu.id}&select=id`,
  });
  for (const category of categories || []) {
    const items = await rest("GET", "MenuItem", {
      query: `?categoryId=eq.${category.id}&select=id`,
    });
    for (const item of items || []) {
      await rest("DELETE", "MenuItemAllergen", { query: `?menuItemId=eq.${item.id}` });
    }
    await rest("DELETE", "MenuItem", { query: `?categoryId=eq.${category.id}` });
  }
  await rest("DELETE", "MenuCategory", { query: `?menuId=eq.${menu.id}` });
  await rest("DELETE", "MenuAllergen", { query: `?menuId=eq.${menu.id}` });

  const allergenRows = await rest("POST", "MenuAllergen", {
    body: [
      withTimestamps({ id: cuidLike(), menuId: menu.id, slug: "dairy", name: "Dairy" }),
      withTimestamps({ id: cuidLike(), menuId: menu.id, slug: "gluten", name: "Gluten" }),
      withTimestamps({ id: cuidLike(), menuId: menu.id, slug: "nuts", name: "Tree nuts" }),
      withTimestamps({ id: cuidLike(), menuId: menu.id, slug: "egg", name: "Egg" }),
    ],
  });
  const allergenBySlug = Object.fromEntries((allergenRows || []).map((row) => [row.slug, row.id]));

  async function createCategory(data, items) {
    const category = (
      await rest("POST", "MenuCategory", {
        body: withTimestamps({
          id: cuidLike(),
          menuId: menu.id,
          isVisible: true,
          ...data,
        }),
      })
    )[0];
    const createdItems = await rest("POST", "MenuItem", {
      body: items.map((item, index) =>
        withTimestamps({
          id: cuidLike(),
          categoryId: category.id,
          currency: "USD",
          isAvailable: item.isAvailable !== false,
          sortOrder: index,
          slug: item.slug,
          name: item.name,
          description: item.description,
          priceCents: item.priceCents,
          outOfStockNote: item.outOfStockNote ?? null,
        }),
      ),
    });
    const links = [];
    const ts = nowIso();
    for (const [index, item] of items.entries()) {
      for (const slug of item.allergens || []) {
        links.push({
          menuItemId: createdItems[index].id,
          menuAllergenId: allergenBySlug[slug],
          createdAt: ts,
          updatedAt: ts,
        });
      }
    }
    if (links.length) {
      await rest("POST", "MenuItemAllergen", { body: links });
    }
  }

  await createCategory(
    { slug: "drinks", name: "Drinks", description: "Espresso, tea, and cold pours", sortOrder: 0 },
    [
      {
        slug: "house-latte",
        name: "House Latte",
        description: "Double espresso with steamed milk and a thin layer of foam.",
        priceCents: 450,
        outOfStockNote: "Popular",
        allergens: ["dairy"],
      },
      {
        slug: "flat-white",
        name: "Flat White",
        description: "Ristretto shots stretched with velvety microfoam.",
        priceCents: 475,
        allergens: ["dairy"],
      },
      {
        slug: "iced-oat-cortado",
        name: "Iced Oat Cortado",
        description: "Equal parts espresso and oat milk over ice.",
        priceCents: 525,
      },
      {
        slug: "iced-tea",
        name: "Citrus Iced Tea",
        description: "House-brewed black tea with lemon peel and mint.",
        priceCents: 350,
      },
      {
        slug: "house-filter",
        name: "House Filter",
        description: "Rotating single origin, batch-brewed. Ask the bar for today's origin.",
        priceCents: 375,
      },
    ],
  );

  await createCategory(
    { slug: "plates", name: "Plates", description: "All-day café plates", sortOrder: 1 },
    [
      {
        slug: "avocado-toast",
        name: "Avocado Toast",
        description: "Sourdough, smashed avocado, chili flake, lemon, and olive oil.",
        priceCents: 1200,
        outOfStockNote: "Popular",
        allergens: ["gluten"],
      },
      {
        slug: "seasonal-shakshuka",
        name: "Seasonal Shakshuka",
        description: "Tomato-pepper stew, baked eggs, and grilled focaccia.",
        priceCents: 1450,
        isAvailable: false,
        outOfStockNote: "Sold out",
        allergens: ["egg", "gluten"],
      },
      {
        slug: "grain-bowl",
        name: "Citrus Grain Bowl",
        description: "Farro, roasted squash, herbs, and tahini lemon dressing.",
        priceCents: 1350,
        allergens: ["gluten"],
      },
      {
        slug: "ham-gruyere-croissant",
        name: "Ham & Gruyère Croissant",
        description: "Buttery croissant, smoked ham, melted Gruyère, Dijon.",
        priceCents: 950,
        allergens: ["gluten", "dairy"],
      },
    ],
  );

  await createCategory(
    { slug: "sweets", name: "Sweets", description: "Bakes from the pastry counter", sortOrder: 2 },
    [
      {
        slug: "olive-oil-cake",
        name: "Olive Oil Cake",
        description: "Citrus loaf with a crackly sugar top.",
        priceCents: 650,
        allergens: ["gluten", "egg"],
      },
      {
        slug: "dark-chocolate-cookie",
        name: "Dark Chocolate Cookie",
        description: "Sea salt, 70% chocolate, toasted hazelnut.",
        priceCents: 425,
        allergens: ["gluten", "nuts", "egg"],
      },
      {
        slug: "affogato",
        name: "Affogato",
        description: "Vanilla gelato drowned in a hot espresso shot.",
        priceCents: 600,
        allergens: ["dairy"],
      },
    ],
  );

  const profiles = await rest("GET", "ReviewProfile", {
    query: `?tenantId=eq.${tenant.id}&select=*`,
  });
  const googleReviewUrl =
    "https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4";
  if (!profiles?.length) {
    await rest("POST", "ReviewProfile", {
      body: withTimestamps({
        id: cuidLike(),
        tenantId: tenant.id,
        publicSlug: tenantSlug,
        googlePlaceId: "ChIJN1t_tDeuEmsRUsoyG83frY4",
        googleReviewUrl,
        thresholdRating: 4,
        isActive: true,
      }),
    });
  } else {
    await rest("PATCH", "ReviewProfile", {
      query: `?id=eq.${profiles[0].id}`,
      body: {
        isActive: true,
        publicSlug: tenantSlug,
        googlePlaceId: "ChIJN1t_tDeuEmsRUsoyG83frY4",
        googleReviewUrl,
        updatedAt: nowIso(),
      },
    });
  }

  const wifiSsid = `${tenantSlug}-guest`;
  const payload = wifiPayload({
    ssid: wifiSsid,
    authType: "WPA2",
    password: WIFI_PASSWORD,
  });
  const wifiRows = await rest("GET", "WifiNetwork", {
    query: `?tenantId=eq.${tenant.id}&qrSlug=eq.main&select=*`,
  });
  let wifi = wifiRows?.[0];
  if (!wifi) {
    wifi = (
      await rest("POST", "WifiNetwork", {
        body: withTimestamps({
          id: cuidLike(),
          tenantId: tenant.id,
          name: "Guest Wi‑Fi",
          ssid: wifiSsid,
          password: WIFI_PASSWORD,
          authType: "WPA2",
          hidden: false,
          qrSlug: "main",
          qrPayload: payload,
          isActive: true,
          leadCaptureEnabled: false,
        }),
      })
    )[0];
  } else {
    wifi = (
      await rest("PATCH", "WifiNetwork", {
        query: `?id=eq.${wifi.id}`,
        body: {
          ssid: wifiSsid,
          password: WIFI_PASSWORD,
          qrPayload: payload,
          isActive: true,
          updatedAt: nowIso(),
        },
      })
    )[0];
  }

  const splashHeadline = `${tenantName} guest Wi‑Fi`;
  const splashBody = `This is ${tenantName} guest Wi‑Fi for visitors on the floor. Scan the QR with your phone camera to join, or copy the password if you are on a laptop. Network name is ${wifiSsid}.`;
  const splashes = await rest("GET", "WifiSplashPage", {
    query: `?networkId=eq.${wifi.id}&select=id`,
  });
  if (!splashes?.length) {
    await rest("POST", "WifiSplashPage", {
      body: withTimestamps({
        id: cuidLike(),
        networkId: wifi.id,
        headline: splashHeadline,
        body: splashBody,
        requiresConsent: false,
        revealCredentialsAfterSubmit: true,
      }),
    });
  } else {
    await rest("PATCH", "WifiSplashPage", {
      query: `?id=eq.${splashes[0].id}`,
      body: { headline: splashHeadline, body: splashBody, updatedAt: nowIso() },
    });
  }

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
  const pageMeta = {
    title: tenantName,
    metaTitle: `${tenantName} · Harbor Lane`,
    metaDescription: `${tenantName} at ${CAFE_ADDRESS}. Coffee, all-day plates, and a quiet corner to sit.`,
    isHome: true,
    isPublished: true,
  };
  if (!page) {
    page = (
      await rest("POST", "WebsitePage", {
        body: withTimestamps({
          id: cuidLike(),
          websiteId: website.id,
          slug: "home",
          path: "/",
          sortOrder: 0,
          ...pageMeta,
        }),
      })
    )[0];
  } else {
    await rest("PATCH", "WebsitePage", {
      query: `?id=eq.${page.id}`,
      body: { ...pageMeta, updatedAt: nowIso() },
    });
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
          eyebrow: "Harbor Lane",
          title: tenantName,
          description:
            "Espresso, all-day plates, and a quiet corner facing the harbor. Scan a table QR for the menu, guest Wi‑Fi, or a review — or ask the café assistant on this page.",
          badge: "Open today",
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
          title: "On the counter today",
          description: "A snapshot of the guest menu. The full list lives on the table QR.",
          categories: [
            {
              title: "Drinks",
              items: [
                { name: "House Latte", price: "$4.50", description: "Double espresso, steamed milk", badge: "Popular" },
                { name: "Flat White", price: "$4.75", description: "Ristretto and microfoam" },
                { name: "Iced Oat Cortado", price: "$5.25", description: "Espresso and oat milk over ice" },
                { name: "Citrus Iced Tea", price: "$3.50" },
                { name: "House Filter", price: "$3.75", description: "Rotating single origin" },
              ],
            },
            {
              title: "Plates",
              items: [
                { name: "Avocado Toast", price: "$12.00", badge: "Popular" },
                { name: "Seasonal Shakshuka", price: "$14.50", badge: "Sold out" },
                { name: "Citrus Grain Bowl", price: "$13.50" },
                { name: "Ham & Gruyère Croissant", price: "$9.50" },
              ],
            },
            {
              title: "Sweets",
              items: [
                { name: "Olive Oil Cake", price: "$6.50" },
                { name: "Dark Chocolate Cookie", price: "$4.25" },
                { name: "Affogato", price: "$6.00" },
              ],
            },
          ],
        },
      }),
      withTimestamps({
        id: cuidLike(),
        pageId: page.id,
        blockType: "HOURS",
        sortOrder: 2,
        config: {
          eyebrow: "Visit",
          title: "Hours",
          description: "Kitchen closes 30 minutes before the door. Walk-ins welcome.",
          days: CAFE_HOURS,
        },
      }),
      withTimestamps({
        id: cuidLike(),
        pageId: page.id,
        blockType: "MAP",
        sortOrder: 3,
        config: {
          title: "Find us",
          description: "A short walk from the harbor tram stop. Street parking on Harbor Lane after 10 AM.",
          address: CAFE_ADDRESS,
          embedUrl:
            "https://www.openstreetmap.org/export/embed.html?bbox=-0.142%2C51.501%2C-0.124%2C51.510&layer=mapnik&marker=51.5055%2C-0.133",
          directionsUrl: "https://www.openstreetmap.org/?mlat=51.5055&mlon=-0.133#map=16/51.5055/-0.133",
        },
      }),
      withTimestamps({
        id: cuidLike(),
        pageId: page.id,
        blockType: "GALLERY",
        sortOrder: 4,
        config: {
          title: "Inside the café",
          description: "Counter, window seats, and the pastry case.",
          columns: 3,
          images: [
            {
              src: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80",
              alt: "Espresso being poured",
              caption: "Bar",
            },
            {
              src: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80",
              alt: "Café interior with tables",
              caption: "Floor",
            },
            {
              src: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80",
              alt: "Coffee shop storefront",
              caption: "Harbor Lane",
            },
          ],
        },
      }),
      withTimestamps({
        id: cuidLike(),
        pageId: page.id,
        blockType: "CTA",
        sortOrder: 5,
        config: {
          eyebrow: "After your visit",
          title: "Tell us how we did — or get online",
          description: "Happy guests go to Google. Anything we should fix stays private. Guest Wi‑Fi is one tap away.",
          primaryCta: { label: "Leave a review", href: `/r/${tenantSlug}/review` },
          secondaryCta: { label: "Join Wi‑Fi", href: `/r/${tenantSlug}/wifi` },
        },
      }),
    ],
  });

  const bots = await rest("GET", "ChatbotBot", { query: `?tenantId=eq.${tenant.id}&select=*` });
  let bot = bots?.[0];
  if (!bot) {
    bot = (
      await rest("POST", "ChatbotBot", {
        body: withTimestamps({
          id: cuidLike(),
          tenantId: tenant.id,
          name: tenantName,
          slug: "main",
          publicPath: `/s/${tenantSlug}`,
          isActive: true,
          confidenceThreshold: 0.65,
          handoverThreshold: 0.4,
        }),
      })
    )[0];
  } else {
    bot = (
      await rest("PATCH", "ChatbotBot", {
        query: `?id=eq.${bot.id}`,
        body: { isActive: true, name: tenantName, updatedAt: nowIso() },
      })
    )[0];
  }

  await rest("DELETE", "ChatbotKnowledgeSource", { query: `?botId=eq.${bot.id}` });
  await rest("POST", "ChatbotKnowledgeSource", {
    body: [
      withTimestamps({
        id: cuidLike(),
        botId: bot.id,
        sourceType: "HOURS",
        title: "Opening hours",
        isActive: true,
        content: {
          keywords: ["hours", "open", "close", "opening", "when", "schedule", "kitchen"],
          days: CAFE_HOURS,
          text: CAFE_HOURS_TEXT,
        },
      }),
      withTimestamps({
        id: cuidLike(),
        botId: bot.id,
        sourceType: "MENU",
        title: "Menu highlights",
        isActive: true,
        content: {
          keywords: [
            "menu",
            "latte",
            "toast",
            "eat",
            "drink",
            "coffee",
            "dessert",
            "shakshuka",
            "affogato",
            "oat",
            "croissant",
            "filter",
          ],
          items: [
            { name: "House Latte", price: "$4.50", description: "Popular" },
            { name: "House Filter", price: "$3.75" },
            { name: "Avocado Toast", price: "$12.00" },
            { name: "Seasonal Shakshuka", price: "$14.50", description: "Sold out today" },
            { name: "Ham & Gruyère Croissant", price: "$9.50" },
            { name: "Olive Oil Cake", price: "$6.50" },
          ],
          text: "Drinks: House Latte, Flat White, Iced Oat Cortado, Citrus Iced Tea, and House Filter. Oat milk is available on espresso drinks. Plates: Avocado Toast, Seasonal Shakshuka (sold out today), Citrus Grain Bowl, and Ham & Gruyère Croissant. Sweets: Olive Oil Cake, Dark Chocolate Cookie, and Affogato. Full menu at /menu/demo.",
        },
      }),
      withTimestamps({
        id: cuidLike(),
        botId: bot.id,
        sourceType: "WIFI",
        title: "Guest Wi‑Fi",
        isActive: true,
        content: {
          keywords: ["wifi", "wi-fi", "password", "ssid", "network", "internet"],
          text: `This is ${tenantName} guest Wi‑Fi. SSID is ${wifiSsid} and the password is ${WIFI_PASSWORD}. Open /r/${tenantSlug}/wifi to copy the password or scan the QR code.`,
        },
      }),
      withTimestamps({
        id: cuidLike(),
        botId: bot.id,
        sourceType: "FAQ",
        title: "How to leave a review",
        isActive: true,
        content: {
          keywords: ["review", "google", "feedback", "rating", "stars"],
          questions: ["how do i leave a review", "leave a review", "google review"],
          text: `Leave a review at /r/${tenantSlug}/review. Ratings of 4 or 5 stars continue to Google. Ratings of 1 to 3 stars open a private form for the café team.`,
        },
      }),
      withTimestamps({
        id: cuidLike(),
        botId: bot.id,
        sourceType: "FAQ",
        title: "Location and visiting",
        isActive: true,
        content: {
          keywords: ["address", "where", "parking", "reservation", "book", "location", "harbor"],
          questions: ["where are you", "do you take reservations", "is there parking"],
          text: `${tenantName} is at ${CAFE_ADDRESS}, a short walk from the harbor tram. Street parking on Harbor Lane after 10 AM. We are walk-in only — no table reservations.`,
        },
      }),
    ],
  });
}

try {
  const admin = await (async () => {
    await assertSchemaReady();
    return ensureAdmin();
  })();

  const tenant = await upsertTenant(admin?.id);
  await seedModules(tenant);

  console.log("\n✓ HTTPS seed complete");
  console.log(`  Demo hub:    /demo`);
  console.log(`  /menu/${tenantSlug}`);
  console.log(`  /r/${tenantSlug}/review`);
  console.log(`  /r/${tenantSlug}/wifi`);
  console.log(`  /s/${tenantSlug}`);
  if (admin) console.log(`  /login  (${adminEmail})`);
  console.log("\nNote: local Prisma TCP may still be blocked until DATABASE_URL has the real password.");
} catch (error) {
  console.error(error);
  process.exit(1);
}
