import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import { isUsableDatabaseUrl } from "../api/_lib/databaseUrl.js";

const prisma = new PrismaClient();

const TENANT_SLUG = process.env.SEED_TENANT_SLUG || "demo";
const TENANT_NAME = process.env.SEED_TENANT_NAME || "Demo Café";
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "";
const WIFI_PASSWORD = "omnitaps-demo";
const CAFE_ADDRESS = "14 Harbor Lane, Demo City";
const CAFE_HOURS = [
  { label: "Monday – Friday", hours: "7:00 AM – 6:00 PM" },
  { label: "Saturday – Sunday", hours: "8:00 AM – 5:00 PM" },
];
const CAFE_HOURS_TEXT =
  `${TENANT_NAME} is open Monday–Friday 7:00 AM–6:00 PM and Saturday–Sunday 8:00 AM–5:00 PM. The kitchen closes 30 minutes before the door. Walk-ins welcome; we do not take table reservations.`;

function buildWifiPayload({ ssid, authType, password, hidden = false }) {
  const escape = (value) => String(value).replace(/([\\;,:"])/g, "\\$1");
  const parts = [`WIFI:T:${authType}`, `S:${escape(ssid)}`];
  if (authType !== "OPEN") {
    parts.push(`P:${escape(password)}`);
  }
  parts.push(`H:${hidden ? "true" : "false"}`);
  return `${parts.join(";")};`;
}

async function ensureAdminUser() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.log("• Skipping admin auth user (set SEED_ADMIN_EMAIL + SEED_ADMIN_PASSWORD to auto-create)");
    return null;
  }

  const url = process.env.SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) {
    console.log("• Skipping admin auth user (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing)");
    return null;
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let authId = null;

  const listed = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listed.error) {
    throw new Error(`Supabase listUsers failed: ${listed.error.message}`);
  }

  const existing = listed.data.users.find(
    (user) => user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase(),
  );

  if (existing) {
    authId = existing.id;
    console.log(`• Reusing Supabase user ${ADMIN_EMAIL}`);
  } else {
    const created = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
    });
    if (created.error) {
      throw new Error(`Supabase createUser failed: ${created.error.message}`);
    }
    authId = created.data.user.id;
    console.log(`• Created Supabase user ${ADMIN_EMAIL}`);
  }

  const user = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL.toLowerCase() },
    update: {
      authId,
      name: "OmniTaps Admin",
      role: "OWNER",
    },
    create: {
      authId,
      email: ADMIN_EMAIL.toLowerCase(),
      name: "OmniTaps Admin",
      role: "OWNER",
    },
  });

  console.log(`• Linked Prisma User ${user.id}`);
  return user;
}

