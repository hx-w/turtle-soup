import { Router, Request as ExpressRequest, Response } from 'express';
import { z } from 'zod';
import { Prisma, ChannelStatus, Difficulty } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authRequired } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { logger } from '../lib/logger';
import { getIO } from '../socket';
import { SocketEvents } from '../constants';
import { TimelineService } from '../services/timeline';
import { scheduleAiAnswer, cancelAiAnswer } from '../services/ai/scheduler';
import { evaluateProgress } from '../services/ai/progress';
import { generateReview } from '../services/ai/review';
import { analyzeClueGraph, getClueGraph, shouldReanalyze, addHintToGraph } from '../services/ai/clue';

type Request = ExpressRequest<Record<string, string>>;

const router = Router();

const createSchema = z.object({
  title: z.string().min(1).max(50),
  surface: z.string().min(1).max(2000),
  truth: z.string().min(1).max(5000),
  maxQuestions: z.number().int().min(0).default(0),
  difficulty: z.enum(['easy', 'medium', 'hard', 'hell']).default('medium'),
  tags: z.array(z.string().min(1).max(10)).max(5).default([]),
  aiHostEnabled: z.boolean().default(false),
  aiHostDelayMinutes: z.number().int().min(1).max(30).default(1),
  aiHintEnabled: z.boolean().default(false),
  aiHintPerPlayer: z.number().int().min(1).max(10).default(3),
});

const answerSchema = z.object({
  answer: z.enum(['yes', 'no', 'irrelevant', 'partial']),
  isKeyQuestion: z.boolean().optional().default(false),
});

