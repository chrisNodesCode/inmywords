import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '@/api/prismaClient';

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', ['PATCH']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const userId = session.user.id;
  const { orders } = req.body;
  if (!Array.isArray(orders)) {
    return res.status(400).json({ error: 'Invalid payload' });
  }
  try {
    await prisma.$transaction(
      orders.map((g) =>
        prisma.group.updateMany({
          where: { id: g.id, notebook: { userId } },
          data: { user_sort: g.user_sort },
        })
      )
    );
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('PATCH /api/groups/reorder error', error);
    return res.status(500).json({ error: 'Failed to reorder groups' });
  }
}
