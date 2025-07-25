import React, { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';


import EntryEditor from './EntryEditor';

export default function Notebook() {
  const [editorState, setEditorState] = useState({ isOpen: false, type: null, parent: null, index: null });
  const [notebook, setNotebook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState([]); // ids of expanded groups
  const [expandedSubgroups, setExpandedSubgroups] = useState([]); // ids of expanded subgroups
  const [expandedEntries, setExpandedEntries] = useState([]); // ids of expanded entries

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


  const handleSave = async (data) => {
    if (!editorState.type) return;
    try {
      if (editorState.type === 'entry') {
        const res = await fetch('/api/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: data.title,
            content: data.content,
            subgroupId: editorState.parent.subgroupId,
          }),
        });
        if (!res.ok) throw new Error('Failed to create entry');
        const newEntry = await res.json();
        setNotebook((prev) => {
          const groups = prev.groups.map((g) => {
            if (g.id !== editorState.parent.groupId) return g;
            return {
              ...g,
              subgroups: g.subgroups.map((s) => {
                if (s.id !== editorState.parent.subgroupId) return s;
                const entries = [...s.entries];
                entries.splice(editorState.index + 1, 0, { ...newEntry, tags: [] });
                return { ...s, entries };
              }),
            };
          });
          return { ...prev, groups };
        });
      } else if (editorState.type === 'subgroup') {
        const res = await fetch('/api/subgroups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: data.name,
            description: data.description,
            groupId: editorState.parent.groupId,
          }),
        });
        if (!res.ok) throw new Error('Failed to create subgroup');
        const newSub = await res.json();
        setNotebook((prev) => {
          const groups = prev.groups.map((g) => {
            if (g.id !== editorState.parent.groupId) return g;
            const subgroups = [...g.subgroups];
            subgroups.splice(editorState.index + 1, 0, { ...newSub, entries: [] });
            return { ...g, subgroups };
          });
          return { ...prev, groups };
        });
      } else if (editorState.type === 'group') {
        const res = await fetch('/api/groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: data.name,
            description: data.description,
            notebookId: notebook.id,
          }),
        });
        if (!res.ok) throw new Error('Failed to create group');
        const newGroup = await res.json();
        setNotebook((prev) => {
          const groups = [...prev.groups];
          groups.splice(editorState.index + 1, 0, { ...newGroup, subgroups: [] });
          return { ...prev, groups };
        });
      } else if (editorState.type === 'tag') {
        const tagRes = await fetch('/api/tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: data.name, notebookId: notebook.id }),
        });
        if (!tagRes.ok) throw new Error('Failed to create tag');
        const newTag = await tagRes.json();
        const entryRes = await fetch(`/api/entries/${editorState.parent.entryId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tagIds: [...editorState.parent.tagIds, newTag.id],
          }),
        });
        if (!entryRes.ok) throw new Error('Failed to attach tag');
        const updatedEntry = await entryRes.json();
        setNotebook((prev) => {
          const groups = prev.groups.map((g) => {
            if (g.id !== editorState.parent.groupId) return g;
            return {
              ...g,
              subgroups: g.subgroups.map((s) => {
                if (s.id !== editorState.parent.subgroupId) return s;
                const entries = s.entries.map((e) =>
                  e.id === editorState.parent.entryId ? { ...updatedEntry } : e
                );
                return { ...s, entries };
              }),
            };
          });
          return { ...prev, groups };
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setEditorState({ isOpen: false, type: null, parent: null, index: null });
    }
  };

  const handleCancel = () => {
    setEditorState({ isOpen: false, type: null, parent: null, index: null });
  };

  const openEditor = (type, parent, index) => {
    setEditorState({ isOpen: true, type, parent, index });
  };

  const toggleGroup = (group) => {
    setExpandedGroups((prev) => {
      const isOpen = prev.includes(group.id);
      if (isOpen) {
        setExpandedSubgroups((subs) =>
          subs.filter((id) => !group.subgroups.some((s) => s.id === id))
        );
        setExpandedEntries((ents) =>
          ents.filter(
            (id) =>
              !group.subgroups.some((s) => s.entries.some((e) => e.id === id))
          )
        );
        return prev.filter((id) => id !== group.id);
      }
      return [...prev, group.id];
    });
  };

  const toggleSubgroup = (subgroup) => {
    setExpandedSubgroups((prev) => {
      const isOpen = prev.includes(subgroup.id);
      if (isOpen) {
        setExpandedEntries((ents) =>
          ents.filter((id) => !subgroup.entries.some((e) => e.id === id))
        );
        return prev.filter((id) => id !== subgroup.id);
      }
      return [...prev, subgroup.id];
    });
  };

  const toggleEntry = (entryId) => {
    setExpandedEntries((prev) =>
      prev.includes(entryId)
        ? prev.filter((id) => id !== entryId)
        : [...prev, entryId]
    );
  };

  const handleDeleteGroup = async (groupId) => {
    try {
      const res = await fetch(`/api/groups/${groupId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete group');
      setNotebook((prev) => {
        const groups = prev.groups.filter((g) => g.id !== groupId);
        return { ...prev, groups };
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSubgroup = async (groupId, subgroupId) => {
    try {
      const res = await fetch(`/api/subgroups/${subgroupId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete subgroup');
      setNotebook((prev) => {
        const groups = prev.groups.map((g) => {
          if (g.id !== groupId) return g;
          return {
            ...g,
            subgroups: g.subgroups.filter((s) => s.id !== subgroupId),
          };
        });
        return { ...prev, groups };
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteEntry = async (groupId, subgroupId, entryId) => {
    try {
      const res = await fetch(`/api/entries/${entryId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete entry');
      setNotebook((prev) => {
        const groups = prev.groups.map((g) => {
          if (g.id !== groupId) return g;
          return {
            ...g,
            subgroups: g.subgroups.map((s) => {
              if (s.id !== subgroupId) return s;
              return { ...s, entries: s.entries.filter((e) => e.id !== entryId) };
            }),
          };
        });
        return { ...prev, groups };
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveTag = async (groupId, subgroupId, entryId, tagId, tagIds) => {
    try {
      const newIds = tagIds.filter((id) => id !== tagId);
      const res = await fetch(`/api/entries/${entryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagIds: newIds }),
      });
      if (!res.ok) throw new Error('Failed to remove tag');
      const updated = await res.json();
      setNotebook((prev) => {
        const groups = prev.groups.map((g) => {
          if (g.id !== groupId) return g;
          return {
            ...g,
            subgroups: g.subgroups.map((s) => {
              if (s.id !== subgroupId) return s;
              const entries = s.entries.map((e) =>
                e.id === entryId ? { ...updated } : e
              );
              return { ...s, entries };
            }),
          };
        });
        return { ...prev, groups };
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="notebook-container">
      <h1>{notebook ? notebook.title : 'Notebook'}</h1>
      <button onClick={() => signOut({ redirect: false })} style={{ marginLeft: '1rem' }}>
        Logout
      </button>

      {loading && <p>Loading...</p>}

      {!loading && notebook && (
        <div className="groups-container">
          {notebook.groups.map((group) => (
            <div key={group.id} className="group-card" onClick={() => toggleGroup(group)}>
              <h2>{group.name}</h2>
              {expandedGroups.includes(group.id) && group.subgroups.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleGroup(group);
                  }}
                >
                  Collapse
                </button>
              )}
              {group.subgroups.length === 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteGroup(group.id);
                  }}
                >
                  Delete
                </button>
              )}

              {expandedGroups.includes(group.id) && (
                <div>
                  {group.subgroups.map((sub) => (
                    <div key={sub.id} className="subgroup-card" onClick={(e) => { e.stopPropagation(); toggleSubgroup(sub); }}>
                      <h3>{sub.name}</h3>
                      {expandedSubgroups.includes(sub.id) && sub.entries.length > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSubgroup(sub);
                          }}
                        >
                          Collapse
                        </button>
                      )}
                      {sub.entries.length === 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSubgroup(group.id, sub.id);
                          }}
                        >
                          Delete
                        </button>
                      )}

                      {expandedSubgroups.includes(sub.id) && (
                        <div>
                          {sub.entries.map((entry) => (
                            <div key={entry.id} className="entry-card" onClick={(e) => { e.stopPropagation(); toggleEntry(entry.id); }}>
                              <h4>{entry.title}</h4>
                              {expandedEntries.includes(entry.id) && (
                                <>
                                  <p>{entry.content}</p>
                                  {entry.tags.length > 0 && (
                                    <div>
                                      {entry.tags.map((tag) => (
                                        <div
                                          key={tag.id}
                                          className="tag"
                                          onClick={() =>
                                            handleRemoveTag(
                                              group.id,
                                              sub.id,
                                              entry.id,
                                              tag.id,
                                              entry.tags.map((t) => t.id)
                                            )
                                          }
                                        >
                                          <span className="close-icon">×</span>
                                          {tag.name}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteEntry(group.id, sub.id, entry.id);
                                    }}
                                  >
                                    Delete
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openEditor(
                                        'tag',
                                        {
                                          entryId: entry.id,
                                          subgroupId: sub.id,
                                          groupId: group.id,
                                          tagIds: entry.tags.map((t) => t.id),
                                          label: `Entry: ${entry.title}`,
                                        },
                                        entry.tags.length - 1
                                      );
                                    }}
                                  >
                                    Add Tag
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleEntry(entry.id);
                                    }}
                                  >
                                    Collapse
                                  </button>
                                </>
                              )}
                            </div>
                          ))}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditor(
                                'entry',
                                { subgroupId: sub.id, groupId: group.id, label: `Subgroup: ${sub.name}` },
                                sub.entries.length - 1
                              );
                            }}
                          >
                            Add Entry
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditor(
                        'subgroup',
                        { groupId: group.id, label: `Group: ${group.name}` },
                        group.subgroups.length - 1
                      );
                    }}
                  >
                    Add Subgroup
                  </button>
                </div>
              )}
            </div>
          ))}
          <button onClick={() => openEditor('group', { label: 'Notebook Root' }, notebook.groups.length - 1)}>
            Add Group
          </button>
        </div>
      )}

      {editorState.isOpen && (
        <EntryEditor type={editorState.type} parent={editorState.parent} onSave={handleSave} onCancel={handleCancel} />
      )}
    </div>
  );
}
