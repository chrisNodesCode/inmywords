// pages/notebooks/[id].jsx
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Notebook from '../../src/components/Notebook';
import useSWR from 'swr';

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function NotebookPage() {
  const router = useRouter();
  const { id } = router.query;               // dynamic param
  const { data: session, status } = useSession();

  // while Next hydrates the route param & session:
  if (status === 'loading' || !id) {
    return <div>Loading...</div>;
  }
  if (!session) {
    router.push('/');
    return null;
  }

  // now that we have both session & id, fetch notebook data:
  const { data: notebook, error } = useSWR(
    id ? `/api/notebooks/${id}/tree` : null,
    fetcher
  );

  if (!notebook && !error) {
    return <div>Loading...</div>;
  }
  if (error) {
    return <div>Error loading notebook: {error.message}</div>;
  }

  const handleEdit = (node) => {
    console.log('Edit', node);
    // TODO: open edit modal or navigate
  };
  const handleDelete = (node) => {
    console.log('Delete', node);
    // TODO: confirm and delete via API
  };

  return (
    <Notebook
      notebook={notebook}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  );
}