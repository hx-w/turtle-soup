import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';
import { createTestUser, getAuthHeader } from './setup';

/** Register a user and return { token, userId }. */
async function registerAndGetToken(nickname: string) {
  const res = await createTestUser(nickname, 'password1234');
  return {
    token: res.body.accessToken as string,
    userId: res.body.user.id as string,
  };
}

const CHANNEL_PAYLOAD = {
  title: 'Question Test Puzzle',
  surface: 'A woman enters a building, presses a button, and starts to cry. Why?',
  truth: 'She pressed the elevator button to the top floor to visit her sick mother, but the elevator went down instead, indicating her mother had already passed.',
  maxQuestions: 0,
  difficulty: 'medium',
  tags: [],
};

/**
 * Helper: create a channel (host), have a player join, and return handles.
 */
async function setupChannelWithPlayer(
  overrides: Record<string, any> = {},
) {
  const { token: hostToken, userId: hostId } =
    await registerAndGetToken('host');
  const { token: playerToken, userId: playerId } =
    await registerAndGetToken('player');

  const createRes = await request(app)
    .post('/api/channels')
    .set(getAuthHeader(hostToken))
    .send({ ...CHANNEL_PAYLOAD, ...overrides });

  const channelId = createRes.body.id as string;

  // Player joins
  await request(app)
    .post(`/api/channels/${channelId}/join`)
    .set(getAuthHeader(playerToken));

  return { hostToken, hostId, playerToken, playerId, channelId };
}

