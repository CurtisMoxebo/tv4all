process.env.NODE_ENV = 'test';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/index';
import { authService } from '../src/services/authService';

describe('Authentication & Authorization Regression Tests', () => {
  describe('authService Unit Tests', () => {
    it('should authenticate admin user with correct credentials', () => {
      const user = authService.authenticate('tv4alladmin', '123123');
      assert.ok(user);
      assert.equal(user.username, 'tv4alladmin');
      assert.equal(user.role, 'admin');
    });

    it('should authenticate standard viewer with correct credentials', () => {
      const user = authService.authenticate('tv4all', '123');
      assert.ok(user);
      assert.equal(user.username, 'tv4all');
      assert.equal(user.role, 'user');
    });

    it('should reject incorrect password', () => {
      const user = authService.authenticate('tv4alladmin', 'wrongpassword');
      assert.equal(user, null);
    });

    it('should reject non-existent username', () => {
      const user = authService.authenticate('unknownuser', '123123');
      assert.equal(user, null);
    });

    it('should reject empty or missing credentials', () => {
      assert.equal(authService.authenticate('', ''), null);
      assert.equal(authService.authenticate(undefined, undefined), null);
    });

    it('should generate and verify JWT token successfully', () => {
      const token = authService.generateToken('tv4alladmin', 'admin');
      assert.ok(token);
      assert.equal(typeof token, 'string');

      const verified = authService.verifyToken(token);
      assert.ok(verified);
      assert.equal(verified.username, 'tv4alladmin');
      assert.equal(verified.role, 'admin');
    });

    it('should reject tampered or corrupted token by throwing error', () => {
      assert.throws(() => {
        authService.verifyToken('invalid.token.signature');
      });
    });

    it('should validate credentials correctly via validateCredentials helper', () => {
      assert.equal(authService.validateCredentials('tv4alladmin', '123123'), true);
      assert.equal(authService.validateCredentials('tv4all', '123'), true);
      assert.equal(authService.validateCredentials('tv4all', 'wrongpassword'), false);
      assert.equal(authService.validateCredentials('', ''), false);
    });
  });

  describe('Auth HTTP Endpoints (supertest)', () => {
    it('POST /api/auth/login should reject missing credentials with 400', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});

      assert.equal(res.status, 400);
      assert.equal(res.body.error, 'Bad Request');
    });

    it('POST /api/auth/login should reject wrong credentials with 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'tv4alladmin', password: 'bad' });

      assert.equal(res.status, 401);
      assert.equal(res.body.error, 'Unauthorized');
    });

    it('POST /api/auth/login should authenticate valid admin and return 12h token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'tv4alladmin', password: '123123' });

      assert.equal(res.status, 200);
      assert.equal(res.body.tokenType, 'Bearer');
      assert.equal(res.body.expiresIn, '12h');
      assert.ok(res.body.token);
      assert.equal(res.body.user.role, 'admin');
    });

    it('POST /api/auth should function as alias for /login', async () => {
      const res = await request(app)
        .post('/api/auth')
        .send({ username: 'tv4all', password: '123' });

      assert.equal(res.status, 200);
      assert.ok(res.body.token);
      assert.equal(res.body.user.role, 'user');
    });

    it('GET /api/auth/me should reject requests without token with 401', async () => {
      const res = await request(app).get('/api/auth/me');
      assert.equal(res.status, 401);
      assert.equal(res.body.error, 'Unauthorized');
    });

    it('GET /api/auth/me should reject requests with invalid Bearer token with 401', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      assert.equal(res.status, 401);
    });

    it('GET /api/auth/me should succeed with valid Bearer token', async () => {
      const token = authService.generateToken('tv4alladmin', 'admin');
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.authenticated, true);
      assert.equal(res.body.user.username, 'tv4alladmin');
      assert.equal(res.body.user.role, 'admin');
    });

    it('GET /api/auth/me should accept token via query parameter (?token=...)', async () => {
      const token = authService.generateToken('tv4all', 'user');
      const res = await request(app)
        .get(`/api/auth/me?token=${encodeURIComponent(token)}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.authenticated, true);
      assert.equal(res.body.user.username, 'tv4all');
    });
  });
});
