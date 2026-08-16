import { defineConfig } from "vitest/config";

// Deliberately separate from vite.config.js: unit tests must not mount the
// omnitaps-local-api middleware plugin.
export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
