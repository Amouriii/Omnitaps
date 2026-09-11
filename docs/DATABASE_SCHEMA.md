# EERD & Database Schema

## Overview

This project uses a single PostgreSQL database accessed primarily through **Prisma ORM** (`prisma/schema.prisma`). A small set of **enterprise/captive Wi-Fi** tables live in the Supabase `public` schema, alongside the Prisma-generated tables; they are a separate surface (different table names, different product code paths) even though they share the same database.

| Layer | Home | Role |
|---|---|---|
| Prisma schema | `prisma/schema.prisma` | Single source of truth for tenant/product models |
| Supabase migrations | `supabase/migrations/*.sql` | Enterprise/captive tables + contact-messaging grant |
| Demo fallback | `api/_lib/demoCafe.js` | Static café payload when Prisma TCP is unreachable |
| Seeding | `prisma/seed.js`, `scripts/*.mjs` | Demo tenant + sample data |

**Database URL:** `DATABASE_URL` (Postgres). Cold-start handshakes routinely take 3–6s, so Prisma's 5s default connect timeout is relevant (`api/_lib/dbRetry.js`, `api/_lib/databaseUrl.js`).

---

## Two table surfaces (same database, different products)

- **Prisma product tables** — owned by the Prisma connection, referenced from guest Admin APIs (`/admin`, `/menu/:tenantId`, `/r/:tenantId/*`, etc.).
- **Supabase/captive tables** — `wifi_devices`, `wifi_sessions`, `subscription_plans` (and `public.enterprises`-backed captive columns). They coexist with Prisma `WifiNetwork` / `WifiSession` tables under different names and are accessed by the enterprise Wi-Fi path, not the Prisma QR Wi‑Fi path.

> "Captive tables (`wifi_devices`, `wifi_sessions`, `subscription_plans`) coexist with Prisma `WifiNetwork` / QR Wi‑Fi — different names, different product surfaces." ([MEMORY.md](./MEMORY.md))

---

## Entity–Relationship Diagram (Mermaid, foreign keys annotated)

Rendered relationships below are drawn from `prisma/schema.prisma` plus the Supabase migrations. FK cardinality is shown with `|o` (zero/many) and `||` (one/mandatory) crow’s-foot notation where practical, and arrow direction follows Prisma `relation()` mappings and the `ON DELETE` behavior.

