import React, { useState, useEffect, useContext } from 'react';
import { signOut } from 'next-auth/react';
import { Switch, Avatar, Drawer, Input, Button } from 'antd';
import { EditOutlined, UserOutlined } from '@ant-design/icons';
import { ThemeContext } from './ThemeProvider';
import Link from 'next/link';


export default function NotebookController({ onSelect, showEdits, onToggleEdits, showArchived, onToggleArchived }) {
  const [notebooks, setNotebooks] = useState([]);
  const [selected, setSelected] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const { darkMode, toggleTheme } = useContext(ThemeContext);

  useEffect(() => {
    async function fetchNotebooks() {
      try {
        const res = await fetch('/api/notebooks');
        if (!res.ok) throw new Error('Failed to fetch notebooks');
        const data = await res.json();
        setNotebooks(data);
        if (data.length) {
          let initial = data[0].id;
          if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('lastNotebookId');
            if (stored && data.some((nb) => nb.id === stored)) {
              initial = stored;
            }
            localStorage.setItem('lastNotebookId', initial);
          }
          setSelected(initial);
          onSelect(initial);
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
    if (typeof window !== 'undefined') {
      localStorage.setItem('lastNotebookId', id);
    }
  };

  const handleCreate = async ({ name, description, user_notebook_tree, precursorId }) => {
    try {
      const body = { title: name, description };
      if (precursorId) {
        body.precursorId = precursorId;
      } else {
        body.user_notebook_tree = user_notebook_tree;
      }
      const res = await fetch('/api/notebooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to create notebook');
      const newNb = await res.json();
      setNotebooks((prev) => [...prev, newNb]);
      setSelected(newNb.id);
      setDrawerOpen(false);
      onSelect(newNb.id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('lastNotebookId', newNb.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateDrawer = async () => {
    await handleCreate({ name: newTitle, description: newDescription });
    setNewTitle('');
    setNewDescription('');
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
        <button onClick={() => setDrawerOpen(true)} style={{ marginLeft: '0.5rem' }}>
          Add New
        </button>
        <Switch
          checkedChildren={<EditOutlined style={{ color: darkMode ? '#000' : '#fff' }} />}
          unCheckedChildren={<EditOutlined style={{ color: darkMode ? '#fff' : '#000' }} />}
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
      <Drawer
        title="New Notebook"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <Input
          placeholder="Name"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          style={{ marginBottom: '0.5rem' }}
        />
        <Input.TextArea
          placeholder="Description (optional)"
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          style={{ marginBottom: '0.5rem' }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <Button onClick={() => setDrawerOpen(false)}>Cancel</Button>
          <Button type="primary" onClick={handleCreateDrawer}>
            Create
          </Button>
        </div>
      </Drawer>
    </div>
  );
}
