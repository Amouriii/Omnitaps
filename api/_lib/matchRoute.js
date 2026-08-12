/**
 * Path matching shared by the Vercel catch-all and Vite local API middleware.
 * Patterns use `:param` segments (same rules as the previous viteAdapter matcher).
 */

export function matchRoute(pattern, pathname) {
  const patternParts = pattern.split("/").filter(Boolean);
  const pathParts = pathname.split("/").filter(Boolean);

  if (patternParts.length !== pathParts.length) {
    return null;
  }

  const params = {};
  for (let i = 0; i < patternParts.length; i += 1) {
    const part = patternParts[i];
    const value = pathParts[i];
    if (part.startsWith(":")) {
      params[part.slice(1)] = decodeURIComponent(value);
      continue;
    }
    if (part !== value) {
      return null;
    }
  }

  return { params };
}

export function matchRoutes(routes, pathname) {
  for (const route of routes) {
    const result = matchRoute(route.pattern, pathname);
    if (result) {
      return { route, params: result.params };
    }
  }
  return null;
}

export function getRequestPathname(req) {
  const raw = req.url || "/";
  let pathname = "/";
  try {
    pathname = new URL(raw, "http://localhost").pathname;
  } catch {
    pathname = String(raw).split("?")[0] || "/";
  }

  if (pathname.startsWith("/api/") || pathname.startsWith("/r/")) {
    return pathname;
  }

  const qpath = req.query?.path;
  if (Array.isArray(qpath) && qpath.length > 0) {
    return `/api/${qpath.join("/")}`;
  }
  if (typeof qpath === "string" && qpath) {
    return `/api/${qpath}`;
  }

  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}

export function getRequestSearchParams(req) {
  const raw = req.url || "/";
  try {
    return Object.fromEntries(new URL(raw, "http://localhost").searchParams.entries());
  } catch {
    return {};
  }
}

export function isApiPath(pathname) {
  return pathname === "/api" || pathname.startsWith("/api/");
}
