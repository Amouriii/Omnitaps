import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import RequireAuth from "./components/RequireAuth";
import { AuthProvider } from "./lib/auth";
import "./App.css";

const ItemDetail = lazy(() => import("./pages/ItemDetail"));
const Changelog = lazy(() => import("./pages/Changelog"));
const ReviewGate = lazy(() => import("./pages/ReviewGate"));
const MenuPublic = lazy(() => import("./pages/MenuPublic"));
const WifiAccess = lazy(() => import("./pages/WifiAccess"));
const WebsitePreview = lazy(() => import("./pages/WebsitePreview"));
const Login = lazy(() => import("./pages/Login"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));

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
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/items/:id" element={<ItemDetail />} />
            <Route path="/changelog" element={<Changelog />} />
            <Route path="/r/:tenantId/review" element={<ReviewGate />} />
            <Route path="/r/:tenantId/wifi" element={<WifiAccess />} />
            <Route path="/menu/:tenantId" element={<MenuPublic />} />
            <Route path="/s/:tenantId" element={<WebsitePreview />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/admin"
              element={
                <RequireAuth>
                  <AdminDashboard />
                </RequireAuth>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
