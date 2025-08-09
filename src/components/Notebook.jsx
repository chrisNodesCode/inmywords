import React, { useState, useRef, useEffect, useMemo } from 'react';


import EntryEditor from './EntryEditor';
import NotebookController from './NotebookController';
import Link from 'next/link';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { Switch } from 'antd';

function SortableWrapper({ id, disabled, data, children }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isOver,
  } = useSortable({ id, disabled, data });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    touchAction: 'manipulation',
  };
  return children({ attributes, listeners, setNodeRef, style, isOver });
}

const htmlToText = (html) => {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
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
  const [showEdits, setShowEdits] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [loadError, setLoadError] = useState('');
  const isPrecursorNotebook = !!notebook?.precursorId;
  const [fullFocusEnabled, setFullFocusEnabled] = useState(false);
  const [controllerKey, setControllerKey] = useState(0);
  const [activeDrag, setActiveDrag] = useState(null);
  const [hoveredSubgroup, setHoveredSubgroup] = useState(null);
  const [showShortcutFlyout, setShowShortcutFlyout] = useState(false);

  const aliases = useMemo(
    () => ({
      group: notebook?.user_notebook_tree?.[0] || 'Group',
      subgroup: notebook?.user_notebook_tree?.[1] || 'Subgroup',
      entry: notebook?.user_notebook_tree?.[2] || 'Entry',
    }),
    [notebook]
  );

  const notebookShortcuts = [
    { action: `Add ${aliases.group}`, keys: 'Ctrl+Alt+G' },
    { action: `Add ${aliases.subgroup}`, keys: 'Ctrl+Alt+S' },
    { action: `Add ${aliases.entry}`, keys: 'Ctrl+Alt+E' },
    { action: 'Toggle Full Focus', keys: 'Ctrl+Alt+F' },
    { action: 'Toggle Edit Entities', keys: 'Ctrl+Alt+M' },
  ];

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const groupRefs = useRef({});
  const subgroupRefs = useRef({});
  const subgroupChildrenRefs = useRef({});
  const entryRefs = useRef({});

  const handleFullFocusToggle = async (checked) => {
    setFullFocusEnabled(checked);
    try {
      if (checked) {
        await document.documentElement.requestFullscreen?.();
      } else if (document.fullscreenElement) {
        await document.exitFullscreen?.();
      }
    } catch (err) {
      console.error('Failed to toggle full screen', err);
    }
  };

  useEffect(() => {
    const handleFullScreenChange = () => {
      setFullFocusEnabled(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!notebook || isPrecursorNotebook || editorState.isOpen) return;
      if (e.ctrlKey && e.altKey && !e.shiftKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        openEditor('group', { label: `${aliases.group} Root` }, notebook.groups.length - 1);
      } else if (e.ctrlKey && e.altKey && !e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        const lastGroupId = expandedGroups[expandedGroups.length - 1];
        const group = notebook.groups.find((g) => g.id === lastGroupId);
        if (group) {
          openEditor(
            'subgroup',
            { groupId: group.id, label: `${aliases.group}: ${group.name}` },
            group.subgroups.length - 1
          );
        }
      } else if (e.ctrlKey && e.altKey && !e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        const lastSubgroupId = expandedSubgroups[expandedSubgroups.length - 1];
        let group = null;
        let subgroup = null;
        notebook.groups.forEach((g) => {
          const found = g.subgroups.find((s) => s.id === lastSubgroupId);
          if (found) {
            group = g;
            subgroup = found;
          }
        });
        if (group && subgroup) {
          openEditor(
            'entry',
            {
              subgroupId: subgroup.id,
              groupId: group.id,
              label: `${aliases.subgroup}: ${subgroup.name}`,
            },
            subgroup.entries.length - 1,
            null,
            'create',
            null,
            null,
            { groups: notebook.groups }
          );
        }
      } else if (e.ctrlKey && e.altKey && !e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        handleFullFocusToggle(!fullFocusEnabled);
      } else if (e.ctrlKey && e.altKey && !e.shiftKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setShowEdits((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    notebook,
    expandedGroups,
    expandedSubgroups,
    fullFocusEnabled,
    showEdits,
    isPrecursorNotebook,
    aliases,
    handleFullFocusToggle,
    editorState,
  ]);

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

  const loadNotebook = async (id) => {
    setLoading(true);
    setLoadError('');
    try {
      const treeRes = await fetch(`/api/notebooks/${id}/tree`);
      let payload = null;
      try {
        payload = await treeRes.clone().json();
      } catch {
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
          const updatePayload = {
            title: payload.title,
            content: payload.content,
          };
          let targetGroupId = editorState.parent.groupId;
          if (
            payload.subgroupId &&
            payload.subgroupId !== editorState.parent.subgroupId
          ) {
            updatePayload.subgroupId = payload.subgroupId;
            updatePayload.user_sort = 0;
            notebook.groups.forEach((g) => {
              if (g.subgroups.some((s) => s.id === payload.subgroupId)) {
                targetGroupId = g.id;
              }
            });
          }
          const res = await fetch(`/api/entries/${editorState.item.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatePayload),
          });
          if (!res.ok) throw new Error('Failed to update entry');
          const updated = await res.json();
          setNotebook((prev) => {
            if (
              payload.subgroupId &&
              payload.subgroupId !== editorState.parent.subgroupId
            ) {
              let groups = prev.groups.map((g) => {
                if (g.id === editorState.parent.groupId) {
                  return {
                    ...g,
                    subgroups: g.subgroups.map((s) =>
                      s.id === editorState.parent.subgroupId
                        ? { ...s, entries: s.entries.filter((e) => e.id !== updated.id) }
                        : s
                    ),
                  };
                }
                return g;
              });
              groups = groups.map((g) => {
                if (g.id === targetGroupId) {
                  return {
                    ...g,
                    subgroups: g.subgroups.map((s) =>
                      s.id === payload.subgroupId
                        ? { ...s, entries: [updated, ...s.entries] }
                        : s
                    ),
                  };
                }
                return g;
              });
              return { ...prev, groups };
            }
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
          if (
            payload.subgroupId &&
            payload.subgroupId !== editorState.parent.subgroupId
          ) {
            setEditorState((prev) => ({
              ...prev,
              parent: {
                ...prev.parent,
                subgroupId: payload.subgroupId,
                groupId: targetGroupId,
              },
            }));
          }
        } else {
          const res = await fetch('/api/entries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: payload.title,
              content: payload.content,
              subgroupId: payload.subgroupId || editorState.parent.subgroupId,
            }),
          });
          if (!res.ok) throw new Error('Failed to create entry');
          const newEntry = await res.json();
          const targetSubgroupId =
            payload.subgroupId || editorState.parent.subgroupId;
          let targetGroupId = editorState.parent.groupId;
          notebook.groups.forEach((g) => {
            if (g.subgroups.some((s) => s.id === targetSubgroupId)) {
              targetGroupId = g.id;
            }
          });
          setNotebook((prev) => {
            const groups = prev.groups.map((g) => {
              if (g.id !== targetGroupId) return g;
              return {
                ...g,
                subgroups: g.subgroups.map((s) => {
                  if (s.id !== targetSubgroupId) return s;
                  const entries = [...s.entries];
                  if (targetSubgroupId === editorState.parent.subgroupId) {
                    entries.splice(editorState.index + 1, 0, { ...newEntry, tags: [] });
                  } else {
                    entries.unshift({ ...newEntry, tags: [] });
                  }
                  return { ...s, entries };
                }),
              };
            });
            return { ...prev, groups };
          });
          if (payload.subgroupId && payload.subgroupId !== editorState.parent.subgroupId) {
            setEditorState((prev) => ({
              ...prev,
              parent: {
                ...prev.parent,
                subgroupId: payload.subgroupId,
                groupId: targetGroupId,
              },
            }));
          }
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
            body: JSON.stringify({
              title: payload.name,
              description: payload.description,
              user_notebook_tree: payload.user_notebook_tree,
            }),
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
    onArchive = null,
    extra = {}
  ) => {
    setEditorState({
      isOpen: true,
      type,
      parent,
      index,
      item,
      mode,
      onDelete,
      onArchive,
      ...extra,
    });
  };

  const handleGroupReorder = (activeId, overId) => {
    if (activeId === overId) return;
    setNotebook((prev) => {
      const oldIndex = prev.groups.findIndex((g) => g.id === activeId);
      const newIndex = prev.groups.findIndex((g) => g.id === overId);
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

  const handleSubgroupReorder = (groupId, activeId, overId) => {
    if (activeId === overId) return;
    setNotebook((prev) => {
      const groups = prev.groups.map((g) => {
        if (g.id !== groupId) return g;
        const oldIndex = g.subgroups.findIndex((s) => s.id === activeId);
        const newIndex = g.subgroups.findIndex((s) => s.id === overId);
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

  const handleEntryReorder = (groupId, subgroupId, activeId, overId) => {
    if (activeId === overId) return;
    setNotebook((prev) => {
      const groups = prev.groups.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          subgroups: g.subgroups.map((s) => {
            if (s.id !== subgroupId) return s;
            const oldIndex = s.entries.findIndex((e) => e.id === activeId);
            const newIndex = s.entries.findIndex((e) => e.id === overId);
            const entries = arrayMove(s.entries, oldIndex, newIndex).map(
              (e, idx) => ({ ...e, user_sort: idx })
            );
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

  const handleDragStart = (event) => {
    document.body.classList.add('dragging');
    setActiveDrag(event.active.data.current);
  };

  const handleDragOver = () => {
    setHoveredSubgroup(null);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) {
      setActiveDrag(null);
      setHoveredSubgroup(null);
      document.body.classList.remove('dragging');
      return;
    }
    const activeData = active.data.current;
    const overData = over.data.current;
    if (activeData?.type === 'group' && overData?.type === 'group') {
      handleGroupReorder(active.id, over.id);
    } else if (
      activeData?.type === 'subgroup' &&
      overData?.type === 'subgroup' &&
      activeData.groupId === overData.groupId
    ) {
      handleSubgroupReorder(activeData.groupId, active.id, over.id);
    } else if (
      activeData?.type === 'entry' &&
      overData?.type === 'entry' &&
      activeData.subgroupId === overData.subgroupId
    ) {
      handleEntryReorder(activeData.groupId, activeData.subgroupId, active.id, over.id);
    }
    setActiveDrag(null);
    setHoveredSubgroup(null);
    document.body.classList.remove('dragging');
  };

  const handleDragCancel = () => {
    setActiveDrag(null);
    setHoveredSubgroup(null);
    document.body.classList.remove('dragging');
  };

  const toggleGroup = (group) => {
    const isOpen = expandedGroups.includes(group.id);
    setExpandedGroups((prev) => {
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
        group.subgroups.forEach((s) => {
          const el = subgroupChildrenRefs.current[s.id];
          el?.style.removeProperty('max-height');
          el?.style.removeProperty('height');
        });
        return prev.filter((id) => id !== group.id);
      }
      return [...prev, group.id];
    });
    if (!isOpen) {
      setTimeout(() => {
        groupRefs.current[group.id]?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 0);
    }
  };

  const toggleSubgroup = (subgroup) => {
    const isOpen = expandedSubgroups.includes(subgroup.id);
    if (isOpen) {
      setExpandedSubgroups((prev) => prev.filter((id) => id !== subgroup.id));
      setExpandedEntries((ents) =>
        ents.filter((id) => !subgroup.entries.some((e) => e.id === id))
      );
      const el = subgroupChildrenRefs.current[subgroup.id];
      el?.style.removeProperty('max-height');
      el?.style.removeProperty('height');
    } else {
      expandedSubgroups.forEach((id) => {
        if (id !== subgroup.id) {
          const otherEl = subgroupChildrenRefs.current[id];
          otherEl?.style.removeProperty('max-height');
          otherEl?.style.removeProperty('height');
        }
      });
      setExpandedSubgroups([subgroup.id]);
      setExpandedEntries((ents) =>
        ents.filter((id) => subgroup.entries.some((e) => e.id === id))
      );
      setTimeout(() => {
        const headerEl = subgroupRefs.current[subgroup.id];
        const childrenEl = subgroupChildrenRefs.current[subgroup.id];
        headerEl?.scrollIntoView({ block: 'start' });
        if (childrenEl) {
          childrenEl.scrollTop = 0;
          const headerHeight = headerEl?.offsetHeight || 0;
          const available = window.innerHeight - headerHeight;
          childrenEl.style.maxHeight = `${available}px`;
          childrenEl.style.height = `${available}px`;
        }
      }, 0);
    }
  };

  const toggleEntry = (entryId) => {
    const isOpen = expandedEntries.includes(entryId);
    setExpandedEntries((prev) =>
      isOpen ? prev.filter((id) => id !== entryId) : [...prev, entryId]
    );
    if (!isOpen) {
      setTimeout(() => {
        entryRefs.current[entryId]?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 0);
    }
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

  const handleDeleteNotebook = async (notebookId) => {
    try {
      const res = await fetch(`/api/notebooks/${notebookId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete notebook');
      setNotebook(null);
      setExpandedGroups([]);
      setExpandedSubgroups([]);
      setExpandedEntries([]);
      setControllerKey((prev) => prev + 1);
      setLoading(false);
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

  const groupsReorderable = !isPrecursorNotebook && expandedGroups.length === 0;

  return (
    <div className="notebook-container">
      <div className="notebook-header">
        <NotebookController
          key={controllerKey}
          onSelect={loadNotebook}
          showEdits={showEdits}
          onToggleEdits={setShowEdits}
          showArchived={showArchived}
          onToggleArchived={setShowArchived}
        />
        <Link href="/notebook-dev" style={{ marginLeft: '1rem' }}>
          NotebookDev
        </Link>
        <div className="full-focus-toggle">
          <span style={{ marginRight: '0.25rem' }}>Full Focus</span>
          <Switch
            checked={fullFocusEnabled}
            onChange={handleFullFocusToggle}
            size="small"
          />
        </div>
        <div className="shortcut-link" style={{ position: 'relative', marginLeft: '1rem' }}>
          <button onClick={() => setShowShortcutFlyout((prev) => !prev)}>
            Shortcuts
          </button>
          {showShortcutFlyout && (
            <div
              className="shortcut-flyout"
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                background: '#fff',
                border: '1px solid #ccc',
                padding: '0.5rem',
                zIndex: 1000,
                color: '#000',
              }}
            >
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {notebookShortcuts.map((s) => (
                  <li key={s.action}>
                    {s.action}: {s.keys}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      <div className="notebook-title-row">
        <h1 className="notebook-title">
          {notebook ? notebook.title : 'Notebook'}
        </h1>
        {notebook && !isPrecursorNotebook && (
          <button
            className={`edit-button${showEdits ? '' : ' hidden'}`}
            onClick={() =>
              openEditor(
                'notebook',
                null,
                null,
                {
                  id: notebook.id,
                  name: notebook.title,
                  description: notebook.description,
                  user_notebook_tree: notebook.user_notebook_tree,
                },
                'edit',
                () => handleDeleteNotebook(notebook.id)
              )
            }
          >
            Edit
          </button>
        )}
      </div>

      {loading && <p>Loading...</p>}
      {!loading && loadError && (
        <p className="error-message">{loadError}</p>
      )}

      {!loading && notebook && (
        <div className="groups-container">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <SortableContext
              id="groups"
              items={notebook.groups.map((g) => g.id)}
              strategy={verticalListSortingStrategy}
            >
              {notebook.groups.map((group) => {
                const subgroupsReorderable =
                  !isPrecursorNotebook &&
                  expandedGroups.includes(group.id) &&
                  !group.subgroups.some((s) => expandedSubgroups.includes(s.id));
                return (
                  <SortableWrapper
                    key={group.id}
                    id={group.id}
                    data={{ type: 'group' }}
                    disabled={!groupsReorderable}
                  >
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
                          className="group-header"
                          {...(groupsReorderable ? attributes : {})}
                          {...(groupsReorderable ? listeners : {})}
                          role="button"
                          tabIndex={0}
                          onClick={() => toggleGroup(group)}
                        >
                          <h2 className="group-title interactive">{group.name}</h2>
                          {expandedGroups.includes(group.id) && !isPrecursorNotebook && (
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
                          className={`group-children collapsible ${expandedGroups.includes(group.id) ? 'open' : ''
                            }`}
                        >
                          <SortableContext
                            id={group.id}
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
                                  data={{ type: 'subgroup', groupId: group.id }}
                                  disabled={!subgroupsReorderable}
                                >
                                  {({
                                    setNodeRef: setSubRef,
                                    style: subStyle,
                                    attributes: subAttr,
                                    listeners: subListeners,
                                  }) => (
                                    <div
                                      ref={setSubRef}
                                      style={subStyle}
                                      className={`subgroup-card ${hoveredSubgroup === sub.id && activeDrag?.type === 'entry'
                                        ? expandedSubgroups.includes(sub.id)
                                          ? 'insert-indicator'
                                          : 'drop-target'
                                        : ''
                                        }`}
                                    >
                                      <div
                                        ref={(el) => {
                                          if (el) subgroupRefs.current[sub.id] = el;
                                        }}
                                        data-subgroup-id={sub.id}
                                        className={`subgroup-header interactive ${expandedSubgroups.includes(sub.id) ? 'open' : ''
                                          }`}
                                        {...(subgroupsReorderable ? subAttr : {})}
                                        {...(subgroupsReorderable ? subListeners : {})}
                                        role="button"
                                        tabIndex={0}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleSubgroup(sub);
                                        }}
                                      >
                                        <div
                                          className="subgroup-title"
                                          style={{ backgroundColor: 'inherit' }}
                                        >
                                          {sub.name}
                                        </div>
                                        {expandedSubgroups.includes(sub.id) && !isPrecursorNotebook && (
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
                                        className={`subgroup-children collapsible ${expandedSubgroups.includes(sub.id) ? 'open' : ''}`}
                                        ref={(el) => {
                                          if (el) subgroupChildrenRefs.current[sub.id] = el;
                                        }}
                                      >
                                        <SortableContext
                                          id={sub.id}
                                          items={sub.entries
                                            .filter((e) => showArchived || !e.archived)
                                            .map((e) => e.id)}
                                          strategy={verticalListSortingStrategy}
                                        >
                                          {sub.entries
                                            .filter((e) => showArchived || !e.archived)
                                            .map((entry) => (
                                              <SortableWrapper
                                                key={entry.id}
                                                id={entry.id}
                                                data={{
                                                  type: 'entry',
                                                  groupId: group.id,
                                                  subgroupId: sub.id,
                                                }}
                                                disabled={!entriesReorderable}
                                              >
                                                {({
                                                  setNodeRef: setEntryRef,
                                                  style: entryStyle,
                                                  attributes: entryAttr,
                                                  listeners: entryListeners,
                                                }) => (
                                                  <div
                                                    ref={(el) => {
                                                      setEntryRef(el);
                                                      if (el) entryRefs.current[entry.id] = el;
                                                    }}
                                                    data-entry-id={entry.id}
                                                    style={entryStyle}
                                                    className={`entry-card ${expandedEntries.includes(entry.id) ? 'open' : ''
                                                      } ${entry.archived ? 'archived' : ''}`}
                                                  >
                                                    <div
                                                      className="entry-header interactive"
                                                      {...(entriesReorderable ? entryAttr : {})}
                                                      {...(entriesReorderable ? entryListeners : {})}
                                                      role="button"
                                                      tabIndex={0}
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (expandedEntries.includes(entry.id)) {
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
                                                            () => handleDeleteEntry(group.id, sub.id, entry.id),
                                                            () =>
                                                              handleToggleArchiveEntry(
                                                                group.id,
                                                                sub.id,
                                                                entry.id,
                                                                !entry.archived
                                                              ),
                                                            { groups: notebook.groups }
                                                          );
                                                        } else {
                                                          toggleEntry(entry.id);
                                                        }
                                                      }}
                                                    >
                                                      <h4 className="entry-card-title">{entry.title}</h4>
                                                      {expandedEntries.includes(entry.id) && (
                                                        <button
                                                          className="collapse-button"
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleEntry(entry.id);
                                                          }}
                                                          aria-label="Collapse"
                                                        >
                                                          ×
                                                        </button>
                                                      )}
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
                                                              <div>
                                                                <div>{htmlToText(entry.content).slice(0, 40)}...</div>
                                                                <div className="entry-card-timestamps">
                                                                  Last Updated: {new Date(entry.updatedAt).toLocaleString()} | Created At: {new Date(entry.createdAt).toLocaleString()}
                                                                </div>
                                                              </div>
                                                            )}
                                                        </div>
                                                      </div>
                                                    </div>
                                                    <div
                                                      className={`entry-details collapsible ${expandedEntries.includes(entry.id) ? 'open' : ''
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
                                                        style={{ marginRight: '0.5rem' }}
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          openEditor(
                                                            'tag',
                                                            {
                                                              entryId: entry.id,
                                                              subgroupId: sub.id,
                                                              groupId: group.id,
                                                              tagIds: entry.tags.map((t) => t.id),
                                                              label: `${aliases.entry}: ${entry.title}`,
                                                            },
                                                            entry.tags.length - 1
                                                          );
                                                        }}
                                                      >
                                                        Add Tag
                                                      </button>
                                                      <button
                                                        style={{
                                                          marginRight: "0.5rem"
                                                        }}
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
                                                              ),
                                                            { groups: notebook.groups }
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
                                                        style={{ marginRight: '0.5rem' }}
                                                      >
                                                        {entry.archived ? 'Restore' : 'Archive'}
                                                      </button>
                                                      <button
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          toggleEntry(entry.id);
                                                        }}
                                                      // style={{ marginLeft: '0.5rem' }}
                                                      >
                                                        Collapse
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
                                                  label: `${aliases.subgroup}: ${sub.name}`,
                                                },
                                                sub.entries.length - 1,
                                                null,
                                                'create',
                                                null,
                                                null,
                                                { groups: notebook.groups }
                                              );
                                            }}
                                          >
                                            Add {aliases.entry}
                                          </div>
                                        </SortableContext>
                                      </div>
                                    </div>
                                  )}
                                </SortableWrapper>
                              );
                            })}
                            {!isPrecursorNotebook && (
                              <div
                                className="add-subgroup interactive"
                                role="button"
                                tabIndex={0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditor(
                                    'subgroup',
                                    { groupId: group.id, label: `${aliases.group}: ${group.name}` },
                                    group.subgroups.length - 1
                                  );
                                }}
                              >
                                Add {aliases.subgroup}
                              </div>
                            )}
                          </SortableContext>
                        </div>
                      </div>
                    )}
                  </SortableWrapper>
                );
              })}
              {!isPrecursorNotebook && (
                <div
                  className="add-group interactive"
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    openEditor(
                      'group',
                      { label: `${aliases.group} Root` },
                      notebook.groups.length - 1
                    )
                  }
                >
                  Add {aliases.group}
                </div>
              )}
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
          aliases={aliases}
          groups={editorState.groups || []}
        />
      )}
    </div>
  );
}
