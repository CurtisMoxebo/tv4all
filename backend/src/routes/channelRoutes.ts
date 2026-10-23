import { Router, Request, Response, NextFunction } from 'express';
import { channelService } from '../services/channelService';

const router = Router();

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

