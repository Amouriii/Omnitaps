# OmniTaps QR Ordering Platform Plan

## Objective

Add a mobile-first, table-aware restaurant ordering flow to the existing OmniTaps application while preserving the current QR menu, enterprise dashboard, captive WiFi, and WiFi Stripe upgrade features.

The first usable path will be guest ordering with pay-at-counter. Online food payments will use a provider-agnostic adapter supporting cards, digital wallets, Egypt-local wallets, bank or kiosk payment references, and BNPL where the selected provider and merchant account support them.

## Existing Architecture To Preserve

- React 19 + Vite SPA.
- Supabase enterprise domain as the source of truth for `enterprises`, `qr_menu_items`, authentication, RLS, and realtime.
- Prisma tenant/content domain remains separate and is not migrated.
- One production serverless API through `api/[...path].js`, routed via `api/_lib/routeTable.js`.
- Existing chatbot module reused for menu recommendations.
- Existing Stripe integration remains dedicated to captive WiFi upgrades.
- Existing `/menu/:restaurantId` browse-only flow remains functional while `/order/:restaurantId` becomes the ordering flow.

## Scope And Product Flow

1. Guest scans a table QR code containing the restaurant and table context.
2. An optional mocked WiFi splash appears in demo mode and can always be skipped.
3. Guest views the published menu without an account.
4. Guest adds available items to a cart or asks the chatbot for recommendations.
5. Guest checks out as a guest.
6. Guest chooses pay-at-counter or an available online payment method.
7. The order is created only after server-side menu, table, availability, and price validation.
8. Guest receives an order number and status link.
9. Staff sees the incoming order in the enterprise order queue and updates its status.
10. Loyalty points are awarded after the configured payment/confirmation event.
11. Guests may create or connect an account only for online payment or rewards enrollment.
12. Confirmation and account views can link to the restaurant's official website.

## Data Model

Create a new Supabase migration extending the existing enterprise domain.

### `restaurant_tables`

- `id`
- `enterprise_id`
- `table_number`
- `label`
- `qr_token`
- `is_active`
- timestamps

Use tenant-scoped uniqueness for table numbers and QR tokens. QR tokens should be opaque and should not expose internal IDs.

### `food_orders`

- `id`
- `enterprise_id`
- `table_id`
- nullable `customer_id`
- opaque `access_token_hash`
- guest name, email, and phone where supplied
- `status`: pending, confirmed, preparing, ready, served, cancelled
- `payment_method`: counter, card, Apple Pay, Google Pay, Samsung Pay, local wallet, bank transfer, kiosk, BNPL
- `payment_status`: unpaid, pending, paid, failed, refunded
- subtotal, tax, service charge, discount, total, currency
- timestamps

### `food_order_items`

- `id`
- `order_id`
- `menu_item_id`
- snapshot name
- snapshot unit price
- quantity
- modifiers JSON
- line total

Names and prices are snapshotted so historical orders do not change when the menu is edited.

### `customer_loyalty_accounts`

- `id`
- `enterprise_id`
- `customer_id`
- points balance
- lifetime points
- timestamps

### `customer_loyalty_transactions`

- `id`
- `enterprise_id`
- `customer_id`
- `order_id`
- points change
- reason
- unique idempotency key
- timestamps

### `food_payment_attempts`

- `id`
- `order_id`
- provider
- payment method
- external payment ID
- status
- amount and currency
- safe metadata
- timestamps

Store provider references and sanitized metadata only. Never store raw card numbers, wallet credentials, or payment authentication data.

### Enterprise configuration

Add configurable enterprise settings for:

- Currency and tax/service-charge behavior.
- Loyalty earning rule and confirmation event.
- Enabled payment providers and methods.
- Official restaurant website URL.
- Whether the mocked WiFi splash is enabled.

## Security And RLS

Add tenant-isolated RLS policies following the existing `get_user_enterprise_id()` and `get_user_role()` conventions.

- Public users can resolve only active restaurant tables and published menu data.
- Anonymous users cannot directly insert arbitrary orders into Supabase tables.
- Public order creation goes through the server API with rate limiting and validation.
- Staff and admins can read and update orders only for their enterprise.
- Customers can read only their own authenticated orders and loyalty data.
- Public status lookup requires an opaque order access token, not a predictable order ID.
- The API must verify that the table belongs to the requested restaurant and is active.
- The API must re-read current menu prices and availability inside the order-creation transaction.
- Client-provided totals, currency, item names, and payment status are never trusted.
- Webhooks must be signature-verified and idempotent.
- Sensitive provider configuration remains server-side.