const ratingSchema = z.object({
  score: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

const questionSchema = z.object({
  content: z.string().min(1).max(500),
});

const chatSchema = z.object({
  content: z.string().min(1).max(500),
});

// Create channel
router.post('/', authRequired, validate(createSchema), async (req: Request, res: Response) => {
  try {
    const data = req.body;
    if (data.maxQuestions > 0 && data.maxQuestions < 10) {
      res.status(400).json({ error: '最少问题数为10' });
      return;
    }

    const channel = await prisma.channel.create({
      data: {
        ...data,
        creatorId: req.user!.userId,
        members: {
          create: { userId: req.user!.userId, role: 'creator', becameHostAt: new Date() },
        },
      },
      include: {
        creator: { select: { id: true, nickname: true, avatarSeed: true } },
        members: { include: { user: { select: { id: true, nickname: true, avatarSeed: true } } } },
        _count: { select: { members: true, questions: { where: { status: 'answered' } } } },
      },
    });

    await TimelineService.channelCreated(channel.id, req.user!.userId);

    const io = getIO();
    io.to('lobby').emit(SocketEvents.CHANNEL_CREATED, channel);

    res.json(channel);
  } catch (err) {
    logger.error('Channel creation failed', { error: String(err) });
    res.status(500).json({ error: '服务器错误' });
  }
});

// Update channel (surface/truth) — creator only, active channels only
const updateSchema = z.object({
  surface: z.string().min(1).max(2000).optional(),
  truth: z.string().min(1).max(5000).optional(),
});

router.patch('/:id', authRequired, validate(updateSchema), async (req: Request, res: Response) => {
  try {
    const channelId = req.params.id;
    const userId = req.user!.userId;
    const { surface, truth } = req.body;

    if (!surface && !truth) {
      res.status(400).json({ error: '至少修改一项内容' });
      return;
    }

    const channel = await prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel || channel.status !== 'active') {
      res.status(400).json({ error: '频道不存在或已结束' });
      return;
    }

    if (channel.creatorId !== userId) {
      res.status(403).json({ error: '只有创建者可以修改' });
      return;
    }

    const data: Record<string, string> = {};
    if (surface) data.surface = surface;
    if (truth) data.truth = truth;

    const updated = await prisma.channel.update({
      where: { id: channelId },
      data,
      select: { id: true, surface: true, truth: true },
    });

    // Broadcast update — only include surface for all players; truth is private
    const io = getIO();
    io.to(channelId).emit(SocketEvents.CHANNEL_UPDATED, {
      channelId,
      surface: updated.surface,
    });

    res.json(updated);
  } catch (err) {
    logger.error('Channel update failed', { error: String(err) });
    res.status(500).json({ error: '服务器错误' });
  }
});

// List channels
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, search, difficulty, tag, sort = 'newest', page = '1' } = req.query;
    const take = 20;
    const skip = (Number(page) - 1) * take;

    const where: Prisma.ChannelWhereInput = {};
    if (status) {
      where.status = String(status) as ChannelStatus;
    } else {
      // Default: show active and ended, exclude archived
      where.status = { in: ['active' as ChannelStatus, 'ended' as ChannelStatus] };
    }
    if (search) {
      where.OR = [
        { title: { contains: String(search), mode: 'insensitive' } },
        { surface: { contains: String(search), mode: 'insensitive' } },
      ];
    }
    if (difficulty) where.difficulty = String(difficulty) as Difficulty;
    if (tag) where.tags = { has: String(tag) };

    // When showing mixed statuses, put active games first
    const orderBy: Prisma.ChannelOrderByWithRelationInput[] = sort === 'popular'
      ? [{ status: 'asc' }, { members: { _count: 'desc' } }]
      : [{ status: 'asc' }, { createdAt: 'desc' }];

    const [channels, total] = await Promise.all([
      prisma.channel.findMany({
        where,
        orderBy,
        skip,
        take,
        select: {
          id: true, title: true, surface: true, maxQuestions: true, status: true,
          difficulty: true, tags: true, createdAt: true, endedAt: true,
          creatorId: true,
          creator: { select: { id: true, nickname: true, avatarSeed: true } },
          _count: { select: { members: true, questions: { where: { status: 'answered' } } } },
        },
      }),
      prisma.channel.count({ where }),
    ]);

    // Batch-fetch average ratings for ended channels
    const endedIds = channels.filter(c => c.status === 'ended').map(c => c.id);
    const ratingAggs = endedIds.length > 0
      ? await prisma.rating.groupBy({
          by: ['channelId'],
          where: { channelId: { in: endedIds } },
          _avg: { score: true },
          _count: { score: true },
        })
      : [];
    const ratingMap = new Map(ratingAggs.map(r => [r.channelId, {
      averageRating: r._avg.score ? Math.round(r._avg.score * 10) / 10 : null,
      ratingCount: r._count.score,
    }]));

    const channelsWithRatings = channels.map(c => ({
      ...c,
      ...(ratingMap.get(c.id) ?? { averageRating: null, ratingCount: 0 }),
    }));

    res.json({ channels: channelsWithRatings, total, page: Number(page), totalPages: Math.ceil(total / take) });
  } catch (err) {
    logger.error('Channel listing failed', { error: String(err) });
    res.status(500).json({ error: '服务器错误' });
  }
});

// Get channel detail
router.get('/:id', authRequired, async (req: Request, res: Response) => {
  try {
    const channel = await prisma.channel.findUnique({
      where: { id: req.params.id },
      include: {
        creator: { select: { id: true, nickname: true, avatarSeed: true } },
        members: { include: { user: { select: { id: true, nickname: true, avatarSeed: true } } } },
        questions: {
          where: { status: { not: 'withdrawn' } },
          orderBy: { createdAt: 'asc' },
          include: {
            asker: { select: { id: true, nickname: true, avatarSeed: true } },
            answerer: { select: { id: true, nickname: true } },
          },
        },
      },
    });

    if (!channel) {
      res.status(404).json({ error: 'Channel not found' });
      return;
    }

    // Only show truth to hosts or if channel ended
    const member = channel.members.find(m => m.userId === req.user!.userId);
    const isHostOrCreator = member?.role === 'host' || member?.role === 'creator';

    // Strip aiReasoning for non-hosts
    if (!isHostOrCreator) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      channel.questions = channel.questions.map((q: any) => {
        const { aiReasoning: _, ...rest } = q;
        return rest;
      });
    }

    if (!isHostOrCreator && channel.status === 'active') {
      const { truth: _truth, ...channelWithoutTruth } = channel;
      res.json(channelWithoutTruth);
      return;
    }

    res.json(channel);
  } catch (err) {
    logger.error('Channel detail fetch failed', { error: String(err) });
    res.status(500).json({ error: '服务器错误' });
  }
});

