import request from 'supertest';
import app from '../src/app';
import { createTestUser, getAuthHeader } from './setup';

/** Shorthand to register a user and return { token, userId }. */
async function registerAndGetToken(nickname: string) {
  const res = await createTestUser(nickname, 'password1234');
  return {
    token: res.body.accessToken as string,
    userId: res.body.user.id as string,
  };
}

const CHANNEL_PAYLOAD = {
  title: 'Test Puzzle',
  surface: 'A man walks into a bar and asks for water. The bartender pulls out a gun. The man says thank you and leaves.',
  truth: 'The man had hiccups. The bartender scared him with the gun to cure his hiccups, so the man no longer needed the water.',
  maxQuestions: 0,
  difficulty: 'medium',
  tags: ['classic'],
};

describe('Channels', () => {
  // ----------------------------------------------------------------
  // Create Channel
  // ----------------------------------------------------------------
  describe('POST /api/channels', () => {
    it('should create a channel and make the creator the host', async () => {
      const { token, userId } = await registerAndGetToken('host1');

      const res = await request(app)
        .post('/api/channels')
        .set(getAuthHeader(token))
        .send(CHANNEL_PAYLOAD);

      expect(res.status).toBe(200);
      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe('Test Puzzle');
      expect(res.body.status).toBe('active');
      expect(res.body.creatorId).toBe(userId);

      // The creator should be in the members list as host
      const hostMember = res.body.members.find(
        (m: any) => m.userId === userId,
      );
      expect(hostMember).toBeDefined();
      expect(hostMember.role).toBe('host');
    });

    it('should fail without auth token', async () => {
      const res = await request(app)
        .post('/api/channels')
        .send(CHANNEL_PAYLOAD);

      expect(res.status).toBe(401);
    });
  });

  // ----------------------------------------------------------------
  // Join Channel
  // ----------------------------------------------------------------
  describe('POST /api/channels/:id/join', () => {
    it('should allow another user to join as player', async () => {
      const { token: hostToken } = await registerAndGetToken('host2');
      const { token: playerToken, userId: playerId } =
        await registerAndGetToken('player1');

      // Host creates channel
      const createRes = await request(app)
        .post('/api/channels')
        .set(getAuthHeader(hostToken))
        .send(CHANNEL_PAYLOAD);
      const channelId = createRes.body.id;

      // Player joins
      const joinRes = await request(app)
        .post(`/api/channels/${channelId}/join`)
        .set(getAuthHeader(playerToken));

      expect(joinRes.status).toBe(200);
      expect(joinRes.body.userId).toBe(playerId);
      expect(joinRes.body.role).toBe('player');
    });
  });

  // ----------------------------------------------------------------
  // End Channel
  // ----------------------------------------------------------------
  describe('POST /api/channels/:id/end', () => {
    it('should end a channel and set status to ended', async () => {
      const { token } = await registerAndGetToken('host3');

      const createRes = await request(app)
        .post('/api/channels')
        .set(getAuthHeader(token))
        .send(CHANNEL_PAYLOAD);
      const channelId = createRes.body.id;

      const endRes = await request(app)
        .post(`/api/channels/${channelId}/end`)
        .set(getAuthHeader(token));

      expect(endRes.status).toBe(200);
      expect(endRes.body.status).toBe('ended');
      expect(endRes.body.endedAt).toBeDefined();
    });

    it('should not allow a non-host to end a channel', async () => {
      const { token: hostToken } = await registerAndGetToken('host4');
      const { token: playerToken } = await registerAndGetToken('player2');

      const createRes = await request(app)
        .post('/api/channels')
        .set(getAuthHeader(hostToken))
        .send(CHANNEL_PAYLOAD);
      const channelId = createRes.body.id;

      // Player joins first
      await request(app)
        .post(`/api/channels/${channelId}/join`)
        .set(getAuthHeader(playerToken));

      // Player tries to end
      const endRes = await request(app)
        .post(`/api/channels/${channelId}/end`)
        .set(getAuthHeader(playerToken));

      expect(endRes.status).toBe(403);
    });
  });

  // ----------------------------------------------------------------
  // List Channels
  // ----------------------------------------------------------------
  describe('GET /api/channels', () => {
    it('should list active channels', async () => {
      const { token } = await registerAndGetToken('host5');

      // Create two channels
      await request(app)
        .post('/api/channels')
        .set(getAuthHeader(token))
        .send({ ...CHANNEL_PAYLOAD, title: 'Puzzle One' });

      await request(app)
        .post('/api/channels')
        .set(getAuthHeader(token))
        .send({ ...CHANNEL_PAYLOAD, title: 'Puzzle Two' });

      const listRes = await request(app).get('/api/channels');

      expect(listRes.status).toBe(200);
      expect(listRes.body.channels).toBeDefined();
      expect(listRes.body.channels.length).toBe(2);
      expect(listRes.body.total).toBe(2);
    });

    it('should not list ended channels by default', async () => {
      const { token } = await registerAndGetToken('host6');

      const createRes = await request(app)
        .post('/api/channels')
        .set(getAuthHeader(token))
        .send(CHANNEL_PAYLOAD);

      // End it
      await request(app)
        .post(`/api/channels/${createRes.body.id}/end`)
        .set(getAuthHeader(token));

      const listRes = await request(app).get('/api/channels');

      expect(listRes.status).toBe(200);
      expect(listRes.body.channels.length).toBe(0);
    });
  });
});
