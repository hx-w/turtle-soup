import { generateText } from 'ai';
import { z } from 'zod';
import { getModel, getRequestTimeout } from './provider';
import { loadGameContext, formatHistory, fillTemplate, parseLlmJson } from './context';
import { SYSTEM_PROMPT, HOST_JUDGE_PROMPT } from './prompts';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import { env } from '../../lib/env';

const aiJudgementSchema = z.object({
  answer: z.enum(['yes', 'no', 'irrelevant', 'partial']),
  isKeyQuestion: z.boolean(),
  reasoning: z.string(),
});

export type AiJudgement = z.infer<typeof aiJudgementSchema>;

export async function aiJudgeQuestion(
  channelId: string,
  questionId: string,
): Promise<AiJudgement | null> {
  const model = getModel();
  if (!model) return null;

  try {
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { asker: { select: { nickname: true } } },
    });
    if (!question || question.status !== 'pending') return null;

    const ctx = await loadGameContext(channelId);
    const prompt = fillTemplate(HOST_JUDGE_PROMPT, {
      surface: ctx.surface,
      truth: ctx.truth,
      history: formatHistory(ctx.answeredQuestions),
      asker: question.asker.nickname,
      question: question.content,
    });

    const timeout = getRequestTimeout();
    logger.info('AI judge request started', {
      channelId,
      questionId,
      model: env.AI_MODEL,
      provider: env.AI_PROVIDER,
      baseUrl: env.AI_BASE_URL,
      timeout,
      questionLength: question.content.length,
    });

    const result = await generateText({
      model,
      system: SYSTEM_PROMPT,
      prompt,
      abortSignal: AbortSignal.timeout(timeout),
    });

    logger.info('AI judge response received', {
      channelId,
      questionId,
      responseLength: result.text.length,
      responsePreview: result.text.slice(0, 200),
    });

    return parseLlmJson(result.text, aiJudgementSchema);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isTimeout = errorMessage.includes('abort') || errorMessage.includes('timeout');
    logger.warn('AI judge failed', {
      channelId,
      questionId,
      model: env.AI_MODEL,
      provider: env.AI_PROVIDER,
      baseUrl: env.AI_BASE_URL,
      error: errorMessage,
      isTimeout,
    });
    return null;
  }
}
