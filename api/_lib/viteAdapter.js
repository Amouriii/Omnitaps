/**
 * Adapts Vercel-style (req, res) handlers for Vite's Connect middleware in local dev.
 */
export function createViteApiMiddleware(routes) {
  return async function omnitapsApiMiddleware(req, res, next) {
    const url = new URL(req.url || "/", "http://localhost");
    const pathname = url.pathname;

    let matched = null;
    let params = {};

    for (const route of routes) {
      const result = matchRoute(route.pattern, pathname);
      if (result) {
        matched = route;
        params = result.params;
        break;
      }
    }

    if (!matched) {
      next();
      return;
    }

    const vercelLikeReq = Object.create(req);
    vercelLikeReq.method = req.method;
    vercelLikeReq.headers = req.headers;
    vercelLikeReq.url = `${pathname}${url.search}`;
    vercelLikeReq.query = { ...Object.fromEntries(url.searchParams.entries()), ...params };
    vercelLikeReq.body = undefined;
    vercelLikeReq.socket = req.socket;

    const vercelLikeRes = {
      statusCode: 200,
      headersSent: false,
      setHeader(key, value) {
        res.setHeader(key, value);
      },
      writeHead(status, headers) {
        this.headersSent = true;
        this.statusCode = status;
        res.writeHead(status, headers);
      },
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        if (!this.headersSent) {
          res.statusCode = this.statusCode;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
        }
        res.end(JSON.stringify(body));
      },
      end(chunk) {
        if (!this.headersSent) {
          res.statusCode = this.statusCode;
        }
        res.end(chunk);
      },
    };

    try {
      await matched.handler(vercelLikeReq, vercelLikeRes);
    } catch (error) {
      console.error("[vite-api]", error);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ error: "Internal server error." }));
      }
    }
  };
}

function matchRoute(pattern, pathname) {
  const patternParts = pattern.split("/").filter(Boolean);
  const pathParts = pathname.split("/").filter(Boolean);

  if (patternParts.length !== pathParts.length) {
    return null;
  }

  const params = {};
  for (let i = 0; i < patternParts.length; i += 1) {
    const part = patternParts[i];
    const value = pathParts[i];
    if (part.startsWith(":") ) {
      params[part.slice(1)] = decodeURIComponent(value);
      continue;
    }
    if (part !== value) {
      return null;
    }
  }

  return { params };
}
