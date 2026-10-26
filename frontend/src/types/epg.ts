export interface EPGProgram {
  id: string;
  channelId: string;
  title: string;
  desc?: string;
  category?: string;
  start: string;
  stop: string;
  progress?: number;
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

