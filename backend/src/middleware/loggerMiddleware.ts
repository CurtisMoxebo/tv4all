import { Request, Response, NextFunction } from 'express';
import { loggerService } from '../services/loggerService';

/**
 * Middleware that logs each incoming HTTP request with date, client IP,
 * method, route, status code, and duration into the current day's log file.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // Listen for request completion
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    loggerService.logHttpRequest(req, res, duration);
  });

  next();
}

