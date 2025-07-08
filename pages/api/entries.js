import { PrismaClient } from '../../src/generated/prisma/index.js';
const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const entries = await prisma.entry.findMany({
        select: {
          id: true,
          content: true,
          title: true,
          criterionId: true,
          subcriterionId: true,
          userId: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      res.status(200).json({ entries });
    } catch (error) {
      console.error('Error fetching entries:', error);
      res.status(500).json({ error: error.message || 'Database error' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}