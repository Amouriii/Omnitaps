#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());

function run(command, args) {
  console.log(`\n› ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function hydrateEnv() {
  const envPath = resolve(root, ".env");
  if (!existsSync(envPath)) return;
  const text = readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
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

console.log("OmniTaps setup");

if (!existsSync(resolve(root, ".env"))) {
  copyFileSync(resolve(root, ".env.example"), resolve(root, ".env"));
  console.log("• Created .env from .env.example");
  console.log("• Fill DATABASE_URL (and Supabase keys), then re-run: npm run setup");
  process.exit(0);
}

hydrateEnv();

const dbUrl = process.env.DATABASE_URL?.trim() || "";
if (!dbUrl || dbUrl.includes("USER:PASSWORD") || dbUrl.includes("YOUR_")) {
  console.error("\nEdit .env and set a real DATABASE_URL, then run: npm run setup");
  process.exit(1);
}

run("npm", ["install"]);
run("npx", ["prisma", "generate"]);
run("npx", ["prisma", "db", "push"]);
run("npm", ["run", "db:seed"]);

console.log("\n✓ Setup complete");
console.log("  npm run dev       → local app");
console.log("  npm run launch    → deploy to Vercel (prod)");