// Join channel
router.post('/:id/join', authRequired, async (req: Request, res: Response) => {
  try {
    const channel = await prisma.channel.findUnique({ where: { id: req.params.id } });
    if (!channel || channel.status !== 'active') {
      res.status(400).json({ error: 'Channel 不存在或已结束' });
      return;
    }

    const existingMember = await prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId: channel.id, userId: req.user!.userId } },
    });

    const member = await prisma.channelMember.upsert({
      where: { channelId_userId: { channelId: channel.id, userId: req.user!.userId } },
      update: {},
      create: { channelId: channel.id, userId: req.user!.userId, role: 'player' },
      include: { user: { select: { id: true, nickname: true, avatarSeed: true } } },
    });

    if (!existingMember) {
      await TimelineService.playerJoined(channel.id, req.user!.userId);
    }

    res.json(member);
  } catch (err) {
    logger.error('Channel join failed', { error: String(err) });
    res.status(500).json({ error: '服务器错误' });
  }
});

// Submit question
router.post('/:id/questions', authRequired, validate(questionSchema), async (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    const channelId = req.params.id;
    const userId = req.user!.userId;

    const channel = await prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel || channel.status !== 'active') {
      res.status(400).json({ error: 'Channel 不可用' });
      return;
    }

    // Auto-join as player if not a member
    let member = await prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId } },
    });
    if (!member) {
      member = await prisma.channelMember.create({
        data: { channelId, userId, role: 'player' },
      });
      await TimelineService.playerJoined(channelId, userId);
    }
    if (member.role === 'host' || member.role === 'creator') {
      res.status(403).json({ error: '主持人不能提问' });
      return;
    }

    // Check pending
    const pending = await prisma.question.findFirst({
      where: { channelId, askerId: userId, status: 'pending' },
    });
    if (pending) {
      res.status(400).json({ error: '你已有一个待回答的问题' });
      return;
    }

    const question = await prisma.question.create({
      data: { channelId, askerId: userId, content },
      include: { asker: { select: { id: true, nickname: true, avatarSeed: true } } },
    });

    const questionCount = await prisma.question.count({ where: { channelId } });
    if (questionCount === 1) {
      await TimelineService.firstQuestion(channelId, userId, question.id);
    } else {
      await TimelineService.questionAsked(channelId, userId, question.id);
    }

    // Schedule AI auto-answer if enabled
    if (channel.aiHostEnabled) {
      scheduleAiAnswer(question.id, channelId, channel.aiHostDelayMinutes * 60 * 1000);
    }

    res.json(question);
  } catch (err) {
    logger.error('Question submission failed', { error: String(err) });
    res.status(500).json({ error: '服务器错误' });
  }
});

// Answer question
router.put('/:id/questions/:qid/answer', authRequired, validate(answerSchema), async (req: Request, res: Response) => {
  try {
    const { answer, isKeyQuestion } = req.body;
    const { id: channelId, qid } = req.params;
    const userId = req.user!.userId;

    cancelAiAnswer(qid);

    const member = await prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId } },
    });
    if (!member || (member.role !== 'host' && member.role !== 'creator')) {
      res.status(403).json({ error: '只有主持人可以回答' });
      return;
    }

    const question = await prisma.question.findUnique({
      where: { id: qid },
      include: { asker: { select: { nickname: true } } },
    });
    if (!question || question.channelId !== channelId || question.status !== 'pending') {
      res.status(400).json({ error: '问题不存在或已被回答' });
      return;
    }

    const canMarkKeyQuestion = isKeyQuestion && (answer === 'yes' || answer === 'no');

    const updated = await prisma.question.update({
      where: { id: qid },
      data: {
        answer,
        answeredBy: userId,
        answeredAt: new Date(),
        status: 'answered',
        isKeyQuestion: canMarkKeyQuestion,
      },
      include: {
        asker: { select: { id: true, nickname: true, avatarSeed: true } },
        answerer: { select: { id: true, nickname: true } },
      },
    });

    const answerer = await prisma.user.findUnique({ where: { id: userId }, select: { nickname: true } });
    await TimelineService.questionAnswered(channelId, qid, answer, answerer?.nickname || '主持人');

    if (canMarkKeyQuestion) {
      await TimelineService.keyQuestion(channelId, question.askerId, qid, answer);
    }

    const channel = await prisma.channel.findUnique({ where: { id: channelId } });

    // Async progress evaluation (only if game is still active)
    if (channel && channel.status === 'active' && (channel.aiHostEnabled || channel.aiHintEnabled)) {
      evaluateProgress(channelId, channel.aiProgress).then((progress) => {
        const io = getIO();
        io.to(channelId).emit(SocketEvents.PROGRESS_UPDATED, { channelId, progress });
      });
      
      // Async clue graph analysis (only if AI hints enabled and answer is relevant)
      if (channel.aiHintEnabled && answer !== 'irrelevant') {
        shouldReanalyze(channelId).then((needAnalyze) => {
          if (needAnalyze) {
            analyzeClueGraph(channelId).catch((err) => {
              logger.warn('Clue graph analysis failed', { channelId, error: String(err) });
            });
          }
        });
      }
    }
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
        res.json({ question: updated, channelEnded: true });
        return;
      }
    }

    res.json({ question: updated, channelEnded: false });
  } catch (err) {
    logger.error('Question answer failed', { error: String(err) });
    res.status(500).json({ error: '服务器错误' });
  }
});

