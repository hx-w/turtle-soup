import { Router, Request as ExpressRequest, Response } from 'express';

type Request = ExpressRequest<Record<string, string>>;
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { signAccess, signRefresh, verifyRefresh } from '../lib/jwt';
import { validate } from '../middleware/validate';
import { logger } from '../lib/logger';

const router = Router();

const registerSchema = z.object({
  nickname: z.string().min(2).max(16),
  password: z.string().min(8).max(32),
  inviteCode: z.string().min(1),
});

const loginSchema = z.object({
  nickname: z.string(),
  password: z.string(),
  rememberMe: z.boolean().optional().default(false),
});

router.post('/register', validate(registerSchema), async (req: Request, res: Response) => {
  try {
    const { nickname, password, inviteCode } = req.body;

    // Validate invite code
    const code = await prisma.inviteCode.findUnique({ where: { code: inviteCode } });
    if (!code) {
      res.status(400).json({ error: '邀请码无效' });
      return;
    }
    if (code.maxUses > 0 && code.usedCount >= code.maxUses) {
      res.status(400).json({ error: '邀请码已用完' });
      return;
    }

    // Check nickname uniqueness
    const existing = await prisma.user.findUnique({ where: { nickname } });
    if (existing) {
      res.status(400).json({ error: '昵称已被使用' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { nickname, passwordHash },
    });

    // Increment invite code usage
    await prisma.inviteCode.update({
      where: { code: inviteCode },
      data: { usedCount: { increment: 1 } },
    });

    const accessToken = signAccess({ userId: user.id, nickname: user.nickname });
    const refreshToken = signRefresh({ userId: user.id, nickname: user.nickname });

    res.json({ accessToken, refreshToken, user: { id: user.id, nickname: user.nickname, avatarSeed: user.avatarSeed } });
  } catch (err) {
    logger.error('Registration failed', { error: String(err) });
    res.status(500).json({ error: '服务器错误' });
  }
});

router.post('/login', validate(loginSchema), async (req: Request, res: Response) => {
  try {
    const { nickname, password, rememberMe } = req.body;

    const user = await prisma.user.findUnique({ where: { nickname } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ error: '昵称或密码错误' });
      return;
    }

    const accessToken = signAccess({ userId: user.id, nickname: user.nickname });
    const refreshToken = signRefresh({ userId: user.id, nickname: user.nickname }, rememberMe);

    res.json({ accessToken, refreshToken, user: { id: user.id, nickname: user.nickname, avatarSeed: user.avatarSeed } });
  } catch (err) {
    logger.error('Login failed', { error: String(err) });
    res.status(500).json({ error: '服务器错误' });
  }
});

router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ error: 'Missing refresh token' });
      return;
    }

    const payload = verifyRefresh(refreshToken);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    const newAccess = signAccess({ userId: user.id, nickname: user.nickname });
    const newRefresh = signRefresh({ userId: user.id, nickname: user.nickname });

    res.json({ accessToken: newAccess, refreshToken: newRefresh });
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

export default router;
