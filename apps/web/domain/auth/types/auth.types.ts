/**
 * Authentication types - DTOs and API contracts
 */

// Re-export User interface for backward compatibility
export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Login credentials DTO
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Signup credentials DTO
 */
export interface SignupCredentials {
  email: string;
  password: string;
  name?: string;
}

/**
 * Auth API response structure
 */
export interface AuthResponse {
  user: User;
}

/**
 * Error response from API
 */
export interface ApiError {
  message: string;
  statusCode?: number;
}
