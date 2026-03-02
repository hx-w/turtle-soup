import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';
import { createTestUser, loginUser } from './setup';

describe('Auth', () => {
  // ----------------------------------------------------------------
  // Registration
  // ----------------------------------------------------------------
  describe('POST /api/auth/register', () => {
    it('should register with a valid invite code', async () => {
      const res = await createTestUser('alice', 'password1234');

      expect(res.status).toBeLessThanOrEqual(201); // 200 or 201
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.nickname).toBe('alice');
    });

    it('should fail with an invalid invite code', async () => {
      const res = await createTestUser('bob', 'password1234', 'INVALID_CODE');

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should fail when invite code has been fully used (maxUses=1, usedCount=1)', async () => {
      // Create a limited invite code that is already used up
      await prisma.inviteCode.create({
        data: { code: 'ONCE', maxUses: 1, usedCount: 1 },
      });

      const res = await createTestUser('charlie', 'password1234', 'ONCE');

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should fail when registering with a duplicate nickname', async () => {
      // First registration succeeds
      await createTestUser('dave', 'password1234');

      // Second registration with the same nickname should fail
      const res = await createTestUser('dave', 'otherpassword1');

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  // ----------------------------------------------------------------
  // Login
  // ----------------------------------------------------------------
  describe('POST /api/auth/login', () => {
    it('should login with correct credentials and return tokens', async () => {
      await createTestUser('eve', 'password1234');

      const res = await loginUser('eve', 'password1234');

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.user.nickname).toBe('eve');
    });

    it('should fail to login with wrong password', async () => {
      await createTestUser('frank', 'password1234');

      const res = await loginUser('frank', 'wrongpassword');

      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });
  });

  // ----------------------------------------------------------------
  // Refresh Token
  // ----------------------------------------------------------------
  describe('POST /api/auth/refresh', () => {
    it('should return new tokens when given a valid refresh token', async () => {
      const registerRes = await createTestUser('grace', 'password1234');
      const { refreshToken } = registerRes.body;

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
    });

    it('should fail with an invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'not.a.valid.token' });

      expect(res.status).toBe(401);
    });

    it('should fail when refresh token is missing', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({});

      expect(res.status).toBe(400);
    });
  });
});
