-- TASK-1.1: Extension & Base Schema Setup
-- Enterprise multi-tenant nav/admin domain (Supabase Auth + public schema).
-- Apply in Supabase SQL Editor or via `psql`. Idempotent where practical.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM (
    'super_admin',
    'enterprise_admin',
    'standard_user'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.enterprises (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL,
  domain      TEXT,
  branding    JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT enterprises_slug_unique UNIQUE (slug),
  CONSTRAINT enterprises_slug_format_chk
    CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT enterprises_name_nonempty_chk
    CHECK (char_length(trim(name)) > 0)
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enterprise_id  UUID NOT NULL REFERENCES public.enterprises(id) ON DELETE CASCADE,
  role           public.user_role NOT NULL DEFAULT 'standard_user',
  first_name     TEXT,
  last_name      TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT profiles_first_name_len_chk
    CHECK (first_name IS NULL OR char_length(first_name) <= 100),
  CONSTRAINT profiles_last_name_len_chk
    CHECK (last_name IS NULL OR char_length(last_name) <= 100)
);

CREATE TABLE IF NOT EXISTS public.menu_items (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enterprise_id    UUID NOT NULL REFERENCES public.enterprises(id) ON DELETE CASCADE,
  parent_id        UUID REFERENCES public.menu_items(id) ON DELETE CASCADE,
  label            TEXT NOT NULL,
  url_path         TEXT NOT NULL,
  icon_name        TEXT,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  is_visible       BOOLEAN NOT NULL DEFAULT TRUE,
  required_roles   public.user_role[] NOT NULL DEFAULT ARRAY[
    'super_admin'::public.user_role,
    'enterprise_admin'::public.user_role,
    'standard_user'::public.user_role
  ],
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT menu_items_label_nonempty_chk
    CHECK (char_length(trim(label)) > 0),
  CONSTRAINT menu_items_url_path_nonempty_chk
    CHECK (char_length(trim(url_path)) > 0),
  CONSTRAINT menu_items_parent_not_self_chk
    CHECK (parent_id IS NULL OR parent_id <> id)
);

CREATE TABLE IF NOT EXISTS public.enterprise_modules (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enterprise_id   UUID NOT NULL REFERENCES public.enterprises(id) ON DELETE CASCADE,
  module_key      TEXT NOT NULL,
  is_enabled      BOOLEAN NOT NULL DEFAULT FALSE,
  settings        JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT enterprise_modules_enterprise_module_key_uidx
    UNIQUE (enterprise_id, module_key),
  CONSTRAINT enterprise_modules_module_key_nonempty_chk
    CHECK (char_length(trim(module_key)) > 0)
);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enterprises_set_updated_at ON public.enterprises;
CREATE TRIGGER enterprises_set_updated_at
  BEFORE UPDATE ON public.enterprises
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS menu_items_set_updated_at ON public.menu_items;
CREATE TRIGGER menu_items_set_updated_at
  BEFORE UPDATE ON public.menu_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS enterprise_modules_set_updated_at ON public.enterprise_modules;
CREATE TRIGGER enterprise_modules_set_updated_at
  BEFORE UPDATE ON public.enterprise_modules
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
