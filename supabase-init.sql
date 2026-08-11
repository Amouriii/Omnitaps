-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'STAFF', 'ANALYST');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'TRIAL', 'PAUSED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "TenantPlan" AS ENUM ('STARTER', 'GROWTH', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "DomainType" AS ENUM ('SUBDOMAIN', 'CUSTOM');

-- CreateEnum
CREATE TYPE "TenantMemberRole" AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'ANALYST', 'SUPPORT');

-- CreateEnum
CREATE TYPE "MenuEventType" AS ENUM ('SCAN', 'VIEW', 'CLICK');

-- CreateEnum
CREATE TYPE "WebsiteBlockType" AS ENUM ('HERO', 'HOURS', 'MENU_EMBED', 'GALLERY', 'CTA', 'MAP', 'CONTACT_FORM', 'CUSTOM');

-- CreateEnum
CREATE TYPE "WifiAuthType" AS ENUM ('OPEN', 'WPA', 'WPA2', 'WPA3');

-- CreateEnum
CREATE TYPE "WifiSessionStatus" AS ENUM ('ACTIVE', 'DISCONNECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ReviewSourceType" AS ENUM ('GATE', 'GOOGLE', 'FORM', 'MANUAL');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('NEW', 'TRIAGED', 'RESOLVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ChatbotKnowledgeSourceType" AS ENUM ('MENU', 'HOURS', 'WIFI', 'FAQ', 'DOCUMENT', 'URL', 'MANUAL');

-- CreateEnum
CREATE TYPE "ChatbotConversationStatus" AS ENUM ('OPEN', 'HANDOFF', 'CLOSED');

-- CreateEnum
CREATE TYPE "ChatbotMessageRole" AS ENUM ('SYSTEM', 'USER', 'ASSISTANT', 'TOOL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "authId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatarUrl" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'OWNER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "subdomain" TEXT,
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "plan" "TenantPlan" NOT NULL DEFAULT 'STARTER',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "locale" TEXT NOT NULL DEFAULT 'en',
    "ownerUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantMember" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "TenantMemberRole" NOT NULL DEFAULT 'EDITOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantDomain" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "type" "DomainType" NOT NULL DEFAULT 'CUSTOM',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalReference" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "consentToMarketing" BOOLEAN NOT NULL DEFAULT false,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Menu" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "logoUrl" TEXT,
    "themeJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Menu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuCategory" (
    "id" TEXT NOT NULL,
    "menuId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "imageUrl" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "outOfStockNote" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuModifierGroup" (
    "id" TEXT NOT NULL,
    "menuId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minSelections" INTEGER NOT NULL DEFAULT 0,
    "maxSelections" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuModifierGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuModifierOption" (
    "id" TEXT NOT NULL,
    "modifierGroupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceDeltaCents" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuModifierOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuModifierGroupItem" (
    "modifierGroupId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuModifierGroupItem_pkey" PRIMARY KEY ("modifierGroupId","menuItemId")
);

-- CreateTable
CREATE TABLE "MenuAllergen" (
    "id" TEXT NOT NULL,
    "menuId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuAllergen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItemAllergen" (
    "menuItemId" TEXT NOT NULL,
    "menuAllergenId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItemAllergen_pkey" PRIMARY KEY ("menuItemId","menuAllergenId")
);

-- CreateTable
CREATE TABLE "MenuScanEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "menuId" TEXT NOT NULL,
    "customerId" TEXT,
    "eventType" "MenuEventType" NOT NULL DEFAULT 'SCAN',
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,
    "ipHash" TEXT,
    "referrer" TEXT,
    "landingPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuScanEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Website" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subdomain" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "themeJson" JSONB,
    "jsonLd" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Website_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteDomain" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "pathPrefix" TEXT NOT NULL DEFAULT '/',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsitePage" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "canonicalUrl" TEXT,
    "isHome" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "structuredData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsitePage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteBlock" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "blockType" "WebsiteBlockType" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteAsset" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteFormSubmission" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "pageId" TEXT,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteFormSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WifiNetwork" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ssid" TEXT NOT NULL,
    "password" TEXT,
    "authType" "WifiAuthType" NOT NULL DEFAULT 'WPA2',
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "qrSlug" TEXT NOT NULL,
    "qrPayload" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "leadCaptureEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WifiNetwork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WifiAccessPoint" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "macAddress" TEXT NOT NULL,
    "ipAddress" TEXT,
    "branchLabel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'online',
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WifiAccessPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WifiSplashPage" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "headline" TEXT,
    "body" TEXT,
    "consentLabel" TEXT,
    "captureEmail" BOOLEAN NOT NULL DEFAULT false,
    "capturePhone" BOOLEAN NOT NULL DEFAULT false,
    "requiresConsent" BOOLEAN NOT NULL DEFAULT true,
    "revealCredentialsAfterSubmit" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WifiSplashPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WifiSession" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "accessPointId" TEXT,
    "customerId" TEXT,
    "status" "WifiSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "userAgent" TEXT,
    "ipHash" TEXT,
    "referrer" TEXT,
    "consentGiven" BOOLEAN NOT NULL DEFAULT false,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "sessionToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WifiSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "publicSlug" TEXT NOT NULL,
    "googlePlaceId" TEXT NOT NULL,
    "googleReviewUrl" TEXT NOT NULL,
    "thresholdRating" INTEGER NOT NULL DEFAULT 4,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewCampaign" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "routePath" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "redirectUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewGateVisit" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "campaignId" TEXT,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT,
    "source" "ReviewSourceType" NOT NULL DEFAULT 'GATE',
    "rating" INTEGER,
    "routePath" TEXT,
    "referrer" TEXT,
    "userAgent" TEXT,
    "ipHash" TEXT,
    "googleRedirectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewGateVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewFeedback" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "campaignId" TEXT,
    "gateVisitId" TEXT,
    "customerId" TEXT,
    "createdByUserId" TEXT,
    "assignedToUserId" TEXT,
    "source" "ReviewSourceType" NOT NULL DEFAULT 'FORM',
    "status" "ReviewStatus" NOT NULL DEFAULT 'NEW',
    "rating" INTEGER,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatbotBot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "publicPath" TEXT NOT NULL,
    "systemPrompt" TEXT,
    "confidenceThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.65,
    "handoverThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.4,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatbotBot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatbotKnowledgeSource" (
    "id" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "sourceType" "ChatbotKnowledgeSourceType" NOT NULL,
    "title" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "content" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastIndexedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatbotKnowledgeSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatbotConversation" (
    "id" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT,
    "status" "ChatbotConversationStatus" NOT NULL DEFAULT 'OPEN',
    "channel" TEXT NOT NULL DEFAULT 'web',
    "confidenceScore" DOUBLE PRECISION,
    "handoverRequired" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "routePath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatbotConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatbotMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "ChatbotMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "confidenceScore" DOUBLE PRECISION,
    "tokenCount" INTEGER,
    "modelName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatbotMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatbotHandover" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "assignedToUserId" TEXT,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatbotHandover_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_authId_key" ON "User"("authId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_subdomain_key" ON "Tenant"("subdomain");

-- CreateIndex
CREATE INDEX "Tenant_status_idx" ON "Tenant"("status");

-- CreateIndex
CREATE INDEX "Tenant_plan_idx" ON "Tenant"("plan");

-- CreateIndex
CREATE INDEX "TenantMember_tenantId_role_idx" ON "TenantMember"("tenantId", "role");

-- CreateIndex
CREATE INDEX "TenantMember_userId_role_idx" ON "TenantMember"("userId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "TenantMember_tenantId_userId_key" ON "TenantMember"("tenantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantDomain_hostname_key" ON "TenantDomain"("hostname");

-- CreateIndex
CREATE INDEX "TenantDomain_tenantId_isPrimary_idx" ON "TenantDomain"("tenantId", "isPrimary");

-- CreateIndex
CREATE INDEX "Customer_tenantId_email_idx" ON "Customer"("tenantId", "email");

-- CreateIndex
CREATE INDEX "Customer_tenantId_phone_idx" ON "Customer"("tenantId", "phone");

-- CreateIndex
CREATE INDEX "Customer_tenantId_lastSeenAt_idx" ON "Customer"("tenantId", "lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_tenantId_externalReference_key" ON "Customer"("tenantId", "externalReference");

-- CreateIndex
CREATE UNIQUE INDEX "Menu_tenantId_key" ON "Menu"("tenantId");

-- CreateIndex
CREATE INDEX "Menu_slug_idx" ON "Menu"("slug");

-- CreateIndex
CREATE INDEX "Menu_tenantId_isPublished_idx" ON "Menu"("tenantId", "isPublished");

-- CreateIndex
CREATE UNIQUE INDEX "Menu_tenantId_slug_key" ON "Menu"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "MenuCategory_menuId_sortOrder_idx" ON "MenuCategory"("menuId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "MenuCategory_menuId_slug_key" ON "MenuCategory"("menuId", "slug");

-- CreateIndex
CREATE INDEX "MenuItem_categoryId_sortOrder_idx" ON "MenuItem"("categoryId", "sortOrder");

-- CreateIndex
CREATE INDEX "MenuItem_isAvailable_idx" ON "MenuItem"("isAvailable");

-- CreateIndex
CREATE UNIQUE INDEX "MenuItem_categoryId_slug_key" ON "MenuItem"("categoryId", "slug");

-- CreateIndex
CREATE INDEX "MenuModifierGroup_menuId_sortOrder_idx" ON "MenuModifierGroup"("menuId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "MenuModifierGroup_menuId_name_key" ON "MenuModifierGroup"("menuId", "name");

-- CreateIndex
CREATE INDEX "MenuModifierOption_modifierGroupId_sortOrder_idx" ON "MenuModifierOption"("modifierGroupId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "MenuModifierOption_modifierGroupId_name_key" ON "MenuModifierOption"("modifierGroupId", "name");

-- CreateIndex
CREATE INDEX "MenuModifierGroupItem_menuItemId_idx" ON "MenuModifierGroupItem"("menuItemId");

-- CreateIndex
CREATE INDEX "MenuAllergen_menuId_isActive_idx" ON "MenuAllergen"("menuId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "MenuAllergen_menuId_slug_key" ON "MenuAllergen"("menuId", "slug");

-- CreateIndex
CREATE INDEX "MenuItemAllergen_menuAllergenId_idx" ON "MenuItemAllergen"("menuAllergenId");

-- CreateIndex
CREATE INDEX "MenuScanEvent_tenantId_scannedAt_idx" ON "MenuScanEvent"("tenantId", "scannedAt");

-- CreateIndex
CREATE INDEX "MenuScanEvent_menuId_scannedAt_idx" ON "MenuScanEvent"("menuId", "scannedAt");

-- CreateIndex
CREATE INDEX "MenuScanEvent_customerId_scannedAt_idx" ON "MenuScanEvent"("customerId", "scannedAt");

-- CreateIndex
CREATE INDEX "MenuScanEvent_eventType_scannedAt_idx" ON "MenuScanEvent"("eventType", "scannedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Website_tenantId_key" ON "Website"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Website_subdomain_key" ON "Website"("subdomain");

-- CreateIndex
CREATE INDEX "Website_slug_idx" ON "Website"("slug");

-- CreateIndex
CREATE INDEX "Website_tenantId_isPublished_idx" ON "Website"("tenantId", "isPublished");

-- CreateIndex
CREATE UNIQUE INDEX "Website_tenantId_slug_key" ON "Website"("tenantId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteDomain_hostname_key" ON "WebsiteDomain"("hostname");

-- CreateIndex
CREATE INDEX "WebsiteDomain_websiteId_isPrimary_idx" ON "WebsiteDomain"("websiteId", "isPrimary");

-- CreateIndex
CREATE INDEX "WebsitePage_websiteId_sortOrder_idx" ON "WebsitePage"("websiteId", "sortOrder");

-- CreateIndex
CREATE INDEX "WebsitePage_path_idx" ON "WebsitePage"("path");

-- CreateIndex
CREATE INDEX "WebsitePage_isPublished_isHome_idx" ON "WebsitePage"("isPublished", "isHome");

-- CreateIndex
CREATE UNIQUE INDEX "WebsitePage_websiteId_path_key" ON "WebsitePage"("websiteId", "path");

-- CreateIndex
CREATE UNIQUE INDEX "WebsitePage_websiteId_slug_key" ON "WebsitePage"("websiteId", "slug");

-- CreateIndex
CREATE INDEX "WebsiteBlock_pageId_sortOrder_idx" ON "WebsiteBlock"("pageId", "sortOrder");

-- CreateIndex
CREATE INDEX "WebsiteBlock_blockType_idx" ON "WebsiteBlock"("blockType");

-- CreateIndex
CREATE INDEX "WebsiteAsset_websiteId_kind_sortOrder_idx" ON "WebsiteAsset"("websiteId", "kind", "sortOrder");

-- CreateIndex
CREATE INDEX "WebsiteFormSubmission_websiteId_createdAt_idx" ON "WebsiteFormSubmission"("websiteId", "createdAt");

-- CreateIndex
CREATE INDEX "WebsiteFormSubmission_pageId_createdAt_idx" ON "WebsiteFormSubmission"("pageId", "createdAt");

-- CreateIndex
CREATE INDEX "WebsiteFormSubmission_status_createdAt_idx" ON "WebsiteFormSubmission"("status", "createdAt");

-- CreateIndex
CREATE INDEX "WifiNetwork_tenantId_isActive_idx" ON "WifiNetwork"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "WifiNetwork_tenantId_authType_idx" ON "WifiNetwork"("tenantId", "authType");

-- CreateIndex
CREATE UNIQUE INDEX "WifiNetwork_tenantId_qrSlug_key" ON "WifiNetwork"("tenantId", "qrSlug");

-- CreateIndex
CREATE UNIQUE INDEX "WifiNetwork_tenantId_ssid_key" ON "WifiNetwork"("tenantId", "ssid");

-- CreateIndex
CREATE UNIQUE INDEX "WifiAccessPoint_macAddress_key" ON "WifiAccessPoint"("macAddress");

-- CreateIndex
CREATE INDEX "WifiAccessPoint_networkId_status_idx" ON "WifiAccessPoint"("networkId", "status");

-- CreateIndex
CREATE INDEX "WifiAccessPoint_networkId_lastSeenAt_idx" ON "WifiAccessPoint"("networkId", "lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "WifiSplashPage_networkId_key" ON "WifiSplashPage"("networkId");

-- CreateIndex
CREATE UNIQUE INDEX "WifiSession_sessionToken_key" ON "WifiSession"("sessionToken");

-- CreateIndex
CREATE INDEX "WifiSession_networkId_startedAt_idx" ON "WifiSession"("networkId", "startedAt");

-- CreateIndex
CREATE INDEX "WifiSession_accessPointId_startedAt_idx" ON "WifiSession"("accessPointId", "startedAt");

-- CreateIndex
CREATE INDEX "WifiSession_customerId_startedAt_idx" ON "WifiSession"("customerId", "startedAt");

-- CreateIndex
CREATE INDEX "WifiSession_status_startedAt_idx" ON "WifiSession"("status", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewProfile_tenantId_key" ON "ReviewProfile"("tenantId");

-- CreateIndex
CREATE INDEX "ReviewProfile_tenantId_isActive_idx" ON "ReviewProfile"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewProfile_tenantId_publicSlug_key" ON "ReviewProfile"("tenantId", "publicSlug");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewProfile_googlePlaceId_key" ON "ReviewProfile"("googlePlaceId");

-- CreateIndex
CREATE INDEX "ReviewCampaign_tenantId_isActive_idx" ON "ReviewCampaign"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewCampaign_profileId_slug_key" ON "ReviewCampaign"("profileId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewCampaign_tenantId_routePath_key" ON "ReviewCampaign"("tenantId", "routePath");

-- CreateIndex
CREATE INDEX "ReviewGateVisit_tenantId_createdAt_idx" ON "ReviewGateVisit"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "ReviewGateVisit_profileId_createdAt_idx" ON "ReviewGateVisit"("profileId", "createdAt");

-- CreateIndex
CREATE INDEX "ReviewGateVisit_campaignId_createdAt_idx" ON "ReviewGateVisit"("campaignId", "createdAt");

-- CreateIndex
CREATE INDEX "ReviewGateVisit_rating_createdAt_idx" ON "ReviewGateVisit"("rating", "createdAt");

-- CreateIndex
CREATE INDEX "ReviewFeedback_tenantId_status_createdAt_idx" ON "ReviewFeedback"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ReviewFeedback_profileId_createdAt_idx" ON "ReviewFeedback"("profileId", "createdAt");

-- CreateIndex
CREATE INDEX "ReviewFeedback_campaignId_createdAt_idx" ON "ReviewFeedback"("campaignId", "createdAt");

-- CreateIndex
CREATE INDEX "ReviewFeedback_assignedToUserId_status_idx" ON "ReviewFeedback"("assignedToUserId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ChatbotBot_tenantId_key" ON "ChatbotBot"("tenantId");

-- CreateIndex
CREATE INDEX "ChatbotBot_tenantId_isActive_idx" ON "ChatbotBot"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ChatbotBot_tenantId_slug_key" ON "ChatbotBot"("tenantId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "ChatbotBot_tenantId_publicPath_key" ON "ChatbotBot"("tenantId", "publicPath");

-- CreateIndex
CREATE INDEX "ChatbotKnowledgeSource_botId_sourceType_idx" ON "ChatbotKnowledgeSource"("botId", "sourceType");

-- CreateIndex
CREATE INDEX "ChatbotKnowledgeSource_botId_isActive_idx" ON "ChatbotKnowledgeSource"("botId", "isActive");

-- CreateIndex
CREATE INDEX "ChatbotConversation_botId_startedAt_idx" ON "ChatbotConversation"("botId", "startedAt");

-- CreateIndex
CREATE INDEX "ChatbotConversation_tenantId_status_startedAt_idx" ON "ChatbotConversation"("tenantId", "status", "startedAt");

-- CreateIndex
CREATE INDEX "ChatbotConversation_customerId_startedAt_idx" ON "ChatbotConversation"("customerId", "startedAt");

-- CreateIndex
CREATE INDEX "ChatbotMessage_conversationId_createdAt_idx" ON "ChatbotMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "ChatbotMessage_role_createdAt_idx" ON "ChatbotMessage"("role", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChatbotHandover_conversationId_key" ON "ChatbotHandover"("conversationId");

-- CreateIndex
CREATE INDEX "ChatbotHandover_assignedToUserId_status_idx" ON "ChatbotHandover"("assignedToUserId", "status");

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantMember" ADD CONSTRAINT "TenantMember_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantMember" ADD CONSTRAINT "TenantMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantDomain" ADD CONSTRAINT "TenantDomain_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Menu" ADD CONSTRAINT "Menu_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuCategory" ADD CONSTRAINT "MenuCategory_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "Menu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MenuCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuModifierGroup" ADD CONSTRAINT "MenuModifierGroup_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "Menu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuModifierOption" ADD CONSTRAINT "MenuModifierOption_modifierGroupId_fkey" FOREIGN KEY ("modifierGroupId") REFERENCES "MenuModifierGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuModifierGroupItem" ADD CONSTRAINT "MenuModifierGroupItem_modifierGroupId_fkey" FOREIGN KEY ("modifierGroupId") REFERENCES "MenuModifierGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuModifierGroupItem" ADD CONSTRAINT "MenuModifierGroupItem_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuAllergen" ADD CONSTRAINT "MenuAllergen_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "Menu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemAllergen" ADD CONSTRAINT "MenuItemAllergen_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemAllergen" ADD CONSTRAINT "MenuItemAllergen_menuAllergenId_fkey" FOREIGN KEY ("menuAllergenId") REFERENCES "MenuAllergen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuScanEvent" ADD CONSTRAINT "MenuScanEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuScanEvent" ADD CONSTRAINT "MenuScanEvent_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "Menu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuScanEvent" ADD CONSTRAINT "MenuScanEvent_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Website" ADD CONSTRAINT "Website_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteDomain" ADD CONSTRAINT "WebsiteDomain_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsitePage" ADD CONSTRAINT "WebsitePage_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteBlock" ADD CONSTRAINT "WebsiteBlock_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "WebsitePage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteAsset" ADD CONSTRAINT "WebsiteAsset_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteFormSubmission" ADD CONSTRAINT "WebsiteFormSubmission_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteFormSubmission" ADD CONSTRAINT "WebsiteFormSubmission_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "WebsitePage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WifiNetwork" ADD CONSTRAINT "WifiNetwork_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WifiAccessPoint" ADD CONSTRAINT "WifiAccessPoint_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "WifiNetwork"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WifiSplashPage" ADD CONSTRAINT "WifiSplashPage_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "WifiNetwork"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WifiSession" ADD CONSTRAINT "WifiSession_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "WifiNetwork"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WifiSession" ADD CONSTRAINT "WifiSession_accessPointId_fkey" FOREIGN KEY ("accessPointId") REFERENCES "WifiAccessPoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WifiSession" ADD CONSTRAINT "WifiSession_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewProfile" ADD CONSTRAINT "ReviewProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewCampaign" ADD CONSTRAINT "ReviewCampaign_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ReviewProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewCampaign" ADD CONSTRAINT "ReviewCampaign_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewGateVisit" ADD CONSTRAINT "ReviewGateVisit_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ReviewProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewGateVisit" ADD CONSTRAINT "ReviewGateVisit_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "ReviewCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewGateVisit" ADD CONSTRAINT "ReviewGateVisit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewGateVisit" ADD CONSTRAINT "ReviewGateVisit_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewFeedback" ADD CONSTRAINT "ReviewFeedback_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewFeedback" ADD CONSTRAINT "ReviewFeedback_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ReviewProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewFeedback" ADD CONSTRAINT "ReviewFeedback_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "ReviewCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewFeedback" ADD CONSTRAINT "ReviewFeedback_gateVisitId_fkey" FOREIGN KEY ("gateVisitId") REFERENCES "ReviewGateVisit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewFeedback" ADD CONSTRAINT "ReviewFeedback_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewFeedback" ADD CONSTRAINT "ReviewFeedback_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewFeedback" ADD CONSTRAINT "ReviewFeedback_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatbotBot" ADD CONSTRAINT "ChatbotBot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatbotKnowledgeSource" ADD CONSTRAINT "ChatbotKnowledgeSource_botId_fkey" FOREIGN KEY ("botId") REFERENCES "ChatbotBot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatbotConversation" ADD CONSTRAINT "ChatbotConversation_botId_fkey" FOREIGN KEY ("botId") REFERENCES "ChatbotBot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatbotConversation" ADD CONSTRAINT "ChatbotConversation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatbotConversation" ADD CONSTRAINT "ChatbotConversation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatbotMessage" ADD CONSTRAINT "ChatbotMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatbotConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatbotHandover" ADD CONSTRAINT "ChatbotHandover_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatbotConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatbotHandover" ADD CONSTRAINT "ChatbotHandover_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Supabase roles + PostgREST refresh
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';
