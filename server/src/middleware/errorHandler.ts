import { Request, Response, NextFunction, RequestHandler } from 'express';
import { z } from 'zod';
import { logger } from '../lib/logger';

/**
 * Wrap an async route handler so that thrown errors are forwarded
 * to Express error middleware instead of crashing the process.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

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
