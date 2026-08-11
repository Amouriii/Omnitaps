#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());

const REQUIRED = [
  "DATABASE_URL",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
];

function hydrateEnv() {
  const envPath = resolve(root, ".env");
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

function run(command, args, opts = {}) {
  console.log(`\n› ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: opts.input ? ["pipe", "inherit", "inherit"] : "inherit",
    shell: process.platform === "win32",
    env: process.env,
    input: opts.input,
  });
  if (result.status !== 0 && !opts.allowFail) {
    process.exit(result.status ?? 1);
  }
  return result.status === 0;
}

function hasVercelCli() {
  const result = spawnSync("vercel", ["--version"], {
    cwd: root,
    stdio: "pipe",
    shell: process.platform === "win32",
  });
  return result.status === 0;
}

function syncEnvVar(key, value) {
  for (const target of ["production", "preview"]) {
    // Remove existing (ignore failure), then add fresh value non-interactively.
    run("vercel", ["env", "rm", key, target, "--yes"], { allowFail: true });
    const ok = run("vercel", ["env", "add", key, target], { input: `${value}\n` });
    if (!ok) {
      console.error(`Failed to sync ${key} → ${target}`);
      process.exit(1);
    }
  }
  console.log(`• Synced ${key}`);
}

hydrateEnv();

const missing = REQUIRED.filter((key) => {
  const value = process.env[key]?.trim() || "";
  return !value || value.includes("YOUR_") || value.includes("USER:PASSWORD") || value.startsWith("your-");
});

if (missing.length) {
  console.error("Fill these in .env first:");
  for (const key of missing) console.error(`  - ${key}`);
  process.exit(1);
}

if (!hasVercelCli()) {
  console.log("Installing Vercel CLI…");
  run("npm", ["i", "-g", "vercel"]);
}

console.log("Building…");
run("npm", ["run", "build"]);

console.log("\nLinking Vercel project (if needed)…");
run("vercel", ["link", "--yes"], { allowFail: true });

console.log("\nSyncing .env → Vercel (production + preview)…");
for (const key of REQUIRED) {
  syncEnvVar(key, process.env[key].trim());
}

console.log("\nDeploying production…");
run("vercel", ["--prod", "--yes"]);

const slug = process.env.SEED_TENANT_SLUG || "demo";
console.log(`
✓ Live. Smoke-test on your Vercel URL:
  /menu/${slug}
  /r/${slug}/review
  /r/${slug}/wifi
  /s/${slug}
  /login
`);
