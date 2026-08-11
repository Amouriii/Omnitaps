import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { createViteApiMiddleware } from "./api/_lib/viteAdapter.js";

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

function omnitapsLocalApiPlugin() {
  return {
    name: "omnitaps-local-api",
    async configureServer(server) {
      const routes = await loadApiRoutes();
      server.middlewares.use(createViteApiMiddleware(routes));
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), omnitapsLocalApiPlugin()],
});
