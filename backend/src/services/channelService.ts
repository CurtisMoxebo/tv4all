import fs from 'fs';
import path from 'path';
import { Channel, ChannelSummary, GroupInfo } from '../types/channel';
import { parseM3U, extractAttribute } from '../utils/m3uParser';

export class ValidationError extends Error {
  public status: number = 400;
  public errors: string[];

  constructor(message: string, errors: string[] = []) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

function isValidUrl(str: string): boolean {
  try {
    const parsed = new URL(str);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function escapeM3UAttribute(val: string): string {
  return val.replace(/"/g, "'").trim();
}

/**
 * Validates the 2 M3U lines (Line 1: #EXTINF directive, Line 2: Stream URL).
 */
export function validateM3ULines(rawExtinf: any, rawUrl: any): {
  isValid: boolean;
  errors: string[];
  sanitized?: {
    extinf: string;
    url: string;
    channel: Channel;
  };
} {
  const errors: string[] = [];

  if (!rawExtinf || typeof rawExtinf !== 'string' || !rawExtinf.trim()) {
    errors.push("Line 1 (#EXTINF directive) is required and must be a non-empty string");
  }

  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    errors.push("Line 2 (Stream URL) is required and must be a non-empty string");
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  const extinf = rawExtinf.trim();
  const url = rawUrl.trim();

  // Validate Line 1 starts with #EXTINF:
  if (!extinf.toUpperCase().startsWith('#EXTINF:')) {
    errors.push("Line 1 must start with '#EXTINF:' (e.g. #EXTINF:-1 tvg-name=\"Channel\",Channel Name)");
  }

  if (extinf.includes('\n') || extinf.includes('\r')) {
    errors.push("Line 1 cannot contain newline characters");
  }

  // Validate Line 2 does not contain newline characters and is a valid URL
  if (url.includes('\n') || url.includes('\r')) {
    errors.push("Line 2 cannot contain newline characters");
  } else if (!isValidUrl(url)) {
    errors.push(`Line 2 must be a valid HTTP or HTTPS URL (received '${url}')`);
  }

  // Verify that the 2 lines can be parsed as a valid channel
  const parsed = parseM3U(`${extinf}\n${url}`);
  if (parsed.length === 0) {
    errors.push("Line 1 does not contain valid channel title or metadata");
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: [],
    sanitized: {
      extinf,
      url,
      channel: parsed[0]
    }
  };
}

/**
 * Validates each field of the channel payload.
 */
export function validateChannelPayload(payload: any): {
  isValid: boolean;
  errors: string[];
  sanitized?: {
    name: string;
    url: string;
    logo: string;
    group: string;
    id: string;
    chno: string;
    country: string;
  };
} {
  const errors: string[] = [];

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {
      isValid: false,
      errors: ['Request body must be a JSON object containing channel fields']
    };
  }

  // 1. Validate 'name'
  const rawName = payload.name ?? payload.tvgName ?? payload.title;
  let sanitizedName = '';
  if (rawName === undefined || rawName === null) {
    errors.push("Field 'name' is required");
  } else if (typeof rawName !== 'string') {
    errors.push("Field 'name' must be a string");
  } else {
    const trimmed = rawName.trim();
    if (trimmed.length === 0) {
      errors.push("Field 'name' cannot be empty");
    } else if (trimmed.includes('\n') || trimmed.includes('\r')) {
      errors.push("Field 'name' cannot contain newline characters");
    } else {
      sanitizedName = trimmed;
    }
  }

  // 2. Validate 'url'
  const rawUrl = payload.url ?? payload.streamUrl;
  let sanitizedUrl = '';
  if (rawUrl === undefined || rawUrl === null) {
    errors.push("Field 'url' is required");
  } else if (typeof rawUrl !== 'string') {
    errors.push("Field 'url' must be a string");
  } else {
    const trimmed = rawUrl.trim();
    if (trimmed.length === 0) {
      errors.push("Field 'url' cannot be empty");
    } else if (trimmed.includes('\n') || trimmed.includes('\r')) {
      errors.push("Field 'url' cannot contain newline characters");
    } else if (!isValidUrl(trimmed)) {
      errors.push(`Field 'url' must be a valid HTTP or HTTPS URL (received '${trimmed}')`);
    } else {
      sanitizedUrl = trimmed;
    }
  }

  // 3. Validate 'logo' (optional, defaults to empty)
  const rawLogo = payload.logo ?? payload.tvgLogo;
  let sanitizedLogo = '';
  if (rawLogo !== undefined && rawLogo !== null) {
    if (typeof rawLogo !== 'string') {
      errors.push("Field 'logo' must be a string");
    } else {
      const trimmed = rawLogo.trim();
      if (trimmed.includes('\n') || trimmed.includes('\r')) {
        errors.push("Field 'logo' cannot contain newline characters");
      } else if (trimmed.length > 0 && !isValidUrl(trimmed)) {
        errors.push(`Field 'logo' must be a valid HTTP or HTTPS URL (received '${trimmed}')`);
      } else {
        sanitizedLogo = trimmed;
      }
    }
  }

  // 4. Validate 'group' (optional, defaults to 'General')
  const rawGroup = payload.group ?? payload.groupTitle ?? payload.category;
  let sanitizedGroup = 'General';
  if (rawGroup !== undefined && rawGroup !== null) {
    if (typeof rawGroup !== 'string') {
      errors.push("Field 'group' must be a string");
    } else {
      const trimmed = rawGroup.trim();
      if (trimmed.includes('\n') || trimmed.includes('\r')) {
        errors.push("Field 'group' cannot contain newline characters");
      } else if (trimmed.length === 0) {
        errors.push("Field 'group' cannot be an empty string");
      } else {
        sanitizedGroup = trimmed;
      }
    }
  }

  // 5. Validate 'id' (optional, defaults to derived id from name)
  const rawId = payload.id ?? payload.tvgId;
  let sanitizedId = '';
  if (rawId !== undefined && rawId !== null) {
    if (typeof rawId !== 'string') {
      errors.push("Field 'id' must be a string");
    } else {
      const trimmed = rawId.trim();
      if (trimmed.includes('\n') || trimmed.includes('\r')) {
        errors.push("Field 'id' cannot contain newline characters");
      } else if (trimmed.length === 0) {
        errors.push("Field 'id' cannot be an empty string");
      } else {
        sanitizedId = trimmed;
      }
    }
  } else if (sanitizedName) {
    const slug = sanitizedName.replace(/[^a-zA-Z0-9]+/g, '');
    sanitizedId = slug ? `${slug}.fr` : `channel-${Date.now().toString(36)}`;
  }

  // 6. Validate 'chno' (optional)
  const rawChno = payload.chno ?? payload.tvgChno ?? payload.channelNumber;
  let sanitizedChno = '-';
  if (rawChno !== undefined && rawChno !== null) {
    if (typeof rawChno === 'number') {
      sanitizedChno = String(rawChno);
    } else if (typeof rawChno === 'string') {
      const trimmed = rawChno.trim();
      if (trimmed.includes('\n') || trimmed.includes('\r')) {
        errors.push("Field 'chno' cannot contain newline characters");
      } else {
        sanitizedChno = trimmed || '-';
      }
    } else {
      errors.push("Field 'chno' must be a number or string");
    }
  }

  // 7. Validate 'country' (optional, defaults to 'FR')
  const rawCountry = payload.country ?? payload.tvgCountry;
  let sanitizedCountry = 'FR';
  if (rawCountry !== undefined && rawCountry !== null) {
    if (typeof rawCountry !== 'string') {
      errors.push("Field 'country' must be a string");
    } else {
      const trimmed = rawCountry.trim();
      if (trimmed.includes('\n') || trimmed.includes('\r')) {
        errors.push("Field 'country' cannot contain newline characters");
      } else if (trimmed.length === 0) {
        errors.push("Field 'country' cannot be an empty string");
      } else {
        sanitizedCountry = trimmed;
      }
    }
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      errors
    };
  }

  return {
    isValid: true,
    errors: [],
    sanitized: {
      name: sanitizedName,
      url: sanitizedUrl,
      logo: sanitizedLogo,
      group: sanitizedGroup,
      id: sanitizedId,
      chno: sanitizedChno,
      country: sanitizedCountry
    }
  };
}

class ChannelService {
  private channels: Channel[] = [];
  private lastMtime: number = 0;

  /**
   * Resolves the path to the channel list file.
   * Prioritizes the environment variable (CHANNELS_FILE_PATH / CHANNEL_LIST_PATH).
   */
  public getPlaylistPath(): string {
    const envPath =
      process.env.CHANNELS_FILE_PATH ||
      process.env.CHANNEL_LIST_PATH ||
      process.env.CHANNELS_PATH;

    if (envPath) {
      return path.resolve(envPath);
    }

    const candidates = [
      path.resolve(process.cwd(), 'index.m3u8'),
      path.resolve(process.cwd(), '..', 'index.m3u8'),
      path.resolve(process.cwd(), 'backend', 'index.m3u8'),
      path.resolve(__dirname, '../../index.m3u8'),
      path.resolve(__dirname, '../../../index.m3u8'),
      path.resolve(__dirname, '../../../backend/index.m3u8')
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    return path.resolve(process.cwd(), 'index.m3u8');
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
   * Appends a channel directly from two raw M3U lines (Line 1: #EXTINF, Line 2: Stream URL).
   */
  public async addChannelFromM3ULines(rawExtinf: string, rawUrl: string): Promise<Channel> {
    const validation = validateM3ULines(rawExtinf, rawUrl);
    if (!validation.isValid || !validation.sanitized) {
      throw new ValidationError('M3U lines validation failed', validation.errors);
    }

    const { extinf, url, channel } = validation.sanitized;
    const playlistPath = this.getPlaylistPath();

    if (!fs.existsSync(playlistPath)) {
      fs.writeFileSync(playlistPath, '#EXTM3U\n', 'utf-8');
    }

    const existingContent = fs.readFileSync(playlistPath, 'utf-8');
    const separator = existingContent.endsWith('\n') ? '' : '\n';
    const newEntry = `${separator}${extinf}\n${url}\n`;

    fs.appendFileSync(playlistPath, newEntry, 'utf-8');
    console.log(`[ChannelService] Appended 2-line M3U channel '${channel.name}' to ${playlistPath}`);

    // Immediately reload channels cache
    await this.loadChannels(true);

    const reloaded = await this.loadChannels();
    const found = reloaded.find(c => c.url === channel.url) || reloaded[reloaded.length - 1] || channel;

    return found;
  }

  /**
   * Validates payload fields and appends the new channel to the playlist file.
   * Supports both structured JSON fields and raw 2-line M3U input.
   */
  public async addChannel(payload: any): Promise<Channel> {
    // 1. Check if raw 2-line input was passed
    if (typeof payload === 'string') {
      const lines = payload.trim().split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length >= 2) {
        return this.addChannelFromM3ULines(lines[0], lines[1]);
      }
    }

    if (payload && typeof payload === 'object') {
      const rawText = payload.raw ?? payload.rawM3U ?? payload.m3u ?? payload.content ?? payload.lines;
      if (typeof rawText === 'string') {
        const lines = rawText.trim().split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length >= 2) {
          return this.addChannelFromM3ULines(lines[0], lines[1]);
        }
      }

      if (Array.isArray(rawText) && rawText.length >= 2) {
        return this.addChannelFromM3ULines(rawText[0], rawText[1]);
      }

      if (typeof payload.extinf === 'string' && typeof payload.url === 'string' && payload.extinf.trim().toUpperCase().startsWith('#EXTINF')) {
        return this.addChannelFromM3ULines(payload.extinf, payload.url);
      }
    }

    // 2. Standard field validation
    const validation = validateChannelPayload(payload);
    if (!validation.isValid || !validation.sanitized) {
      throw new ValidationError('Channel payload validation failed', validation.errors);
    }

    const { name, url, logo, group, id, chno, country } = validation.sanitized;
    const playlistPath = this.getPlaylistPath();

    // Ensure playlist file exists
    if (!fs.existsSync(playlistPath)) {
      fs.writeFileSync(playlistPath, '#EXTM3U\n', 'utf-8');
    }

    // Ensure unique channel id
    const existingChannels = await this.loadChannels();
    const existingIds = new Set(existingChannels.map(c => c.id.toLowerCase()));
    let uniqueId = id;
    if (existingIds.has(uniqueId.toLowerCase())) {
      let counter = 2;
      while (existingIds.has(`${uniqueId.toLowerCase()}-${counter}`)) {
        counter++;
      }
      uniqueId = `${uniqueId}-${counter}`;
    }

    // Build #EXTINF line
    const attrs: string[] = [];
    attrs.push(`tvg-name="${escapeM3UAttribute(name)}"`);
    if (logo) {
      attrs.push(`tvg-logo="${escapeM3UAttribute(logo)}"`);
    }
    attrs.push(`tvg-id="${escapeM3UAttribute(uniqueId)}"`);
    if (chno) {
      attrs.push(`tvg-chno="${escapeM3UAttribute(chno)}"`);
    }
    if (country) {
      attrs.push(`tvg-country="${escapeM3UAttribute(country)}"`);
    }
    attrs.push(`group-title="${escapeM3UAttribute(group)}"`);

    const extinfLine = `#EXTINF:-1 ${attrs.join(' ')},${name}`;

    // Append to file
    const existingContent = fs.readFileSync(playlistPath, 'utf-8');
    const separator = existingContent.endsWith('\n') ? '' : '\n';
    const newEntry = `${separator}${extinfLine}\n${url}\n`;

    fs.appendFileSync(playlistPath, newEntry, 'utf-8');
    console.log(`[ChannelService] Appended new channel '${name}' (${uniqueId}) to ${playlistPath}`);

    // Immediately reload channels cache
    await this.loadChannels(true);

    return {
      id: uniqueId,
      name,
      logo,
      group,
      url
    };
  }

  /**
   * Deletes a channel from the M3U playlist file by its channel ID.
   * Returns the deleted Channel object, or null if not found.
   */
  public async deleteChannel(channelId: string): Promise<Channel | null> {
    if (!channelId || typeof channelId !== 'string') {
      return null;
    }

    const playlistPath = this.getPlaylistPath();
    if (!fs.existsSync(playlistPath)) {
      return null;
    }

    const content = fs.readFileSync(playlistPath, 'utf-8');
    const lines = content.split(/\r?\n/);
    const idCounts = new Map<string, number>();

    let currentExtinf: string | null = null;
    let currentExtinfIndex: number = -1;
    let targetEntry: {
      channel: Channel;
      extinfIndex: number;
      urlIndex: number;
    } | null = null;

    const trimmedTargetId = channelId.trim().toLowerCase();

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i];
      const line = rawLine.trim();

      if (!line) {
        continue;
      }

      if (line.startsWith('#EXTINF:')) {
        currentExtinf = line;
        currentExtinfIndex = i;
        continue;
      }

      if (line.startsWith('#')) {
        continue;
      }

      if (currentExtinf && currentExtinfIndex !== -1) {
        const url = line;

        const commaIndex = currentExtinf.indexOf(',');
        const rawTitle = commaIndex !== -1 ? currentExtinf.slice(commaIndex + 1).trim() : '';

        const tvgName = extractAttribute(currentExtinf, 'tvg-name');
        const tvgId = extractAttribute(currentExtinf, 'tvg-id');
        const tvgLogo = extractAttribute(currentExtinf, 'tvg-logo');
        const groupTitle = extractAttribute(currentExtinf, 'group-title');

        const name = tvgName || rawTitle || 'Unknown Channel';
        const logo = tvgLogo || '';
        const group = groupTitle || 'General';

        let baseId = tvgId || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `channel-${idCounts.size + 1}`;
        const count = idCounts.get(baseId) || 0;
        idCounts.set(baseId, count + 1);
        const uniqueId = count === 0 ? baseId : `${baseId}-${count + 1}`;

        if (!targetEntry && uniqueId.toLowerCase() === trimmedTargetId) {
          targetEntry = {
            channel: {
              id: uniqueId,
              name,
              logo,
              group,
              url
            },
            extinfIndex: currentExtinfIndex,
            urlIndex: i
          };
          break;
        }

        currentExtinf = null;
        currentExtinfIndex = -1;
      }
    }

    if (!targetEntry) {
      return null;
    }

    // Remove the target channel's EXTINF and URL lines
    const remainingLines = lines.filter((_, idx) => idx !== targetEntry!.extinfIndex && idx !== targetEntry!.urlIndex);
    const newContent = remainingLines.join('\n');
    fs.writeFileSync(playlistPath, newContent, 'utf-8');
    console.log(`[ChannelService] Deleted channel '${targetEntry.channel.name}' (${targetEntry.channel.id}) from ${playlistPath}`);

    // Immediately reload cache
    await this.loadChannels(true);

    return targetEntry.channel;
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
