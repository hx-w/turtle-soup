import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { logger } from '../lib/logger';

/**
 * Central error handler — mount as the last middleware.
 * Handles Zod validation errors and generic server errors.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof z.ZodError) {
    res.status(400).json({ error: '输入格式不正确', details: err.errors });
    return;
  }

  logger.error('Unhandled error', { error: String(err) });
  res.status(500).json({ error: '服务器错误' });
}
