import { prisma } from '../lib/prisma';
import { EventType } from '@prisma/client';

interface EventData {
  userId?: string;
  questionId?: string;
  metadata?: Record<string, unknown>;
}

async function recordEvent(channelId: string, type: EventType, data: EventData = {}): Promise<void> {
  try {
    await prisma.timelineEvent.create({
      data: {
        channelId,
        type,
        userId: data.userId ?? null,
        questionId: data.questionId ?? null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata: (data.metadata ?? null) as any,
      },
    });
  } catch (error) {
    // Timeline events are non-critical; failure should not break game flow
    console.error('Failed to record timeline event:', error);
  }
}

export const TimelineService = {
  channelCreated: (channelId: string, creatorId: string) =>
    recordEvent(channelId, 'channel_created', { userId: creatorId }),

  playerJoined: (channelId: string, userId: string) =>
    recordEvent(channelId, 'player_joined', { userId }),

  firstQuestion: (channelId: string, userId: string, questionId: string) =>
    recordEvent(channelId, 'first_question', { userId, questionId }),

  questionAsked: (channelId: string, userId: string, questionId: string) =>
    recordEvent(channelId, 'question_asked', { userId, questionId }),

  questionAnswered: (channelId: string, questionId: string, answer: string, answererNickname: string) =>
    recordEvent(channelId, 'question_answered', {
      questionId,
      metadata: { answer, answerer: answererNickname },
    }),

  keyQuestion: (channelId: string, userId: string, questionId: string, answer: string) =>
    recordEvent(channelId, 'key_question', { userId, questionId, metadata: { answer } }),

  roleChanged: (channelId: string, userId: string, previousRole: string, newRole: string) =>
    recordEvent(channelId, 'role_changed', { userId, metadata: { previousRole, newRole } }),

  truthRevealed: (channelId: string, userId: string) =>
    recordEvent(channelId, 'truth_revealed', { userId }),

  channelEnded: (channelId: string, totalQuestions: number) =>
    recordEvent(channelId, 'channel_ended', { metadata: { totalQuestions } }),
};
