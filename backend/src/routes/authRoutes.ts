import { Router, Request, Response } from 'express';
import { authService } from '../services/authService';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

/**
 * POST /api/auth/login
 * Validates username and password, returns a 12h JWT token.
 */
router.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Both username and password are required'
    });
  }

  const authenticatedUser = authService.authenticate(username, password);
  if (!authenticatedUser) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid username or password'
    });
  }

  const token = authService.generateToken(authenticatedUser.username, authenticatedUser.role);

  return res.json({
    message: 'Authentication successful',
    token,
    tokenType: 'Bearer',
    expiresIn: '12h',
    user: {
      username: authenticatedUser.username,
      role: authenticatedUser.role
    }
  });
});

/**
 * POST /api/auth (alias for /login)
 */
router.post('/', (req: Request, res: Response) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Both username and password are required'
    });
  }

  const authenticatedUser = authService.authenticate(username, password);
  if (!authenticatedUser) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid username or password'
    });
  }

  const token = authService.generateToken(authenticatedUser.username, authenticatedUser.role);

  return res.json({
    message: 'Authentication successful',
    token,
    tokenType: 'Bearer',
    expiresIn: '12h',
    user: {
      username: authenticatedUser.username,
      role: authenticatedUser.role
    }
  });
});

/**
 * GET /api/auth/me
 * Returns current authenticated user information.
 */
router.get('/me', requireAuth, (req: Request, res: Response) => {
  return res.json({
    authenticated: true,
    user: req.user
  });
});

export default router;
