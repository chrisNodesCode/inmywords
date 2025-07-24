import React, { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';


import EntryEditor from './EntryEditor';

export default function Notebook() {
  const [showEditor, setShowEditor] = useState(false);
  const [notebook, setNotebook] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNotebook() {
      try {
        // fetch the user's notebooks and grab the first one
        const nbRes = await fetch('/api/notebooks');
        if (!nbRes.ok) throw new Error('Failed to fetch notebooks');
        const notebooks = await nbRes.json();
        if (!notebooks.length) {
          setNotebook(null);
          setLoading(false);
          return;
        }
        const firstId = notebooks[0].id;
        const treeRes = await fetch(`/api/notebooks/${firstId}/tree`);
        if (!treeRes.ok) throw new Error('Failed to fetch notebook tree');
        const tree = await treeRes.json();
        setNotebook(tree);
      } catch (err) {
        console.error(err);
        setNotebook(null);
      } finally {
        setLoading(false);
      }
    }

    fetchNotebook();
  }, []);


  const handleSave = (entry) => {
    // TODO: integrate with API
    console.log('Saved entry', entry);
    setShowEditor(false);
  };

  const handleCancel = () => {
    setShowEditor(false);
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>{notebook ? notebook.title : 'Notebook'}</h1>
      <button onClick={() => setShowEditor(true)}>Add Entry</button>
      <button onClick={() => signOut({ redirect: false })} style={{ marginLeft: '1rem' }}>
        Logout
      </button>

      {loading && <p>Loading...</p>}

      {!loading && notebook && (
        <div style={{ marginTop: '2rem' }}>
          {notebook.groups.map(group => (
            <div key={group.id} style={{ marginBottom: '1rem' }}>
              <h2>{group.name}</h2>
              <div style={{ paddingLeft: '1rem' }}>
                {group.subgroups.map(sub => (
                  <div key={sub.id} style={{ marginBottom: '0.5rem' }}>
                    <h3>{sub.name}</h3>
                    <div style={{ paddingLeft: '1rem' }}>
                      {sub.entries.map(entry => (
                        <div key={entry.id} style={{ marginBottom: '0.25rem' }}>
                          <h4>{entry.title}</h4>
                          <p>{entry.content}</p>
                          {entry.tags.length > 0 && (
                            <ul>
                              {entry.tags.map(tag => (
                                <li key={tag.id}>{tag.name}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <h1>Notebook</h1>
      <button onClick={() => setShowEditor(true)}>Add Entry</button>
      {showEditor && (
        <EntryEditor onSave={handleSave} onCancel={handleCancel} />
      )}
    </div>
  );
}
