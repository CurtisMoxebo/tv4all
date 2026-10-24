import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractAttribute, parseM3U } from '../src/utils/m3uParser';
import { validateM3ULines, validateChannelPayload } from '../src/services/channelService';

describe('M3U Parser & Validation Regression Tests', () => {
  describe('extractAttribute', () => {
    it('should extract double-quoted attribute values', () => {
      const line = '#EXTINF:-1 tvg-id="TF1.fr" tvg-name="TF1" group-title="General",TF1 HD';
      assert.equal(extractAttribute(line, 'tvg-id'), 'TF1.fr');
      assert.equal(extractAttribute(line, 'tvg-name'), 'TF1');
      assert.equal(extractAttribute(line, 'group-title'), 'General');
    });

    it('should extract single-quoted attribute values', () => {
      const line = "#EXTINF:-1 tvg-id='M6.fr' tvg-name='M6' group-title='Entertainment',M6";
      assert.equal(extractAttribute(line, 'tvg-id'), 'M6.fr');
      assert.equal(extractAttribute(line, 'group-title'), 'Entertainment');
    });

    it('should extract unquoted attribute values', () => {
      const line = '#EXTINF:-1 tvg-chno=12 tvg-country=FR,Channel 12';
      assert.equal(extractAttribute(line, 'tvg-chno'), '12');
      assert.equal(extractAttribute(line, 'tvg-country'), 'FR');
    });

    it('should be case-insensitive for attribute keys', () => {
      const line = '#EXTINF:-1 TVG-ID="Arte.fr" TVG-LOGO="https://example.com/arte.png",Arte';
      assert.equal(extractAttribute(line, 'tvg-id'), 'Arte.fr');
      assert.equal(extractAttribute(line, 'tvg-logo'), 'https://example.com/arte.png');
    });

    it('should return null when the attribute does not exist', () => {
      const line = '#EXTINF:-1 tvg-id="Arte.fr",Arte';
      assert.equal(extractAttribute(line, 'nonexistent'), null);
    });
  });

  describe('parseM3U', () => {
    it('should parse standard M3U content with all metadata', () => {
      const m3u = `#EXTM3U
#EXTINF:-1 tvg-id="France2.fr" tvg-name="France 2" tvg-logo="https://example.com/f2.png" group-title="General",France 2 HD
http://stream.example.com/france2.m3u8
`;
      const channels = parseM3U(m3u);
      assert.equal(channels.length, 1);
      assert.equal(channels[0].id, 'France2.fr');
      assert.equal(channels[0].name, 'France 2');
      assert.equal(channels[0].logo, 'https://example.com/f2.png');
      assert.equal(channels[0].group, 'General');
      assert.equal(channels[0].url, 'http://stream.example.com/france2.m3u8');
    });

    it('should fallback to title after comma when tvg-name is absent', () => {
      const m3u = `#EXTINF:-1 group-title="Sports",Eurosport 1
https://stream.example.com/eurosport.ts
`;
      const channels = parseM3U(m3u);
      assert.equal(channels.length, 1);
      assert.equal(channels[0].name, 'Eurosport 1');
      assert.equal(channels[0].group, 'Sports');
      assert.equal(channels[0].id, 'eurosport-1');
    });

    it('should assign default group "General" when group-title is absent', () => {
      const m3u = `#EXTINF:-1 tvg-id="news1",News Channel
http://stream.example.com/news.m3u8
`;
      const channels = parseM3U(m3u);
      assert.equal(channels[0].group, 'General');
    });

    it('should deduplicate identical channel IDs with sequential suffixes', () => {
      const m3u = `#EXTINF:-1 tvg-id="重複.id",Channel A
http://stream.example.com/a.m3u8
#EXTINF:-1 tvg-id="重複.id",Channel B
http://stream.example.com/b.m3u8
`;
      const channels = parseM3U(m3u);
      assert.equal(channels.length, 2);
      assert.equal(channels[0].id, '重複.id');
      assert.equal(channels[1].id, '重複.id-2');
    });

    it('should ignore directives like #EXTVLCOPT and blank lines', () => {
      const m3u = `#EXTM3U
#EXTVLCOPT:http-user-agent=VLC

#EXTINF:-1 tvg-name="Clean Channel",Clean Channel
http://stream.example.com/clean.m3u8
`;
      const channels = parseM3U(m3u);
      assert.equal(channels.length, 1);
      assert.equal(channels[0].name, 'Clean Channel');
    });
  });

  describe('validateM3ULines', () => {
    it('should validate and parse two proper M3U lines', () => {
      const line1 = '#EXTINF:-1 tvg-id="canalplus.fr" tvg-name="Canal+" group-title="Cinema",Canal+';
      const line2 = 'https://stream.example.com/cplus.m3u8';

      const result = validateM3ULines(line1, line2);
      assert.equal(result.isValid, true);
      assert.ok(result.sanitized);
      assert.equal(result.sanitized.channel.name, 'Canal+');
      assert.equal(result.sanitized.channel.group, 'Cinema');
      assert.equal(result.sanitized.url, line2);
    });

    it('should reject when Line 1 does not start with #EXTINF:', () => {
      const result = validateM3ULines('INVALID LINE 1', 'http://stream.example.com/live.m3u8');
      assert.equal(result.isValid, false);
      assert.ok(result.errors.some(e => e.includes('#EXTINF:')));
    });

    it('should reject when Line 2 is not a valid HTTP/HTTPS URL', () => {
      const line1 = '#EXTINF:-1 tvg-name="Test",Test';
      const line2 = 'ftp://invalid-url.com/stream';

      const result = validateM3ULines(line1, line2);
      assert.equal(result.isValid, false);
      assert.ok(result.errors.some(e => e.includes('HTTP or HTTPS')));
    });

    it('should reject empty or missing lines', () => {
      const result = validateM3ULines('', '');
      assert.equal(result.isValid, false);
      assert.equal(result.errors.length, 2);
    });
  });

  describe('validateChannelPayload', () => {
    it('should sanitize and validate a complete channel payload', () => {
      const payload = {
        name: 'France Info',
        url: 'https://stream.example.com/franceinfo.m3u8',
        group: 'News',
        logo: 'https://example.com/finfo.png',
        id: 'franceinfo.fr'
      };

      const result = validateChannelPayload(payload);
      assert.equal(result.isValid, true);
      assert.ok(result.sanitized);
      assert.equal(result.sanitized.name, 'France Info');
      assert.equal(result.sanitized.id, 'franceinfo.fr');
      assert.equal(result.sanitized.group, 'News');
    });

    it('should reject payload with missing or empty name', () => {
      const result = validateChannelPayload({ url: 'https://example.com/live.m3u8' });
      assert.equal(result.isValid, false);
      assert.ok(result.errors.some(e => e.includes("'name'")));
    });

    it('should reject non-HTTP URL in payload', () => {
      const result = validateChannelPayload({ name: 'Test', url: 'rtmp://stream/live' });
      assert.equal(result.isValid, false);
      assert.ok(result.errors.some(e => e.includes('HTTP or HTTPS')));
    });

    it('should generate a sanitized ID slug from name when id is omitted', () => {
      const result = validateChannelPayload({
        name: 'TF1 Séries Films',
        url: 'https://example.com/tf1sf.m3u8'
      });
      assert.equal(result.isValid, true);
      assert.ok(result.sanitized?.id.endsWith('.fr'));
    });
  });
});

