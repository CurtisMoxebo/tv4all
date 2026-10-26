export interface EPGProgram {
  id: string;
  channelId: string;
  title: string;
  desc?: string;
  category?: string;
  start: string; // ISO 8601 string
  stop: string;  // ISO 8601 string
  progress?: number; // 0 - 100 percentage
  durationMinutes?: number;
}

export interface ChannelEPGResponse {
  channelId: string;
  channelName?: string;
  hasEpg: boolean;
  current: EPGProgram | null;
  upcoming: EPGProgram[];
  updatedAt: string;
}

