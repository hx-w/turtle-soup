import { createServer } from 'http';
import app from './app';
import { setupSocket } from './socket';
import { prisma } from './lib/prisma';
import { env } from './lib/env';
import { logger } from './lib/logger';
import { recoverPendingQuestions } from './services/ai/scheduler';

const PORT = env.PORT;

async function main() {
  // Ensure DB connection
  await prisma.$connect();

  // Seed initial invite code if needed
  const code = env.INITIAL_INVITE_CODE;
  await prisma.inviteCode.upsert({
    where: { code },
    update: {},
    create: { code, maxUses: 0 },
  });

  const server = createServer(app);
  setupSocket(server);

  server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    
    // Log AI status
    const { AI_PROVIDER, AI_BASE_URL, AI_API_KEY, AI_MODEL } = env;
    if (AI_PROVIDER && AI_BASE_URL && AI_API_KEY) {
      logger.info(`AI configured: provider=${AI_PROVIDER}, model=${AI_MODEL || 'default'}, baseUrl=${AI_BASE_URL}`);
    } else {
      logger.warn('AI not configured - AI features disabled. Set AI_PROVIDER, AI_BASE_URL, AI_API_KEY to enable.');
    }
    
    recoverPendingQuestions().catch((err) => {
      logger.warn('Failed to recover pending AI questions', { error: String(err) });
    });
  });
}

main().catch((err) => {
  logger.error('Server startup failed', { error: String(err) });
  process.exit(1);
});
