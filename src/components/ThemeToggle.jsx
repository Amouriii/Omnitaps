import { useEffect, useState } from "react";

const STORAGE_KEY = "omnitaps-theme";

export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => {
    if (typeof document === "undefined") return "light";
    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // index.html applies the stored/OS preference before React paints.
    const initial = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    setTheme(initial);
  }, []);

  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.setAttribute("data-theme", next);
  };

  if (!mounted) return null;

  return (
    <button
      type="button"
      className="theme-toggle inline-flex items-center justify-center w-9 h-9 rounded-full border border-hairline-strong bg-surface/80 backdrop-blur transition-colors hover:bg-surface hover:border-tap focus-visible:outline-2 focus-visible:outline-tap focus-visible:outline-offset-2"
      onClick={toggle}
      aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
      title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
    >
      {theme === "light" ? (
        // Moon icon — switch to dark
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      ) : (
        // Sun icon — switch to light
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      )}
    </button>
  );
}
