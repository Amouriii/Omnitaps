/**
 * Adapt Web Fetch API handlers (Request → Response) to Vercel/Node (req, res).
 * Preserves raw body bytes for Stripe webhook signature verification.
 */

import { Readable } from "node:stream";

function getHeader(req, name) {
  const headers = req.headers || {};
  const direct = headers[name] || headers[name.toLowerCase()];
  if (Array.isArray(direct)) return direct.join(", ");
  return typeof direct === "string" ? direct : undefined;
}

function buildRequestUrl(req) {
  const host = getHeader(req, "host") || "localhost";
  const proto =
    getHeader(req, "x-forwarded-proto") ||
    (req.socket && req.socket.encrypted ? "https" : "http");
  const path = req.url || "/";
  return `${proto}://${host}${path}`;
}

/**
 * Read raw body from IncomingMessage once.
 * Prefer already-buffered `req.rawBody` when set by the Vite adapter.
 */
export function readRawBody(req) {
  if (Buffer.isBuffer(req.rawBody)) {
    return Promise.resolve(req.rawBody);
  }
  if (typeof req.rawBody === "string") {
    return Promise.resolve(Buffer.from(req.rawBody));
  }
  // Vercel sometimes attaches parsed body — reconstruct only as last resort.
  if (req.body !== undefined && req.body !== null && !Readable.toWeb) {
    if (Buffer.isBuffer(req.body)) return Promise.resolve(req.body);
    if (typeof req.body === "string") return Promise.resolve(Buffer.from(req.body));
    return Promise.resolve(Buffer.from(JSON.stringify(req.body)));
  }

  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export async function nodeToWebRequest(req) {
  const method = (req.method || "GET").toUpperCase();
  const url = buildRequestUrl(req);
  const headers = new Headers();

  for (const [key, value] of Object.entries(req.headers || {})) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, String(item));
    } else {
      headers.set(key, String(value));
    }
  }

  const init = { method, headers };
  if (method !== "GET" && method !== "HEAD") {
    const raw = await readRawBody(req);
    init.body = raw;
    // Required by undici/Node fetch for Node IncomingMessage-derived bodies in some runtimes
    init.duplex = "half";
  }

  return new Request(url, init);
}

export async function webToNodeResponse(webResponse, res) {
  res.statusCode = webResponse.status;
  webResponse.headers.forEach((value, key) => {
    if (key.toLowerCase() === "transfer-encoding") return;
    res.setHeader(key, value);
  });

  if (!webResponse.body) {
    res.end();
    return;
  }

  const buf = Buffer.from(await webResponse.arrayBuffer());
  res.end(buf);
}

/**
 * @param {Record<string, (request: Request) => Promise<Response> | Response>} handlers
 */
export function wrapWebHandlers(handlers) {
  const allowed = Object.keys(handlers);

  async function vercelHandler(req, res) {
    const method = (req.method || "GET").toUpperCase();
    const fn = handlers[method];
    if (!fn) {
      res.statusCode = 405;
      res.setHeader("Allow", allowed.join(", "));
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ ok: false, error: "Method not allowed.", code: "bad_request" }));
      return;
    }

    try {
      const request = await nodeToWebRequest(req);
      const response = await fn(request);
      await webToNodeResponse(response, res);
    } catch (error) {
      console.error("[webHandlerAdapter]", error);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(
          JSON.stringify({
            ok: false,
            error: error instanceof Error ? error.message : "Internal server error.",
            code: "db_error",
          }),
        );
      }
    }
  }

  return vercelHandler;
}