```mermaid

erDiagram
  USER {
    text id PK
    text authId UK
    text email UK
    text name
    text avatarUrl
    UserRole role
  }

  TENANT {
    text id PK
    text name
    text slug UK
    text subdomain UK
    TenantStatus status
    TenantPlan plan
    text ownerUserId FK→User SET NULL
  }

  TENANT_MEMBER {
    text id PK
    text tenantId FK→Tenant CASCADE
    text userId FK→User CASCADE
    TenantMemberRole role
  }

  TENANT_DOMAIN {
    text id PK
    text tenantId FK→Tenant CASCADE
    text hostname UK
    DomainType type
  }

  CUSTOMER {
    text id PK
    text tenantId FK→Tenant CASCADE
    text externalReference
  }

  MENU {
    text id PK
    text tenantId UK FK→Tenant CASCADE
    text slug
  }

  MENU_CATEGORY {
    text id PK
    text menuId FK→Menu CASCADE
    text slug UK
  }

  MENU_ITEM {
    text id PK
    text categoryId FK→MenuCategory CASCADE
    text slug UK
    int priceCents
  }

  MENU_MODIFIER_GROUP {
    text id PK
    text menuId FK→Menu CASCADE
    text name UK
  }

  MENU_MODIFIER_OPTION {
    text id PK
    text modifierGroupId FK→MenuModifierGroup CASCADE
    text name UK
  }

  MENU_MODIFIER_GROUP_ITEM {
    text modifierGroupId PK,FK→MenuModifierGroup CASCADE
    text menuItemId PK,FK→MenuItem CASCADE
  }

  MENU_ALLERGEN {
    text id PK
    text menuId FK→Menu CASCADE
    text slug UK
  }

  MENU_ITEM_ALLERGEN {
    text menuItemId PK,FK→MenuItem CASCADE
    text menuAllergenId PK,FK→MenuAllergen CASCADE
  }

  MENU_SCAN_EVENT {
    text id PK
    text tenantId FK→Tenant CASCADE
    text menuId FK→Menu CASCADE
    text customerId FK→Customer SET NULL
  }

  WEBSITE {
    text id PK
    text tenantId UK FK→Tenant CASCADE
    text slug
  }

  WEBSITE_DOMAIN {
    text id PK
    text websiteId FK→Website CASCADE
    text hostname UK
  }

  WEBSITE_PAGE {
    text id PK
    text websiteId FK→Website CASCADE
    text path UK
    text slug UK
  }

  WEBSITE_BLOCK {
    text id PK
    text pageId FK→WebsitePage CASCADE
  }

  WEBSITE_ASSET {
    text id PK
    text websiteId FK→Website CASCADE
  }

  WEBSITE_FORM_SUBMISSION {
    text id PK
    text websiteId FK→Website CASCADE
    text pageId FK→WebsitePage SET NULL
  }

  WIFI_NETWORK {
    text id PK
    text tenantId FK→Tenant CASCADE
    text qrSlug UK
    text ssid UK
  }

  WIFI_ACCESS_POINT {
    text id PK
    text networkId FK→WifiNetwork CASCADE
    text macAddress UK
  }

  WIFI_SPLASH_PAGE {
    text id PK
    text networkId UK FK→WifiNetwork CASCADE
  }

  WIFI_SESSION {
    text id PK
    text networkId FK→WifiNetwork CASCADE
    text accessPointId FK→WifiAccessPoint SET NULL
    text customerId FK→Customer SET NULL
  }

  REVIEW_PROFILE {
    text id PK
    text tenantId UK FK→Tenant CASCADE
  }

  REVIEW_CAMPAIGN {
    text id PK
    text profileId FK→ReviewProfile CASCADE
    text tenantId FK→Tenant CASCADE
  }

  REVIEW_GATE_VISIT {
    text id PK
    text profileId FK→ReviewProfile CASCADE
    text campaignId FK→ReviewCampaign SET NULL
    text tenantId FK→Tenant CASCADE
    text customerId FK→Customer SET NULL
  }

  REVIEW_FEEDBACK {
    text id PK
    text tenantId FK→Tenant CASCADE
    text profileId FK→ReviewProfile CASCADE
    text campaignId FK→ReviewCampaign SET NULL
    text gateVisitId FK→ReviewGateVisit SET NULL
    text customerId FK→Customer SET NULL
    text createdByUserId FK→User SET NULL
    text assignedToUserId FK→User SET NULL
  }

  CHATBOT_BOT {
    text id PK
    text tenantId UK FK→Tenant CASCADE
  }

  CHATBOT_KNOWLEDGE_SOURCE {
    text id PK
    text botId FK→ChatbotBot CASCADE
  }

  CHATBOT_CONVERSATION {
    text id PK
    text botId FK→ChatbotBot CASCADE
    text tenantId FK→Tenant CASCADE
    text customerId FK→Customer SET NULL
  }

  CHATBOT_MESSAGE {
    text id PK
    text conversationId FK→ChatbotConversation CASCADE
  }

  CHATBOT_HANDOVER {
    text id PK
    text conversationId UK FK→ChatbotConversation CASCADE
    text assignedToUserId FK→User SET NULL
  }

  CONTACT_MESSAGE {
    text id PK
  }

  USER ||--o{ TENANT : owns-via Tenant.ownerUserId SET NULL
  USER ||--o{ TENANT_MEMBER : members
  USER ||--o{ REVIEW_FEEDBACK : created (ReviewFeedback.createdByUserId)
  USER ||--o{ REVIEW_FEEDBACK : assigned (ReviewFeedback.assignedToUserId)
  USER ||--o{ CHATBOT_HANDOVER : assigned (ChatbotHandover.assignedToUserId)

  TENANT ||--|| MENU : one-per-tenant (Menu.tenantId UK)
  TENANT ||--|| WEBSITE : one-per-tenant (Website.tenantId UK)
  TENANT ||--|| WIFI_NETWORK : many (Prisma)
  TENANT ||--o{ REVIEW_PROFILE : one-per-tenant (ReviewProfile.tenantId UK)
  TENANT ||--|| CHATBOT_BOT : one-per-tenant (ChatbotBot.tenantId UK)
  TENANT ||--o{ TENANT_MEMBER : members CASCADE
  TENANT ||--o{ TENANT_DOMAIN : domains CASCADE
  TENANT ||--o{ CUSTOMER : customers CASCADE
  TENANT ||--o{ MENU_SCAN_EVENT : scans CASCADE
  TENANT ||--o{ REVIEW_CAMPAIGN : campaigns CASCADE
  TENANT ||--o{ REVIEW_GATE_VISIT : gate visits CASCADE
  TENANT ||--o{ REVIEW_FEEDBACK : feedback CASCADE
  TENANT ||--o{ CHATBOT_CONVERSATION : conversations CASCADE

  TENANT_MEMBER }o--|| TENANT : tenantId CASCADE
  TENANT_MEMBER }o--|| USER : userId CASCADE

  TENANT_DOMAIN }o--|| TENANT : tenantId CASCADE

  CUSTOMER }o--|| TENANT : tenantId CASCADE
  CUSTOMER ||--o{ MENU_SCAN_EVENT : scans (SET NULL on delete)
  CUSTOMER ||--o{ WIFI_SESSION : sessions (SET NULL on delete)
  CUSTOMER ||--o{ REVIEW_GATE_VISIT : gate visits (SET NULL on delete)
  CUSTOMER ||--o{ REVIEW_FEEDBACK : feedback (SET NULL on delete)
  CUSTOMER ||--o{ CHATBOT_CONVERSATION : conversations (SET NULL on delete)

  MENU ||--o{ MENU_CATEGORY : categories CASCADE
  MENU ||--o{ MENU_MODIFIER_GROUP : modifier groups CASCADE
  MENU ||--o{ MENU_ALLERGEN : allergen catalog CASCADE
  MENU ||--o{ MENU_SCAN_EVENT : scans CASCADE

  MENU_CATEGORY ||--o{ MENU_ITEM : items CASCADE
  MENU_CATEGORY ||--o{ MENU_MODIFIER_GROUP_ITEM : cross-link via MenuModifierGroupItem.menuItemId

  MENU_ITEM ||--o{ MENU_MODIFIER_GROUP_ITEM : cross-link
  MENU_ITEM ||--o{ MENU_ITEM_ALLERGEN : allergen links CASCADE

  MENU_MODIFIER_GROUP ||--o{ MENU_MODIFIER_OPTION : options CASCADE
  MENU_MODIFIER_GROUP ||--o{ MENU_MODIFIER_GROUP_ITEM : item links CASCADE

  MENU_ALLERGEN ||--o{ MENU_ITEM_ALLERGEN : allergen links CASCADE

  MENU_SCAN_EVENT }o--|| MENU : menuId CASCADE

  WEBSITE ||--o{ WEBSITE_DOMAIN : domains CASCADE
  WEBSITE ||--o{ WEBSITE_PAGE : pages CASCADE
  WEBSITE ||--o{ WEBSITE_ASSET : assets CASCADE
  WEBSITE ||--o{ WEBSITE_FORM_SUBMISSION : submissions CASCADE

  WEBSITE_PAGE ||--o{ WEBSITE_BLOCK : blocks CASCADE
  WEBSITE_PAGE ||--o{ WEBSITE_FORM_SUBMISSION : submissions (SET NULL on page delete)

  WIFI_NETWORK ||--o{ WIFI_ACCESS_POINT : access points CASCADE
  WIFI_NETWORK ||--|| WIFI_SPLASH_PAGE : splash page (WifiSplashPage.networkId UK)
  WIFI_NETWORK ||--o{ WIFI_SESSION : sessions CASCADE

  WIFI_ACCESS_POINT ||--o{ WIFI_SESSION : sessions (SET NULL on AP delete)

  WIFI_SESSION }o--|| WIFI_NETWORK : networkId CASCADE

  REVIEW_PROFILE ||--o{ REVIEW_CAMPAIGN : campaigns CASCADE
  REVIEW_PROFILE ||--o{ REVIEW_GATE_VISIT : gate visits CASCADE
  REVIEW_PROFILE ||--o{ REVIEW_FEEDBACK : feedback CASCADE

  REVIEW_CAMPAIGN ||--o{ REVIEW_GATE_VISIT : gate visits (SET NULL)
  REVIEW_CAMPAIGN ||--o{ REVIEW_FEEDBACK : feedback (SET NULL)

  REVIEW_GATE_VISIT ||--o{ REVIEW_FEEDBACK : feedback CASCADE

  CHATBOT_BOT ||--o{ CHATBOT_KNOWLEDGE_SOURCE : knowledge sources CASCADE
  CHATBOT_BOT ||--o{ CHATBOT_CONVERSATION : conversations CASCADE

  CHATBOT_CONVERSATION ||--o{ CHATBOT_MESSAGE : messages CASCADE
  CHATBOT_CONVERSATION ||--|| CHATBOT_HANDOVER : handover (ChatbotHandover.conversationId UK)

  CHATBOT_HANDOVER }o--|| CHATBOT_CONVERSATION : conversationId CASCADE

  CONTACT_MESSAGE ||--o{ USER : no FK (only indexed; not tenant-scoped)
```

