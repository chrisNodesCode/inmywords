// pages/api/notebooks/[id]/tree.js

import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  // Only GET is allowed
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // Authenticate user
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const userId = session.user.id;
  const notebookId = req.query.id;

  try {
    // Fetch the notebook with nested groups, subgroups, and entries (including tags)
    const notebook = await prisma.notebook.findUnique({
      where: { id: notebookId },
      include: {
        groups: {
          include: {
            subgroups: {
              include: {
                entries: {
                  include: { tags: true },
                  orderBy: { createdAt: 'desc' }
                }
              }
            }
          }
        }
      }
    });

    // Verify existence and ownership
    if (!notebook || notebook.userId !== userId) {
      return res.status(404).json({ error: 'Notebook not found' });
    }

    return res.status(200).json(notebook);
  } catch (error) {
    console.error('GET /api/notebooks/[id]/tree error', error);
    return res.status(500).json({ error: 'Failed to fetch notebook tree' });
  }
}
