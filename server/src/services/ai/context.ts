import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';

export interface AnsweredQuestion {
  askerNickname: string;
  content: string;
  answer: 'yes' | 'no' | 'irrelevant' | 'partial';
  answererNickname: string;
  isKeyQuestion: boolean;
  isAiAnswered: boolean;
}

export interface GameContext {
  surface: string;
  truth: string;
  difficulty: string;
  answeredQuestions: AnsweredQuestion[];
}

export async function loadGameContext(channelId: string): Promise<GameContext> {
  const channel = await prisma.channel.findUniqueOrThrow({
    where: { id: channelId },
    select: {
      surface: true,
      truth: true,
      difficulty: true,
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

  const answeredQuestions: AnsweredQuestion[] = channel.questions.map((q) => ({
    askerNickname: q.asker.nickname,
    content: q.content,
    answer: q.answer as 'yes' | 'no' | 'irrelevant' | 'partial',
    answererNickname: q.isAiAnswered ? 'AI' : (q.answerer?.nickname || '主持人'),
    isKeyQuestion: q.isKeyQuestion,
    isAiAnswered: q.isAiAnswered,
  }));

  return {
    surface: channel.surface,
    truth: channel.truth,
    difficulty: channel.difficulty,
    answeredQuestions,
  };
}

export function formatHistory(questions: AnsweredQuestion[]): string {
  if (questions.length === 0) return '（暂无问答记录）';

  const answerLabel: Record<string, string> = {
    yes: '是',
    no: '否',
    irrelevant: '无关',
    partial: '部分正确',
  };

  return questions
    .map((q, i) => {
      const prefix = q.isAiAnswered ? 'AI' : `主持人${q.answererNickname}`;
      const keyTag = q.isKeyQuestion ? ' [关键问题]' : '';
      return `Q${i + 1}. ${q.askerNickname} 问：「${q.content}」\n    -> ${prefix} 回答：${answerLabel[q.answer] || q.answer}${keyTag}`;
    })
    .join('\n\n');
}

export function formatConfirmedFacts(questions: AnsweredQuestion[]): string {
  const confirmed = questions.filter(
    (q) => q.answer === 'yes' || q.answer === 'partial',
  );
  if (confirmed.length === 0) return '（暂无已确认信息）';

  const answerLabel: Record<string, string> = {
    yes: '是',
    partial: '部分正确',
  };

  return confirmed
    .map(
      (q, i) =>
        `${i + 1}. ${q.askerNickname} 问：「${q.content}」-> ${answerLabel[q.answer]}`,
    )
    .join('\n');
}

export function fillTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '');
}

export function parseLlmJson<T>(raw: string, schema: z.ZodSchema<T>): T | null {
  try {
    // Remove ```json ... ``` wrapper if present
    let cleaned = raw.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }

    const parsed = JSON.parse(cleaned);
    const result = schema.safeParse(parsed);
    if (!result.success) {
      logger.warn('LLM JSON schema validation failed', {
        error: result.error.message,
        raw: raw.slice(0, 200),
      });
      return null;
    }
    return result.data;
  } catch (err) {
    logger.warn('LLM JSON parse failed', {
      error: String(err),
      raw: raw.slice(0, 200),
    });
    return null;
  }
}