### Foreign-key matrix (Prisma surface)

| Child table | FK column | Parent table | ON DELETE | Notes |
|---|---|---|---|---|
| Tenant | ownerUserId | User | SET NULL | tenant survives user deletion |
| TenantMember | tenantId | Tenant | CASCADE | |
| TenantMember | userId | User | CASCADE | composite UK (tenantId, userId) |
| TenantDomain | tenantId | Tenant | CASCADE | |
| Customer | tenantId | Tenant | CASCADE | |
| Menu | tenantId | Tenant | CASCADE | unique FK |
| MenuCategory | menuId | Menu | CASCADE | |
| MenuItem | categoryId | MenuCategory | CASCADE | |
| MenuModifierGroup | menuId | Menu | CASCADE | |
| MenuModifierOption | modifierGroupId | MenuModifierGroup | CASCADE | |
| MenuModifierGroupItem | modifierGroupId | MenuModifierGroup | CASCADE | composite PK |
| MenuModifierGroupItem | menuItemId | MenuItem | CASCADE | composite PK |
| MenuAllergen | menuId | Menu | CASCADE | |
| MenuItemAllergen | menuItemId | MenuItem | CASCADE | composite PK |
| MenuItemAllergen | menuAllergenId | MenuAllergen | CASCADE | composite PK |
| MenuScanEvent | tenantId | Tenant | CASCADE | |
| MenuScanEvent | menuId | Menu | CASCADE | |
| MenuScanEvent | customerId | Customer | SET NULL | |
| Website | tenantId | Tenant | CASCADE | unique FK |
| WebsiteDomain | websiteId | Website | CASCADE | |
| WebsitePage | websiteId | Website | CASCADE | |
| WebsiteBlock | pageId | WebsitePage | CASCADE | |
| WebsiteAsset | websiteId | Website | CASCADE | |
| WebsiteFormSubmission | websiteId | Website | CASCADE | |
| WebsiteFormSubmission | pageId | WebsitePage | SET NULL | |
| WifiNetwork | tenantId | Tenant | CASCADE | |
| WifiAccessPoint | networkId | WifiNetwork | CASCADE | |
| WifiSplashPage | networkId | WifiNetwork | CASCADE | unique FK |
| WifiSession | networkId | WifiNetwork | CASCADE | |
| WifiSession | accessPointId | WifiAccessPoint | SET NULL | |
| WifiSession | customerId | Customer | SET NULL | |
| ReviewProfile | tenantId | Tenant | CASCADE | unique FK |
| ReviewCampaign | profileId | ReviewProfile | CASCADE | |
| ReviewCampaign | tenantId | Tenant | CASCADE | |
| ReviewGateVisit | profileId | ReviewProfile | CASCADE | |
| ReviewGateVisit | campaignId | ReviewCampaign | SET NULL | |
| ReviewGateVisit | tenantId | Tenant | CASCADE | |
| ReviewGateVisit | customerId | Customer | SET NULL | |
| ReviewFeedback | tenantId | Tenant | CASCADE | |
| ReviewFeedback | profileId | ReviewProfile | CASCADE | |
| ReviewFeedback | campaignId | ReviewCampaign | SET NULL | |
| ReviewFeedback | gateVisitId | ReviewGateVisit | SET NULL | |
| ReviewFeedback | customerId | Customer | SET NULL | |
| ReviewFeedback | createdByUserId | User | SET NULL | |
| ReviewFeedback | assignedToUserId | User | SET NULL | |
| ChatbotBot | tenantId | Tenant | CASCADE | unique FK |
| ChatbotKnowledgeSource | botId | ChatbotBot | CASCADE | |
| ChatbotConversation | botId | ChatbotBot | CASCADE | |
| ChatbotConversation | tenantId | Tenant | CASCADE | |
| ChatbotConversation | customerId | Customer | SET NULL | |
| ChatbotMessage | conversationId | ChatbotConversation | CASCADE | |
| ChatbotHandover | conversationId | ChatbotConversation | CASCADE | unique FK |
| ChatbotHandover | assignedToUserId | User | SET NULL | |

### Foreign-key matrix (Supabase public / captive surface)

| Child table | FK column | Parent table | ON DELETE | Notes |
|---|---|---|---|---|
| profiles | id | auth.users | CASCADE | PK = auth.users id |
| profiles | enterprise_id | enterprises | CASCADE | |
| menu_items | enterprise_id | enterprises | CASCADE | self-ref FK parent_id → menu_items |
| menu_items | parent_id | menu_items | CASCADE | CHECK parent_id ≠ id |
| enterprise_modules | enterprise_id | enterprises | CASCADE | UK (enterprise_id, module_key) |
| qr_menu_items | restaurant_id | enterprises | CASCADE | |
| wifi_devices | enterprise_id | enterprises | CASCADE | UK (enterprise_id, mac_address) |
| wifi_sessions | enterprise_id | enterprises | CASCADE | |
| wifi_sessions | device_id | wifi_devices | CASCADE | |
| wifi_sessions | plan_id | subscription_plans | SET NULL | |
| subscription_plans | enterprise_id | enterprises | CASCADE | |
| wifi_otp_challenges | enterprise_id | enterprises | CASCADE | |
| wifi_otp_challenges | device_id | wifi_devices | CASCADE | |
| apple_wallet_programs | enterprise_id | enterprises | CASCADE | UK enterprise_id |
| apple_wallet_members | program_id | apple_wallet_programs | CASCADE | |
| loyalty_programs | enterprise_id | enterprises | CASCADE | UK enterprise_id |
| loyalty_rewards | program_id | loyalty_programs | CASCADE | |
| loyalty_members | program_id | loyalty_programs | CASCADE | |
| loyalty_transactions | member_id | loyalty_members | CASCADE | |
| loyalty_transactions | reward_id | loyalty_rewards | SET NULL | |

*ContactMessage has no FKs. wifi_devices and wifi_sessions also gain a partial unique on `(enterprise_id, acct_session_id)` where `acct_session_id` is not null.*

---

## Schema tables (Prisma models)

---

## Schema tables (Prisma models)

### Enums

