process.env.NODE_ENV = 'test';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/index';
import { authService } from '../src/services/authService';
import { BroadcastManager } from '../src/services/broadcast/BroadcastManager';
import { Channel } from '../src/types/channel';

describe('Health, API Info & Stream Status Regression Tests', () => {
  const token = authService.generateToken('tv4alladmin', 'admin');

  describe('GET /api/health (Public)', () => {
    it('should return 200 with status ok and uptime without authentication', async () => {
      const res = await request(app).get('/api/health');

      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'ok');
      assert.equal(typeof res.body.uptime, 'number');
      assert.ok(res.body.timestamp);
    });
  });

  describe('GET /api (API Schema Index)', () => {
    it('should return 200 with API version and endpoint map', async () => {
      const res = await request(app).get('/api');

      assert.equal(res.status, 200);
      assert.equal(res.body.name, 'TV4ALL IPTV relay backend');
      assert.ok(res.body.endpoints);
      assert.equal(res.body.endpoints.health, '/api/health');
      assert.equal(res.body.endpoints.auth, '/api/auth/login');
      assert.equal(res.body.endpoints.channels, '/api/channels');
    });
  });

  describe('Broadcast & Stream Status Endpoints (Protected)', () => {
    it('GET /api/broadcasts should reject unauthenticated request with 401', async () => {
      const res = await request(app).get('/api/broadcasts');
      assert.equal(res.status, 401);
    });

    it('GET /api/broadcasts should return active broadcasts array when authenticated', async () => {
      const res = await request(app)
        .get('/api/broadcasts')
        .set('Authorization', `Bearer ${token}`);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body));
    });

    it('GET /api/stream/active should return active stream count and broadcasts', async () => {
      const res = await request(app)
        .get('/api/stream/active')
        .set('Authorization', `Bearer ${token}`);

      assert.equal(res.status, 200);
      assert.equal(typeof res.body.count, 'number');
      assert.ok(Array.isArray(res.body.broadcasts));
    });

    it('GET /api/stream/:channelId/status should report idle status when channel has no active stream', async () => {
      const res = await request(app)
        .get('/api/stream/some-idle-channel/status')
        .set('Authorization', `Bearer ${token}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.channelId, 'some-idle-channel');
      assert.equal(res.body.status, 'idle');
      assert.equal(res.body.active, false);
      assert.equal(res.body.viewersCount, 0);
    });

    it('GET /api/stream/:channelId should return 404 for non-existent channel', async () => {
      const res = await request(app)
        .get('/api/stream/non-existent-channel-id')
        .set('Authorization', `Bearer ${token}`);

      assert.equal(res.status, 404);
      assert.ok(res.body.message.includes('not found'));
    });

    it('DELETE /api/stream/:channelId should return 404 when stopping non-existent broadcast', async () => {
      const res = await request(app)
        .delete('/api/stream/non-existent-broadcast')
        .set('Authorization', `Bearer ${token}`);

      assert.equal(res.status, 404);
      assert.ok(res.body.error);
    });
  });

  describe('BroadcastManager Unit Tests', () => {
    it('should manage lifecycle of channel broadcasts', () => {
      const manager = new BroadcastManager();
      const testChannel: Channel = {
        id: 'test-bc-channel',
        name: 'Test BC Channel',
        logo: '',
        group: 'General',
        url: 'http://127.0.0.1:9999/dummy.m3u8'
      };

      assert.equal(manager.getActiveBroadcasts().length, 0);

      // Create broadcast
      const broadcast = manager.getOrCreateBroadcast(testChannel);
      assert.ok(broadcast);
      assert.equal(broadcast.channelId, 'test-bc-channel');

      // Fetch broadcast
      const fetched = manager.getBroadcast('test-bc-channel');
      assert.equal(fetched, broadcast);

      // Active broadcasts list
      const actives = manager.getActiveBroadcasts();
      assert.equal(actives.length, 1);
      assert.equal(actives[0].channelId, 'test-bc-channel');

      // Stop single broadcast
      const stopped = manager.stopBroadcast('test-bc-channel');
      assert.equal(stopped, true);
      assert.equal(manager.getBroadcast('test-bc-channel'), undefined);

      // Stop all on empty/populated
      const bc2 = manager.getOrCreateBroadcast(testChannel);
      assert.ok(bc2);
      manager.stopAll();
      assert.equal(manager.getActiveBroadcasts().length, 0);
    });
  });

  describe('404 Not Found Handler', () => {
    it('should return 404 for non-existent routes', async () => {
      const res = await request(app).get('/api/non-existent-endpoint-xyz');
      assert.equal(res.status, 404);
      assert.equal(res.body.error, 'Not Found');
    });
  });
});

