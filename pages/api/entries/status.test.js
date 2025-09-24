/** @jest-environment node */

import { DEFAULT_ENTRY_STATUS, ENTRY_STATUS_VALUES } from '@/constants/entryStatus';

var mockEntryDelegate;
var mockSubgroupDelegate;

jest.mock('@prisma/client', () => {
  mockEntryDelegate = {
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  mockSubgroupDelegate = {
    findUnique: jest.fn(),
  };

  return {
    PrismaClient: jest.fn(() => ({
      entry: mockEntryDelegate,
      subgroup: mockSubgroupDelegate,
    })),
  };
});

jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(() => jest.fn()),
}));

jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

import handlerIndex from './index';
import handlerById from './[id]';
import { getServerSession } from 'next-auth/next';

const createRequest = ({ method = 'GET', body = {}, query = {} } = {}) => ({
  method,
  body,
  query,
  headers: {},
  cookies: {},
});

const createResponse = () => {
  const res = {
    statusCode: 200,
    headers: {},
    jsonData: undefined,
    textData: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.jsonData = data;
      return this;
    },
    end(data) {
      this.textData = data;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
    },
    _getJSON() {
      return this.jsonData;
    },
    _getText() {
      return this.textData;
    },
  };
  return res;
};

beforeEach(() => {
  jest.clearAllMocks();
  Object.values(mockEntryDelegate).forEach(mockFn => mockFn.mockReset());
  Object.values(mockSubgroupDelegate).forEach(mockFn => mockFn.mockReset());
  getServerSession.mockReset();
  getServerSession.mockResolvedValue({ user: { id: 'user-123' } });
});

describe('POST /api/entries', () => {
  it('accepts valid status values', async () => {
    const subgroupId = 'sub-1';
    mockSubgroupDelegate.findUnique.mockResolvedValue({
      id: subgroupId,
      group: { notebook: { userId: 'user-123' } },
    });
    mockEntryDelegate.count.mockResolvedValue(0);
    const createdEntry = {
      id: 'entry-1',
      status: 'complete',
    };
    mockEntryDelegate.create.mockResolvedValue(createdEntry);

    const req = createRequest({
      method: 'POST',
      body: {
        title: 'New entry',
        content: 'Body',
        subgroupId,
        status: 'complete',
      },
    });
    const res = createResponse();

    await handlerIndex(req, res);

    expect(res.statusCode).toBe(201);
    expect(mockEntryDelegate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'complete' }),
      })
    );
    expect(res._getJSON()).toEqual(createdEntry);
  });

  it('rejects an invalid status value', async () => {
    const req = createRequest({
      method: 'POST',
      body: {
        title: 'New entry',
        content: 'Body',
        subgroupId: 'sub-1',
        status: 'invalid-status',
      },
    });
    const res = createResponse();

    await handlerIndex(req, res);

    expect(res.statusCode).toBe(400);
    expect(res._getJSON()).toEqual({ error: 'Invalid status' });
    expect(mockEntryDelegate.create).not.toHaveBeenCalled();
  });

  it('falls back to the default status when omitted', async () => {
    const subgroupId = 'sub-1';
    mockSubgroupDelegate.findUnique.mockResolvedValue({
      id: subgroupId,
      group: { notebook: { userId: 'user-123' } },
    });
    mockEntryDelegate.count.mockResolvedValue(1);
    mockEntryDelegate.create.mockResolvedValue({ id: 'entry-2', status: DEFAULT_ENTRY_STATUS });

    const req = createRequest({
      method: 'POST',
      body: {
        title: 'New entry',
        content: 'Body',
        subgroupId,
      },
    });
    const res = createResponse();

    await handlerIndex(req, res);

    expect(res.statusCode).toBe(201);
    expect(mockEntryDelegate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: DEFAULT_ENTRY_STATUS }),
      })
    );
  });
});

describe('PUT /api/entries/[id]', () => {
  it('updates the status when provided a valid value', async () => {
    mockEntryDelegate.findUnique.mockResolvedValue({
      id: 'entry-1',
      userId: 'user-123',
      tags: [],
      subgroup: { group: {} },
    });
    const updatedEntry = { id: 'entry-1', status: ENTRY_STATUS_VALUES[1] };
    mockEntryDelegate.update.mockResolvedValue(updatedEntry);

    const req = createRequest({
      method: 'PUT',
      body: { status: ENTRY_STATUS_VALUES[1] },
      query: { id: 'entry-1' },
    });
    const res = createResponse();

    await handlerById(req, res);

    expect(res.statusCode).toBe(200);
    expect(mockEntryDelegate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: ENTRY_STATUS_VALUES[1] }),
      })
    );
    expect(res._getJSON()).toEqual(updatedEntry);
  });

  it('rejects an invalid status on update', async () => {
    mockEntryDelegate.findUnique.mockResolvedValue({
      id: 'entry-1',
      userId: 'user-123',
      tags: [],
      subgroup: { group: {} },
    });

    const req = createRequest({
      method: 'PUT',
      body: { status: 'invalid-status' },
      query: { id: 'entry-1' },
    });
    const res = createResponse();

    await handlerById(req, res);

    expect(res.statusCode).toBe(400);
    expect(res._getJSON()).toEqual({ error: 'Invalid status' });
    expect(mockEntryDelegate.update).not.toHaveBeenCalled();
  });
});
