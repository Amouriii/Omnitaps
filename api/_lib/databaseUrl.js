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

export function isUsableDatabaseUrl(url = getDatabaseUrl()) {
  const value = String(url || "").trim();
  if (!value) return false;
  if (isPlaceholderDatabaseUrl(value)) return false;
  return value.includes("@");
}
