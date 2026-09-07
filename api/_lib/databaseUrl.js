/**
 * Shared DATABASE_URL checks for Prisma seed, setup, and API handlers.
 * Placeholder values (including unencoded `[YOUR-PASSWORD]`) look configured
 * but cannot open a Postgres session — Prisma reports that as "Can't reach database server".
 */
const PLACEHOLDER_MARKERS = [
  "[YOUR-PASSWORD]",
  "[YOUR_PASSWORD]",
  "YOUR-PASSWORD",
  "YOUR_PASSWORD",
  "USER:PASSWORD",
  "[SENSITIVE]",
  "YOUR_PROJECT",
];

export function getDatabaseUrl() {
  return (
    process.env.POSTGRES_PRISMA_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    ""
  );
}

export function isPlaceholderDatabaseUrl(url = getDatabaseUrl()) {
  const value = String(url || "").trim();
  if (!value) return true;
  const upper = value.toUpperCase();
  return PLACEHOLDER_MARKERS.some((marker) => upper.includes(marker.toUpperCase()));
}

/**
 * Normalize connection params for the remote Supabase pooler. The pooler's
 * cold handshake routinely takes 3–6s, so Prisma's 5s default connect timeout
 * is too tight and surfaces transient P1001 failures. Raised timeouts and a
 * bounded per-process pool keep steady state fast without hammering Supavisor.
 */
export function withConnectionParams(rawUrl) {
  const value = String(rawUrl || "").trim();
  if (!value.startsWith("postgres")) return value;

  try {
    const url = new URL(value);
    if (!url.searchParams.has("connect_timeout")) {
      url.searchParams.set("connect_timeout", "15");
    }
    if (!url.searchParams.has("pool_timeout")) {
      url.searchParams.set("pool_timeout", "15");
    }
    if (!url.searchParams.has("connection_limit")) {
      url.searchParams.set("connection_limit", "5");
    }
    return url.toString();
  } catch {
    return value;
  }
}

export function isUsableDatabaseUrl(url = getDatabaseUrl()) {
  const value = String(url || "").trim();
  if (!value) return false;
  if (isPlaceholderDatabaseUrl(value)) return false;
  return value.includes("@");
}
