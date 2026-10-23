import { Router, Request, Response } from 'express';
import { loggerService } from '../services/loggerService';

const router = Router();

/**
 * GET /api/logs
 * Returns metadata and the latest lines from today's log file.
 */
router.get('/', (req: Request, res: Response) => {
  const content = loggerService.readTodayLogs();
  const allLines = content ? content.trim().split('\n') : [];
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
  const recentLines = allLines.slice(-limit);

  res.json({
    date: new Date().toISOString().slice(0, 10),
    logFile: loggerService.getTodayLogFileName(),
    totalEntries: allLines.length,
    returnedEntries: recentLines.length,
    logs: recentLines
  });
});

/**
 * GET /api/logs/raw
 * Returns the plain text of today's log file.
 */
router.get('/raw', (_req: Request, res: Response) => {
  const content = loggerService.readTodayLogs();
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(content);
});

export default router;

