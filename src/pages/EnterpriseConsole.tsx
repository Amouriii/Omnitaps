/**
 * Enterprise dashboard demo — Omnitaps design system.
 */

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import ConsoleChrome, {
  ConsoleSkeleton,
  ConsoleStatusCard,
} from "../components/console/ConsoleChrome";
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

const MODULE_LABELS: Record<string, string> = {
  nav_console: "Dashboard",
  wifi: "Wi‑Fi",
};

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super admin",
  enterprise_admin: "Admin",
  standard_user: "Team",
};

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

function moduleLabel(key: string): string {
  return MODULE_LABELS[key] ?? key.replaceAll("_", " ");
}

function roleLabel(role: UserRole): string {
  return ROLE_LABELS[role] ?? role.replaceAll("_", " ");
}

function SignOutButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-hairline bg-surface px-3 py-2 text-[13px] font-medium hover:border-hairline-strong"
    >
      Sign out
    </button>
  );
}

function Frame({
  title,
  subtitle,
  children,
  actions = null,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <ConsoleChrome
      eyebrow="Dashboard"
      title={title}
      subtitle={subtitle}
      active="dashboard"
      actions={actions}
    >
      {children}
    </ConsoleChrome>
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
      <Frame>
        <ConsoleStatusCard eyebrow="Setup" title="Sign-in is not configured" role="alert">
          <p>
            Add <code className="font-mono text-[13px] text-ink">VITE_SUPABASE_URL</code> and{" "}
            <code className="font-mono text-[13px] text-ink">VITE_SUPABASE_ANON_KEY</code>, then
            restart the app.
          </p>
        </ConsoleStatusCard>
      </Frame>
    );
  }

  if (loading) {
    return (
      <Frame title="Dashboard" subtitle="Loading your location…">
        <ConsoleSkeleton />
      </Frame>
    );
  }

  if (error) {
    return (
      <Frame>
        <ConsoleStatusCard eyebrow="Error" title="Couldn’t load the dashboard" role="alert">
          <p>{error}</p>
        </ConsoleStatusCard>
      </Frame>
    );
  }

  if (!email || !profile) {
    return (
      <Frame>
        <ConsoleStatusCard
          eyebrow="Sign in"
          title="Sign in to open the dashboard"
          actions={
            <Link
              to="/login"
              state={{ from: "/demo/dashboard" }}
              className="btn-primary inline-flex rounded-xl px-5 py-2.5 text-[14px] font-semibold"
            >
              Go to login
            </Link>
          }
        >
          <p>
            Use an operator account to edit live navigation, review feature switches, and jump
            into Demo Café guest pages.
          </p>
        </ConsoleStatusCard>
      </Frame>
    );
  }

  const tabs: Array<{ id: ConsoleTab; label: string }> = [
    { id: "overview", label: "Overview" },
    { id: "menu", label: "Menu" },
    { id: "modules", label: "Modules" },
  ];

  const greeting = profile.first_name
    ? `${profile.first_name}’s dashboard`
    : "Dashboard";

  return (
    <Frame
      title={greeting}
      subtitle={`${roleLabel(profile.role)} · ${email}`}
      actions={<SignOutButton onClick={() => void signOut()} />}
    >
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
          <div className="mt-8" role="status">
            <ConsoleStatusCard eyebrow="Unavailable" title="This dashboard isn’t turned on">
              <p>
                An admin needs to enable the dashboard for this location before overview, menu
                editing, and modules can load.
              </p>
            </ConsoleStatusCard>
          </div>
        }
      >
        <div className="mt-8 grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="rounded-3xl border border-hairline bg-surface p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">
              Shortcuts
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
                Overview
              </button>
              <button
                type="button"
                onClick={() => setTab("menu")}
                className="rounded-xl px-3 py-2 text-left text-[13px] font-medium text-ink-muted hover:bg-porcelain hover:text-ink"
              >
                Menu editor
              </button>
              <button
                type="button"
                onClick={() => setTab("modules")}
                className="rounded-xl px-3 py-2 text-left text-[13px] font-medium text-ink-muted hover:bg-porcelain hover:text-ink"
              >
                Modules
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
                      label: "Modules on",
                      value: `${enabledModules}/${modules.length}`,
                    },
                    {
                      label: "Role",
                      value: roleLabel(profile.role),
                    },
                  ].map((card) => (
                    <div
                      key={card.label}
                      className="rounded-3xl border border-hairline bg-surface p-5"
                    >
                      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">
                        {card.label}
                      </p>
                      <p className="mt-3 font-display text-[28px] font-semibold tracking-[-0.02em] sm:text-[32px]">
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
                      Location
                    </p>
                    <h2 className="mt-2 font-display text-[22px] font-semibold tracking-[-0.02em]">
                      Operate the stack from one place
                    </h2>
                    <p className="mt-3 max-w-2xl text-[15px] leading-[1.7] text-ink-muted">
                      Edit live navigation in Menu, confirm which features are on in Modules, then
                      walk the guest path on Demo Café.
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
                      <Link
                        to="/demo"
                        className="rounded-xl border border-hairline bg-porcelain px-5 py-2.5 text-[14px] font-semibold hover:border-hairline-strong"
                      >
                        Open Demo Café
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === "menu" && (
              <div className="rounded-3xl border border-hairline bg-surface p-6 sm:p-8">
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">
                  Live
                </p>
                <h2 className="mt-2 font-display text-[22px] font-semibold tracking-[-0.02em]">
                  Menu editor
                </h2>
                <p className="mt-2 text-[14px] text-ink-muted">
                  Changes show up immediately on every open dashboard for this location.
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
                    Features
                  </p>
                  <h2 className="mt-2 font-display text-[22px] font-semibold tracking-[-0.02em]">
                    What’s on
                  </h2>
                  {modules.length === 0 ? (
                    <p className="mt-6 rounded-2xl bg-porcelain px-4 py-3 text-[14px] text-ink-muted">
                      No modules are configured for this location yet.
                    </p>
                  ) : (
                    <ul className="mt-6 divide-y divide-hairline">
                      {modules.map((module) => (
                        <li
                          key={module.id}
                          className="flex flex-wrap items-center justify-between gap-3 py-4"
                        >
                          <div>
                            <p className="font-medium">{moduleLabel(module.module_key)}</p>
                            <p className="mt-1 font-mono text-[12px] text-ink-faint">
                              Updated {new Date(module.updated_at).toLocaleString()}
                            </p>
                          </div>
                          <span
                            className={
                              module.is_enabled
                                ? "rounded-full bg-tap-soft px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-tap"
                                : "rounded-full bg-brass-soft px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-brass-dark"
                            }
                          >
                            {module.is_enabled ? "On" : "Off"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-3xl border border-hairline bg-surface p-6 sm:p-8">
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">
                    Wi‑Fi
                  </p>
                  <h2 className="mt-2 font-display text-[22px] font-semibold tracking-[-0.02em]">
                    Captive portal
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
                            Off
                          </p>
                          <p className="mt-2 text-[15px] leading-[1.7] text-ink">
                            Wi‑Fi isn’t enabled for this location, so telemetry and plans stay
                            hidden.
                          </p>
                        </div>
                      }
                    >
                      <p className="text-[15px] leading-[1.7] text-ink-muted">
                        Wi‑Fi is on. Open telemetry, settings, and plans without leaving the
                        operator console.
                      </p>
                      <Link
                        to="/enterprise/wifi"
                        className="btn-primary mt-5 inline-flex rounded-xl px-5 py-2.5 text-[14px] font-semibold"
                      >
                        Open Wi‑Fi
                      </Link>
                    </ModuleGuard>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </ModuleGuard>
    </Frame>
  );
}
