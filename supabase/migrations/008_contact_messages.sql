-- 008: Marketing site contact form submissions
-- Public POST /api/contact persists here through the server-side Prisma
-- connection. RLS is intentionally not enabled; PostgREST roles are denied
-- direct access below, while the server connection retains write access.

CREATE TABLE IF NOT EXISTS public."ContactMessage" (
    "id"        TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "email"     TEXT NOT NULL,
    "company"   TEXT,
    "message"   TEXT NOT NULL,
    "status"    TEXT NOT NULL DEFAULT 'NEW',
    "ipHash"    TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ContactMessage_status_createdAt_idx"
  ON public."ContactMessage" ("status", "createdAt");

CREATE INDEX IF NOT EXISTS "ContactMessage_email_createdAt_idx"
  ON public."ContactMessage" ("email", "createdAt");

-- Contact submissions are written by the server-side Prisma connection. Do not expose
-- direct table writes or reads through the Supabase client roles.
REVOKE ALL ON public."ContactMessage" FROM anon, authenticated;
GRANT ALL ON public."ContactMessage" TO postgres, service_role;

NOTIFY pgrst, 'reload schema';
