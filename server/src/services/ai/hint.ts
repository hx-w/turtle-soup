import { generateText } from 'ai';
import { getModel, getRequestTimeout } from './provider';
import { loadGameContext, formatHistory, fillTemplate } from './context';
import { SYSTEM_PROMPT, HINT_PROMPT } from './prompts';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';

export async function generateHint(channelId: string): Promise<string | null> {
  const model = getModel();
  if (!model) return null;

  try {
    const channel = await prisma.channel.findUniqueOrThrow({
      where: { id: channelId },
      select: { aiProgress: true },
    });

    const ctx = await loadGameContext(channelId);
    const prompt = fillTemplate(HINT_PROMPT, {
      surface: ctx.surface,
      truth: ctx.truth,
      history: formatHistory(ctx.answeredQuestions),
      progress: channel.aiProgress.toFixed(1),
    });

    const result = await generateText({
      model,
      system: SYSTEM_PROMPT,
      prompt,
      abortSignal: AbortSignal.timeout(getRequestTimeout()),
    });

    const text = result.text.trim();
    return text.slice(0, 100);
  } catch (error) {
    logger.warn('AI hint generation failed', { channelId, error: String(error) });
    return null;
  }
}
