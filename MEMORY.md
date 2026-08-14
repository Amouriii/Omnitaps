# Omnitaps — Project Memory

> Living knowledge base for agents and humans. **Update this file** whenever you add, remove, or materially change features, routes, schema, env vars, or known issues.
> Last updated: 2026-08-13

---

## Snapshot

| Item | Value |
|------|--------|
| Product | Omnitaps — hospitality/retail SaaS (menus, reviews, Wi‑Fi, websites, chatbot, admin) |
| Repo | `https://github.com/onouh/Omnitaps.git` |
| Default branch | `main` |
| Live | `https://omnitaps.vercel.app` |
| App style | React 19 + Vite 8 SPA; one Vercel Serverless Function `api/[[...path]].js`; Tailwind 4 |
| Primary auth | Supabase Auth (email) |
| Data (core product) | Postgres via **Prisma** (`prisma/schema.prisma`) — tenants, menu, reviews, wifi, website, chatbot |
| Data (enterprise nav / captive) | **Supabase** SQL migrations under `supabase/migrations/` — enterprises, profiles, menu_items, enterprise_modules, Wi‑Fi captive tables |
| Demo tenant slug | `demo` (Prisma guest) |
| Enterprise console slug | `demo-enterprise` |
| Guest QR enterprise slug | `demo` (after `seed_enterprise_nav.sql`) |

---

## Stack & commands

```bash
npm run setup     # install, prisma push, seed demo + admin
npm run dev       # Vite (APIs mounted locally)
npm run build     # prisma generate && vite build
npm start         # production HTTP: dist/ + API dispatch (scripts/docker-server.mjs via tsx)
npm run db:seed   # re-seed Demo Café (Prisma TCP, or HTTPS if DATABASE_URL is a placeholder)
npm run db:seed-http  # same café seed via Supabase REST (no Postgres TCP)
npm run launch    # build + sync env to Vercel + production deploy
```

Env template: `.env.example`. Never put secrets in `VITE_*`.

Required env families:

- `DATABASE_URL` — Prisma/Postgres
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- `SEED_ADMIN_*`, `SEED_TENANT_*`
- Captive Wi‑Fi: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (+ per-enterprise `gateway_hmac_secret` in Supabase `enterprises`)
- Docker **build-time** (baked into the SPA): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (`--build-arg`; rebuild to change)
- Docker **runtime** (container env, never bake `.env` into the image): `DATABASE_URL`, `SUPABASE_*`, `STRIPE_*`, `SEED_*`, `PORT` (default `3000`)

---

## Architecture notes

1. **Two parallel domains**
   - **Prisma tenants** power public guest routes (`/menu/:tenantId`, `/r/:tenantId/*`, `/s/:tenantId`, `/admin` APIs).
   - **Supabase enterprises** power the enterprise console demo, realtime menu editor, module gating, and captive Wi‑Fi portal tables.
2. **Frontend** lives in `src/` (Vite). Entry routing: `src/App.jsx`.
3. **API** is one Vercel Serverless Function: `api/[[...path]].js` (Hobby 12-function cap). It dispatches via `api/_lib/routeTable.js` + `api/_lib/dispatch.js` (`:params` merged into `req.query`). Handlers live under `api/_lib/handlers/` so they are not counted as functions. Vite uses the same table/dispatcher (`api/_lib/viteAdapter.js` buffers `rawBody`). Unmatched `/api/*` returns 404 JSON (not the SPA). Catch-all has `bodyParser: false` and `maxDuration: 30` so Stripe webhooks still see raw bytes.
4. **Captive Wi‑Fi = Path A (wired, no Next runtime)**
   - Handlers authored as Web `Request`/`Response` under `app/api/v1/**/route.ts`.
   - Production: thin `api/_lib/handlers/v1*.ts` wrappers use `wrapWebHandlers` (`api/_lib/webHandlerAdapter.js`).
   - Local Vite: `vite.config.js` loads the same `app/api/v1/**/route.ts` modules via `ssrLoadModule` (do not rely on plain Node `import` of `.ts`).
   - UI pages live at task paths `app/(portal)/wifi-guest/*` and `app/(dashboard)/enterprise/wifi/*`; `src/pages/WifiGuest*` / `EnterpriseWifi*` re-export them into React Router.
   - **Do not** apply raw `db/schema/wifi.ts` `wifiSchemaSql` — it conflicts with UUID `enterprises` / `profiles` from migrations 001–004. Use `005_wifi_captive_portal.sql` only.
   - Admin captive APIs authorize via **`profiles`** (`lib/wifi/profiles-auth.ts`), not `enterprise_members`.
   - Captive tables (`wifi_devices`, `wifi_sessions`, `subscription_plans`) coexist with Prisma `WifiNetwork` / QR Wi‑Fi — different names, different product surfaces.
   - RADIUS UDP CoA on Vercel is unreliable; checkout webhook fires CoA **non-blocking** and should not delay Stripe ACK. Prefer a worker later for durable CoA.
