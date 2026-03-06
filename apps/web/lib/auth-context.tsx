'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

export interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      // Stub implementation - actual API call comes in Plan 04
      console.log('Logging in with:', { email, password });
      // TODO: Call /api/auth/login
      setLoading(false);
    } catch (error) {
      console.error('Login failed:', error);
      setLoading(false);
      throw error;
    }
  }, []);

  const signup = useCallback(async (email: string, password: string, name: string) => {
    setLoading(true);
    try {
      // Stub implementation - actual API call comes in Plan 04
      console.log('Signing up with:', { email, password, name });
      // TODO: Call /api/auth/signup
      setLoading(false);
    } catch (error) {
      console.error('Signup failed:', error);
      setLoading(false);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      // Stub implementation - actual API call comes in Plan 04
      console.log('Logging out');
      // TODO: Call /api/auth/logout
      setUser(null);
      setLoading(false);
    } catch (error) {
      console.error('Logout failed:', error);
      setLoading(false);
      throw error;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
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
