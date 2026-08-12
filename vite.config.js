import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { createViteApiMiddleware } from "./api/_lib/viteAdapter.js";
import { wrapWebHandlers } from "./api/_lib/webHandlerAdapter.js";

async function loadApiRoutes() {
  const [
    { default: menuShortlinkHandler },
    { default: feedbackHandler },
    { default: visitHandler },
    { default: tenantMenuHandler },
    { default: tenantWebsiteHandler },
    { default: tenantWifiHandler },
    { default: chatbotMessageHandler },
    { default: adminSessionHandler },
    { default: adminOverviewHandler },
  ] = await Promise.all([
    import("./api/r/[tenantId]/menu.js"),
    import("./api/reviews/feedback.js"),
    import("./api/reviews/visit.js"),
    import("./api/tenants/[tenantId]/menu.js"),
    import("./api/tenants/[tenantId]/website.js"),
    import("./api/tenants/[tenantId]/wifi.js"),
    import("./api/chatbot/message.js"),
    import("./api/admin/session.js"),
    import("./api/admin/overview.js"),
  ]);

  return [
    { pattern: "/api/r/:tenantId/menu", handler: menuShortlinkHandler },
    { pattern: "/r/:tenantId/menu", handler: menuShortlinkHandler },
    { pattern: "/api/reviews/feedback", handler: feedbackHandler },
    { pattern: "/api/reviews/visit", handler: visitHandler },
    { pattern: "/api/tenants/:tenantId/menu", handler: tenantMenuHandler },
    { pattern: "/api/tenants/:tenantId/website", handler: tenantWebsiteHandler },
    { pattern: "/api/tenants/:tenantId/wifi", handler: tenantWifiHandler },
    { pattern: "/api/chatbot/message", handler: chatbotMessageHandler },
    { pattern: "/api/admin/session", handler: adminSessionHandler },
    { pattern: "/api/admin/overview", handler: adminOverviewHandler },
  ];
}

function createSsrWebRoute(server, moduleId, methods) {
  return async function ssrWebHandler(req, res) {
    const mod = await server.ssrLoadModule(moduleId);
    const handlers = {};
    for (const method of methods) {
      if (typeof mod[method] !== "function") {
        throw new Error(`Missing ${method} export in ${moduleId}`);
      }
      handlers[method] = mod[method];
    }
    return wrapWebHandlers(handlers)(req, res);
  };
}

function omnitapsLocalApiPlugin() {
  return {
    name: "omnitaps-local-api",
    async configureServer(server) {
      const routes = await loadApiRoutes();
      routes.push(
        {
          pattern: "/api/v1/captive/authenticate",
          handler: createSsrWebRoute(
            server,
            "/app/api/v1/captive/authenticate/route.ts",
            ["GET", "POST"],
          ),
        },
        {
          pattern: "/api/v1/captive/session-status",
          handler: createSsrWebRoute(
            server,
            "/app/api/v1/captive/session-status/route.ts",
            ["GET", "POST", "PATCH"],
          ),
        },
        {
          pattern: "/api/v1/captive/checkout",
          handler: createSsrWebRoute(
            server,
            "/app/api/v1/captive/checkout/route.ts",
            ["GET", "POST"],
          ),
        },
        {
          pattern: "/api/v1/admin/wifi/telemetry",
          handler: createSsrWebRoute(
            server,
            "/app/api/v1/admin/wifi/telemetry/route.ts",
            ["GET"],
          ),
        },
        {
          pattern: "/api/v1/admin/wifi/settings",
          handler: createSsrWebRoute(
            server,
            "/app/api/v1/admin/wifi/settings/route.ts",
            ["GET", "PATCH", "POST", "DELETE"],
          ),
        },
      );
      server.middlewares.use(createViteApiMiddleware(routes));
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), omnitapsLocalApiPlugin()],
});
