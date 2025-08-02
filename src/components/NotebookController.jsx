import React, { useState, useEffect, useContext } from 'react';
import { signOut } from 'next-auth/react';
import { Switch, Avatar } from 'antd';
import EntryEditor from './EntryEditor';
import { EditOutlined, UserOutlined } from '@ant-design/icons';
import { ThemeContext } from './ThemeProvider';
import Link from 'next/link';


export default function NotebookController({ onSelect, showEdits, onToggleEdits, showArchived, onToggleArchived }) {
  const [notebooks, setNotebooks] = useState([]);
  const [selected, setSelected] = useState('');
  const [showModal, setShowModal] = useState(false);
  const { darkMode, toggleTheme } = useContext(ThemeContext);

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

  const handleCreate = async ({ name, description, user_notebook_tree }) => {
    try {
      const res = await fetch('/api/notebooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: name, description, user_notebook_tree }),
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
      <div className="controller-left">
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
        <Switch
          checkedChildren={<EditOutlined />}
          unCheckedChildren={<EditOutlined />}
          checked={showEdits}
          onChange={onToggleEdits}
          style={{ marginLeft: '0.5rem' }}
        />
        <span style={{ marginLeft: '0.5rem' }}>Show Archived</span>
        <Switch
          checked={showArchived}
          onChange={onToggleArchived}
          style={{ marginLeft: '0.25rem' }}
        />
      </div>
      <div className="profile-menu-container">
        <button className="profile-icon"><Avatar size="large" icon={<UserOutlined />} /></button>


        <div className="profile-menu">
          <Link href="/account" style={{ display: 'block', marginBottom: '0.5rem' }}>
            Account
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span>Dark Mode</span>
            <Switch checked={darkMode} onChange={toggleTheme} />
          </div>
          <button onClick={() => signOut({ redirect: false })}>Logout</button>
        </div>
      </div>
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
