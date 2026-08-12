import { Link, useLocation } from "react-router-dom";

export const DEMO_SLUG = "demo";

export const DEMO_LINKS = [
  { label: "Menu", to: "/menu/demo" },
  { label: "Reviews", to: "/r/demo/review" },
  { label: "Wi‑Fi", to: "/r/demo/wifi" },
  { label: "Website", to: "/s/demo" },
];

export function isDemoSlug(value) {
  return String(value || "").trim().toLowerCase() === DEMO_SLUG;
}

export default function DemoChrome({ slug }) {
  const location = useLocation();
  if (!isDemoSlug(slug)) return null;

  return (
    <div className="sticky top-0 z-30 border-b border-hairline bg-porcelain/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="text-[13px] text-ink-muted">
          You’re viewing <span className="font-semibold text-ink">Demo Café</span>
        </p>
        <nav aria-label="Demo Café experiences" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
          {DEMO_LINKS.map((link) => {
            const active = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={
                  active
                    ? "font-semibold text-tap"
                    : "text-ink-muted hover:text-ink"
                }
              >
                {link.label}
              </Link>
            );
          })}
          <span className="text-hairline-strong" aria-hidden="true">
            ·
          </span>
          <Link to="/demo" className="font-medium text-tap hover:text-ink">
            All demos
          </Link>
        </nav>
      </div>
    </div>
  );
}