## Customer Frontend

Add a canonical `/order/:restaurantId` route and ordering page.

Implement:

- Restaurant and table context resolution from the QR URL.
- Optional mocked WiFi splash with skip/continue behavior.
- Category navigation and menu item display using the existing QR menu data.
- Item detail, quantity controls, unavailable-item states, and cart persistence in session storage.
- Sticky mobile cart summary and checkout access.
- Guest name and optional contact fields.
- Payment method selection driven by the server's configured capabilities.
- Clear loading, empty, validation, failure, and success states.
- Order confirmation with order number, table, total, payment state, and status link.
- Optional rewards enrollment after checkout.
- Link to the restaurant's official website.

Keep `/menu/:restaurantId` working as the existing browse-only experience.

## Backend API

Extend `api/_lib/routeTable.js` and the existing dispatcher with handlers for:

- Public table resolution.
- Public menu/order-context loading.
- Guest order creation.
- Public order status lookup using an opaque access token.
- Authenticated customer order history.
- Customer loyalty balance and transaction history.
- Staff order listing.
- Staff order detail and status updates.
- Payment capability discovery.
- Payment checkout creation.
- Payment redirect/return handling.
- Payment webhook handling.

Use the existing request parsing, sanitization, rate-limit, and JSON response utilities. Keep all public endpoints narrowly scoped and return stable error codes for the frontend.

## Payment Architecture

Create a food-payment provider interface with operations equivalent to:

- `getCapabilities(context)`
- `createCheckout(order, returnUrls, paymentMethod)`
- `verifyWebhook(request)`
- `handlePaymentEvent(event)`
- `refundPayment(payment)`

The UI should receive a capability list from the backend and display only methods enabled for the restaurant, provider, currency, device, browser, and transaction amount.

### Supported payment catalog

The adapter and data model should explicitly support:

- Visa and Mastercard card payments.
- Apple Pay.
- Google Pay.
- Samsung Pay.
- Egypt-local mobile wallets, including Vodafone Cash, Orange Cash, and Etisalat Cash where available.
- Meeza and other locally supported card rails.
- Bank transfer with payment-reference or manual-confirmation state.
- Kiosk/payment-reference flows such as Fawry-style collection where available.
- Pay-at-counter.
- BNPL methods where supported by the selected provider and merchant account.

Apple Pay, Google Pay, and Samsung Pay should be implemented through gateway-hosted or gateway-tokenized flows. The platform should not handle wallet credentials directly. The plan should include provider capability discovery and configuration because wallet availability depends on gateway support, merchant onboarding, domain verification, device/browser support, and currency.

The initial release should ship the adapter contract and pay-at-counter flow even if online provider credentials are not yet available. Provider-specific integrations can be enabled incrementally without changing the order model or checkout UI contract.

Do not reuse the existing captive WiFi Stripe checkout route for food orders. The WiFi payment lifecycle and food-order payment lifecycle remain separate.

## Guest Checkout

Implement pay-at-counter first:

- Guest name required.
- Table context fixed from the validated QR token.
- No account required.
- Order submitted transactionally.
- Staff sees payment as unpaid/pending until confirmed according to restaurant policy.
- Guest receives a short-lived status link.

For online payments:

- Create a payment attempt and provider checkout session.
- Redirect to hosted checkout or provider wallet flow.
- Confirm payment only from a verified provider webhook or authoritative provider response.
- Make repeated webhook delivery harmless.
- Return the guest to the order confirmation route after success or cancellation.

## Staff Order Queue

Add an authenticated enterprise order view, reusing existing auth and module-gating patterns.

Include:

- New, confirmed, preparing, ready, served, and cancelled filters.
- Realtime order updates with polling fallback.
- Order detail showing table, guest, items, modifiers, totals, and payment status.
- Staff/admin status transition controls.
- Clear visual separation between unpaid counter orders and confirmed online orders.
- New-order attention state that respects reduced-motion preferences.
- Search or filtering by table and order number.

## Chatbot Cart Actions

Extend the existing chatbot contract to support safe structured recommendations:

- Read the current restaurant menu context.
- Recommend available menu items.
- Return structured item references and quantities when confidence is sufficient.
- Ask for confirmation before changing the cart.
- Fall back to normal text responses when item identification is uncertain.
- Preserve conversation logging and rate limiting.

