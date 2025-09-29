// pages/api/entries/index.js
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { ENTRY_STATUS_VALUES, DEFAULT_ENTRY_STATUS } from '@/constants/entryStatus';
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
      pagination = parsePaginationParams(req.query, { defaultTake: 20, maxTake: 100 });
      filters = parseFilterParams(req.query, {
        notebookId: { type: 'string' },
        groupId: { type: 'string' },
        subgroupId: { type: 'string' },
        status: { type: 'string', values: ENTRY_STATUS_VALUES },
      });
      projection = parseProjectionParams(req.query, {
        allowedSelectFields: [
          'id',
          'title',
          'content',
          'status',
          'archived',
          'user_sort',
          'subgroupId',
          'createdAt',
          'updatedAt',
        ],
        requiredFields: ['id'],
        defaultSelect: {
          id: true,
          title: true,
          content: true,
          status: true,
          archived: true,
          user_sort: true,
          subgroupId: true,
          createdAt: true,
          updatedAt: true,
        },
        allowedIncludes: {
          tags: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          subgroup: {
            select: {
              id: true,
              name: true,
              groupId: true,
              group: {
                select: {
                  id: true,
                  name: true,
                  notebookId: true,
                },
              },
            },
          },
        },
        defaultIncludes: ['tags', 'subgroup'],
      });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    // Base filter: only entries owned by this user
    const where = { userId };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.subgroupId) {
      where.subgroupId = filters.subgroupId;
    } else if (filters.groupId) {
      where.subgroup = { groupId: filters.groupId };
    } else if (filters.notebookId) {
      where.subgroup = { group: { notebookId: filters.notebookId } };
    }

    try {
      const total = await prisma.entry.count({ where });

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

      const records = await prisma.entry.findMany(queryArgs);

      let nextCursor = null;
      if (records.length > pagination.take) {
        const nextRecord = records.pop();
        nextCursor = nextRecord?.id ?? null;
      }

      const data = records;
      const hasMore = nextCursor !== null
        ? true
        : pagination.skip !== undefined
          ? pagination.skip + data.length < total
          : data.length < total;

      const meta = {
        take: pagination.take,
        count: data.length,
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

      return res.status(200).json({ data, meta });
    } catch (error) {
      console.error('GET /api/entries error', error);
      return res.status(500).json({ error: 'Failed to fetch entries' });
    }
  }

  if (req.method === 'POST') {
    const { title, content, subgroupId, tagIds, status } = req.body;

    // Validate required fields
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'Title is required and must be a string' });
    }
    if (content !== undefined && typeof content !== 'string') {
      return res.status(400).json({ error: 'Content must be a string' });
    }
    if (!subgroupId || typeof subgroupId !== 'string') {
      return res.status(400).json({ error: 'subgroupId is required and must be a string' });
    }
    if (tagIds && (!Array.isArray(tagIds) || !tagIds.every(id => typeof id === 'string'))) {
      return res.status(400).json({ error: 'tagIds must be an array of strings' });
    }
    if (status !== undefined) {
      if (typeof status !== 'string' || !ENTRY_STATUS_VALUES.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
    }

    const entryStatus = status ?? DEFAULT_ENTRY_STATUS;
    const entryContent = typeof content === 'string' ? content : '';

    try {
      // Verify subgroup ownership
      const subgroup = await prisma.subgroup.findUnique({
        where: { id: subgroupId },
        include: { group: { include: { notebook: true } } },
      });
      if (!subgroup || subgroup.group.notebook.userId !== userId) {
        return res.status(404).json({ error: 'Subgroup not found' });
      }

      // Create entry
      const order = await prisma.entry.count({
        where: { subgroupId, userId },
      });
      const newEntry = await prisma.entry.create({
        data: {
          title,
          content: entryContent,
          userId,
          status: entryStatus,
          subgroupId,
          user_sort: order,
          tags: tagIds
            ? { connect: tagIds.map(id => ({ id })) }
            : undefined,
        },
        include: {
          tags: true,
          subgroup: { include: { group: true } },
        },
      });

      return res.status(201).json(newEntry);
    } catch (error) {
      console.error('POST /api/entries error', error);
      return res.status(500).json({ error: 'Failed to create entry' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
