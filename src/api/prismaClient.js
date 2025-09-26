import { PrismaClient } from '@prisma/client';
import { isFeatureEnabled } from '@/utils/featureFlags';

const globalForPrisma = globalThis;
const USE_SHARED_CLIENT = isFeatureEnabled('useSharedPrismaClient');

function createClient() {
  const client = new PrismaClient();
  if (process.env.NODE_ENV !== 'production') {
    console.info(
      `[prisma] Instantiated ${USE_SHARED_CLIENT ? 'shared' : 'legacy fallback'} Prisma client`,
    );
  }
  return client;
}

let prisma = null;

if (USE_SHARED_CLIENT) {
  prisma = globalForPrisma.__prismaClient ?? createClient();
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.__prismaClient = prisma;
  }
} else {
  prisma = createClient();
}

export function getPrismaClientMode() {
  return USE_SHARED_CLIENT ? 'shared' : 'legacy';
}

export function createPrismaClientContext() {
  if (USE_SHARED_CLIENT) {
    return {
      client: prisma,
      mode: 'shared',
      async release() {},
    };
  }

  const legacyClient = createClient();
  return {
    client: legacyClient,
    mode: 'legacy',
    async release() {
      try {
        await legacyClient.$disconnect();
      } catch (error) {
        console.warn('[prisma] Failed to disconnect legacy Prisma client', error);
      }
    },
  };
}

export default prisma;

export async function disconnectPrisma() {
  if (!prisma) return;
  await prisma.$disconnect();
  if (USE_SHARED_CLIENT && process.env.NODE_ENV !== 'production') {
    delete globalForPrisma.__prismaClient;
  }
}
