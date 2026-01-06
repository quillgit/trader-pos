import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { Employee } from '@/types';

interface RoleRouteProps {
    children: React.ReactNode;
    roles: Employee['role'][];
}

export default function RoleRoute({ children, roles }: RoleRouteProps) {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return <div>Loading...</div>; // Or a spinner
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (roles.length > 0 && !roles.includes(user.role)) {
        // Redirect to home if unauthorized
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
}
