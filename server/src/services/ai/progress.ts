import { generateText } from 'ai';
import { getModel, getRequestTimeout } from './provider';
import { loadGameContext, formatConfirmedFacts, fillTemplate } from './context';
import { SYSTEM_PROMPT, PROGRESS_PROMPT } from './prompts';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';

export async function evaluateProgress(
  channelId: string,
  currentProgress: number,
): Promise<number> {
  const model = getModel();
  if (!model) return currentProgress;

  try {
    const ctx = await loadGameContext(channelId);
    const prompt = fillTemplate(PROGRESS_PROMPT, {
      truth: ctx.truth,
      confirmedFacts: formatConfirmedFacts(ctx.answeredQuestions),
      currentProgress: currentProgress.toFixed(1),
    });

    const result = await generateText({
      model,
      system: SYSTEM_PROMPT,
      prompt,
      abortSignal: AbortSignal.timeout(getRequestTimeout()),
    });

    const parsed = parseFloat(result.text.trim());
    if (isNaN(parsed) || parsed < 0 || parsed > 100) {
      logger.warn('AI progress evaluation returned invalid number', {
        channelId,
        raw: result.text.slice(0, 50),
      });
      return currentProgress;
    }

    const newProgress = Math.max(currentProgress, parsed);

    await prisma.channel.update({
      where: { id: channelId },
      data: { aiProgress: newProgress },
    });

    return newProgress;
  } catch (error) {
    logger.warn('AI progress evaluation failed', { channelId, error: String(error) });
    return currentProgress;
  }
}
