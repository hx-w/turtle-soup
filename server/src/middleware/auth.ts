import { Request, Response, NextFunction } from 'express';
import { verifyAccess, TokenPayload } from '../lib/jwt';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export function authRequired(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing token' });
    return;
  }

  try {
    req.user = verifyAccess(header.slice(7));
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
