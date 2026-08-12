/**
 * Adapts Vercel-style (req, res) handlers for Vite's Connect middleware in local dev.
 */

import { dispatchApi } from "./dispatch.js";
import { isApiPath } from "./matchRoute.js";

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export function createViteApiMiddleware(routes) {
  return async function omnitapsApiMiddleware(req, res, next) {
    const url = new URL(req.url || "/", "http://localhost");
    const pathname = url.pathname;
    const mightBeApi = isApiPath(pathname) || pathname.startsWith("/r/");

    if (!mightBeApi) {
      next();
      return;
    }

    const method = (req.method || "GET").toUpperCase();
    let rawBody;
    if (method !== "GET" && method !== "HEAD") {
      rawBody = await readRawBody(req);
    }

    const vercelLikeReq = Object.create(req);
    vercelLikeReq.method = req.method;
    vercelLikeReq.headers = req.headers;
    vercelLikeReq.url = `${pathname}${url.search}`;
    vercelLikeReq.query = { ...Object.fromEntries(url.searchParams.entries()) };
    vercelLikeReq.body = undefined;
    vercelLikeReq.rawBody = rawBody;
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

    const handled = await dispatchApi(vercelLikeReq, vercelLikeRes, routes);
    if (!handled) {
      next();
    }
  };
}
