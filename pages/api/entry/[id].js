import { PrismaClient } from '../../../src/generated/prisma/index.js';
const prisma = new PrismaClient();

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'DELETE') {
    try {
      await prisma.entry.delete({
        where: { id },
      });
      res.status(200).json({ message: 'Entry deleted successfully' });
    } catch (error) {
      console.error('Error deleting entry:', error);
      res.status(500).json({ error: error.message || 'Database error' });
    }
  } else {
    res.setHeader('Allow', ['DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}