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
  title: 'Rating Test Puzzle',
  surface: 'A man walks into a bar and asks for water. The bartender pulls out a gun.',
  truth: 'The man had hiccups. The bartender scared him with the gun to cure them.',
  maxQuestions: 0,
  difficulty: 'medium' as const,
  tags: [],
};

async function setupEndedChannel() {
  const { token: hostToken, userId: hostId } = await registerAndGetToken('host');
  const { token: playerToken, userId: playerId } = await registerAndGetToken('player');

  const createRes = await request(app)
    .post('/api/channels')
    .set(getAuthHeader(hostToken))
    .send(CHANNEL_PAYLOAD);

  const channelId = createRes.body.id as string;

  await request(app)
    .post(`/api/channels/${channelId}/join`)
    .set(getAuthHeader(playerToken));

  // End the channel
  await request(app)
    .post(`/api/channels/${channelId}/end`)
    .set(getAuthHeader(hostToken));

  return { hostToken, hostId, playerToken, playerId, channelId };
}

describe('Ratings', () => {
  describe('POST /api/channels/:id/ratings', () => {
    it('should let a player rate an ended channel', async () => {
      const { playerToken, channelId } = await setupEndedChannel();

      const res = await request(app)
        .post(`/api/channels/${channelId}/ratings`)
        .set(getAuthHeader(playerToken))
        .send({ score: 4, comment: '很有趣的汤!' });

      expect(res.status).toBe(200);
      expect(res.body.score).toBe(4);
      expect(res.body.comment).toBe('很有趣的汤!');
    });

    it('should not let the creator rate their own channel', async () => {
      const { hostToken, channelId } = await setupEndedChannel();

      const res = await request(app)
        .post(`/api/channels/${channelId}/ratings`)
        .set(getAuthHeader(hostToken))
        .send({ score: 5 });

      expect(res.status).toBe(403);
      expect(res.body.error).toBeDefined();
    });

    it('should not let a player rate an active channel', async () => {
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

      const res = await request(app)
        .post(`/api/channels/${channelId}/ratings`)
        .set(getAuthHeader(playerToken))
        .send({ score: 3 });

      expect(res.status).toBe(400);
    });

    it('should update an existing rating (upsert)', async () => {
      const { playerToken, channelId } = await setupEndedChannel();

      await request(app)
        .post(`/api/channels/${channelId}/ratings`)
        .set(getAuthHeader(playerToken))
        .send({ score: 3, comment: '还行' });

      const res = await request(app)
        .post(`/api/channels/${channelId}/ratings`)
        .set(getAuthHeader(playerToken))
        .send({ score: 5, comment: '改主意了，很好!' });

      expect(res.status).toBe(200);
      expect(res.body.score).toBe(5);
      expect(res.body.comment).toBe('改主意了，很好!');
    });

    it('should reject invalid score values', async () => {
      const { playerToken, channelId } = await setupEndedChannel();

      const res = await request(app)
        .post(`/api/channels/${channelId}/ratings`)
        .set(getAuthHeader(playerToken))
        .send({ score: 6 });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/channels/:id/ratings', () => {
    it('should return ratings list with average', async () => {
      const { playerToken, channelId } = await setupEndedChannel();

      await request(app)
        .post(`/api/channels/${channelId}/ratings`)
        .set(getAuthHeader(playerToken))
        .send({ score: 4 });

      const res = await request(app)
        .get(`/api/channels/${channelId}/ratings`);

      expect(res.status).toBe(200);
      expect(res.body.ratings).toHaveLength(1);
      expect(res.body.average).toBe(4);
      expect(res.body.count).toBe(1);
    });

    it('should return empty array for channel with no ratings', async () => {
      const { channelId } = await setupEndedChannel();

      const res = await request(app)
        .get(`/api/channels/${channelId}/ratings`);

      expect(res.status).toBe(200);
      expect(res.body.ratings).toHaveLength(0);
      expect(res.body.average).toBe(0);
      expect(res.body.count).toBe(0);
    });
  });
});
