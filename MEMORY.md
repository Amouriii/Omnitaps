# Omnitaps — Project Memory

> Living knowledge base for agents and humans. **Update this file** whenever you add, remove, or materially change features, routes, schema, env vars, or known issues.
> Last updated: 2026-08-12

---

## Snapshot

| Item | Value |
|------|--------|
| Product | Omnitaps — hospitality/retail SaaS (menus, reviews, Wi‑Fi, websites, chatbot, admin) |
| Repo | `https://github.com/onouh/Omnitaps.git` |
| Default branch | `main` |
| Live | `https://omnitaps.vercel.app` |
| App style | React 19 + Vite 8 SPA; Vercel Serverless `/api`; Tailwind 4 |
| Primary auth | Supabase Auth (email) |
| Data (core product) | Postgres via **Prisma** (`prisma/schema.prisma`) — tenants, menu, reviews, wifi, website, chatbot |
| Data (enterprise nav / captive) | **Supabase** SQL migrations under `supabase/migrations/` — enterprises, profiles, menu_items, enterprise_modules, Wi‑Fi captive tables |
| Demo tenant slug | `demo` |

---

## Stack & commands

```bash
npm run setup     # install, prisma push, seed demo + admin
npm run dev       # Vite (APIs mounted locally)
npm run build     # prisma generate && vite build
npm run db:seed   # re-seed Prisma demo
npm run launch    # build + sync env to Vercel + production deploy
```

Env template: `.env.example`. Never put secrets in `VITE_*`.

Required env families:

- `DATABASE_URL` — Prisma/Postgres
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- `SEED_ADMIN_*`, `SEED_TENANT_*`
- Captive Wi‑Fi: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (+ per-enterprise `gateway_hmac_secret` in Supabase `enterprises`)

---

## Architecture notes

1. **Two parallel domains**
   - **Prisma tenants** power public guest routes (`/menu/:tenantId`, `/r/:tenantId/*`, `/s/:tenantId`, `/admin` APIs).
   - **Supabase enterprises** power the enterprise console demo, realtime menu editor, module gating, and captive Wi‑Fi portal tables.
2. **Frontend** lives in `src/` (Vite). Entry routing: `src/App.jsx`.
3. **API** lives in `api/` (Vercel Node handlers). Vite adapts them in local dev via `api/_lib/viteAdapter.js` (buffers `rawBody` for Stripe).
4. **Captive Wi‑Fi = Path A (wired, no Next runtime)**
   - Handlers authored as Web `Request`/`Response` under `app/api/v1/**/route.ts`.
   - Production: thin `api/v1/**/*.ts` wrappers use `wrapWebHandlers` (`api/_lib/webHandlerAdapter.js`).
   - Local Vite: `vite.config.js` loads the same route modules via `ssrLoadModule` (do not rely on plain Node `import` of `.ts`).
   - UI pages live at task paths `app/(portal)/wifi-guest/*` and `app/(dashboard)/enterprise/wifi/*`; `src/pages/WifiGuest*` / `EnterpriseWifi*` re-export them into React Router.
   - **Do not** apply raw `db/schema/wifi.ts` `wifiSchemaSql` — it conflicts with UUID `enterprises` / `profiles` from migrations 001–004. Use `005_wifi_captive_portal.sql` only.
   - Admin captive APIs authorize via **`profiles`** (`lib/wifi/profiles-auth.ts`), not `enterprise_members`.
   - Captive tables (`wifi_devices`, `wifi_sessions`, `subscription_plans`) coexist with Prisma `WifiNetwork` / QR Wi‑Fi — different names, different product surfaces.
   - RADIUS UDP CoA on Vercel is unreliable; checkout webhook fires CoA **non-blocking** and should not delay Stripe ACK. Prefer a worker later for durable CoA.
5. **Design tokens** (marketing + enterprise demo): porcelain/surface/ink/tap/brass/hairline, Instrument Sans, mono labels, `rounded-3xl` — align with `Home.jsx` / `AdminDashboard.jsx`.

