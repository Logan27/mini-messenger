import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./components/ThemeProvider";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminRoute } from "./components/AdminRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import OfflineBanner from "./components/OfflineBanner";
import NotificationManager from "./components/NotificationManager";
import { PageLoadingFallback } from "./components/LoadingFallback";
import { registerRoutePreload } from "./utils/routePreload";

// Critical routes - loaded immediately for initial render
import Login from "./pages/Login";
import Register from "./pages/Register";

// Lazy-loaded routes - split into separate chunks with preload support
const indexPreload = () => import("./pages/Index");
const Index = lazy(indexPreload);
registerRoutePreload("index", indexPreload);

const settingsPreload = () => import("./pages/Settings");
const Settings = lazy(settingsPreload);
registerRoutePreload("settings", settingsPreload);

const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const CallHistory = lazy(() => import("./pages/CallHistory"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Admin routes - heavy components, only loaded for admin users
const adminDashboardPreload = () => import("./pages/admin/Dashboard");
const AdminDashboard = lazy(adminDashboardPreload);
registerRoutePreload("adminDashboard", adminDashboardPreload);

const pendingUsersPreload = () => import("./pages/admin/PendingUsers");
const PendingUsers = lazy(pendingUsersPreload);
registerRoutePreload("pendingUsers", pendingUsersPreload);

const adminUsersPreload = () => import("./pages/admin/Users");
const AdminUsers = lazy(adminUsersPreload);
registerRoutePreload("adminUsers", adminUsersPreload);

const AuditLogs = lazy(() => import("./pages/admin/AuditLogs"));
const AdminSettings = lazy(() => import("./pages/admin/Settings"));

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="messenger-ui-theme">
        <TooltipProvider>
          <OfflineBanner />
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <NotificationManager />
              <Suspense fallback={<PageLoadingFallback />}>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password/:token" element={<ResetPassword />} />
                  <Route path="/verify-email/:token" element={<VerifyEmail />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/terms" element={<TermsOfService />} />
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <Index />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/chat/:chatId"
                    element={
                      <ProtectedRoute>
                        <Index />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <ProtectedRoute>
                        <Settings />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/calls"
                    element={
                      <ProtectedRoute>
                        <CallHistory />
                      </ProtectedRoute>
                    }
                  />
                  {/* Admin Routes */}
                  <Route element={<AdminRoute />}>
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/admin/pending-users" element={<PendingUsers />} />
                    <Route path="/admin/users" element={<AdminUsers />} />
                    <Route path="/admin/audit-logs" element={<AuditLogs />} />
                    <Route path="/admin/settings" element={<AdminSettings />} />
                  </Route>
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
