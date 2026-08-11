# GitHub Copilot System Instructions: Enterprise Multi-Module Platform

## Workspace Context & Coding Standards
You are an expert full-stack developer assisting in building a multi-module business growth platform. Always adhere to these repository rules:

### Tech Stack Rules
- **Frontend**: React 19 + Vite 8 + React Router (SPA)
- **APIs**: Vercel Serverless Functions under `/api` (Prisma stays server-only)
- **Database & Auth**: PostgreSQL with Prisma ORM; Supabase Auth for `/admin` (Bearer JWT verified server-side)
- **Styling & Components**: Tailwind CSS, Lucide Icons
- **Validation**: Zod schemas in `shared/` for client and server inputs
- **TypeScript/JS**: Prefer explicit interfaces for API inputs/outputs; avoid `any`

### Architecture Guidelines
- Modular folder structure under `src/modules/` (`menu/`, `website/`, `wifi/`, `reviews/`, `chatbot/`).
- Shared UI components reside in `src/components/` (and `src/components/ui/` when added).
- Database access layer must be isolated inside `api/_lib/` — never import Prisma into browser code.
- Next.js files under `src/app/**` are reference-only; do not assume App Router is the runtime.

---

## CORE MODULE SPECIFICATIONS

### 1. Dynamic Menu QR Code Engine (`src/modules/menu`)
- Dynamic short-link redirection router (`/r/[tenantId]/menu` → `/api/r/[tenantId]/menu`).
- Interactive menu builder: categories, items, prices, modifiers, allergens, out-of-stock flags.
- QR code rendering engine with SVG export, custom primary/secondary colors, and logo overlay.
- Scan analytics logger (captures timestamp, user agent, IP hash, and referrer).

### 2. Custom Website Generator (`src/modules/website`)
- Block-based page renderer (Hero, Hours, Menu Embed, Gallery, CTA, Google Map, Contact Form).
- Subdomain and custom domain mapping handlers.
- Auto-generated meta tags, OpenGraph data, and dynamic JSON-LD structured schema for SEO.

### 3. Enterprise Wi-Fi Access & Dashboard (`src/modules/wifi`)
- WPA/WPA2/WPA3 standard payload encoder (`WIFI:S:<SSID>;T:<WPA|WPA2>;P:<PASSWORD>;H:<true|false>;;`).
- Optional lead-capture splash page prior to credential reveal or auto-connect.
- AP management dashboard for multi-branch session and peak-hour metrics.

### 4. Smart Google Reviews Funnel (`src/modules/reviews`)
- 1-5 Star gate page (`/r/[tenantId]/review` via `src/pages/ReviewGate.jsx`).
- Smart routing logic:
  - **4-5 Stars**: Direct client-side redirect to official Google Place Review URL.
  - **1-3 Stars**: Render internal feedback form posted to `/api/reviews/feedback`.
- Google Place ID integration and conversion tracking via `/api/reviews/visit`.

### 5. AI Customer Service Chatbot (`src/modules/chatbot`)
- Embeddable floating chat widget component (`<ChatWidget tenantId="..." />`).
- RAG ingestion pipeline parsing menu items, business hours, Wi-Fi info, and FAQs.
- Handover detection logic when AI confidence is low.
