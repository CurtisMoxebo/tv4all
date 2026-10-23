import { EventEmitter } from 'events';
import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { Channel } from '../../types/channel';
import { BroadcastStatus, BroadcastSummary } from '../../types/broadcast';
import { loggerService } from '../loggerService';

interface ConnectedClient {
  id: string;
  ip?: string;
  connectedAt: Date;
  req: ExpressRequest;
  res: ExpressResponse;
}

const DISCONNECT_GRACE_PERIOD_MS = 2500; // 2.5 seconds grace period for brief reconnections
const MAX_BUFFER_BYTES = 4 * 1024 * 1024; // 4 MB ring buffer for immediate playback on new viewer join
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export class ChannelBroadcast extends EventEmitter {
  public readonly channel: Channel;
  public status: BroadcastStatus = 'idle';
  public bytesTransferred: number = 0;
  public startedAt: Date = new Date();

  private clients = new Map<string, ConnectedClient>();
  private abortController: AbortController | null = null;
  private disconnectTimer: NodeJS.Timeout | null = null;
  private recentBuffer: Buffer[] = [];
  private recentBufferTotalBytes = 0;
  private contentType: string = 'video/mp2t';
  private loopRunning = false;

  constructor(channel: Channel) {
    super();
    this.channel = channel;
  }

  public get channelId(): string {
    return this.channel.id;
  }

  public get clientCount(): number {
    return this.clients.size;
  }

  /**
   * Starts the upstream broadcast if not already started.
   */
  public async start(): Promise<void> {
    if (this.status === 'broadcasting' || this.status === 'connecting') {
      return;
    }

    this.status = 'connecting';
    this.startedAt = new Date();
    this.abortController = new AbortController();
    this.loopRunning = true;

    loggerService.info(`[Broadcast ${this.channelId}] Starting broadcast from upstream: ${this.channel.url}`);

    // Run upstream worker loop asynchronously
    this.runUpstreamLoop().catch(err => {
      console.error(`[Broadcast ${this.channelId}] Upstream stream error:`, err);
      this.status = 'error';
      this.broadcastError(err);
      this.stop();
    });
  }

  /**
   * Adds a client to the broadcast.
   */
  public addClient(clientId: string, req: ExpressRequest, res: ExpressResponse): void {
    // Cancel pending disconnect timeout if another client joins
    if (this.disconnectTimer) {
      clearTimeout(this.disconnectTimer);
      this.disconnectTimer = null;
      console.log(`[Broadcast ${this.channelId}] Reconnection before timeout; keeping broadcast alive.`);
    }

    const clientIp = loggerService.getClientIp(req);

    // Set streaming HTTP headers
    res.writeHead(200, {
      'Content-Type': this.contentType || 'video/mp2t',
      'Transfer-Encoding': 'chunked',
      'Connection': 'keep-alive',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Access-Control-Allow-Origin': '*'
    });

    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    // Send recent cached buffer chunks so the client starts playback immediately
    if (this.recentBuffer.length > 0) {
      for (const chunk of this.recentBuffer) {
        try {
          res.write(chunk);
        } catch (e) {
          // ignore write errors here; handled by error/close listener
        }
      }
    }

    const client: ConnectedClient = {
      id: clientId,
      ip: clientIp,
      connectedAt: new Date(),
      req,
      res
    };

    this.clients.set(clientId, client);
    loggerService.info(`[Broadcast ${this.channelId}] Client ${clientId} joined. Total viewers: ${this.clients.size}`, clientIp);

    // Handle client disconnect
    const handleClose = () => {
      this.removeClient(clientId);
    };

    req.on('close', handleClose);
    res.on('close', handleClose);
    res.on('error', handleClose);
  }

  /**
   * Removes a client from the broadcast.
   */
  public removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) {
      return;
    }

    this.clients.delete(clientId);
    loggerService.info(`[Broadcast ${this.channelId}] Client ${clientId} disconnected. Remaining viewers: ${this.clients.size}`, client.ip);

    try {
      if (!client.res.writableEnded) {
        client.res.end();
      }
    } catch {
      // already closed
    }

    // If every client disconnects, schedule broadcast shutdown
    if (this.clients.size === 0) {
      console.log(`[Broadcast ${this.channelId}] All clients disconnected. Will close broadcast in ${DISCONNECT_GRACE_PERIOD_MS}ms if no new viewers join.`);

      if (this.disconnectTimer) {
        clearTimeout(this.disconnectTimer);
      }

      this.disconnectTimer = setTimeout(() => {
        if (this.clients.size === 0) {
          console.log(`[Broadcast ${this.channelId}] Grace period expired with 0 viewers. Closing broadcast now.`);
          this.stop();
        }
      }, DISCONNECT_GRACE_PERIOD_MS);
    }
  }

  /**
   * Broadcasts a binary chunk to all currently connected clients.
   */
  private broadcastChunk(chunk: Uint8Array): void {
    const buffer = Buffer.from(chunk);
    this.bytesTransferred += buffer.byteLength;

    // Maintain recent buffer
    this.recentBuffer.push(buffer);
    this.recentBufferTotalBytes += buffer.byteLength;
    while (this.recentBufferTotalBytes > MAX_BUFFER_BYTES && this.recentBuffer.length > 1) {
      const removed = this.recentBuffer.shift();
      if (removed) {
        this.recentBufferTotalBytes -= removed.byteLength;
      }
    }

    // Write chunk to all clients
    for (const [clientId, client] of this.clients.entries()) {
      try {
        const ok = client.res.write(buffer);
        if (!ok) {
          // Client buffer full; wait for drain or drop
        }
      } catch (err) {
        console.error(`[Broadcast ${this.channelId}] Error writing to client ${clientId}:`, err);
        this.removeClient(clientId);
      }
    }
  }

  /**
   * Upstream worker loop. Detects HLS vs continuous stream and reads chunks.
   */
  private async runUpstreamLoop(): Promise<void> {
    if (!this.abortController) {
      return;
    }

    const signal = this.abortController.signal;

    // Initial probe of the URL
    const probeRes = await fetch(this.channel.url, {
      signal,
      headers: {
        'User-Agent': USER_AGENT
      }
    });

    if (!probeRes.ok) {
      throw new Error(`Upstream server returned HTTP ${probeRes.status} ${probeRes.statusText}`);
    }

    const contentType = probeRes.headers.get('content-type') || '';

    // Check if it's an HTML page (like a YouTube web page rather than a media stream)
    if (contentType.includes('text/html')) {
      const htmlSnippet = await probeRes.text();
      throw new Error(`Upstream URL returned HTML content rather than a stream. Direct web pages (e.g. YouTube/DailyMotion) require stream extraction: ${htmlSnippet.slice(0, 100)}`);
    }

    const isHls = this.channel.url.includes('.m3u8') ||
                  contentType.includes('mpegurl') ||
                  contentType.includes('application/x-mpegURL');

    this.status = 'broadcasting';

    if (isHls) {
      await this.runHlsWorkerLoop(signal);
    } else {
      await this.runContinuousStreamLoop(probeRes, signal);
    }
  }

  /**
   * Resolves an HLS Master Playlist to the actual child Media Playlist URL.
   */
  private async resolveMediaPlaylistUrl(initialUrl: string, signal: AbortSignal): Promise<string> {
    let currentUrl = initialUrl;
    let attempts = 0;

    while (attempts < 3) {
      attempts++;
      try {
        const res = await fetch(currentUrl, {
          signal,
          headers: { 'User-Agent': USER_AGENT }
        });

        if (!res.ok) {
          return currentUrl;
        }

        const text = await res.text();
        if (!text.includes('#EXT-X-STREAM-INF')) {
          return currentUrl;
        }

        const lines = text.split(/\r?\n/);
        let selectedVariant: string | null = null;
        let highestBandwidth = -1;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.startsWith('#EXT-X-STREAM-INF')) {
            const bwMatch = line.match(/BANDWIDTH=(\d+)/i);
            const bw = bwMatch ? parseInt(bwMatch[1], 10) : 0;

            for (let j = i + 1; j < lines.length; j++) {
              const nextLine = lines[j].trim();
              if (nextLine && !nextLine.startsWith('#')) {
                if (bw > highestBandwidth || !selectedVariant) {
                  highestBandwidth = bw;
                  selectedVariant = nextLine;
                }
                break;
              }
            }
          }
        }

        if (selectedVariant) {
          currentUrl = new URL(selectedVariant, currentUrl).toString();
          console.log(`[Broadcast ${this.channelId}] Resolved variant playlist: ${currentUrl}`);
        } else {
          break;
        }
      } catch {
        break;
      }
    }

    return currentUrl;
  }

  /**
   * Handles continuous HTTP live streams (e.g. raw MPEG-TS, MP4, Icecast).
   */
  private async runContinuousStreamLoop(response: globalThis.Response, signal: AbortSignal): Promise<void> {
    if (!response.body) {
      throw new Error('Upstream response body is null');
    }

    const ct = response.headers.get('content-type');
    if (ct) {
      this.contentType = ct;
    }

    const reader = response.body.getReader();
    try {
      while (this.loopRunning && !signal.aborted) {
        const { done, value } = await reader.read();
        if (done) {
          console.log(`[Broadcast ${this.channelId}] Upstream continuous stream finished`);
          break;
        }

        if (value) {
          this.broadcastChunk(value);
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Handles HLS streams (.m3u8) by polling playlist and streaming .ts segments in order.
   */
  private async runHlsWorkerLoop(signal: AbortSignal): Promise<void> {
    this.contentType = 'video/mp2t';
    const seenSegments = new Set<string>();
    let targetDurationSec = 2;
    let mediaPlaylistUrl = await this.resolveMediaPlaylistUrl(this.channel.url, signal);

    while (this.loopRunning && !signal.aborted) {
      try {
        const playlistRes = await fetch(mediaPlaylistUrl, {
          signal,
          headers: {
            'User-Agent': USER_AGENT
          }
        });

        if (!playlistRes.ok) {
          console.warn(`[Broadcast ${this.channelId}] Failed to fetch HLS playlist: HTTP ${playlistRes.status}`);
          // Attempt re-resolving in case stream URL expired
          mediaPlaylistUrl = await this.resolveMediaPlaylistUrl(this.channel.url, signal);
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }

        const playlistText = await playlistRes.text();

        // If returned text is still master playlist, re-resolve
        if (playlistText.includes('#EXT-X-STREAM-INF')) {
          mediaPlaylistUrl = await this.resolveMediaPlaylistUrl(mediaPlaylistUrl, signal);
          continue;
        }

        // Extract target duration if specified
        const targetMatch = playlistText.match(/#EXT-X-TARGETDURATION:\s*(\d+)/i);
        if (targetMatch) {
          targetDurationSec = Math.max(1, parseInt(targetMatch[1], 10));
        }

        // Extract segment lines (lines that do not start with # and do not end in .m3u8)
        const lines = playlistText.split(/\r?\n/);
        const segmentUrls: string[] = [];

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#') && !trimmed.includes('.m3u8')) {
            const absoluteUrl = new URL(trimmed, mediaPlaylistUrl).toString();
            segmentUrls.push(absoluteUrl);
          }
        }

        // Fast join: on initial startup, skip older segments and only fetch latest 2
        if (seenSegments.size === 0 && segmentUrls.length > 2) {
          const toSkip = segmentUrls.slice(0, segmentUrls.length - 2);
          for (const s of toSkip) {
            seenSegments.add(s);
          }
        }

        // Download and stream any new segments
        for (const segUrl of segmentUrls) {
          if (signal.aborted || !this.loopRunning) break;

          if (!seenSegments.has(segUrl)) {
            seenSegments.add(segUrl);

            // Limit memory of seen segments set
            if (seenSegments.size > 200) {
              const first = seenSegments.values().next().value;
              if (first) seenSegments.delete(first);
            }

            try {
              const segRes = await fetch(segUrl, {
                signal,
                headers: { 'User-Agent': USER_AGENT }
              });

              if (segRes.ok && segRes.body) {
                const reader = segRes.body.getReader();
                while (this.loopRunning && !signal.aborted) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  if (value) {
                    this.broadcastChunk(value);
                  }
                }
              }
            } catch (err) {
              if (signal.aborted) break;
              console.warn(`[Broadcast ${this.channelId}] Error fetching segment ${segUrl}: ${(err as Error).message}`);
            }
          }
        }

        // Wait before refreshing playlist (approx target duration * 0.75)
        const waitMs = Math.max(1000, Math.floor(targetDurationSec * 750));
        await new Promise(r => setTimeout(r, waitMs));
      } catch (err) {
        if (signal.aborted) break;
        console.warn(`[Broadcast ${this.channelId}] Playlist polling error: ${(err as Error).message}`);
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }

  private broadcastError(err: Error): void {
    for (const [clientId, client] of this.clients.entries()) {
      try {
        if (!client.res.headersSent) {
          client.res.status(502).json({
            error: 'Upstream Stream Error',
            message: err.message
          });
        } else {
          client.res.end();
        }
      } catch {
        // ignore
      }
      this.clients.delete(clientId);
    }
  }

  /**
   * Stops the broadcast and closes upstream connection.
   */
  public stop(): void {
    if (this.status === 'closed') {
      return;
    }

    loggerService.info(`[Broadcast ${this.channelId}] Stopping broadcast...`);
    this.status = 'closed';
    this.loopRunning = false;

    if (this.disconnectTimer) {
      clearTimeout(this.disconnectTimer);
      this.disconnectTimer = null;
    }

    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    // Close any remaining connected clients
    for (const [clientId, client] of this.clients.entries()) {
      try {
        if (!client.res.writableEnded) {
          client.res.end();
        }
      } catch {
        // ignore
      }
    }
    this.clients.clear();
    this.recentBuffer = [];
    this.recentBufferTotalBytes = 0;

    this.emit('close', this.channelId);
  }

  /**
   * Returns a snapshot summary of the broadcast.
   */
  public getSummary(): BroadcastSummary {
    const clientsList = Array.from(this.clients.values()).map(c => ({
      id: c.id,
      ip: c.ip,
      connectedAt: c.connectedAt.toISOString()
    }));

    const now = Date.now();
    const uptimeSeconds = Math.floor((now - this.startedAt.getTime()) / 1000);

    return {
      channelId: this.channelId,
      channelName: this.channel.name,
      channelUrl: this.channel.url,
      status: this.status,
      viewersCount: this.clients.size,
      clients: clientsList,
      bytesTransferred: this.bytesTransferred,
      startedAt: this.startedAt.toISOString(),
      uptimeSeconds
    };
  }
}