---

## Key routes (Vite / React Router)

| Path | Purpose |
|------|---------|
| `/` | Marketing home |
| `/items/:id` | Product/module detail |
| `/changelog` | Changelog |
| `/menu/:tenantId` | Public QR menu |
| `/r/:tenantId/review` | Review gate |
| `/r/:tenantId/wifi` | Legacy/simple Wi‑Fi access (Prisma QR) |
| `/s/demo` | Website demo (renders Home) |
| `/s/:tenantId` | Tenant website preview |
| `/login` | Supabase login |
| `/admin` | Admin dashboard (Prisma-provisioned user) |
| `/demo/dashboard` | Enterprise console demo (Supabase `profiles`) |
| `/enterprise` | Redirect → `/demo/dashboard` |
| `/enterprise/wifi` | Captive telemetry (gated: `WifiModuleGate` + `wifi` module) |
| `/enterprise/wifi/settings` | Captive settings |
| `/enterprise/wifi/plans` | Plan editor |
| `/wifi-guest` | Captive portal landing (public) |
| `/wifi-guest/session` | Guest session / usage (public) |
| `/wifi-guest/checkout` | Paid upgrade checkout (public) |

### Captive / admin APIs

| Path | Methods | Notes |
|------|---------|--------|
| `/api/v1/captive/authenticate` | GET, POST | Gateway HMAC grant |
| `/api/v1/captive/session-status` | GET, POST, PATCH | Poll / SSE-style status |
| `/api/v1/captive/checkout` | GET, POST | Plans list; Stripe session + webhook (`bodyParser: false`) |
| `/api/v1/admin/wifi/telemetry` | GET | Bearer + `profiles` |
| `/api/v1/admin/wifi/settings` | GET, PATCH, POST, DELETE | Bearer + admin `profiles` role |

Admin Wi‑Fi UI reads `localStorage.omnitaps_access_token` (persisted from `src/lib/auth.jsx` on session change).

---

## Modules (product surface)

- **Menu** — public menu + scan events (Prisma); enterprise realtime menu (`DynamicMenu`, `MenuEditor`) on Supabase `menu_items`
- **Reviews** — review gate, campaigns, feedback (Prisma)
- **Wi‑Fi (tenant / QR)** — networks, splash, sessions (Prisma) via `/r/:tenantId/wifi`
- **Wi‑Fi (captive / enterprise)** — HMAC auth, quotas, telemetry, Stripe checkout; migration `005_wifi_captive_portal.sql`; Path A adapters above
- **Website** — pages/blocks/assets (Prisma) via `/s/:tenantId`
- **Chatbot** — bots, knowledge, conversations (Prisma + `api/chatbot`)
- **Enterprise nav** — `enterprises`, `profiles`, `enterprise_modules`, RLS via `get_user_enterprise_id()`; seed `supabase/seed_enterprise_nav.sql` (enables `wifi`, demo HMAC secret, sample plans, menu links)

---

## Supabase migrations (order)

1. `001_task_1_1_base_schema.sql` — enterprises, profiles, menu_items, enterprise_modules
2. `002_task_1_2_tenant_isolation.sql` — `get_user_enterprise_id()`
3. `003_task_1_3_rls_policies.sql` — RLS
4. `004_task_1_4_indexes_realtime.sql` — indexes + realtime publication
5. `005_wifi_captive_portal.sql` — captive columns on `enterprises` + `wifi_devices` / `wifi_sessions` / `subscription_plans`
6. `006_qr_menu_items.sql` — QR menu items additions

Seed: `supabase/seed_enterprise_nav.sql` (run with service role if `psql` unavailable). Apply **005 before** seed if using captive plans/HMAC columns.

---

## Important source map

