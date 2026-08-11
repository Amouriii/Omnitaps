import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();

const TENANT_SLUG = process.env.SEED_TENANT_SLUG || "demo";
const TENANT_NAME = process.env.SEED_TENANT_NAME || "Demo Café";
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "";

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
      primaryColor: "#155eef",
      secondaryColor: "#b8873b",
    },
    create: {
      tenantId: tenant.id,
      name: `${TENANT_NAME} Menu`,
      slug: "main",
      isPublished: true,
      primaryColor: "#155eef",
      secondaryColor: "#b8873b",
    },
  });

  await prisma.menuItem.deleteMany({
    where: { category: { menuId: menu.id } },
  });
  await prisma.menuCategory.deleteMany({ where: { menuId: menu.id } });

  const drinks = await prisma.menuCategory.create({
    data: {
      menuId: menu.id,
      slug: "drinks",
      name: "Drinks",
      description: "Coffee and cold drinks",
      sortOrder: 0,
      isVisible: true,
      items: {
        create: [
          {
            slug: "house-latte",
            name: "House Latte",
            description: "Espresso, steamed milk",
            priceCents: 450,
            currency: "USD",
            isAvailable: true,
            sortOrder: 0,
          },
          {
            slug: "iced-tea",
            name: "Iced Tea",
            description: "Freshly brewed",
            priceCents: 350,
            currency: "USD",
            isAvailable: true,
            sortOrder: 1,
          },
        ],
      },
    },
  });

  const food = await prisma.menuCategory.create({
    data: {
      menuId: menu.id,
      slug: "plates",
      name: "Plates",
      description: "All-day favorites",
      sortOrder: 1,
      isVisible: true,
      items: {
        create: [
          {
            slug: "avocado-toast",
            name: "Avocado Toast",
            description: "Sourdough, chili flake, lemon",
            priceCents: 1200,
            currency: "USD",
            isAvailable: true,
            sortOrder: 0,
          },
        ],
      },
    },
  });

  void drinks;
  void food;

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

  const wifiPayload = buildWifiPayload({
    ssid: `${TENANT_SLUG}-guest`,
    authType: "WPA2",
    password: "omnitaps-demo",
    hidden: false,
  });

  const existingWifi = await prisma.wifiNetwork.findFirst({
    where: { tenantId: tenant.id, qrSlug: "main" },
  });

  if (existingWifi) {
    await prisma.wifiNetwork.update({
      where: { id: existingWifi.id },
      data: {
        name: "Guest Wi‑Fi",
        ssid: `${TENANT_SLUG}-guest`,
        password: "omnitaps-demo",
        authType: "WPA2",
        hidden: false,
        qrPayload: wifiPayload,
        isActive: true,
        leadCaptureEnabled: false,
      },
    });
  } else {
    await prisma.wifiNetwork.create({
      data: {
        tenantId: tenant.id,
        name: "Guest Wi‑Fi",
        ssid: `${TENANT_SLUG}-guest`,
        password: "omnitaps-demo",
        authType: "WPA2",
        hidden: false,
        qrSlug: "main",
        qrPayload: wifiPayload,
        isActive: true,
        leadCaptureEnabled: false,
      },
    });
  }

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
        metaTitle: `${TENANT_NAME} | OmniTaps`,
        metaDescription: "Digital hospitality powered by OmniTaps.",
        isHome: true,
        isPublished: true,
        sortOrder: 0,
      },
    }));

  await prisma.websitePage.update({
    where: { id: homePage.id },
    data: {
      title: TENANT_NAME,
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
          eyebrow: "Welcome",
          title: TENANT_NAME,
          description: "Menus, reviews, Wi‑Fi, and support — one tap away.",
          primaryCta: { label: "View menu", href: `/menu/${TENANT_SLUG}` },
          secondaryCta: { label: "Leave a review", href: `/r/${TENANT_SLUG}/review` },
        },
      },
      {
        pageId: homePage.id,
        blockType: "MENU_EMBED",
        sortOrder: 1,
        config: {
          title: "Guest favorites",
          description: "A sample of what is on today.",
          categories: [
            {
              title: "Drinks",
              items: [
                { name: "House Latte", price: "$4.50", description: "Espresso, steamed milk" },
                { name: "Iced Tea", price: "$3.50" },
              ],
            },
          ],
        },
      },
    ],
  });

  await prisma.chatbotBot.upsert({
    where: { tenantId: tenant.id },
    update: {
      name: `${TENANT_NAME} Assistant`,
      slug: "main",
      publicPath: `/s/${TENANT_SLUG}`,
      isActive: true,
    },
    create: {
      tenantId: tenant.id,
      name: `${TENANT_NAME} Assistant`,
      slug: "main",
      publicPath: `/s/${TENANT_SLUG}`,
      isActive: true,
    },
  });

  return tenant;
}

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL is required. Copy .env.example → .env and fill it in.");
  }

  const admin = await ensureAdminUser();
  const tenant = await seedTenant(admin?.id);

  console.log("\nSeed complete.");
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
