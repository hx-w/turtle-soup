import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const code = process.env.INITIAL_INVITE_CODE || 'TURTLE2024';

  await prisma.inviteCode.upsert({
    where: { code },
    update: {},
    create: {
      code,
      maxUses: 0, // unlimited
    },
  });

  console.log(`Invite code ready: ${code}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
