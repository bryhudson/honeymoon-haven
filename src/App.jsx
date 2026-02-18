import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { LoadingSpinner } from './components/ui/LoadingSpinner';

const Dashboard = lazy(() => import('./features/dashboard/pages/Dashboard').then(module => ({ default: module.Dashboard })));
const Login = lazy(() => import('./features/auth/pages/Login').then(module => ({ default: module.Login })));
const ForgotPassword = lazy(() => import('./features/auth/pages/ForgotPassword').then(module => ({ default: module.ForgotPassword })));
const AdminDashboard = lazy(() => import('./features/admin/pages/AdminDashboard').then(module => ({ default: module.AdminDashboard })));

import { AuthProvider } from './features/auth/AuthContext';
import { ProtectedRoute } from './features/auth/ProtectedRoute';
import { AdminRoute } from './features/auth/AdminRoute';

function App() {
  return (
    <AuthProvider>
      <Layout>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
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
        </Suspense>
      </Layout>
    </AuthProvider>
  );
}

export default App;
