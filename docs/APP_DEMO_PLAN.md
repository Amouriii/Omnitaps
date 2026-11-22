# OmniTaps App Demo Suite — Long-Term Plan

> Companion doc for the `/demo/app` full-suite phone demo, and the roadmap that extends it.

## Where things stand today

The product has 14+ demo surfaces, but they land as separate desktop-leaning pages:

- Guest demo café: `/demo`, `/menu/demo`, `/r/demo/review`, `/r/demo/wifi`, `/s/demo`
- Interactive module demos: `/demo/wallet`, `/demo/loyalty`, `/demo/qr`, `/demo/pablo-and-abdo`, `/demo/koffee-kulture`
- Operator: `/demo/dashboard`, `/login`, `/admin`
- Member-facing: `/wallet/membership?token=...`

Most of the real customer experience is phone-native: QR scan on iPhone → save to Wallet → show at door; captive Wi-Fi join from a phone; loyalty scan at the counter. The current demos don't present that as one app, and several are desktop-first builder UIs rather than "phone in your hand" screens.

## What this branch adds now

- **`/demo/app`** — a single iPhone-framed app shell that presents the full suite as one app.
- Phone chrome: notch, status bar, dynamic island, home indicator.
- Persistent bottom tab bar across the suite.
- 10 curated demo screens that map to real product surfaces.
- A guided tour so a prospect can be handed the phone and walked through the story.
- Email capture for "build this for my business" conversion.

Screens modeled inside the phone frame:

