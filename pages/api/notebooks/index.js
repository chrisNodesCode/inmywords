import React from 'react';
import { PrismaClient } from '@prisma/client';
import { authOptions } from "../auth/[...nextauth]"; // Ensure this path is correct
import { getServerSession } from 'next-auth/next';

import Link from 'next/link';

const prisma = new PrismaClient();

export async function getServerSideProps(ctx) {
  const session = await getSession({ req: ctx.req });
  if (!session) {
    return {
      redirect: {
        destination: '/api/auth/signin',
        permanent: false,
      },
    };
  }
  const userId = session.user.id;
  const notebooks = await prisma.notebook.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  return {
    props: { notebooks },
  };
}

export default function NotebooksIndexPage({ notebooks }) {
  return (
    <Layout>
      <header>
        <h1>Your Notebooks</h1>
      </header>
      <div className="notebook-actions" style={{ margin: '1rem 0' }}>
        <Link href="/notebooks/new">
          <button type="button" className="create-notebook-button">
            Create New Notebook
          </button>
        </Link>
      </div>
      <ul>
        {notebooks.map((nb) => (
          <li key={nb.id}>
            <Link href={`/notebooks/${nb.id}`}>
              {nb.title}
            </Link>
          </li>
        ))}
      </ul>
    </Layout>
  );
}
