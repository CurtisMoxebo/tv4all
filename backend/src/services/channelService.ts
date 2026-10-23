import fs from 'fs';
import path from 'path';
import { Channel, ChannelSummary, GroupInfo } from '../types/channel';
import { parseM3U } from '../utils/m3uParser';

const DEFAULT_M3U_URL = 'https://raw.githubusercontent.com/CurtisMoxebo/tv4all/refs/heads/main/m3u/index.m3u8';
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

class ChannelService {
  private channels: Channel[] = [];
  private lastFetched: number = 0;
  private fetchPromise: Promise<Channel[]> | null = null;
  private readonly m3uUrl: string;

  constructor() {
    this.m3uUrl = process.env.M3U_URL || DEFAULT_M3U_URL;
  }

  /**
   * Fetches M3U content from remote URL, with local file fallback if needed.
   */
  private async fetchM3UContent(): Promise<string> {
    try {
      console.log(`[ChannelService] Fetching playlist from ${this.m3uUrl}...`);
      const response = await fetch(this.m3uUrl, {
        headers: {
          'User-Agent': 'tv4all-backend/1.0.0'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const text = await response.text();
      console.log(`[ChannelService] Successfully fetched remote M3U (${text.length} bytes)`);
      return text;
    } catch (err) {
      console.warn(`[ChannelService] Remote fetch failed: ${(err as Error).message}. Attempting local fallback...`);

      // Fallback paths for local m3u/index.m3u8
      const potentialPaths = [
        path.resolve(process.cwd(), '..', 'm3u', 'index.m3u8'),
        path.resolve(process.cwd(), 'm3u', 'index.m3u8'),
        path.resolve(__dirname, '../../../m3u/index.m3u8')
      ];

      for (const localPath of potentialPaths) {
        if (fs.existsSync(localPath)) {
          console.log(`[ChannelService] Loaded local fallback playlist from ${localPath}`);
          return fs.readFileSync(localPath, 'utf-8');
        }
      }

      throw new Error(`Failed to load M3U playlist from remote URL and no local fallback found: ${(err as Error).message}`);
    }
  }

  /**
   * Reloads and parses the channels playlist.
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
        console.log(`[ChannelService] Loaded ${this.channels.length} channels`);
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

