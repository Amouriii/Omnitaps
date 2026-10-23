#!/usr/bin/env node
/**
 * Provision 3 OmniTaps administrator accounts over HTTPS (Supabase Auth Admin +
 * PostgREST). Use when Prisma TCP is blocked but the Supabase API works.
 * Idempotent: safe to re-run; existing accounts are reused and their roles
 * refreshed.
 *
 * Prerequisite: run supabase-init.sql in the Supabase SQL Editor first.
 *
 * Env (never commit real passwords):
 *   SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD          → Super Admin (OWNER)
 *   SEED_OPS_ADMIN_EMAIL / SEED_OPS_ADMIN_PASSWORD   → Operations Admin (ADMIN)
 *   SEED_QA_ADMIN_EMAIL / SEED_QA_ADMIN_PASSWORD     → QA / Secondary Admin (ANALYST)
 *
 * Usage:
 *   SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... \
 *   SEED_OPS_ADMIN_EMAIL=... SEED_OPS_ADMIN_PASSWORD=... \
 *   SEED_QA_ADMIN_EMAIL=... SEED_QA_ADMIN_PASSWORD=... \
 *   node scripts/seed-admins.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function hydrateEnv() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function nowIso() {
  return new Date().toISOString();
}

function withTimestamps(row) {
  const ts = nowIso();
  return { ...row, createdAt: ts, updatedAt: ts };
}

hydrateEnv();

const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

const ADMINS = [
  {
    key: "super",
    label: "Super Admin",
    role: "OWNER",
    email: (process.env.SEED_ADMIN_EMAIL || "").trim().toLowerCase(),
    password: process.env.SEED_ADMIN_PASSWORD || "",
    displayName: "OmniTaps Super Admin",
  },
  {
    key: "ops",
    label: "Operations Admin",
    role: "ADMIN",
    email: (process.env.SEED_OPS_ADMIN_EMAIL || "").trim().toLowerCase(),
    password: process.env.SEED_OPS_ADMIN_PASSWORD || "",
    displayName: "OmniTaps Operations Admin",
  },
  {
    key: "qa",
    label: "QA / Secondary Admin",
    role: "ANALYST",
    email: (process.env.SEED_QA_ADMIN_EMAIL || "").trim().toLowerCase(),
    password: process.env.SEED_QA_ADMIN_PASSWORD || "",
    displayName: "OmniTaps QA Admin",
  },
];

const VALID_ROLES = new Set(["OWNER", "ADMIN", "STAFF", "ANALYST"]);

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function rest(method, table, { body, query = "", upsert = false } = {}) {
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
    Prefer: upsert ? "resolution=merge-duplicates,return=representation" : "return=representation",
  };
  const response = await fetch(`${url}/rest/v1/${table}${query}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  if (!response.ok) {
    const message = typeof json === "object" ? JSON.stringify(json) : String(json);
    throw new Error(`${method} ${table} failed (${response.status}): ${message}`);
  }
  return json;
}

async function assertSchemaReady() {
  const response = await fetch(`${url}/rest/v1/User?select=id&limit=1`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (response.status === 404) {
    console.error(`
Schema not found in Supabase yet.

1. Open Supabase → SQL Editor
2. Paste contents of: supabase-init.sql
3. Run it
4. Re-run: node scripts/seed-admins.mjs
`);
    process.exit(1);
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Schema check failed (${response.status}): ${text}`);
  }
}

async function ensureAuthUser(admin) {
  if (!admin.email || !admin.password) {
    console.log(`• Skipping ${admin.label} (SEED_${admin.key.toUpperCase()}_EMAIL / _PASSWORD not set)`);
    return null;
  }

  const listed = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listed.error) throw listed.error;
  let authUser = listed.data.users.find((user) => user.email?.toLowerCase() === admin.email);

  if (!authUser) {
    const created = await supabase.auth.admin.createUser({
      email: admin.email,
      password: admin.password,
      email_confirm: true,
    });
    if (created.error) throw created.error;
    authUser = created.data.user;
    console.log(`• Created Supabase auth user ${admin.email} (${admin.label})`);
  } else {
    console.log(`• Reusing Supabase auth user ${admin.email} (${admin.label})`);
  }

  return authUser;
}

async function upsertUserRow(authUser, admin) {
  const existing = await rest("GET", "User", {
    query: `?authId=eq.${encodeURIComponent(authUser.id)}&select=*`,
  });

  if (existing?.length) {
    const updated = await rest("PATCH", "User", {
      query: `?id=eq.${existing[0].id}`,
      body: {
        email: admin.email,
        name: admin.displayName,
        role: admin.role,
        updatedAt: nowIso(),
      },
    });
    console.log(`• Refreshed Prisma User row for ${admin.email} → role ${admin.role}`);
    return updated[0];
  }

  const byEmail = await rest("GET", "User", {
    query: `?email=eq.${encodeURIComponent(admin.email)}&select=*`,
  });
  if (byEmail?.length) {
    const updated = await rest("PATCH", "User", {
      query: `?id=eq.${byEmail[0].id}`,
      body: { authId: authUser.id, role: admin.role, name: admin.displayName, updatedAt: nowIso() },
    });
    console.log(`• Linked Prisma User row for ${admin.email} → role ${admin.role}`);
    return updated[0];
  }

  const created = await rest("POST", "User", {
    body: withTimestamps({
      id: `c${randomBytes(12).toString("hex")}`,
      authId: authUser.id,
      email: admin.email,
      name: admin.displayName,
      role: admin.role,
    }),
  });
  console.log(`• Created Prisma User row for ${admin.email} → role ${admin.role}`);
  return created[0];
}

try {
  await assertSchemaReady();

  const results = [];
  for (const admin of ADMINS) {
    if (!VALID_ROLES.has(admin.role)) {
      throw new Error(`Invalid role ${admin.role} for ${admin.label}`);
    }
    const authUser = await ensureAuthUser(admin);
    if (!authUser) continue;
    const user = await upsertUserRow(authUser, admin);
    results.push({ ...admin, userId: user.id });
  }

  console.log("\n✓ Admin provisioning complete");
  for (const r of results) {
    console.log(`  ${r.label}: ${r.email} (role: ${r.role}, user id: ${r.userId})`);
  }
  console.log(`  Sign in at /login`);
} catch (error) {
  console.error(error);
  process.exit(1);
}
