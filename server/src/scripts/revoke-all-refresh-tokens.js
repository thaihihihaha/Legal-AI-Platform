import { prisma } from '../lib/prisma.js';

const main = async () => {
  const result = await prisma.refreshToken.updateMany({
    where: { revoked_at: null },
    data: { revoked_at: new Date() },
  });
  console.log(`Revoked ${result.count} active refresh tokens.`);
  await prisma.$disconnect();
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
