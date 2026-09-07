import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
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
 * Operator section nav, shared by every ConsoleChrome page. The active link is
 * derived from the current location, so pages no longer pass an `active` prop.
 */
const OPERATOR_NAV = [
  { label: "Site", to: "/", match: (path) => path === "/" },
  { label: "Demo Café", to: "/demo", match: (path) => path === "/demo" },
  { label: "Website", to: "/s/demo", match: (path) => path.startsWith("/s/") },
  {
    label: "Dashboard",
    to: "/demo/dashboard",
    match: (path) => path.startsWith("/demo/dashboard") || path.startsWith("/enterprise"),
  },
  {
    label: "Admin",
    to: "/admin",
    match: (path) => path.startsWith("/admin"),
  },
];

const FADE_PX = 28;

/**
 * Edge-fade mask for the swipeable mobile nav: fades the left edge while
 * scrolled right, the right edge while more content remains, and disables
 * entirely when nothing overflows (e.g. desktop widths, where the nav wraps).
 */
function navMaskStyle({ left, right }) {
  if (!left && !right) return undefined;
  const start = left ? "transparent 0, #000 " + FADE_PX + "px" : "#000 0";
  const end =
    right
      ? "#000 calc(100% - " + FADE_PX + "px), transparent 100%"
      : "#000 100%";
  const image = "linear-gradient(to right, " + start + ", " + end + ")";
  return { maskImage: image, WebkitMaskImage: image };
}

/**
 * Operator shell for the admin/enterprise surfaces — merged from the two
 * previous designs. It keeps the shared SiteHeader/SiteFooter so the pages
 * stay uniform with the rest of the site, and adds a slim operator strip
 * carrying the section nav (with active state) and page actions.
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
  const { pathname } = useLocation();
  const navRef = useRef(null);
  const [navOverflow, setNavOverflow] = useState({ left: false, right: false });

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return undefined;

    const update = () => {
      setNavOverflow({
        left: nav.scrollLeft > 1,
        right: nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 1,
      });
    };

    update();
    nav.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(nav);
    if (nav.firstElementChild) observer.observe(nav.firstElementChild);
    window.addEventListener("resize", update);
    return () => {
      nav.removeEventListener("scroll", update);
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-porcelain text-ink font-body">
      {/* Operator pages: the strip below already links the demo surfaces, so
          the header's "Try demos" would duplicate it. Book a Demo stays — it's
          the global conversion CTA. */}
      <SiteHeader showTryDemos={false} />

      {(eyebrow || actions) && (
        <div className="sticky top-[64px] z-20 border-b border-hairline bg-porcelain/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-5 py-2.5 sm:px-8 sm:py-3">
            {eyebrow ? (
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-tap">
                {eyebrow}
              </p>
            ) : (
              <span aria-hidden="true" />
            )}
            <div className="flex min-w-0 items-center gap-x-4 gap-y-1">
              <nav
                ref={navRef}
                aria-label="Product"
                style={navMaskStyle(navOverflow)}
                className="-mx-1 flex min-w-0 flex-1 items-center gap-x-3.5 overflow-x-auto px-1 py-1 text-[13px] [scrollbar-width:none] sm:max-w-none sm:flex-none sm:overflow-visible [&::-webkit-scrollbar]:hidden"
              >
                {OPERATOR_NAV.map((link) => {
                  const isActive = link.match(pathname);
                  return (
                    <Link
                      key={link.label}
                      to={link.to}
                      aria-current={isActive ? "page" : undefined}
                      className={`inline-flex shrink-0 items-center rounded-md py-2 ${
                        isActive
                          ? "font-semibold text-tap"
                          : "text-ink-muted hover:text-ink"
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
              {actions ? <div className="flex shrink-0 flex-wrap gap-3">{actions}</div> : null}
            </div>
          </div>
        </div>
      )}

      <main id="main" className="flex-1" tabIndex="-1">
        <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
          {(title || subtitle) && (
            <div className="mb-8">
              {title ? (
                <h1 className="font-display text-[28px] font-semibold tracking-[-0.02em] sm:text-[32px]">
                  {title}
                </h1>
              ) : null}
              {subtitle ? (
                <p className="mt-2 max-w-2xl text-[15px] leading-[1.7] text-ink-muted">
                  {subtitle}
                </p>
              ) : null}
            </div>
          )}
          {children}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