5. **Design tokens**
   - **Omnitaps product** (marketing Home, `/login`, `ConsoleChrome`, `/admin`, `/demo/dashboard`): porcelain `#faf9f7` / surface `#ffffff` / ink `#12151a` / tap `#155eef` / brass `#b8873b` / hairline `#e7e4dd`, Instrument Sans, IBM Plex Mono. Defined in `src/index.css` `@theme`.
   - **Demo Café guest brand** (scoped `.demo-cafe-theme`, not a global rewrite): cream paper porcelain `#f3eadc`, surface `#faf4ea`, espresso ink `#2c1b12`, terracotta accent (reuses `--color-tap`) `#c45c26`, brass-gold `#c4a35a`, hairline `#e4d4c0`. Display **Fraunces**, body Instrument Sans. CSS: `src/styles/demoCafe.css`. `CafeThemeGate` wraps those guest paths only (`/demo`, `/menu/demo`, `/menu-prisma/demo`, `/s/demo`, `/r/demo/*` — **not** `/demo/dashboard`): it portals `DemoChrome` to `document.body` and pads the page with `--demo-chrome-h`. The bar (`.demo-chrome-bar`) is `position: fixed` so it stays above café pages and the chat launcher.
   - Wordmark is **Omnitaps** on product surfaces; guest chrome says **Demo Café · Harbor Lane**.

---

## Key routes (Vite / React Router)

| Path | Purpose |
|------|---------|
| `/` | Marketing home |
| `/demo` | Demo Café guest hub (menu, reviews, Wi‑Fi, website) |
| `/items/:id` | Product/module detail |
| `/changelog` | Changelog |
| `/menu/:tenantId` | Public QR menu (Supabase enterprise; Prisma café fallback if resolve fails — `/menu/demo` is Demo Café) |
| `/menu-prisma/:tenantId` | Prisma public menu (direct) |
| `/r/:tenantId/review` | Review gate |
| `/r/:tenantId/wifi` | Legacy/simple Wi‑Fi access (Prisma QR) |
| `/s/:tenantId` | Tenant website preview (`/s/demo` = Demo Café site + chatbot) |
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
- **Chatbot** — bots, knowledge, conversations (Prisma + `api/_lib/handlers/chatbotMessage.js`); guest widget matches seeded HOURS/MENU/WIFI/FAQ knowledge, with a generic handover fallback. File map below.
- **Enterprise nav** — `enterprises`, `profiles`, `enterprise_modules`, RLS via `get_user_enterprise_id()`; seed `supabase/seed_enterprise_nav.sql` (enables `wifi`, demo HMAC secret, sample plans, menu links)

---

## Supabase migrations (order)

1. `001_task_1_1_base_schema.sql` — enterprises, profiles, menu_items, enterprise_modules
2. `002_task_1_2_tenant_isolation.sql` — `get_user_enterprise_id()`
3. `003_task_1_3_rls_policies.sql` — RLS
4. `004_task_1_4_indexes_realtime.sql` — indexes + realtime publication
5. `005_wifi_captive_portal.sql` — captive columns on `enterprises` + `wifi_devices` / `wifi_sessions` / `subscription_plans`
6. `006_qr_menu_items.sql` — QR menu items additions

Seed: `supabase/seed_enterprise_nav.sql` (run with service role if `psql` unavailable). Apply **005 before** seed if using captive plans/HMAC columns. Apply **006** before seed if you want `qr_menu_items` for `/menu/demo`. The SQL now upserts enterprise slug `demo` (Demo Café) plus `demo-enterprise` (console), and fills `qr_menu_items` for both when the table exists.

### Demo Café seed contents (Prisma `npm run db:seed`)

