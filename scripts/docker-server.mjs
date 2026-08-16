/**
 * Production HTTP server for the Docker image (no Express).
 * APIs: createViteApiMiddleware + createProductionRouteTable.
 * Static: dist/ with SPA fallback to index.html (same idea as vercel.json rewrites).
 */
import fs from "node:fs";
import { stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createProductionRouteTable } from "../api/_lib/routeTable.js";
import { createViteApiMiddleware } from "../api/_lib/viteAdapter.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const INDEX_HTML = path.join(DIST, "index.html");
const PORT = Number.parseInt(process.env.PORT || "3000", 10);

/** Same headers as vercel.json `/(.*)`. */
const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: blob:; connect-src 'self' https://*.supabase.co https://api.stripe.com; frame-src https://www.google.com https://maps.google.com https://www.openstreetmap.org https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://checkout.stripe.com",
};

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function applySecurityHeaders(res) {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    res.setHeader(key, value);
  }
}

function contentTypeFor(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

function isInsideDist(resolvedPath) {
  const relative = path.relative(DIST, resolvedPath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function sendFile(req, res, filePath, fileStat) {
  res.statusCode = 200;
  res.setHeader("Content-Type", contentTypeFor(filePath));
  res.setHeader("Content-Length", String(fileStat.size));
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  fs.createReadStream(filePath).pipe(res);
}

async function tryStaticFile(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  const candidate = path.resolve(DIST, `.${decoded}`);
  if (!isInsideDist(candidate)) {
    return null;
  }

  try {
    const fileStat = await stat(candidate);
    if (!fileStat.isFile()) {
      return null;
    }
    return { filePath: candidate, fileStat };
  } catch {
    return null;
  }
}

async function handleStaticAndSpa(req, res) {
  const method = (req.method || "GET").toUpperCase();
  const url = new URL(req.url || "/", "http://localhost");
  const pathname = url.pathname;

  if (method !== "GET" && method !== "HEAD") {
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Not found.");
    return;
  }

  const staticFile = await tryStaticFile(pathname);
  if (staticFile) {
    sendFile(req, res, staticFile.filePath, staticFile.fileStat);
    return;
  }

  try {
    const indexStat = await stat(INDEX_HTML);
    sendFile(req, res, INDEX_HTML, indexStat);
  } catch {
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Missing dist/index.html. Run npm run build before npm start.");
  }
}

const apiMiddleware = createViteApiMiddleware(createProductionRouteTable());

const server = http.createServer((req, res) => {
  applySecurityHeaders(res);

  Promise.resolve(apiMiddleware(req, res, (err) => {
    if (err) {
      console.error("[docker-server]", err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ error: "Internal server error." }));
      }
      return;
    }
    handleStaticAndSpa(req, res).catch((error) => {
      console.error("[docker-server]", error);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ error: "Internal server error." }));
      }
    });
  })).catch((error) => {
    console.error("[docker-server]", error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ error: "Internal server error." }));
    }
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Omnitaps listening on 0.0.0.0:${PORT}`);
});
