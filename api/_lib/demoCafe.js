/**
 * Harbor Lane Demo Café payload for guest APIs when Prisma TCP is unavailable.
 * Keep in sync with scripts/seed-http.mjs / prisma/seed.js café copy.
 */
import { buildWifiPayload } from "./wifiPayload.js";

export const DEMO_TENANT_SLUG = "demo";
export const DEMO_CAFE_NAME = "Demo Café";
export const DEMO_WIFI_SSID = "demo-guest";
export const DEMO_WIFI_PASSWORD = "omnitaps-demo";
export const DEMO_CAFE_ADDRESS = "14 Harbor Lane, Demo City";

export const DEMO_CAFE_HOURS = [
  { label: "Monday – Friday", hours: "7:00 AM – 6:00 PM" },
  { label: "Saturday – Sunday", hours: "8:00 AM – 5:00 PM" },
];

const CAFE_HOURS_TEXT = `${DEMO_CAFE_NAME} is open Monday–Friday 7:00 AM–6:00 PM and Saturday–Sunday 8:00 AM–5:00 PM. The kitchen closes 30 minutes before the door. Walk-ins welcome; we do not take table reservations.`;

export function isDemoTenantParam(value) {
  return String(value || "").trim().toLowerCase() === DEMO_TENANT_SLUG;
}

const MENU_CATEGORIES = [
  {
    id: "demo-drinks",
    title: "Drinks",
    description: "Espresso and cold drinks from the bar",
    items: [
      {
        id: "demo-house-latte",
        name: "House Latte",
        description: "Double espresso, steamed milk",
        price: "$4.50",
        priceCents: 450,
        currency: "USD",
        isAvailable: true,
        allergens: ["milk"],
        badge: "Popular",
      },
      {
        id: "demo-flat-white",
        name: "Flat White",
        description: "Ristretto and microfoam",
        price: "$4.75",
        priceCents: 475,
        currency: "USD",
        isAvailable: true,
        allergens: ["milk"],
      },
      {
        id: "demo-oat-cortado",
        name: "Iced Oat Cortado",
        description: "Espresso and oat milk over ice",
        price: "$5.25",
        priceCents: 525,
        currency: "USD",
        isAvailable: true,
        allergens: [],
      },
      {
        id: "demo-iced-tea",
        name: "Citrus Iced Tea",
        description: "House-brewed black tea, lemon",
        price: "$3.50",
        priceCents: 350,
        currency: "USD",
        isAvailable: true,
        allergens: [],
      },
      {
        id: "demo-filter",
        name: "House Filter",
        description: "Rotating single origin",
        price: "$3.75",
        priceCents: 375,
        currency: "USD",
        isAvailable: true,
        allergens: [],
      },
    ],
  },
  {
    id: "demo-plates",
    title: "Plates",
    description: "All-day kitchen",
    items: [
      {
        id: "demo-avo",
        name: "Avocado Toast",
        description: "Sourdough, chili flake, lemon",
        price: "$12.00",
        priceCents: 1200,
        currency: "USD",
        isAvailable: true,
        allergens: ["gluten"],
        badge: "Popular",
      },
      {
        id: "demo-shakshuka",
        name: "Seasonal Shakshuka",
        description: "Eggs, peppers, warm spices",
        price: "$14.50",
        priceCents: 1450,
        currency: "USD",
        isAvailable: false,
        allergens: ["egg"],
        badge: "Sold out",
        outOfStockNote: "Sold out",
      },
      {
        id: "demo-grain",
        name: "Citrus Grain Bowl",
        description: "Farro, herbs, yogurt",
        price: "$13.50",
        priceCents: 1350,
        currency: "USD",
        isAvailable: true,
        allergens: ["gluten", "milk"],
      },
      {
        id: "demo-croissant",
        name: "Ham & Gruyère Croissant",
        description: "Baked through the morning",
        price: "$9.50",
        priceCents: 950,
        currency: "USD",
        isAvailable: true,
        allergens: ["gluten", "milk"],
      },
    ],
  },
  {
    id: "demo-sweets",
    title: "Sweets",
    description: "Pastry case",
    items: [
      {
        id: "demo-cake",
        name: "Olive Oil Cake",
        description: "Citrus and sea salt",
        price: "$6.50",
        priceCents: 650,
        currency: "USD",
        isAvailable: true,
        allergens: ["egg", "gluten"],
      },
      {
        id: "demo-cookie",
        name: "Dark Chocolate Cookie",
        description: "Sea salt",
        price: "$4.25",
        priceCents: 425,
        currency: "USD",
        isAvailable: true,
        allergens: ["gluten", "egg"],
      },
      {
        id: "demo-affogato",
        name: "Affogato",
        description: "Vanilla gelato, espresso",
        price: "$6.00",
        priceCents: 600,
        currency: "USD",
        isAvailable: true,
        allergens: ["milk"],
      },
    ],
  },
];

function demoTenant() {
  return {
    id: "demo-tenant",
    name: DEMO_CAFE_NAME,
    slug: DEMO_TENANT_SLUG,
  };
}

export function getDemoCafeMenuPayload() {
  return {
    tenant: demoTenant(),
    menu: {
      id: "demo-menu",
      name: `${DEMO_CAFE_NAME} Menu`,
      slug: "main",
      primaryColor: "#c45c26",
      secondaryColor: "#c4a35a",
      logoUrl: null,
      categories: MENU_CATEGORIES,
    },
  };
}

