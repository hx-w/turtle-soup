import { createServer } from 'http';
import app from './app';
import { setupSocket } from './socket';
import { prisma } from './lib/prisma';
import { env } from './lib/env';
import { logger } from './lib/logger';

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
  });
}

main().catch((err) => {
  logger.error('Server startup failed', { error: String(err) });
  process.exit(1);
});
