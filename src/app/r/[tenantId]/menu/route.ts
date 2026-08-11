/**
 * REFERENCE (Next.js App Router) — not executed by the Vite SPA.
 * Live short-link handler: /api/r/[tenantId]/menu.js
 * Public path /r/:tenantId/menu is rewritten to that Vercel function.
 */
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

type RouteParams = {
  tenantId: string;
};

type RouteContext = {
  params: RouteParams | Promise<RouteParams>;
};

declare global {
  // eslint-disable-next-line no-var
  var __omnitapsPrisma: PrismaClient | undefined;
}

const prisma =
  globalThis.__omnitapsPrisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__omnitapsPrisma = prisma;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getClientIp(request: Request): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    const firstForwardedIp = forwardedFor.split(",")[0]?.trim();

    if (firstForwardedIp) {
      return firstForwardedIp;
    }
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  return realIp && realIp.length > 0 ? realIp : null;
}

async function hashValue(value: string | null): Promise<string | null> {
  if (!value) {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase();
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(normalizedValue),
  );

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function resolveTenantMenu(tenantId: string) {
  return prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      menu: {
        select: {
          id: true,
        },
      },
    },
  });
}

function buildMenuRedirect(request: Request, tenantId: string): URL {
  const redirectUrl = new URL(`/menu/${tenantId}`, request.url);
  redirectUrl.search = new URL(request.url).search;
  return redirectUrl;
}

export async function GET(request: Request, context: RouteContext) {
  const resolvedParams = await context.params;

  if (!resolvedParams.tenantId) {
    return NextResponse.json(
      { error: "Missing tenantId parameter." },
      { status: 400 },
    );
  }

  const tenant = await resolveTenantMenu(resolvedParams.tenantId);

  if (!tenant?.menu) {
    return NextResponse.json(
      { error: "Menu not found for this tenant." },
      { status: 404 },
    );
  }

  try {
    const [ipHash, userAgent] = await Promise.all([
      hashValue(getClientIp(request)),
      hashValue(request.headers.get("user-agent")),
    ]);

    await prisma.menuScanEvent.create({
      data: {
        tenantId: tenant.id,
        menuId: tenant.menu.id,
        userAgent,
        ipHash,
        referrer: request.headers.get("referer"),
        landingPath: new URL(request.url).pathname,
      },
    });
  } catch {
    // Redirect should still succeed if analytics write fails.
  }

  return NextResponse.redirect(
    buildMenuRedirect(request, resolvedParams.tenantId),
    307,
  );
}