import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import channelRoutes from './routes/channelRoutes';
import groupRoutes from './routes/groupRoutes';
import streamRoutes from './routes/streamRoutes';
import logRoutes from './routes/logRoutes';
import epgRoutes from './routes/epgRoutes';
import { requireAuth } from './middleware/authMiddleware';
import { requestLogger } from './middleware/loggerMiddleware';
import { broadcastManager } from './services/broadcast/BroadcastManager';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.text({ type: ['text/*', 'application/x-mpegurl', 'audio/x-mpegurl'] }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Health Check (Public)
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Authentication routes (Public login, protected /me)
app.use('/api/auth', authRoutes);

// Protected API Routes (require valid 12-hour authentication token)
app.use('/api/channels', requireAuth, channelRoutes);
app.use('/api/groups', requireAuth, groupRoutes);
app.use('/api/stream', requireAuth, streamRoutes);
app.use('/api/logs', requireAuth, logRoutes);
app.use('/api/epg', requireAuth, epgRoutes);
app.use('/api/broadcasts', requireAuth, (_req: Request, res: Response) => {
  res.json(broadcastManager.getActiveBroadcasts());
});

// API Root info
app.get('/api', (_req: Request, res: Response) => {
  res.json({
    name: 'TV4ALL IPTV relay backend',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth/login',
      channels: '/api/channels',
      groups: '/api/groups',
      stream: '/api/stream/:channelId',
      broadcasts: '/api/broadcasts',
      logs: '/api/logs',
      epg: '/api/epg/:channelId'
    }
  });
});

// 404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not Found' });
});

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start server (only when not running under test runner)
let server: any = null;
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, () => {
    console.log(`[Server] Backend is running at http://localhost:${PORT}`);
  });
}

// Graceful shutdown
const shutdown = (signal: string) => {
  console.log(`[Server] Received ${signal}, closing server gracefully...`);
  broadcastManager.stopAll();
  if (server) {
    server.close(() => {
      console.log('[Server] HTTP server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

if (process.env.NODE_ENV !== 'test') {
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

export { app, server };
export default app;

