import { PrismaClient } from '../../src/generated/prisma/index.js';
const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { content, title, criterionId, subcriterionId, userId } = req.body;
      console.log('Received body:', req.body);

      const entry = await prisma.entry.create({
        data: {
          content,
          title,
          criterionId,
          subcriterionId,
          userId
        },
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
      res.status(200).json({ entry });
    } catch (error) {

      console.error('Prisma error in /api/entry:', error);
      res.status(500).json({ error: error.message || 'Database error' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}