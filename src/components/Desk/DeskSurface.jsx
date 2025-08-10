

import React, { useEffect, useState, useRef } from 'react';
import classNames from 'classnames';
import styles from './Desk.module.css';

// Core children, centralized
import NotebookTree from '@/components/Tree/NotebookTree';
import NotebookMenu from '@/components/Menu/Menu';
import NotebookEditor from '@/components/Editor/NotebookEditor';
import FullScreenCanvas from '@/components/Editor/FullScreenCanvas';
import Drawer from '@/components/Drawer/Drawer';

// Temporary: use existing editor until we refactor Editor later
import EntryEditor from '@/components/EntryEditor';

function updateTreeData(list, key, children) {
  return list.map((node) => {
    if (node.key === key) return { ...node, children };
    if (node.children) return { ...node, children: updateTreeData(node.children, key, children) };
    return node;
  });
}

/**
 * DeskSurface
 * Pure layout + lifted state. Holds top-level state/handlers formerly in NotebookDev.jsx
 * and passes them down to Menu, Tree, and Editor. Drawer extraction will come later.
 */
export default function DeskSurface({
  className = '',
  style,
  hideTree = false,
  menuProps = {},
  treeProps: treePropOverrides = {},
  editorProps: editorPropOverrides = {},
  drawerProps: drawerPropOverrides = {},
  children,
}) {
  // === Lifted state from NotebookDev.jsx ===
  const [notebookId, setNotebookId] = useState(null);
  const [treeData, setTreeData] = useState([]);
  const [editorState, setEditorState] = useState({
    isOpen: false,
    type: null,
    parent: null,
    item: null,
    mode: 'create',
  });

  // NotebookEditor state
  const [title, setTitle] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [content, setContent] = useState('');
  const [lastSaved, setLastSaved] = useState(null);
  const [maxWidth, setMaxWidth] = useState(50);

  // Drawer state
  const drawerWidth = drawerPropOverrides.width || 300;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerPinned, setDrawerPinned] = useState(false);
  const drawerCloseTimeoutRef = useRef(null);

  const fetchGroups = async () => {
    if (!notebookId) return;
    try {
      const res = await fetch(`/api/groups?notebookId=${notebookId}`);
      if (res.ok) {
        const groups = await res.json();
        setTreeData(groups.map((g) => ({ title: g.name, key: g.id, type: 'group' })));
      }
    } catch (err) {
      console.error('Failed to load groups', err);
    }
  };

  useEffect(() => {
    fetchGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notebookId]);

  const loadData = (node) => {
    if (node.children) return Promise.resolve();

    if (node.type === 'group') {
      return fetch(`/api/subgroups?groupId=${node.key}`)
        .then((res) => (res.ok ? res.json() : []))
        .then((subgroups) => {
          setTreeData((origin) =>
            updateTreeData(
              origin,
              node.key,
              subgroups.map((sg) => ({
                title: sg.name,
                key: sg.id,
                type: 'subgroup',
                groupId: node.key,
              }))
            )
          );
        })
        .catch((err) => console.error('Failed to load subgroups', err));
    }

    if (node.type === 'subgroup') {
      return fetch(`/api/entries?subgroupId=${node.key}`)
        .then((res) => (res.ok ? res.json() : []))
        .then((entries) => {
          setTreeData((origin) =>
            updateTreeData(
              origin,
              node.key,
              entries.map((e) => ({
                title: e.title,
                key: e.id,
                isLeaf: true,
                type: 'entry',
                subgroupId: node.key,
                groupId: node.groupId,
              }))
            )
          );
        })
        .catch((err) => console.error('Failed to load entries', err));
    }

    return Promise.resolve();
  };

  const onDrop = (info) => {
    console.log('Dropped node', info);
  };

  const reloadSubgroups = (groupId) => {
    fetch(`/api/subgroups?groupId=${groupId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((subgroups) => {
        setTreeData((origin) =>
          updateTreeData(
            origin,
            groupId,
            subgroups.map((sg) => ({ title: sg.name, key: sg.id, type: 'subgroup', groupId }))
          )
        );
      })
      .catch((err) => console.error('Failed to reload subgroups', err));
  };

  const reloadEntries = (subgroupId, groupId) => {
    fetch(`/api/entries?subgroupId=${subgroupId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((entries) => {
        setTreeData((origin) =>
          updateTreeData(
            origin,
            subgroupId,
            entries.map((e) => ({
              title: e.title,
              key: e.id,
              isLeaf: true,
              type: 'entry',
              subgroupId,
              groupId,
            }))
          )
        );
      })
      .catch((err) => console.error('Failed to reload entries', err));
  };

  const handleCancel = () => {
    setEditorState({ isOpen: false, type: null, parent: null, item: null, mode: 'create' });
    setDrawerPinned(false);
    setDrawerOpen(false);
    setIsEditingTitle(false);
    setTitle('');
    setTitleInput('');
    setContent('');
    setLastSaved(null);
  };

  const handleSave = async (data) => {
    try {
      if (editorState.type === 'group') {
        if (editorState.mode === 'edit') {
          await fetch(`/api/groups/${editorState.item.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: data.name, description: data.description }),
          });
        } else {
          await fetch('/api/groups', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: data.name, description: data.description, notebookId }),
          });
        }
        fetchGroups();
      } else if (editorState.type === 'subgroup') {
        if (editorState.mode === 'edit') {
          await fetch(`/api/subgroups/${editorState.item.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: data.name, description: data.description }),
          });
        } else {
          await fetch('/api/subgroups', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: data.name, description: data.description, groupId: editorState.parent.groupId }),
          });
        }
        reloadSubgroups(editorState.parent.groupId);
      } else if (editorState.type === 'entry') {
        const subgroupId = data.subgroupId || editorState.parent.subgroupId;
        if (editorState.mode === 'edit') {
          await fetch(`/api/entries/${editorState.item.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: data.title, content: data.content, subgroupId }),
          });
        } else {
          await fetch('/api/entries', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: data.title, content: data.content, subgroupId }),
          });
        }
        reloadEntries(subgroupId, editorState.parent.groupId);
        if (editorState.mode === 'edit' && subgroupId !== editorState.parent.subgroupId) {
          reloadEntries(editorState.parent.subgroupId, editorState.parent.groupId);
        }
      }
    } catch (err) {
      console.error('Save failed', err);
    }
    handleCancel();
  };

  const handleDelete = async () => {
    try {
      if (editorState.type === 'group') {
        await fetch(`/api/groups/${editorState.item.id}`, { method: 'DELETE' });
        fetchGroups();
      } else if (editorState.type === 'subgroup') {
        await fetch(`/api/subgroups/${editorState.item.id}`, { method: 'DELETE' });
        reloadSubgroups(editorState.parent.groupId);
      } else if (editorState.type === 'entry') {
        await fetch(`/api/entries/${editorState.item.id}`, { method: 'DELETE' });
        reloadEntries(editorState.parent.subgroupId, editorState.parent.groupId);
      }
    } catch (err) {
      console.error('Delete failed', err);
    }
    handleCancel();
  };

  const handleArchive = async () => {
    if (editorState.type !== 'entry') return;
    try {
      await fetch(`/api/entries/${editorState.item.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: !editorState.item.archived }),
      });
      reloadEntries(editorState.parent.subgroupId, editorState.parent.groupId);
    } catch (err) {
      console.error('Archive failed', err);
    }
    handleCancel();
  };

  const handleHamburgerClick = () => {
    setDrawerPinned((prev) => {
      const next = !prev;
      setDrawerOpen(next);
      return next;
    });
  };

  const handleDrawerMouseEnter = () => {
    if (drawerCloseTimeoutRef.current) {
      clearTimeout(drawerCloseTimeoutRef.current);
    }
    setDrawerOpen(true);
  };

  const handleDrawerMouseLeave = () => {
    if (drawerCloseTimeoutRef.current) {
      clearTimeout(drawerCloseTimeoutRef.current);
    }
    drawerCloseTimeoutRef.current = setTimeout(() => {
      if (!drawerPinned) {
        setDrawerOpen(false);
      }
    }, 200);
  };

  const handleMaxWidthChange = (value) => {
    const val = value || 50;
    setMaxWidth(val);
  };

  const handleNotebookSave = async () => {
    await handleSave({ title, content, subgroupId: editorState.parent?.subgroupId });
  };

  const handleNotebookSaveAndClose = async () => {
    await handleSave({ title, content, subgroupId: editorState.parent?.subgroupId });
  };

  const handleNodeDoubleClick = async (event, node) => {
    if (node.type === 'group') {
      const res = await fetch(`/api/groups/${node.key}`);
      const item = res.ok ? await res.json() : { id: node.key, name: node.title };
      setEditorState({ isOpen: true, type: 'group', parent: { notebookId }, item, mode: 'edit' });
    } else if (node.type === 'subgroup') {
      const res = await fetch(`/api/subgroups/${node.key}`);
      const item = res.ok ? await res.json() : { id: node.key, name: node.title };
      setEditorState({ isOpen: true, type: 'subgroup', parent: { groupId: node.groupId }, item, mode: 'edit' });
    } else if (node.type === 'entry') {
      const res = await fetch(`/api/entries/${node.key}`);
      const item = res.ok ? await res.json() : { id: node.key, title: node.title, content: '' };
      setTitle(item.title || '');
      setContent(item.content || '');
      setIsEditingTitle(false);
      setTitleInput('');
      setLastSaved(null);
      setEditorState({ isOpen: true, type: 'entry', parent: { subgroupId: node.subgroupId, groupId: node.groupId }, item, mode: 'edit' });
    }
  };

  const editorGroups = treeData.map((g) => ({
    id: g.key,
    name: g.title,
    subgroups: (g.children || []).map((s) => ({ id: s.key, name: s.title })),
  }));


  // Tree props to pass to wrapper component
  const treeProps = {
    showLine: true,
    draggable: true,
    loadData,
    treeData,
    onDrop,
    onDoubleClick: handleNodeDoubleClick,
    ...treePropOverrides,
  };

  // Editor props for NotebookEditor
  const editorProps = {
    title,
    setTitle,
    isEditingTitle,
    setIsEditingTitle,
    titleInput,
    setTitleInput,
    content,
    setContent,
    lastSaved,
    setLastSaved,
    onSaveEntry: handleNotebookSave,
    onSaveAndClose: handleNotebookSaveAndClose,
    onCancel: handleCancel,
    maxWidth,
    ...editorPropOverrides,
  };

  const drawerProps = {
    open: drawerOpen,
    width: drawerWidth,
    onHamburgerClick: handleHamburgerClick,
    onMouseEnter: handleDrawerMouseEnter,
    onMouseLeave: handleDrawerMouseLeave,
    maxWidth,
    onMaxWidthChange: handleMaxWidthChange,
    ...drawerPropOverrides,
  };

  return (
    <div className={classNames(styles.root, { [styles.hideTree]: hideTree }, className)} style={style}>
      {/* Top Menu */}
      <div className={styles.menuBar}>
        <div className={styles.menuInner}>
          <NotebookMenu
            onSelect={setNotebookId}
            showEdits={false}
            onToggleEdits={() => { }}
            showArchived={false}
            onToggleArchived={() => { }}
            {...menuProps}
          />
        </div>
      </div>

      {/* Main Content: Tree | Editor */}
      <div className={styles.content}>
        <aside className={styles.treePane}>
          <NotebookTree {...treeProps} />
        </aside>

        <section className={styles.editorPane}></section>
      </div>

      <FullScreenCanvas
        open={editorState.isOpen && editorState.type === 'entry'}
        onClose={handleCancel}
      >
        <NotebookEditor {...editorProps} />
        <Drawer {...drawerProps} />
      </FullScreenCanvas>

      {editorState.isOpen && editorState.type !== 'entry' && (
        <EntryEditor
          type={editorState.type}
          parent={editorState.parent}
          onSave={handleSave}
          onCancel={handleCancel}
          onDelete={editorState.mode === 'edit' ? handleDelete : null}
          onArchive={editorState.mode === 'edit' ? handleArchive : null}
          initialData={editorState.item}
          mode={editorState.mode}
          groups={editorGroups}
        />
      )}

      {children}
    </div>
  );
}