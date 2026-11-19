# Unified Hospitality System — Phased Implementation Plan

**Status:** planning only. No code has been written against this document.
**Date:** 2026-11-18
**Inputs:** `unified_restaurant_service_implementation_guide.html` (external spec),
`docs/QR_ORDERING_PLATFORM_PLAN.md` (existing in-repo ordering plan), and a source-level
audit of this repository.

This plan answers three questions for each module in the external guide: *what to build*,
*in what order*, and *what doesn't belong in this architecture at all*. It deliberately
does **not** restructure the repository to match the guide's directory tree.

---

## 0. Product framing — what is being sold

**Omnitaps is the company.** The system described in the external guide is *Omnitaps'
all-in-one packaged service*, sold to hospitality and retail clients — not a separate
product to be built from scratch and not a per-client deployment.

Consequences for every phase in this plan:

1. **One platform, many client venues.** The guide's single `Store` maps to an Omnitaps
   `enterprise` (Supabase) or `Tenant` (Prisma). There is exactly one deployment serving
   every client; isolation comes from `enterprise_id` / `tenant_id` scoping plus RLS,
   never from separate databases, branches, or services per customer.
2. **Capabilities are packaged, not sold a-la-carte by checkbox at build time.**
   `public.enterprise_modules` (`module_key`, unique per enterprise) is the entitlement
   table, with `TenantPlan` (STARTER / GROWTH / PRO / ENTERPRISE) as the commercial tier.
   New modules (ordering, waiter-ai, reservations) must register a `module_key` and be
   gated with `src/components/auth/ModuleGuard.tsx` / `WifiModuleGate` on the client,
   and enforced server-side from the same entitlement — never from a client flag.
3. **Every new capability is a sellable unit.** Each phase below adds a module that a
   client can be switched on for without touching code or redeploying for that tenant.
4. **Multi-tenant defaults.** Any guide instruction that assumes one store per database,
   one `DATABASE_URL` per restaurant, or a per-customer install is adapted to the shared
   platform under AD-2 and AD-8 instead of being copied literally.
5. **Brand stays Omnitaps.** Guest-facing surfaces may carry the venue's branding
   (the demo café theme is the existing example), but the platform, admin console, and
   client onboarding remain Omnitaps-branded.

---

## 1. Baseline: what already exists

Verified from source, migrations, and the route table on 2026-11-18.

| Capability | State | Evidence |
|---|---|---|
| React 19 + Vite SPA, one Vercel catch-all API | Done | `api/[...path].js` → `api/_lib/routeTable.js`; `src/App.jsx` |
| Multi-tenant Prisma domain (menus, website, reviews, wifi, chatbot) | Done | `prisma/schema.prisma` (Tenant, Menu\*, Review\*, Wifi\*, Chatbot\*) |
| Supabase enterprise domain (enterprises, profiles, captive wifi, wallet, loyalty) | Done | `supabase/migrations/001–010` |
| Public QR menu (browse only) | Done | `src/pages/CustomerMenuPage.jsx`, `/api/tenants/:tenantId/menu` |
| Admin menu editor + availability flag | Done | `src/pages/AdminMenuPage.jsx`, `MenuItem.isAvailable` |
| Review gate + Google redirect + visit tracking | Done | `api/_lib/handlers/reviewsVisit.js`, `ReviewProfile` |
| QR Wi-Fi payload + Wi-Fi access page | Done | `api/_lib/wifiPayload.js`, `src/pages/WifiAccess.jsx` |
| Captive Wi-Fi portal (Stripe, OTP, RADIUS quota) | Done, mature | `app/api/v1/**`, `lib/network/*` (unit-tested) |
| Chatbot (knowledge-source grounding, optional Groq) | Done | `api/_lib/handlers/chatbotMessage.js`, `api/_lib/chatbot/*` |
| Apple Wallet membership pass | Done | `api/_lib/appleWalletPass.js`, `supabase/migrations/009` |
| Loyalty program (points, rewards, ledger, idempotent RPCs) | Done (enterprise plane) | `supabase/migrations/010`, `api/_lib/handlers/loyaltyProgram.js`, `/enterprise/loyalty` |
| Tables / QR table sessions | **Missing** | no `restaurant_tables` anywhere |
| Orders / cart / kitchen lifecycle | **Missing** | no `food_orders`, no order API, `CustomerMenuPage` is browse-only |
| Loyalty→order coupling (earn on paid, reversals) | **Missing** | ledger exists but nothing calls `loyalty_award_points` from an order |
| Tiers/milestones beyond a `tier` text column | **Missing** | `loyalty_members.tier` is a bare string, no tier table |
| AI waiter (tool-calling, grounded recommendations, cart handoff) | **Missing** | no `waiter-ai`, no tool calls, no structured response schema |
| Google Wallet / Samsung Wallet | **Missing** | Apple only |
| Apple pass push updates (APNs) | **Missing** | `webServiceURL` is env-gated but no web-service routes or push |
| Reservations (allocation solver, waitlist, conflict checks) | **Missing** | only marketing copy + a demo-café form |
| Durable domain events / outbox | **Missing** | only `lib/network/QuotaEventEmitter.ts` (in-memory, Wi-Fi quota) |
| Menu stock counts, dietary/flavor tags, pairing IDs, spice level | **Missing** | `qr_menu_items` has only name/description/price/calories/nutrition/availability |