- Tenant slug `demo`, name Demo Café, address 14 Harbor Lane, Demo City.
- Website blocks: HERO, MENU_EMBED, HOURS, MAP, GALLERY, CTA — CTAs to `/menu/demo`, `/r/demo/review`, `/r/demo/wifi`.
- Menu: Drinks / Plates / Sweets (~12 items); House Latte + Avocado Toast popular; Seasonal Shakshuka sold out; allergens on relevant items.
- Wi‑Fi: SSID `{slug}-guest` (demo-guest), WPA2 `WIFI:` QR payload; splash headline/body for Demo Café guest Wi‑Fi. Password is the documented demo value in `prisma/seed.js`.
- Review profile: Google place URL kept; `/r/demo/review` loads it from `/api/reviews/visit`.
- Chatbot knowledge: HOURS, MENU, WIFI, FAQ (reviews + location/parking/reservations).

---

## Important source map

| Area | Paths |
|------|--------|
| Routes | `src/App.jsx` |
| Demo hub / chrome | `src/pages/DemoHub.jsx`, `src/components/demo/DemoChrome.jsx`, `src/components/demo/CafeThemeGate.jsx` (portals fixed chrome), `src/styles/demoCafe.css` |
| Demo Café API fallback | `api/_lib/demoCafe.js` — website/menu/wifi/chat when Prisma is down |
| Operator chrome | `src/components/console/ConsoleChrome.jsx` — `/admin`, `/demo/dashboard`, `/login` |
| Prisma public menu UI | `src/pages/MenuPublic.jsx`, `src/components/menu/PrismaPublicMenu.jsx` |
| Chatbot (SPA) | `src/modules/chatbot/` — widget, client helper, prompts, types |
| Chatbot (API) | `api/_lib/handlers/chatbotMessage.js`, `api/_lib/chatbot/` (match, knowledge, prompts, future AI SDK) |
| Auth (admin SPA / Prisma session) | `src/lib/auth.jsx` → `/api/admin/session` |
| Auth (enterprise / profiles) | `src/context/AuthContext.tsx`, `src/services/supabaseClient.ts` |
| Enterprise UI | `src/pages/EnterpriseConsole.tsx`, `EnterpriseWifi*.tsx` |
| Guest Wi‑Fi UI | `src/pages/WifiGuest*.tsx` → `app/(portal)/wifi-guest/*`, `components/wifi/portal/*` |
| Module gate | `src/components/auth/ModuleGuard.tsx`, `src/components/WifiModuleGate.jsx` |
| Menu realtime | `src/hooks/useRealtimeMenu.ts`, `src/components/menu/*` |
| Captive route logic | `app/api/v1/captive/*`, `app/api/v1/admin/wifi/*` |
| Captive Vercel wrappers | `api/_lib/handlers/v1*.ts` (loaded by the catch-all) |
| Catch-all function | `api/[[...path]].js` — only Serverless Function under `api/` |
| Route table / dispatch | `api/_lib/routeTable.js`, `api/_lib/dispatch.js`, `api/_lib/matchRoute.js` |
| Guest/admin Node handlers | `api/_lib/handlers/*.js` |
| Web↔Node adapter | `api/_lib/webHandlerAdapter.js`, `api/_lib/lazyWebHandler.js` |
| Profiles auth helper | `lib/wifi/profiles-auth.ts` |
| Wi‑Fi libs | `lib/wifi/{mac-utils,HMAC-verifier,quota-calculator,radius-client}.ts` |
| Schema (do not apply raw) | `db/schema/wifi.ts` (types/Zod only for agents; DB = migration 005) |
| Prisma schema | `prisma/schema.prisma` |
| Deploy | `vercel.json` (CSP allows Stripe), `scripts/launch.mjs` |
| Docker HTTP server | `scripts/docker-server.mjs` — Node `http`, `createViteApiMiddleware` + `createProductionRouteTable()`, `dist/` + SPA fallback, same security headers as `vercel.json` |
| Docker image | `ghcr.io/onouh/omnitaps:latest` (GHCR multi-arch `linux/amd64` + `linux/arm64`); `Dockerfile` (multi-stage `node:22-bookworm-slim`, OCI `org.opencontainers.image.source`), `.dockerignore`, `.github/workflows/docker-publish.yml` |

---

## Chatbot module (file map)

Guest chat is a Vite widget + Vercel Node handler. Do **not** add Next.js `app/api/chat` routes. Prisma models stay in `prisma/schema.prisma` (`ChatbotBot`, `ChatbotKnowledgeSource`, `ChatbotConversation`, `ChatbotMessage`, `ChatbotHandover`).

