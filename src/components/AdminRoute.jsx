import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function AdminRoute({ children }) {
    const { currentUser } = useAuth();

    // Authorized Admins
    const ADMINS = [
        'bryan.m.hudson@gmail.com',
        'honeymoonhavenresort.lc@gmail.com'
    ];

    const isAdmin = currentUser && ADMINS.includes(currentUser.email);

    if (!currentUser) {
        return <Navigate to="/login" />;
    }

    if (!isAdmin) {
        // Redirect regular users to dashboard if they try to access admin
        return <Navigate to="/" />;
    }

    return children;
}
