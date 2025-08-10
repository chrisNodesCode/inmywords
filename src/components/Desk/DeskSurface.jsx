

import React, { useEffect, useState, useRef } from 'react';
import classNames from 'classnames';
import styles from './Desk.module.css';

// Core children, centralized
import NotebookTree from '@/components/Tree/NotebookTree';
import NotebookMenu from '@/components/Menu/Menu';
import NotebookEditor from '@/components/Editor/NotebookEditor';
import FullScreenCanvas from '@/components/Editor/FullScreenCanvas';
import EditorDrawer from '@/components/Drawer/EditorDrawer';

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
  const [showEdits, setShowEdits] = useState(false);
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
  const [pomodoroEnabled, setPomodoroEnabled] = useState(false);
  const [showShortcutList, setShowShortcutList] = useState(false);

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
    const hasRealChildren =
      Array.isArray(node.children) && node.children.some((child) => child.kind !== 'add');
    if (hasRealChildren) return Promise.resolve();

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
      const subgroupId = data.subgroupId || editorState.parent?.subgroupId;
      if (editorState.mode === 'edit') {
        await fetch(`/api/entries/${editorState.item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: data.title, content: data.content, subgroupId }),
        });
      } else {
        await fetch('/api/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: data.title, content: data.content, subgroupId }),
        });
      }
      reloadEntries(subgroupId, editorState.parent.groupId);
      if (editorState.mode === 'edit' && subgroupId !== editorState.parent.subgroupId) {
        reloadEntries(editorState.parent.subgroupId, editorState.parent.groupId);
      }
    } catch (err) {
      console.error('Save failed', err);
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

  const handlePomodoroToggle = (checked) => {
    setPomodoroEnabled(checked);
    const eventName = checked ? 'pomodoro-start' : 'pomodoro-stop';
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(eventName));
    }
  };

  const handleToggleShortcutList = () => {
    setShowShortcutList((prev) => !prev);
  };

  const handleChangeSubgroup = (subgroupId) => {
    setEditorState((prev) => ({
      ...prev,
      parent: { ...prev.parent, subgroupId },
    }));
  };

  const handleDelete = async () => {
    if (!editorState.item?.id) return;
    try {
      await fetch(`/api/entries/${editorState.item.id}`, { method: 'DELETE' });
      reloadEntries(editorState.parent.subgroupId, editorState.parent.groupId);
    } catch (err) {
      console.error('Delete failed', err);
    }
    handleCancel();
  };

  const handleArchive = async () => {
    if (!editorState.item?.id) return;
    try {
      await fetch(`/api/entries/${editorState.item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: !editorState.item.archived }),
      });
      reloadEntries(editorState.parent.subgroupId, editorState.parent.groupId);
    } catch (err) {
      console.error('Archive failed', err);
    }
    handleCancel();
  };

  const handleNotebookSave = async () => {
    await handleSave({ title, content, subgroupId: editorState.parent?.subgroupId });
  };

  const handleNotebookSaveAndClose = async () => {
    await handleSave({ title, content, subgroupId: editorState.parent?.subgroupId });
  };

  const handleNodeDoubleClick = async (event, node) => {
    if (node.type !== 'entry') return;
    const res = await fetch(`/api/entries/${node.key}`);
    const item = res.ok ? await res.json() : { id: node.key, title: node.title, content: '' };
    setTitle(item.title || '');
    setContent(item.content || '');
    setIsEditingTitle(false);
    setTitleInput('');
    setLastSaved(null);
    setEditorState({
      isOpen: true,
      type: 'entry',
      parent: { subgroupId: node.subgroupId, groupId: node.groupId },
      item,
      mode: 'edit',
    });
  };


  // Tree props to pass to wrapper component
  const treeProps = {
    showLine: true,
    draggable: true,
    loadData,
    treeData,
    onDrop,
    onDoubleClick: handleNodeDoubleClick,
    manageMode: showEdits,
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

  const groups = treeData
    .filter((g) => g.type === 'group')
    .map((g) => ({
      id: g.key,
      name: g.title,
      subgroups: (g.children || [])
        .filter((sg) => sg.type === 'subgroup')
        .map((sg) => ({ id: sg.key, name: sg.title })),
    }));

  const entryShortcuts = [
    { action: 'Save', keys: 'Ctrl+S' },
    { action: 'Save & Close', keys: 'Ctrl+Shift+S' },
    { action: 'Focus Editor', keys: 'Ctrl+Enter' },
    { action: 'Cancel', keys: 'Esc' },
  ];

  const drawerProps = {
    drawerOpen,
    drawerWidth,
    onHamburgerClick: handleHamburgerClick,
    onMouseEnter: handleDrawerMouseEnter,
    onMouseLeave: handleDrawerMouseLeave,
    pomodoroEnabled,
    onPomodoroToggle: handlePomodoroToggle,
    maxWidth,
    onMaxWidthChange: handleMaxWidthChange,
    type: editorState.type,
    mode: editorState.mode,
    aliases: { entry: 'Entry' },
    groups,
    selectedSubgroupId: editorState.parent?.subgroupId,
    onChangeSubgroup: handleChangeSubgroup,
    onSave: handleNotebookSave,
    onDelete: handleDelete,
    onArchive: handleArchive,
    onCancel: handleCancel,
    showShortcutList,
    onToggleShortcutList: handleToggleShortcutList,
    entryShortcuts,
    ...drawerPropOverrides,
  };

  return (
    <div className={classNames(styles.root, { [styles.hideTree]: hideTree }, className)} style={style}>
      {/* Top Menu */}
      <div className={styles.menuBar}>
        <div className={styles.menuInner}>
          <NotebookMenu
            onSelect={setNotebookId}
            showEdits={showEdits}
            onToggleEdits={() => setShowEdits((prev) => !prev)}
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
        <EditorDrawer {...drawerProps} />
      </FullScreenCanvas>

      {children}
    </div>
  );
}