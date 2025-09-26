// pages/api/groups/[id].js
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '@/api/prismaClient';

export default async function handler(req, res) {
  // Authenticate user
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const userId = session.user.id;
  const { id } = req.query;

  try {
    // Fetch the group with its notebook to verify ownership
    const group = await prisma.group.findUnique({
      where: { id },
      include: { notebook: true },
    });
    if (!group || group.notebook.userId !== userId) {
      return res.status(404).json({ error: 'Group not found' });
    }

    switch (req.method) {
      case 'GET':
        // Return group details
        return res.status(200).json(group);

      case 'PUT': {
        // Update group name/description
        const { name, description } = req.body;
        if (name !== undefined && typeof name !== 'string') {
          return res.status(400).json({ error: 'Invalid name' });
        }
        if (description !== undefined && typeof description !== 'string') {
          return res.status(400).json({ error: 'Invalid description' });
        }
        const updated = await prisma.group.update({
          where: { id },
          data: {
            ...(name !== undefined ? { name } : {}),
            ...(description !== undefined ? { description } : {}),
          },
        });
        return res.status(200).json(updated);
      }

      case 'DELETE': {
        // Delete the group (cascades subgroups & entries via DB)
        await prisma.group.delete({ where: { id } });
        return res.status(204).end();
      }

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error(`Error in /api/groups/[id] (${req.method})`, error);
    return res.status(500).json({ error: 'Server error' });
  }
}
