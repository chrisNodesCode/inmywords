import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.query;

  switch (req.method) {
    case 'GET': {
      try {
        const precursor = await prisma.precursor.findUnique({ where: { id } });
        if (!precursor) return res.status(404).json({ error: 'Precursor not found' });
        return res.status(200).json(precursor);
      } catch (error) {
        console.error('GET /api/precursors/[id] error', error);
        return res.status(500).json({ error: 'Failed to fetch precursor' });
      }
    }
    case 'PUT': {
      const { title, description, pattern, modelData } = req.body || {};
      try {
        const updated = await prisma.precursor.update({
          where: { id },
          data: {
            ...(title !== undefined ? { title } : {}),
            ...(description !== undefined ? { description } : {}),
            ...(pattern !== undefined ? { pattern } : {}),
            ...(modelData !== undefined ? { modelData } : {}),
          },
        });
        return res.status(200).json(updated);
      } catch (error) {
        console.error('PUT /api/precursors/[id] error', error);
        return res.status(500).json({ error: 'Failed to update precursor' });
      }
    }
    case 'DELETE': {
      try {
        await prisma.precursor.delete({ where: { id } });
        return res.status(204).end();
      } catch (error) {
        console.error('DELETE /api/precursors/[id] error', error);
        return res.status(500).json({ error: 'Failed to delete precursor' });
      }
    }
    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
