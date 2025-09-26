/** @jest-environment node */

const prismaInstances = [];

jest.mock('@prisma/client', () => {
  const PrismaClient = jest.fn(() => {
    const instance = {
      id: Symbol('mock-prisma'),
      $disconnect: jest.fn().mockResolvedValue(undefined),
    };
    prismaInstances.push(instance);
    return instance;
  });

  return { PrismaClient };
});

describe('prismaClient helper', () => {
  afterEach(async () => {
    jest.resetModules();
    if (globalThis.__prismaClient?.$disconnect) {
      await globalThis.__prismaClient.$disconnect();
    }
    delete globalThis.__prismaClient;
    prismaInstances.length = 0;
  });

  it('returns the same instance across isolated imports', async () => {
    jest.resetModules();
    const firstModule = await import('../../src/api/prismaClient.js');
    const first = firstModule.default;

    jest.resetModules();
    const secondModule = await import('../../src/api/prismaClient.js');
    const second = secondModule.default;

    expect(second).toBe(first);
    expect(prismaInstances).toHaveLength(1);
  });

  it('disconnectPrisma disconnects and clears the cached instance', async () => {
    jest.resetModules();
    const module = await import('../../src/api/prismaClient.js');
    const { default: prisma, disconnectPrisma } = module;

    await disconnectPrisma();

    expect(prisma.$disconnect).toHaveBeenCalledTimes(1);
    expect(globalThis.__prismaClient).toBeUndefined();
    expect(prismaInstances).toHaveLength(1);
  });
});
