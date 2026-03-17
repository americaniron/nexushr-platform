import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotifyProvider } from './context/NotifyContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ConsumerLayout } from './components/Layout';
import { CommandPalette } from './components/CommandPalette';

// Theme & i18n initialization (run before render)
import { themeManager } from './lib/theme';
import { i18n } from './lib/i18n';
import { pwaManager, registerServiceWorker } from './lib/pwa';

// Skeleton loading screens
import {
  DashboardSkeleton,
  WorkspaceSkeleton,
  SettingsSkeleton,
  CatalogSkeleton,
  GenericPageSkeleton,
  PageLoadingBar,
} from './lib/skeleton';

// ── Initialize systems before React renders ──
themeManager.init();
i18n.init();
pwaManager.init();
registerServiceWorker();

// ══════════════════════════════════════════════════════
// Lazy-loaded page components (route-based code splitting)
// ══════════════════════════════════════════════════════

// Public pages — eagerly loaded (small, needed for first paint)
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';

// Everything else — lazy loaded with appropriate skeletons
const CatalogPage = lazy(() => import('./pages/CatalogPage').then(m => ({ default: m.CatalogPage })));
const PricingPage = lazy(() => import('./pages/PricingPage').then(m => ({ default: m.PricingPage })));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage').then(m => ({ default: m.OnboardingPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const WorkspacePage = lazy(() => import('./pages/WorkspacePage').then(m => ({ default: m.WorkspacePage })));
const AdminPage = lazy(() => import('./pages/AdminPage').then(m => ({ default: m.AdminPage })));
const IntegrationsPage = lazy(() => import('./pages/IntegrationsPage').then(m => ({ default: m.IntegrationsPage })));
const AgentsPage = lazy(() => import('./pages/AgentsPage').then(m => ({ default: m.AgentsPage })));
const VoicePage = lazy(() => import('./pages/VoicePage').then(m => ({ default: m.VoicePage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const EmployeeHubPage = lazy(() => import('./pages/EmployeeHubPage').then(m => ({ default: m.EmployeeHubPage })));

import './index.css';

// ══════════════════════════════════════════════════════
// Route Guards
// ══════════════════════════════════════════════════════

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  if (!auth.isLoggedIn) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  if (!auth.isLoggedIn) return <Navigate to="/login" replace />;
  if (auth.status !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

// ══════════════════════════════════════════════════════
// App
// ══════════════════════════════════════════════════════

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NotifyProvider>
          <HashRouter>
            <CommandPalette />
            <Routes>
              {/* Public routes — eagerly loaded */}
              <Route path="/" element={<ConsumerLayout><HomePage /></ConsumerLayout>} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />

              {/* Public routes — lazy loaded */}
              <Route path="/catalog" element={
                <ConsumerLayout>
                  <Suspense fallback={<CatalogSkeleton />}>
                    <CatalogPage />
                  </Suspense>
                </ConsumerLayout>
              } />
              <Route path="/pricing" element={
                <ConsumerLayout>
                  <Suspense fallback={<GenericPageSkeleton />}>
                    <PricingPage />
                  </Suspense>
                </ConsumerLayout>
              } />

              {/* Protected routes — lazy loaded with skeletons */}
              <Route path="/onboarding" element={
                <ProtectedRoute>
                  <Suspense fallback={<GenericPageSkeleton />}>
                    <OnboardingPage />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <ConsumerLayout>
                    <Suspense fallback={<DashboardSkeleton />}>
                      <DashboardPage />
                    </Suspense>
                  </ConsumerLayout>
                </ProtectedRoute>
              } />
              <Route path="/workspace/:employeeId" element={
                <ProtectedRoute>
                  <ConsumerLayout>
                    <Suspense fallback={<WorkspaceSkeleton />}>
                      <WorkspacePage />
                    </Suspense>
                  </ConsumerLayout>
                </ProtectedRoute>
              } />
              <Route path="/integrations" element={
                <ProtectedRoute>
                  <ConsumerLayout>
                    <Suspense fallback={<GenericPageSkeleton />}>
                      <IntegrationsPage />
                    </Suspense>
                  </ConsumerLayout>
                </ProtectedRoute>
              } />
              <Route path="/agents" element={
                <ProtectedRoute>
                  <ConsumerLayout>
                    <Suspense fallback={<GenericPageSkeleton />}>
                      <AgentsPage />
                    </Suspense>
                  </ConsumerLayout>
                </ProtectedRoute>
              } />
              <Route path="/voice" element={
                <ProtectedRoute>
                  <ConsumerLayout>
                    <Suspense fallback={<GenericPageSkeleton />}>
                      <VoicePage />
                    </Suspense>
                  </ConsumerLayout>
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <ConsumerLayout>
                    <Suspense fallback={<SettingsSkeleton />}>
                      <SettingsPage />
                    </Suspense>
                  </ConsumerLayout>
                </ProtectedRoute>
              } />
              <Route path="/employee-hub" element={
                <ProtectedRoute>
                  <ConsumerLayout>
                    <Suspense fallback={<DashboardSkeleton />}>
                      <EmployeeHubPage />
                    </Suspense>
                  </ConsumerLayout>
                </ProtectedRoute>
              } />

              {/* Admin — lazy loaded */}
              <Route path="/admin" element={
                <AdminRoute>
                  <Suspense fallback={<GenericPageSkeleton />}>
                    <AdminPage />
                  </Suspense>
                </AdminRoute>
              } />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </HashRouter>
        </NotifyProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
