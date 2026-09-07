import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowserClient, isAuthConfigured } from "./supabaseClient";
import { apiRequest, ApiError } from "./apiClient";

// Measured cold-start on the remote Supabase pooler (Prisma pool connect) runs
// ~7-8s, so the per-attempt timeout must sit above that; a genuinely hung server
// still surfaces within two attempts.
const PROFILE_TIMEOUT_MS = 12000;

const AuthContext = createContext(null);

/** Unverified JWT sub read — used only to identify the profile request owner. */
function sessionUserId(session) {
  const token = session?.access_token;
  if (!token) return null;
  try {
    return JSON.parse(window.atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")))?.sub || null;
  } catch {
    return token;
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [profileErrorCode, setProfileErrorCode] = useState("");
  const configured = isAuthConfigured();
  const profileRequestRef = useRef(null);
  const lastSuccessfulUserIdRef = useRef(null);

  const refreshProfile = useCallback(async (activeSession) => {
    if (!activeSession?.access_token) {
      const previousRequest = profileRequestRef.current;
      if (previousRequest) {
        profileRequestRef.current = null;
        previousRequest.controller.abort();
      }
      lastSuccessfulUserIdRef.current = null;
      setProfile(null);
      setProfileError("");
      setProfileErrorCode("");
      return null;
    }

    // getSession, INITIAL_SESSION, TOKEN_REFRESHED, and StrictMode remounts all
    // fire back-to-back. Join the in-flight request for the same user (or reuse
    // the last result) instead of starting a competing fetch that aborts the
    // previous one — the losing fetch used to surface as net::ERR_ABORTED noise
    // in the network log. A genuinely different user still supersedes.
    const userId = sessionUserId(activeSession);
    const existing = profileRequestRef.current;
    if (existing?.userId === userId) {
      return existing.promise;
    }
    if (!existing && lastSuccessfulUserIdRef.current === userId) {
      return null;
    }

    // Different user than the in-flight one: supersede it.
    if (existing) {
      profileRequestRef.current = null;
      existing.controller.abort();
    }

    const controller = new AbortController();
    const request = { controller, token: activeSession.access_token, userId };
    request.promise = (async () => {
      profileRequestRef.current = request;

      // Two attempts with independent per-attempt timers: the first often pays
      // the Prisma pool cold-start against the remote database (~7-8s), and the
      // retry lands on a warm pool and returns quickly.
      let lastError = null;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        if (attempt > 0) {
          await new Promise((resolve) => window.setTimeout(resolve, 300));
          if (profileRequestRef.current !== request) return null;
        }
        const timer = window.setTimeout(() => controller.abort(), PROFILE_TIMEOUT_MS);
        try {
          const payload = await apiRequest("/api/admin/session", {
            headers: {
              Authorization: `Bearer ${request.token}`,
            },
            signal: controller.signal,
          });
          if (profileRequestRef.current !== request) return null;
          lastSuccessfulUserIdRef.current = request.userId;
          setProfile(payload);
          setProfileError("");
          setProfileErrorCode("");
          return payload;
        } catch (error) {
          lastError = error;
          if (profileRequestRef.current !== request) return null;
          // Timeout (AbortError): retry once. Anything else is a real failure.
          if (error?.name !== "AbortError") break;
        } finally {
          window.clearTimeout(timer);
        }
      }

      if (profileRequestRef.current !== request) return null;
      lastSuccessfulUserIdRef.current = null;
      setProfile(null);
      if (lastError?.name === "AbortError") {
        setProfileError("Checking your account took too long. Please try again.");
        setProfileErrorCode("PROFILE_TIMEOUT");
      } else {
        setProfileError(lastError?.message || "Unable to load account profile.");
        setProfileErrorCode(
          lastError instanceof ApiError
            ? lastError.code || (lastError.status >= 500 ? "PROFILE_UNAVAILABLE" : "PROFILE_ERROR")
            : // Non-ApiError rejections are network-level failures: transient.
              "PROFILE_UNAVAILABLE",
        );
      }
      return null;
    })();

    return request.promise;
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
      // Leave any in-flight profile request alone: refreshProfile() joins it on
      // remount (StrictMode) instead of racing it, so aborting here would just
      // kill a fetch the remounted effect immediately re-issues.
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
    lastSuccessfulUserIdRef.current = null;
    setSession(null);
    setProfile(null);
    setProfileError("");
    setProfileErrorCode("");
  }, []);

  const value = useMemo(
    () => ({
      configured,
      loading,
      session,
      profile,
      profileError,
      profileErrorCode,
      accessToken: session?.access_token || null,
      isAuthenticated: Boolean(session?.access_token),
      signIn,
      signOut,
      refreshProfile,
    }),
    [configured, loading, session, profile, profileError, profileErrorCode, signIn, signOut, refreshProfile],
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