// Withdraw question
router.put('/:id/questions/:qid/withdraw', authRequired, async (req: Request, res: Response) => {
  try {
    const question = await prisma.question.findUnique({ where: { id: req.params.qid } });
    if (!question || question.askerId !== req.user!.userId || question.status !== 'pending') {
      res.status(400).json({ error: '无法撤回' });
      return;
    }

    const updated = await prisma.question.update({
      where: { id: req.params.qid },
      data: { status: 'withdrawn' },
    });

    res.json(updated);
  } catch (err) {
    logger.error('Question withdrawal failed', { error: String(err) });
    res.status(500).json({ error: '服务器错误' });
  }
});

// Reveal truth (become host)
router.post('/:id/reveal', authRequired, async (req: Request, res: Response) => {
  try {
    const channelId = req.params.id;
    const userId = req.user!.userId;

    const channel = await prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel || channel.status !== 'active') {
      res.status(400).json({ error: 'Channel 不可用' });
      return;
    }

    let member = await prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId } },
    });
    if (!member) {
      member = await prisma.channelMember.create({
        data: { channelId, userId, role: 'player' },
      });
      await TimelineService.playerJoined(channelId, userId);
    }
    if (member.role === 'host' || member.role === 'creator') {
      res.json({ truth: channel.truth, alreadyHost: true });
      return;
    }

    await prisma.question.updateMany({
      where: { channelId, askerId: userId, status: 'pending' },
      data: { status: 'withdrawn' },
    });

    await prisma.channelMember.update({
      where: { channelId_userId: { channelId, userId } },
      data: { role: 'host', becameHostAt: new Date() },
    });

    await TimelineService.truthRevealed(channelId, userId);
    await TimelineService.roleChanged(channelId, userId, 'player', 'host');

    res.json({ truth: channel.truth, alreadyHost: false });
  } catch (err) {
    logger.error('Truth reveal failed', { error: String(err) });
    res.status(500).json({ error: '服务器错误' });
  }
});

// End channel (creator only)
router.post('/:id/end', authRequired, async (req: Request, res: Response) => {
  try {
    const channelId = req.params.id;
    const member = await prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId: req.user!.userId } },
    });
    if (!member || member.role !== 'creator') {
      res.status(403).json({ error: '只有创建者可以结束游戏' });
      return;
    }

    const answeredCount = await prisma.question.count({
      where: { channelId, status: 'answered' },
    });

    const channel = await prisma.channel.update({
      where: { id: channelId },
      data: { status: 'ended', endedAt: new Date() },
    });

    await TimelineService.channelEnded(channelId, answeredCount);

    // Async AI review generation
    generateReview(channelId).then((review) => {
      if (review) {
        const io = getIO();
        io.to(channelId).emit(SocketEvents.AI_REVIEW_READY, { channelId, review });
      }
    }).catch((err) => logger.warn('AI review generation failed', { channelId, error: String(err) }));

    res.json(channel);
  } catch (err) {
    logger.error('Channel end failed', { error: String(err) });
    res.status(500).json({ error: '服务器错误' });
  }
});

