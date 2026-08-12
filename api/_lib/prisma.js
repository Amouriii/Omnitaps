import { PrismaClient } from "@prisma/client";
import { getDatabaseUrl, isUsableDatabaseUrl } from "./databaseUrl.js";

/**
 * Server-only Prisma singleton. Never import this from React/Vite client code.
 * On Vercel + Supabase integration, prefer POSTGRES_PRISMA_URL when present.
 */
const globalForPrisma = globalThis;

export { getDatabaseUrl, isUsableDatabaseUrl };

export function isDatabaseConfigured() {
  return isUsableDatabaseUrl(getDatabaseUrl());
}

export function getPrisma() {
  const url = getDatabaseUrl();
  if (!isUsableDatabaseUrl(url)) {
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
