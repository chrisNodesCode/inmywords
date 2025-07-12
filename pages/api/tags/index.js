// src/pages/api/tags/index.js

import { PrismaClient } from '../../../src/generated/prisma';
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
        const { name, code, description, parentId, notebookId: bodyNotebookId } = req.body;
        // Validate inputs
        if (!name || typeof name !== 'string') {
          return res.status(400).json({ error: 'Name is required' });
        }
        if (!code || typeof code !== 'string') {
          return res.status(400).json({ error: 'Code is required' });
        }
        if (description !== undefined && typeof description !== 'string') {
          return res.status(400).json({ error: 'Invalid description' });
        }
        if (parentId !== undefined && parentId !== null && typeof parentId !== 'string') {
          return res.status(400).json({ error: 'Invalid parentId' });
        }
        if (bodyNotebookId !== undefined && bodyNotebookId !== null && typeof bodyNotebookId !== 'string') {
          return res.status(400).json({ error: 'Invalid notebookId' });
        }
        // If tag is scoped to a notebook, verify ownership
        if (bodyNotebookId) {
          const notebook = await prisma.notebook.findUnique({ where: { id: bodyNotebookId } });
          if (!notebook || notebook.userId !== userId) {
            return res.status(404).json({ error: 'Notebook not found' });
          }
        }
        // Create the tag
        const tag = await prisma.tag.create({
          data: {
            name,
            code,
            description: description || null,
            parentId: parentId || null,
            notebookId: bodyNotebookId || null,
          },
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
