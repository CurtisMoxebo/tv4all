import { EPGProgram, ChannelEPGResponse } from '../types/epg';

export class EPGService {
  private programsByChannel: Map<string, EPGProgram[]> = new Map();
  private lastUpdated: Date | null = null;

  /**
   * Parse an XMLTV formatted date string: YYYYMMDDhhmmss [+|-]zzzz
   */
  public parseXmltvDate(dateStr: string): Date {
    const match = dateStr.trim().match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(?:\s*([+-]\d{4}))?$/);
    if (!match) {
      const fallback = new Date(dateStr);
      return isNaN(fallback.getTime()) ? new Date() : fallback;
    }

    const [, year, month, day, hour, min, sec, tz] = match;
    let iso = `${year}-${month}-${day}T${hour}:${min}:${sec}`;
    if (tz) {
      iso += `${tz.slice(0, 3)}:${tz.slice(3, 5)}`;
    } else {
      iso += 'Z';
    }
    return new Date(iso);
  }

  /**
   * Decode basic XML character entities.
   */
  public decodeXml(str: string): string {
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
  }

  /**
   * Load and parse XMLTV content into the in-memory cache.
   */
  public loadXmltv(xmlContent: string): number {
    this.programsByChannel.clear();
    const programmeRegex = /<programme\s+([^>]*?)>([\s\S]*?)<\/programme>/gi;
    let match: RegExpExecArray | null;
    let count = 0;

    while ((match = programmeRegex.exec(xmlContent)) !== null) {
      const attrs = match[1];
      const body = match[2];

      const channelMatch = attrs.match(/channel="([^"]+)"/i);
      const startMatch = attrs.match(/start="([^"]+)"/i);
      const stopMatch = attrs.match(/stop="([^"]+)"/i);

      if (!channelMatch || !startMatch || !stopMatch) {
        continue;
      }

      const rawChannelId = channelMatch[1].trim();
      const start = this.parseXmltvDate(startMatch[1]);
      const stop = this.parseXmltvDate(stopMatch[1]);

      const titleMatch = body.match(/<title[^>]*>([^<]+)<\/title>/i);
      const descMatch = body.match(/<desc[^>]*>([^<]+)<\/desc>/i);
      const catMatch = body.match(/<category[^>]*>([^<]+)<\/category>/i);

      const title = titleMatch ? this.decodeXml(titleMatch[1].trim()) : 'Scheduled Program';
      const desc = descMatch ? this.decodeXml(descMatch[1].trim()) : undefined;
      const category = catMatch ? this.decodeXml(catMatch[1].trim()) : 'General';

      const durationMinutes = Math.round((stop.getTime() - start.getTime()) / (1000 * 60));

      const program: EPGProgram = {
        id: `${rawChannelId}-${start.getTime()}`,
        channelId: rawChannelId,
        title,
        desc,
        category,
        start: start.toISOString(),
        stop: stop.toISOString(),
        durationMinutes: Math.max(1, durationMinutes)
      };

      const key = rawChannelId.toLowerCase();
      const list = this.programsByChannel.get(key) || [];
      list.push(program);
      this.programsByChannel.set(key, list);
      count++;
    }

    // Sort programmes chronologically
    for (const list of this.programsByChannel.values()) {
      list.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    }

    this.lastUpdated = new Date();
    return count;
  }

  /**
   * Generate realistic time-slotted fallback programs when no XMLTV data is loaded.
   */
  private generateFallbackSchedule(channelId: string, channelName?: string, now = new Date()): EPGProgram[] {
    const programs: EPGProgram[] = [];
    const displayName = channelName || channelId;
    
    // Create slots aligned to 30 or 60-minute blocks around now
    const baseHour = new Date(now);
    baseHour.setMinutes(0, 0, 0);

    const slotThemes = [
      { title: `${displayName} - Live Edition`, desc: `Live rolling coverage, news reports, and interactive analysis on ${displayName}.`, category: 'Live' },
      { title: `${displayName} - Journal & Actualités`, desc: `Comprehensive daily briefing, world headlines, and investigative reporting.`, category: 'News' },
      { title: `${displayName} - Grand Format & Débat`, desc: `In-depth discussions with featured guests, experts, and documentary perspectives.`, category: 'Magazine' },
      { title: `${displayName} - Soirée Spéciale`, desc: `Evening prime-time broadcast featuring special broadcasts and entertainment.`, category: 'Special' },
      { title: `${displayName} - Nuit Info & Rediffusion`, desc: `Nighttime recap, cultural highlights, and international stream relay.`, category: 'Information' }
    ];

    // Generate 6 consecutive 1-hour slots starting from 1 hour before now
    for (let i = -1; i < 5; i++) {
      const start = new Date(baseHour.getTime() + i * 3600 * 1000);
      const stop = new Date(start.getTime() + 3600 * 1000);
      const themeIndex = Math.abs((start.getHours() + displayName.length) % slotThemes.length);
      const theme = slotThemes[themeIndex];

      programs.push({
        id: `fb-${channelId}-${start.getTime()}`,
        channelId,
        title: theme.title,
        desc: theme.desc,
        category: theme.category,
        start: start.toISOString(),
        stop: stop.toISOString(),
        durationMinutes: 60
      });
    }

    return programs;
  }

  /**
   * Retrieves current program and upcoming schedule for a specific channel.
   */
  public getChannelEPG(channelId: string, channelName?: string, referenceTime = new Date()): ChannelEPGResponse {
    const key = channelId.toLowerCase();
    let programs = this.programsByChannel.get(key);
    let hasEpg = true;

    // If not found by channelId, try channelName
    if ((!programs || programs.length === 0) && channelName) {
      programs = this.programsByChannel.get(channelName.toLowerCase());
    }

    // If still no real XMLTV entries, generate fallback schedule
    if (!programs || programs.length === 0) {
      hasEpg = false;
      programs = this.generateFallbackSchedule(channelId, channelName, referenceTime);
    }

    const nowTime = referenceTime.getTime();

    // Find currently active program
    let current: EPGProgram | null = null;
    const upcoming: EPGProgram[] = [];

    for (const prog of programs) {
      const startTime = new Date(prog.start).getTime();
      const stopTime = new Date(prog.stop).getTime();

      if (startTime <= nowTime && stopTime > nowTime) {
        const totalDuration = stopTime - startTime;
        const elapsed = nowTime - startTime;
        const progress = totalDuration > 0 ? Math.min(100, Math.max(0, Math.floor((elapsed / totalDuration) * 100))) : 0;

        current = {
          ...prog,
          progress
        };
      } else if (startTime > nowTime) {
        upcoming.push(prog);
      }
    }

    // Sort upcoming and limit to next 5 programs
    upcoming.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    const limitedUpcoming = upcoming.slice(0, 5);

    return {
      channelId,
      channelName: channelName || channelId,
      hasEpg,
      current,
      upcoming: limitedUpcoming,
      updatedAt: this.lastUpdated ? this.lastUpdated.toISOString() : new Date().toISOString()
    };
  }

  /**
   * Check how many channels currently have cached XMLTV data.
   */
  public getChannelCount(): number {
    return this.programsByChannel.size;
  }
}

export const epgService = new EPGService();