| Path | Role |
|------|------|
| `src/modules/chatbot/components/ChatWidget.tsx` | Guest widget on `/s/:tenantId` (`WebsitePreview`); open panel is portaled to `document.body` |
| `src/modules/chatbot/lib/sendChatMessage.ts` | Client POST helper for `/api/chatbot/message` |
| `src/modules/chatbot/prompts/` | SPA system-prompt / greeting templates |
| `src/modules/chatbot/types.ts` | Shared client types (not a copy of Prisma schema) |
| `src/modules/chatbot/index.ts` | Barrel exports |
| `api/_lib/handlers/chatbotMessage.js` | Live JSON handler (rate limit, persist turns, keyword reply) |
| `api/_lib/chatbot/match.js` | Keyword matcher (current production reply path) |
| `api/_lib/chatbot/knowledge.js` | Load active knowledge sources |
| `api/_lib/chatbot/prompts.js` | Server prompt assembly |
| `api/_lib/chatbot/ai.js` | Stub for later `ai` SDK (`generateText` / `streamText` via AI Gateway) |
| `api/_lib/chatbotMatch.js` | Compatibility re-export of the matcher |

Runtime today: keyword match only. A later pass may install `ai` and add a stream handler under `api/_lib/handlers/` (wired in the catch-all table) without converting the SPA to Next.js.

---

## Known issues / ops

- Local Prisma/admin APIs fail if `DATABASE_URL` still has a placeholder password (`[YOUR-PASSWORD]`). Unencoded brackets also break URL parsing. Supabase JS + service role can still work for Auth/REST. `npm run db:seed` now detects that and falls back to `db:seed-http` (PostgREST). Paste the real URI from Supabase → Database settings to use Prisma TCP.
- Guest Demo Café routes (`/s/demo`, `/menu/demo`, `/r/demo/wifi`, chatbot on the café site) serve Harbor Lane content from `api/_lib/demoCafe.js` when Prisma is unconfigured or the demo tenant/rows are missing. `/admin` still needs a real `DATABASE_URL`.
- After changing any `VITE_*` value, redeploy (or `npm run launch`) so the client bundle picks them up. Docker images need a rebuild with `--build-arg VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
- Optional Docker image on GHCR: `docker pull ghcr.io/onouh/omnitaps:latest` then `docker run --rm -p 3000:3000 --env-file .env ghcr.io/onouh/omnitaps:latest`. Postgres/Supabase stay outside the image. CI (`.github/workflows/docker-publish.yml`) rebuilds on push to `main` using Actions secrets/vars `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (anon only). First GHCR package is private until made public. Vercel production is unchanged.
- Realtime: avoid duplicate channel names when `DynamicMenu` and `MenuEditor` both subscribe — use unique channel IDs.
- Dual trees (`app/` handler/UI sources vs `src/` Vite mounts): edit the `app/` / `components/wifi/` sources; keep re-exports in `src/pages/*` thin.
- `/admin` (RequireAuth + Prisma User) ≠ `/enterprise/wifi*` (WifiModuleGate + `profiles`). A Supabase user may have a profile without a Prisma `User.authId` row.
- Captive ops checklist: apply migration `005`, re-run `seed_enterprise_nav.sql`, set `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`; point Stripe webhooks at `/api/v1/captive/checkout`.
- Demo `gateway_hmac_secret` from seed must be rotated outside local/demo use.
- Richer Demo Café content (menu, website blocks including gallery, Wi‑Fi splash, chatbot knowledge) requires `npm run db:seed`.
- `/menu/demo` shows Prisma café dishes after that seed. After `006` + `supabase/seed_enterprise_nav.sql`, the same URL can resolve the Supabase enterprise slug `demo` and `qr_menu_items` instead.
- Demo Café visual theme is CSS-variable scoped; do not restyle Home / ConsoleChrome / login to terracotta.

---

## Changelog (memory log)

### 2026-08-13

