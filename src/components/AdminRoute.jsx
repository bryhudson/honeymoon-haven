import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function AdminRoute({ children }) {
    const { currentUser } = useAuth();
    const isSuperAdmin = currentUser?.email === 'bryan.m.hudson@gmail.com';

    if (!currentUser) {
        return <Navigate to="/login" />;
    }

    if (!isSuperAdmin) {
        // Redirect regular users to dashboard if they try to access admin
        return <Navigate to="/" />;
    }

    return children;
}
