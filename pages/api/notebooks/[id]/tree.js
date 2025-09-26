// pages/api/notebooks/[id]/tree.js

import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { createPrismaClientContext } from '@/api/prismaClient';
import { parsePaginationParams } from '@/api/pagination';
import { isFeatureEnabled } from '@/utils/featureFlags';
import { logApiMetric } from '@/utils/metrics';

const DEFAULT_GROUP_TAKE = 20;
const DEFAULT_SUBGROUP_TAKE = 10;
const DEFAULT_ENTRY_TAKE = 20;
const MAX_SUBGROUP_TAKE = 50;

function parseListParam(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.flatMap(parseListParam);
  }
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseCursorMap(value) {
  const map = {};
  parseListParam(value).forEach((entry) => {
    const [key, cursor] = entry.split(':');
    if (key && cursor) {
      map[key] = cursor;
    }
  });
  return map;
}

function parseBooleanParam(value, defaultValue = false) {
  if (value === undefined) return defaultValue;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  throw new Error('Boolean query parameters must be "true" or "false".');
}

function stringifyParam(value) {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value.join(',');
  return value;
}

function buildGroupsNextLink({
  notebookId,
  take,
  cursor,
  include,
  subgroupsFor,
  subgroupsTake,
  entriesFor,
  entriesTake,
  entriesIncludeArchived,
}) {
  if (!cursor) return null;
  const params = new URLSearchParams();
  params.set('groups.take', String(take));
  params.set('groups.cursor', cursor);
  if (include?.size) {
    params.set('include', Array.from(include).join(','));
  }
  if (subgroupsFor) {
    params.set('subgroups.for', subgroupsFor);
  }
  if (subgroupsTake) {
    params.set('subgroups.take', String(subgroupsTake));
  }
  if (entriesFor) {
    params.set('entries.for', entriesFor);
  }
  if (entriesTake) {
    params.set('entries.take', String(entriesTake));
  }
  if (entriesIncludeArchived !== undefined) {
    params.set('entries.includeArchived', entriesIncludeArchived ? 'true' : 'false');
  }
  return `/api/notebooks/${notebookId}/tree?${params.toString()}`;
}

function buildScopedNextLink({
  notebookId,
  include,
  take,
  cursor,
  scope,
  scopeId,
  extra = {},
  allowEmptyCursor = false,
}) {
  if (!allowEmptyCursor && !cursor) return null;
  const params = new URLSearchParams();
  if (include?.size) {
    params.set('include', Array.from(include).join(','));
  }
  params.set(`${scope}.for`, scopeId);
  params.set(`${scope}.take`, String(take));
  if (cursor) {
    params.set(`${scope}.cursor`, `${scopeId}:${cursor}`);
  }
  Object.entries(extra).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    params.set(key, String(value));
  });
  return `/api/notebooks/${notebookId}/tree?${params.toString()}`;
}

