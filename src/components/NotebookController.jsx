import React, { useState, useEffect } from 'react';
import EntryEditor from './EntryEditor';

export default function NotebookController({ onSelect }) {
  const [notebooks, setNotebooks] = useState([]);
  const [selected, setSelected] = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    async function fetchNotebooks() {
      try {
        const res = await fetch('/api/notebooks');
        if (!res.ok) throw new Error('Failed to fetch notebooks');
        const data = await res.json();
        setNotebooks(data);
        if (data.length && !selected) {
          setSelected(data[0].id);
          onSelect(data[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    }
    fetchNotebooks();
  }, []);

  const handleChange = (e) => {
    const id = e.target.value;
    setSelected(id);
    onSelect(id);
  };

  const handleCreate = async ({ name, description }) => {
    try {
      const res = await fetch('/api/notebooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: name, description }),
      });
      if (!res.ok) throw new Error('Failed to create notebook');
      const newNb = await res.json();
      setNotebooks((prev) => [...prev, newNb]);
      setSelected(newNb.id);
      setShowModal(false);
      onSelect(newNb.id);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="notebook-controller">
      <select value={selected} onChange={handleChange}>
        {notebooks.map((nb) => (
          <option key={nb.id} value={nb.id}>
            {nb.title}
          </option>
        ))}
      </select>
      <button onClick={() => setShowModal(true)} style={{ marginLeft: '0.5rem' }}>
        Add New
      </button>
      {showModal && (
        <EntryEditor
          type="notebook"
          onSave={handleCreate}
          onCancel={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
