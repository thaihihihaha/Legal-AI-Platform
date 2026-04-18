import pkg from '@prisma/client';

const { PrismaClient, Prisma } = pkg;

const prismaClientSingleton = () => {
  return new PrismaClient();
};

const globalForPrisma = globalThis;

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();
export { Prisma };

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export const getPrismaHealth = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      ok: true,
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message,
    };
  }
};
