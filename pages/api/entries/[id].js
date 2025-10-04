// pages/api/entries/[id].js
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { ENTRY_STATUS_VALUES } from '@/constants/entryStatus';
import prisma from '@/api/prismaClient';
import { enqueueSearchIndexingJob } from '@/server/jobs/searchIndexing';
import { enqueueAIEnrichmentJob } from '@/server/jobs/aiEnrichment';

export default async function handler(req, res) {
  // Authenticate user
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const userId = session.user.id;
  const { id } = req.query;

  try {
    // Fetch entry and verify ownership
    const entry = await prisma.entry.findUnique({
      where: { id },
      include: {
        tags: true,
        subgroup: { include: { group: true } },
      },
    });
    if (!entry || entry.userId !== userId) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    switch (req.method) {
      case 'GET':
        // Return entry details
        return res.status(200).json(entry);

      case 'PUT': {
        // Parse and validate input
        const { title, content, subgroupId, tagIds, archived, status } = req.body;
        if (title !== undefined && typeof title !== 'string') {
          return res.status(400).json({ error: 'Invalid title' });
        }
        if (content !== undefined && typeof content !== 'string') {
          return res.status(400).json({ error: 'Invalid content' });
        }
        if (subgroupId !== undefined && typeof subgroupId !== 'string') {
          return res.status(400).json({ error: 'Invalid subgroupId' });
        }
        if (tagIds !== undefined && (!Array.isArray(tagIds) || !tagIds.every(id => typeof id === 'string'))) {
          return res.status(400).json({ error: 'Invalid tagIds' });
        }
        if (archived !== undefined && typeof archived !== 'boolean') {
          return res.status(400).json({ error: 'Invalid archived flag' });
        }
        if (status !== undefined) {
          if (typeof status !== 'string' || !ENTRY_STATUS_VALUES.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
          }
        }

        // If subgroup change requested, verify new subgroup ownership
        if (subgroupId) {
          const target = await prisma.subgroup.findUnique({
            where: { id: subgroupId },
            include: { group: { include: { notebook: true } } },
          });
          if (!target || target.group.notebook.userId !== userId) {
            return res.status(404).json({ error: 'Target subgroup not found' });
          }
        }

        // Perform update
        const updated = await prisma.entry.update({
          where: { id },
          data: {
            ...(title !== undefined ? { title } : {}),
            ...(content !== undefined ? { content } : {}),
            ...(subgroupId !== undefined ? { subgroupId } : {}),
            ...(tagIds !== undefined
              ? { tags: { set: tagIds.map(id => ({ id })) } }
              : {}),
            ...(archived !== undefined ? { archived } : {}),
            ...(status !== undefined ? { status } : {}),
          },
          include: {
            tags: true,
            subgroup: { include: { group: true } },
          },
        });
        try {
          await Promise.all([
            enqueueSearchIndexingJob({
              entryId: id,
              userId,
              operation: 'update',
            }),
            enqueueAIEnrichmentJob({
              entryId: id,
              userId,
              trigger: 'entry:update',
            }),
          ]);
        } catch (jobError) {
          console.error('PUT /api/entries/[id] enqueue error', jobError);
        }
        return res.status(200).json(updated);
      }

      case 'DELETE': {
        // Delete the entry
        await prisma.entry.delete({ where: { id } });
        try {
          await enqueueSearchIndexingJob({
            entryId: id,
            userId,
            operation: 'delete',
          });
        } catch (jobError) {
          console.error('DELETE /api/entries/[id] enqueue error', jobError);
        }
        return res.status(204).end();
      }

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error(`Error in /api/entries/[id] (${req.method})`, error);
    return res.status(500).json({ error: 'Server error' });
  }
}
