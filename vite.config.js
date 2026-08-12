import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { createViteApiMiddleware } from "./api/_lib/viteAdapter.js";
import { wrapWebHandlers } from "./api/_lib/webHandlerAdapter.js";
import { createJsRoutes, V1_SPECS } from "./api/_lib/routeTable.js";

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
    configureServer(server) {
      const routes = [
        ...createJsRoutes(),
        ...V1_SPECS.map((spec) => ({
          pattern: spec.pattern,
          handler: createSsrWebRoute(server, spec.ssrModule, spec.methods),
        })),
      ];
      server.middlewares.use(createViteApiMiddleware(routes));
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), omnitapsLocalApiPlugin()],
});
