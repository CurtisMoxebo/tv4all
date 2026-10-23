export type BroadcastStatus = 'idle' | 'connecting' | 'broadcasting' | 'error' | 'closed';

export interface BroadcastClientInfo {
  id: string;
  ip?: string;
  connectedAt: string;
}

export interface BroadcastSummary {
  channelId: string;
  channelName: string;
  channelUrl: string;
  status: BroadcastStatus;
  viewersCount: number;
  clients: BroadcastClientInfo[];
  bytesTransferred: number;
  startedAt: string;
  uptimeSeconds: number;
}