**Quality gates today:** `npm run build` exit 0, `npx tsc --noEmit` exit 0,
`npx vitest run` 86/86 passing. Playwright e2e (`e2e/motion.spec.ts`) exists but is not
part of the verified gate.

---

## 2. Architectural decisions

These constrain every phase. Numbers are referenced by the phases below.

| ID | Decision | Rationale |
|---|---|---|
| **AD-1** | Keep the SPA + single serverless function. Do **not** adopt the guide's `apps/web` Next.js monorepo or `src/modules/*` layout. | The repo ships on Vercel Hobby with a 12-function cap; `api/[...path].js` + `routeTable.js` is the established extension point. A framework migration would rewrite the product, not extend it. |
| **AD-2** | **Supabase enterprise plane is the source of truth for tables, sessions, orders, loyalty, and wallet.** Prisma stays canonical for tenant content, menus, website, reviews, chatbot, and admin. | Matches `docs/QR_ORDERING_PLATFORM_PLAN.md` and the already-shipped loyalty/wallet/captive work. Two planes already coexist; merging them is a separate, much larger project. |
| **AD-3** | No Redis, no BullMQ, no long-lived WebSocket server. Use Postgres outbox rows + Supabase Realtime + SSE/polling. | Serverless isolates cannot hold connections or workers. `qr_menu_items` is already in the `supabase_realtime` publication, so Realtime is available today. |
| **AD-4** | In-process events are fine *within* a request; anything that must survive the response is written to a `domain_events` outbox row and drained by an idempotent, authenticated job endpoint. | Replaces the guide's `eventBus.emit` semantics without inventing infrastructure. |
| **AD-5** | Keep the existing LLM abstraction (Groq via `api/_lib/chatbot/*`). Add tool-calling there; do not add a second AI stack. | One provider already wired, rate-limited, and falling back safely. |
| **AD-6** | Renumber migrations. The next free number is **011**; `009` and `010` are already `apple_wallet` and `loyalty`. `QR_ORDERING_PLATFORM_PLAN.md` still says `009_qr_ordering.sql` — that section is stale and this plan supersedes it. | Prevents a collision that would corrupt an apply sequence. |
| **AD-7** | Every mutation carries an idempotency key; every public read is scoped by tenant + opaque token. | Existing pattern in `loyalty_award_points` / `loyalty_redeem_reward`; extend it rather than inventing a new one. |
| **AD-8** | Ship the packaged system as **one multi-tenant deployment**; the guide's single-store assumptions are adapted, never implemented as per-client infrastructure. | Omnitaps sells the package to many venues (see §0). Per-client forks or databases would make upgrades and support unshippable. |
| **AD-9** | Every new module ships with an `enterprise_modules.module_key`, a plan-tier mapping, and both client + server enforcement. | `enterprise_modules` and `ModuleGuard` already exist; this keeps the commercial packaging honest as the product grows. |
| **AD-10** | **AI answers are grounded in the client's own database rows, never in a static menu or general model knowledge.** Every `waiter_ai` tool reads Postgres/Prisma through the same server-side services the UI uses (`MenuQueryService`, orders, loyalty, reservations), scoped to the caller's `enterprise_id` and session. Prices, availability, item IDs, and perks in a reply must all come from those rows; the validator drops anything the tools did not return. | Owner decision (2026-11-18): the host venue's live data is the only truth the AI may speak from, and no reply may mix venues or invent an item. |

