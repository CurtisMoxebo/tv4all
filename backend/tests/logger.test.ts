process.env.NODE_ENV = 'test';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/index';
import { loggerService } from '../src/services/loggerService';
import { authService } from '../src/services/authService';

describe('Logger Service & Routes Regression Tests', () => {
  const token = authService.generateToken('tv4alladmin', 'admin');

  describe('loggerService Unit Tests', () => {
    it('should format today log file name as YYYY-MM-DD.log', () => {
      const fileName = loggerService.getTodayLogFileName();
      const regex = /^\d{4}-\d{2}-\d{2}\.log$/;
      assert.ok(regex.test(fileName), `File name ${fileName} did not match YYYY-MM-DD.log pattern`);
    });

    it('should write a log entry and read it back from today log file', async () => {
      const testMsg = `Regression test unique message ${Date.now()}`;
      loggerService.info(testMsg, '127.0.0.1');

      // Allow asynchronous fs.appendFile to flush to disk
      await new Promise(resolve => setTimeout(resolve, 60));

      const content = loggerService.readTodayLogs();
      assert.ok(content.includes(testMsg));
      assert.ok(content.includes('[INFO]'));
      assert.ok(content.includes('[IP: 127.0.0.1]'));
    });

    it('should handle error log levels with attached error stack', async () => {
      const err = new Error('Simulated failure');
      loggerService.error('Service failure test', '10.0.0.1', err);

      // Allow asynchronous fs.appendFile to flush to disk
      await new Promise(resolve => setTimeout(resolve, 60));

      const content = loggerService.readTodayLogs();
      assert.ok(content.includes('Service failure test'));
      assert.ok(content.includes('Simulated failure'));
      assert.ok(content.includes('[ERROR]'));
    });
  });

  describe('Log HTTP Endpoints', () => {
    it('GET /api/logs should reject unauthenticated request with 401', async () => {
      const res = await request(app).get('/api/logs');
      assert.equal(res.status, 401);
    });

    it('GET /api/logs should return JSON log entries with metadata when authenticated', async () => {
      const res = await request(app)
        .get('/api/logs')
        .set('Authorization', `Bearer ${token}`);

      assert.equal(res.status, 200);
      assert.ok(res.body.date);
      assert.ok(res.body.logFile);
      assert.ok(typeof res.body.totalEntries === 'number');
      assert.ok(Array.isArray(res.body.logs));
    });

    it('GET /api/logs?limit=3 should limit returned entries to requested count', async () => {
      const res = await request(app)
        .get('/api/logs?limit=3')
        .set('Authorization', `Bearer ${token}`);

      assert.equal(res.status, 200);
      assert.ok(res.body.returnedEntries <= 3);
      assert.ok(res.body.logs.length <= 3);
    });

    it('GET /api/logs/raw should return plain text logs', async () => {
      const res = await request(app)
        .get('/api/logs/raw')
        .set('Authorization', `Bearer ${token}`);

      assert.equal(res.status, 200);
      assert.ok(res.headers['content-type'].includes('text/plain'));
      assert.ok(typeof res.text === 'string');
    });
  });
});
