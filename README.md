# OmniTaps

React + Vite SPA, Vercel `/api`, Postgres (Prisma), Supabase Auth.

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

### 3. Go live
```bash
npm run launch
```
Builds, syncs env to Vercel, deploys production.

Then open your Vercel URL:
- `/menu/demo` · `/r/demo/review` · `/r/demo/wifi` · `/s/demo` · `/demo/dashboard` · `/login`

---

## Day-to-day

```bash
npm run dev      # local (APIs mounted in Vite)
npm run build    # production build
npm run db:seed  # re-seed demo data
```

## Notes
- Never put `SUPABASE_SERVICE_ROLE_KEY` in a `VITE_*` variable.
- Guest routes stay public; `/admin` requires the seeded Supabase login.
- After changing any `VITE_*` value, run `npm run launch` (or redeploy) so the client bundle picks them up.
