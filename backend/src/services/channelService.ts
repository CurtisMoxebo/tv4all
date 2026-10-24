import fs from 'fs';
import path from 'path';
import { Channel, ChannelSummary, GroupInfo } from '../types/channel';
import { parseM3U } from '../utils/m3uParser';

class ChannelService {
  private channels: Channel[] = [];
  private lastMtime: number = 0;

  /**
   * Resolves the path to the backend/index.m3u8 file.
   */
  public getPlaylistPath(): string {
    const candidates = [
      path.resolve(process.cwd(), 'index.m3u8'),
      path.resolve(process.cwd(), 'backend', 'index.m3u8'),
      path.resolve(__dirname, '../../index.m3u8'),
      path.resolve(__dirname, '../../../backend/index.m3u8')
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    return path.resolve(process.cwd(), 'backend', 'index.m3u8');
  }

  /**
   * Reads M3U content directly from backend/index.m3u8.
   */
  private readM3UContent(): string {
    const playlistPath = this.getPlaylistPath();
    if (!fs.existsSync(playlistPath)) {
      throw new Error(`Playlist file not found at ${playlistPath}`);
    }
    return fs.readFileSync(playlistPath, 'utf-8');
  }

  /**
   * Reloads and parses the channels playlist from backend/index.m3u8.
   */
  public async loadChannels(force: boolean = false): Promise<Channel[]> {
    const playlistPath = this.getPlaylistPath();

    if (!fs.existsSync(playlistPath)) {
      console.warn(`[ChannelService] Playlist file not found at ${playlistPath}`);
      return [];
    }

    try {
      const stats = fs.statSync(playlistPath);
      const isModified = stats.mtimeMs > this.lastMtime;

      if (!force && this.channels.length > 0 && !isModified) {
        return this.channels;
      }

      const content = this.readM3UContent();
      this.channels = parseM3U(content);
      this.lastMtime = stats.mtimeMs;
      console.log(`[ChannelService] Loaded ${this.channels.length} channels from ${playlistPath}`);
      return this.channels;
    } catch (err) {
      console.error(`[ChannelService] Failed to read or parse ${playlistPath}:`, err);
      if (this.channels.length > 0) {
        return this.channels;
      }
      throw err;
    }
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
