process.env.NODE_ENV = 'test';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'events';
import { ChannelBroadcast } from '../src/services/broadcast/ChannelBroadcast';
import { Channel } from '../src/types/channel';

function createMockHttpPair() {
  const req = new EventEmitter() as any;
  req.socket = {
    setNoDelay: () => {},
    remoteAddress: '127.0.0.1'
  };
  req.headers = {};

  const res = new EventEmitter() as any;
  res.writtenHeaders = null;
  res.writtenChunks = [];
  res.writableEnded = false;

  res.writeHead = (status: number, headers: any) => {
    res.writtenStatus = status;
    res.writtenHeaders = headers;
    return res;
  };

  res.flushHeaders = () => {};

  res.write = (chunk: any) => {
    res.writtenChunks.push(chunk);
    return true;
  };

  res.end = () => {
    res.writableEnded = true;
    res.emit('close');
  };

  return { req, res };
}

describe('ChannelBroadcast Regression & Unit Tests', () => {
  const sampleChannel: Channel = {
    id: 'france2.fr',
    name: 'France 2 HD',
    logo: 'https://example.com/logo.png',
    group: 'General',
    url: 'http://127.0.0.1:8999/dummy.m3u8'
  };

  it('should initialize with idle status and correct properties', () => {
    const broadcast = new ChannelBroadcast(sampleChannel);

    assert.equal(broadcast.channelId, 'france2.fr');
    assert.equal(broadcast.channel.name, 'France 2 HD');
    assert.equal(broadcast.status, 'idle');
    assert.equal(broadcast.clientCount, 0);
    assert.equal(broadcast.bytesTransferred, 0);
    assert.ok(broadcast.startedAt instanceof Date);
  });

  it('should add a client, configure headers, and track viewers count', () => {
    const broadcast = new ChannelBroadcast(sampleChannel);
    const { req, res } = createMockHttpPair();

    broadcast.addClient('client-1', req, res);

    assert.equal(broadcast.clientCount, 1);
    assert.equal(res.writtenStatus, 200);
    assert.ok(res.writtenHeaders);
    assert.equal(res.writtenHeaders['Transfer-Encoding'], 'chunked');
    assert.equal(res.writtenHeaders['Cache-Control'], 'no-cache, no-store, must-revalidate');

    const summary = broadcast.getSummary();
    assert.equal(summary.viewersCount, 1);
    assert.equal(summary.channelId, 'france2.fr');
    assert.equal(summary.clients.length, 1);
    assert.equal(summary.clients[0].id, 'client-1');

    // Clean up
    broadcast.stop();
  });

  it('should handle client disconnect and decrement viewer count', () => {
    const broadcast = new ChannelBroadcast(sampleChannel);
    const { req, res } = createMockHttpPair();

    broadcast.addClient('client-1', req, res);
    assert.equal(broadcast.clientCount, 1);

    // Trigger close on client response
    res.emit('close');
    assert.equal(broadcast.clientCount, 0);

    broadcast.stop();
  });

  it('should close all connected clients and emit close event when stop is called', () => {
    const broadcast = new ChannelBroadcast(sampleChannel);
    const client1 = createMockHttpPair();
    const client2 = createMockHttpPair();

    broadcast.addClient('client-1', client1.req, client1.res);
    broadcast.addClient('client-2', client2.req, client2.res);
    assert.equal(broadcast.clientCount, 2);

    let closeEmitted = false;
    broadcast.on('close', (channelId: string) => {
      closeEmitted = true;
      assert.equal(channelId, 'france2.fr');
    });

    broadcast.stop();

    assert.equal(broadcast.status, 'closed');
    assert.equal(broadcast.clientCount, 0);
    assert.equal(closeEmitted, true);
    assert.equal(client1.res.writableEnded, true);
    assert.equal(client2.res.writableEnded, true);
  });

  it('should generate comprehensive summary report via getSummary', () => {
    const broadcast = new ChannelBroadcast(sampleChannel);
    const { req, res } = createMockHttpPair();

    broadcast.addClient('client-summary-test', req, res);
    const summary = broadcast.getSummary();

    assert.equal(summary.channelId, 'france2.fr');
    assert.equal(summary.channelName, 'France 2 HD');
    assert.equal(summary.channelUrl, 'http://127.0.0.1:8999/dummy.m3u8');
    assert.equal(typeof summary.uptimeSeconds, 'number');
    assert.equal(summary.viewersCount, 1);
    assert.ok(summary.startedAt);

    broadcast.stop();
  });
});

