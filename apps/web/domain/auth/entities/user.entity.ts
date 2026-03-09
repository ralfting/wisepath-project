/**
 * User entity - Pure TypeScript class representing a user
 * Framework-agnostic, no external dependencies
 */
export class User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly name: string | null,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date
  ) {}

  /**
   * Create a User from API response data
   */
  static fromApiResponse(data: any): User {
    return new User(
      data.id,
      data.email,
      data.name,
      data.createdAt ? new Date(data.createdAt) : undefined,
      data.updatedAt ? new Date(data.updatedAt) : undefined
    );
  }

  /**
   * Get display name (name or email if name is null)
   */
  get displayName(): string {
    return this.name || this.email;
  }
}
