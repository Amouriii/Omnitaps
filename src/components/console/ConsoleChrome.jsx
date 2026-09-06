import SiteFooter from "../SiteFooter";
import SiteHeader from "../SiteHeader";

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
 * Operator shell for the admin/enterprise surfaces. Uses the same shared
 * SiteHeader + SiteFooter as the rest of the site so every page carries
 * uniform chrome.
 *
 * @param {object} props
 * @param {string} [props.eyebrow]
 * @param {string} [props.title]
 * @param {string} [props.subtitle]
 * @param {import('react').ReactNode} [props.actions]
 * @param {import('react').ReactNode} [props.children]
 */
export default function ConsoleChrome({
  eyebrow,
  title,
  subtitle,
  actions = null,
  children,
}) {
  return (
    <div className="min-h-screen flex flex-col bg-porcelain text-ink font-body">
      <SiteHeader />

      <main id="main" className="flex-1" tabIndex="-1">
        <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
          {(title || subtitle || actions) && (
            <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
              <div>
                {eyebrow ? (
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-tap">
                    {eyebrow}
                  </p>
                ) : null}
                {title ? (
                  <h1 className="mt-2 font-display text-[28px] font-semibold tracking-[-0.02em] sm:text-[32px]">
                    {title}
                  </h1>
                ) : null}
                {subtitle ? (
                  <p className="mt-2 max-w-2xl text-[15px] leading-[1.7] text-ink-muted">
                    {subtitle}
                  </p>
                ) : null}
              </div>
              {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
            </div>
          )}
          {children}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
