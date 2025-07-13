import { PrismaClient } from '../../../prisma/generated';
import { getSession } from 'next-auth/react';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  const session = await getSession({ req });
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const userId = session.user.id;
  const notebookId = req.query.id;

  // Verify notebook ownership
  const notebook = await prisma.notebook.findUnique({
    where: { id: notebookId },
  });
  if (!notebook || notebook.userId !== userId) {
    return res.status(404).json({ error: 'Notebook not found' });
  }

  switch (req.method) {
    case 'GET':
      // Return notebook metadata
      return res.status(200).json(notebook);

    case 'PUT':
      // Update notebook
      try {
        const { title, description } = req.body;
        if (title && typeof title !== 'string') {
          return res.status(400).json({ error: 'Invalid title' });
        }
        const updated = await prisma.notebook.update({
          where: { id: notebookId },
          data: {
            ...(title !== undefined ? { title } : {}),
            ...(description !== undefined ? { description } : {}),
          },
        });
        return res.status(200).json(updated);
      } catch (error) {
        console.error('PUT /api/notebooks/[id] error', error);
        return res.status(500).json({ error: 'Failed to update notebook' });
      }

    case 'DELETE':
      // Delete notebook
      try {
        await prisma.notebook.delete({
          where: { id: notebookId },
        });
        return res.status(204).end();
      } catch (error) {
        console.error('DELETE /api/notebooks/[id] error', error);
        return res.status(500).json({ error: 'Failed to delete notebook' });
      }

    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
