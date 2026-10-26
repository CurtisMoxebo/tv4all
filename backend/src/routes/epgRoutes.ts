import { Router, Request, Response } from 'express';
import { epgService } from '../services/epgService';
import { broadcastManager } from '../services/broadcast/BroadcastManager';
import { requireAdmin } from '../middleware/authMiddleware';

const router = Router();

/**
 * GET /api/epg/:channelId
 * Returns the current program (with progress), live viewer count, and upcoming schedule for a channel.
 */
router.get('/:channelId', (req: Request, res: Response) => {
  const { channelId } = req.params;
  const channelName = typeof req.query.name === 'string' ? req.query.name : undefined;

  if (!channelId) {
    res.status(400).json({ error: 'Missing channelId parameter' });
    return;
  }

  const epg = epgService.getChannelEPG(channelId, channelName);
  const broadcast = broadcastManager.getBroadcast(channelId);
  const viewersCount = broadcast ? broadcast.clientCount : 0;

  res.json({
    ...epg,
    viewersCount
  });
});

/**
 * POST /api/epg/upload
 * Allows administrators to upload raw XMLTV content directly.
 */
router.post('/upload', requireAdmin, (req: Request, res: Response) => {
  const xmlContent = typeof req.body === 'string' ? req.body : req.body.xml;

  if (!xmlContent || typeof xmlContent !== 'string') {
    res.status(400).json({ error: 'XMLTV content is required in request body' });
    return;
  }

  const count = epgService.loadXmltv(xmlContent);
  res.json({
    success: true,
    message: `Successfully loaded ${count} programs into EPG cache`,
    programsLoaded: count,
    channelsCount: epgService.getChannelCount()
  });
});

export default router;
