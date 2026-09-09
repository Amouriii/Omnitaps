import { PrismaClient } from "@prisma/client";
import { isTransientDbError, withDbRetry } from "./dbRetry.js";
import {
  getDatabaseUrl,
  isUsableDatabaseUrl,
  withConnectionParams,
} from "./databaseUrl.js";

/**
 * Server-only Prisma singleton. Never import this from React/Vite client code.
 * On Vercel + Supabase integration, prefer POSTGRES_PRISMA_URL when present.
 *
 * The returned client is wrapped in a Proxy so every model-level call (e.g.
 * `prisma.user.findUnique(...)`) transparently retries transient connection
 * errors (P1001 / P1017 / P2024 and raw socket failures). `$`-prefixed APIs
 * ($transaction, $connect, ...) are passed through untouched so transactional
 * and lifecycle semantics stay exact.
 */
const globalForPrisma = globalThis;

export { getDatabaseUrl, isUsableDatabaseUrl, withConnectionParams };

export function isDatabaseConfigured() {
  return isUsableDatabaseUrl(getDatabaseUrl());
}

function withModelRetry(client) {
  return new Proxy(client, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, target);
      if (typeof prop === "string" && prop.startsWith("$")) {
        // Bind $-prefixed methods to the raw client so `this` is correct.
        return typeof value === "function" ? value.bind(target) : value;
      }
      if (value === null || value === undefined) {
        return value;
      }
      if (typeof value === "function") {
        // Top-level client functions (rare) — retry those too.
        return (...args) => withDbRetry(() => value.apply(target, args));
      }
      if (typeof value === "object") {
        // Model delegate (user, tenant, ...) — wrap its action methods.
        return new Proxy(value, {
          get(delegate, action) {
            const actionFn = Reflect.get(delegate, action, delegate);
            if (typeof actionFn !== "function") {
              return actionFn;
            }
            return (...args) =>
              withDbRetry(() => actionFn.apply(delegate, args));
          },
        });
      }
      return value;
    },
  });
}

export function getPrisma() {
  const url = getDatabaseUrl();
  if (!isUsableDatabaseUrl(url)) {
    return null;
  }

  if (!globalForPrisma.__omnitapsPrisma) {
    const client = new PrismaClient({
      datasources: {
        db: { url: withConnectionParams(url) },
      },
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
    globalForPrisma.__omnitapsPrisma = withModelRetry(client);
    startPoolKeepAlive(globalForPrisma.__omnitapsPrisma);
  }

  return globalForPrisma.__omnitapsPrisma;
}

const POOL_KEEPALIVE_MS = 60_000;

/**
 * The remote Supabase pooler drops idle connections after a few minutes and a
 * fresh handshake costs 1–3s, which every post-idle request would pay. Run a
 * cheap `SELECT 1` once a minute so the pool stays warm. Failures are ignored
 * here — the retry proxy still guards real requests — and the timer never
 * blocks process exit.
 */
function startPoolKeepAlive(client) {
  if (globalForPrisma.__omnitapsPrismaKeepAlive) {
    return;
  }
  globalForPrisma.__omnitapsPrismaKeepAlive = true;
  const timer = setInterval(() => {
    client.$queryRaw`SELECT 1`.catch(() => {});
  }, POOL_KEEPALIVE_MS);
  timer.unref?.();
}

export { isTransientDbError, withDbRetry };
