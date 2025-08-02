import React, { useState, useRef, useEffect } from 'react';


import EntryEditor from './EntryEditor';
import NotebookController from './NotebookController';
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DragHandle from '@mui/icons-material/DragHandle';

function SortableWrapper({ id, disabled, children }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id, disabled });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    touchAction: 'manipulation',
  };
  return children({ attributes, listeners, setNodeRef, style });
}

const htmlToText = (html) => {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?\>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .trim();
};

export default function Notebook() {
  const [editorState, setEditorState] = useState({
    isOpen: false,
    type: null,
    parent: null,
    index: null,
    item: null,
    mode: 'create',
    onDelete: null,
    onArchive: null,
  });
  const [notebook, setNotebook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState([]); // ids of expanded groups
  const [expandedSubgroups, setExpandedSubgroups] = useState([]); // ids of expanded subgroups
  const [expandedEntries, setExpandedEntries] = useState([]); // ids of expanded entries
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [showEdits, setShowEdits] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [loadError, setLoadError] = useState('');

  const sensors = useSensors(useSensor(PointerSensor));

  const groupRefs = useRef({});
  const subgroupRefs = useRef({});
  const [activeGroup, setActiveGroup] = useState(null);
  const [activeSubgroup, setActiveSubgroup] = useState(null);

  const sortTree = (tree) => ({
    ...tree,
    groups: [...tree.groups]
      .sort((a, b) => a.user_sort - b.user_sort)
      .map((g) => ({
        ...g,
        subgroups: [...g.subgroups]
          .sort((a, b) => a.user_sort - b.user_sort)
          .map((s) => ({
            ...s,
            entries: [...s.entries].sort((a, b) => a.user_sort - b.user_sort),
          })),
      })),
  });

  useEffect(() => {
    const handleScroll = () => {
      if (!notebook) return;
      let newSub = null;
      let newGroup = null;
      for (const g of notebook.groups) {
        const gRef = groupRefs.current[g.id];
        if (gRef) {
          const rect = gRef.getBoundingClientRect();
          if (rect.top <= 0 && rect.bottom >= 0) {
            newGroup = g.id;
          }
        }
        if (expandedGroups.includes(g.id)) {
          for (const s of g.subgroups) {
            if (!expandedSubgroups.includes(s.id)) continue;
            const sRef = subgroupRefs.current[s.id];
            if (!sRef) continue;
            const sRect = sRef.getBoundingClientRect();
            if (sRect.top <= 0 && sRect.bottom >= 0) {
              newSub = s.id;
              newGroup = g.id;
              break;
            }
          }
        }
        if (newSub) break;
      }
      setActiveSubgroup(newSub);
      setActiveGroup(newGroup);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [notebook, expandedGroups, expandedSubgroups]);

  const loadNotebook = async (id) => {
    setLoading(true);
    setLoadError('');
    try {
      const treeRes = await fetch(`/api/notebooks/${id}/tree`);
      let payload = null;
      try {
        payload = await treeRes.clone().json();
      } catch (e) {
        // ignore json parse errors
      }
      if (!treeRes.ok) {
        throw new Error(payload?.error || 'Failed to fetch notebook tree');
      }
      const tree = payload || (await treeRes.json());
      setNotebook(sortTree(tree));
      setExpandedGroups([]);
      setExpandedSubgroups([]);
      setExpandedEntries([]);
    } catch (err) {
      console.error(err);
      setNotebook(null);
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  };


  const handleSave = async (data) => {
    const { autoSave = false, ...payload } = data;
    if (!editorState.type) return;
    try {
      if (editorState.type === 'entry') {
        if (editorState.mode === 'edit') {
          const res = await fetch(`/api/entries/${editorState.item.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: payload.title, content: payload.content }),
          });
          if (!res.ok) throw new Error('Failed to update entry');
          const updated = await res.json();
          setNotebook((prev) => {
            const groups = prev.groups.map((g) => {
              if (g.id !== editorState.parent.groupId) return g;
              return {
                ...g,
                subgroups: g.subgroups.map((s) => {
                  if (s.id !== editorState.parent.subgroupId) return s;
                  const entries = s.entries.map((e) =>
                    e.id === updated.id ? { ...updated } : e
                  );
                  return { ...s, entries };
                }),
              };
            });
            return { ...prev, groups };
          });
        } else {
          const res = await fetch('/api/entries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: payload.title,
              content: payload.content,
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
        }
      } else if (editorState.type === 'subgroup') {
        if (editorState.mode === 'edit') {
          const res = await fetch(`/api/subgroups/${editorState.item.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: payload.name, description: payload.description }),
          });
          if (!res.ok) throw new Error('Failed to update subgroup');
          const updated = await res.json();
          setNotebook((prev) => {
            const groups = prev.groups.map((g) => {
              if (g.id !== editorState.parent.groupId) return g;
              return {
                ...g,
                subgroups: g.subgroups.map((s) =>
                  s.id === updated.id ? { ...s, ...updated } : s
                ),
              };
            });
            return { ...prev, groups };
          });
        } else {
          const res = await fetch('/api/subgroups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: payload.name,
              description: payload.description,
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
        }
      } else if (editorState.type === 'group') {
        if (editorState.mode === 'edit') {
          const res = await fetch(`/api/groups/${editorState.item.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: payload.name, description: payload.description }),
          });
          if (!res.ok) throw new Error('Failed to update group');
          const updated = await res.json();
          setNotebook((prev) => {
            const groups = prev.groups.map((g) =>
              g.id === updated.id ? { ...g, ...updated } : g
            );
            return { ...prev, groups };
          });
        } else {
          const res = await fetch('/api/groups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: payload.name,
              description: payload.description,
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
        }
      } else if (editorState.type === 'notebook') {
        if (editorState.mode === 'edit') {
          const res = await fetch(`/api/notebooks/${editorState.item.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: payload.name, description: payload.description }),
          });
          if (!res.ok) throw new Error('Failed to update notebook');
          const updated = await res.json();
          setNotebook((prev) => ({ ...prev, ...updated }));
        }
      } else if (editorState.type === 'tag') {
        const tagRes = await fetch('/api/tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: payload.name, notebookId: notebook.id }),
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
      if (!autoSave) {
        setEditorState({
          isOpen: false,
          type: null,
          parent: null,
          index: null,
          item: null,
          mode: 'create',
          onDelete: null,
          onArchive: null,
        });
      }
    }
  };

  const handleCancel = () => {
    setEditorState({
      isOpen: false,
      type: null,
      parent: null,
      index: null,
      item: null,
      mode: 'create',
      onDelete: null,
      onArchive: null,
    });
  };

  const openEditor = (
    type,
    parent,
    index,
    item = null,
    mode = 'create',
    onDelete = null,
    onArchive = null
  ) => {
    setEditorState({ isOpen: true, type, parent, index, item, mode, onDelete, onArchive });
  };

  const handleGroupDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    setNotebook((prev) => {
      const oldIndex = prev.groups.findIndex((g) => g.id === active.id);
      const newIndex = prev.groups.findIndex((g) => g.id === over.id);
      const groups = arrayMove(prev.groups, oldIndex, newIndex).map((g, idx) => ({
        ...g,
        user_sort: idx,
      }));
      fetch('/api/groups/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orders: groups.map((g, idx) => ({ id: g.id, user_sort: idx })),
        }),
      }).catch((err) => console.error(err));
      return { ...prev, groups };
    });
  };

  const handleSubgroupDragEnd = (groupId) => ({ active, over }) => {
    if (!over || active.id === over.id) return;
    setNotebook((prev) => {
      const groups = prev.groups.map((g) => {
        if (g.id !== groupId) return g;
        const oldIndex = g.subgroups.findIndex((s) => s.id === active.id);
        const newIndex = g.subgroups.findIndex((s) => s.id === over.id);
        const subgroups = arrayMove(g.subgroups, oldIndex, newIndex).map((s, idx) => ({
          ...s,
          user_sort: idx,
        }));
        fetch('/api/subgroups/reorder', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orders: subgroups.map((s, idx) => ({ id: s.id, user_sort: idx })),
          }),
        }).catch((err) => console.error(err));
        return { ...g, subgroups };
      });
      return { ...prev, groups };
    });
  };

  const handleEntryDragEnd = (groupId, subgroupId) => ({ active, over }) => {
    if (!over || active.id === over.id) return;
    setNotebook((prev) => {
      const groups = prev.groups.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          subgroups: g.subgroups.map((s) => {
            if (s.id !== subgroupId) return s;
            const oldIndex = s.entries.findIndex((e) => e.id === active.id);
            const newIndex = s.entries.findIndex((e) => e.id === over.id);
            const entries = arrayMove(s.entries, oldIndex, newIndex).map((e, idx) => ({
              ...e,
              user_sort: idx,
            }));
            fetch('/api/entries/reorder', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orders: entries.map((e, idx) => ({ id: e.id, user_sort: idx })),
              }),
            }).catch((err) => console.error(err));
            return { ...s, entries };
          }),
        };
      });
      return { ...prev, groups };
    });
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

  const handleToggleArchiveEntry = async (groupId, subgroupId, entryId, archived) => {
    try {
      const res = await fetch(`/api/entries/${entryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived }),
      });
      if (!res.ok) throw new Error('Failed to update entry');
      const updated = await res.json();
      setNotebook((prev) => {
        const groups = prev.groups.map((g) => {
          if (g.id !== groupId) return g;
          return {
            ...g,
            subgroups: g.subgroups.map((s) => {
              if (s.id !== subgroupId) return s;
              const entries = s.entries.map((e) =>
                e.id === entryId ? { ...e, archived: updated.archived } : e
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

  const handleTitleSave = async () => {
    if (!notebook) return;
    const newTitle = titleInput.trim();
    if (!newTitle) {
      setIsEditingTitle(false);
      return;
    }
    try {
      const res = await fetch(`/api/notebooks/${notebook.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });
      if (!res.ok) throw new Error('Failed to update notebook');
      const updated = await res.json();
      setNotebook((prev) => ({ ...prev, ...updated }));
    } catch (err) {
      console.error(err);
    } finally {
      setIsEditingTitle(false);
    }
  };

  const groupsReorderable = expandedGroups.length === 0;

  return (
    <div className="notebook-container">
      <NotebookController
        onSelect={loadNotebook}
        showEdits={showEdits}
        onToggleEdits={setShowEdits}
        showArchived={showArchived}
        onToggleArchived={setShowArchived}
      />
      <h1 className="notebook-title"
        onClick={() => {
          if (notebook && !isEditingTitle) {
            setTitleInput(notebook.title);
            setIsEditingTitle(true);
          }
        }}
      >
        {isEditingTitle ? (
          <input
            type="text"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTitleSave();
            }}
            autoFocus
          />
        ) : (
          notebook ? notebook.title : 'Notebook'
        )}
      </h1>

      {loading && <p>Loading...</p>}
      {!loading && loadError && (
        <p className="error-message">{loadError}</p>
      )}

      {!loading && notebook && (
        <div className="groups-container">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={groupsReorderable ? handleGroupDragEnd : undefined}
          >
            <SortableContext
              items={notebook.groups.map((g) => g.id)}
              strategy={verticalListSortingStrategy}
            >
              {notebook.groups.map((group) => {
                const subgroupsReorderable =
                  expandedGroups.includes(group.id) &&
                  !group.subgroups.some((s) => expandedSubgroups.includes(s.id));
                return (
                  <SortableWrapper key={group.id} id={group.id} disabled={!groupsReorderable}>
                    {({ setNodeRef, style, attributes, listeners }) => (
                      <div
                        ref={setNodeRef}
                        style={style}
                        className={`group-card ${expandedGroups.includes(group.id) ? 'open' : ''}`}
                      >
                        <div
                          ref={(el) => {
                            if (el) groupRefs.current[group.id] = el;
                          }}
                          data-group-id={group.id}
                          className={`group-header interactive ${
                            activeSubgroup && activeGroup === group.id ? 'fade-out' : ''
                          }`}
                          role="button"
                          tabIndex={0}
                          onClick={() => toggleGroup(group)}
                        >
                          {groupsReorderable && (
                            <span
                              className="drag-handle"
                              {...attributes}
                              {...listeners}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <DragHandle fontSize="small" />
                            </span>
                          )}
                          <h2 className="group-title">{group.name}</h2>
                          {expandedGroups.includes(group.id) && (
                            <button
                              className={`edit-button${showEdits ? '' : ' hidden'}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditor(
                                  'group',
                                  { groupId: group.id },
                                  null,
                                  group,
                                  'edit',
                                  () => handleDeleteGroup(group.id)
                                );
                              }}
                            >
                              Edit
                            </button>
                          )}
                        </div>
                        <div
                          className={`group-children collapsible ${
                            expandedGroups.includes(group.id) ? 'open' : ''
                          }`}
                        >
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={
                              subgroupsReorderable ? handleSubgroupDragEnd(group.id) : undefined
                            }
                          >
                            <SortableContext
                              items={group.subgroups.map((s) => s.id)}
                              strategy={verticalListSortingStrategy}
                            >
                              {group.subgroups.map((sub) => {
                                const entriesReorderable =
                                  expandedSubgroups.includes(sub.id) &&
                                  !sub.entries.some((e) => expandedEntries.includes(e.id));
                                return (
                                  <SortableWrapper
                                    key={sub.id}
                                    id={sub.id}
                                    disabled={!subgroupsReorderable}
                                  >
                                    {({
                                      setNodeRef: setSubRef,
                                      style: subStyle,
                                      attributes: subAttr,
                                      listeners: subListeners,
                                    }) => (
                                      <div ref={setSubRef} style={subStyle} className="subgroup-card">
                                        <div
                                          ref={(el) => {
                                            if (el) subgroupRefs.current[sub.id] = el;
                                          }}
                                          data-subgroup-id={sub.id}
                                          className={`subgroup-header interactive ${
                                            expandedSubgroups.includes(sub.id) ? 'open' : ''
                                          }`}
                                          role="button"
                                          tabIndex={0}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleSubgroup(sub);
                                          }}
                                        >
                                          {subgroupsReorderable && (
                                            <span
                                              className="drag-handle"
                                              {...subAttr}
                                              {...subListeners}
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <DragHandle fontSize="small" />
                                            </span>
                                          )}
                                          <div className="subgroup-title">{sub.name}</div>
                                          {expandedSubgroups.includes(sub.id) && (
                                            <button
                                              className={`edit-button${showEdits ? '' : ' hidden'}`}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                openEditor(
                                                  'subgroup',
                                                  { groupId: group.id, subgroupId: sub.id },
                                                  null,
                                                  sub,
                                                  'edit',
                                                  () => handleDeleteSubgroup(group.id, sub.id)
                                                );
                                              }}
                                            >
                                              Edit
                                            </button>
                                          )}
                                        </div>
                                        <div
                                          className={`subgroup-children collapsible ${
                                            expandedSubgroups.includes(sub.id) ? 'open' : ''
                                          }`}
                                        >
                                          <DndContext
                                            sensors={sensors}
                                            collisionDetection={closestCenter}
                                            onDragEnd={
                                              entriesReorderable
                                                ? handleEntryDragEnd(group.id, sub.id)
                                                : undefined
                                            }
                                          >
                                            <SortableContext
                                              items={sub.entries.map((e) => e.id)}
                                              strategy={verticalListSortingStrategy}
                                            >
                                              {sub.entries
                                                .filter((e) => showArchived || !e.archived)
                                                .map((entry) => (
                                                  <SortableWrapper
                                                    key={entry.id}
                                                    id={entry.id}
                                                    disabled={!entriesReorderable}
                                                  >
                                                    {({
                                                      setNodeRef: setEntryRef,
                                                      style: entryStyle,
                                                      attributes: entryAttr,
                                                      listeners: entryListeners,
                                                    }) => (
                                                      <div
                                                        ref={setEntryRef}
                                                        style={entryStyle}
                                                        className={`entry-card ${
                                                          expandedEntries.includes(entry.id) ? 'open' : ''
                                                        } ${entry.archived ? 'archived' : ''}`}
                                                      >
                                                        <div
                                                          className="entry-header interactive"
                                                          role="button"
                                                          tabIndex={0}
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleEntry(entry.id);
                                                          }}
                                                        >
                                                          {entriesReorderable && (
                                                            <span
                                                              className="drag-handle"
                                                              {...entryAttr}
                                                              {...entryListeners}
                                                              onClick={(e) => e.stopPropagation()}
                                                            >
                                                              <DragHandle fontSize="small" />
                                                            </span>
                                                          )}
                                                          <h4 className="entry-card-title">{entry.title}</h4>
                                                          <div
                                                            className="entry-card-content"
                                                            style={{
                                                              display: 'flex',
                                                              flexDirection: 'row',
                                                              justifyContent: 'flex-start',
                                                            }}
                                                          >
                                                            <div>
                                                              {expandedEntries.includes(entry.id)
                                                                ? htmlToText(entry.content)
                                                                    .split(/\n+/)
                                                                    .map((para, idx) => (
                                                                      <p key={idx}>{para}</p>
                                                                    ))
                                                                : (
                                                                  <div>{htmlToText(entry.content).slice(0, 40)}...</div>
                                                                )}
                                                            </div>
                                                          </div>
                                                        </div>
                                                        <div
                                                          className={`entry-details collapsible ${
                                                            expandedEntries.includes(entry.id) ? 'open' : ''
                                                          }`}
                                                        >
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
                                                            style={{ marginRight: '1rem' }}
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
                                                              openEditor(
                                                                'entry',
                                                                {
                                                                  subgroupId: sub.id,
                                                                  groupId: group.id,
                                                                  entryId: entry.id,
                                                                },
                                                                null,
                                                                entry,
                                                                'edit',
                                                                () =>
                                                                  handleDeleteEntry(group.id, sub.id, entry.id),
                                                                () =>
                                                                  handleToggleArchiveEntry(
                                                                    group.id,
                                                                    sub.id,
                                                                    entry.id,
                                                                    !entry.archived
                                                                  )
                                                              );
                                                            }}
                                                          >
                                                            Edit
                                                          </button>
                                                          <button
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              handleToggleArchiveEntry(
                                                                group.id,
                                                                sub.id,
                                                                entry.id,
                                                                !entry.archived
                                                              );
                                                            }}
                                                            style={{ marginLeft: '0.5rem' }}
                                                          >
                                                            {entry.archived ? 'Restore' : 'Archive'}
                                                          </button>
                                                        </div>
                                                      </div>
                                                    )}
                                                  </SortableWrapper>
                                                ))}
                                              <div
                                                className="add-entry interactive"
                                                role="button"
                                                tabIndex={0}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  openEditor(
                                                    'entry',
                                                    {
                                                      subgroupId: sub.id,
                                                      groupId: group.id,
                                                      label: `Subgroup: ${sub.name}`,
                                                    },
                                                    sub.entries.length - 1
                                                  );
                                                }}
                                              >
                                                Add Entry
                                              </div>
                                            </SortableContext>
                                          </DndContext>
                                        </div>
                                      </div>
                                    )}
                                  </SortableWrapper>
                                );
                              })}
                              <div
                                className="add-subgroup interactive"
                                role="button"
                                tabIndex={0}
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
                              </div>
                            </SortableContext>
                          </DndContext>
                        </div>
                      </div>
                    )}
                  </SortableWrapper>
                );
              })}
              <div
                className="add-group interactive"
                role="button"
                tabIndex={0}
                onClick={() =>
                  openEditor('group', { label: 'Notebook Root' }, notebook.groups.length - 1)
                }
              >
                Add Group
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {editorState.isOpen && (
        <EntryEditor
          type={editorState.type}
          parent={editorState.parent}
          onSave={handleSave}
          onCancel={handleCancel}
          onDelete={editorState.onDelete}
          onArchive={editorState.onArchive}
          initialData={editorState.item}
          mode={editorState.mode}
        />
      )}
    </div>
  );
}
