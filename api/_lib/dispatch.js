import {
  getRequestPathname,
  getRequestSearchParams,
  isApiPath,
  matchRoutes,
} from "./matchRoute.js";

function sendUnmatchedApi(res) {
  if (typeof res.status === "function" && typeof res.json === "function") {
    res.status(404).json({ error: "Not found." });
    return;
  }
  res.statusCode = 404;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify({ error: "Not found." }));
}

function sendInternalError(res) {
  if (typeof res.status === "function" && typeof res.json === "function") {
    res.status(500).json({ error: "Internal server error." });
    return;
  }
  res.statusCode = 500;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify({ error: "Internal server error." }));
}

function mergePathParams(req, params) {
  const existing =
    req.query && typeof req.query === "object" && !Array.isArray(req.query) ? req.query : {};
  req.query = {
    ...existing,
    ...getRequestSearchParams(req),
    ...params,
  };
}

async function resolveHandler(route) {
  if (typeof route.handler === "function") {
    return route.handler;
  }
  const mod = await route.load();
  const handler = mod.default || mod;
  if (typeof handler !== "function") {
    throw new Error(`Route ${route.pattern} did not export a function handler.`);
  }
  return handler;
}

/**
 * Match pathname, merge `:params` into `req.query`, invoke the handler.
 * Unmatched `/api/*` returns 404 JSON. Other unmatched paths return false (SPA / next).
 */
export async function dispatchApi(req, res, routes) {
  const pathname = getRequestPathname(req);
  const matched = matchRoutes(routes, pathname);

  if (!matched) {
    if (isApiPath(pathname)) {
      sendUnmatchedApi(res);
      return true;
    }
    return false;
  }

  mergePathParams(req, matched.params);

  try {
    const handler = await resolveHandler(matched.route);
    await handler(req, res);
  } catch (error) {
    console.error("[api-dispatch]", error);
    if (!res.headersSent) {
      sendInternalError(res);
    }
  }

  return true;
}
