import { Router, Request as ExpressRequest, Response } from 'express';
import { Prisma, MemberRole } from '@prisma/client';

type Request = ExpressRequest<Record<string, string>>;
import { prisma } from '../lib/prisma';
import { authRequired } from '../middleware/auth';
import { logger } from '../lib/logger';

const router = Router();

router.get('/me', authRequired, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, nickname: true, avatarSeed: true, createdAt: true },
    });
    res.json(user);
  } catch (err) {
    logger.error('User profile fetch failed', { error: String(err) });
    res.status(500).json({ error: '服务器错误' });
  }
});

router.get('/me/stats', authRequired, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const [created, hosted, participated, questions] = await Promise.all([
      prisma.channelMember.count({ where: { userId, role: 'creator' as MemberRole } }),
      prisma.channelMember.count({ where: { userId, role: 'host' } }),
      prisma.channelMember.count({ where: { userId, role: 'player' } }),
      prisma.question.findMany({
        where: { askerId: userId, status: 'answered' },
        select: { answer: true },
      }),
    ]);

    const yesCount = questions.filter(q => q.answer === 'yes').length;
    const noCount = questions.filter(q => q.answer === 'no').length;
    const irrelevantCount = questions.filter(q => q.answer === 'irrelevant').length;
    const partialCount = questions.filter(q => q.answer === 'partial').length;

    res.json({
      created,
      hosted,
      participated,
      totalQuestions: questions.length,
      distribution: { yes: yesCount, no: noCount, irrelevant: irrelevantCount, partial: partialCount },
      hitRate: questions.length > 0 ? Math.round((yesCount / questions.length) * 100) : 0,
    });
  } catch (err) {
    logger.error('User stats fetch failed', { error: String(err) });
    res.status(500).json({ error: '服务器错误' });
  }
});

router.get('/me/channels', authRequired, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { role } = req.query;

    const where: Prisma.ChannelMemberWhereInput = { userId };
    if (role) {
      // Query exact role match for creator, host, and player tabs
      where.role = String(role) as MemberRole;
    }

    const memberships = await prisma.channelMember.findMany({
      where,
      orderBy: { joinedAt: 'desc' },
      include: {
        channel: {
          select: {
            id: true, title: true, status: true, difficulty: true,
            createdAt: true, endedAt: true,
            _count: { select: { members: true, questions: { where: { status: 'answered' } } } },
          },
        },
      },
    });

    res.json(memberships);
  } catch (err) {
    logger.error('User channels fetch failed', { error: String(err) });
    res.status(500).json({ error: '服务器错误' });
  }
});

export default router;
