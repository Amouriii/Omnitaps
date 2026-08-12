/**
 * Ordered API routes for the single Vercel catch-all and Vite middleware.
 * `load` is a dynamic import so unused handlers initialize lazily on a warm isolate.
 */

export function createJsRoutes() {
  return [
    { pattern: "/api/r/:tenantId/menu", load: () => import("./handlers/menuShortlink.js") },
    { pattern: "/r/:tenantId/menu", load: () => import("./handlers/menuShortlink.js") },
    { pattern: "/api/reviews/visit", load: () => import("./handlers/reviewsVisit.js") },
    { pattern: "/api/reviews/feedback", load: () => import("./handlers/reviewsFeedback.js") },
    { pattern: "/api/tenants/:tenantId/menu", load: () => import("./handlers/tenantMenu.js") },
    { pattern: "/api/tenants/:tenantId/website", load: () => import("./handlers/tenantWebsite.js") },
    { pattern: "/api/tenants/:tenantId/wifi", load: () => import("./handlers/tenantWifi.js") },
    { pattern: "/api/chatbot/message", load: () => import("./handlers/chatbotMessage.js") },
    { pattern: "/api/admin/session", load: () => import("./handlers/adminSession.js") },
    { pattern: "/api/admin/overview", load: () => import("./handlers/adminOverview.js") },
  ];
}

/** Captive / admin Wi-Fi wrappers. Vite replaces `load` with ssrLoadModule of app/api/v1. */
export const V1_SPECS = [
  {
    pattern: "/api/v1/captive/authenticate",
    methods: ["GET", "POST"],
    ssrModule: "/app/api/v1/captive/authenticate/route.ts",
    load: () => import("./handlers/v1CaptiveAuthenticate.ts"),
  },
  {
    pattern: "/api/v1/captive/session-status",
    methods: ["GET", "POST", "PATCH"],
    ssrModule: "/app/api/v1/captive/session-status/route.ts",
    load: () => import("./handlers/v1CaptiveSessionStatus.ts"),
  },
  {
    pattern: "/api/v1/captive/checkout",
    methods: ["GET", "POST"],
    ssrModule: "/app/api/v1/captive/checkout/route.ts",
    load: () => import("./handlers/v1CaptiveCheckout.ts"),
  },
  {
    pattern: "/api/v1/admin/wifi/telemetry",
    methods: ["GET"],
    ssrModule: "/app/api/v1/admin/wifi/telemetry/route.ts",
    load: () => import("./handlers/v1AdminWifiTelemetry.ts"),
  },
  {
    pattern: "/api/v1/admin/wifi/settings",
    methods: ["GET", "PATCH", "POST", "DELETE"],
    ssrModule: "/app/api/v1/admin/wifi/settings/route.ts",
    load: () => import("./handlers/v1AdminWifiSettings.ts"),
  },
];

export function createProductionRouteTable() {
  return [...createJsRoutes(), ...V1_SPECS];
}
