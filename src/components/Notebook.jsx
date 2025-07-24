import React, { useState } from 'react';
import { signOut } from 'next-auth/react';
import EntryEditor from './EntryEditor';

export default function Notebook() {
  const [showEditor, setShowEditor] = useState(false);

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
      <h1>Notebook</h1>
      <button onClick={() => setShowEditor(true)}>Add Entry</button>
      <button onClick={() => signOut({ redirect: false })} style={{ marginLeft: '1rem' }}>
        Logout
      </button>
      {showEditor && (
        <EntryEditor onSave={handleSave} onCancel={handleCancel} />
      )}
    </div>
  );
}
