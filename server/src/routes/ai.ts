import { Router, Response } from 'express';
import { isAiAvailable } from '../services/ai';

const router = Router();

router.get('/status', (_req, res: Response) => {
  res.json({ available: isAiAvailable() });
});

export default router;
