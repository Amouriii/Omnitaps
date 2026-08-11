import { createHash, timingSafeEqual } from "node:crypto";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;
const rateLimitBuckets = new Map();

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Cache-Control": "no-store",
};

export function applySecurityHeaders(res) {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    res.setHeader(key, value);
  }
}

export function methodNotAllowed(res, allowed = ["GET"]) {
  applySecurityHeaders(res);
  res.setHeader("Allow", allowed.join(", "));
  res.status(405).json({ error: "Method not allowed." });
}

export function sendJson(res, status, body) {
  applySecurityHeaders(res);
  res.status(status).json(body);
}

export function getClientIp(req) {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.length > 0) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = req.headers["x-real-ip"];
  if (typeof realIp === "string" && realIp.trim()) {
    return realIp.trim();
  }

  return req.socket?.remoteAddress ?? null;
}

export function hashValue(value) {
  if (!value || typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  return createHash("sha256").update(normalized).digest("hex");
}

export function sanitizeText(value, { maxLength = 2000 } = {}) {
  if (typeof value !== "string") {
    return "";
  }

  let cleaned = "";
  for (const char of value) {
    const code = char.charCodeAt(0);
    const isControl =
      (code >= 0 && code <= 8) ||
      code === 11 ||
      code === 12 ||
      (code >= 14 && code <= 31) ||
      code === 127;
    if (!isControl) {
      cleaned += char;
    }
  }

  return cleaned.trim().slice(0, maxLength);
}

export function sanitizeEmail(value) {
  const email = sanitizeText(value, { maxLength: 254 }).toLowerCase();
  if (!email) return "";
  // Practical RFC-inspired check — not a full parser.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "";
  }
  return email;
}

export function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === "object") {
      resolve(req.body);
      return;
    }

    const chunks = [];
    req.on("data", (chunk) => {
      chunks.push(chunk);
      const size = chunks.reduce((total, part) => total + part.length, 0);
      if (size > 64_000) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }

      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

export function enforceRateLimit(req, res, { keyPrefix = "global", max = RATE_LIMIT_MAX } = {}) {
  const ip = getClientIp(req) ?? "unknown";
  const key = `${keyPrefix}:${ip}`;
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);

  if (!bucket || now - bucket.windowStart >= RATE_LIMIT_WINDOW_MS) {
    rateLimitBuckets.set(key, { windowStart: now, count: 1 });
    return true;
  }

  bucket.count += 1;
  if (bucket.count > max) {
    applySecurityHeaders(res);
    res.setHeader("Retry-After", "60");
    res.status(429).json({ error: "Too many requests. Please try again shortly." });
    return false;
  }

  return true;
}

export function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

export function databaseUnavailable(res) {
  sendJson(res, 503, {
    error: "Database is not configured.",
    code: "DB_UNAVAILABLE",
  });
}
