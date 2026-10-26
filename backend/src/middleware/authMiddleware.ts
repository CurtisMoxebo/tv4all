import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';

/**
 * Middleware that validates the JWT authentication token.
 * Token can be provided via:
 *  - Header: Authorization: Bearer <token>
 *  - Header: Authorization: <token>
 *  - Query parameter: ?token=<token>
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader) {
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else {
      token = authHeader.trim();
    }
  } else if (typeof req.query.token === 'string') {
    token = req.query.token.trim();
  }

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication token is required. Provide it via Authorization header or ?token query parameter.'
    });
  }

  try {
    const decoded = authService.verifyToken(token);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired authentication token'
    });
  }
}

/**
 * Middleware that ensures the authenticated user has the 'admin' role.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin access required'
      });
    }
    next();
  });
}
