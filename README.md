# OmniTaps

React 19 + Vite 8 SPA. Vercel. Postgres (Prisma) for guest/admin product data; Supabase Auth plus enterprise/captive tables.

Live: [https://omnitaps.vercel.app](https://omnitaps.vercel.app)

Production APIs are **one** Serverless Function — `api/[[...path]].js` — so Hobby stays under the 12-function cap. Handlers live in `api/_lib/handlers/` and are dispatched from `api/_lib/routeTable.js`. Unmatched `/api/*` returns JSON 404 (not the SPA). The catch-all uses `bodyParser: false` and `maxDuration: 30` for Stripe webhooks.

## Launch in 3 commands

### 1. Accounts (once)
- Create a **Postgres** database → copy URL  
- Create a **Supabase** project → copy URL, anon key, service role key  
- Enable Email auth in Supabase  

### 2. Configure + seed
```bash
cp .env.example .env
# Edit .env: DATABASE_URL, SUPABASE_*, VITE_SUPABASE_*, SEED_ADMIN_*

npm run setup
```
This installs deps, pushes the schema, and seeds the `demo` tenant (menu, reviews, Wi‑Fi, site, chatbot) + admin user.

Env names only (never put secrets in `VITE_*`): `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SEED_ADMIN_*`, `SEED_TENANT_*`. Captive Wi‑Fi also needs `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`. Captive OTP delivery uses `RESEND_API_KEY` + `RESEND_EMAIL_FROM` (email codes) and `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` + `TWILIO_PHONE_NUMBER` (SMS codes); set `CAPTIVE_OTP_ECHO=1` to echo codes in dev/demo without a provider.

### 3. Go live
```bash
npm run launch
```
Builds, syncs env to Vercel, deploys production.

## Demo URLs

Guest Demo Café (theme scoped by `CafeThemeGate`; chrome is portaled and fixed):

- `/demo` — hub  
- `/s/demo` — website + chatbot  
- `/menu/demo` — public menu  
- `/r/demo/review` · `/r/demo/wifi`  

Operator:

- `/demo/dashboard` — enterprise console demo  
- `/login` · `/admin`  

If Prisma is down or the demo tenant is missing, guest café APIs fall back to `api/_lib/demoCafe.js`. `/admin` still needs a real `DATABASE_URL`.

---

## Day-to-day

```bash
npm run dev          # local (same route table mounted in Vite)
npm run build        # prisma generate && vite build
npm start            # production HTTP server (dist/ + API dispatch; used in Docker)
npm run db:seed      # re-seed Demo Café (Prisma TCP, or HTTPS if DATABASE_URL is a placeholder)
npm run db:seed-http # same café seed via Supabase REST (no Postgres TCP)
```

## Notes
- Never put `SUPABASE_SERVICE_ROLE_KEY` in a `VITE_*` variable.
- Guest routes stay public; `/admin` requires the seeded Supabase login **and** a working Prisma `DATABASE_URL`.
- After changing any `VITE_*` value, run `npm run launch` (or redeploy) so the client bundle picks them up. A Docker image also needs a **rebuild** with matching `--build-arg` values.
- Stripe webhooks (captive checkout) should point at `/api/v1/captive/checkout`.

## Docker

Published multi-arch image (`linux/amd64` + `linux/arm64`) at `ghcr.io/onouh/omnitaps`. On macOS and Windows it runs inside Docker Desktop’s Linux VM. Postgres and Supabase stay **outside** the container (`DATABASE_URL` / project URLs). Runtime secrets come from `--env-file` or `-e` — never bake `.env` into the image.

`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are **build-time** (same as Vercel). Changing them requires a rebuild with `--build-arg`.

Pull and run (any OS with Docker):

```bash
docker pull ghcr.io/onouh/omnitaps:latest
docker run --rm -p 3000:3000 --env-file .env ghcr.io/onouh/omnitaps:latest
```

The first GHCR push is private. For anonymous `docker pull`, set the package to **public** on GitHub → Packages.

### Local Buildx (alternative)

From the repo root, with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the environment:

```bash
docker buildx create --use --name omnitaps-builder 2>/dev/null || true

docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --build-arg VITE_SUPABASE_URL \
  --build-arg VITE_SUPABASE_ANON_KEY \
  -t ghcr.io/onouh/omnitaps:latest \
  --push \
  .
```

`--load` only works for **one** platform (use `linux/arm64` on Apple Silicon, `linux/amd64` on Intel Mac / typical Windows/Linux). Multi-arch at once needs `--push` to a registry, or two sequential `--load` builds.

Example single-platform load on Apple Silicon:

```bash
docker buildx build \
  --platform linux/arm64 \
  --build-arg VITE_SUPABASE_URL \
  --build-arg VITE_SUPABASE_ANON_KEY \
  -t omnitaps:latest \
  --load \
  .
```

```bash
docker run --rm -p 3000:3000 --env-file .env omnitaps:latest
```
