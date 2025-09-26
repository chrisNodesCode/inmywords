// src/pages/api/tags/index.js

import { authOptions } from "../auth/[...nextauth]"; // Ensure this path is correct
import { getServerSession } from 'next-auth/next';
import prisma from '@/api/prismaClient';

export default async function handler(req, res) {
  // Authenticate user
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const userId = session.user.id;
  const { notebookId } = req.query;

  switch (req.method) {
    case 'GET':
      try {
        // Fetch tags: global (no notebook) plus those in notebooks the user owns
        const tags = await prisma.tag.findMany({
          where: {
            OR: [
              { notebookId: null },
              { notebook: { userId } },
              ...(notebookId ? [{ notebookId }] : []),
            ],
          },
          orderBy: { name: 'asc' },
        });
        return res.status(200).json(tags);
      } catch (error) {
        console.error('GET /api/tags error', error);
        return res.status(500).json({ error: 'Failed to fetch tags' });
      }

    case 'POST':
      try {
        const { name, notebookId: bodyNotebookId, code: bodyCode } = req.body;
        // Generate a slug-style code from name if none provided
        const code = typeof bodyCode === 'string' && bodyCode.trim() !== ''
          ? bodyCode.trim()
          : name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
        if (!name || typeof name !== 'string') {
          return res.status(400).json({ error: 'Name is required' });
        }
        if (!bodyNotebookId || typeof bodyNotebookId !== 'string') {
          return res.status(400).json({ error: 'notebookId is required' });
        }
        const tag = await prisma.tag.create({
          data: { name, notebookId: bodyNotebookId, code },
        });
        return res.status(201).json(tag);
      } catch (error) {
        console.error('POST /api/tags error', error);
        return res.status(500).json({ error: 'Failed to create tag' });
      }

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
