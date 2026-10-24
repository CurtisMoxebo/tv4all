import { Router, Request, Response, NextFunction } from 'express';
import { channelService, ValidationError } from '../services/channelService';
import { broadcastManager } from '../services/broadcast/BroadcastManager';

const router = Router();
let streamClientCounter = 0;

/**
 * GET /api/channels
 * Returns available channels containing name, id, logo, and group.
 * Optional query parameters:
 *  - group: filter by group
 *  - search: filter by name or id
 *  - refresh: pass 'true' to bypass cache and fetch latest M3U
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const group = typeof req.query.group === 'string' ? req.query.group : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const force = req.query.refresh === 'true' || req.query.force === 'true';

    const channels = await channelService.getChannels({ group, search, force });
    res.json(channels);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/channels
 * Validates payload fields and adds a new channel to backend/index.m3u8.
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const channel = await channelService.addChannel(req.body);
    return res.status(201).json({
      message: 'Channel added successfully',
      channel
    });
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({
        error: 'Bad Request',
        message: error.message,
        errors: error.errors
      });
    }
    next(error);
  }
});

/**
 * POST /api/channels/add
 * Alias for POST /api/channels.
 */
router.post('/add', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const channel = await channelService.addChannel(req.body);
    return res.status(201).json({
      message: 'Channel added successfully',
      channel
    });
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({
        error: 'Bad Request',
        message: error.message,
        errors: error.errors
      });
    }
    next(error);
  }
});

/**
 * DELETE /api/channels/:id
 * Removes a channel by ID from the M3U playlist file.
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const channelId = req.params.id;
    if (!channelId || !channelId.trim()) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Channel ID is required'
      });
    }

    const deletedChannel = await channelService.deleteChannel(channelId);
    if (!deletedChannel) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Channel '${channelId}' not found`
      });
    }

    // Stop active broadcast if one exists
    broadcastManager.stopBroadcast(deletedChannel.id);

    return res.json({
      message: 'Channel deleted successfully',
      channel: deletedChannel
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/channels
 * Removes a channel by ID provided in request body or query parameter.
 */
router.delete('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const channelId = (req.body?.id || req.query?.id) as string | undefined;
    if (!channelId || !channelId.trim()) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Channel ID is required (provide in JSON body or ?id= parameter)'
      });
    }

    const deletedChannel = await channelService.deleteChannel(channelId);
    if (!deletedChannel) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Channel '${channelId}' not found`
      });
    }

    broadcastManager.stopBroadcast(deletedChannel.id);

    return res.json({
      message: 'Channel deleted successfully',
      channel: deletedChannel
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/channels/:id/delete
 * Alias for DELETE /api/channels/:id
 */
router.post('/:id/delete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const channelId = req.params.id;
    if (!channelId || !channelId.trim()) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Channel ID is required'
      });
    }

    const deletedChannel = await channelService.deleteChannel(channelId);
    if (!deletedChannel) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Channel '${channelId}' not found`
      });
    }

    broadcastManager.stopBroadcast(deletedChannel.id);

    return res.json({
      message: 'Channel deleted successfully',
      channel: deletedChannel
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/channels/groups
 * Returns available channel groups.
 */
router.get('/groups', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const force = req.query.refresh === 'true' || req.query.force === 'true';
    const detailed = req.query.detailed === 'true' || req.query.stats === 'true';

    if (detailed) {
      const groups = await channelService.getGroupsWithStats(force);
      return res.json(groups);
    }

    const groups = await channelService.getGroups(force);
    res.json(groups);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/channels/:id/stream
 * Connects directly to the live broadcast for this channel.
 */
router.get('/:id/stream', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const channel = await channelService.getChannelById(req.params.id);
    if (!channel) {
      return res.status(404).json({ error: `Channel '${req.params.id}' not found` });
    }

    if (!channel.url) {
      return res.status(400).json({ error: `Channel '${req.params.id}' has no stream URL configured` });
    }

    const clientId = `client-${++streamClientCounter}-${Date.now().toString(36)}`;
    const broadcast = broadcastManager.getOrCreateBroadcast(channel);
    broadcast.addClient(clientId, req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/channels/:id
 * Returns a specific channel's details.
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const channel = await channelService.getChannelById(req.params.id);
    if (!channel) {
      return res.status(404).json({ error: `Channel '${req.params.id}' not found` });
    }

    res.json({
      id: channel.id,
      name: channel.name,
      logo: channel.logo,
      group: channel.group
    });
  } catch (error) {
    next(error);
  }
});

export default router;