---

## 3. Explicitly dropped from the guide

Items removed on purpose. "Replace with" is what we do instead.

| Guide item | Verdict | Why | Replace with |
|---|---|---|---|
| `unified-hospitality-service/` monorepo, `apps/web`, Next.js `src/app/*` routes | **Drop** | Wrong framework; would discard the SPA, the Vercel routing model, and the demo surfaces. | Existing `src/pages` + React Router routes (P1–P7 add routes there). |
| One Prisma schema owning everything (`Store`, `Table`, `Order`, `LoyaltyTier` in Prisma) | **Drop** | Duplicates tables that already exist in Supabase with RLS, seeds, and UI. | Supabase migrations 011+ for operational data (AD-2). |
| Redis + BullMQ workers | **Drop** | No worker runtime on the deploy target. | `domain_events` outbox + cron/manual drain endpoint (AD-3/AD-4). |
| Typed in-process `eventBus` as the cross-module integration mechanism | **Drop as primary** | Events cannot cross serverless invocations in memory. | Outbox rows + Supabase Realtime; keep a thin typed emitter for same-request side effects. |
| Separate `src/modules/{menu,orders,loyalty,...}` service classes | **Drop** | Would create a parallel abstraction over code that already works. | Thin server adapters in `api/_lib/` + `lib/*` helpers, following existing conventions. |
| Samsung Wallet | **Drop** | Requires partner onboarding and a signing relationship with no available merchant account. | Apple pass only; Google Wallet is deferred until an issuer account exists (decision 3). |
| Google Wallet | **Defer (locked)** | Needs a Google Wallet issuer account and service-account key; not available now. | Not built in P6 (decision 3): `wallet_google` stays off and the provider is omitted from the UI. |
| Apple APNs pass push + pass web service | **Defer (P6, locked)** | Needs a Pass Type ID cert, push key, and public web-service URL. | Ship Apple pass *issuance* first (already done); add `webServiceURL` routes + push only when certs are provisioned (decision 2). |
| Signed `.mobileconfig` Wi-Fi profile | **Drop for now** | iOS ignores unsigned profiles; signing needs an MDM/cert authority setup we don't have. | `WIFI:` QR payload + one-tap copy already implemented (`api/_lib/wifiPayload.js`). |
| Full KDS (`kds-admin` screen set) | **Defer to P7+** | Kitchen hardware/printing scope is not defined. | Staff order queue with status transitions (P3). |
| Split bills | **Defer** | Adds payment complexity before the single-bill flow is proven. | Single order per table session; split later if requested. |
| `WaiterAiConversation` as a new model with JSON message blob | **Drop the model** | Duplicates `chatbot_conversations` / `chatbot_messages`. | Extend the existing chatbot tables with `tool_calls`, `reasoning_summary`, `recommended_items`. |
| `CustomerProfile` unified identity with `allergens[]`, dietary prefs, `memberCode` | **Drop as a rewrite** | Different identity models already exist per plane (`Customer` in Prisma, `enterprises`/`profiles`/`loyalty_members` in Supabase). | Store allergy/dietary prefs on the order/session context in P1/P3; member identity stays `loyalty_members`. |
| `/t/:qrToken` table sessions in Prisma | **Adapt, don't drop** | Needed function, wrong plane. | `restaurant_table_sessions` in Supabase (P2), route `/t/:qrToken` in the SPA. |
| "One service per restaurant" deployment model | **Drop** | Contradicts the packaged offering; Omnitaps operates one platform for all clients. | Multi-tenant deployment with `enterprise_id` isolation and per-client entitlements (AD-8/AD-9). |
| Hard-coded per-customer feature sets in the build | **Drop** | A packaged product must switch capabilities on per client without a redeploy. | `enterprise_modules` entitlements + `TenantPlan` tier mapping. |