| Area | Paths |
|------|--------|
| Routes | `src/App.jsx` |
| Auth (admin SPA / Prisma session) | `src/lib/auth.jsx` → `/api/admin/session` |
| Auth (enterprise / profiles) | `src/context/AuthContext.tsx`, `src/services/supabaseClient.ts` |
| Enterprise UI | `src/pages/EnterpriseConsole.tsx`, `EnterpriseWifi*.tsx` |
| Guest Wi‑Fi UI | `src/pages/WifiGuest*.tsx` → `app/(portal)/wifi-guest/*`, `components/wifi/portal/*` |
| Module gate | `src/components/auth/ModuleGuard.tsx`, `src/components/WifiModuleGate.jsx` |
| Menu realtime | `src/hooks/useRealtimeMenu.ts`, `src/components/menu/*` |
| Captive route logic | `app/api/v1/captive/*`, `app/api/v1/admin/wifi/*` |
| Captive Vercel wrappers | `api/v1/captive/*`, `api/v1/admin/wifi/*` |
| Web↔Node adapter | `api/_lib/webHandlerAdapter.js`, `api/_lib/lazyWebHandler.js` |
| Profiles auth helper | `lib/wifi/profiles-auth.ts` |
| Wi‑Fi libs | `lib/wifi/{mac-utils,HMAC-verifier,quota-calculator,radius-client}.ts` |
| Schema (do not apply raw) | `db/schema/wifi.ts` (types/Zod only for agents; DB = migration 005) |
| Prisma schema | `prisma/schema.prisma` |
| Deploy | `vercel.json` (CSP allows Stripe), `scripts/launch.mjs` |

---

## Known issues / ops

- Local Prisma/admin APIs fail if `DATABASE_URL` still has a placeholder password (`[YOUR-PASSWORD]`). Supabase JS + service role can still work for Auth/REST.
- After changing any `VITE_*` value, redeploy (or `npm run launch`) so the client bundle picks them up.
- Realtime: avoid duplicate channel names when `DynamicMenu` and `MenuEditor` both subscribe — use unique channel IDs.
- Dual trees (`app/` handler/UI sources vs `src/` Vite mounts): edit the `app/` / `components/wifi/` sources; keep re-exports in `src/pages/*` thin.
- `/admin` (RequireAuth + Prisma User) ≠ `/enterprise/wifi*` (WifiModuleGate + `profiles`). A Supabase user may have a profile without a Prisma `User.authId` row.
- Captive ops checklist: apply migration `005`, re-run `seed_enterprise_nav.sql`, set `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`; point Stripe webhooks at `/api/v1/captive/checkout`.
- Demo `gateway_hmac_secret` from seed must be rotated outside local/demo use.

---

## Changelog (memory log)

### 2026-08-12

- Added enterprise multi-tenant Supabase layer (migrations 001–004), AuthContext, realtime menu, ModuleGuard, seed.
- Added enterprise console demo at `/demo/dashboard`; `/enterprise` redirects there; marketing website demo at `/s/demo`.
- Restyled enterprise console to Omnitaps design tokens.
- Added Wi‑Fi captive portal module (migration 005, guest + admin pages, Stripe-related env, `api/v1/*`).
- **Path A wiring complete:** `webHandlerAdapter`, Vite `ssrLoadModule` routes, React Router mounts, profiles auth, non-blocking CoA, seed enables `wifi` + demo HMAC/plans; commit `9518211` on `main`.
- Memory refreshed with captive API table, Path A constraints, and dual-auth (`/admin` vs enterprise) caveats.
- Removed root `task2.xml`.
- Created this `MEMORY.md` + Cursor rule to keep it updated.

---

## How to update this file

When finishing work that changes the product:

1. Update **Snapshot**, **routes**, **modules**, or **source map** if structure changed.
2. Append a dated bullet under **Changelog (memory log)**.
3. Record new env vars, migrations, and known issues immediately.
4. Do **not** store secrets (passwords, service role keys, Stripe live keys) here — reference env var names only.
