import { getPrisma, isDatabaseConfigured } from "../_lib/prisma.js";

export async function resolveTenantByParam(tenantParam) {
  if (!tenantParam || typeof tenantParam !== "string") {
    return null;
  }

  const prisma = getPrisma();
  if (!prisma) {
    return null;
  }

  const value = tenantParam.trim();
  if (!value) {
    return null;
  }

  return prisma.tenant.findFirst({
    where: {
      OR: [{ id: value }, { slug: value }, { subdomain: value }],
    },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
    },
  });
}

export { getPrisma, isDatabaseConfigured };
