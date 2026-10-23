import jwt, { SignOptions } from 'jsonwebtoken';

const DEFAULT_JWT_SECRET = 'tv4all-super-secret-key-change-in-production';
const DEFAULT_EXPIRATION = '12h';

export interface TokenPayload {
  username: string;
}

export class AuthService {
  private get authUsername(): string {
    return process.env.AUTH_USERNAME || 'tv4all';
  }

  private get authPassword(): string {
    return process.env.AUTH_PASSWORD || '123';
  }

  private get jwtSecret(): string {
    return process.env.JWT_SECRET || DEFAULT_JWT_SECRET;
  }

  private get jwtExpiresIn(): string {
    return process.env.JWT_EXPIRES_IN || DEFAULT_EXPIRATION;
  }

  /**
   * Validate provided username and password against configured values.
   */
  public validateCredentials(username?: string, password?: string): boolean {
    if (!username || !password) {
      return false;
    }
    return username === this.authUsername && password === this.authPassword;
  }

  /**
   * Generate an authentication token valid for 12 hours.
   */
  public generateToken(username: string): string {
    const payload: TokenPayload = { username };
    const options: SignOptions = {
      expiresIn: this.jwtExpiresIn as SignOptions['expiresIn']
    };

    return jwt.sign(payload, this.jwtSecret, options);
  }

  /**
   * Verify and decode a JWT token.
   */
  public verifyToken(token: string): TokenPayload {
    return jwt.verify(token, this.jwtSecret) as TokenPayload;
  }
}

export const authService = new AuthService();

