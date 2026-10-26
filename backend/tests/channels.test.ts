process.env.NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/index';
import { channelService } from '../src/services/channelService';
import { createTestContext, TestContext } from './helpers';

describe('Channel Routes & Service Regression Tests', () => {
  let ctx: TestContext;

  before(async () => {
    ctx = createTestContext();
    // Force channelService to load the fresh test playlist
    await channelService.loadChannels(true);
  });

  after(() => {
    ctx.cleanup();
  });

  describe('GET /api/channels', () => {
    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).get('/api/channels');
      assert.equal(res.status, 401);
    });

    it('should return initial list of 3 test channels when authenticated', async () => {
      const res = await request(app)
        .get('/api/channels')
        .set('Authorization', `Bearer ${ctx.userToken}`);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body));
      assert.equal(res.body.length, 3);
      assert.ok(res.body.some((c: any) => c.id === 'France2.fr'));
      assert.ok(res.body.some((c: any) => c.id === 'France3.fr'));
      assert.ok(res.body.some((c: any) => c.id === 'France24.fr'));
    });

    it('should filter channels by group parameter (?group=News)', async () => {
      const res = await request(app)
        .get('/api/channels?group=News')
        .set('Authorization', `Bearer ${ctx.userToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.length, 1);
      assert.equal(res.body[0].id, 'France24.fr');
    });

    it('should search channels by name or ID (?search=France 3)', async () => {
      const res = await request(app)
        .get('/api/channels?search=France%203')
        .set('Authorization', `Bearer ${ctx.userToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.length, 1);
      assert.equal(res.body[0].name, 'France 3');
    });
  });

  describe('POST /api/channels (Form Add)', () => {
    it('should reject channel creation with missing name or url with 400', async () => {
      const res = await request(app)
        .post('/api/channels')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({ group: 'General' });

      assert.equal(res.status, 400);
      assert.ok(res.body.errors);
      assert.ok(res.body.errors.length >= 2);
    });

    it('should reject channel creation with invalid stream URL with 400', async () => {
      const res = await request(app)
        .post('/api/channels')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({
          name: 'Invalid Channel',
          url: 'ftp://not-a-valid-http-url'
        });

      assert.equal(res.status, 400);
      assert.ok(res.body.errors.some((e: string) => e.includes('HTTP or HTTPS')));
    });

    it('should successfully add a new channel and persist to playlist file', async () => {
      const newChannelPayload = {
        name: 'TF1 HD',
        id: 'TF1.fr',
        group: 'General',
        logo: 'https://example.com/tf1.png',
        url: 'https://stream.example.com/tf1.m3u8'
      };

      const res = await request(app)
        .post('/api/channels')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send(newChannelPayload);

      assert.equal(res.status, 201);
      assert.equal(res.body.message, 'Channel added successfully');
      assert.equal(res.body.channel.id, 'TF1.fr');
      assert.equal(res.body.channel.name, 'TF1 HD');

      // Verify channel now appears in GET /api/channels
      const listRes = await request(app)
        .get('/api/channels?refresh=true')
        .set('Authorization', `Bearer ${ctx.userToken}`);

      assert.equal(listRes.status, 200);
      assert.ok(listRes.body.some((c: any) => c.id === 'TF1.fr'));
    });

    it('should automatically assign unique suffix when adding channel with existing ID', async () => {
      const res = await request(app)
        .post('/api/channels')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({
          name: 'TF1 Duplicate',
          id: 'TF1.fr',
          url: 'https://stream.example.com/tf1-dup.m3u8'
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.channel.id, 'TF1.fr-2');
    });

    it('should support POST /api/channels/add alias endpoint', async () => {
      const res = await request(app)
        .post('/api/channels/add')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({
          name: 'Arte HD',
          id: 'Arte.fr',
          group: 'Culture',
          url: 'https://stream.example.com/arte.m3u8'
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.channel.id, 'Arte.fr');
    });
  });

  describe('POST /api/channels/raw (Raw 2 M3U Lines)', () => {
    it('should reject raw lines with missing or empty content with 400', async () => {
      const res = await request(app)
        .post('/api/channels/raw')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send('');

      assert.equal(res.status, 400);
    });

    it('should reject raw lines missing #EXTINF directive with 400', async () => {
      const res = await request(app)
        .post('/api/channels/raw')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .set('Content-Type', 'text/plain')
        .send('Invalid First Line\nhttp://stream.example.com/live.m3u8');

      assert.equal(res.status, 400);
      assert.ok(res.body.errors.some((e: string) => e.includes('#EXTINF:')));
    });

    it('should add channel from raw plain text (2 lines)', async () => {
      const rawText = '#EXTINF:-1 tvg-id="M6.fr" tvg-name="M6" group-title="Entertainment",M6\nhttps://stream.example.com/m6.m3u8';

      const res = await request(app)
        .post('/api/channels/raw')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .set('Content-Type', 'text/plain')
        .send(rawText);

      assert.equal(res.status, 201);
      assert.equal(res.body.channel.id, 'M6.fr');
      assert.equal(res.body.channel.name, 'M6');
      assert.equal(res.body.channel.group, 'Entertainment');
    });

    it('should add channel from JSON body containing extinf and url', async () => {
      const payload = {
        extinf: '#EXTINF:-1 tvg-id="W9.fr" tvg-name="W9" group-title="Music",W9',
        url: 'https://stream.example.com/w9.m3u8'
      };

      const res = await request(app)
        .post('/api/channels/raw')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send(payload);

      assert.equal(res.status, 201);
      assert.equal(res.body.channel.id, 'W9.fr');
      assert.equal(res.body.channel.name, 'W9');
    });
  });

  describe('DELETE /api/channels/:id and Deletion Aliases', () => {
    it('should return 404 when attempting to delete non-existent channel', async () => {
      const res = await request(app)
        .delete('/api/channels/nonexistent-channel-id')
        .set('Authorization', `Bearer ${ctx.adminToken}`);

      assert.equal(res.status, 404);
      assert.equal(res.body.error, 'Not Found');
    });

    it('should successfully delete channel by ID and remove from playlist', async () => {
      // Delete France2.fr
      const res = await request(app)
        .delete('/api/channels/France2.fr')
        .set('Authorization', `Bearer ${ctx.adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.message, 'Channel deleted successfully');
      assert.equal(res.body.channel.id, 'France2.fr');

      // Verify channel is gone in subsequent GET
      const listRes = await request(app)
        .get('/api/channels?refresh=true')
        .set('Authorization', `Bearer ${ctx.userToken}`);

      assert.ok(!listRes.body.some((c: any) => c.id === 'France2.fr'));
    });

    it('should delete channel using DELETE /api/channels?id=...', async () => {
      const res = await request(app)
        .delete('/api/channels?id=France3.fr')
        .set('Authorization', `Bearer ${ctx.adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.channel.id, 'France3.fr');
    });

    it('should delete channel using POST /api/channels/:id/delete alias', async () => {
      const res = await request(app)
        .post('/api/channels/France24.fr/delete')
        .set('Authorization', `Bearer ${ctx.adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.channel.id, 'France24.fr');
    });
  });

  describe('GET /api/groups and Category Groups', () => {
    it('should return list of unique category groups', async () => {
      const res = await request(app)
        .get('/api/groups')
        .set('Authorization', `Bearer ${ctx.userToken}`);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body));
      // Remaining channels include TF1 HD (General), Arte (Culture), M6 (Entertainment), W9 (Music)
      assert.ok(res.body.includes('General'));
      assert.ok(res.body.includes('Entertainment'));
    });

    it('should return detailed group counts with ?detailed=true', async () => {
      const res = await request(app)
        .get('/api/groups?detailed=true')
        .set('Authorization', `Bearer ${ctx.userToken}`);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body));
      const generalGroup = res.body.find((g: any) => g.name === 'General');
      assert.ok(generalGroup);
      assert.ok(generalGroup.count >= 1);
    });

    it('should support GET /api/channels/groups alias', async () => {
      const res = await request(app)
        .get('/api/channels/groups')
        .set('Authorization', `Bearer ${ctx.userToken}`);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body));
    });

    it('should support GET /api/channels/groups?detailed=true alias', async () => {
      const res = await request(app)
        .get('/api/channels/groups?detailed=true')
        .set('Authorization', `Bearer ${ctx.userToken}`);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body));
      assert.ok(res.body.some((g: any) => typeof g.name === 'string' && typeof g.count === 'number'));
    });
  });

  describe('GET /api/channels/:id', () => {
    it('should return specific channel details by ID', async () => {
      const res = await request(app)
        .get('/api/channels/TF1.fr')
        .set('Authorization', `Bearer ${ctx.userToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.id, 'TF1.fr');
      assert.equal(res.body.name, 'TF1 HD');
      assert.ok('group' in res.body);
    });

    it('should return 404 when channel ID is not found', async () => {
      const res = await request(app)
        .get('/api/channels/nonexistent-channel-xyz')
        .set('Authorization', `Bearer ${ctx.userToken}`);

      assert.equal(res.status, 404);
      assert.ok(res.body.error);
    });
  });
});
