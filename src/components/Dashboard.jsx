import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import NavBar from './NavBar';

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function Dashboard() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { data: notebooks, mutate } = useSWR(
    status === 'authenticated' ? '/api/notebooks' : null,
    fetcher
  );
  const [loading, setLoading] = useState(false);

  if (status === 'loading') return <div>Loading...</div>;
  if (!session) {
    router.push('/');
    return null;
  }

  const handleAdd = async () => {
    const title = prompt('Notebook title');
    if (!title) return;
    setLoading(true);
    const res = await fetch('/api/notebooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title })
    });
    if (res.ok) {
      const newNotebook = await res.json();
      mutate([newNotebook, ...(notebooks || [])]);
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this notebook? This will remove all nested data.')) return;
    await fetch(`/api/notebooks/${id}`, { method: 'DELETE' });
    mutate(notebooks.filter((nb) => nb.id !== id));
  };

  const openNotebook = (id) => router.push(`/notebooks/${id}`);

  return (
    <div className="dashboard-container">
      <NavBar />
      <div className="dashboard-content">
        <button className="add-notebook-btn" onClick={handleAdd} disabled={loading}>
          Add Notebook
        </button>
        <div className="notebook-list">
          {notebooks ? (
            notebooks.map((nb) => (
              <div key={nb.id} className="notebook-card" onClick={() => openNotebook(nb.id)}>
                <span className="notebook-title-text">{nb.title}</span>
                <button
                  className="notebook-delete-btn"
                  onClick={(e) => { e.stopPropagation(); handleDelete(nb.id); }}
                >
                  🗑
                </button>
              </div>
            ))
          ) : (
            <div>Loading...</div>
          )}
        </div>
      </div>
    </div>
  );
}
