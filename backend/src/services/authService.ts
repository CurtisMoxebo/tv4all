import jwt, { SignOptions } from 'jsonwebtoken';

const DEFAULT_JWT_SECRET = 'tv4all-super-secret-key-change-in-production';
const DEFAULT_EXPIRATION = '12h';

export interface TokenPayload {
  username: string;
  role: 'admin' | 'user';
}

export type AuthenticatedUser = TokenPayload;

export class AuthService {
  private get authUsername(): string {
    return process.env.AUTH_USERNAME || 'tv4all';
  }

  private get authPassword(): string {
    return process.env.AUTH_PASSWORD || '123';
  }

  private get adminUsername(): string {
    return process.env.ADMIN_USERNAME || 'tv4alladmin';
  }

  private get adminPassword(): string {
    return process.env.ADMIN_PASSWORD || '123123';
  }

  private get jwtSecret(): string {
    return process.env.JWT_SECRET || DEFAULT_JWT_SECRET;
  }

  private get jwtExpiresIn(): string {
    return process.env.JWT_EXPIRES_IN || DEFAULT_EXPIRATION;
  }

  /**
   * Validate provided username and password against configured users.
   */
  public validateCredentials(username?: string, password?: string): boolean {
    return this.authenticate(username, password) !== null;
  }

  /**
   * Authenticate credentials and return user details with role.
   */
  public authenticate(username?: string, password?: string): AuthenticatedUser | null {
    if (!username || !password) {
      return null;
    }

    if (username === this.adminUsername && password === this.adminPassword) {
      return {
        username: this.adminUsername,
        role: 'admin'
      };
    }

    if (username === this.authUsername && password === this.authPassword) {
      return {
        username: this.authUsername,
        role: 'user'
      };
    }

    return null;
  }

  /**
   * Generate an authentication token valid for 12 hours.
   */
  public generateToken(username: string, role?: 'admin' | 'user'): string {
    const userRole = role || (username === this.adminUsername ? 'admin' : 'user');
    const payload: TokenPayload = {
      username,
      role: userRole
    };
    const options: SignOptions = {
      expiresIn: this.jwtExpiresIn as SignOptions['expiresIn']
    };

    return jwt.sign(payload, this.jwtSecret, options);
  }

  /**
   * Verify and decode a JWT token.
   */
  public verifyToken(token: string): TokenPayload {
    const decoded = jwt.verify(token, this.jwtSecret) as any;
    const role: 'admin' | 'user' =
      decoded.role === 'admin' || decoded.username === this.adminUsername ? 'admin' : 'user';

    return {
      username: decoded.username,
      role
    };
  }
}

export const authService = new AuthService();
