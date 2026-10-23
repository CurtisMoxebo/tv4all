import { Channel } from '../../types/channel';
import { BroadcastSummary } from '../../types/broadcast';
import { ChannelBroadcast } from './ChannelBroadcast';

export class BroadcastManager {
  private broadcasts = new Map<string, ChannelBroadcast>();

  /**
   * Retrieves an existing broadcast or opens a new one for the specified channel.
   */
  public getOrCreateBroadcast(channel: Channel): ChannelBroadcast {
    const existing = this.broadcasts.get(channel.id);
    if (existing && existing.status !== 'closed' && existing.status !== 'error') {
      return existing;
    }

    const broadcast = new ChannelBroadcast(channel);

    broadcast.on('close', (channelId: string) => {
      console.log(`[BroadcastManager] Removing closed broadcast for channel '${channelId}'`);
      this.broadcasts.delete(channelId);
    });

    this.broadcasts.set(channel.id, broadcast);
    broadcast.start();

    return broadcast;
  }

  /**
   * Retrieves an active broadcast by channel ID if it exists.
   */
  public getBroadcast(channelId: string): ChannelBroadcast | undefined {
    return this.broadcasts.get(channelId);
  }

  /**
   * Returns a list of summaries for all active broadcasts.
   */
  public getActiveBroadcasts(): BroadcastSummary[] {
    return Array.from(this.broadcasts.values()).map(b => b.getSummary());
  }

  /**
   * Manually stop a broadcast for a specific channel.
   */
  public stopBroadcast(channelId: string): boolean {
    const broadcast = this.broadcasts.get(channelId);
    if (!broadcast) {
      return false;
    }
    broadcast.stop();
    this.broadcasts.delete(channelId);
    return true;
  }

  /**
   * Stop all active broadcasts (e.g. during server shutdown).
   */
  public stopAll(): void {
    console.log(`[BroadcastManager] Stopping all (${this.broadcasts.size}) active broadcasts...`);
    for (const broadcast of this.broadcasts.values()) {
      broadcast.stop();
    }
    this.broadcasts.clear();
  }
}

export const broadcastManager = new BroadcastManager();