---

## 4. Target data model (Supabase, migrations 011+)

Only what the phases need; members/ledger already exist and are reused. Every table below
carries `enterprise_id` (or reaches it through a parent row) so one platform can serve all
clients, and every new capability is additionally gated by an `enterprise_modules.module_key`.

### 011 — ordering foundation
- `restaurant_tables` — `id`, `enterprise_id`, `table_number`, `label`, `qr_token` (opaque, unique),
  `min_capacity`, `max_capacity`, `combinable_with uuid[]`, `zone`, `status`, `is_active`, timestamps.
- `restaurant_table_sessions` — `id`, `table_id`, `status`, `guest_token_hash`, `wifi_connected`,
  `maps_review_clicked`, `started_at`, `closed_at`.
- `food_orders` — `id`, `enterprise_id`, `table_id`, `session_id`, `loyalty_member_id`,
  guest name/email/phone, `status`, `payment_method`, `payment_status`,
  subtotal/tax/service/discount/total (cents), `currency`, `access_token_hash`, `points_awarded_at`, timestamps.
- `food_order_items` — `id`, `order_id`, `qr_menu_item_id`, `name_snapshot`, `unit_price_cents`,
  `quantity`, `selected_modifiers jsonb`, `special_notes`, `recommended_by_ai`.
- `food_payment_attempts` — `id`, `order_id`, provider, method, external id, status, amount, currency, safe metadata.
- RLS: public may resolve active tables and published menu; creation goes through the API only.

### 012 — menu grounding
- Extend `qr_menu_items` with `stock_count`, `prep_time_minutes`, `spice_level`,
  `dietary_tags text[]`, `flavor_tags text[]`, `pairing_ids uuid[]`, `category_id`, `sort_order`.
- `qr_menu_categories`, `qr_menu_modifiers` (group + option, price delta, availability).
- Realtime publication already covers `qr_menu_items`; add the new tables.

### 013 — loyalty depth
- `loyalty_tiers` (`program_id`, `name`, `min_lifetime_points`, `multiplier`, `perks text[]`).
- `loyalty_milestones` (`program_id`, `title`, `points_threshold`, `reward_type`, `reward_value`, `repeatable`).
- `loyalty_member_unlocks` (`member_id`, `milestone_id`, `status`, `unlocked_at`, `redeemed_at`).
- Keep `loyalty_transactions` as the immutable ledger (already has `idempotency_key`).

### 014 — reservations
- `reservations` — `id`, `enterprise_id`, `table_ids uuid[]`, `party_size`, `start_time`,
  `end_time`, `status`, `customer name/phone/email`, `special_requests`, `zone`, timestamps.

### 015 — outbox
- `domain_events` — `id`, `topic`, `payload jsonb`, `status` (`pending|done|failed`),
  `attempts`, `available_at`, `created_at`, `processed_at`, unique `(topic, dedupe_key)`.

---

## 5. Phases

Each phase is independently shippable and leaves build/typecheck/tests green.

### Phase 0 — Foundations (no user-visible change)
**Depends on:** nothing.
**Build:**
- Shared ordering/loyalty types under `db/schema/` (or the established shared type location).
- `domain_events` migration + `api/_lib/handlers/domainEventsDrain.js` (authenticated, idempotent, batched).
- A thin typed emitter helper for same-request side effects.
- API contract document (request/response shapes, error codes) checked in next to the plan.
- Feature flags for `ordering`, `waiter_ai`, `reservations`, `wallet_push` (env-driven, default off).
- Register the packaged module keys (`ordering`, `waiter_ai`, `reservations`) for
  `public.enterprise_modules`, extend `ModuleGuard`/gate components to accept them, and
  document the `TenantPlan` ↔ module mapping — the tiers are locked in §8, decision 6.
- Correct the stale migration number in `QR_ORDERING_PLATFORM_PLAN.md`.
**Acceptance:** drain endpoint processes the same row twice without duplicating effects; flags default off; a client without the entitlement sees neither the UI nor a working API; no route changes yet.
**Risk:** low.

