import { Router, Request, Response, NextFunction } from 'express';
import { channelService } from '../services/channelService';
import { broadcastManager } from '../services/broadcast/BroadcastManager';

const router = Router();

let clientCounter = 0;

/**
 * GET /api/stream/active
 * Returns all currently running broadcasts and active viewer counts.
 */
router.get('/active', (_req: Request, res: Response) => {
  const active = broadcastManager.getActiveBroadcasts();
  res.json({
    count: active.length,
    broadcasts: active
  });
});

/**
 * GET /api/stream/:channelId/status
 * Returns broadcast status for a specific channel.
 */
router.get('/:channelId/status', (req: Request, res: Response) => {
  const { channelId } = req.params;
  const broadcast = broadcastManager.getBroadcast(channelId);

  if (!broadcast) {
    return res.json({
      channelId,
      status: 'idle',
      viewersCount: 0,
      active: false
    });
  }

  res.json({
    active: true,
    ...broadcast.getSummary()
  });
});

/**
 * DELETE /api/stream/:channelId
 * Manually stop an active broadcast.
 */
router.delete('/:channelId', (req: Request, res: Response) => {
  const { channelId } = req.params;
  const stopped = broadcastManager.stopBroadcast(channelId);

  if (!stopped) {
    return res.status(404).json({ error: 'Broadcast not found or already stopped' });
  }

  res.json({ message: `Broadcast for channel '${channelId}' stopped successfully` });
});

/**
 * GET /api/stream/:channelId
 * Connects a client to a channel's live broadcast.
 * Opens the broadcast if not running, or joins the existing broadcast.
 */
router.get('/:channelId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { channelId } = req.params;
    const channel = await channelService.getChannelById(channelId);

    if (!channel) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Channel with id '${channelId}' was not found in the playlist`
      });
    }

    if (!channel.url) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Channel '${channelId}' has no stream URL configured`
      });
    }

    const clientId = `client-${++clientCounter}-${Date.now().toString(36)}`;
    const broadcast = broadcastManager.getOrCreateBroadcast(channel);

    broadcast.addClient(clientId, req, res);
  } catch (error) {
    next(error);
  }
});

export default router;