export function getDemoCafeWebsitePayload() {
  const slug = DEMO_TENANT_SLUG;
  return {
    tenant: demoTenant(),
    website: {
      id: "demo-website",
      name: DEMO_CAFE_NAME,
      slug,
      themeJson: null,
      jsonLd: null,
    },
    page: {
      id: "demo-home",
      slug: "home",
      path: "/",
      title: DEMO_CAFE_NAME,
      metaTitle: `${DEMO_CAFE_NAME} · Harbor Lane`,
      metaDescription: `${DEMO_CAFE_NAME} at ${DEMO_CAFE_ADDRESS}. Coffee, all-day plates, and a quiet corner to sit.`,
      isHome: true,
      blocks: [
        {
          type: "hero",
          eyebrow: "Harbor Lane",
          title: DEMO_CAFE_NAME,
          description:
            "Espresso, all-day plates, and a quiet corner facing the harbor. Scan a table QR for the menu, guest Wi‑Fi, or a review — or ask the café assistant on this page.",
          badge: "Open today",
          primaryCta: { label: "View menu", href: `/menu/${slug}` },
          secondaryCta: { label: "Leave a review", href: `/r/${slug}/review` },
        },
        {
          type: "menu",
          title: "On the counter today",
          description: "A snapshot of the guest menu. The full list lives on the table QR.",
          categories: MENU_CATEGORIES.map((category) => ({
            title: category.title,
            description: category.description,
            items: category.items.map((item) => ({
              name: item.name,
              description: item.description,
              price: item.price,
              badge: item.badge,
            })),
          })),
        },
        {
          type: "hours",
          eyebrow: "Visit",
          title: "Hours",
          description: "Kitchen closes 30 minutes before the door. Walk-ins welcome.",
          days: DEMO_CAFE_HOURS,
        },
        {
          type: "map",
          title: "Find us",
          description: "A short walk from the harbor tram stop. Street parking on Harbor Lane after 10 AM.",
          address: DEMO_CAFE_ADDRESS,
          embedUrl:
            "https://www.openstreetmap.org/export/embed.html?bbox=-0.142%2C51.501%2C-0.124%2C51.510&layer=mapnik&marker=51.5055%2C-0.133",
          directionsUrl: "https://www.openstreetmap.org/?mlat=51.5055&mlon=-0.133#map=16/51.5055/-0.133",
        },
        {
          type: "gallery",
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
        {
          type: "cta",
          eyebrow: "After your visit",
          title: "Tell us how we did — or get online",
          description:
            "Happy guests go to Google. Anything we should fix stays private. Guest Wi‑Fi is one tap away.",
          primaryCta: { label: "Leave a review", href: `/r/${slug}/review` },
          secondaryCta: { label: "Join Wi‑Fi", href: `/r/${slug}/wifi` },
        },
      ],
    },
  };
}

export function getDemoCafeWifiPayload() {
  const wifiPayload = buildWifiPayload({
    ssid: DEMO_WIFI_SSID,
    authType: "WPA2",
    password: DEMO_WIFI_PASSWORD,
    hidden: false,
  });

  return {
    tenant: demoTenant(),
    network: {
      id: "demo-wifi",
      name: "Guest Wi‑Fi",
      ssid: DEMO_WIFI_SSID,
      authType: "WPA2",
      qrSlug: "main",
      leadCaptureEnabled: false,
      splashPage: {
        headline: `${DEMO_CAFE_NAME} guest Wi‑Fi`,
        body: `This is ${DEMO_CAFE_NAME} guest Wi‑Fi for visitors on the floor. Scan the QR with your phone camera to join, or copy the password if you are on a laptop. Network name is ${DEMO_WIFI_SSID}.`,
        consentLabel: null,
        captureEmail: false,
        capturePhone: false,
        requiresConsent: false,
        revealCredentialsAfterSubmit: true,
      },
      password: DEMO_WIFI_PASSWORD,
      wifiPayload,
    },
  };
}

export function getDemoCafeKnowledgeSources() {
  return [
    {
      sourceType: "HOURS",
      title: "Opening hours",
      isActive: true,
      content: {
        keywords: ["hours", "open", "close", "opening", "when", "schedule", "kitchen"],
        days: DEMO_CAFE_HOURS,
        text: CAFE_HOURS_TEXT,
      },
    },
    {
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
        items: MENU_CATEGORIES.flatMap((category) =>
          category.items.map((item) => ({
            name: item.name,
            price: item.price,
            description: item.badge || item.description,
          })),
        ),
        text: MENU_CATEGORIES.map((category) =>
          `${category.title}: ${category.items.map((item) => `${item.name} ${item.price}`).join(", ")}`,
        ).join(". "),
      },
    },
    {
      sourceType: "WIFI",
      title: "Guest Wi‑Fi",
      isActive: true,
      content: {
        keywords: ["wifi", "wi-fi", "password", "ssid", "network", "internet"],
        text: `Join ${DEMO_WIFI_SSID} with password ${DEMO_WIFI_PASSWORD}, or scan the QR on /r/demo/wifi.`,
      },
    },
    {
      sourceType: "FAQ",
      title: "Reviews and visit",
      isActive: true,
      content: {
        keywords: ["review", "google", "feedback", "address", "parking", "reservation", "where"],
        questions: ["how do I leave a review", "where are you", "parking"],
        text: `We are at ${DEMO_CAFE_ADDRESS}. Street parking on Harbor Lane after 10 AM. Walk-ins only. Leave a review at /r/demo/review — 4–5 stars go to Google; 1–3 stay private.`,
      },
    },
  ];
}
