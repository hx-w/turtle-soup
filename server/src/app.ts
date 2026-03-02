import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import authRouter from './routes/auth';
import channelsRouter from './routes/channels';
import usersRouter from './routes/users';
import { errorHandler } from './middleware/errorHandler';

const app = express();

const corsOrigin = process.env.CORS_ORIGIN;
app.use(cors({
  origin: corsOrigin ? corsOrigin.split(',') : '*',
  credentials: !!corsOrigin,
}));
app.use(express.json());

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,                   // 30 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '请求过于频繁，请稍后再试' },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,             // 60 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '请求过于频繁，请稍后再试' },
});

// API routes
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/channels', apiLimiter, channelsRouter);
app.use('/api/users', apiLimiter, usersRouter);

// Central error handler
app.use(errorHandler);

// Serve client static files in production
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));
app.get(/^\/(?!api|socket\.io).*/, (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

export default app;
