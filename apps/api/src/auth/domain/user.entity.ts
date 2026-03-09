/**
 * User Domain Entity
 * Pure business entity with core validation logic
 * No framework dependencies (no NestJS decorators)
 */

export class UserEntity {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly password: string,
    public readonly name: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   */
  static isValidPassword(password: string): boolean {
    return password.length >= 8;
  }

  /**
   * Get display name (name or email if name is null)
   */
  get displayName(): string {
    return this.name || this.email;
  }
}
