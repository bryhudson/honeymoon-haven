import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { LoadingSpinner } from './components/ui/LoadingSpinner';

const Dashboard = lazy(() => import('./features/dashboard/pages/Dashboard').then(module => ({ default: module.Dashboard })));
const Login = lazy(() => import('./features/auth/pages/Login').then(module => ({ default: module.Login })));
const ForgotPassword = lazy(() => import('./features/auth/pages/ForgotPassword').then(module => ({ default: module.ForgotPassword })));
const AuthAction = lazy(() => import('./features/auth/pages/AuthAction').then(module => ({ default: module.AuthAction })));
const AdminDashboard = lazy(() => import('./features/admin/pages/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const DemoPage = lazy(() => import('./features/demo/pages/DemoPage').then(module => ({ default: module.DemoPage })));

import { AuthProvider } from './features/auth/AuthContext';
import { BookingRealtimeProvider } from './hooks/BookingRealtimeContext';
import { ProtectedRoute } from './features/auth/ProtectedRoute';
import { AdminRoute } from './features/auth/AdminRoute';
import { MobileLandscapeOverlay } from './components/ui/MobileLandscapeOverlay';

function App() {
  return (
    <AuthProvider>
      <BookingRealtimeProvider>
        <MobileLandscapeOverlay />
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            {/* Standalone page - no header/footer */}
            <Route path="/demo" element={<DemoPage />} />

            {/* All other routes wrapped in Layout */}
            <Route path="*" element={
              <Layout>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/auth/action" element={<AuthAction />} />
                  <Route path="/admin" element={
                    <AdminRoute>
                      <AdminDashboard />
                    </AdminRoute>
                  } />
                  <Route path="/" element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } />
                </Routes>
              </Layout>
            } />
          </Routes>
        </Suspense>
      </BookingRealtimeProvider>
    </AuthProvider>
  );
}

export default App;
