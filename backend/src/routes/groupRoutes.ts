import { Router, Request, Response, NextFunction } from 'express';
import { channelService } from '../services/channelService';

const router = Router();

/**
 * GET /api/groups
 * Returns list of available channel groups.
 * Optional query parameters:
 *  - detailed: pass 'true' to get [{ name, count }] instead of string[]
 *  - refresh: pass 'true' to bypass cache and fetch latest M3U
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
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

export default router;

