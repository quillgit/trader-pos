import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Employee } from '@/types';

interface AuthContextType {
    user: Employee | null;
    login: (employee: Employee) => void;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<Employee | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Load user from local storage on mount
        const storedUser = localStorage.getItem('commodity_user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error('Failed to parse user from storage', e);
                localStorage.removeItem('commodity_user');
            }
        }
        setIsLoading(false);
    }, []);

    const login = (employee: Employee) => {
        localStorage.setItem('commodity_user', JSON.stringify(employee));
        setUser(employee);
    };

    const logout = () => {
        localStorage.removeItem('commodity_user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