| Enum | Values |
|---|---|
| `UserRole` | OWNER, ADMIN, STAFF, ANALYST |
| `TenantStatus` | ACTIVE, TRIAL, PAUSED, SUSPENDED |
| `TenantPlan` | STARTER, GROWTH, PRO, ENTERPRISE |
| `DomainType` | SUBDOMAIN, CUSTOM |
| `TenantMemberRole` | OWNER, ADMIN, EDITOR, ANALYST, SUPPORT |
| `MenuEventType` | SCAN, VIEW, CLICK |
| `WebsiteBlockType` | HERO, HOURS, MENU_EMBED, GALLERY, CTA, MAP, CONTACT_FORM, CUSTOM |
| `WifiAuthType` | OPEN, WPA, WPA2, WPA3 |
| `WifiSessionStatus` | ACTIVE, DISCONNECTED, EXPIRED |
| `ReviewSourceType` | GATE, GOOGLE, FORM, MANUAL |
| `ReviewStatus` | NEW, TRIAGED, RESOLVED, ARCHIVED |
| `ChatbotKnowledgeSourceType` | MENU, HOURS, WIFI, FAQ, DOCUMENT, URL, MANUAL |
| `ChatbotConversationStatus` | OPEN, HANDOFF, CLOSED |
| `ChatbotMessageRole` | SYSTEM, USER, ASSISTANT, TOOL |

---

### Tables

**ContactMessage**
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | `cuid()` |
| name | TEXT | |
| email | TEXT | |
| company | TEXT? | |
| message | TEXT | |
| status | TEXT | defaults `NEW` |
| ipHash | TEXT? | |
| createdAt | TIMESTAMP(3) | `now()` |
| updatedAt | TIMESTAMP(3) | `updatedAt` |
Indexes: `(status, createdAt)`, `(email, createdAt)`.

**User**
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | `cuid()` |
| authId | TEXT | unique |
| email | TEXT | unique |
| name | TEXT? | |
| avatarUrl | TEXT? | |
| role | UserRole | default OWNER |
| createdAt | TIMESTAMP(3) | |
| updatedAt | TIMESTAMP(3) | |
Index: `(role)`. Unique: `authId`, `email`.

**Tenant**
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | `cuid()` |
| name | TEXT | |
| slug | TEXT | unique |
| subdomain | TEXT | unique |
| status | TenantStatus | default ACTIVE |
| plan | TenantPlan | default STARTER |
| timezone | TEXT | default UTC |
| locale | TEXT | default en |
| ownerUserId | TEXT? | FK → User (SET NULL) |
| createdAt | TIMESTAMP(3) | |
| updatedAt | TIMESTAMP(3) | |
Indexes: `(status)`, `(plan)`.

**TenantMember**
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | `cuid()` |
| tenantId | TEXT | FK → Tenant (cascade) |
| userId | TEXT | FK → User (cascade) |
| role | TenantMemberRole | default EDITOR |
| createdAt | TIMESTAMP(3) | |
| updatedAt | TIMESTAMP(3) | |
Unique: `(tenantId, userId)`. Indexes: `(tenantId, role)`, `(userId, role)`.

**TenantDomain**
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | `cuid()` |
| tenantId | TEXT | FK → Tenant (cascade) |
| hostname | TEXT | unique |
| type | DomainType | default CUSTOM |
| isPrimary | BOOLEAN | default false |
| verifiedAt | TIMESTAMP(3)? | |
| createdAt | TIMESTAMP(3) | |
| updatedAt | TIMESTAMP(3) | |
Index: `(tenantId, isPrimary)`.

**Customer**
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | `cuid()` |
| tenantId | TEXT | FK → Tenant (cascade) |
| externalReference | TEXT? | |
| firstName | TEXT? | |
| lastName | TEXT? | |
| email | TEXT? | |
| phone | TEXT? | |
| consentToMarketing | BOOLEAN | default false |
| lastSeenAt | TIMESTAMP(3)? | |
| createdAt | TIMESTAMP(3) | |
| updatedAt | TIMESTAMP(3) | |
Unique: `(tenantId, externalReference)`. Indexes: `(tenantId, email)`, `(tenantId, phone)`, `(tenantId, lastSeenAt)`.

**Menu**
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | `cuid()` |
| tenantId | TEXT | unique FK → Tenant (cascade) |
| name | TEXT | |
| slug | TEXT | |
| isPublished | BOOLEAN | default false |
| primaryColor | TEXT? | |
| secondaryColor | TEXT? | |
| logoUrl | TEXT? | |
| themeJson | JSON? | |
| createdAt | TIMESTAMP(3) | |
| updatedAt | TIMESTAMP(3) | |
Unique: `(tenantId, slug)`. Indexes: `(slug)`, `(tenantId, isPublished)`.

**MenuCategory**
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | `cuid()` |
| menuId | TEXT | FK → Menu (cascade) |
| slug | TEXT | |
| name | TEXT | |
| description | TEXT? | |
| sortOrder | INT | default 0 |
| isVisible | BOOLEAN | default true |
| createdAt | TIMESTAMP(3) | |
| updatedAt | TIMESTAMP(3) | |
Unique: `(menuId, slug)`. Index: `(menuId, sortOrder)`.

**MenuItem**
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | `cuid()` |
| categoryId | TEXT | FK → MenuCategory (cascade) |
| slug | TEXT | |
| name | TEXT | |
| description | TEXT? | |
| priceCents | INT | |
| currency | TEXT | default USD |
| imageUrl | TEXT? | |
| isAvailable | BOOLEAN | default true |
| outOfStockNote | TEXT? | |
| sortOrder | INT | default 0 |
| createdAt | TIMESTAMP(3) | |
| updatedAt | TIMESTAMP(3) | |
Unique: `(categoryId, slug)`. Indexes: `(categoryId, sortOrder)`, `(isAvailable)`.

**MenuModifierGroup**
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | `cuid()` |
| menuId | TEXT | FK → Menu (cascade) |
| name | TEXT | |
| minSelections | INT | default 0 |
| maxSelections | INT? | |
| sortOrder | INT | default 0 |
| isRequired | BOOLEAN | default false |
| createdAt | TIMESTAMP(3) | |
| updatedAt | TIMESTAMP(3) | |
Unique: `(menuId, name)`. Index: `(menuId, sortOrder)`.

**MenuModifierOption**
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | `cuid()` |
| modifierGroupId | TEXT | FK → MenuModifierGroup (cascade) |
| name | TEXT | |
| priceDeltaCents | INT | default 0 |
| sortOrder | INT | default 0 |
| isAvailable | BOOLEAN | default true |
| createdAt | TIMESTAMP(3) | |
| updatedAt | TIMESTAMP(3) | |
Unique: `(modifierGroupId, name)`. Index: `(modifierGroupId, sortOrder)`.

**MenuModifierGroupItem** (join; composite PK)
| Column | Type | Notes |
|---|---|---|
| modifierGroupId | TEXT | PK + FK → MenuModifierGroup (cascade) |
| menuItemId | TEXT | PK + FK → MenuItem (cascade) |
| createdAt | TIMESTAMP(3) | |
| updatedAt | TIMESTAMP(3) | |
Index: `(menuItemId)`.

