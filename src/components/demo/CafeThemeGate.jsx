import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import CafeIntro from "./CafeIntro";
import DemoChrome from "./DemoChrome";

export function isDemoCafePath(pathname) {
  const path = String(pathname || "").replace(/\/$/, "") || "/";

  if (path.startsWith("/enterprise")) return false;
  if (path === "/demo/dashboard") return false;

  if (path === "/demo") return true;
  if (path === "/menu/demo" || path === "/menu-prisma/demo") return true;
  if (path === "/s/demo") return true;
  if (path === "/demo/qr") return true;
  if (path.startsWith("/r/demo/")) return true;
  return false;
}

export function isDemoCafeWebsitePath(pathname) {
  const path = String(pathname || "").replace(/\/$/, "") || "/";
  return path === "/s/demo";
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
      {isDemoCafeWebsitePath(pathname) ? <CafeIntro tenantName="Demo Café" /> : null}
      <div className="demo-cafe-theme min-h-screen pt-[var(--demo-chrome-h,3.5rem)]">
        <div key={pathname} className="demo-cafe-route">
          {children}
        </div>
      </div>
    </>
  );
}
