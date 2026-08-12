/**
 * TASK-3.1: Auth & tenant context hydrated from Supabase Auth + public.profiles.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import type { AuthUser, Profile } from "../types";
import {
  getSupabaseClient,
  isEnterpriseSupabaseConfigured,
} from "../services/supabaseClient";

interface AuthContextValue {
  user: AuthUser | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  configured: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function mapAuthUser(session: Session | null): AuthUser | null {
  const raw = session?.user;
  if (!raw) {
    return null;
  }

  return {
    id: raw.id,
    email: raw.email ?? null,
    phone: raw.phone ?? null,
    created_at: raw.created_at,
    last_sign_in_at: raw.last_sign_in_at ?? null,
    app_metadata: (raw.app_metadata ?? {}) as Record<string, unknown>,
    user_metadata: (raw.user_metadata ?? {}) as Record<string, unknown>,
  };
}

function assertProfile(row: unknown): Profile {
  if (row === null || typeof row !== "object") {
    throw new Error("Invalid profile payload.");
  }

  const value = row as Record<string, unknown>;
  const role = String(value.role);

  if (
    role !== "super_admin" &&
    role !== "enterprise_admin" &&
    role !== "standard_user"
  ) {
    throw new Error("Profile role is invalid.");
  }

  return {
    id: String(value.id),
    enterprise_id: String(value.enterprise_id),
    role,
    first_name:
      value.first_name === null || value.first_name === undefined
        ? null
        : String(value.first_name),
    last_name:
      value.last_name === null || value.last_name === undefined
        ? null
        : String(value.last_name),
    created_at: String(value.created_at),
    updated_at: String(value.updated_at),
  };
}

async function fetchProfileForUser(userId: string): Promise<Profile | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return assertProfile(data);
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const configured = isEnterpriseSupabaseConfigured();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const hydrate = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);

    if (!nextSession?.user?.id) {
      setProfile(null);
      return;
    }

    const nextProfile = await fetchProfileForUser(nextSession.user.id);
    setProfile(nextProfile);
  }, []);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return undefined;
    }

    const supabase = getSupabaseClient();
    let cancelled = false;
    const safetyTimer = window.setTimeout(() => {
      if (!cancelled) {
        setLoading(false);
      }
    }, 4000);

    const boot = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        await hydrate(data.session ?? null);
      } catch {
        if (!cancelled) {
          setSession(null);
          setProfile(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
        window.clearTimeout(safetyTimer);
      }
    };

    void boot();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        if (event === "INITIAL_SESSION") {
          return;
        }
        void hydrate(nextSession).catch(() => {
          if (!cancelled) {
            setSession(null);
            setProfile(null);
          }
        });
      },
    );

    return () => {
      cancelled = true;
      window.clearTimeout(safetyTimer);
      subscription.subscription.unsubscribe();
    };
  }, [configured, hydrate]);

  const signOut = useCallback(async () => {
    if (!configured) {
      setSession(null);
      setProfile(null);
      return;
    }

    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }, [configured]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: mapAuthUser(session),
      profile,
      session,
      loading,
      configured,
      signOut,
    }),
    [session, profile, loading, configured, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
