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

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 8000);

    try {
      const payload = await apiRequest("/api/admin/session", {
        headers: {
          Authorization: `Bearer ${activeSession.access_token}`,
        },
        signal: controller.signal,
      });
      setProfile(payload);
      setProfileError("");
      return payload;
    } catch (error) {
      setProfile(null);
      setProfileError(error.message || "Unable to load account profile.");
      return null;
    } finally {
      window.clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return undefined;
    }

    const supabase = getSupabaseBrowserClient();
    let cancelled = false;

    const persistAccessToken = (activeSession) => {
      try {
        if (activeSession?.access_token) {
          window.localStorage.setItem("omnitaps_access_token", activeSession.access_token);
        } else {
          window.localStorage.removeItem("omnitaps_access_token");
          window.sessionStorage.removeItem("omnitaps_access_token");
        }
      } catch {
        // Ignore storage quota / private-mode failures.
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session ?? null);
      persistAccessToken(data.session);
      setLoading(false);
      void refreshProfile(data.session);
    }).catch(() => {
      if (!cancelled) {
        setSession(null);
        persistAccessToken(null);
        setLoading(false);
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      persistAccessToken(nextSession);
      void refreshProfile(nextSession);
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
    try {
      window.localStorage.removeItem("omnitaps_access_token");
      window.sessionStorage.removeItem("omnitaps_access_token");
    } catch {
      // ignore
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
