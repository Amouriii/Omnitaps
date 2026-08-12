#!/usr/bin/env node
/**
 * Prisma TCP seed when DATABASE_URL is real; otherwise HTTPS (PostgREST) seed.
 * Local .env often still has `[YOUR-PASSWORD]`, which Prisma reports as unreachable.
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { isUsableDatabaseUrl } from "../api/_lib/databaseUrl.js";

const root = resolve(process.cwd());

function runNode(script) {
  const result = spawnSync(process.execPath, ["--env-file=.env", script], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  return result.status ?? 1;
}

const url = process.env.POSTGRES_PRISMA_URL?.trim() || process.env.DATABASE_URL?.trim() || "";

if (!isUsableDatabaseUrl(url)) {
  console.log("• DATABASE_URL is missing or still has a placeholder password ([YOUR-PASSWORD]).");
  console.log("  Prisma cannot open Postgres TCP. Seeding Demo Café over HTTPS instead.");
  console.log("  To use Prisma next time: Supabase → Project Settings → Database → URI, paste the real password.\n");
  process.exit(runNode("scripts/seed-http.mjs"));
}

const prismaStatus = runNode("prisma/seed.js");
if (prismaStatus === 0) {
  process.exit(0);
}

console.log("\n• Prisma TCP seed failed. Retrying Demo Café seed over HTTPS (Supabase REST)…\n");
process.exit(runNode("scripts/seed-http.mjs"));
