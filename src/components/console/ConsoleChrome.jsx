import { Link } from "react-router-dom";

export function LogoMark({ className = "h-7 w-7" }) {
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

export function BrandLink({ to = "/" }) {
  return (
    <Link to={to} className="flex shrink-0 items-center gap-2.5" aria-label="Omnitaps home">
      <LogoMark />
      <span className="font-display text-[19px] font-semibold tracking-tight text-ink">Omnitaps</span>
    </Link>
  );
}

const OPERATOR_NAV = [
  { id: "site", label: "Site", to: "/" },
  { id: "demo", label: "Demo Café", to: "/demo" },
  { id: "website", label: "Website", to: "/s/demo" },
  { id: "dashboard", label: "Dashboard", to: "/demo/dashboard" },
  { id: "admin", label: "Admin", to: "/admin" },
];

const AUTH_NAV = [
  { id: "site", label: "Site", to: "/" },
  { id: "demo", label: "Demo Café", to: "/demo" },
  { id: "website", label: "Website", to: "/s/demo" },
];

/**
 * @param {object} props
 * @param {string} [props.eyebrow]
 * @param {string} [props.title]
 * @param {import('react').ReactNode} [props.children]
 * @param {string} [props.role]
 * @param {import('react').ReactNode} [props.actions]
 */
export function ConsoleStatusCard({
  eyebrow,
  title,
  children,
  role = "status",
  actions = null,
}) {
  return (
    <div
      className="rounded-3xl border border-hairline bg-surface p-8 shadow-[0_28px_60px_-42px_rgba(18,21,26,0.38)]"
      role={role}
    >
      {eyebrow ? (
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-tap">{eyebrow}</p>
      ) : null}
      <h1 className="mt-2 font-display text-[24px] font-semibold tracking-[-0.02em] sm:text-[28px]">
        {title}
      </h1>
      <div className="mt-3 text-[15px] leading-[1.7] text-ink-muted">{children}</div>
      {actions ? <div className="mt-6 flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}

export function ConsoleSkeleton({ cards = 3 }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3" role="status" aria-label="Loading">
      {Array.from({ length: cards }, (_, index) => (
        <div
          key={index}
          className="h-28 animate-pulse rounded-3xl border border-hairline bg-surface"
        />
      ))}
    </div>
  );
}

/**
 * @param {object} props
 * @param {string} [props.eyebrow]
 * @param {string} [props.title]
 * @param {string} [props.subtitle]
 * @param {string} [props.active]
 * @param {string} [props.variant]
 * @param {import('react').ReactNode} [props.actions]
 * @param {import('react').ReactNode} [props.children]
 */
export default function ConsoleChrome({
  eyebrow,
  title,
  subtitle,
  active,
  variant = "operator",
  actions = null,
  children,
}) {
  const links = variant === "auth" ? AUTH_NAV : OPERATOR_NAV;

  return (
    <main className="min-h-screen bg-porcelain text-ink font-body">
      <header className="sticky top-0 z-30 border-b border-hairline bg-porcelain/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-4 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <BrandLink />
            {eyebrow ? (
              <>
                <span className="hidden h-5 w-px bg-hairline sm:block" aria-hidden="true" />
                <p className="hidden font-mono text-[11px] uppercase tracking-[0.18em] text-tap sm:block">
                  {eyebrow}
                </p>
              </>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <nav aria-label="Product" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
              {links.map((link) => {
                const isActive = link.id === active;
                return (
                  <Link
                    key={link.id}
                    to={link.to}
                    className={
                      isActive
                        ? "font-semibold text-tap"
                        : "text-ink-muted hover:text-ink"
                    }
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
            {actions}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        {(title || subtitle) && (
          <div className="mb-8">
            {eyebrow ? (
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-tap sm:hidden">
                {eyebrow}
              </p>
            ) : null}
            {title ? (
              <h1 className="font-display text-[28px] font-semibold tracking-[-0.02em] sm:text-[32px]">
                {title}
              </h1>
            ) : null}
            {subtitle ? (
              <p className="mt-2 max-w-2xl text-[15px] leading-[1.7] text-ink-muted">{subtitle}</p>
            ) : null}
          </div>
        )}
        {children}
      </div>
    </main>
  );
}
