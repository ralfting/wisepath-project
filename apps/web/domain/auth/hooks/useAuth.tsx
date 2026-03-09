'use client';

/**
 * useAuth - Context-based hook for authentication
 * Provides user state, loading state, and auth operations
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { AuthService } from '../services/auth.service';
import { useAuthSession } from './useAuthSession';
import type { User } from '../types/auth.types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider - Provides authentication context to the app
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Session restoration on mount
  useAuthSession({
    onSessionRestored: setUser,
    onLoadingComplete: () => setLoading(false),
  });

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const user = await AuthService.login({ email, password });
      setUser(user);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const signup = useCallback(async (email: string, password: string, name?: string) => {
    setLoading(true);
    try {
      const user = await AuthService.signup({ email, password, name });
      setUser(user);
    } catch (error) {
      console.error('Signup failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await AuthService.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * useAuth hook - Access authentication context
 * Must be used within AuthProvider
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
