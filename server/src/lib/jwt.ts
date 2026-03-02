import jwt from 'jsonwebtoken';
import { env } from './env';

export interface TokenPayload {
  userId: string;
  nickname: string;
}

export function signAccess(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '2h' });
}

export function signRefresh(payload: TokenPayload, rememberMe = false): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: rememberMe ? '30d' : '7d' });
}

export function verifyAccess(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
}

export function verifyRefresh(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload;
}
