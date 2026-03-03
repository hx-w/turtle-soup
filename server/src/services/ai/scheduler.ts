import { prisma } from '../../lib/prisma';
import { aiJudgeQuestion } from './host';
import { evaluateProgress } from './progress';
import { isAiAvailable } from './provider';
import { getIO } from '../../socket';
import { SocketEvents } from '../../constants';
import { TimelineService } from '../timeline';
import { logger } from '../../lib/logger';

const pendingTimers = new Map<string, NodeJS.Timeout>();

export function scheduleAiAnswer(
  questionId: string,
  channelId: string,
  delayMs: number,
): void {
  if (!isAiAvailable()) {
    logger.debug('AI not available, skipping schedule', { questionId });
    return;
  }
  cancelAiAnswer(questionId);

  logger.info('Scheduling AI answer', { questionId, channelId, delayMs, delaySeconds: Math.round(delayMs / 1000) });

  const timer = setTimeout(async () => {
    pendingTimers.delete(questionId);
    try {
      // Re-check if still pending
      const question = await prisma.question.findUnique({ where: { id: questionId } });
      if (!question || question.status !== 'pending') {
        logger.debug('Question no longer pending, skipping AI answer', { questionId, status: question?.status });
        return;
      }

      logger.info('Executing scheduled AI answer', { questionId, channelId });

      const judgement = await aiJudgeQuestion(channelId, questionId);
      if (!judgement) {
        logger.warn('AI judge returned null, question stays pending', { questionId, channelId });
        return;
      }

      const canMarkKey = judgement.isKeyQuestion &&
        (judgement.answer === 'yes' || judgement.answer === 'no');

      const updated = await prisma.question.update({
        where: { id: questionId },
        data: {
          answer: judgement.answer,
          status: 'answered',
          answeredAt: new Date(),
          isAiAnswered: true,
          aiReasoning: judgement.reasoning,
          isKeyQuestion: canMarkKey,
        },
        include: {
          asker: { select: { id: true, nickname: true, avatarSeed: true } },
        },
      });

      logger.info('AI answer saved', { questionId, answer: judgement.answer, isKeyQuestion: canMarkKey });

      await TimelineService.aiAnswered(channelId, questionId, judgement.answer);
      if (canMarkKey) {
        await TimelineService.keyQuestion(channelId, updated.askerId, questionId, judgement.answer);
      }

      // Check max questions
      const channel = await prisma.channel.findUnique({ where: { id: channelId } });
      let channelEnded = false;
      if (channel && channel.maxQuestions > 0) {
        const answeredCount = await prisma.question.count({
          where: { channelId, status: 'answered' },
        });
        if (answeredCount >= channel.maxQuestions) {
          await prisma.channel.update({
            where: { id: channelId },
            data: { status: 'ended', endedAt: new Date() },
          });
          await TimelineService.channelEnded(channelId, answeredCount);
          channelEnded = true;
        }
      }

      const io = getIO();
      io.to(channelId).emit(SocketEvents.QUESTION_AI_ANSWERED, {
        channelId,
        question: updated,
      });

      // Evaluate progress async
      if (channel) {
        evaluateProgress(channelId, channel.aiProgress).then((progress) => {
          io.to(channelId).emit(SocketEvents.PROGRESS_UPDATED, { channelId, progress });
        });
      }

      if (channelEnded) {
        io.to(channelId).emit(SocketEvents.CHANNEL_ENDED, { channelId });
      }
    } catch (error) {
      logger.warn('Scheduled AI answer failed', { questionId, error: String(error) });
    }
  }, delayMs);

  pendingTimers.set(questionId, timer);
}

export function cancelAiAnswer(questionId: string): void {
  const timer = pendingTimers.get(questionId);
  if (timer) {
    clearTimeout(timer);
    pendingTimers.delete(questionId);
    logger.debug('Cancelled AI answer timer', { questionId });
  }
}

export async function recoverPendingQuestions(): Promise<void> {
  if (!isAiAvailable()) return;

  const pendingQuestions = await prisma.question.findMany({
    where: {
      status: 'pending',
      channel: { aiHostEnabled: true, status: 'active' },
    },
    include: { channel: { select: { id: true, aiHostDelayMinutes: true } } },
  });

  for (const q of pendingQuestions) {
    const elapsed = Date.now() - q.createdAt.getTime();
    const delay = q.channel.aiHostDelayMinutes * 60 * 1000;
    const remaining = Math.max(delay - elapsed, 0);
    scheduleAiAnswer(q.id, q.channel.id, remaining);
  }

  if (pendingQuestions.length > 0) {
    logger.info(`Recovered ${pendingQuestions.length} pending AI answer timers`);
  }
}
