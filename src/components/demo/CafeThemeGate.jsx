import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import DemoChrome from "./DemoChrome";

export function isDemoCafePath(pathname) {
  const path = String(pathname || "").replace(/\/$/, "") || "/";
  if (path === "/demo") return true;
  if (path === "/menu/demo" || path === "/menu-prisma/demo") return true;
  if (path === "/s/demo") return true;
  if (path.startsWith("/r/demo/")) return true;
  return false;
}

export default function CafeThemeGate({ children }) {
  const { pathname } = useLocation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isDemoCafePath(pathname)) {
    return children;
  }

  return (
    <>
      {mounted ? createPortal(<DemoChrome />, document.body) : null}
      <div className="demo-cafe-theme min-h-screen pt-[var(--demo-chrome-h,3.5rem)]">
        {children}
      </div>
    </>
  );
}