- Published Docker image to GHCR: `ghcr.io/onouh/omnitaps:latest` (multi-arch `linux/amd64` + `linux/arm64`). Dockerfile OCI label `org.opencontainers.image.source=https://github.com/onouh/Omnitaps`. CI workflow `.github/workflows/docker-publish.yml` on push to `main` + `workflow_dispatch`; build-args from GitHub secrets/vars `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (anon only). Pull/run: `docker pull ghcr.io/onouh/omnitaps:latest` then `docker run --rm -p 3000:3000 --env-file .env ghcr.io/onouh/omnitaps:latest`. Deps stage uses `npm ci --ignore-scripts` because `postinstall` (`prisma generate`) runs before `prisma/schema.prisma` is copied.
- Docker production image (optional, does not change Vercel): multi-stage `Dockerfile` on `node:22-bookworm-slim` (`linux/amd64` + `linux/arm64` via Buildx). Runtime HTTP is `npm start` → `node --import tsx scripts/docker-server.mjs` (API dispatch + `dist/` SPA). Build-time env names: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Runtime env names: `DATABASE_URL`, `SUPABASE_*`, `STRIPE_*`, `SEED_*`, `PORT`. Postgres is not bundled.
- Product snapshot: React 19 + Vite 8 SPA on Vercel; production APIs remain **one** Serverless Function `api/[[...path]].js` (Hobby 12-function cap) with handlers in `api/_lib/handlers/`, dispatch via `routeTable.js` + `dispatch.js`, unmatched `/api/*` → 404 JSON, `bodyParser: false` and `maxDuration: 30` for Stripe. Guest Demo Café uses `api/_lib/demoCafe.js` when Prisma is down; café theme/chrome via `CafeThemeGate` (portaled, fixed). Chatbot lives in `src/modules/chatbot` + `api/_lib/handlers/chatbotMessage.js` + `api/_lib/chatbot/`. Dual Prisma/Supabase domains unchanged. Seed: `npm run db:seed` / `db:seed-http`; `/admin` still needs a real `DATABASE_URL`. Live: `https://omnitaps.vercel.app`.

### 2026-08-12

- Production APIs are a single Vercel catch-all (`api/[[...path]].js`) with `bodyParser: false`; handlers moved to `api/_lib/handlers/` so Hobby stays under the 12-function cap. Public `/api/*` URLs unchanged. Vite middleware uses the same route table + dispatcher; v1 still SSR-loads `app/api/v1/**/route.ts`.
- Guest demo APIs fall back to `api/_lib/demoCafe.js` so website, menu, Wi‑Fi QR, and chatbot render without Prisma TCP. `/menu/demo` always uses the café menu (not an empty QR list). Café website drops the extra tenant chrome; chat launcher is docked with safe-area offset.
- `npm run db:seed` no longer dies on Prisma “Can't reach database server” when `.env` still has `[YOUR-PASSWORD]`; it seeds Demo Café over HTTPS (`scripts/seed-http.mjs`) instead. Placeholder URL detection lives in `api/_lib/databaseUrl.js`.
- Demo Café guest brand: scoped `.demo-cafe-theme` (espresso/cream/terracotta/brass, Fraunces display) on guest demo routes only; product tokens unchanged.
- Seed: Harbor Lane café copy, 12 menu items, gallery block, Wi‑Fi splash, chatbot FAQ; Supabase seed adds slug `demo` + `qr_menu_items`. Review gate uses seeded Google URL from visit API.
- Chatbot folder map: SPA under `src/modules/chatbot/` (widget, lib, prompts, types); API libs under `api/_lib/chatbot/`. Keyword matcher and `ChatWidget` remain the live path; AI SDK not installed yet.
- Operator UX: `/admin`, `/demo/dashboard`, and `/login` share `ConsoleChrome` (Omnitaps wordmark, Site / Demo Café / Website / Dashboard / Admin nav, product empty/loading/error states). QR food-menu admin at `/admin/menu` is unchanged as a separate surface.
- Guest demo UX: `/demo` hub, Home “Try demos” nav, DemoChrome on café guest pages.
- `/s/demo` now loads the Prisma Demo Café website (not marketing Home). `/menu/demo` falls back to the Prisma public menu when no Supabase enterprise slug `demo` exists.
- Seed expanded: ~10 menu items (Drinks/Plates/Sweets), hours/map/CTA website blocks, Wi‑Fi splash, chatbot knowledge. Re-run `npm run db:seed` locally.
- Chatbot API matches seeded knowledge (hours, menu, Wi‑Fi, reviews) instead of a stub-only reply.
- Added enterprise multi-tenant Supabase layer (migrations 001–004), AuthContext, realtime menu, ModuleGuard, seed.
- Added enterprise console demo at `/demo/dashboard`; `/enterprise` redirects there.
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