### Phase 1 — Menu awareness & stock (unblocks AI and ordering)
**Depends on:** Phase 0 (types).
**Build:**
- Migration 012; seed updates.
- `MenuQueryService` adapter in `api/_lib/` that reads `qr_menu_items` with filters:
  `onlyAvailable`, `excludeAllergens`, `requiredDietaryTags`, `maxPriceCents`, `maxSpiceLevel`.
- Modifier groups are minimal and structured (decision 5): name, min/max selections, price delta,
  availability. Free text is allowed only as a guest special-request note, never as priced content.
- Admin surface: 86 toggle, stock count, tags on `AdminMenuPage` (via existing enterprise menu editor).
- Public menu: surface unavailable state from live data.
- Realtime: subscribers refetch on `qr_menu_items` changes (existing publication).
**Acceptance:** an item set to `stock_count = 0` disappears from the public menu and from query results within one refresh; allergen exclusion provably filters out tagged items.
**Risk:** medium — menu editor is shared with the Prisma demo path; keep enterprise-only edits behind the existing module gate.

### Phase 2 — Tables, QR sessions, Wi-Fi, review reward
**Depends on:** Phase 1 (menu resolution).
**Build:**
- Migration 011 tables + sessions (split: 011a ordering tables can ship here without orders).
- `GET /api/v1/qr/:qrToken` → table, active session (create or join), Wi-Fi payload,
  Google Maps review URL, review reward points.
- SPA route `/t/:qrToken`: table identity, menu handoff, 1-tap Wi-Fi, review card after order paid.
- Table admin (create/rename/activate/deactivate, printable QR) in the enterprise console.
- Emit `table.qr_scanned` to the outbox; reservations (P7) will consume it.
**Acceptance:** invalid/inactive/foreign tokens return stable errors; two scans in the same session reuse it; Wi-Fi payload parses correctly; review URL uses the configured place ID.
**Risk:** medium — QR token opacity and tenant scoping.

### Phase 3 — Orders & staff queue (counter first)
**Depends on:** Phases 1–2.
**Build:**
- Migration 011 remainder (`food_orders`, `food_order_items`, `food_payment_attempts`).
- `POST /api/v1/orders` (transactional: re-read prices/availability, snapshot names, reject stale/unavailable),
  `GET /api/v1/orders/:id?token=…` (opaque access token), staff list/detail/status endpoints.
- Guest flow `/order/:restaurantId` + `/t/:qrToken` cart, session-storage persistence, pay-at-counter confirmation.
  No online gateway in this phase (decision 1): the charge happens at the counter and staff mark the order paid.
  Put the call behind a `PaymentProvider` interface with a `counter` implementation, so a gateway can be added
  later as a second implementation without touching order or cart code.
- Staff queue: filters, status transitions, realtime + polling fallback.
- On confirm/paid: write `order.paid` to `domain_events` (drain in P4).
- Enforce the `ordering` module entitlement on create/status/staff routes, not only in the UI.
**Acceptance:** client-supplied totals ignored; unavailable item rejected; repeated status lookups can't leak another guest's order; staff cannot cross tenants; a client without `ordering` gets a stable `MODULE_DISABLED` error.
**Risk:** high — this is the largest single phase; scope to counter payment only.

### Phase 4 — Loyalty loop, tiers, milestones
**Depends on:** Phase 3 (`order.paid`).
**Build:**
- Migration 013.
- Order-paid consumer: award points via existing `loyalty_award_points` with
  `idempotency_key = order:<id>`, evaluate tiers, unlock milestones, write `loyalty.updated` to outbox.
- Reversal path for cancelled/refunded orders (compensating ledger entry).
- Guest-facing balance/rewards endpoint scoped by opaque order/member token.
- Milestone redemption at checkout (discount/free item) validated server-side.
- Review-completion bonus wired to the P2 review card (+N points, idempotent per session).
**Acceptance:** duplicate `order.paid` awards once; refund reverses once; tier upgrade and milestone unlock are observable in the ledger and UI.
**Risk:** medium — money-adjacent; needs the idempotency tests from the existing plan.

