import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '@/api/prismaClient';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  switch (req.method) {
    case 'GET': {
      try {
        const precursors = await prisma.precursor.findMany({
          select: { id: true, title: true },
          orderBy: { createdAt: 'desc' },
        });
        return res.status(200).json(precursors);
      } catch (error) {
        console.error('GET /api/precursors error', error);
        return res.status(500).json({ error: 'Failed to fetch precursors' });
      }
    }
    case 'POST': {
      const { title, description, pattern, modelData } = req.body || {};
      if (!title || !pattern || !modelData) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      try {
        const created = await prisma.precursor.create({
          data: { title, description, pattern, modelData },
        });
        return res.status(201).json(created);
      } catch (error) {
        console.error('POST /api/precursors error', error);
        return res.status(500).json({ error: 'Failed to create precursor' });
      }
    }
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
