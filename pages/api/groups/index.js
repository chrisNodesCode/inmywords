// pages/api/groups/index.js
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
    const { notebookId } = req.query;
    if (!notebookId) {
      return res.status(400).json({ error: 'Missing notebookId query parameter' });
    }

    try {
      // Ensure the notebook belongs to the user, and fetch its groups
      const groups = await prisma.group.findMany({
        where: {
          notebookId,
          notebook: {
            userId,
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      return res.status(200).json(groups);
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
      const newGroup = await prisma.group.create({
        data: {
          name,
          description: description?.trim() || null,
          notebookId,
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