**MenuAllergen**
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | `cuid()` |
| menuId | TEXT | FK → Menu (cascade) |
| slug | TEXT | |
| name | TEXT | |
| isActive | BOOLEAN | default true |
| createdAt | TIMESTAMP(3) | |
| updatedAt | TIMESTAMP(3) | |
Unique: `(menuId, slug)`. Index: `(menuId, isActive)`.

**MenuItemAllergen** (join; composite PK)
| Column | Type | Notes |
|---|---|---|
| menuItemId | TEXT | PK + FK → MenuItem (cascade) |
| menuAllergenId | TEXT | PK + FK → MenuAllergen (cascade) |
| createdAt | TIMESTAMP(3) | |
| updatedAt | TIMESTAMP(3) | |
Index: `(menuAllergenId)`.

**MenuScanEvent**
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | `cuid()` |
| tenantId | TEXT | FK → Tenant (cascade) |
| menuId | TEXT | FK → Menu (cascade) |
| customerId | TEXT? | FK → Customer (set null) |
| eventType | MenuEventType | default SCAN |
| scannedAt | TIMESTAMP(3) | default now() |
| userAgent | TEXT? | |
| ipHash | TEXT? | |
| referrer | TEXT? | |
| landingPath | TEXT? | |
| createdAt | TIMESTAMP(3) | |
| updatedAt | TIMESTAMP(3) | |
Indexes: `(tenantId, scannedAt)`, `(menuId, scannedAt)`, `(customerId, scannedAt)`, `(eventType, scannedAt)`.

**Website**
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | `cuid()` |
| tenantId | TEXT | unique FK → Tenant (cascade) |
| slug | TEXT | |
| name | TEXT | |
| subdomain | TEXT | unique |
| isPublished | BOOLEAN | default false |
| themeJson | JSON? | |
| jsonLd | JSON? | |
| createdAt | TIMESTAMP(3) | |
| updatedAt | TIMESTAMP(3) | |
Unique: `(tenantId, slug)`. Indexes: `(slug)`, `(tenantId, isPublished)`.

**WebsiteDomain**
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | `cuid()` |
| websiteId | TEXT | FK → Website (cascade) |
| hostname | TEXT | unique |
| isPrimary | BOOLEAN | default false |
| verifiedAt | TIMESTAMP(3)? | |
| pathPrefix | TEXT | default `/` |
| createdAt | TIMESTAMP(3) | |
| updatedAt | TIMESTAMP(3) | |
Index: `(websiteId, isPrimary)`.

**WebsitePage**
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | `cuid()` |
| websiteId | TEXT | FK → Website (cascade) |
| slug | TEXT | |
| path | TEXT | |
| title | TEXT | |
| metaTitle | TEXT? | |
| metaDescription | TEXT? | |
| canonicalUrl | TEXT? | |
| isHome | BOOLEAN | default false |
| isPublished | BOOLEAN | default false |
| sortOrder | INT | default 0 |
| structuredData | JSON? | |
| createdAt | TIMESTAMP(3) | |
| updatedAt | TIMESTAMP(3) | |
Unique: `(websiteId, path)`, `(websiteId, slug)`. Indexes: `(websiteId, sortOrder)`, `(path)`, `(isPublished, isHome)`.

**WebsiteBlock**
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | `cuid()` |
| pageId | TEXT | FK → WebsitePage (cascade) |
| blockType | WebsiteBlockType | |
| sortOrder | INT | default 0 |
| config | JSON | |
| createdAt | TIMESTAMP(3) | |
| updatedAt | TIMESTAMP(3) | |
Indexes: `(pageId, sortOrder)`, `(blockType)`.

**WebsiteAsset**
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | `cuid()` |
| websiteId | TEXT | FK → Website (cascade) |
| kind | TEXT | |
| url | TEXT | |
| alt | TEXT? | |
| sortOrder | INT | default 0 |
| createdAt | TIMESTAMP(3) | |
| updatedAt | TIMESTAMP(3) | |
Index: `(websiteId, kind, sortOrder)`.

**WebsiteFormSubmission**
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | `cuid()` |
| websiteId | TEXT | FK → Website (cascade) |
| pageId | TEXT? | FK → WebsitePage (set null) |
| name | TEXT? | |
| email | TEXT? | |
| phone | TEXT? | |
| message | TEXT | |
| status | TEXT | default `new` |
| meta | JSON? | |
| createdAt | TIMESTAMP(3) | |
| updatedAt | TIMESTAMP(3) | |
Indexes: `(websiteId, createdAt)`, `(pageId, createdAt)`, `(status, createdAt)`.

**WifiNetwork** (Prisma table)
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | `cuid()` |
| tenantId | TEXT | FK → Tenant (cascade) |
| name | TEXT | |
| ssid | TEXT | |
| password | TEXT? | |
| authType | WifiAuthType | default WPA2 |
| hidden | BOOLEAN | default false |
| qrSlug | TEXT | |
| qrPayload | TEXT? | |
| isActive | BOOLEAN | default true |
| leadCaptureEnabled | BOOLEAN | default false |
| createdAt | TIMESTAMP(3) | |
| updatedAt | TIMESTAMP(3) | |
Unique: `(tenantId, qrSlug)`, `(tenantId, ssid)`. Indexes: `(tenantId, isActive)`, `(tenantId, authType)`.

**WifiAccessPoint**
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | `cuid()` |
| networkId | TEXT | FK → WifiNetwork (cascade) |
| name | TEXT | |
| macAddress | TEXT | unique |
| ipAddress | TEXT? | |
| branchLabel | TEXT? | |
| status | TEXT | default `online` |
| lastSeenAt | TIMESTAMP(3)? | |
| createdAt | TIMESTAMP(3) | |
| updatedAt | TIMESTAMP(3) | |
Indexes: `(networkId, status)`, `(networkId, lastSeenAt)`.

**WifiSplashPage**
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | `cuid()` |
| networkId | TEXT | unique FK → WifiNetwork (cascade) |
| headline | TEXT? | |
| body | TEXT? | |
| consentLabel | TEXT? | |
| captureEmail | BOOLEAN | default false |
| capturePhone | BOOLEAN | default false |
| requiresConsent | BOOLEAN | default true |
| revealCredentialsAfterSubmit | BOOLEAN | default true |
| createdAt | TIMESTAMP(3) | |
| updatedAt | TIMESTAMP(3) | |

