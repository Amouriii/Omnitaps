import { PrismaClient } from "@prisma/client";

/**
 * Server-only Prisma singleton. Never import this from React/Vite client code.
 * On Vercel + Supabase integration, prefer POSTGRES_PRISMA_URL when present.
 */
const globalForPrisma = globalThis;

export function getDatabaseUrl() {
  return (
    process.env.POSTGRES_PRISMA_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    ""
  );
}

export function isDatabaseConfigured() {
  return Boolean(getDatabaseUrl());
}

export function getPrisma() {
  const url = getDatabaseUrl();
  if (!url) {
    return null;
  }

  if (!globalForPrisma.__omnitapsPrisma) {
    globalForPrisma.__omnitapsPrisma = new PrismaClient({
      datasources: {
        db: { url },
      },
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  }

  return globalForPrisma.__omnitapsPrisma;
}