The server must validate every chatbot-proposed item against the current menu before adding it to the cart.

## Loyalty

Add a configurable enterprise loyalty rule, initially points per currency unit or a percentage of eligible paid subtotal.

- Award points only after the configured payment or counter-confirmation event.
- Use an order-based unique idempotency key.
- Record every balance change in the transaction ledger.
- Do not award points for cancelled, failed, or refunded orders unless a compensating reversal is recorded.
- Allow account creation or rewards enrollment after checkout rather than blocking menu browsing or counter ordering.

## QR Table Administration

Extend the existing QR admin tooling to:

- Create, rename, activate, deactivate, and delete tables.
- Generate one printable QR per table.
- Encode the canonical restaurant/table URL.
- Reject inactive or deleted table tokens.
- Show the associated restaurant and table label.
- Avoid exposing internal database IDs where an opaque token can be used.

## Mocked WiFi Integration

Keep WiFi optional and isolated because pilot hardware is not confirmed.

- Add a demo/configuration-controlled mock splash step.
- Always allow the guest to skip it.
- Define an adapter boundary for a future MikroTik, UniFi, pfSense, or hotspot-service integration.
- Document router validation as a prerequisite for production captive-portal work.
- Leave the existing `/wifi-guest` flow and its Stripe upgrade behavior unchanged.

## Seed Data And Documentation

Extend demo seed data with:

- Active cafe tables and QR links.
- Demo orders in representative statuses.
- Loyalty configuration.
- Payment capability examples and disabled-provider placeholders.
- Official restaurant website URL.

Update the README with:

- New ordering routes.
- Migration order.
- Required environment variables.
- Payment provider setup and webhook endpoints.
- Wallet/domain verification prerequisites.
- The separation between food payments and WiFi payments.
- WiFi hardware validation requirements.

## Testing And Verification

Add focused Vitest coverage for:

- Active/inactive table-token validation.
- Cart quantity and total calculation.
- Server-side price recalculation.
- Unavailable-item rejection.
- Guest counter-order creation.
- Public order access-token authorization.
- Staff status transition rules.
- Payment capability filtering.
- Webhook signature verification and idempotency.
- Payment-method normalization for cards, Apple Pay, Google Pay, Samsung Pay, local wallets, bank/kiosk references, counter payment, and BNPL.
- Loyalty award and reversal idempotency.
- Chatbot structured cart-action validation.

Run:

- `npm run typecheck`
- `npm test`
- `npm run build`
- Manual smoke testing of guest ordering, counter checkout, staff updates, realtime refresh, invalid QR tables, payment failure/cancellation states, and existing menu/WiFi/admin routes.

## Four-Developer Parallel Work Breakdown

The work should be split across four branches/workspaces. Developer 1 is the foundation and integration lead; the other three developers work against the published contracts and local fixtures without waiting for production Supabase data.

### Developer 1 — Ordering Foundation, Database, and Core API

**Owns:** the ordering data contract, Supabase migration/RLS, guest order lifecycle, and final route registration.

**Primary work:**

- Create the ordering migration for `restaurant_tables`, `food_orders`, `food_order_items`, `customer_loyalty_accounts`, `customer_loyalty_transactions`, and `food_payment_attempts`.
- Add tenant-scoped indexes, constraints, realtime publication, and RLS policies.
- Add shared ordering types and validation under `db/schema/` or the established shared type location.
- Implement table resolution and active-table validation.
- Implement transactional guest order creation with server-side menu price and availability checks.
- Implement opaque order access-token generation, hashing, and public status lookup.
- Implement authenticated staff order list/detail/status API primitives.
- Add fixture/seed data for tables and representative orders.
- Own the final integration edits to `api/_lib/routeTable.js`, `src/App.jsx`, seed registration, and README/MEMORY updates after the parallel branches merge.

**Suggested ownership boundary:**

- `supabase/migrations/009_qr_ordering.sql`
- `supabase/seed_qr_ordering.sql` or the equivalent ordering seed module
- `db/schema/ordering.ts`
- `api/_lib/handlers/ordering*.js`
- `api/_lib/handlers/orderStatus*.js`
- `lib/ordering/`
- Final integration changes only in `api/_lib/routeTable.js`, `src/App.jsx`, `scripts/seed-enterprise.mjs`, `README.md`, and `MEMORY.md`

**Deliverables and acceptance criteria:**