**WifiSession** (Prisma table)
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | `cuid()` |
| networkId | TEXT | FK → WifiNetwork (cascade) |
| accessPointId | TEXT? | FK → WifiAccessPoint (set null) |
| customerId | TEXT? | FK → Customer (set null) |
| status | WifiSessionStatus | default ACTIVE |
| startedAt | TIMESTAMP(3) | default now() |
| endedAt | TIMESTAMP(3)? | |
| userAgent | TEXT? | |
| ipHash | TEXT? | |
| referrer | TEXT? | |
| consentGiven | BOOLEAN | default false |
| contactEmail | TEXT? | |
| contactPhone | TEXT? | |
| sessionToken | TEXT? | unique |
| createdAt | TIMESTAMP(3) | |
| updatedAt | TIMESTAMP(3) | |
Indexes: `(networkId, startedAt)`, `(accessPointId, startedAt)`, `(customerId, startedAt)`, `(status, startedAt)`.

**ReviewProfile**
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | `cuid()` |
| tenantId | TEXT | unique FK → Tenant (cascade) |
| publicSlug | TEXT | |
| googlePlaceId | TEXT | |
| googleReviewUrl | TEXT | |
| thresholdRating | INT | default 4 |
| isActive | BOOLEAN | default true |
| createdAt | TIMESTAMP(3) | |
| updatedAt | TIMESTAMP(3) | |
Unique: `(tenantId, publicSlug)`, `(googlePlaceId)`. Index: `(tenantId, isActive)`.

**ReviewCampaign**
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | `cuid()` |
| profileId | TEXT | FK → ReviewProfile (cascade) |
| tenantId | TEXT | FK → Tenant (cascade) |
| name | TEXT | |
| slug | TEXT | |
| routePath | TEXT | |
| isActive | BOOLEAN | default true |
| redirectUrl | TEXT? | |
| createdAt | TIMESTAMP(3) | |
| updatedAt | TIMESTAMP(3) | |
Unique: `(profileId, slug)`, `(tenantId, routePath)`. Index: `(tenantId, isActive)`.

**ReviewGateVisit**
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | `cuid()` |
| profileId | TEXT | FK → ReviewProfile (cascade) |
| campaignId | TEXT? | FK → ReviewCampaign (set null) |
| tenantId | TEXT | FK → Tenant (cascade) |
| customerId | TEXT? | FK → Customer (set null) |
| source | ReviewSourceType | default GATE |
| rating | INT? | |
| routePath | TEXT? | |
| referrer | TEXT? | |
| userAgent | TEXT? | |
| ipHash | TEXT? | |
| googleRedirectedAt | TIMESTAMP(3)? | |
| createdAt | TIMESTAMP(3) | |
| updatedAt | TIMESTAMP(3) | |
Indexes: `(tenantId, createdAt)`, `(profileId, createdAt)`, `(campaignId, createdAt)`, `(rating, createdAt)`.

**ReviewFeedback**
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | `cuid()` |
| tenantId | TEXT | FK → Tenant (cascade) |
| profileId | TEXT | FK → ReviewProfile (cascade) |
| campaignId | TEXT? | FK → ReviewCampaign (set null) |
| gateVisitId | TEXT? | FK → ReviewGateVisit (set null) |
| customerId | TEXT? | FK → Customer (set null) |
| createdByUserId | TEXT? | FK → User (set null) |
| assignedToUserId | TEXT? | FK → User (set null) |
| source | ReviewSourceType | default FORM |
| status | ReviewStatus | default NEW |
| rating | INT? | |
| subject | TEXT? | |
| message | TEXT | |
| internalNotes | TEXT? | |
| createdAt | TIMESTAMP(3) | |
| updatedAt | TIMESTAMP(3) | |
Indexes: `(tenantId, status, createdAt)`, `(profileId, createdAt)`, `(campaignId, createdAt)`, `(assignedToUserId, status)`.

**ChatbotBot**
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | `cuid()` |
| tenantId | TEXT | unique FK → Tenant (cascade) |
| name | TEXT | |
| slug | TEXT | |
| publicPath | TEXT | |
| systemPrompt | TEXT? | |
| confidenceThreshold | FLOAT | default 0.65 |
| handoverThreshold | FLOAT | default 0.4 |
| isActive | BOOLEAN | default true |
| createdAt | TIMESTAMP(3) | |
| updatedAt | TIMESTAMP(3) | |
Unique: `(tenantId, slug)`, `(tenantId, publicPath)`. Index: `(tenantId, isActive)`.

**ChatbotKnowledgeSource**
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | `cuid()` |
| botId | TEXT | FK → ChatbotBot (cascade) |
| sourceType | ChatbotKnowledgeSourceType | |
| title | TEXT | |
| sourceUrl | TEXT? | |
| content | JSON? | |
| isActive | BOOLEAN | default true |
| lastIndexedAt | TIMESTAMP(3)? | |
| createdAt | TIMESTAMP(3) | |
| updatedAt | TIMESTAMP(3) | |
Indexes: `(botId, sourceType)`, `(botId, isActive)`.

**ChatbotConversation**
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | `cuid()` |
| botId | TEXT | FK → ChatbotBot (cascade) |
| tenantId | TEXT | FK → Tenant (cascade) |
| customerId | TEXT? | FK → Customer (set null) |
| status | ChatbotConversationStatus | default OPEN |
| channel | TEXT | default `web` |
| confidenceScore | FLOAT? | |
| handoverRequired | BOOLEAN | default false |
| startedAt | TIMESTAMP(3) | default now() |
| endedAt | TIMESTAMP(3)? | |
| routePath | TEXT? | |
| createdAt | TIMESTAMP(3) | |
| updatedAt | TIMESTAMP(3) | |
Indexes: `(botId, startedAt)`, `(tenantId, status, startedAt)`, `(customerId, startedAt)`.

**ChatbotMessage**
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | `cuid()` |
| conversationId | TEXT | FK → ChatbotConversation (cascade) |
| role | ChatbotMessageRole | |
| content | TEXT | |
| confidenceScore | FLOAT? | |
| tokenCount | INT? | |
| modelName | TEXT? | |
| createdAt | TIMESTAMP(3) | |
| updatedAt | TIMESTAMP(3) | |
Indexes: `(conversationId, createdAt)`, `(role, createdAt)`.

**ChatbotHandover**
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | `cuid()` |
| conversationId | TEXT | unique FK → ChatbotConversation (cascade) |
| assignedToUserId | TEXT? | FK → User (set null) |
| reason | TEXT | |
| status | TEXT | default `open` |
| notes | TEXT? | |
| createdAt | TIMESTAMP(3) | |
| updatedAt | TIMESTAMP(3) | |
Index: `(assignedToUserId, status)`.

---

## Enterprise / captive Wi‑Fi tables (Supabase public schema)

### wifi_devices
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | `uuid_generate_v4()` |
| enterprise_id | UUID | FK → enterprises (cascade) |
| mac_address | TEXT | unique per enterprise; CHECK format |
| device_fingerprint | TEXT? | |
| display_name | TEXT? | |
| status | wifi_device_status | default `active` |
| first_seen_at | TIMESTAMPTZ | default now() |
| last_seen_at | TIMESTAMPTZ | default now() |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |
Unique: `(enterprise_id, mac_address)`. Indexes: `mac_address`, `(enterprise_id, status)`.

