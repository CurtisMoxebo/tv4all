process.env.NODE_ENV = 'test';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/index';
import { epgService } from '../src/services/epgService';
import { authService } from '../src/services/authService';

describe('EPG Service & Routes Regression Tests', () => {
  const adminToken = authService.generateToken('tv4alladmin', 'admin');
  const userToken = authService.generateToken('tv4all', 'user');

  const SAMPLE_XMLTV = `<?xml version="1.0" encoding="utf-8"?>
<tv>
  <channel id="Arte.fr">
    <display-name>Arte</display-name>
  </channel>
  <programme start="20261026180000 +0000" stop="20261026190000 +0000" channel="Arte.fr">
    <title lang="fr">Journal d&apos;Arte</title>
    <desc lang="fr">Le journal télévisé international &amp; européen.</desc>
    <category lang="fr">News</category>
  </programme>
  <programme start="20261026190000 +0000" stop="20261026200000 +0000" channel="Arte.fr">
    <title lang="fr">28 Minutes</title>
    <desc lang="fr">Le magazine d&apos;actualité présenté par Renaud Dély.</desc>
    <category lang="fr">Magazine</category>
  </programme>
  <programme start="20261026200000 +0000" stop="20261026220000 +0000" channel="Arte.fr">
    <title lang="fr">Cinéma: Soirée Européenne</title>
    <desc lang="fr">Grand film dramatique européen.</desc>
    <category lang="fr">Movie</category>
  </programme>
</tv>`;

  describe('epgService Unit Tests', () => {
    it('should parse XMLTV formatted date strings with timezone', () => {
      const parsed = epgService.parseXmltvDate('20261026193000 +0200');
      assert.ok(parsed instanceof Date);
      assert.equal(parsed.getUTCHours(), 17);
      assert.equal(parsed.getUTCMinutes(), 30);
    });

    it('should decode XML entities properly', () => {
      const decoded = epgService.decodeXml('Tom &amp; Jerry in &quot;Paris&quot; &lt;France&gt;');
      assert.equal(decoded, 'Tom & Jerry in "Paris" <France>');
    });

    it('should parse XMLTV content and populate channel schedules', () => {
      const count = epgService.loadXmltv(SAMPLE_XMLTV);
      assert.equal(count, 3);
      assert.equal(epgService.getChannelCount(), 1);
    });

    it('should return current program and upcoming list for reference time', () => {
      epgService.loadXmltv(SAMPLE_XMLTV);

      // 19:30 UTC -> inside 19:00 - 20:00 "28 Minutes"
      const refTime = new Date('2026-10-26T19:30:00.000Z');
      const epg = epgService.getChannelEPG('Arte.fr', 'Arte', refTime);

      assert.equal(epg.hasEpg, true);
      assert.ok(epg.current);
      assert.equal(epg.current.title, '28 Minutes');
      assert.equal(epg.current.category, 'Magazine');
      assert.equal(epg.current.progress, 50); // halfway through 1-hour slot
      assert.equal(epg.upcoming.length, 1);
      assert.equal(epg.upcoming[0].title, 'Cinéma: Soirée Européenne');
    });

    it('should generate fallback schedule when channel is not in XMLTV', () => {
      const refTime = new Date('2026-10-26T14:15:00.000Z');
      const epg = epgService.getChannelEPG('UnknownChannel.fr', 'Unknown TV', refTime);

      assert.equal(epg.hasEpg, false);
      assert.ok(epg.current);
      assert.ok(epg.current.title.includes('Unknown TV'));
      assert.ok(epg.upcoming.length > 0);
      assert.equal(epg.upcoming[0].durationMinutes, 60);
    });
  });

  describe('EPG HTTP Endpoints (supertest)', () => {
    it('GET /api/epg/:channelId should reject unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/epg/Arte.fr');
      assert.equal(res.status, 401);
    });

    it('GET /api/epg/:channelId should return EPG data for authenticated user', async () => {
      const res = await request(app)
        .get('/api/epg/Arte.fr?name=Arte')
        .set('Authorization', `Bearer ${userToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.channelId, 'Arte.fr');
      assert.ok('current' in res.body);
      assert.ok(Array.isArray(res.body.upcoming));
    });

    it('POST /api/epg/upload should reject non-admin users with 403', async () => {
      const res = await request(app)
        .post('/api/epg/upload')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ xml: SAMPLE_XMLTV });

      assert.equal(res.status, 403);
    });

    it('POST /api/epg/upload should accept valid XMLTV from admin user', async () => {
      const res = await request(app)
        .post('/api/epg/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ xml: SAMPLE_XMLTV });

      assert.equal(res.status, 200);
      assert.ok(res.body.message.includes('loaded 3 programs'));
    });
  });
});

