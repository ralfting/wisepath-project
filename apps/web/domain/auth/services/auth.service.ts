/**
 * Auth Service - API communication layer for authentication
 * Handles all HTTP calls related to auth and data transformation
 */

import { get, post } from '@/lib/api';
import type { AuthResponse, LoginCredentials, SignupCredentials, User } from '../types/auth.types';

export class AuthService {
  /**
   * Login user with email and password
   */
  static async login(credentials: LoginCredentials): Promise<User> {
    const response = await post<AuthResponse>('/auth/login', credentials);
    return response.user;
  }

  /**
   * Signup new user
   */
  static async signup(credentials: SignupCredentials): Promise<User> {
    const response = await post<AuthResponse>('/auth/signup', credentials);
    return response.user;
  }

  /**
   * Logout current user
   */
  static async logout(): Promise<void> {
    await post<{ message: string }>('/auth/logout');
  }

  /**
   * Get current authenticated user
   * Returns null if not authenticated
   */
  static async getMe(): Promise<User | null> {
    try {
      const response = await get<AuthResponse>('/auth/me');
      return response.user;
    } catch (error) {
      // Not authenticated
      return null;
    }
  }
}
