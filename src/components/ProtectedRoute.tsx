import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const location = useLocation();
    const userStr = localStorage.getItem('commodity_user');

    if (!userStr) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
}