### Phase 5 — AI waiter (grounded, tool-calling)
**Depends on:** Phase 1 (query service), Phase 3 (cart contract), Phase 4 (perks).
**Build:**
- Extend `api/_lib/chatbot/` with a `waiter` mode: tools `search_live_menu`, `get_customer_perks`, `add_to_cart_draft`.
- System prompt + Zod response schema (`conversationalReply`, `reasoningSummary`, `recommendations[]`, `followUpSuggestions[]`).
- Validate every recommended/bridged item ID against the live query result before returning; never embed a static menu.
- Grounding is database-only (AD-10): each tool returns rows already scoped by `enterprise_id`, the model receives
  only those rows, and the response validator discards any ID, price, allergen claim, or availability statement that
  is absent from the tool output. No retrieval across tenants, no cached global menu, no price from the prompt.
- Persist tool calls + reasoning on the existing chatbot message rows.
- Drawer UI on `/t/:qrToken` and `/order/:restaurantId` with reasoning and "add to cart" chips.
- `waiter_ai` entitlement enforced server-side; clients on lower plans keep the existing support chatbot.
**Acceptance:** out-of-stock or allergen-excluded items never appear; every returned ID exists in the DB at response time; LLM failure falls back to the keyword matcher without breaking the page; a two-tenant test proves no reply or tool payload carries the other tenant's items (AD-10).
**Risk:** medium — prompt-injection and price/ID trust; mitigate by treating model output as untrusted input and by grounding every claim in returned rows (AD-10).

### Phase 6 — Wallet currency (Apple issuance-only, Google deferred)
**Depends on:** Phase 4 (`loyalty.updated`).
**Build:**
- Apple: pass reflects live balance/tier/next milestone; add pass web-service + APNs **only if**
  `APPLE_WALLET_*` push credentials exist. Locked decision 2: ship issuance-only until they do, and document it.
- Google Wallet: not built until an issuer account and service account exist (decision 3); `wallet_google` stays
  off and the button stays hidden, rather than shipping an error state.
- Samsung: not built (see §3).
**Acceptance:** pass updates after a points change when credentials are configured; unconfigured providers are cleanly omitted from the UI.
**Risk:** medium/external — blocked on credentials, not code.

### Phase 7 — Reservations
**Depends on:** Phases 1–2 (tables, sessions), Phase 3 (order status not required).
**Build:**
- Migration 014.
- Capacity is per-zone from `restaurant_tables.zone` (decision 4), falling back to per-venue only when a client
  has no zones configured.
- `estimateTurnMinutes(partySize, startTime)` and `findBestTableAllocation` (single → combinable → waitlist),
  blocking tables with active sessions inside the 45-minute window.
- `POST /api/v1/reservations/availability` and `/api/v1/reservations`.
- Public `/reserve/:restaurantId` widget + waitlist tracker; staff floor/reservation control.
- Consume `table.qr_scanned` to flag walk-in conflicts.
- `reservations` entitlement, per-client enablement from the console.
**Acceptance:** no double-allocation under concurrent requests (transaction/serializable or unique constraint); waitlist promotes in order; deactivated tables never allocated.
**Risk:** medium-high — concurrency correctness is the hard part.

### Phase 8 — Hardening & release
**Depends on:** all previous.
**Build:** RLS review, rate limits on every new public route, idempotency audit, error-code catalogue,
seed data for tables/orders/loyalty, **client onboarding** (create a venue, seed its tables and
entitlements, no code changes per client), packaging documentation (which plan includes which
module), `README.md` + `MEMORY.md` updates, e2e coverage for guest ordering, staff queue,
reservation, and existing menu/Wi-Fi regressions.
**Acceptance:** `npm run build`, `npm run typecheck`, `npm test`, and Playwright e2e all green;
staging smoke test of the full guest journey.

---

## 6. Dependency graph

```
P0 Foundations
 └─► P1 Menu awareness ──┬─► P2 Tables/QR/Wi-Fi ─► P3 Orders ─► P4 Loyalty loop
                          │                                   │
                          ├─► P5 AI waiter ◄──────────────────┘
                          │
                          └─► P7 Reservations (also needs P2)
P4 ─► P6 Wallet
P0..P7 ─► P8 Hardening
```

Hard sequencing constraints:
- P1 before P5 (grounding must be real).
- P2 before P3 (table context must be trustworthy).
- P3 before P4 (nothing to award points for otherwise).
- P4 before P6 (nothing to push to a wallet).
- P7 can run in parallel with P5/P6 once P2 lands.

