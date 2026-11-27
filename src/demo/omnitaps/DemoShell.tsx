import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import DemoBar from "./DemoBar";
import CustomerPov from "./customer/CustomerPov";
import EnterprisePov from "./enterprise/EnterprisePov";
import { DemoProvider } from "./store";
import "./omnitapsDemo.css";

function DemoLayout() {
  const location = useLocation();
  const isOps = location.pathname.startsWith("/demo/omnitaps/operations");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [isOps]);

  return (
    <div className="min-h-screen bg-porcelain text-ink">
      <DemoBar />
      {isOps ? <EnterprisePov /> : <CustomerPov />}
      <Toaster
        position="top-center"
        richColors
        closeButton
        toastOptions={{ style: { fontFamily: "Instrument Sans, ui-sans-serif, sans-serif" } }}
      />
    </div>
  );
}

export default function DemoShell() {
  return (
    <DemoProvider>
      <DemoLayout />
    </DemoProvider>
  );
}
