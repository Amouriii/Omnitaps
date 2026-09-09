import { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Navigate, Routes, Route, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import RequireAuth from "./components/RequireAuth";
import CafeThemeGate from "./components/demo/CafeThemeGate";
import { AuthProvider } from "./lib/auth";
import ErrorBoundary from "./components/ErrorBoundary";
import PageTransition from "./components/PageTransition";
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
const QrDemo = lazy(() => import("./pages/QrDemo"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const Careers = lazy(() => import("./pages/Careers"));

function ScrollManager() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense>
          <CafeThemeGate>
            <ScrollManager />
            <ErrorBoundary>
              <PageTransition>
              <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/items/:id" element={<ItemDetail />} />
            <Route path="/changelog" element={<Changelog />} />
            <Route path="/r/:tenantId/review" element={<ReviewGate />} />
            <Route path="/r/:tenantId/wifi" element={<WifiAccess />} />
            <Route path="/menu/:restaurantId" element={<CustomerMenuPage />} />
            <Route path="/menu-prisma/:tenantId" element={<MenuPublic />} />
            <Route path="/demo" element={<DemoHub />} />
            <Route path="/demo/qr" element={<QrDemo />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/careers" element={<Careers />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/admin"
              element={
                <RequireAuth>
                  <AdminDashboard />
                </RequireAuth>
              }
            />
            <Route path="/admin/menu/:restaurantId" element={<AdminMenuPage />} />
            <Route path="*" element={<NotFound />} />
              </Routes>
              </PageTransition>
            </ErrorBoundary>
          </CafeThemeGate>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
