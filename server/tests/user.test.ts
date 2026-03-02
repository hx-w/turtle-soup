import request from 'supertest';
import app from '../src/app';
import { createTestUser, getAuthHeader } from './setup';

async function registerAndGetToken(nickname: string) {
  const res = await createTestUser(nickname, 'password1234');
  return {
    token: res.body.accessToken as string,
    userId: res.body.user.id as string,
  };
}

const CHANNEL_PAYLOAD = {
  title: 'User Stats Test',
  surface: 'A woman walks into a library and screams. Nobody is surprised.',
  truth: 'She is a librarian and a mouse ran across her foot.',
  maxQuestions: 0,
  difficulty: 'easy' as const,
  tags: ['test'],
};

describe('User API', () => {
  describe('GET /api/users/me', () => {
    it('should return the current user profile', async () => {
      const { token } = await registerAndGetToken('testuser');

      const res = await request(app)
        .get('/api/users/me')
        .set(getAuthHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.nickname).toBe('testuser');
      expect(res.body.id).toBeDefined();
      expect(res.body.avatarSeed).toBeDefined();
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/users/me');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/users/me/stats', () => {
    it('should return zero stats for a new user', async () => {
      const { token } = await registerAndGetToken('newuser');

      const res = await request(app)
        .get('/api/users/me/stats')
        .set(getAuthHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.hosted).toBe(0);
      expect(res.body.participated).toBe(0);
      expect(res.body.totalQuestions).toBe(0);
      expect(res.body.hitRate).toBe(0);
    });

    it('should count hosted channels', async () => {
      const { token: hostToken } = await registerAndGetToken('host');

      await request(app)
        .post('/api/channels')
        .set(getAuthHeader(hostToken))
        .send(CHANNEL_PAYLOAD);

      const res = await request(app)
        .get('/api/users/me/stats')
        .set(getAuthHeader(hostToken));

      expect(res.status).toBe(200);
      expect(res.body.hosted).toBe(1);
    });

    it('should count participated channels and question stats', async () => {
      const { token: hostToken } = await registerAndGetToken('host2');
      const { token: playerToken } = await registerAndGetToken('player2');

      const createRes = await request(app)
        .post('/api/channels')
        .set(getAuthHeader(hostToken))
        .send(CHANNEL_PAYLOAD);

      const channelId = createRes.body.id;

      await request(app)
        .post(`/api/channels/${channelId}/join`)
        .set(getAuthHeader(playerToken));

      // Player asks a question
      const qRes = await request(app)
        .post(`/api/channels/${channelId}/questions`)
        .set(getAuthHeader(playerToken))
        .send({ content: 'Was it a public library?' });

      // Host answers yes
      await request(app)
        .put(`/api/channels/${channelId}/questions/${qRes.body.id}/answer`)
        .set(getAuthHeader(hostToken))
        .send({ answer: 'yes' });

      const res = await request(app)
        .get('/api/users/me/stats')
        .set(getAuthHeader(playerToken));

      expect(res.status).toBe(200);
      expect(res.body.participated).toBe(1);
      expect(res.body.totalQuestions).toBe(1);
      expect(res.body.distribution.yes).toBe(1);
      expect(res.body.hitRate).toBe(100);
    });
  });

  describe('GET /api/users/me/channels', () => {
    it('should return user channel memberships', async () => {
      const { token: hostToken } = await registerAndGetToken('host3');

      await request(app)
        .post('/api/channels')
        .set(getAuthHeader(hostToken))
        .send(CHANNEL_PAYLOAD);

      const res = await request(app)
        .get('/api/users/me/channels')
        .set(getAuthHeader(hostToken));

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].role).toBe('host');
      expect(res.body[0].channel.title).toBe('User Stats Test');
    });

    it('should filter by role', async () => {
      const { token: hostToken } = await registerAndGetToken('host4');
      const { token: playerToken } = await registerAndGetToken('player4');

      const createRes = await request(app)
        .post('/api/channels')
        .set(getAuthHeader(hostToken))
        .send(CHANNEL_PAYLOAD);

      await request(app)
        .post(`/api/channels/${createRes.body.id}/join`)
        .set(getAuthHeader(playerToken));

      const playerRes = await request(app)
        .get('/api/users/me/channels?role=player')
        .set(getAuthHeader(playerToken));

      expect(playerRes.status).toBe(200);
      expect(playerRes.body).toHaveLength(1);
      expect(playerRes.body[0].role).toBe('player');

      // Player should have no host channels
      const hostRes = await request(app)
        .get('/api/users/me/channels?role=host')
        .set(getAuthHeader(playerToken));

      expect(hostRes.body).toHaveLength(0);
    });
  });
});
