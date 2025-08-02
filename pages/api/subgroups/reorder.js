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

  const { groupId, ids } = req.body;
  if (!groupId || !Array.isArray(ids)) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  try {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { notebook: true },
    });
    if (!group || group.notebook.userId !== userId) {
      return res.status(404).json({ error: 'Group not found' });
    }

    await prisma.$transaction(
      ids.map((id, idx) =>
        prisma.subgroup.update({ where: { id }, data: { user_sort: idx } })
      )
    );
    return res.status(204).end();
  } catch (error) {
    console.error('PUT /api/subgroups/reorder error', error);
    return res.status(500).json({ error: 'Failed to reorder subgroups' });
  }
}
