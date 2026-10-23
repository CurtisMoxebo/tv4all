export interface Channel {
  id: string;
  name: string;
  logo: string;
  group: string;
  url: string;
}

export type ChannelSummary = Omit<Channel, 'url'>;

export interface GroupInfo {
  name: string;
  count: number;
}


