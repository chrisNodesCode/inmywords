/** @jest-environment node */

import http from 'http';
import supertest from 'supertest';
import { apiResolver } from 'next/dist/server/api-utils/node/api-resolver';

import handler from '../../pages/api/groups/index';
import prisma from '../../src/api/prismaClient';
import { getServerSession } from 'next-auth/next';

jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(() => jest.fn()),
}));

jest.mock('../../src/api/prismaClient', () => ({
  entry: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  group: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  subgroup: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
}));

const previewProps = {
  previewModeId: 'test-id',
  previewModeSigningKey: 'test-signing-key-test-signing-key',
  previewModeEncryptionKey: 'test-encryption-key-test-encryption-key',
};

function createTestClient(apiHandler) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const query = Object.fromEntries(url.searchParams.entries());
    apiResolver(req, res, query, { default: apiHandler }, {}, previewProps, false);
  });

  return {
    request: supertest(server),
    close: () =>
      new Promise(resolve => {
        server.close(resolve);
      }),
  };
}

describe('GET /api/groups', () => {
  beforeEach(() => {
    getServerSession.mockResolvedValue({ user: { id: 'user-123' } });
    prisma.group.findMany.mockReset();
    prisma.group.count.mockReset();
  });

  it('requires a notebookId filter', async () => {
    const { request, close } = createTestClient(handler);
    const response = await request.get('/api/groups');
    await close();

    expect(response.status).toBe(400);
    expect(prisma.group.findMany).not.toHaveBeenCalled();
  });

  it('returns paginated groups with cursor pagination metadata', async () => {
    prisma.group.count.mockResolvedValue(4);
    prisma.group.findMany.mockResolvedValue([
      { id: 'g1', name: 'Group 1' },
      { id: 'g2', name: 'Group 2' },
      { id: 'g3', name: 'Group 3' },
    ]);

    const { request, close } = createTestClient(handler);
    const response = await request.get('/api/groups?notebookId=nb1&take=2');
    await close();

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.meta.nextCursor).toBe('g3');
    expect(response.body.meta.hasMore).toBe(true);

    expect(prisma.group.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 3,
        where: expect.objectContaining({ notebookId: 'nb1' }),
      }),
    );
  });

  it('applies include projections when requested', async () => {
    prisma.group.count.mockResolvedValue(1);
    prisma.group.findMany.mockResolvedValue([{ id: 'g1', name: 'Group 1' }]);

    const { request, close } = createTestClient(handler);
    const response = await request.get('/api/groups?notebookId=nb1&include=subgroups');
    await close();

    expect(response.status).toBe(200);
    const call = prisma.group.findMany.mock.calls[0][0];
    expect(call.select.subgroups).toBeDefined();
    expect(call.select.name).toBe(true);
  });
});
