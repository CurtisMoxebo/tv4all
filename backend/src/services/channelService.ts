import { Channel, ChannelSummary, GroupInfo } from '../types/channel';
import { parseM3U } from '../utils/m3uParser';

const DEFAULT_M3U_URL = 'https://raw.githubusercontent.com/CurtisMoxebo/tv4all/refs/heads/main/m3u/index.m3u8';
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

class ChannelService {
  private channels: Channel[] = [];
  private lastFetched: number = 0;
  private fetchPromise: Promise<Channel[]> | null = null;

  public get m3uUrl(): string {
    return process.env.CHANNELS_M3U_URL || process.env.M3U_URL || DEFAULT_M3U_URL;
  }

  /**
   * Fetches M3U content directly from the remote URL specified in .env.
   */
  private async fetchM3UContent(): Promise<string> {
    const url = this.m3uUrl;
    console.log(`[ChannelService] Fetching playlist from .env URL: ${url}...`);

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'tv4all-backend/1.0.0 (Mozilla/5.0)'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const text = await response.text();
      console.log(`[ChannelService] Successfully fetched M3U from .env URL (${text.length} bytes)`);
      return text;
    } catch (err) {
      console.error(`[ChannelService] Failed to load M3U from .env URL ${url}:`, err);
      throw new Error(`Failed to load M3U playlist from .env URL: ${(err as Error).message}`);
    }
  }

  /**
   * Reloads and parses the channels playlist from the .env URL.
   */
  public async loadChannels(force: boolean = false): Promise<Channel[]> {
    const isCacheExpired = Date.now() - this.lastFetched > CACHE_TTL_MS;

    if (!force && this.channels.length > 0 && !isCacheExpired) {
      return this.channels;
    }

    if (this.fetchPromise) {
      return this.fetchPromise;
    }

    this.fetchPromise = (async () => {
      try {
        const content = await this.fetchM3UContent();
        this.channels = parseM3U(content);
        this.lastFetched = Date.now();
        console.log(`[ChannelService] Loaded ${this.channels.length} channels from .env URL`);
        return this.channels;
      } finally {
        this.fetchPromise = null;
      }
    })();

    return this.fetchPromise;
  }

  /**
   * Returns list of channels with name, id, logo, and group.
   */
  public async getChannels(filters?: { group?: string; search?: string; force?: boolean }): Promise<ChannelSummary[]> {
    const channels = await this.loadChannels(filters?.force);

    let filtered = channels;

    if (filters?.group) {
      const g = filters.group.toLowerCase();
      filtered = filtered.filter(c => c.group.toLowerCase() === g);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(c => c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q));
    }

    return filtered.map(({ id, name, logo, group }) => ({
      name,
      id,
      logo,
      group
    }));
  }

  /**
   * Get a single channel by ID (includes upstream URL for streaming).
   */
  public async getChannelById(id: string): Promise<Channel | undefined> {
    const channels = await this.loadChannels();
    return channels.find(c => c.id === id);
  }

  /**
   * Returns list of unique channel group names.
   */
  public async getGroups(force?: boolean): Promise<string[]> {
    const channels = await this.loadChannels(force);
    const groupsSet = new Set<string>();

    for (const channel of channels) {
      if (channel.group) {
        groupsSet.add(channel.group);
      }
    }

    return Array.from(groupsSet).sort((a, b) => a.localeCompare(b));
  }

  /**
   * Returns list of unique groups with channel counts.
   */
  public async getGroupsWithStats(force?: boolean): Promise<GroupInfo[]> {
    const channels = await this.loadChannels(force);
    const groupCounts = new Map<string, number>();

    for (const channel of channels) {
      const g = channel.group || 'General';
      groupCounts.set(g, (groupCounts.get(g) || 0) + 1);
    }

    return Array.from(groupCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
}

export const channelService = new ChannelService();

