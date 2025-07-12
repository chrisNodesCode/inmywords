import { PrismaClient } from '../../../src/generated/prisma';
import { getSession } from 'next-auth/react';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  // Authenticate
  const session = await getSession({ req });
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const userId = session.user.id;
  const { id } = req.query;

  // Fetch tag with its notebook to verify ownership
  try {
    const tag = await prisma.tag.findUnique({
      where: { id },
      include: { notebook: true },
    });
    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }
    // If the tag belongs to a notebook, ensure the notebook is owned by the user
    if (tag.notebook && tag.notebook.userId !== userId) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    switch (req.method) {
      case 'GET':
        return res.status(200).json(tag);

      case 'PUT':
        {
          const { name, description, parentId } = req.body;
          // Validate inputs
          if (name !== undefined && typeof name !== 'string') {
            return res.status(400).json({ error: 'Invalid name' });
          }
          if (description !== undefined && typeof description !== 'string') {
            return res.status(400).json({ error: 'Invalid description' });
          }
          if (parentId !== undefined && parentId !== null && typeof parentId !== 'string') {
            return res.status(400).json({ error: 'Invalid parentId' });
          }
          // Update tag
          const updated = await prisma.tag.update({
            where: { id },
            data: {
              ...(name !== undefined ? { name } : {}),
              ...(description !== undefined ? { description } : {}),
              ...(parentId !== undefined ? { parentId } : {}),
            },
          });
          return res.status(200).json(updated);
        }

      case 'DELETE':
        {
          await prisma.tag.delete({ where: { id } });
          return res.status(204).end();
        }

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error(`/api/tags/[id] error:`, error);
    return res.status(500).json({ error: 'Server error' });
  }
}
