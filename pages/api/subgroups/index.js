// pages/api/subgroups/index.js
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '@/api/prismaClient';
import {
  parsePaginationParams,
  parseFilterParams,
  parseProjectionParams,
} from '@/api/pagination';

export default async function handler(req, res) {
  // Authenticate user
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const userId = session.user.id;

  if (req.method === 'GET') {
    let pagination;
    let filters;
    let projection;

    try {
      pagination = parsePaginationParams(req.query, { defaultTake: 50, maxTake: 100 });
      filters = parseFilterParams(req.query, {
        groupId: { type: 'string' },
      });
      projection = parseProjectionParams(req.query, {
        allowedSelectFields: [
          'id',
          'name',
          'description',
          'user_sort',
          'groupId',
          'createdAt',
          'updatedAt',
        ],
        requiredFields: ['id'],
        defaultSelect: {
          id: true,
          name: true,
          description: true,
          user_sort: true,
          groupId: true,
          createdAt: true,
          updatedAt: true,
        },
        allowedIncludes: {
          group: {
            select: {
              id: true,
              name: true,
              notebookId: true,
            },
          },
        },
      });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!filters.groupId) {
      return res.status(400).json({ error: 'Missing groupId query parameter' });
    }

    const where = {
      groupId: filters.groupId,
      group: {
        notebook: {
          userId,
        },
      },
    };

    try {
      const total = await prisma.subgroup.count({ where });

      const queryArgs = {
        where,
        orderBy: { user_sort: 'asc' },
        take: pagination.take + 1,
        select: projection.select,
      };

      if (pagination.cursor) {
        queryArgs.cursor = { id: pagination.cursor };
        queryArgs.skip = 1;
      } else if (pagination.skip !== undefined) {
        queryArgs.skip = pagination.skip;
      }

      const records = await prisma.subgroup.findMany(queryArgs);

      let nextCursor = null;
      if (records.length > pagination.take) {
        const nextRecord = records.pop();
        nextCursor = nextRecord?.id ?? null;
      }

      const data = records;

      const subgroupIds = data.map(subgroup => subgroup.id);
      let entryCounts = {};
      if (subgroupIds.length) {
        const counts = await prisma.entry.groupBy({
          by: ['subgroupId'],
          where: {
            subgroupId: { in: subgroupIds },
            userId,
            archived: false,
          },
          _count: {
            _all: true,
          },
        });
        entryCounts = counts.reduce((acc, current) => {
          acc[current.subgroupId] = current._count?._all ?? 0;
          return acc;
        }, {});
      }

      const enriched = data.map(subgroup => ({
        ...subgroup,
        entryCount: entryCounts[subgroup.id] ?? 0,
      }));

      const hasMore = nextCursor !== null
        ? true
        : pagination.skip !== undefined
          ? pagination.skip + enriched.length < total
          : enriched.length < total;

      const meta = {
        take: pagination.take,
        count: enriched.length,
        total,
        hasMore,
      };

      if (pagination.skip !== undefined) {
        meta.skip = pagination.skip;
      }
      if (pagination.cursor) {
        meta.cursor = pagination.cursor;
      }
      if (nextCursor) {
        meta.nextCursor = nextCursor;
      }

      return res.status(200).json({ data: enriched, meta });
    } catch (error) {
      console.error('GET /api/subgroups error', error);
      return res.status(500).json({ error: 'Failed to fetch subgroups' });
    }
  }

  if (req.method === 'POST') {
    const { name, groupId, description } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!groupId || typeof groupId !== 'string') {
      return res.status(400).json({ error: 'GroupId is required' });
    }
    try {
      // Verify group ownership
      const group = await prisma.group.findUnique({
        where: { id: groupId },
        include: { notebook: true },
      });
      if (!group || group.notebook.userId !== userId) {
        return res.status(404).json({ error: 'Group not found' });
      }
      // Create the subgroup
      const order = await prisma.subgroup.count({
        where: { groupId, group: { notebook: { userId } } },
      });
      const newSubgroup = await prisma.subgroup.create({
        data: {
          name,
          description: description?.trim() || null,
          groupId,
          user_sort: order,
        },
      });
      return res.status(201).json(newSubgroup);
    } catch (error) {
      console.error('POST /api/subgroups error', error);
      return res.status(500).json({ error: 'Failed to create subgroup' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
