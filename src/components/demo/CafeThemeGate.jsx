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
  if (!isDemoCafePath(pathname)) {
    return children;
  }

  return (
    <div className="demo-cafe-theme min-h-screen">
      <DemoChrome />
      {children}
    </div>
  );
}
