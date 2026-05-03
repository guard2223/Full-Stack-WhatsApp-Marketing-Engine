"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { apiFetch } from '@/lib/api';

interface User {
    id: string;
    email: string;
    role: 'admin' | 'client';
    credits: number;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    refreshUser: () => Promise<void>;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    const checkAuth = async () => {
        const storedToken = localStorage.getItem('token');
        if (!storedToken) {
            setIsLoading(false);
            return;
        }

        setToken(storedToken);
        try {
            console.log("Checking session integrity...");
            const res = await apiFetch('/auth/me');
            if (res.ok) {
                const data = await res.json();
                console.log("Session valid for:", data.user?.email);
                setUser(data.user);
            } else {
                console.warn("Session invalid, clearing...");
                handleLogout();
            }
        } catch (err) {
            console.error("Auth check failed:", err);
            // Don't logout on network error to avoid losing token during transient issues
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

    const refreshUser = async () => {
        try {
            const res = await apiFetch('/auth/me');
            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
            }
        } catch (err) {
            console.error("Failed to refresh user", err);
        }
    };

    const login = (newToken: string, newUser: User) => {
        console.log("Login successful, setting session...");
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('token', newToken);
        router.push('/dashboard'); // Explicitly push to dashboard
    };

    const handleLogout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        if (pathname !== '/login' && pathname !== '/signup') {
            router.push('/login');
        }
    };

    const logout = () => {
        handleLogout();
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isLoading, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
