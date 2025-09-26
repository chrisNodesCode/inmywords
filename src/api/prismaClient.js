import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

const prisma = globalForPrisma.__prismaClient ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__prismaClient = prisma;
}

export default prisma;

export async function disconnectPrisma() {
  await prisma.$disconnect();
  delete globalForPrisma.__prismaClient;
}
