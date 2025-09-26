/** @jest-environment node */

import http from 'http';
import supertest from 'supertest';
import { apiResolver } from 'next/dist/server/api-utils/node/api-resolver';

import treeHandler from '../../pages/api/notebooks/[id]/tree';
import groupsHandler from '../../pages/api/groups/index';
import subgroupsHandler from '../../pages/api/subgroups/index';
import entriesHandler from '../../pages/api/entries/index';
import prisma from '../../src/api/prismaClient';
import { getServerSession } from 'next-auth/next';
import {
  notebook,
  groups,
  subgroupsByGroup,
  entriesBySubgroup,
  clone,
  getGroupById,
  getSubgroupById,
} from '../../tests/fixtures/notebookTree';

jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(() => jest.fn()),
}));

jest.mock('../../src/api/prismaClient', () => ({
  notebook: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
  },
  group: {
    count: jest.fn(),
    findMany: jest.fn(),
  },
  subgroup: {
    count: jest.fn(),
    findMany: jest.fn(),
  },
  entry: {
    count: jest.fn(),
    findMany: jest.fn(),
    groupBy: jest.fn(),
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
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts[0] === 'api' && parts[1] === 'notebooks' && parts.length >= 4) {
      query.id = parts[2];
    }
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

function resetPrismaMocks() {
  Object.values(prisma).forEach(model => {
    Object.values(model).forEach(fn => fn.mockReset());
  });
}

function applyOrder(list, orderBy) {
  if (!orderBy) return [...list];
  const orders = Array.isArray(orderBy) ? orderBy : [orderBy];
  return [...list].sort((a, b) => {
    for (const order of orders) {
      const [key, direction] = Object.entries(order)[0];
      const dir = direction === 'desc' ? -1 : 1;
      if (a[key] < b[key]) return -1 * dir;
      if (a[key] > b[key]) return 1 * dir;
    }
    return 0;
  });
}

function applyCursor(list, cursor, skip = 0) {
  if (!cursor) {
    return skip ? list.slice(skip) : [...list];
  }
  const cursorId = cursor.id ?? cursor;
  const index = list.findIndex(item => item.id === cursorId);
  if (index === -1) return [];
  const start = index + (skip ?? 0);
  return list.slice(start);
}

function applyTake(list, take) {
  if (!take) return [...list];
  return list.slice(0, take);
}

function filterEntries(list, where = {}) {
  return list.filter(entry => {
    if (where.subgroupId && entry.subgroupId !== where.subgroupId) return false;
    if (where.userId && entry.userId !== where.userId) return false;
    if (where.archived === false && entry.archived) return false;
    if (where.archived === true && !entry.archived) return false;
    if (where.subgroupId?.in && !where.subgroupId.in.includes(entry.subgroupId)) return false;
    return true;
  });
}

function applySelect(record, select) {
  if (!select) {
    return clone(record);
  }
  const result = {};
  Object.entries(select).forEach(([key, config]) => {
    if (config === true) {
      if (record[key] === undefined) {
        result[key] = undefined;
      } else {
        result[key] = clone(record[key]);
      }
    } else if (config && typeof config === 'object') {
      if (key === '_count') {
        result._count = {};
        Object.keys(config.select || {}).forEach(countKey => {
          if (countKey === 'subgroups') {
            result._count.subgroups = (subgroupsByGroup[record.id] || []).length;
          }
          if (countKey === 'entries') {
            const subgroups = Object.values(subgroupsByGroup)
              .flat()
              .filter(subgroup => subgroup.groupId === record.id);
            const totalEntries = subgroups.reduce(
              (total, subgroup) => total + (entriesBySubgroup[subgroup.id]?.length || 0),
              0,
            );
            result._count.entries = totalEntries;
          }
        });
      } else if (key === 'subgroups') {
        const { select: subSelect, orderBy, cursor, skip, take } = config;
        const raw = (subgroupsByGroup[record.id] || []).map(clone);
        const ordered = applyOrder(raw, orderBy);
        const afterCursor = applyCursor(ordered, cursor, skip);
        const sliced = applyTake(afterCursor, take);
        result.subgroups = sliced.map(item => applySelect(item, subSelect));
      } else if (key === 'entries') {
        const { select: entrySelect, orderBy, cursor, skip, take, where } = config;
        const raw = filterEntries(entriesBySubgroup[record.id] || [], where).map(clone);
        const ordered = applyOrder(raw, orderBy);
        const afterCursor = applyCursor(ordered, cursor, skip);
        const sliced = applyTake(afterCursor, take);
        result.entries = sliced.map(item => applySelect(item, entrySelect));
      } else if (key === 'tags') {
        const tagSelect = config.select || {};
        result.tags = (record.tags || []).map(tag => applySelect(tag, tagSelect));
      } else if (key === 'group') {
        const group = getGroupById(record.groupId);
        if (group) {
          result.group = applySelect(group, config.select || {});
        }
      } else if (key === 'subgroup') {
        const subgroup = getSubgroupById(record.subgroupId);
        if (subgroup) {
          result.subgroup = applySelect(subgroup, config.select || {});
        }
      }
    }
  });
  return result;
}

function setupMockPrisma() {
  prisma.notebook.findFirst.mockImplementation(async ({ where, select }) => {
    if (where.id === notebook.id && where.userId === notebook.userId) {
      return applySelect(notebook, select);
    }
    return null;
  });

  prisma.notebook.findUnique.mockImplementation(async ({ where, select }) => {
    if (where.id === notebook.id) {
      return applySelect(notebook, select);
    }
    return null;
  });

  prisma.group.count.mockImplementation(async ({ where }) => {
    return groups.filter(group => group.notebookId === where.notebookId).length;
  });

  prisma.group.findMany.mockImplementation(async args => {
    const { where, orderBy, take, cursor, skip, select } = args;
    let list = groups.filter(group => group.notebookId === where.notebookId).map(clone);
    list = applyOrder(list, orderBy);
    list = applyCursor(list, cursor, skip);
    list = applyTake(list, take);
    if (select) {
      return list.map(item => applySelect(item, select));
    }
    return list;
  });

  prisma.subgroup.count.mockImplementation(async ({ where }) => {
    return (subgroupsByGroup[where.groupId] || []).length;
  });

  prisma.subgroup.findMany.mockImplementation(async args => {
    const { where, orderBy, take, cursor, skip, select } = args;
    let list = (subgroupsByGroup[where.groupId] || []).map(clone);
    list = applyOrder(list, orderBy);
    list = applyCursor(list, cursor, skip);
    list = applyTake(list, take);
    if (select) {
      return list.map(item => applySelect(item, select));
    }
    return list;
  });

  prisma.entry.count.mockImplementation(async ({ where }) => {
    const list = filterEntries(
      Object.values(entriesBySubgroup).flat(),
      where,
    );
    return list.length;
  });

  prisma.entry.findMany.mockImplementation(async args => {
    const { where, orderBy, take, cursor, skip, select } = args;
    let list = filterEntries(Object.values(entriesBySubgroup).flat(), where).map(clone);
    list = applyOrder(list, orderBy);
    list = applyCursor(list, cursor, skip);
    list = applyTake(list, take);
    if (select) {
      return list.map(item => applySelect(item, select));
    }
    return list;
  });

  prisma.entry.groupBy.mockImplementation(async ({ where }) => {
    const filtered = filterEntries(Object.values(entriesBySubgroup).flat(), where);
    const map = new Map();
    filtered.forEach(entry => {
      map.set(entry.subgroupId, (map.get(entry.subgroupId) || 0) + 1);
    });
    return Array.from(map.entries()).map(([subgroupId, count]) => ({
      subgroupId,
      _count: { _all: count },
    }));
  });
}

beforeEach(() => {
  getServerSession.mockResolvedValue({ user: { id: notebook.userId } });
  resetPrismaMocks();
  setupMockPrisma();
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('Notebook tree endpoint', () => {
  it('returns combined notebook tree with nested pagination metadata', async () => {
    const { request, close } = createTestClient(treeHandler);
    const response = await request.get(
      '/api/notebooks/nb1/tree?include=subgroups,entries&subgroups.for=g1&entries.for=sg1',
    );
    await close();

    expect(response.status).toBe(200);
    expect(response.body.notebook.id).toBe('nb1');
    expect(response.body.groups.data).toHaveLength(2);

    const [firstGroup, secondGroup] = response.body.groups.data;
    expect(firstGroup.subgroups.data).toHaveLength(2);
    expect(firstGroup.subgroups.meta.nextCursor).toBeUndefined();
    expect(firstGroup.subgroups.data[0].entries.data).toHaveLength(2);
    expect(firstGroup.subgroups.data[0].entries.meta.includeArchived).toBe(false);
    expect(secondGroup.subgroups.data).toHaveLength(0);
    expect(secondGroup.subgroups.meta.links.next).toContain('subgroups.for=g2');
  });

  it('reduces round trips and payload size compared to legacy flow', async () => {
    const runRequest = async (handler, path) => {
      const { request, close } = createTestClient(handler);
      const result = await request.get(path);
      await close();
      return result;
    };

    const legacyResponses = [];
    legacyResponses.push(await runRequest(groupsHandler, '/api/groups?notebookId=nb1'));
    legacyResponses.push(await runRequest(subgroupsHandler, '/api/subgroups?groupId=g1'));
    legacyResponses.push(await runRequest(entriesHandler, '/api/entries?subgroupId=sg1'));

    const newResponse = await runRequest(
      treeHandler,
      '/api/notebooks/nb1/tree?include=subgroups,entries&subgroups.for=g1&entries.for=sg1',
    );

    expect(newResponse.status).toBe(200);
    legacyResponses.forEach(res => expect(res.status).toBe(200));

    const legacyPayload = legacyResponses.reduce(
      (size, res) => size + JSON.stringify(res.body).length,
      0,
    );
    const newPayload = JSON.stringify(newResponse.body).length;

    expect(legacyResponses.length).toBe(3);
    expect(newPayload).toBeLessThan(legacyPayload);
  });
});
