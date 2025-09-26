/** @jest-environment node */

import http from 'http';
import supertest from 'supertest';
import { apiResolver } from 'next/dist/server/api-utils/node/api-resolver';

import handler from '../../pages/api/entries/index';
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

describe('GET /api/entries', () => {
  beforeEach(() => {
    getServerSession.mockResolvedValue({ user: { id: 'user-123' } });
    prisma.entry.findMany.mockReset();
    prisma.entry.count.mockReset();
  });

  it('returns paginated results with a next cursor when more data exists', async () => {
    prisma.entry.count.mockResolvedValue(5);
    prisma.entry.findMany.mockResolvedValue([
      { id: 'e1', title: 'Entry 1' },
      { id: 'e2', title: 'Entry 2' },
      { id: 'e3', title: 'Entry 3' },
    ]);

    const { request, close } = createTestClient(handler);
    const response = await request.get('/api/entries?take=2');
    await close();

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.meta).toEqual(
      expect.objectContaining({
        take: 2,
        count: 2,
        total: 5,
        nextCursor: 'e3',
        hasMore: true,
      }),
    );

    expect(prisma.entry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 3,
        orderBy: { user_sort: 'asc' },
        select: expect.objectContaining({ id: true }),
      }),
    );
  });

  it('rejects invalid take values with a 400 response', async () => {
    const { request, close } = createTestClient(handler);
    const response = await request.get('/api/entries?take=0');
    await close();

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: expect.any(String) });
    expect(prisma.entry.findMany).not.toHaveBeenCalled();
  });

  it('enforces field selection and preserves default includes', async () => {
    prisma.entry.count.mockResolvedValue(2);
    prisma.entry.findMany.mockResolvedValue([
      { id: 'e1', title: 'Entry 1', status: 'none' },
      { id: 'e2', title: 'Entry 2', status: 'none' },
    ]);

    const { request, close } = createTestClient(handler);
    const response = await request.get('/api/entries?select=title,status');
    await close();

    expect(response.status).toBe(200);
    const call = prisma.entry.findMany.mock.calls[0][0];
    expect(call.select.title).toBe(true);
    expect(call.select.status).toBe(true);
    expect(call.select.id).toBe(true);
    expect(call.select.content).toBeUndefined();
    expect(call.select.tags).toBeDefined();
  });
});
