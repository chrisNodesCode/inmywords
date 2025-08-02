// pages/api/subgroups/index.js
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  // Authenticate user
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const userId = session.user.id;

  if (req.method === 'GET') {
    const { groupId } = req.query;
    if (!groupId) {
      return res.status(400).json({ error: 'Missing groupId query parameter' });
    }
    try {
      // Ensure the group belongs to the user and fetch its subgroups
      const subgroups = await prisma.subgroup.findMany({
        where: {
          groupId,
          group: {
            notebook: {
              userId,
            },
          },
        },
        orderBy: { user_sort: 'asc' },
      });
      return res.status(200).json(subgroups);
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
