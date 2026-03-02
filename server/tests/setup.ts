import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';

/**
 * Create a test user by calling the register endpoint.
 * Returns the full response body (accessToken, refreshToken, user).
 */
export async function createTestUser(
  nickname: string,
  password: string,
  inviteCode: string = 'TESTCODE',
) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ nickname, password, inviteCode });
  return res;
}

/**
 * Log in a user and return the response.
 */
export async function loginUser(nickname: string, password: string) {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ nickname, password });
  return res;
}

/**
 * Build an Authorization header object from a token string.
 */
export function getAuthHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

/**
 * Before each test, wipe every table and re-seed a default invite code.
 */
beforeEach(async () => {
  // Delete in dependency order to respect foreign keys
  await prisma.rating.deleteMany();
  await prisma.question.deleteMany();
  await prisma.channelMember.deleteMany();
  await prisma.channel.deleteMany();
  await prisma.inviteCode.deleteMany();
  await prisma.user.deleteMany();

  // Seed a default invite code with unlimited uses (maxUses = 0 means unlimited)
  await prisma.inviteCode.create({
    data: { code: 'TESTCODE', maxUses: 0, usedCount: 0 },
  });
});

/**
 * After all tests, disconnect prisma.
 */
afterAll(async () => {
  await prisma.$disconnect();
});