async function buildBatchedNotebookTree({
  prisma,
  userId,
  notebookId,
  includeSet,
  includeSubgroups,
  includeEntries,
  groupsPagination,
  subgroupPagination,
  entryPagination,
  includeArchived,
  subgroupTargets,
  entryTargets,
  subgroupCursorMap,
  entryCursorMap,
  subgroupsForRaw,
  entriesForRaw,
}) {
  const notebook = await prisma.notebook.findFirst({
    where: { id: notebookId, userId },
    select: {
      id: true,
      title: true,
      description: true,
      user_notebook_tree: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!notebook) {
    return { statusCode: 404, body: { error: 'Notebook not found' } };
  }

  const whereGroups = {
    notebookId,
    notebook: { userId },
  };

  const [groupsTotal, rawGroups] = await Promise.all([
    prisma.group.count({ where: whereGroups }),
    prisma.group.findMany({
      where: whereGroups,
      orderBy: { user_sort: 'asc' },
      take: groupsPagination.take + 1,
      select: {
        id: true,
        name: true,
        description: true,
        user_sort: true,
        notebookId: true,
        createdAt: true,
        updatedAt: true,
        ...(includeSubgroups
          ? {
              _count: {
                select: { subgroups: true },
              },
            }
          : {}),
      },
      ...(groupsPagination.cursor
        ? { cursor: { id: groupsPagination.cursor }, skip: 1 }
        : groupsPagination.skip !== undefined
          ? { skip: groupsPagination.skip }
          : {}),
    }),
  ]);

  let nextGroupCursor = null;
  if (rawGroups.length > groupsPagination.take) {
    const nextRecord = rawGroups.pop();
    nextGroupCursor = nextRecord?.id ?? null;
  }

  const groups = rawGroups.map((group) => ({ ...group }));
  const groupsData = groups.map((group) => ({
    id: group.id,
    name: group.name,
    description: group.description,
    user_sort: group.user_sort,
    notebookId: group.notebookId,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
  }));

  const groupsMeta = {
    take: groupsPagination.take,
    count: groupsData.length,
    total: groupsTotal,
    hasMore: nextGroupCursor !== null
      ? true
      : groupsPagination.skip !== undefined
        ? groupsPagination.skip + groupsData.length < groupsTotal
        : groupsData.length < groupsTotal,
  };

  if (groupsPagination.skip !== undefined) {
    groupsMeta.skip = groupsPagination.skip;
  }
  if (groupsPagination.cursor) {
    groupsMeta.cursor = groupsPagination.cursor;
  }
  if (nextGroupCursor) {
    groupsMeta.nextCursor = nextGroupCursor;
  }
  const groupsNextLink = buildGroupsNextLink({
    notebookId,
    take: groupsPagination.take,
    cursor: nextGroupCursor,
    include: includeSet,
    subgroupsFor: subgroupsForRaw,
    subgroupsTake: includeSubgroups ? subgroupPagination.take : undefined,
    entriesFor: includeEntries ? entriesForRaw : undefined,
    entriesTake: includeEntries ? entryPagination.take : undefined,
    entriesIncludeArchived: includeEntries ? includeArchived : undefined,
  });
  if (groupsNextLink) {
    groupsMeta.links = { next: groupsNextLink };
  }

  const groupIdToIndex = new Map(groupsData.map((group, index) => [group.id, index]));
  const targetedGroupIds = includeSubgroups
    ? subgroupTargets.length
      ? subgroupTargets.filter((id) => groupIdToIndex.has(id))
      : groupsData.map((group) => group.id)
    : [];

  const subgroupDataById = new Map();
  const subgroupBlocks = new Map();

  if (targetedGroupIds.length) {
    await Promise.all(
      targetedGroupIds.map(async (groupId) => {
        const cursor = subgroupCursorMap[groupId];
        const subgroupWhere = {
          groupId,
        };
        const [records, total] = await Promise.all([
          prisma.subgroup.findMany({
            where: subgroupWhere,
            orderBy: { user_sort: 'asc' },
            take: subgroupPagination.take + 1,
            select: {
              id: true,
              name: true,
              description: true,
              user_sort: true,
              groupId: true,
              createdAt: true,
              updatedAt: true,
            },
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
          }),
          prisma.subgroup.count({ where: subgroupWhere }),
        ]);

        let nextCursor = null;
        if (records.length > subgroupPagination.take) {
          const nextRecord = records.pop();
          nextCursor = nextRecord?.id ?? null;
        }

        const data = records.map((subgroup) => ({ ...subgroup }));
        data.forEach((subgroup) => subgroupDataById.set(subgroup.id, subgroup));

        const meta = {
          take: subgroupPagination.take,
          count: data.length,
          total,
          hasMore: nextCursor !== null ? true : data.length < total,
        };
        if (cursor) {
          meta.cursor = cursor;
        }
        if (nextCursor) {
          meta.nextCursor = nextCursor;
        }
        const nextLink = buildScopedNextLink({
          notebookId,
          include: includeSet,
          take: subgroupPagination.take,
          cursor: nextCursor,
          scope: 'subgroups',
          scopeId: groupId,
        });
        if (nextLink) {
          meta.links = { next: nextLink };
        }

        subgroupBlocks.set(groupId, { data, meta });
      }),
    );
  }

  const entryTargetIds = includeEntries
    ? entryTargets.length
      ? entryTargets
      : Array.from(subgroupDataById.keys())
    : [];

  if (entryTargetIds.length) {
    await Promise.all(
      entryTargetIds
        .filter((subgroupId) => subgroupDataById.has(subgroupId))
        .map(async (subgroupId) => {
          const cursor = entryCursorMap[subgroupId];
          const where = {
            subgroupId,
            userId,
            ...(includeArchived ? {} : { archived: false }),
          };
          const [records, total] = await Promise.all([
            prisma.entry.findMany({
              where,
              orderBy: { user_sort: 'asc' },
              take: entryPagination.take + 1,
              select: {
                id: true,
                title: true,
                content: true,
                status: true,
                archived: true,
                user_sort: true,
                subgroupId: true,
                createdAt: true,
                updatedAt: true,
                tags: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                  },
                  orderBy: { name: 'asc' },
                },
              },
              ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            }),
            prisma.entry.count({ where }),
          ]);

          let nextCursor = null;
          if (records.length > entryPagination.take) {
            const nextRecord = records.pop();
            nextCursor = nextRecord?.id ?? null;
          }

          const data = records.map((entry) => ({ ...entry }));
          const meta = {
            take: entryPagination.take,
            count: data.length,
            total,
            hasMore: nextCursor !== null ? true : data.length < total,
            includeArchived,
          };
          if (cursor) {
            meta.cursor = cursor;
          }
          if (nextCursor) {
            meta.nextCursor = nextCursor;
          }
          const nextLink = buildScopedNextLink({
            notebookId,
            include: includeSet,
            take: entryPagination.take,
            cursor: nextCursor,
            scope: 'entries',
            scopeId: subgroupId,
            extra: {
              'entries.includeArchived': includeArchived ? 'true' : 'false',
            },
          });
          if (nextLink) {
            meta.links = { next: nextLink };
          }

          const subgroup = subgroupDataById.get(subgroupId);
          if (subgroup) {
            subgroup.entries = { data, meta };
          }
        }),
    );
  }

  if (includeSubgroups) {
    groupsData.forEach((group) => {
      const block = subgroupBlocks.get(group.id);
      if (block) {
        group.subgroups = block;
      } else {
        const total = groups.find((item) => item.id === group.id)?._count?.subgroups ?? 0;
        const meta = {
          take: subgroupPagination.take,
          count: 0,
          total,
          hasMore: total > 0,
        };
        const nextLink = buildScopedNextLink({
          notebookId,
          include: includeSet,
          take: subgroupPagination.take,
          cursor: null,
          scope: 'subgroups',
          scopeId: group.id,
          allowEmptyCursor: total > 0,
        });
        if (nextLink) {
          meta.links = { next: nextLink };
        }
        group.subgroups = { data: [], meta };
      }
    });
  }

  const response = {
    notebook,
    groups: {
      data: groupsData,
      meta: groupsMeta,
    },
  };

  return { statusCode: 200, body: response };
}