// Delete (archive) channel — creator only, ended channels only
router.delete('/:id', authRequired, async (req: Request, res: Response) => {
  try {
    const channelId = req.params.id;
    const userId = req.user!.userId;

    const channel = await prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel) {
      res.status(404).json({ error: '频道不存在' });
      return;
    }
    if (channel.creatorId !== userId) {
      res.status(403).json({ error: '只有创建者可以删除频道' });
      return;
    }
    if (channel.status !== 'ended') {
      res.status(400).json({ error: '只能删除已结束的频道' });
      return;
    }

    await prisma.channel.update({
      where: { id: channelId },
      data: { status: 'archived' },
    });

    res.json({ success: true });
  } catch (err) {
    logger.error('Channel deletion failed', { error: String(err) });
    res.status(500).json({ error: '服务器错误' });
  }
});

// Get channel stats
router.get('/:id/stats', authRequired, async (req: Request, res: Response) => {
  try {
    const channelId = req.params.id;
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: { members: { include: { user: { select: { id: true, nickname: true, avatarSeed: true } } } } },
    });
    if (!channel) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    const questions = await prisma.question.findMany({
      where: { channelId, status: 'answered' },
      include: { asker: { select: { id: true, nickname: true } } },
    });

    const yesCount = questions.filter(q => q.answer === 'yes').length;
    const noCount = questions.filter(q => q.answer === 'no').length;
    const irrelevantCount = questions.filter(q => q.answer === 'irrelevant').length;
    const partialCount = questions.filter(q => q.answer === 'partial').length;
    const keyQuestionCount = questions.filter(q => q.isKeyQuestion).length;
    const total = questions.length;

    const playerStats: Record<string, { nickname: string; yes: number; no: number; irrelevant: number; partial: number; total: number }> = {};
    for (const q of questions) {
      const key = q.askerId;
      if (!playerStats[key]) {
        playerStats[key] = { nickname: q.asker.nickname, yes: 0, no: 0, irrelevant: 0, partial: 0, total: 0 };
      }
      if (q.answer === 'yes' || q.answer === 'no' || q.answer === 'irrelevant' || q.answer === 'partial') {
        playerStats[key][q.answer]++;
      }
      playerStats[key].total++;
    }

    const players = Object.entries(playerStats).map(([id, s]) => ({ id, ...s }));
    const bestDetective = players.sort((a, b) => b.yes - a.yes)[0] || null;
    const mostWrong = players.sort((a, b) => b.no - a.no)[0] || null;
    const mostActive = players.sort((a, b) => b.total - a.total)[0] || null;
    const lastYes = questions.filter(q => q.answer === 'yes').pop() || null;

    const duration = channel.endedAt
      ? Math.round((channel.endedAt.getTime() - channel.createdAt.getTime()) / 1000)
      : null;

    const ratings = await prisma.rating.findMany({
      where: { channelId },
      select: { score: true, userId: true, comment: true },
    });
    const averageRating = ratings.length > 0
      ? Math.round((ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length) * 10) / 10
      : null;
    const myRating = ratings.find(r => r.userId === req.user!.userId);

    const hostContributions = await Promise.all(
      channel.members
        .filter(m => m.role === 'host' || m.role === 'creator')
        .map(async m => {
          const answeredQuestions = await prisma.question.findMany({
            where: { channelId, answeredBy: m.userId },
          });
          return {
            id: m.user.id,
            nickname: m.user.nickname,
            avatarSeed: m.user.avatarSeed,
            role: m.role,
            answeredCount: answeredQuestions.length,
            yesCount: answeredQuestions.filter(q => q.answer === 'yes').length,
            noCount: answeredQuestions.filter(q => q.answer === 'no').length,
            keyQuestions: answeredQuestions.filter(q => q.isKeyQuestion).length,
          };
        })
    );

    res.json({
      totalQuestions: total,
      distribution: { yes: yesCount, no: noCount, irrelevant: irrelevantCount, partial: partialCount },
      keyQuestionCount,
      playerCount: channel.members.filter(m => m.role === 'player').length,
      hosts: channel.members.filter(m => m.role === 'host' || m.role === 'creator').map(m => ({
        id: m.user.id,
        nickname: m.user.nickname,
        avatarSeed: m.user.avatarSeed,
        role: m.role,
        becameHostAt: m.becameHostAt,
      })),
      hostContributions,
      duration,
      awards: { bestDetective, mostWrong, mostActive, lastYes },
      averageRating,
      ratingCount: ratings.length,
      myRating: myRating ? { score: myRating.score, comment: myRating.comment ?? undefined } : null,
      aiReview: channel.aiReview ?? null,
    });
  } catch (err) {
    logger.error('Channel stats fetch failed', { error: String(err) });
    res.status(500).json({ error: '服务器错误' });
  }
});