- A clean migration can be applied after migrations 001–008.
- Invalid, inactive, cross-tenant, stale-price, and unavailable-item requests are rejected.
- Counter orders can be created without authentication.
- Repeated status requests cannot reveal another guest's order.
- Staff APIs enforce enterprise and role boundaries.
- Unit tests cover order validation, totals, access tokens, and status transitions.

### Developer 2 — Guest Ordering Experience

**Owns:** the public mobile ordering flow and client-side cart, using Developer 1's API contract or local fixtures.

**Primary work:**

- Build the canonical `/order/:restaurantId` customer page.
- Parse restaurant/table context and render clear table identity.
- Reuse the existing QR menu data and visual language without changing the browse-only `/menu/:restaurantId` flow.
- Build category navigation, item details, quantity editing, unavailable-item handling, and session-storage cart persistence.
- Build guest checkout fields, pay-at-counter submission, validation states, and order confirmation/status link.
- Render server-provided payment capabilities without embedding provider-specific assumptions in the cart.
- Add optional mocked WiFi splash UI behind a configuration/demo flag, with a visible skip path.
- Provide stable loading, empty, error, cancellation, and retry states.

**Suggested ownership boundary:**

- `src/pages/OrderPage.jsx`
- `src/pages/OrderStatusPage.jsx`
- `src/components/ordering/guest/`
- `src/hooks/useOrderCart.js`
- `src/lib/ordering/guestClient.js`
- Guest ordering tests and fixtures under `src` or `lib/ordering`

Do not modify `src/App.jsx`; provide the route entry and expected route parameters to Developer 1 for integration. Do not modify the shared payment adapter; consume its capability response through a typed client contract.

**Deliverables and acceptance criteria:**

- A guest can scan/open a table URL, add items, submit a counter order, and reach confirmation.
- Cart totals are correct for quantity changes but the UI never treats them as authoritative.
- The page handles invalid/inactive tables and unavailable items gracefully.
- The flow works at mobile widths and does not require an account.
- Existing public menu and captive WiFi routes remain unchanged.

### Developer 3 — Staff Operations and QR Table Administration

**Owns:** restaurant staff tooling, table lifecycle management, printable table QR codes, and realtime order presentation.

**Primary work:**

- Build the authenticated staff order queue under the existing enterprise console conventions.
- Add status filters, table/order search, order detail, payment-state display, and valid status transition controls.
- Subscribe to order realtime events with polling fallback and a visible new-order attention state.
- Build table CRUD: create, rename, activate/deactivate, and remove tables.
- Extend the QR admin experience to generate printable restaurant/table URLs using opaque QR tokens.
- Enforce staff/admin role expectations in the UI while relying on server-side authorization for security.
- Add empty, loading, error, and permission-denied states consistent with existing console screens.

**Suggested ownership boundary:**

- `src/pages/EnterpriseOrders.tsx`
- `src/pages/EnterpriseTables.tsx`
- `src/components/console/orders/`
- `src/components/console/tables/`
- `src/components/admin/RestaurantTablesAdmin.jsx`
- `src/services/orderingAdmin.ts`
- Realtime/polling hooks dedicated to orders and tables

Do not modify `src/App.jsx`, `EnterpriseConsole.tsx`, `api/_lib/routeTable.js`, or the core QR menu components directly. Provide route and navigation integration notes to Developer 1. Use mocked API responses when Developer 1's endpoints are not available.

**Deliverables and acceptance criteria:**

- Staff can see a new counter order without refreshing the page.
- Staff can move an order through valid states and cannot update another enterprise's order.
- Tables can be managed without exposing internal IDs in printed QR links.
- Deactivated tables are visibly marked and cannot be used for new orders.
- Reduced-motion users receive an equivalent non-animated new-order signal.

### Developer 4 — Payments, Loyalty, Chatbot Actions, and WiFi Adapter

**Owns:** external integrations and the capability contracts consumed by the guest and staff surfaces.

**Primary work:**

- Define the food-payment provider interface and capability model.
- Implement a mock provider plus the first provider adapter boundary for cards, Apple Pay, Google Pay, Samsung Pay, Egypt-local wallets, Meeza, bank transfer, kiosk/payment references, pay-at-counter, and supported BNPL.
- Implement hosted/tokenized checkout creation, return handling, webhook signature verification, idempotency, and refund state transitions where provider credentials are available.
- Keep food payments separate from the existing captive WiFi Stripe checkout.
- Implement loyalty configuration, earning, reversal, and idempotency logic.
- Extend chatbot responses with validated structured menu recommendations/cart actions and confirmation semantics.
- Define the mocked WiFi adapter and capability/configuration contract; do not alter the existing captive WiFi flow.
- Add integration tests for provider capability filtering, payment normalization, webhook retries, loyalty awards/reversals, and chatbot cart-action validation.

