import { PrismaClient } from '../../../prisma/generated';
import { authOptions } from "../auth/[...nextauth]"; // Ensure this path is correct
import { getServerSession } from 'next-auth/next';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  // Authenticate user
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const userId = session.user.id;
  const { id } = req.query;

  switch (req.method) {
    case 'GET':
      try {
        const entry = await prisma.entry.findUnique({
          where: { id },
          include: { tags: true },
        });
        if (!entry || entry.userId !== userId) {
          return res.status(404).json({ error: 'Entry not found' });
        }
        return res.status(200).json(entry);
      } catch (error) {
        console.error('GET /api/entries/[id] error', error);
        return res.status(500).json({ error: 'Failed to fetch entry' });
      }

    case 'PUT':
      try {
        const { title, content, tagIds } = req.body;
        // Basic validation
        if (title !== undefined && typeof title !== 'string') {
          return res.status(400).json({ error: 'Invalid title' });
        }
        if (content !== undefined && typeof content !== 'string') {
          return res.status(400).json({ error: 'Invalid content' });
        }
        if (!Array.isArray(tagIds) || !tagIds.every(t => typeof t === 'string')) {
          return res.status(400).json({ error: 'Invalid tagIds' });
        }
        // Verify ownership
        const existing = await prisma.entry.findUnique({ where: { id } });
        if (!existing || existing.userId !== userId) {
          return res.status(404).json({ error: 'Entry not found' });
        }
        // Update entry
        const updated = await prisma.entry.update({
          where: { id },
          data: {
            ...(title !== undefined ? { title } : {}),
            ...(content !== undefined ? { content } : {}),
            tags: {
              set: tagIds.map(tagId => ({ id: tagId })),
            },
          },
          include: { tags: true },
        });
        return res.status(200).json(updated);
      } catch (error) {
        console.error('PUT /api/entries/[id] error', error);
        return res.status(500).json({ error: 'Failed to update entry' });
      }

    case 'DELETE':
      try {
        // Verify ownership
        const existing = await prisma.entry.findUnique({ where: { id } });
        if (!existing || existing.userId !== userId) {
          return res.status(404).json({ error: 'Entry not found' });
        }
        await prisma.entry.delete({ where: { id } });
        return res.status(204).end();
      } catch (error) {
        console.error('DELETE /api/entries/[id] error', error);
        return res.status(500).json({ error: 'Failed to delete entry' });
      }

    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}