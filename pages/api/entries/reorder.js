import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../src/lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  const userId = session.user.id;

  const { subgroupId, ids } = req.body;
  if (!subgroupId || !Array.isArray(ids)) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  try {
    const subgroup = await prisma.subgroup.findUnique({
      where: { id: subgroupId },
      include: { group: { include: { notebook: true } } },
    });
    if (!subgroup || subgroup.group.notebook.userId !== userId) {
      return res.status(404).json({ error: 'Subgroup not found' });
    }

    await prisma.$transaction(
      ids.map((id, idx) =>
        prisma.entry.update({ where: { id }, data: { user_sort: idx } })
      )
    );
    return res.status(204).end();
  } catch (error) {
    console.error('PUT /api/entries/reorder error', error);
    return res.status(500).json({ error: 'Failed to reorder entries' });
  }
}