// Submit rating
router.post('/:id/ratings', authRequired, validate(ratingSchema), async (req: Request, res: Response) => {
  try {
    const { score, comment } = req.body;
    const channelId = req.params.id;
    const userId = req.user!.userId;

    const channel = await prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel || channel.status === 'active') {
      res.status(400).json({ error: 'Channel 尚未结束' });
      return;
    }

    // Check membership - only hosts and players can rate (not creator)
    const member = await prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId } },
    });
    if (!member) {
      res.status(403).json({ error: '只有参与者可以评分' });
      return;
    }
    if (member.role === 'creator') {
      res.status(403).json({ error: '创建者不能给自己评分' });
      return;
    }
    const rating = await prisma.rating.upsert({
      where: { channelId_userId: { channelId, userId } },
      update: { score, comment },
      create: { channelId, userId, score, comment },
      include: { user: { select: { id: true, nickname: true, avatarSeed: true } } },
    });

    res.json(rating);
  } catch (err) {
    logger.error('Rating submission failed', { error: String(err) });
    res.status(500).json({ error: '服务器错误' });
  }
});

// Get ratings
router.get('/:id/ratings', async (req: Request, res: Response) => {
  try {
    const ratings = await prisma.rating.findMany({
      where: { channelId: req.params.id },
      include: { user: { select: { id: true, nickname: true, avatarSeed: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const avg = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length
      : 0;

    res.json({ ratings, average: Math.round(avg * 10) / 10, count: ratings.length });
  } catch (err) {
    logger.error('Ratings fetch failed', { error: String(err) });
    res.status(500).json({ error: '服务器错误' });
  }
});

// Get chat messages
router.get('/:id/chat', authRequired, async (req: Request, res: Response) => {
  try {
    const channelId = req.params.id;
    const { before, limit = '50' } = req.query;
    const take = Math.min(Number(limit), 100);

    const where: Prisma.ChatMessageWhereInput = { channelId };
    if (before) {
      where.createdAt = { lt: new Date(String(before)) };
    }

    const messages = await prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      include: {
        user: { select: { id: true, nickname: true, avatarSeed: true } },
      },
    });

    // Get role for each user in this channel
    const userIds = [...new Set(messages.map(m => m.userId))];
    const members = await prisma.channelMember.findMany({
      where: {
        channelId,
        userId: { in: userIds },
      },
      select: { userId: true, role: true },
    });
    const roleMap = new Map(members.map(m => [m.userId, m.role]));

    const messagesWithRole = messages.map(m => ({
      ...m,
      user: {
        ...m.user,
        role: roleMap.get(m.userId) || 'player',
      },
    }));

    const hasMore = messagesWithRole.length > take;
    if (hasMore) messagesWithRole.pop();

    res.json({ messages: messagesWithRole.reverse(), hasMore });
  } catch (err) {
    logger.error('Chat messages fetch failed', { error: String(err) });
    res.status(500).json({ error: '服务器错误' });
  }
});

// Send chat message
router.post('/:id/chat', authRequired, validate(chatSchema), async (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    const channelId = req.params.id;
    const userId = req.user!.userId;

    const channel = await prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel || (channel.status !== 'active' && channel.status !== 'ended')) {
      res.status(400).json({ error: 'Channel 不可用' });
      return;
    }

    const member = await prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId } },
    });
    if (!member) {
      res.status(403).json({ error: '你不是该频道的成员' });
      return;
    }

    // During active game: only players and creator can chat. After game ends: everyone can chat.
    if (channel.status === 'active' && member.role === 'host') {
      res.status(403).json({ error: '游戏进行中主持人不能在讨论区发言' });
      return;
    }

    const message = await prisma.chatMessage.create({
      data: { channelId, userId, content },
      include: {
        user: { select: { id: true, nickname: true, avatarSeed: true } },
      },
    });

    res.json(message);
  } catch (err) {
    logger.error('Chat message send failed', { error: String(err) });
    res.status(500).json({ error: '服务器错误' });
  }
});