describe('Questions', () => {
  // ----------------------------------------------------------------
  // Submit Question
  // ----------------------------------------------------------------
  describe('POST /api/channels/:id/questions', () => {
    it('should let a player submit a question with pending status', async () => {
      const { playerToken, playerId, channelId } =
        await setupChannelWithPlayer();

      const res = await request(app)
        .post(`/api/channels/${channelId}/questions`)
        .set(getAuthHeader(playerToken))
        .send({ content: 'Did the woman know anyone in the building?' });

      expect(res.status).toBe(200);
      expect(res.body.id).toBeDefined();
      expect(res.body.status).toBe('pending');
      expect(res.body.askerId).toBe(playerId);
    });

    it('should not let a player submit another question while one is pending', async () => {
      const { playerToken, channelId } = await setupChannelWithPlayer();

      // First question
      await request(app)
        .post(`/api/channels/${channelId}/questions`)
        .set(getAuthHeader(playerToken))
        .send({ content: 'Was the building a hospital?' });

      // Second question while first is still pending
      const res = await request(app)
        .post(`/api/channels/${channelId}/questions`)
        .set(getAuthHeader(playerToken))
        .send({ content: 'Was it daytime?' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should not let the host submit a question (403)', async () => {
      const { hostToken, channelId } = await setupChannelWithPlayer();

      const res = await request(app)
        .post(`/api/channels/${channelId}/questions`)
        .set(getAuthHeader(hostToken))
        .send({ content: 'Hosts should not be able to ask this' });

      expect(res.status).toBe(403);
      expect(res.body.error).toBeDefined();
    });
  });

  // ----------------------------------------------------------------
  // Answer Question
  // ----------------------------------------------------------------
  describe('PUT /api/channels/:id/questions/:qid/answer', () => {
    it('should answer a question and set status to answered', async () => {
      const { hostToken, playerToken, channelId } =
        await setupChannelWithPlayer();

      // Player asks
      const qRes = await request(app)
        .post(`/api/channels/${channelId}/questions`)
        .set(getAuthHeader(playerToken))
        .send({ content: 'Was the woman sad before entering?' });

      const questionId = qRes.body.id;

      // Host answers
      const answerRes = await request(app)
        .put(`/api/channels/${channelId}/questions/${questionId}/answer`)
        .set(getAuthHeader(hostToken))
        .send({ answer: 'yes' });

      expect(answerRes.status).toBe(200);
      expect(answerRes.body.question.status).toBe('answered');
      expect(answerRes.body.question.answer).toBe('yes');
      expect(answerRes.body.channelEnded).toBe(false);
    });
  });

  // ----------------------------------------------------------------
  // Withdraw Question
  // ----------------------------------------------------------------
  describe('PUT /api/channels/:id/questions/:qid/withdraw', () => {
    it('should withdraw a pending question and set status to withdrawn', async () => {
      const { playerToken, channelId } = await setupChannelWithPlayer();

      const qRes = await request(app)
        .post(`/api/channels/${channelId}/questions`)
        .set(getAuthHeader(playerToken))
        .send({ content: 'Was there an elevator involved?' });

      const questionId = qRes.body.id;

      const withdrawRes = await request(app)
        .put(`/api/channels/${channelId}/questions/${questionId}/withdraw`)
        .set(getAuthHeader(playerToken));

      expect(withdrawRes.status).toBe(200);
      expect(withdrawRes.body.status).toBe('withdrawn');
    });

    it('withdrawn questions should not count toward answered total', async () => {
      const { hostToken, playerToken, channelId } =
        await setupChannelWithPlayer();

      // Ask and withdraw a question
      const qRes = await request(app)
        .post(`/api/channels/${channelId}/questions`)
        .set(getAuthHeader(playerToken))
        .send({ content: 'Is this a trick question?' });

      await request(app)
        .put(`/api/channels/${channelId}/questions/${qRes.body.id}/withdraw`)
        .set(getAuthHeader(playerToken));

      // Check answered count via stats
      const statsRes = await request(app)
        .get(`/api/channels/${channelId}/stats`);

      expect(statsRes.status).toBe(200);
      expect(statsRes.body.totalQuestions).toBe(0);
    });
  });

  // ----------------------------------------------------------------
  // Auto-end when maxQuestions reached
  // ----------------------------------------------------------------
  describe('Auto-end on maxQuestions', () => {
    it('should end the channel when answered count reaches maxQuestions', async () => {
      // Use maxQuestions = 10 (minimum allowed)
      const { hostToken, playerToken, channelId } =
        await setupChannelWithPlayer({ maxQuestions: 10 });

      let lastAnswerRes: any;

      for (let i = 0; i < 10; i++) {
        // Submit question
        const qRes = await request(app)
          .post(`/api/channels/${channelId}/questions`)
          .set(getAuthHeader(playerToken))
          .send({ content: `Question number ${i + 1} for testing?` });

        expect(qRes.status).toBe(200);

        // Host answers
        lastAnswerRes = await request(app)
          .put(
            `/api/channels/${channelId}/questions/${qRes.body.id}/answer`,
          )
          .set(getAuthHeader(hostToken))
          .send({ answer: 'yes' });

        expect(lastAnswerRes.status).toBe(200);
      }

      // The 10th answer should trigger channel end
      expect(lastAnswerRes.body.channelEnded).toBe(true);

      // Verify channel status in database
      const channel = await prisma.channel.findUnique({
        where: { id: channelId },
      });
      expect(channel!.status).toBe('ended');
    });
  });

  // ----------------------------------------------------------------
  // Reveal Truth
  // ----------------------------------------------------------------
  describe('POST /api/channels/:id/reveal', () => {
    it('should reveal truth, make player become host, and auto-withdraw pending questions', async () => {
      const { hostToken, playerToken, playerId, channelId } =
        await setupChannelWithPlayer();

      // Player submits a pending question
      const qRes = await request(app)
        .post(`/api/channels/${channelId}/questions`)
        .set(getAuthHeader(playerToken))
        .send({ content: 'What happens when I reveal the truth?' });

      const questionId = qRes.body.id;

      // Player reveals truth
      const revealRes = await request(app)
        .post(`/api/channels/${channelId}/reveal`)
        .set(getAuthHeader(playerToken));

      expect(revealRes.status).toBe(200);
      expect(revealRes.body.truth).toBeDefined();
      expect(revealRes.body.alreadyHost).toBe(false);

      // Verify: player is now host
      const member = await prisma.channelMember.findUnique({
        where: {
          channelId_userId: { channelId, userId: playerId },
        },
      });
      expect(member!.role).toBe('host');

      // Verify: pending question was auto-withdrawn
      const question = await prisma.question.findUnique({
        where: { id: questionId },
      });
      expect(question!.status).toBe('withdrawn');
    });

    it('should not allow the new host to submit questions after revealing', async () => {
      const { playerToken, channelId } = await setupChannelWithPlayer();

      // Player reveals truth (becomes host)
      await request(app)
        .post(`/api/channels/${channelId}/reveal`)
        .set(getAuthHeader(playerToken));

      // Now try to submit a question as the new host
      const res = await request(app)
        .post(`/api/channels/${channelId}/questions`)
        .set(getAuthHeader(playerToken))
        .send({ content: 'I am now a host, can I ask?' });

      expect(res.status).toBe(403);
      expect(res.body.error).toBeDefined();
    });
  });
});