async function seedTenant(ownerUserId) {
  const tenant = await prisma.tenant.upsert({
    where: { slug: TENANT_SLUG },
    update: {
      name: TENANT_NAME,
      status: "ACTIVE",
      plan: "GROWTH",
      ownerUserId: ownerUserId ?? undefined,
    },
    create: {
      name: TENANT_NAME,
      slug: TENANT_SLUG,
      subdomain: TENANT_SLUG,
      status: "ACTIVE",
      plan: "GROWTH",
      ownerUserId: ownerUserId ?? undefined,
    },
  });

  if (ownerUserId) {
    await prisma.tenantMember.upsert({
      where: {
        tenantId_userId: {
          tenantId: tenant.id,
          userId: ownerUserId,
        },
      },
      update: { role: "OWNER" },
      create: {
        tenantId: tenant.id,
        userId: ownerUserId,
        role: "OWNER",
      },
    });
  }

  const menu = await prisma.menu.upsert({
    where: { tenantId: tenant.id },
    update: {
      name: `${TENANT_NAME} Menu`,
      slug: "main",
      isPublished: true,
      primaryColor: "#c45c26",
      secondaryColor: "#c4a35a",
    },
    create: {
      tenantId: tenant.id,
      name: `${TENANT_NAME} Menu`,
      slug: "main",
      isPublished: true,
      primaryColor: "#c45c26",
      secondaryColor: "#c4a35a",
    },
  });

  await prisma.menuItemAllergen.deleteMany({
    where: { menuItem: { category: { menuId: menu.id } } },
  });
  await prisma.menuItem.deleteMany({
    where: { category: { menuId: menu.id } },
  });
  await prisma.menuAllergen.deleteMany({ where: { menuId: menu.id } });
  await prisma.menuCategory.deleteMany({ where: { menuId: menu.id } });

  const [dairy, gluten, nuts, egg] = await Promise.all([
    prisma.menuAllergen.create({ data: { menuId: menu.id, slug: "dairy", name: "Dairy" } }),
    prisma.menuAllergen.create({ data: { menuId: menu.id, slug: "gluten", name: "Gluten" } }),
    prisma.menuAllergen.create({ data: { menuId: menu.id, slug: "nuts", name: "Tree nuts" } }),
    prisma.menuAllergen.create({ data: { menuId: menu.id, slug: "egg", name: "Egg" } }),
  ]);

  const drinks = await prisma.menuCategory.create({
    data: {
      menuId: menu.id,
      slug: "drinks",
      name: "Drinks",
      description: "Espresso, tea, and cold pours",
      sortOrder: 0,
      isVisible: true,
      items: {
        create: [
          {
            slug: "house-latte",
            name: "House Latte",
            description: "Double espresso with steamed milk and a thin layer of foam.",
            priceCents: 450,
            currency: "USD",
            isAvailable: true,
            outOfStockNote: "Popular",
            sortOrder: 0,
            allergenLinks: { create: [{ menuAllergenId: dairy.id }] },
          },
          {
            slug: "flat-white",
            name: "Flat White",
            description: "Ristretto shots stretched with velvety microfoam.",
            priceCents: 475,
            currency: "USD",
            isAvailable: true,
            sortOrder: 1,
            allergenLinks: { create: [{ menuAllergenId: dairy.id }] },
          },
          {
            slug: "iced-oat-cortado",
            name: "Iced Oat Cortado",
            description: "Equal parts espresso and oat milk over ice.",
            priceCents: 525,
            currency: "USD",
            isAvailable: true,
            sortOrder: 2,
          },
          {
            slug: "iced-tea",
            name: "Citrus Iced Tea",
            description: "House-brewed black tea with lemon peel and mint.",
            priceCents: 350,
            currency: "USD",
            isAvailable: true,
            sortOrder: 3,
          },
          {
            slug: "house-filter",
            name: "House Filter",
            description: "Rotating single origin, batch-brewed. Ask the bar for today's origin.",
            priceCents: 375,
            currency: "USD",
            isAvailable: true,
            sortOrder: 4,
          },
        ],
      },
    },
  });

  const plates = await prisma.menuCategory.create({
    data: {
      menuId: menu.id,
      slug: "plates",
      name: "Plates",
      description: "All-day café plates",
      sortOrder: 1,
      isVisible: true,
      items: {
        create: [
          {
            slug: "avocado-toast",
            name: "Avocado Toast",
            description: "Sourdough, smashed avocado, chili flake, lemon, and olive oil.",
            priceCents: 1200,
            currency: "USD",
            isAvailable: true,
            outOfStockNote: "Popular",
            sortOrder: 0,
            allergenLinks: { create: [{ menuAllergenId: gluten.id }] },
          },
          {
            slug: "seasonal-shakshuka",
            name: "Seasonal Shakshuka",
            description: "Tomato-pepper stew, baked eggs, and grilled focaccia.",
            priceCents: 1450,
            currency: "USD",
            isAvailable: false,
            outOfStockNote: "Sold out",
            sortOrder: 1,
            allergenLinks: {
              create: [{ menuAllergenId: egg.id }, { menuAllergenId: gluten.id }],
            },
          },
          {
            slug: "grain-bowl",
            name: "Citrus Grain Bowl",
            description: "Farro, roasted squash, herbs, and tahini lemon dressing.",
            priceCents: 1350,
            currency: "USD",
            isAvailable: true,
            sortOrder: 2,
            allergenLinks: { create: [{ menuAllergenId: gluten.id }] },
          },
          {
            slug: "ham-gruyere-croissant",
            name: "Ham & Gruyère Croissant",
            description: "Buttery croissant, smoked ham, melted Gruyère, Dijon.",
            priceCents: 950,
            currency: "USD",
            isAvailable: true,
            sortOrder: 3,
            allergenLinks: {
              create: [
                { menuAllergenId: gluten.id },
                { menuAllergenId: dairy.id },
              ],
            },
          },
        ],
      },
    },
  });

  const sweets = await prisma.menuCategory.create({
    data: {
      menuId: menu.id,
      slug: "sweets",
      name: "Sweets",
      description: "Bakes from the pastry counter",
      sortOrder: 2,
      isVisible: true,
      items: {
        create: [
          {
            slug: "olive-oil-cake",
            name: "Olive Oil Cake",
            description: "Citrus loaf with a crackly sugar top.",
            priceCents: 650,
            currency: "USD",
            isAvailable: true,
            sortOrder: 0,
            allergenLinks: {
              create: [{ menuAllergenId: gluten.id }, { menuAllergenId: egg.id }],
            },
          },
          {
            slug: "dark-chocolate-cookie",
            name: "Dark Chocolate Cookie",
            description: "Sea salt, 70% chocolate, toasted hazelnut.",
            priceCents: 425,
            currency: "USD",
            isAvailable: true,
            sortOrder: 1,
            allergenLinks: {
              create: [
                { menuAllergenId: gluten.id },
                { menuAllergenId: nuts.id },
                { menuAllergenId: egg.id },
              ],
            },
          },
          {
            slug: "affogato",
            name: "Affogato",
            description: "Vanilla gelato drowned in a hot espresso shot.",
            priceCents: 600,
            currency: "USD",
            isAvailable: true,
            sortOrder: 2,
            allergenLinks: { create: [{ menuAllergenId: dairy.id }] },
          },
        ],
      },
    },
  });

  void drinks;
  void plates;
  void sweets;

  await prisma.reviewProfile.upsert({
    where: { tenantId: tenant.id },
    update: {
      publicSlug: TENANT_SLUG,
      googlePlaceId: "ChIJN1t_tDeuEmsRUsoyG83frY4",
      googleReviewUrl:
        "https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4",
      thresholdRating: 4,
      isActive: true,
    },
    create: {
      tenantId: tenant.id,
      publicSlug: TENANT_SLUG,
      googlePlaceId: "ChIJN1t_tDeuEmsRUsoyG83frY4",
      googleReviewUrl:
        "https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4",
      thresholdRating: 4,
      isActive: true,
    },
  });

  const wifiSsid = `${TENANT_SLUG}-guest`;
  const wifiPayload = buildWifiPayload({
    ssid: wifiSsid,
    authType: "WPA2",
    password: WIFI_PASSWORD,
    hidden: false,
  });

  const existingWifi = await prisma.wifiNetwork.findFirst({
    where: { tenantId: tenant.id, qrSlug: "main" },
  });

  const wifiNetwork = existingWifi
    ? await prisma.wifiNetwork.update({
        where: { id: existingWifi.id },
        data: {
          name: "Guest Wi‑Fi",
          ssid: wifiSsid,
          password: WIFI_PASSWORD,
          authType: "WPA2",
          hidden: false,
          qrPayload: wifiPayload,
          isActive: true,
          leadCaptureEnabled: false,
        },
      })
    : await prisma.wifiNetwork.create({
        data: {
          tenantId: tenant.id,
          name: "Guest Wi‑Fi",
          ssid: wifiSsid,
          password: WIFI_PASSWORD,
          authType: "WPA2",
          hidden: false,
          qrSlug: "main",
          qrPayload: wifiPayload,
          isActive: true,
          leadCaptureEnabled: false,
        },
      });

  const wifiSplashHeadline = `${TENANT_NAME} guest Wi‑Fi`;
  const wifiSplashBody = `This is ${TENANT_NAME} guest Wi‑Fi for visitors on the floor. Scan the QR with your phone camera to join, or copy the password if you are on a laptop. Network name is ${wifiSsid}.`;

  await prisma.wifiSplashPage.upsert({
    where: { networkId: wifiNetwork.id },
    update: {
      headline: wifiSplashHeadline,
      body: wifiSplashBody,
      requiresConsent: false,
      revealCredentialsAfterSubmit: true,
    },
    create: {
      networkId: wifiNetwork.id,
      headline: wifiSplashHeadline,
      body: wifiSplashBody,
      requiresConsent: false,
      revealCredentialsAfterSubmit: true,
    },
  });

  const website = await prisma.website.upsert({
    where: { tenantId: tenant.id },
    update: {
      name: TENANT_NAME,
      slug: TENANT_SLUG,
      subdomain: TENANT_SLUG,
      isPublished: true,
    },
    create: {
      tenantId: tenant.id,
      name: TENANT_NAME,
      slug: TENANT_SLUG,
      subdomain: TENANT_SLUG,
      isPublished: true,
    },
  });

  const homePage =
    (await prisma.websitePage.findFirst({
      where: { websiteId: website.id, path: "/" },
    })) ||
    (await prisma.websitePage.create({
      data: {
        websiteId: website.id,
        slug: "home",
        path: "/",
        title: TENANT_NAME,
        metaTitle: `${TENANT_NAME} · Harbor Lane`,
        metaDescription: `${TENANT_NAME} at ${CAFE_ADDRESS}. Coffee, all-day plates, and a quiet corner to sit.`,
        isHome: true,
        isPublished: true,
        sortOrder: 0,
      },
    }));

  await prisma.websitePage.update({
    where: { id: homePage.id },
    data: {
      title: TENANT_NAME,
      metaTitle: `${TENANT_NAME} · Harbor Lane`,
      metaDescription: `${TENANT_NAME} at ${CAFE_ADDRESS}. Coffee, all-day plates, and a quiet corner to sit.`,
      isHome: true,
      isPublished: true,
    },
  });

  await prisma.websiteBlock.deleteMany({ where: { pageId: homePage.id } });
  await prisma.websiteBlock.createMany({
    data: [
      {
        pageId: homePage.id,
        blockType: "HERO",
        sortOrder: 0,
        config: {
          eyebrow: "Harbor Lane",
          title: TENANT_NAME,
          description:
            "Espresso, all-day plates, and a quiet corner facing the harbor. Scan a table QR for the menu, guest Wi‑Fi, or a review — or ask the café assistant on this page.",
          badge: "Open today",
          primaryCta: { label: "View menu", href: `/menu/${TENANT_SLUG}` },
          secondaryCta: { label: "Leave a review", href: `/r/${TENANT_SLUG}/review` },
        },
      },
      {
        pageId: homePage.id,
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
      },
      {
        pageId: homePage.id,
        blockType: "HOURS",
        sortOrder: 2,
        config: {
          eyebrow: "Visit",
          title: "Hours",
          description: "Kitchen closes 30 minutes before the door. Walk-ins welcome.",
          days: CAFE_HOURS,
        },
      },
      {
        pageId: homePage.id,
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
      },
      {
        pageId: homePage.id,
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
      },
      {
        pageId: homePage.id,
        blockType: "CTA",
        sortOrder: 5,
        config: {
          eyebrow: "After your visit",
          title: "Tell us how we did — or get online",
          description: "Happy guests go to Google. Anything we should fix stays private. Guest Wi‑Fi is one tap away.",
          primaryCta: { label: "Leave a review", href: `/r/${TENANT_SLUG}/review` },
          secondaryCta: { label: "Join Wi‑Fi", href: `/r/${TENANT_SLUG}/wifi` },
        },
      },
    ],
  });

  const bot = await prisma.chatbotBot.upsert({
    where: { tenantId: tenant.id },
    update: {
      name: TENANT_NAME,
      slug: "main",
      publicPath: `/s/${TENANT_SLUG}`,
      isActive: true,
    },
    create: {
      tenantId: tenant.id,
      name: TENANT_NAME,
      slug: "main",
      publicPath: `/s/${TENANT_SLUG}`,
      isActive: true,
    },
  });

  await prisma.chatbotKnowledgeSource.deleteMany({ where: { botId: bot.id } });
  await prisma.chatbotKnowledgeSource.createMany({
    data: [
      {
        botId: bot.id,
        sourceType: "HOURS",
        title: "Opening hours",
        isActive: true,
        content: {
          keywords: ["hours", "open", "close", "opening", "when", "schedule", "kitchen"],
          days: CAFE_HOURS,
          text: CAFE_HOURS_TEXT,
        },
      },
      {
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
      },
      {
        botId: bot.id,
        sourceType: "WIFI",
        title: "Guest Wi‑Fi",
        isActive: true,
        content: {
          keywords: ["wifi", "wi-fi", "password", "ssid", "network", "internet"],
          text: `This is ${TENANT_NAME} guest Wi‑Fi. SSID is ${wifiSsid} and the password is ${WIFI_PASSWORD}. Open /r/${TENANT_SLUG}/wifi to copy the password or scan the QR code.`,
        },
      },
      {
        botId: bot.id,
        sourceType: "FAQ",
        title: "How to leave a review",
        isActive: true,
        content: {
          keywords: ["review", "google", "feedback", "rating", "stars"],
          questions: ["how do i leave a review", "leave a review", "google review"],
          text: `Leave a review at /r/${TENANT_SLUG}/review. Ratings of 4 or 5 stars continue to Google. Ratings of 1 to 3 stars open a private form for the café team.`,
        },
      },
      {
        botId: bot.id,
        sourceType: "FAQ",
        title: "Location and visiting",
        isActive: true,
        content: {
          keywords: ["address", "where", "parking", "reservation", "book", "location", "harbor"],
          questions: ["where are you", "do you take reservations", "is there parking"],
          text: `${TENANT_NAME} is at ${CAFE_ADDRESS}, a short walk from the harbor tram. Street parking on Harbor Lane after 10 AM. We are walk-in only — no table reservations.`,
        },
      },
    ],
  });

  return tenant;
}

async function main() {
  const databaseUrl = process.env.POSTGRES_PRISMA_URL?.trim() || process.env.DATABASE_URL?.trim() || "";
  if (!isUsableDatabaseUrl(databaseUrl)) {
    throw new Error(
      "DATABASE_URL still has a placeholder password ([YOUR-PASSWORD]) or is empty. Paste the real Postgres URI from Supabase, or run: npm run db:seed-http",
    );
  }

  const admin = await ensureAdminUser();
  const tenant = await seedTenant(admin?.id);

  console.log("\nSeed complete.");
  console.log(`  Demo hub:    /demo`);
  console.log(`  Tenant slug: ${tenant.slug}`);
  console.log(`  Menu:        /menu/${tenant.slug}`);
  console.log(`  Reviews:     /r/${tenant.slug}/review`);
  console.log(`  Wi‑Fi:       /r/${tenant.slug}/wifi`);
  console.log(`  Website:     /s/${tenant.slug}`);
  console.log(`  Short link:  /r/${tenant.slug}/menu`);
  if (admin) {
    console.log(`  Admin login: /login  (${ADMIN_EMAIL})`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
