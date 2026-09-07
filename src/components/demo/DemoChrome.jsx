import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
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
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

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

  const closeMenu = () => setMenuOpen(false);

  return (
    <header ref={headerRef} className={`demo-chrome-bar demo-cafe-chat ${scrolled ? "is-scrolled" : ""}`.trim()}>
      <div className="demo-chrome-inner mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <p className="shrink-0 text-[13px] text-ink-muted">
          You’re at <span className="font-display font-semibold text-ink">Demo Café</span>
          <span className="text-ink-faint"> · Harbor Lane</span>
        </p>
        <div className="demo-chrome-actions">
          <nav id="demo-cafe-nav" aria-label="Demo Café experiences" className={`demo-chrome-nav ${menuOpen ? "is-open" : ""}`.trim()}>
          {DEMO_LINKS.map((link) => {
            const active = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                aria-current={active ? "page" : undefined}
                onClick={closeMenu}
                className={`demo-chrome-link ${active ? "is-active font-semibold text-tap" : "text-ink-muted hover:text-ink"}`}
              >
                {link.label}
              </Link>
            );
          })}
          <span className="text-hairline-strong" aria-hidden="true">
            ·
          </span>
          <Link to="/demo" onClick={closeMenu} className="font-medium text-tap hover:text-ink">
            All demos
          </Link>
          </nav>
          <button
            type="button"
            className="demo-chrome-menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="demo-cafe-nav"
            aria-label={menuOpen ? "Close café navigation" : "Open café navigation"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X aria-hidden="true" className="h-4 w-4" /> : <Menu aria-hidden="true" className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}
