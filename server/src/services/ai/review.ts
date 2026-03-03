import { generateText } from 'ai';
import { getModel, getRequestTimeout } from './provider';
import { loadGameContext, formatHistory, fillTemplate } from './context';
import { SYSTEM_PROMPT, REVIEW_PROMPT } from './prompts';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';

export async function generateReview(channelId: string): Promise<string | null> {
  const model = getModel();
  if (!model) return null;

  try {
    const channel = await prisma.channel.findUniqueOrThrow({
      where: { id: channelId },
      select: {
        surface: true,
        truth: true,
        aiProgress: true,
        createdAt: true,
        endedAt: true,
        members: {
          include: { user: { select: { nickname: true } } },
        },
        questions: {
          where: { status: 'answered' },
          orderBy: { createdAt: 'asc' },
          include: {
            asker: { select: { nickname: true } },
            answerer: { select: { nickname: true } },
          },
        },
      },
    });

    const hosts = channel.members
      .filter((m) => m.role === 'host' || m.role === 'creator')
      .map((m) => m.user.nickname);

    const players = channel.members
      .filter((m) => m.role === 'player')
      .map((m) => m.user.nickname);

    const totalQuestions = channel.questions.length;
    const keyQuestions = channel.questions.filter((q) => q.isKeyQuestion).length;

    const durationMs = channel.endedAt
      ? channel.endedAt.getTime() - channel.createdAt.getTime()
      : Date.now() - channel.createdAt.getTime();
    const durationMinutes = Math.round(durationMs / 60000);

    const ctx = await loadGameContext(channelId);
    const prompt = fillTemplate(REVIEW_PROMPT, {
      surface: channel.surface,
      truth: channel.truth,
      hosts: hosts.join('、') || '无',
      players: players.join('、') || '无',
      history: formatHistory(ctx.answeredQuestions),
      totalQuestions: String(totalQuestions),
      keyQuestions: String(keyQuestions),
      duration: `${durationMinutes} 分钟`,
      progress: channel.aiProgress.toFixed(1),
    });

    const result = await generateText({
      model,
      system: SYSTEM_PROMPT,
      prompt,
      abortSignal: AbortSignal.timeout(getRequestTimeout()),
    });

    const review = result.text.trim();

    await prisma.channel.update({
      where: { id: channelId },
      data: { aiReview: review },
    });

    return review;
  } catch (error) {
    logger.warn('AI review generation failed', { channelId, error: String(error) });
    return null;
  }
}
