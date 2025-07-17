// pages/api/subgroups/[id].js
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
  const { id } = req.query;

  try {
    // Fetch the subgroup with its parent group and notebook to verify ownership
    const subgroup = await prisma.subgroup.findUnique({
      where: { id },
      include: {
        group: {
          include: {
            notebook: true
          }
        }
      }
    });
    if (!subgroup || subgroup.group.notebook.userId !== userId) {
      return res.status(404).json({ error: 'Subgroup not found' });
    }

    switch (req.method) {
      case 'GET':
        // Return subgroup details
        return res.status(200).json(subgroup);

      case 'PUT':
        // Update subgroup name/description
        const { name, description } = req.body;
        if (name !== undefined && typeof name !== 'string') {
          return res.status(400).json({ error: 'Invalid name' });
        }
        if (description !== undefined && typeof description !== 'string') {
          return res.status(400).json({ error: 'Invalid description' });
        }
        const updated = await prisma.subgroup.update({
          where: { id },
          data: {
            ...(name !== undefined ? { name } : {}),
            ...(description !== undefined ? { description } : {}),
          }
        });
        return res.status(200).json(updated);

      case 'DELETE':
        // Delete the subgroup (cascades entries via DB)
        await prisma.subgroup.delete({ where: { id } });
        return res.status(204).end();

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error(`Error in /api/subgroups/[id] (${req.method})`, error);
    return res.status(500).json({ error: 'Server error' });
  }
}
