import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import RequireAuth from "./components/RequireAuth";
import CafeThemeGate from "./components/demo/CafeThemeGate";
import { AuthProvider } from "./lib/auth";
import "./App.css";

const ItemDetail = lazy(() => import("./pages/ItemDetail"));
const Changelog = lazy(() => import("./pages/Changelog"));
const ReviewGate = lazy(() => import("./pages/ReviewGate"));
const MenuPublic = lazy(() => import("./pages/MenuPublic"));
const CustomerMenuPage = lazy(() => import("./pages/CustomerMenuPage"));
const WifiAccess = lazy(() => import("./pages/WifiAccess"));
const WebsitePreview = lazy(() => import("./pages/WebsitePreview"));
const Login = lazy(() => import("./pages/Login"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminMenuPage = lazy(() => import("./pages/AdminMenuPage"));
const EnterpriseConsole = lazy(() => import("./pages/EnterpriseConsole"));
const WifiGuestLanding = lazy(() => import("./pages/WifiGuestLanding"));
const WifiGuestSession = lazy(() => import("./pages/WifiGuestSession"));
const WifiGuestCheckout = lazy(() => import("./pages/WifiGuestCheckout"));
const EnterpriseWifiDashboard = lazy(() => import("./pages/EnterpriseWifiDashboard"));
const EnterpriseWifiSettings = lazy(() => import("./pages/EnterpriseWifiSettings"));
const EnterpriseWifiPlans = lazy(() => import("./pages/EnterpriseWifiPlans"));
const WifiModuleGate = lazy(() => import("./components/WifiModuleGate"));
const DemoHub = lazy(() => import("./pages/DemoHub"));

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-porcelain text-ink-muted" role="status">
      Loading…
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <CafeThemeGate>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/items/:id" element={<ItemDetail />} />
            <Route path="/changelog" element={<Changelog />} />
            <Route path="/r/:tenantId/review" element={<ReviewGate />} />
            <Route path="/r/:tenantId/wifi" element={<WifiAccess />} />
            <Route path="/menu/:restaurantId" element={<CustomerMenuPage />} />
            <Route path="/menu-prisma/:tenantId" element={<MenuPublic />} />
            <Route path="/demo" element={<DemoHub />} />
            <Route path="/s/:tenantId" element={<WebsitePreview />} />
            <Route path="/login" element={<Login />} />
            {/* Captive portal (public guest) */}
            <Route path="/wifi-guest" element={<WifiGuestLanding />} />
            <Route path="/wifi-guest/session" element={<WifiGuestSession />} />
            <Route path="/wifi-guest/checkout" element={<WifiGuestCheckout />} />
            {/* Enterprise dashboard demo */}
            <Route path="/demo/dashboard" element={<EnterpriseConsole />} />
            <Route path="/enterprise" element={<Navigate to="/demo/dashboard" replace />} />
            <Route
              path="/enterprise/wifi"
              element={
                <WifiModuleGate>
                  <EnterpriseWifiDashboard />
                </WifiModuleGate>
              }
            />
            <Route
              path="/enterprise/wifi/settings"
              element={
                <WifiModuleGate>
                  <EnterpriseWifiSettings />
                </WifiModuleGate>
              }
            />
            <Route
              path="/enterprise/wifi/plans"
              element={
                <WifiModuleGate>
                  <EnterpriseWifiPlans />
                </WifiModuleGate>
              }
            />
            <Route
              path="/admin"
              element={
                <RequireAuth>
                  <AdminDashboard />
                </RequireAuth>
              }
            />
            <Route path="/admin/menu" element={<AdminMenuPage />} />
            <Route path="/admin/menu/:restaurantId" element={<AdminMenuPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </CafeThemeGate>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