async function buildLegacyNotebookTree({
  prisma,
  userId,
  notebookId,
  includeSubgroups,
  includeEntries,
  includeArchived,
  subgroupTargets,
  entryTargets,
}) {
  const notebook = await prisma.notebook.findFirst({
    where: { id: notebookId, userId },
    select: {
      id: true,
      title: true,
      description: true,
      user_notebook_tree: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!notebook) {
    return { statusCode: 404, body: { error: 'Notebook not found' } };
  }

  const groups = await prisma.group.findMany({
    where: { notebookId, notebook: { userId } },
    orderBy: { user_sort: 'asc' },
    select: {
      id: true,
      name: true,
      description: true,
      user_sort: true,
      notebookId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const groupMap = new Map(groups.map((group) => [group.id, group]));

  const groupsData = groups.map((group) => ({
    id: group.id,
    name: group.name,
    description: group.description,
    user_sort: group.user_sort,
    notebookId: group.notebookId,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
  }));

  const subgroupTargetsResolved = includeSubgroups
    ? subgroupTargets.length
      ? subgroupTargets.filter((id) => groupMap.has(id))
      : groups.map((group) => group.id)
    : [];

  const subgroupDataById = new Map();

  for (const groupId of subgroupTargetsResolved) {
    const subgroups = await prisma.subgroup.findMany({
      where: { groupId },
      orderBy: { user_sort: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        user_sort: true,
        groupId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const subgroupBlock = {
      data: subgroups.map((subgroup) => ({ ...subgroup })),
      meta: {
        take: subgroups.length,
        count: subgroups.length,
        total: subgroups.length,
        hasMore: false,
      },
    };

    subgroupBlock.data.forEach((subgroup) => {
      subgroupDataById.set(subgroup.id, subgroup);
    });

    const targetGroup = groupsData.find((group) => group.id === groupId);
    if (targetGroup) {
      targetGroup.subgroups = subgroupBlock;
    }
  }

  const entryTargetIds = includeEntries
    ? entryTargets.length
      ? entryTargets.filter((id) => subgroupDataById.has(id))
      : Array.from(subgroupDataById.keys())
    : [];

  for (const subgroupId of entryTargetIds) {
    const entries = await prisma.entry.findMany({
      where: {
        subgroupId,
        userId,
        ...(includeArchived ? {} : { archived: false }),
      },
      orderBy: { user_sort: 'asc' },
      select: {
        id: true,
        title: true,
        content: true,
        status: true,
        archived: true,
        user_sort: true,
        subgroupId: true,
        createdAt: true,
        updatedAt: true,
        tags: {
          select: {
            id: true,
            name: true,
            code: true,
          },
          orderBy: { name: 'asc' },
        },
      },
    });

    const subgroup = subgroupDataById.get(subgroupId);
    if (subgroup) {
      subgroup.entries = {
        data: entries.map((entry) => ({ ...entry })),
        meta: {
          take: entries.length,
          count: entries.length,
          total: entries.length,
          hasMore: false,
          includeArchived,
        },
      };
    }
  }

  if (includeSubgroups) {
    groupsData.forEach((group) => {
      if (!group.subgroups) {
        group.subgroups = {
          data: [],
          meta: {
            take: 0,
            count: 0,
            total: 0,
            hasMore: false,
          },
        };
      }
    });
  }

  const response = {
    notebook,
    groups: {
      data: groupsData,
      meta: {
        take: groupsData.length,
        count: groupsData.length,
        total: groupsData.length,
        hasMore: false,
      },
    },
  };

  return { statusCode: 200, body: response };
}

export default async function handler(req, res) {
  const startTime = process.hrtime.bigint();
  const { client: prisma, mode, release } = createPrismaClientContext();
  const metrics = {
    statusCode: 500,
    payloadBytes: 0,
    variant: isFeatureEnabled('useBatchedNotebookTreeEndpoint') ? 'batched' : 'legacy',
    prismaMode: mode,
    error: undefined,
  };

  const respond = (statusCode, body) => {
    metrics.statusCode = statusCode;
    metrics.payloadBytes = Buffer.byteLength(JSON.stringify(body));
    return res.status(statusCode).json(body);
  };

  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET']);
      return respond(405, { error: `Method ${req.method} Not Allowed` });
    }

    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return respond(401, { error: 'Unauthorized' });
    }

    const userId = session.user.id;
    const notebookId = req.query.id;

    const includeRaw = req.query.include;
    const includeSet = new Set(parseListParam(includeRaw));
    const includeSubgroups = includeSet.has('subgroups') || includeSet.has('entries');
    const includeEntries = includeSet.has('entries');

    const subgroupsForRaw = stringifyParam(req.query['subgroups.for']);
    const entriesForRaw = stringifyParam(req.query['entries.for']);

    const subgroupCursorMap = parseCursorMap(req.query['subgroups.cursor']);
    const entryCursorMap = parseCursorMap(req.query['entries.cursor']);

    let groupsPagination;
    let subgroupPagination;
    let entryPagination;
    let includeArchived;

    try {
      groupsPagination = parsePaginationParams(
        {
          take: req.query['groups.take'],
          skip: req.query['groups.skip'],
          cursor: req.query['groups.cursor'],
        },
        { defaultTake: DEFAULT_GROUP_TAKE, maxTake: 100 },
      );

      subgroupPagination = parsePaginationParams(
        {
          take: req.query['subgroups.take'],
        },
        { defaultTake: DEFAULT_SUBGROUP_TAKE, maxTake: MAX_SUBGROUP_TAKE },
      );

      entryPagination = parsePaginationParams(
        {
          take: req.query['entries.take'],
        },
        { defaultTake: DEFAULT_ENTRY_TAKE, maxTake: 100 },
      );

      includeArchived = parseBooleanParam(req.query['entries.includeArchived'], false);
    } catch (error) {
      return respond(400, { error: error.message });
    }

    const subgroupTargets = includeSubgroups
      ? parseListParam(req.query['subgroups.for'])
      : [];
    const entryTargets = includeEntries ? parseListParam(req.query['entries.for']) : [];

    const builder = metrics.variant === 'batched'
      ? buildBatchedNotebookTree
      : buildLegacyNotebookTree;

    const result = await builder({
      prisma,
      userId,
      notebookId,
      includeSet,
      includeSubgroups,
      includeEntries,
      groupsPagination,
      subgroupPagination,
      entryPagination,
      includeArchived,
      subgroupTargets,
      entryTargets,
      subgroupCursorMap,
      entryCursorMap,
      subgroupsForRaw,
      entriesForRaw,
    });

    return respond(result.statusCode, result.body);
  } catch (error) {
    metrics.error = error?.message ?? 'Unknown error';
    if (error?.statusCode && !res.headersSent) {
      return respond(error.statusCode, { error: error.message });
    }

    const message = error?.message ?? 'Failed to fetch notebook tree';
    const statusCode = message.includes('archived') ? 500 : 500;
    const body = message.includes('archived')
      ? { error: 'Database schema out of date. Run migrations.' }
      : { error: 'Failed to fetch notebook tree' };

    console.error('GET /api/notebooks/[id]/tree error', error);
    if (!res.headersSent) {
      return respond(statusCode, body);
    }
  } finally {
    const durationMs = Number(process.hrtime.bigint() - startTime) / 1e6;
    logApiMetric('notebooks.tree', {
      route: '/api/notebooks/[id]/tree',
      statusCode: metrics.statusCode,
      durationMs,
      payloadBytes: metrics.payloadBytes,
      featureVariant: metrics.variant,
      prismaClientMode: metrics.prismaMode,
      error: metrics.error,
    });
    await release();
  }
}
