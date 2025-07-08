// src/pages/api/criteria.js

import { PrismaClient } from '../../src/generated/prisma/index.js'; // Adjust the path as necessary

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const criteria = await prisma.criteria.findMany({
        include: { subcriteria: true },
      });
      return res.status(200).json(criteria);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to fetch criteria' });
    }
  }

  res.setHeader('Allow', ['GET']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