// Get timeline
router.get('/:id/timeline', authRequired, async (req: Request, res: Response) => {
  try {
    const events = await prisma.timelineEvent.findMany({
      where: { channelId: req.params.id },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, nickname: true, avatarSeed: true } },
      },
    });
    res.json(events);
  } catch (err) {
    logger.error('Timeline fetch failed', { error: String(err) });
    res.status(500).json({ error: '服务器错误' });
  }
});

// Correct AI answer
const aiCorrectSchema = z.object({
  answer: z.enum(['yes', 'no', 'irrelevant', 'partial']),
  isKeyQuestion: z.boolean().optional().default(false),
});

router.put('/:id/questions/:qid/ai-correct', authRequired, validate(aiCorrectSchema), async (req: Request, res: Response) => {
  try {
    const { answer, isKeyQuestion } = req.body;
    const { id: channelId, qid } = req.params;
    const userId = req.user!.userId;

    const member = await prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId } },
    });
    if (!member || (member.role !== 'host' && member.role !== 'creator')) {
      res.status(403).json({ error: '只有主持人可以修改' });
      return;
    }

    const question = await prisma.question.findUnique({ where: { id: qid } });
    if (!question || question.channelId !== channelId || !question.isAiAnswered) {
      res.status(400).json({ error: '只能修改 AI 的回答' });
      return;
    }

    const canMarkKey = isKeyQuestion && (answer === 'yes' || answer === 'no');

    const updated = await prisma.question.update({
      where: { id: qid },
      data: { answer, isKeyQuestion: canMarkKey },
      include: {
        asker: { select: { id: true, nickname: true, avatarSeed: true } },
        answerer: { select: { id: true, nickname: true } },
      },
    });

    const corrector = await prisma.user.findUnique({ where: { id: userId }, select: { nickname: true } });
    await TimelineService.aiAnswerModified(channelId, qid, answer, corrector?.nickname || '主持人');

    const io = getIO();
    io.to(channelId).emit(SocketEvents.QUESTION_AI_CORRECTED, {
      channelId, question: updated, modifiedBy: corrector?.nickname,
    });

    // Re-evaluate progress async (only if game is still active)
    const ch = await prisma.channel.findUnique({ 
      where: { id: channelId }, 
      select: { aiProgress: true, status: true } 
    });
    if (ch && ch.status === 'active') {
      evaluateProgress(channelId, ch.aiProgress).then((progress) => {
        io.to(channelId).emit(SocketEvents.PROGRESS_UPDATED, { channelId, progress });
      });
    }
    res.json(updated);
  } catch (err) {
    logger.error('AI answer correction failed', { error: String(err) });
    res.status(500).json({ error: '服务器错误' });
  }
});

// Request AI hint
import { generateHint } from '../services/ai/hint';