1. Home — suite value prop + scan prompt
2. Demo Café — Harbor Lane menu/QR guest surface
3. Wallet Membership — interactive pass builder + simulated Add to Apple Wallet
4. Loyalty — points/tiers/rewards simulation
5. Wi‑Fi — guest join flow (QR + password)
6. Reviews — review funnel preview
7. Website + Chat — café site and chatbot preview
8. Ordering — menu scan → cart → order (simulated desktop/chrome ordering if real ordering isn't wired; otherwise mirror existing ordering demo)
9. Admin / Dashboard — operator console
10. Onboarding tour — guided first-run highlight flow

## Why this matters

- Marketing/demo conversion: a prospect can be shown the whole product on a phone in a few minutes, instead of clicking through scattered pages.
- Realism: the app frame makes Wallet/Wi‑Fi/loyalty/scan flows feel like the real iPhone experience customers actually get.
- A clear anchor for long-term demo QA and for the "dummy iPhone" verification step.

## Long-term improvements (roadmap)

### 1. iPhone-first demo paths
- Pair every desktop builder demo (Wallet, Loyalty) with a compact phone view that mirrors what a member actually sees: barcode/QR, tier badge, redeem screen, Wallet "Add to Apple Wallet" sheet.
- Add a "scan this with iPhone camera" affordance that links to `/wallet/membership?token=...` and the real pkpass download when signing credentials exist.

### 2. Phone-native interaction hooks
- Real `omnitaps://membership/<number>` deep-link story in the demo (documented, even if the scheme isn't registered on a real device yet).
- Captive Wi-Fi "join from iPhone" demo that shows the splash capture flow and OTP echo in a phone-style UI.
- Simulated scan handoff from loyalty → wallet → counter check-in, so the loop is visible in one place.

### 3. Operator + guest pairing
- The strongest story is the guest→operator loop. Long-term, add a paired view where the guest scans/adds to Wallet, and the operator dashboard reflects it.
- This is the killer demo for cafés, gyms, and clubs: one phone for the guest, one screen for the operator.

### 4. Demo content resilience
- Some surfaces depend on seeded data (menu, website, reviews, Wi‑Fi splash). Make every demo surface advertise clearly what is live vs simulated when credentials or seed data are missing.
- Extend the pattern from the contact form's `CONTACT_DELIVERY_UNCONFIGURED` fallback and `demoCafe.js` to all demo surfaces: graceful, honest, never silently empty.

### 5. Resilient demo infra
- Keep the single-serverless-function discipline (Hobby 12-function cap).
- Keep fallbacks for Wallet (no signing creds → signed-pass fails closed, demo still shows realistic preview), Wi‑Fi (no Stripe → still show join flow, OTP echo in dev), chatbot (no Groq → keyword matcher), loyalty (no Supabase → in-memory demo).

### 6. QA & verification
- The `/demo/app` shell is the natural anchor for a dummy-iPhone smoke test: launch the live/published URL on an iPhone simulator, walk each tab, confirm no console errors and no broken chrome.
- Long-term, add per-surface notes for what requires what credentials so a reviewer can set expectations before the test.

## Sub-agent review methodology

When multiple roles review a change, use this loop:

1. **Developer** ships the change.
2. **Tester** runs a focused verification: build, typecheck, existing tests, plus a behavior check for the changed path. Reports PASS / BLOCKED with specifics. If BLOCKED, route back to Developer (max 2 iteration cycles).
3. **User** walks the behavior from the acceptance point of view: does it feel like the real app? Is it honest about what's live vs simulated? Any friction or empty states that would embarrass a prospect?
4. **Tech Specialist** checks architecture fit: does it respect the 12-function cap, the single `api/[...path].js` discipline, the dual Prisma/Supabase model, the demo-theme scoping rules, the fallback expectations?
5. **CEO** checks scope and prioritization: does this move the product toward launch readiness and demo conversion, or is it polish without payoff?
6. **Financial Investor** checks cost/risk/ROI: any new infra, new secrets, new build-time env, new runtime cost, or new hiring/dependency risk. If there is risk, is it disclosed?
7. **Orchestrator** synthesizes and decides: ship, revise, or hold.

Critique rules:
- Critique the work, not the person.
- Prefer concrete repro steps or file/line references over vibes.
- If a reviewer asks for a change, say whether it's a fix (reliability/security/correctness) or a preference (style/scope), and prioritize fixes first.
- Disagree loudly but briefly when a reviewer's request would break an existing constraint (e.g., function cap, theme scoping, fallback behavior).

## Review loop outcome (commit aefb8cd)

Ran the full 7-role loop (Developer → Tester → User → Tech Specialist → CEO → Financial Investor → Orchestrator) on the `/demo/app` shell + Contact.jsx Zod validation.

**Tester**: PASS after one fix. Found a real bug during self-review: `src/pages/Contact.jsx` used `z` and `parseWithSchema` (lines 39, 73) without importing them — would have crashed the contact form on submit at runtime. The typecheck (`tsc --noEmit`) did not catch it, likely due to the `isolatedModules` + `moduleResolution: "Bundler"` combo with `.jsx` files. Fix: added `import { z } from "zod"` and `import { parseWithSchema } from "../lib/validation/reviewFeedback"`. Re-verified build + typecheck + lint + 86 tests all pass. iPhone 17 Pro simulator loaded `/demo/app` via `http://localhost:3006/demo/app` — phone frame, CAFE tab, hero section render correctly. Tab-switch visual verification not done via CLI (no `simctl tap` support); network IP `192.168.86.246` was not reachable from the simulator in this environment, only `localhost` worked.

**User**: The phone mockup presents the suite as one app with a tab bar, guided tour, and email capture. Friction: the `SUITE` array defines `href` values (e.g. `/menu/demo`, `/demo/wallet`) that are never used — tabs are display-only description cards, not navigation. A prospect tapping a tab expects to see that demo surface. The "Live demo surface — opens the real page inside the suite" pill is somewhat misleading for tabs that don't actually navigate.

**Tech Specialist**: Architecture fit is clean — no new API routes (reuses `/api/contact`), respects the 12-function cap, single `api/[...path].js` discipline, dual data model, demo-theme scoping via `CafeThemeGate`, lazy-loaded chunk (`DemoApp-D_Bft8o9.js`, 17 kB). One dead-data note: `SUITE[].href` is defined but unused.

**CEO**: In scope — demo conversion asset, not product feature. Contact.jsx Zod validation is a genuine reliability fix bundled in, not scope creep.

**Financial Investor**: Zero new infra, zero new secrets, zero new dependencies, negligible runtime cost (one 17 kB chunk). Risk disclosed: the `tsc --noEmit` gap for `.jsx` files means the typecheck alone isn't sufficient — ESLint or a smoke test should cover it.

**Orchestrator**: SHIP. The one bug found was fixed inline. Process improvement noted: add ESLint rule or smoke test to cover the typecheck gap for `.jsx` files.

## Credential / env expectations for reviewers

| Surface | Needs to feel real | Falls back safely when missing |
|---|---|---|
| Wallet demo + `/wallet/membership` pkpass download | Apple signing creds (server-side) | Yes — preview still works; signed pass fails closed |
| Loyalty demo | Supabase if using real API; migration 010 for operator side | Yes — in-memory demo works |
| Wi‑Fi captive join | `CAPTIVE_OTP_ECHO=1` in dev; Stripe test keys for paid upgrade | Yes — join flow still shows, OTP echoes in dev |
| Chatbot | `GROQ_API_KEY` for LLM; keyword matcher fallback | Yes |
| Menu / website / reviews | Prisma seed or Supabase enterprise slug `demo` | Yes — `demoCafe.js` fallback for guest café routes |
| Contact form | `RESEND_*` for email; mailto fallback otherwise | Yes — improved on this branch |

## Acceptable demo honesty bar

A demo screen may say "simulated" or "preview" when it can't be live. It must not:
- Claim a real Wallet pass was issued when no signing credentials exist.
- Claim a real paid Wi‑Fi upgrade when Stripe isn't configured.
- Pretend a seeded menu/website/review exists when the seed hasn't run.

That bar applies to `/demo/app` and to the long-term plan's phone-first views.
