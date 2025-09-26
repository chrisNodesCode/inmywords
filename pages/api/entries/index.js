// pages/api/entries/index.js
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { ENTRY_STATUS_VALUES, DEFAULT_ENTRY_STATUS } from '@/constants/entryStatus';
import prisma from '@/api/prismaClient';

export default async function handler(req, res) {
  // Authenticate user
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const userId = session.user.id;

  if (req.method === 'GET') {
    const { notebookId, groupId, subgroupId } = req.query;

    // Base filter: only entries owned by this user
    const where = { userId };

    // Narrow by subgroup, group, or notebook, if provided
    if (subgroupId) {
      where.subgroupId = subgroupId;
    } else if (groupId) {
      where.subgroup = { groupId };
    } else if (notebookId) {
      where.subgroup = { group: { notebookId } };
    }

    try {
      const entries = await prisma.entry.findMany({
        where,
        include: {
          tags: true,
          subgroup: {
            include: { group: true },
          },
        },
        orderBy: { user_sort: 'asc' },
      });
      return res.status(200).json(entries);
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
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Content is required and must be a string' });
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
          content,
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
