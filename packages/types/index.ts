/**
 * Shared types for WisePath application
 */

export type User = {
  id: string;
  email: string;
  name?: string;
  createdAt: Date;
};

export type AuthToken = {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
};
