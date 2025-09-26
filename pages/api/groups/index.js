// pages/api/groups/index.js
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
        notebookId: { type: 'string' },
      });
      projection = parseProjectionParams(req.query, {
        allowedSelectFields: [
          'id',
          'name',
          'description',
          'user_sort',
          'notebookId',
          'createdAt',
          'updatedAt',
        ],
        requiredFields: ['id'],
        defaultSelect: {
          id: true,
          name: true,
          description: true,
          user_sort: true,
          notebookId: true,
          createdAt: true,
          updatedAt: true,
        },
        allowedIncludes: {
          subgroups: {
            select: {
              id: true,
              name: true,
              description: true,
              user_sort: true,
              groupId: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!filters.notebookId) {
      return res.status(400).json({ error: 'Missing notebookId query parameter' });
    }

    const where = {
      notebookId: filters.notebookId,
      notebook: {
        userId,
      },
    };

    try {
      const total = await prisma.group.count({ where });

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

      const records = await prisma.group.findMany(queryArgs);

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
      console.error('GET /api/groups error', error);
      return res.status(500).json({ error: 'Failed to fetch groups' });
    }
  }

  if (req.method === 'POST') {
    const { name, notebookId, description } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!notebookId || typeof notebookId !== 'string') {
      return res.status(400).json({ error: 'NotebookId is required' });
    }

    try {
      // Verify notebook ownership
      const notebook = await prisma.notebook.findUnique({
        where: { id: notebookId },
      });
      if (!notebook || notebook.userId !== userId) {
        return res.status(404).json({ error: 'Notebook not found' });
      }
      // Create the group
      const order = await prisma.group.count({
        where: { notebookId, notebook: { userId } },
      });
      const newGroup = await prisma.group.create({
        data: {
          name,
          description: description?.trim() || null,
          notebookId,
          user_sort: order,
        },
      });
      return res.status(201).json(newGroup);
    } catch (error) {
      console.error('POST /api/groups error', error);
      return res.status(500).json({ error: 'Failed to create group' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