router.post('/:id/hints', authRequired, async (req: Request, res: Response) => {
  try {
    const channelId = req.params.id;
    const userId = req.user!.userId;

    const channel = await prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel || !channel.aiHintEnabled) {
      res.status(400).json({ error: 'AI 线索未启用' });
      return;
    }

    const member = await prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId } },
    });
    if (!member || member.role === 'host' || member.role === 'creator') {
      res.status(403).json({ error: '主持人不能请求线索' });
      return;
    }

    const usedCount = await prisma.aiHint.count({ where: { channelId, userId } });
    if (usedCount >= channel.aiHintPerPlayer) {
      res.status(403).json({ error: '线索次数已用完' });
      return;
    }

    const hintText = await generateHint(channelId);
    if (!hintText) {
      res.status(503).json({ error: 'AI 暂时不可用，请稍后再试' });
      return;
    }

    const hint = await prisma.aiHint.create({
      data: { channelId, userId, content: hintText },
      include: { user: { select: { id: true, nickname: true, avatarSeed: true } } },
    });

    await TimelineService.hintUsed(channelId, userId);

    const remaining = channel.aiHintPerPlayer - usedCount - 1;
    res.json({ hint, remaining });
  } catch (err) {
    logger.error('Hint request failed', { error: String(err) });
    res.status(500).json({ error: '服务器错误' });
  }
});

// Toggle hint visibility
router.put('/:id/hints/:hintId/visibility', authRequired, async (req: Request, res: Response) => {
  try {
    const { hintId } = req.params;
    const channelId = req.params.id;
    const userId = req.user!.userId;
    const { isPublic } = req.body;

    const hint = await prisma.aiHint.findUnique({ where: { id: hintId } });
    if (!hint || hint.channelId !== channelId || hint.userId !== userId) {
      res.status(403).json({ error: '只能修改自己的线索' });
      return;
    }

    const updated = await prisma.aiHint.update({
      where: { id: hintId },
      data: { isPublic: !!isPublic },
      include: { user: { select: { id: true, nickname: true, avatarSeed: true } } },
    });

    if (isPublic) {
      await TimelineService.hintShared(channelId, userId);
      const io = getIO();
      io.to(channelId).emit(SocketEvents.HINT_SHARED, { channelId, hint: updated });
    }

    res.json(updated);
  } catch (err) {
    logger.error('Hint visibility toggle failed', { error: String(err) });
    res.status(500).json({ error: '服务器错误' });
  }
});

// Get hints list
router.get('/:id/hints', authRequired, async (req: Request, res: Response) => {
  try {
    const channelId = req.params.id;
    const userId = req.user!.userId;

    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      select: { aiHintPerPlayer: true },
    });
    if (!channel) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    const hints = await prisma.aiHint.findMany({
      where: {
        channelId,
        OR: [
          { isPublic: true },
          { userId },
        ],
      },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { id: true, nickname: true, avatarSeed: true } } },
    });

    const myUsedCount = await prisma.aiHint.count({ where: { channelId, userId } });
    const myRemaining = channel.aiHintPerPlayer - myUsedCount;

    res.json({ hints, myRemaining });
  } catch (err) {
    logger.error('Hints fetch failed', { error: String(err) });
    res.status(500).json({ error: '服务器错误' });
  }
});

// Stats route: add aiReview to response
// (Handled inline in existing stats route via channel.aiReview)

// Get clue graph
router.get('/:id/clues', authRequired, async (req: Request, res: Response) => {
  try {
    const channelId = req.params.id;

    const channel = await prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel) {
      res.status(404).json({ error: '频道不存在' });
      return;
    }

    // Check if re-analysis is needed
    const needReanalyze = await shouldReanalyze(channelId);
    if (needReanalyze) {
      // Trigger async analysis
      analyzeClueGraph(channelId).catch((err) => {
        logger.warn('Clue graph analysis failed', { channelId, error: String(err) });
      });
    }

    const clueGraph = await getClueGraph(channelId);
    res.json(clueGraph || { nodes: [], edges: [] });
  } catch (err) {
    logger.error('Clue graph fetch failed', { error: String(err) });
    res.status(500).json({ error: '服务器错误' });
  }
});

// Trigger clue graph analysis
router.post('/:id/clues/analyze', authRequired, async (req: Request, res: Response) => {
  try {
    const channelId = req.params.id;
    const userId = req.user!.userId;

    const member = await prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId } },
    });
    if (!member) {
      res.status(403).json({ error: '你不是该频道的成员' });
      return;
    }

    const result = await analyzeClueGraph(channelId);
    res.json(result || { nodes: [], edges: [] });
  } catch (err) {
    logger.error('Clue graph analysis failed', { error: String(err) });
    res.status(500).json({ error: '服务器错误' });
  }
});
export default router;