**Suggested ownership boundary:**

- `lib/payments/food/`
- `api/_lib/payments/food/`
- `api/_lib/handlers/foodPayment*.js`
- `api/_lib/handlers/loyalty*.js`
- `api/_lib/handlers/chatbotOrdering*.js` and related chatbot ordering helpers
- `lib/wifi/order-splash/` or an equivalent isolated mock adapter
- Payment, loyalty, and integration test files

Do not modify the existing `/api/v1/captive/checkout` implementation or its WiFi Stripe behavior. Do not modify `src/components/ordering/guest/`; publish the capability response and client contract for Developer 2 instead. Provider secrets, merchant IDs, wallet certificates, and webhook secrets must remain server-side.

**Deliverables and acceptance criteria:**

- The guest UI can discover enabled methods rather than assuming device/provider support.
- Unsupported wallet or BNPL methods are omitted cleanly.
- No raw payment credentials are stored.
- Duplicate webhooks cannot double-charge state or award loyalty points twice.
- Mock mode works without external credentials.
- Apple Pay, Google Pay, and Samsung Pay are represented through hosted/tokenized gateway flows and their domain/device/currency prerequisites are documented.

## Parallel Development Protocol

### Shared contract checkpoint

Before coding against one another, Developer 1 publishes a short contract containing:

- Table-resolution response shape.
- Menu/order-context response shape.
- Guest order-create request/response shape.
- Public order-status request/response shape.
- Staff order/status response shape.
- Canonical order and status URL formats.
- Order/payment/loyalty enum values.
- Error codes and HTTP status expectations.

Developers 2–4 may use checked-in fixtures matching this contract. Contract changes require a versioned update and notification to the other developers.

### Ownership and merge rules

- One developer owns each file; do not make opportunistic edits outside the listed boundaries.
- Only Developer 1 edits shared route registration and final app navigation files during integration.
- Developers 2–4 submit route/navigation requirements rather than editing `src/App.jsx` or the enterprise shell directly.
- No developer edits production environment files or deploys provider credentials.
- Database changes must be additive, ordered, idempotent, and documented.
- Every branch must include focused tests for its own behavior before integration.

### Integration checkpoints

1. **Foundation checkpoint:** Developer 1 migration, types, fixtures, and API contract are stable.
2. **UI parallel checkpoint:** Developers 2 and 3 run against fixtures and pass component/interaction tests; Developer 4 passes adapter and webhook tests in mock mode.
3. **First integration:** Developer 1 registers routes and wires the guest counter-order flow to the real API.
4. **Operations integration:** Staff queue consumes realtime/API data and table QR links resolve to the guest flow.
5. **Payments integration:** Payment capabilities and mock checkout are wired without changing counter ordering.
6. **Hardening checkpoint:** Run full typecheck, tests, build, RLS review, webhook idempotency tests, and manual end-to-end smoke tests.

## Delivery Sequence

The four workstreams begin in parallel after the shared contract checkpoint. The sequence below describes integration order, not serial development:

1. Developer 1 publishes schema/API contracts and fixtures.
2. Developers 2, 3, and 4 build independently against those contracts.
3. Integrate Developer 1's counter-order API with Developer 2's guest flow.
4. Integrate Developer 3's staff queue, table administration, and QR links.
5. Integrate Developer 4's payment capabilities, loyalty, chatbot actions, and mocked WiFi adapter.
6. Run end-to-end validation across counter ordering, online-payment mock mode, staff updates, realtime refresh, loyalty idempotency, invalid QR tables, and existing menu/WiFi/admin routes.
7. Enable provider-specific production methods only after merchant onboarding, gateway webhooks, wallet/domain verification, and EGP settlement are confirmed.

## Assumptions

- Supabase enterprise tables remain the ordering source of truth.
- Existing Prisma content/menu models are not migrated.
- Pay-at-counter is the first production-ready payment path.
- The final gateway selection, merchant account capabilities, and supported EGP payment rails must be confirmed before enabling production online methods.
- Supabase Auth remains the account system.
- WiFi is mocked until the pilot venue's hardware and gateway redirect contract are validated.
- Existing uncommitted worktree changes remain untouched unless directly related to this work.
