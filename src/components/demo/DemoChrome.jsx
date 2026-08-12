import { useLayoutEffect, useRef } from "react";
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

export default function DemoChrome() {
  const location = useLocation();
  const headerRef = useRef(null);

  useLayoutEffect(() => {
    const node = headerRef.current;
    if (!node) return undefined;

    const sync = () => {
      document.documentElement.style.setProperty(
        "--demo-chrome-h",
        `${Math.ceil(node.getBoundingClientRect().height)}px`,
      );
    };

    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(node);
    window.addEventListener("resize", sync);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", sync);
      document.documentElement.style.removeProperty("--demo-chrome-h");
    };
  }, []);

  return (
    <header ref={headerRef} className="demo-chrome-bar demo-cafe-chat">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="text-[13px] text-ink-muted">
          You’re at <span className="font-display font-semibold text-ink">Demo Café</span>
          <span className="text-ink-faint"> · Harbor Lane</span>
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
    </header>
  );
}
