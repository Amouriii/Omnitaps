/**
 * Enterprise dashboard demo — Omnitaps design system.
 */

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { DynamicMenu } from "../components/menu/DynamicMenu";
import { MenuEditor } from "../components/menu/MenuEditor";
import { ModuleGuard } from "../components/auth/ModuleGuard";
import { fetchMenuItems } from "../services/menuService";
import {
  getSupabaseClient,
  isEnterpriseSupabaseConfigured,
} from "../services/supabaseClient";
import type { EnterpriseModule, Profile, UserRole } from "../types";

type ConsoleTab = "overview" | "menu" | "modules";

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
    role: role as UserRole,
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

function assertModule(row: unknown): EnterpriseModule {
  if (row === null || typeof row !== "object") {
    throw new Error("Invalid module payload.");
  }
  const value = row as Record<string, unknown>;
  return {
    id: String(value.id),
    enterprise_id: String(value.enterprise_id),
    module_key: String(value.module_key),
    is_enabled: Boolean(value.is_enabled),
    settings: (value.settings ?? {}) as Record<string, unknown>,
    updated_at: String(value.updated_at),
  };
}

function Shell({ children }: { children: ReactNode }) {
  return <main className="min-h-screen bg-porcelain text-ink font-body">{children}</main>;
}

