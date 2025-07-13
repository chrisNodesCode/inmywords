// src/pages/api/entries/index.js

import { PrismaClient } from '@prisma/client';
import { authOptions } from "../auth/[...nextauth]"; // Ensure this path is correct
import { getServerSession } from 'next-auth/next';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const userId = session.user.id;

  switch (req.method) {
    case 'GET':
      try {
        const entries = await prisma.entry.findMany({
          where: { userId },
          include: { tags: true },
          orderBy: { createdAt: 'desc' },
        });
        return res.status(200).json(entries);
      } catch (error) {
        console.error('GET /api/entries error', error);
        return res.status(500).json({ error: 'Failed to fetch entries' });
      }

    case 'POST':
      console.log('Session on entry create:', session);
      try {
        const { title, content, tagIds } = req.body;
        if (!title || typeof title !== 'string') {
          return res.status(400).json({ error: 'Title is required' });
        }
        if (!content || typeof content !== 'string') {
          return res.status(400).json({ error: 'Content is required' });
        }
        if (!Array.isArray(tagIds) || !tagIds.every(id => typeof id === 'string')) {
          return res.status(400).json({ error: 'tagIds must be an array of strings' });
        }
        console.log("Creating entry as user ID:", session.user?.id);
        console.log("POST /api/entries received body:", req.body);
        const entry = await prisma.entry.create({
          data: {
            title,
            content,
            user: { connect: { id: userId } },
            tags: { connect: tagIds.map(id => ({ id })) },
          },
          include: { tags: true },
        });
        console.log("Created entry:", entry);
        return res.status(201).json(entry);
      } catch (error) {
        console.error('POST /api/entries error', error);
        return res.status(500).json({ error: 'Failed to create entry' });
      }

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}