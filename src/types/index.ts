/**
 * TASK-2.1: Type definitions mirroring the PostgreSQL enterprise schema.
 */

export type UserRole = "super_admin" | "enterprise_admin" | "standard_user";

export interface Enterprise {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  branding: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  enterprise_id: string;
  role: UserRole;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface MenuItem {
  id: string;
  enterprise_id: string;
  parent_id: string | null;
  label: string;
  url_path: string;
  icon_name: string | null;
  sort_order: number;
  is_visible: boolean;
  required_roles: UserRole[];
  created_at: string;
  updated_at: string;
}

export interface EnterpriseModule {
  id: string;
  enterprise_id: string;
  module_key: string;
  is_enabled: boolean;
  settings: Record<string, unknown>;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  email: string | null;
  phone: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  app_metadata: Record<string, unknown>;
  user_metadata: Record<string, unknown>;
}