function LogoMark({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="13" cy="27" r="4.5" fill="#3A36E0" />
      <path
        d="M19.5 27C19.5 20.6487 24.6487 15.5 31 15.5"
        stroke="#3A36E0"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M19.5 33.5C19.5 23.2827 27.7827 15 38 15"
        stroke="#FF8A34"
        strokeWidth="3.2"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}

export default function EnterpriseConsole() {
  const configured = isEnterpriseSupabaseConfigured();
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [modules, setModules] = useState<EnterpriseModule[]>([]);
  const [menuCount, setMenuCount] = useState(0);
  const [tab, setTab] = useState<ConsoleTab>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!configured) {
        setLoading(false);
        return;
      }

      try {
        const supabase = getSupabaseClient();
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (cancelled) return;

        const session = sessionData.session;
        if (!session?.user?.id) {
          setEmail(null);
          setProfile(null);
          setModules([]);
          setMenuCount(0);
          setError(null);
          setLoading(false);
          return;
        }

        setEmail(session.user.email ?? null);

        const { data: profileRow, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();

        if (cancelled) return;
        if (profileError) throw profileError;

        const nextProfile = profileRow ? assertProfile(profileRow) : null;
        setProfile(nextProfile);

        if (nextProfile) {
          const [{ data: moduleRows, error: moduleError }, menuItems] =
            await Promise.all([
              supabase
                .from("enterprise_modules")
                .select("*")
                .eq("enterprise_id", nextProfile.enterprise_id)
                .order("module_key"),
              fetchMenuItems(nextProfile.enterprise_id),
            ]);

          if (cancelled) return;
          if (moduleError) throw moduleError;

          setModules((moduleRows ?? []).map(assertModule));
          setMenuCount(menuItems.length);
        }

        setError(null);
      } catch (err) {
        if (cancelled) return;
        setProfile(null);
        setError(err instanceof Error ? err.message : "Failed to load console.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [configured]);

  const enabledModules = useMemo(
    () => modules.filter((module) => module.is_enabled).length,
    [modules],
  );

  const signOut = async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    setEmail(null);
    setProfile(null);
    setModules([]);
    setMenuCount(0);
  };

  if (!configured) {
    return (
      <Shell>
        <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-tap">
            Dashboard demo
          </p>
          <h1 className="mt-2 font-display text-[28px] font-semibold tracking-[-0.02em]">
            Auth not configured
          </h1>
          <p className="mt-3 text-[15px] leading-[1.7] text-ink-muted">
            Set <code className="font-mono text-[13px]">VITE_SUPABASE_URL</code> and{" "}
            <code className="font-mono text-[13px]">VITE_SUPABASE_ANON_KEY</code>, then
            restart the dev server.
          </p>
        </div>
      </Shell>
    );
  }

  if (loading) {
    return (
      <Shell>
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8" role="status">
          <p className="text-ink-muted">Loading dashboard…</p>
        </div>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
          <div className="rounded-3xl border border-hairline bg-surface p-8" role="alert">
            <h1 className="font-display text-[24px] font-semibold">Dashboard unavailable</h1>
            <p className="mt-3 text-[15px] leading-[1.7] text-ink-muted">{error}</p>
          </div>
        </div>
      </Shell>
    );
  }

  if (!email || !profile) {
    return (
      <Shell>
        <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
          <div className="rounded-3xl border border-hairline bg-surface p-8">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-tap">
              Dashboard demo
            </p>
            <h1 className="mt-2 font-display text-[28px] font-semibold tracking-[-0.02em]">
              Sign in required
            </h1>
            <p className="mt-3 text-[15px] leading-[1.7] text-ink-muted">
              Sign in with a user that has a <code className="font-mono text-[13px]">public.profiles</code>{" "}
              row, then return here.
            </p>
            <Link
              to="/login"
              className="btn-primary mt-6 inline-flex rounded-xl px-5 py-2.5 text-[14px] font-semibold"
            >
              Go to login
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  const tabs: Array<{ id: ConsoleTab; label: string }> = [
    { id: "overview", label: "Overview" },
    { id: "menu", label: "Menu" },
    { id: "modules", label: "Modules" },
  ];

  return (
    <Shell>
      <header className="border-b border-hairline bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <div className="flex items-center gap-3">
            <LogoMark />
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-tap">
                Enterprise demo
              </p>
              <h1 className="font-display text-[22px] font-semibold tracking-[-0.02em] sm:text-[24px]">
                {profile.first_name ? `${profile.first_name}'s dashboard` : "Dashboard"}
              </h1>
              <p className="mt-0.5 text-[13px] text-ink-muted">
                {profile.role.replaceAll("_", " ")} · {email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/s/demo" className="nav-link text-[14px]">
              Website demo
            </Link>
            <Link to="/" className="nav-link text-[14px]">
              Site
            </Link>
            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded-xl border border-hairline bg-porcelain px-3 py-2 text-[13px] font-medium hover:border-hairline-strong"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-wrap gap-2">
          {tabs.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={
                  active
                    ? "rounded-xl bg-tap px-4 py-2 text-[13px] font-semibold text-white"
                    : "rounded-xl border border-hairline bg-surface px-4 py-2 text-[13px] font-medium text-ink-muted hover:border-hairline-strong hover:text-ink"
                }
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <ModuleGuard
          moduleKey="nav_console"
          enterpriseId={profile.enterprise_id}
          fallback={
            <div className="mt-8 rounded-3xl border border-hairline bg-surface p-8" role="status">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-brass">
                Module disabled
              </p>
              <h2 className="mt-2 font-display text-[22px] font-semibold">Nav console off</h2>
              <p className="mt-2 text-[15px] leading-[1.7] text-ink-muted">
                Enable <strong>nav_console</strong> for this enterprise to use the dashboard demo.
              </p>
            </div>
          }
        >
          <div className="mt-8 grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
            <aside className="rounded-3xl border border-hairline bg-surface p-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">
                Navigation
              </p>
              <div className="mt-4">
                <DynamicMenu enterpriseId={profile.enterprise_id} role={profile.role} />
              </div>
              <div className="mt-6 grid gap-2 border-t border-hairline pt-5">
                <button
                  type="button"
                  onClick={() => setTab("overview")}
                  className="rounded-xl px-3 py-2 text-left text-[13px] font-medium text-ink-muted hover:bg-porcelain hover:text-ink"
                >
                  Open overview
                </button>
                <button
                  type="button"
                  onClick={() => setTab("menu")}
                  className="rounded-xl px-3 py-2 text-left text-[13px] font-medium text-ink-muted hover:bg-porcelain hover:text-ink"
                >
                  Open menu editor
                </button>
                <button
                  type="button"
                  onClick={() => setTab("modules")}
                  className="rounded-xl px-3 py-2 text-left text-[13px] font-medium text-ink-muted hover:bg-porcelain hover:text-ink"
                >
                  Open modules
                </button>
              </div>
            </aside>

            <section className="min-w-0">
              {tab === "overview" && (
                <div className="grid gap-6">
                  <div className="grid gap-4 sm:grid-cols-3">
                    {[
                      { label: "Menu items", value: String(menuCount) },
                      {
                        label: "Modules enabled",
                        value: `${enabledModules}/${modules.length}`,
                      },
                      {
                        label: "Role",
                        value: profile.role.replaceAll("_", " "),
                      },
                    ].map((card) => (
                      <div
                        key={card.label}
                        className="rounded-3xl border border-hairline bg-surface p-5"
                      >
                        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">
                          {card.label}
                        </p>
                        <p className="mt-3 font-display text-[28px] font-semibold tracking-[-0.02em] capitalize sm:text-[32px]">
                          {card.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="relative overflow-hidden rounded-3xl border border-hairline bg-surface p-6 sm:p-8">
                    <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-tap/10 blur-2xl" />
                    <div className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-brass/15 blur-2xl" />
                    <div className="relative">
                      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-tap">
                        Enterprise
                      </p>
                      <h2 className="mt-2 font-display text-[22px] font-semibold tracking-[-0.02em]">
                        One tap to operate the stack
                      </h2>
                      <p className="mt-3 max-w-2xl text-[15px] leading-[1.7] text-ink-muted">
                        Edit realtime navigation in Menu, and confirm feature gates in Modules —
                        including disabled modules like Wi‑Fi.
                      </p>
                      <p className="mt-4 font-mono text-[12px] text-ink-faint">
                        id · {profile.enterprise_id}
                      </p>
                      <div className="mt-6 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => setTab("menu")}
                          className="btn-primary rounded-xl px-5 py-2.5 text-[14px] font-semibold"
                        >
                          Edit menu
                        </button>
                        <button
                          type="button"
                          onClick={() => setTab("modules")}
                          className="rounded-xl border border-hairline bg-porcelain px-5 py-2.5 text-[14px] font-semibold hover:border-hairline-strong"
                        >
                          Review modules
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {tab === "menu" && (
                <div className="rounded-3xl border border-hairline bg-surface p-6 sm:p-8">
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">
                    Realtime
                  </p>
                  <h2 className="mt-2 font-display text-[22px] font-semibold tracking-[-0.02em]">
                    Menu editor
                  </h2>
                  <p className="mt-2 text-[14px] text-ink-muted">
                    Changes propagate live to every open console for this enterprise.
                  </p>
                  <div className="mt-6">
                    <MenuEditor enterpriseId={profile.enterprise_id} role={profile.role} />
                  </div>
                </div>
              )}

              {tab === "modules" && (
                <div className="grid gap-6">
                  <div className="rounded-3xl border border-hairline bg-surface p-6 sm:p-8">
                    <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">
                      Feature gates
                    </p>
                    <h2 className="mt-2 font-display text-[22px] font-semibold tracking-[-0.02em]">
                      Module status
                    </h2>
                    <ul className="mt-6 divide-y divide-hairline">
                      {modules.map((module) => (
                        <li
                          key={module.id}
                          className="flex flex-wrap items-center justify-between gap-3 py-4"
                        >
                          <div>
                            <p className="font-medium">{module.module_key}</p>
                            <p className="mt-1 font-mono text-[12px] text-ink-faint">
                              updated {new Date(module.updated_at).toLocaleString()}
                            </p>
                          </div>
                          <span
                            className={
                              module.is_enabled
                                ? "rounded-full bg-tap-soft px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-tap"
                                : "rounded-full bg-brass-soft px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-brass-dark"
                            }
                          >
                            {module.is_enabled ? "enabled" : "disabled"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-3xl border border-hairline bg-surface p-6 sm:p-8">
                    <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">
                      Guard check
                    </p>
                    <h2 className="mt-2 font-display text-[22px] font-semibold tracking-[-0.02em]">
                      Wi‑Fi module
                    </h2>
                    <div className="mt-5">
                      <ModuleGuard
                        moduleKey="wifi"
                        enterpriseId={profile.enterprise_id}
                        fallback={
                          <div
                            className="rounded-2xl border border-brass/20 bg-brass-soft/60 p-5"
                            role="status"
                          >
                            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-brass-dark">
                              Module disabled
                            </p>
                            <p className="mt-2 text-[15px] leading-[1.7] text-ink">
                              The <strong>wifi</strong> module is not enabled for this enterprise
                              (expected from seed data).
                            </p>
                          </div>
                        }
                      >
                        <p className="text-[15px] text-ink-muted">
                          Wi‑Fi module content would render here when enabled.
                        </p>
                      </ModuleGuard>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        </ModuleGuard>
      </div>
    </Shell>
  );
}
