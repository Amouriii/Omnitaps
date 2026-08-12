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
3. **API** lives in `api/` (Vercel Node handlers). Vite adapts them in local dev via `api/_lib/viteAdapter.js` / related adapters.
4. **Parallel Next-style trees** (`app/`, `components/wifi/`, `lib/wifi/`, `app/api/...`) exist for captive Wi‑Fi; Vite pages under `src/pages/` re-export or mirror those UIs. Prefer keeping Vite routes working as the production path.
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
| `/r/:tenantId/wifi` | Legacy/simple Wi‑Fi access |
| `/s/demo` | Website demo (renders Home) |
| `/s/:tenantId` | Tenant website preview |
| `/login` | Supabase login |
| `/admin` | Admin dashboard (seeded user) |
| `/demo/dashboard` | Enterprise console demo |
| `/enterprise` | Redirect → `/demo/dashboard` |
| `/enterprise/wifi` | Enterprise Wi‑Fi telemetry dashboard |
| `/enterprise/wifi/settings` | Wi‑Fi settings |
| `/enterprise/wifi/plans` | Plan editor |
| `/wifi-guest` | Captive portal landing |
| `/wifi-guest/session` | Guest session / usage |
| `/wifi-guest/checkout` | Paid upgrade checkout |

---

## Modules (product surface)

- **Menu** — public menu + scan events (Prisma); enterprise realtime menu (`DynamicMenu`, `MenuEditor`) on Supabase `menu_items`
- **Reviews** — review gate, campaigns, feedback (Prisma)
- **Wi‑Fi (tenant)** — networks, splash, sessions (Prisma) via `/r/:tenantId/wifi`
- **Wi‑Fi (captive / enterprise)** — plans, quotas, telemetry, Stripe checkout; migrations `005_wifi_captive_portal.sql`; APIs under `api/v1/captive/*` and `api/v1/admin/wifi/*`
- **Website** — pages/blocks/assets (Prisma) via `/s/:tenantId`
- **Chatbot** — bots, knowledge, conversations (Prisma + `api/chatbot`)
- **Enterprise nav** — `enterprises`, `profiles`, `enterprise_modules`, RLS via `get_user_enterprise_id()`; seed `supabase/seed_enterprise_nav.sql`

---

## Supabase migrations (order)

1. `001_task_1_1_base_schema.sql` — enterprises, profiles, menu_items, enterprise_modules
2. `002_task_1_2_tenant_isolation.sql` — `get_user_enterprise_id()`
3. `003_task_1_3_rls_policies.sql` — RLS
4. `004_task_1_4_indexes_realtime.sql` — indexes + realtime publication
5. `005_wifi_captive_portal.sql` — captive portal schema
6. `006_qr_menu_items.sql` — QR menu items additions

Seed: `supabase/seed_enterprise_nav.sql` (run with service role if `psql` unavailable).

---

## Important source map

| Area | Paths |
|------|--------|
| Routes | `src/App.jsx` |
| Auth (admin SPA) | `src/lib/auth.jsx` |
| Auth (enterprise) | `src/context/AuthContext.tsx`, `src/services/supabaseClient.ts` |
| Enterprise UI | `src/pages/EnterpriseConsole.tsx`, `EnterpriseWifi*.tsx` |
| Guest Wi‑Fi UI | `src/pages/WifiGuest*.tsx`, `components/wifi/portal/*` |
| Module gate | `src/components/auth/ModuleGuard.tsx`, `src/components/WifiModuleGate.jsx` |
| Menu realtime | `src/hooks/useRealtimeMenu.ts`, `src/components/menu/*` |
| Captive APIs | `api/v1/captive/*`, `api/v1/admin/wifi/*` |
| Prisma schema | `prisma/schema.prisma` |
| Deploy | `vercel.json`, `scripts/launch.mjs` |

---

## Known issues / ops

- Local Prisma/admin APIs fail if `DATABASE_URL` still has a placeholder password (`[YOUR-PASSWORD]`). Supabase JS + service role can still work for Auth/REST.
- After changing any `VITE_*` value, redeploy (or `npm run launch`) so the client bundle picks them up.
- Realtime: avoid duplicate channel names when `DynamicMenu` and `MenuEditor` both subscribe — use unique channel IDs.
- Dual trees (`app/` Next-style vs `src/` Vite): keep behavior in sync when editing Wi‑Fi UIs/APIs.

---

## Changelog (memory log)

### 2026-08-12

- Added enterprise multi-tenant Supabase layer (migrations 001–004), AuthContext, realtime menu, ModuleGuard, seed.
- Added enterprise console demo at `/demo/dashboard`; `/enterprise` redirects there; marketing website demo at `/s/demo`.
- Restyled enterprise console to Omnitaps design tokens.
- Added Wi‑Fi captive portal module (migration 005, guest + admin pages, Stripe-related env, `api/v1/*`).
- Commit `9518211` pushed to `main`.
- Removed root `task2.xml`.
- Created this `MEMORY.md` + Cursor rule to keep it updated.

---

## How to update this file

When finishing work that changes the product:

1. Update **Snapshot**, **routes**, **modules**, or **source map** if structure changed.
2. Append a dated bullet under **Changelog (memory log)**.
3. Record new env vars, migrations, and known issues immediately.
4. Do **not** store secrets (passwords, service role keys, Stripe live keys) here — reference env var names only.
