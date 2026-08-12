/**
 * Shared factory for lazy Web handler wrapping (optional runtime loader).
 */

import { wrapWebHandlers } from "./webHandlerAdapter.js";

/**
 * @param {() => Promise<Record<string, Function>>} loadHandlers
 * @param {{ bodyParser?: boolean }} [options]
 */
export function createLazyWebHandler(loadHandlers, options = {}) {
  let cached;

  async function resolve() {
    if (!cached) {
      const handlers = await loadHandlers();
      cached = wrapWebHandlers(handlers);
    }
    return cached;
  }

  async function handler(req, res) {
    const run = await resolve();
    return run(req, res);
  }

  if (options.bodyParser === false) {
    handler.config = { api: { bodyParser: false } };
  }

  return handler;
}
