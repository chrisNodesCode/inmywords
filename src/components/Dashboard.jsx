// src/components/Dashboard.jsx

import React, { useEffect, useState, useContext } from 'react';
import { useRouter } from 'next/router';
import { signOut, useSession } from 'next-auth/react';
import { ThemeContext } from '../theme/ThemeContext';
import LandingPage from './LandingPage';
import NavBar from './NavBar';

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { theme } = useContext(ThemeContext);

  const [notebooks, setNotebooks] = useState([]);
  const [selectedNotebook, setSelectedNotebook] = useState(null);
  const [tree, setTree] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState([]);
  const [expandedSubgroups, setExpandedSubgroups] = useState([]);
  const [expandedEntries, setExpandedEntries] = useState([]);

  async function addNotebook() {
    const title = prompt('New notebook title:');
    if (!title) return;
    try {
      const res = await fetch('/api/notebooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description: '' })
      });
      if (!res.ok) throw new Error('Failed to create notebook');
      const newNb = await res.json();
      setNotebooks(prev => [...prev, newNb]);
      selectNotebook(newNb.id);
    } catch (err) {
      console.error('Add notebook error', err);
    }
  }

  async function editNotebook(id) {
    const notebook = notebooks.find(nb => nb.id === id);
    const newTitle = prompt('Rename notebook:', notebook.title);
    if (!newTitle || newTitle === notebook.title) return;
    try {
      const res = await fetch(`/api/notebooks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle })
      });
      if (!res.ok) throw new Error('Failed to rename notebook');
      const updated = await res.json();
      setNotebooks(prev => prev.map(nb => nb.id === id ? updated : nb));
    } catch (err) {
      console.error('Edit notebook error', err);
    }
  }

  // Redirect if not authenticated and fetch notebooks on auth
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchNotebooks();
    }
  }, [status]);

  // Fetch all notebooks
  async function fetchNotebooks() {
    try {
      const res = await fetch('/api/notebooks');
      const data = await res.json();
      setNotebooks(data);
      if (data.length > 0) {
        selectNotebook(data[0].id);
      }
    } catch (e) {
      console.error('Failed to load notebooks', e);
    }
  }

  // Select notebook and load its tree
  async function selectNotebook(id) {
    setSelectedNotebook(id);
    try {
      const res = await fetch(`/api/notebooks/${id}/tree`);
      const data = await res.json();
      setTree(data);
      // Expand all groups and subgroups upon selecting a notebook (entries remain collapsed)
      const allGroupIds = data.groups.map(group => group.id);
      const allSubgroupIds = data.groups.flatMap(group =>
        group.subgroups.map(sub => sub.id)
      );
      setExpandedGroups(allGroupIds);
      setExpandedSubgroups(allSubgroupIds);
      setExpandedEntries([]);
    } catch (e) {
      console.error('Failed to load notebook tree', e);
    }
  }

  // Toggle group expansion
  function toggleGroup(groupId) {
    setExpandedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  }

  // Toggle subgroup expansion
  function toggleSubgroup(subgroupId) {
    setExpandedSubgroups(prev =>
      prev.includes(subgroupId)
        ? prev.filter(id => id !== subgroupId)
        : [...prev, subgroupId]
    );
  }

  // Toggle entry expansion
  function toggleEntry(entryId) {
    setExpandedEntries(prev =>
      prev.includes(entryId)
        ? prev.filter(id => id !== entryId)
        : [...prev, entryId]
    );
  }

  // Render notebook contents as a collapsible tree
  function renderTree() {
    if (!tree) return null;

    return (
      <div className="notebook-container">
        <h2
          className="notebook-title clickable"
          onClick={() => router.push(`/notebooks/${selectedNotebook}`)}
        >
          {tree.title}
        </h2>
        <div className="group-list">
          {tree.groups.map(group => (
            <div key={group.id} className="group-node">
              <button
                onClick={() => toggleGroup(group.id)}
                className="group-toggle-button"
              >
                {expandedGroups.includes(group.id) ? '–' : '+'}
              </button>
              <span className="group-name">{group.name}</span>
              {expandedGroups.includes(group.id) && (
                <div className="subgroup-list">
                  {group.subgroups.map(subgroup => (
                    <div key={subgroup.id} className="subgroup-node">
                      <button
                        onClick={() => toggleSubgroup(subgroup.id)}
                        className="subgroup-toggle-button"
                      >
                        {expandedSubgroups.includes(subgroup.id) ? '–' : '+'}
                      </button>
                      <span className="subgroup-name">{subgroup.name}</span>
                      {expandedSubgroups.includes(subgroup.id) && (
                        <div className="entry-list">
                          {subgroup.entries.map(entry => (
                            <div
                              key={entry.id}
                              className={`entry-node ${expandedEntries.includes(entry.id) ? 'expanded' : ''}`}
                            >
                              <span
                                className="entry-title"
                                onClick={() => toggleEntry(entry.id)}
                              >
                                {entry.title}
                              </span>
                              <div className="entry-tags">
                                {entry.tags.map(tag => (
                                  <span key={tag.id} className="entry-tag">{tag.name}</span>
                                ))}
                              </div>
                              {expandedEntries.includes(entry.id) && (
                                <div className="entry-content">{entry.content}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Render main content based on auth status
  if (status === 'loading') {
    return <div className="loading-indicator">Loading...</div>;
  }
  if (!session) {
    return <LandingPage />;
  }

  return (
    <div className="dashboard-container" data-theme={theme}>
      <NavBar onSignOut={signOut} />
      <div className="dashboard-content">
        <aside className="sidebar">
          <h3 className="sidebar-heading">
            Notebooks
            <button className="icon-btn" onClick={addNotebook}>＋</button>
            {selectedNotebook && (
              <button className="icon-btn" onClick={() => editNotebook(selectedNotebook)}>
                ✎
              </button>
            )}
          </h3>
          <ul className="notebook-list">
            {notebooks.map(nb => (
              <li
                key={nb.id}
                className={`notebook-list-item ${nb.id === selectedNotebook ? 'active' : ''
                  }`}
                onClick={() => selectNotebook(nb.id)}
              >
                {nb.title}
              </li>
            ))}
          </ul>
        </aside>
        <main className="main-panel">{renderTree()}</main>
      </div>
    </div>
  );
}