### wifi_sessions
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | `uuid_generate_v4()` |
| enterprise_id | UUID | FK → enterprises (cascade) |
| device_id | UUID | FK → wifi_devices (cascade) |
| plan_id | UUID? | FK → subscription_plans (set null) |
| status | wifi_session_status | default `active` |
| acct_session_id | TEXT? | |
| ap_id | TEXT? | |
| started_at | TIMESTAMPTZ | default now() |
| ends_at | TIMESTAMPTZ? | |
| disconnected_at | TIMESTAMPTZ? | |
| input_octets | BIGINT | default 0 |
| output_octets | BIGINT | default 0 |
| quota_bytes | BIGINT | |
| download_kbps | INTEGER | default 0 |
| upload_kbps | INTEGER | default 0 |
| stripe_checkout_session_id | TEXT? | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |
Unique: `(enterprise_id, acct_session_id)` where `acct_session_id` is not null. Indexes: `(device_id, status, started_at DESC)`, `(enterprise_id, status, started_at DESC)`.

### subscription_plans
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | `uuid_generate_v4()` |
| enterprise_id | UUID | FK → enterprises (cascade) |
| name | TEXT | |
| description | TEXT? | |
| stripe_price_id | TEXT? | |
| price_cents | INTEGER | >= 0 |
| currency | TEXT | default `usd` |
| interval | subscription_plan_interval | default `session` |
| quota_mb | INTEGER? | >= 0 or null |
| duration_minutes | INTEGER? | > 0 or null |
| download_kbps | INTEGER | default 0 |
| upload_kbps | INTEGER | default 0 |
| sort_order | INTEGER | default 0 |
| is_active | BOOLEAN | default true |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |
Unique: `(enterprise_id, stripe_price_id)` where `stripe_price_id` is not null. Indexes: `(enterprise_id, is_active, sort_order)`.

### captive columns on enterprises (added by migration 005)
| Column | Type | Notes |
|---|---|---|
| free_quota_mb | INTEGER | >= 0, default 100 |
| free_session_minutes | INTEGER | > 0, default 60 |
| default_download_kbps | INTEGER | >= 0, default 5000 |
| default_upload_kbps | INTEGER | >= 0, default 2000 |
| gateway_hmac_secret | TEXT? | |
| radius_coa_host | TEXT? | |
| radius_coa_port | INTEGER | 1–65535, default 3799 |
| radius_secret | TEXT? | |
| stripe_customer_id | TEXT? | |

### Enums (captive domain)
- `wifi_device_status`: `active`, `blocked`, `pending`
- `wifi_session_status`: `active`, `expired`, `disconnected`, `quota_exceeded`, `upgraded`
- `subscription_plan_interval`: `session`, `hourly`, `daily`, `monthly`

---

## Ownership & cascade rules

- Tenant-scoped entities (`TenantMember`, `TenantDomain`, `Customer`, `Menu`, `Website`, `WifiNetwork`, `ReviewProfile`, `ChatbotBot`, and their children) cascade-delete from `Tenant` on delete.
- `Tenant.ownerUserId → User` uses `SET NULL` so deleting a user does not delete the tenant.
- `TenantMember` and `TenantMember.user` both use `CASCADE`, so removing a user or tenant removes the membership row.
- Customer-linked event/feedback rows use `SET NULL` on customer delete (`MenuScanEvent.customerId`, `WifiSession.customerId`, `ReviewGateVisit.customerId`, `ReviewFeedback.customerId`, `ChatbotConversation.customerId`) — events survive anonymization.
- Join tables `MenuModifierGroupItem` and `MenuItemAllergen` use a composite primary key `(leftId, rightId)`.
- Contact messages have no tenant FK and no RLS write access from Supabase client roles; only the server-side Prisma connection can write (`supabase/migrations/008_contact_messages.sql`).

---

## Indexes of note

Many queries are time-windowed on `*_scannedAt` / `*_startedAt` / `*_createdAt`. Key multi-column indexes:

- `MenuScanEvent(tenantId, scannedAt)`, `(menuId, scannedAt)`, `(customerId, scannedAt)`, `(eventType, scannedAt)`
- `WifiSession(networkId, startedAt)`, `(customerId, startedAt)`, `(status, startedAt)`
- `ReviewFeedback(tenantId, status, createdAt)`, `(profileId, createdAt)`, `(campaignId, createdAt)`, `(assignedToUserId, status)`
- `ReviewGateVisit(tenantId, createdAt)`, `(profileId, createdAt)`, `(campaignId, createdAt)`, `(rating, createdAt)`
- `ChatbotConversation(botId, startedAt)`, `(tenantId, status, startedAt)`, `(customerId, startedAt)`
- `ChatbotMessage(conversationId, createdAt)`, `(role, createdAt)`
- `TenantMember(tenantId, role)`, `(userId, role)`

---

## Demo tenant

- Slug: `demo` (Prisma guest tenant)
- When `DATABASE_URL` is not reachable, guest café APIs fall back to `api/_lib/demoCafe.js` (static payload).
- `/admin` still requires a working `DATABASE_URL`.

---

## Where to look next

- `prisma/schema.prisma` — canonical schema + relations
- `supabase-init.sql` — SQL mirror of the Prisma schema (create tables + FKs)
- `supabase/migrations/001_task_1_1_base_schema.sql` — first migration
- `supabase/migrations/005_wifi_captive_portal.sql` — captive Wi‑Fi surface
- `supabase/migrations/008_contact_messages.sql` — contact message table + grants
- `api/_lib/prisma.js` — server-only Prisma singleton
- `api/_lib/demoCafe.js` — demo fallback payload
- `prisma/seed.js`, `scripts/seed-http.mjs`, `scripts/run-seed.mjs` — seeding

*Generated from `prisma/schema.prisma` and `supabase/migrations/*.sql`. Update this doc when the Prisma schema or Supabase migrations change.*

---

## Normalization assessment

Overall the database is in **BCNF / 3NF** across both surfaces, with two deliberate and well-justified exceptions: JSON payload columns and junction tables whose multiplicity only supports two foreign keys.

### Functional dependencies and candidate keys