---

## 7. Cross-cutting requirements (apply to every phase)

1. **Trust boundary:** client never supplies prices, totals, currencies, item names, or payment status.
2. **Idempotency:** every mutation and every outbox consumer takes a dedupe key.
3. **Tenant isolation:** every read/write scoped by `enterprise_id` derived from the session, never a client parameter.
4. **Opaque tokens:** table QR and order-status access tokens hashed at rest, rotated on misuse.
5. **Failure behaviour:** degraded mode must not break existing guest routes; Prisma-based demo café fallbacks stay untouched.
6. **Docs in lockstep:** any schema/route/env change updates `README.md`, `MEMORY.md`, and this file's phase status.
7. **Test gate per phase:** at minimum `npm run typecheck` + `npm test`; e2e added in P8. Current baseline is 86 unit tests.

---

## 8. Decisions (locked, human-approved)

All six questions were answered by the owner on **2026-11-18**, together with one added condition —
AI must answer from the client's own database (recorded as decision 7 and AD-10). They are constraints
now, not options, and the phase text above already reflects them.

| # | Decision | Locked answer | Applies to |
|---|---|---|---|
| 1 | Food payment at launch | **Pay-at-counter only.** No gateway, no merchant onboarding, no settlement code. The charge is a staff action; code calls a `PaymentProvider` interface whose only implementation is `counter`. First online gateway later is a second implementation behind the same interface (Stripe, kept separate from the captive Wi-Fi routes). | P3 |
| 2 | Apple pass push | **Issuance-only.** Pass web service and APNs wait until a Pass Type ID certificate, push key, and public HTTPS web-service URL exist. The pass is still live-data-driven at issuance time. | P6 |
| 3 | Google Wallet | **Not built.** No issuer account, so no JWT save link and no PATCH sync. `wallet_google` stays off; the UI omits the provider instead of exposing a failing button. Build it as a contained addition when the account exists. | P6 |
| 4 | Reservation capacity | **Per-zone**, read from `restaurant_tables.zone`, falling back to per-venue only for clients with no zones. Prevents a patio from being overbooked while the dining room sits empty. | P7 |
| 5 | Modifiers at launch | **Minimal structured modifier groups**: name, min/max selections, price delta, availability. Free-text notes are for special requests only and are never priced. | P1, P3 |
| 6 | Plan tiers | **STARTER:** menu, reviews, Wi-Fi. **GROWTH:** + ordering, reservations. **PRO:** + `waiter_ai`, loyalty, wallet. **ENTERPRISE:** everything, plus captive Wi-Fi portal, SSO, and custom domains. | P0, P8 |
| 7 | AI data source | **The client's own database**, per AD-10. The assistant answers from the tenant's live menu, stock, modifiers, order state, loyalty balance, and table availability, fetched server-side for that request. It never answers from a static menu file, a model's general knowledge, or another tenant's rows, and a reply with an unverifiable item, price, or availability claim is rejected rather than shown. | P5 |

**What this unblocks:** the `TenantPlan` ↔ `module_key` mapping in Phase 0 (decision 6), the whole of
Phase 3 (decision 1), the modifier schema in Phase 1 (decision 5), and the reservation allocator in
Phase 7 (decision 4). No phase is waiting on a human answer any more. The only remaining external
dependencies are credentials — Apple pass certificates and a Google Wallet issuer account — and they
block only the push half of P6, which is explicitly deferred.

**What this changes in the plan:** Phase 3 ships no payment provider, Phase 6 ships no Google Wallet,
Phase 5 gained AD-10 as a hard acceptance rule, and Phase 0 must seed the tier mapping above.

---

## 9. What this plan does not do

- Does not migrate the Prisma tenant domain into Supabase, or vice versa.
- Does not introduce Redis, workers, WebSockets, or a second deployable.
- Does not rename existing routes, tables, or env vars.
- Does not touch the captive Wi-Fi portal or its Stripe flow.
- Does not implement Google/Samsung Wallet without merchant credentials.
- Does not promise the guide's full six-module parity; §3 lists what is intentionally out.
