import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { isDemoCafePath } from "./demo/CafeThemeGate";

/**
 * Keeps the tab favicon and browser-chrome color in sync with the active
 * surface: the indigo Omnitaps mark on product routes, the terracotta Demo
 * Café mark on guest café routes (same set as CafeThemeGate /
 * PageTransition via isDemoCafePath).
 *
 * Every icon slot from index.html is swapped (SVG + PNG fallbacks + ICO) so
 * browsers without SVG-favicon support still pick up the right mark. Each
 * variant has one fixed, versioned URL — no per-navigation cache-busting —
 * so browsers fetch a variant once and serve later swaps from memory.
 */
type Surface = {
  svg: string;
  png32: string;
  png16: string;
  ico: string;
  themeColor: string;
};

const BRAND: Surface = {
  svg: "/favicon.svg?v=3",
  png32: "/favicon-32.png?v=3",
  png16: "/favicon-16.png?v=3",
  ico: "/favicon.ico?v=3",
  themeColor: "#faf9f7", // --color-porcelain (product, light)
};

const BRAND_DARK: Surface = {
  svg: "/favicon.svg?v=3",
  png32: "/favicon-32.png?v=3",
  png16: "/favicon-16.png?v=3",
  ico: "/favicon.ico?v=3",
  themeColor: "#0f1115", // --color-porcelain (product, dark)
};

const CAFE: Surface = {
  svg: "/favicon-demo.svg?v=2",
  png32: "/favicon-demo-32.png?v=1",
  png16: "/favicon-demo-16.png?v=1",
  ico: "/favicon-demo.ico?v=1",
  themeColor: "#f3eadc", // --color-porcelain (café theme, demoCafe.css)
};

const ICON_SELECTORS: Array<[string, keyof Omit<Surface, "themeColor">]> = [
  ['link[rel="icon"][type="image/svg+xml"]', "svg"],
  ['link[rel="icon"][type="image/png"][sizes="32x32"]', "png32"],
  ['link[rel="icon"][type="image/png"][sizes="16x16"]', "png16"],
  ['link[rel="shortcut icon"]', "ico"],
];

function applySurface(surface: Surface) {
  for (const [selector, key] of ICON_SELECTORS) {
    const link = document.querySelector<HTMLLinkElement>(selector);
    const href = surface[key];
    if (link && link.getAttribute("href") !== href) {
      link.setAttribute("href", href);
    }
  }

  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta && meta.getAttribute("content") !== surface.themeColor) {
    meta.setAttribute("content", surface.themeColor);
  }
}

/**
 * Get the current theme (light/dark) from the document element.
 */
function getThemeMode(): "light" | "dark" {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

export default function FaviconManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Demo café routes always use the café surface regardless of theme
    if (isDemoCafePath(pathname)) {
      applySurface(CAFE);
      return;
    }

    // Product routes use BRAND (light) or BRAND_DARK depending on current theme
    applySurface(getThemeMode() === "dark" ? BRAND_DARK : BRAND);
  }, [pathname]);

  // Re-apply when theme changes (data-theme attribute on <html>)
  useEffect(() => {
    if (typeof document === "undefined") return;

    const observer = new MutationObserver(() => {
      if (isDemoCafePath(pathname)) return; // café routes keep their own theme color
      applySurface(getThemeMode() === "dark" ? BRAND_DARK : BRAND);
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