- Every entity has an explicit primary key: `cuid()`/`uuid_generate_v4()`/composite PK on join tables. There are no hidden row identifiers.
- Many lookup/domain tables carry natural unique constraints in addition to the surrogate PK, e.g. `MenuCategory(menuId, slug)`, `MenuItem(categoryId, slug)`, `MenuModifierGroup(menuId, name)`, `WifiNetwork(tenantId, qrSlug)` and `(tenantId, ssid)`, `Tenant(slug)` and `(subdomain)`, `Customer(tenantId, externalReference)`. These prevent duplicate logical entries per parent.
- Join tables `MenuModifierGroupItem(modifierGroupId, menuItemId)` and `MenuItemAllergen(menuItemId, menuAllergenId)` use a composite PK formed entirely from the two FK columns. That is correct for a pure M:N association table.

### 1NF — atomic columns

- Prisma columns are scalar: `TEXT`, `BOOLEAN`, integer cents, enums, `JSON?`/`JSONB?`, and `TIMESTAMP(3)` / `TIMESTAMPTZ`. No comma-separated or repeating groups in columns.
- The captive Wi-Fi tables follow the same rule; `mac_address` is validated by a CHECK constraint against the expected colon-separated format.

### 2NF — no partial dependencies on a composite key

- The only tables with a composite key are the two junction tables. Neither carries non-key columns that depend on only one side of the key — both store only the two foreign keys plus audit timestamps. Timestamps (`createdAt`/`updatedAt`) depend on the whole row identity, not one FK, so no partial dependency remains.
- `MenuModifierGroupItem` and `MenuItemAllergen` are therefore in 2NF.

### 3NF — no transitive dependencies

- Within each table, non-key attributes describe the entity identified by the PK, not another non-key attribute. Examples:
  - `MenuItem.priceCents` depends on `MenuItem.id`, not on `categoryId` (categories do not fix price).
  - `MenuScanEvent.scannedAt`, `userAgent`, `ipHash`, `landingPath` depend on the scan event id, not on `menuId` or `customerId`.
  - `ReviewFeedback.subject`, `message`, `internalNotes` depend on the feedback row, not on `profileId` or `assignedToUserId`.
  - `WifiSession.startedAt`, `consentGiven`, `contactEmail`, `sessionToken` depend on the session id.
- No item of data is determined by a non-key column. So the tables are in 3NF.

### BCNF — every determinant is a candidate key

- Where a unique constraint exists, it is either the PK or a true business key enforced as a UK (for example `User.authId`, `User.email`, `Tenant.slug`, `MenuCategory(menuId, slug)`).
- There are no non-trivial functional dependencies where a determinant is not a superkey, other than the ones discussed below.

### Deliberate non-3NF payloads

Two classes of column intentionally carry structured content that is not fully decomposed into scalar columns:

1. **JSON / JSONB columns** — `Menu.themeJson`, `Website.themeJson`, `Website.jsonLd`, `WebsitePage.structuredData`, `WebsiteBlock.config`, `WebsiteFormSubmission.meta`, `MenuAllergen` has none, but `ChatbotKnowledgeSource.content` is `JSON?`, `qr_menu_items.nutritional_info` is `JSONB`, `enterprise_modules.settings` is `JSONB`, and captive `enterprises.branding` is `JSONB`.
   - These are document-style payloads. Full decomposition would destroy compactness and the schema would need many sparse columns or parallel tables. They are treated as opaque blobs by Postgres and by Prisma, so normalization is deferred to the application layer. This is a documented, acceptable deviation from strict 3NF.

2. **Denormalized tenant id on event tables** — `MenuScanEvent.tenantId`, `ReviewGateVisit.tenantId`, `ReviewFeedback.tenantId`, `ReviewCampaign.tenantId`, `ChatbotConversation.tenantId`, `Customer.tenantId` are stored directly even though each could be reached via the parent FK (`Menu → Tenant`, `ReviewProfile → Tenant`, etc.).
   - This is a common analytics/indexing pattern: tenant-scoped queries filter on `tenantId` directly without a join, and the FK still enforces consistency. It is a controlled redundancy (denormalization for query performance), not a normalization violation that causes update anomalies, because the tenant id is immutable once the relationship is set and is protected by the FK.

### Captive Wi-Fi surface normalization

- `wifi_devices`, `wifi_sessions`, `subscription_plans` are normalized around their UUID PKs and foreign keys to `enterprises`, `wifi_devices`, and `subscription_plans`.
- `wifi_sessions` stores `input_octets`/`output_octets`/`quota_bytes`/`download_kbps`/`upload_kbps` — all session-scoped metrics depending on the session id, no transitive dependency.
- The captive `enterprises` columns added by migration 005 (`free_quota_mb`, `free_session_minutes`, `default_download_kbps`, `default_upload_kbps`, `gateway_hmac_secret`, `radius_coa_host`, `radius_coa_port`, `radius_secret`, `stripe_customer_id`) are enterprise configuration scalars that depend on `enterprises.id`. They are not derived from each other, so no 3NF violation.
- Loyalty tables (`loyalty_programs`, `loyalty_rewards`, `loyalty_members`, `loyalty_transactions`) are normalized; points balance is derived through `loyalty_award_points` / `loyalty_redeem_reward` functions with atomic updates and idempotency keys, so the balance is a derived value kept consistent by the DB functions rather than a transitive dependency you could drop the FK for.

### Apple Wallet surface normalization

- `apple_wallet_programs` and `apple_wallet_members` are normalized; `apple_wallet_members.program_id` → `apple_wallet_programs.id`. Member metadata (`tier`, `expires_at`, `status`) depends on the member id. No transitive dependency. `access_token_hash` is unique per member, which is a candidate key on `apple_wallet_members`, not a violation.

### What would break strict BCNF

If a reviewer wanted absolute BCNF everywhere, the remaining items would be:

- The JSON columns listed above — to satisfy BCNF strictly you would move every named property inside those blobs into its own table/column, which is impractical for arbitrary tenant theme/config payloads.
- The tenant_id denormalization on event/visit/feedback/conversation tables — to satisfy BCNF strictly you would drop `tenantId` from those tables and always reach it through the parent FK. Current indexes are chosen for query ergonomics, and the FK still guarantees integrity.

### Conclusion

- **Prisma product schema**: 1NF, 2NF, 3NF, BCNF for all scalar-relation tables; acceptable, documented deviations are JSON payloads and tenant_id denormalization on event tables.
- **Supabase/captive schema**: 1NF, 2NF, 3NF, BCNF for `wifi_devices`, `wifi_sessions`, `subscription_plans`, `loyalty_*`, `apple_wallet_*`, `profiles`, `menu_items`, `enterprise_modules`, `qr_menu_items`; the `enterprises.branding`/`enterprise_modules.settings`/`qr_menu_items.nutritional_info`/`apple_wallet *_color` JSON/color text fields are opaque payloads, and loyalty balance is maintained by atomic functions.

If a stricter schema is desired later, the first candidates to decompose are the JSON payload columns and the `tenantId` denormalization on event/visit/feedback tables — but neither is currently causing update anomalies, and both are intentional.
