import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient, isAuthConfigured } from "./supabaseClient";
import { apiRequest } from "./apiClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const configured = isAuthConfigured();

  const refreshProfile = useCallback(async (activeSession) => {
    if (!activeSession?.access_token) {
      setProfile(null);
      setProfileError("");
      return null;
    }

    try {
      const payload = await apiRequest("/api/admin/session", {
        headers: {
          Authorization: `Bearer ${activeSession.access_token}`,
        },
      });
      setProfile(payload);
      setProfileError("");
      return payload;
    } catch (error) {
      setProfile(null);
      setProfileError(error.message || "Unable to load account profile.");
      return null;
    }
  }, []);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return undefined;
    }

    const supabase = getSupabaseBrowserClient();
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session ?? null);
      return refreshProfile(data.session).finally(() => {
        if (!cancelled) setLoading(false);
      });
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      refreshProfile(nextSession);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, [configured, refreshProfile]);

  const signIn = useCallback(async (email, password) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      throw new Error("Authentication is not configured.");
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw error;
    }

    setSession(data.session);
    await refreshProfile(data.session);
    return data;
  }, [refreshProfile]);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setProfile(null);
    setProfileError("");
  }, []);

  const value = useMemo(
    () => ({
      configured,
      loading,
      session,
      profile,
      profileError,
      accessToken: session?.access_token || null,
      isAuthenticated: Boolean(session?.access_token),
      signIn,
      signOut,
      refreshProfile,
    }),
    [configured, loading, session, profile, profileError, signIn, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
