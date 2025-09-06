

import React, { useEffect, useState, useRef, useContext } from 'react';
import classNames from 'classnames';
import styles from './Desk.module.css';

// Core children, centralized
import NotebookTree from '@/components/Tree/NotebookTree';
import NotebookEditor from '@/components/Editor/NotebookEditor';
import FullScreenCanvas from '@/components/Editor/FullScreenCanvas';
import Drawer from '@/components/Drawer/Drawer';
import { useDrawer, DrawerContext } from '@/components/Drawer/DrawerManager';
import { Drawer as AntDrawer, Input, Button } from 'antd';
import PomodoroWidget from '@/components/PomodoroWidget';

function updateTreeData(list, key, children) {
  return list.map((node) => {
    if (node.key === key) return { ...node, children };
    if (node.children) return { ...node, children: updateTreeData(node.children, key, children) };
    return node;
  });
}

function getPlainTextSnippet(html, length = 200) {
  if (!html) return null;
  const text = html.replace(/<[^>]+>/g, '').trim();
  if (!text) return null;
  return text.length > length ? `${text.slice(0, length)}...` : text;
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
  const { onAddNotebookDrawerChange: menuDrawerChange, ...menuRest } = menuProps;
  // === Lifted state from NotebookDev.jsx ===
  const [notebookId, setNotebookId] = useState(null);
  const [treeData, setTreeData] = useState([]);
  const [showEdits, setShowEdits] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('showArchived');
      if (stored !== null) {
        setShowArchived(stored === 'true');
      }
    }
  }, []);
  const [reorderMode, setReorderMode] = useState(false);
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
  const [isSaving, setIsSaving] = useState(false);

  // Drawer state
  const drawerWidth = drawerPropOverrides.width || 300;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerPinned, setDrawerPinned] = useState(false);
  const drawerCloseTimeoutRef = useRef(null);
  const drawerPinnedRef = useRef(drawerPinned);
  const [pomodoroEnabled, setPomodoroEnabled] = useState(false);
  const [previewEntry, setPreviewEntry] = useState(null);
  const [addDrawer, setAddDrawer] = useState({
    open: false,
    type: null,
    parentId: null,
    name: '',
    description: '',
  });
  const [notebookAddOpen, setNotebookAddOpen] = useState(false);
  const [manageHoverDisabled, setManageHoverDisabled] = useState(false);
  const manageHoverTimeoutRef = useRef(null);
  const { openDrawer: setActiveDrawer, closeDrawer: clearActiveDrawer } =
    useContext(DrawerContext);
  const {
    open: controllerOpen,
    openDrawer: openControllerDrawer,
    closeDrawer: closeControllerDrawer,
  } = useDrawer('controller');

  const [fullFocus, setFullFocus] = useState(false);

  useEffect(() => {
    drawerPinnedRef.current = drawerPinned;
  }, [drawerPinned]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullFocus(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const throttleManageHover = () => {
    setManageHoverDisabled(true);
    if (manageHoverTimeoutRef.current) {
      clearTimeout(manageHoverTimeoutRef.current);
    }
    manageHoverTimeoutRef.current = setTimeout(() => {
      setManageHoverDisabled(false);
    }, 2000);
  };

  useEffect(
    () => () => {
      if (manageHoverTimeoutRef.current) {
        clearTimeout(manageHoverTimeoutRef.current);
      }
    },
    []
  );

  // Load available notebooks on first render so tree data can load without
  // waiting for the controller drawer to mount and trigger selection.
  useEffect(() => {
    async function fetchInitialNotebook() {
      try {
        const res = await fetch('/api/notebooks');
        if (!res.ok) return;
        const data = await res.json();
        if (data.length) {
          let initial = data[0].id;
          if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('lastNotebookId');
            if (stored && data.some((nb) => nb.id === stored)) {
              initial = stored;
            }
            localStorage.setItem('lastNotebookId', initial);
          }
          setNotebookId(initial);
        }
      } catch (err) {
        console.error('Failed to load notebooks', err);
      }
    }
    fetchInitialNotebook();
  }, []);

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

  const loadData = (node, showArch = showArchived) => {
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
          const filtered = showArch
            ? entries
            : entries.filter((e) => !e.archived);
          setTreeData((origin) =>
            updateTreeData(
              origin,
              node.key,
              filtered.map((e) => ({
                id: e.id,
                title: e.title,
                key: e.id,
                snippet: getPlainTextSnippet(e.content),
                content: e.content,
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

  const reloadEntries = (subgroupId, groupId, showArch = showArchived) => {
    fetch(`/api/entries?subgroupId=${subgroupId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((entries) => {
        const filtered = showArch ? entries : entries.filter((e) => !e.archived);
        setTreeData((origin) =>
          updateTreeData(
            origin,
            subgroupId,
            filtered.map((e) => ({
              id: e.id,
              title: e.title,
              key: e.id,
              snippet: getPlainTextSnippet(e.content),
              content: e.content,
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

  const handleAddGroup = () => {
    if (!notebookId) return;
    setAddDrawer({ open: true, type: 'group', parentId: notebookId, name: '', description: '' });
    setActiveDrawer('add');
  };

  const handleAddSubgroup = (groupId) => {
    setAddDrawer({ open: true, type: 'subgroup', parentId: groupId, name: '', description: '' });
    setActiveDrawer('add');
  };

  const handleAddEntry = (groupId, subgroupId) => {
    setTitle('');
    setContent('');
    setIsEditingTitle(true);
    setTitleInput('');
    setLastSaved(null);
    closeControllerDrawer();
    setDrawerOpen(true);
    setActiveDrawer('editor');
    setEditorState({
      isOpen: true,
      type: 'entry',
      parent: { groupId, subgroupId },
      item: null,
      mode: 'create',
    });
  };

  const handleAddDrawerClose = () => {
    setAddDrawer({ open: false, type: null, parentId: null, name: '', description: '' });
    clearActiveDrawer();
    throttleManageHover();
  };

  const handleAddDrawerCreate = async () => {
    try {
      const { type, parentId, name, description } = addDrawer;
      let url = '';
      const body = { name, description };
      if (type === 'group') {
        url = '/api/groups';
        body.notebookId = notebookId;
      } else if (type === 'subgroup') {
        url = '/api/subgroups';
        body.groupId = parentId;
      }
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        if (type === 'group') {
          fetchGroups();
        } else if (type === 'subgroup') {
          fetch(`/api/subgroups?groupId=${parentId}`)
            .then((r) => (r.ok ? r.json() : []))
            .then((subgroups) => {
              setTreeData((origin) =>
                updateTreeData(
                  origin,
                  parentId,
                  subgroups.map((sg) => ({
                    title: sg.name,
                    key: sg.id,
                    type: 'subgroup',
                    groupId: parentId,
                  }))
                )
              );
            })
            .catch((err) => console.error('Failed to load subgroups', err));
        }
      }
    } catch (err) {
      console.error('Create failed', err);
    }
    handleAddDrawerClose();
  };

  const handleToggleArchived = () => {
    setShowArchived((prev) => {
      const next = !prev;
      treeData.forEach((g) => {
        (g.children || []).forEach((sg) => {
          if (sg.children !== undefined) {
            reloadEntries(sg.key, g.key, next);
          }
        });
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem('showArchived', next.toString());
      }
      return next;
    });
  };

  const handleCancel = (skipRefresh = false) => {
    if (
      !skipRefresh &&
      editorState.type === 'entry' &&
      editorState.parent?.subgroupId &&
      editorState.parent?.groupId
    ) {
      reloadEntries(editorState.parent.subgroupId, editorState.parent.groupId);
    }
    setEditorState({ isOpen: false, type: null, parent: null, item: null, mode: 'create' });
    setDrawerPinned(false);
    setDrawerOpen(false);
    clearActiveDrawer();
    closeControllerDrawer();
    setIsEditingTitle(false);
    setTitle('');
    setTitleInput('');
    setContent('');
    setLastSaved(null);
    throttleManageHover();
  };

  const handleSave = async (data) => {
    setIsSaving(true);
    try {
      const subgroupId = data.subgroupId || editorState.parent?.subgroupId;
      let savedEntry;
      if (editorState.mode === 'edit') {
        const res = await fetch(`/api/entries/${editorState.item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: data.title, content: data.content, subgroupId }),
        });
        if (res.ok) {
          savedEntry = await res.json();
        }
      } else {
        const res = await fetch('/api/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: data.title, content: data.content, subgroupId }),
        });
        if (res.ok) {
          savedEntry = await res.json();
          setEditorState((prev) => ({ ...prev, mode: 'edit', item: savedEntry }));
        }
      }
      reloadEntries(subgroupId, editorState.parent.groupId);
      if (editorState.mode === 'edit' && subgroupId !== editorState.parent.subgroupId) {
        reloadEntries(editorState.parent.subgroupId, editorState.parent.groupId);
      }
      return savedEntry;
    } catch (err) {
      console.error('Save failed', err);
    } finally {
      setIsSaving(false);
    }
  };


  const handleHamburgerClick = () => {
    if (drawerCloseTimeoutRef.current) {
      clearTimeout(drawerCloseTimeoutRef.current);
      drawerCloseTimeoutRef.current = null;
    }
    setDrawerPinned((prev) => {
      const next = !prev;
      setDrawerOpen(next);
      if (next) {
        setActiveDrawer('editor');
      } else {
        clearActiveDrawer();
      }
      return next;
    });
  };

  const handleDrawerMouseEnter = () => {
    if (drawerCloseTimeoutRef.current) {
      clearTimeout(drawerCloseTimeoutRef.current);
      drawerCloseTimeoutRef.current = null;
    }
    setDrawerOpen(true);
    setActiveDrawer('editor');
  };

  const handleDrawerMouseLeave = () => {
    if (drawerCloseTimeoutRef.current) {
      clearTimeout(drawerCloseTimeoutRef.current);
      drawerCloseTimeoutRef.current = null;
    }
    drawerCloseTimeoutRef.current = setTimeout(() => {
      if (!drawerPinnedRef.current) {
        setDrawerOpen(false);
        clearActiveDrawer();
      }
    }, 2000);
  };

  const handleMaxWidthChange = (value) => {
    const val = value || 50;
    setMaxWidth(val);
  };

  const handlePomodoroToggle = (checked) => {
    if (!checked && typeof window !== 'undefined') {
      window.dispatchEvent(new Event('pomodoro-stop'));
    }
    setPomodoroEnabled(checked);
  };

  useEffect(() => {
    if (!pomodoroEnabled || typeof window === 'undefined') return;
    window.dispatchEvent(new Event('pomodoro-start'));
  }, [pomodoroEnabled]);

  const toggleFullFocus = () => {
    if (fullFocus) {
      document.exitFullscreen?.();
    } else {
      document.documentElement.requestFullscreen?.();
    }
    setFullFocus((prev) => !prev);
  };

  const handleControllerHamburgerClick = () => {
    if (showEdits) return;
    if (controllerOpen) {
      closeControllerDrawer();
    } else {
      openControllerDrawer();
    }
  };

  useEffect(() => {
    if (showEdits) {
      openControllerDrawer();
    } else {
      closeControllerDrawer();
    }
    // openControllerDrawer/closeControllerDrawer change identity when the drawer state
    // updates, so we intentionally omit them from the dependency array to avoid
    // immediately closing the controller after opening it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showEdits]);

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
    handleCancel(true);
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
    handleCancel(true);
  };

  const handleNotebookSave = async () => {
    await handleSave({ title, content, subgroupId: editorState.parent?.subgroupId });
    setLastSaved(new Date());
  };


  const handleNotebookSaveAndClose = async () => {
    await handleSave({ title, content, subgroupId: editorState.parent?.subgroupId });
    handleCancel(true);
  };

  // Autosave every 30 seconds while the editor is open.
  useEffect(() => {
    if (!(editorState.isOpen && editorState.type === 'entry')) return;
    let retries = 0;
    const MAX_RETRIES = 3;
    const interval = setInterval(() => {
      const hasTitle = title.trim().length > 0;
      const hasContent = content.trim().length > 0;
      if (hasTitle && hasContent) {
        handleNotebookSave();
        retries = 0;
      } else if (retries >= MAX_RETRIES - 1) {
        clearInterval(interval);
      } else {
        retries += 1;
      }
    }, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorState.isOpen, editorState.type, title, content]);


  const openEntry = (node, item) => {
    setTitle(item.title || '');
    setContent(item.content || '');
    setIsEditingTitle(false);
    setTitleInput('');
    setLastSaved(item?.updatedAt ? new Date(item.updatedAt) : null);
    closeControllerDrawer();
    setDrawerOpen(true);
    setActiveDrawer('editor');
    setEditorState({
      isOpen: true,
      type: 'entry',
      parent: { subgroupId: node.subgroupId, groupId: node.groupId },
      item,
      mode: 'edit',
    });
  };

  const handleEditEntry = async (entry) => {
    const res = await fetch(`/api/entries/${entry.id}`);
    const item = res.ok
      ? await res.json()
      : { id: entry.id, title: entry.title, content: '' };
    openEntry(entry, item);
  };

  const handleNodeSelect = async (keys, info) => {
    const node = info.node;
    if (node.type !== 'entry') return;
    if (previewEntry && previewEntry.id === node.key) {
      openEntry(node, previewEntry);
      setPreviewEntry(null);
      return;
    }
    const res = await fetch(`/api/entries/${node.key}`);
    const item = res.ok ? await res.json() : { id: node.key, title: node.title, content: '' };
    setPreviewEntry({ ...item, groupId: node.groupId, subgroupId: node.subgroupId });
  };


  // Tree props to pass to wrapper component
  const treeProps = {
    showLine: true,
    loadData,
    treeData,
    setTreeData,
    onSelect: handleNodeSelect,
    manageMode: showEdits,
    reorderMode,
    showArchived,
    onAddGroup: showEdits ? undefined : handleAddGroup,
    onAddSubgroup: showEdits ? undefined : handleAddSubgroup,
    onAddEntry: showEdits ? undefined : handleAddEntry,
    onEdit: showEdits ? undefined : handleEditEntry,
    notebookId,
    previewEntry,
    ...treePropOverrides,
    showDrawer:
      !manageHoverDisabled &&
      !(editorState.isOpen && editorState.type === 'entry') &&
      !addDrawer.open &&
      !notebookAddOpen,
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
  const editorDrawerProps = {
    open: drawerOpen,
    width: drawerWidth,
    onHamburgerClick: handleHamburgerClick,
    onMouseEnter: handleDrawerMouseEnter,
    onMouseLeave: handleDrawerMouseLeave,
    pomodoroEnabled,
    onPomodoroToggle: handlePomodoroToggle,
    fullFocus,
    onFullFocusToggle: toggleFullFocus,
    maxWidth,
    onMaxWidthChange: handleMaxWidthChange,
    type: editorState.type,
    mode: editorState.mode,
    aliases: { entry: 'Entry' },
    groups,
    selectedSubgroupId: editorState.parent?.subgroupId,
    onChangeSubgroup: handleChangeSubgroup,
    onSave: handleNotebookSave,
    onSaveAndClose: handleNotebookSaveAndClose,
    onDelete: handleDelete,
    onArchive: handleArchive,
    onCancel: handleCancel,
    saving: isSaving,
    ...drawerPropOverrides,
  };

  const controllerDrawerProps = {
    open: controllerOpen,
    onHamburgerClick: handleControllerHamburgerClick,
    onSelect: setNotebookId,
    showEdits,
    onToggleEdits: () => setShowEdits((prev) => !prev),
    reorderMode,
    onToggleReorder: () => setReorderMode((prev) => !prev),
    fullFocus,
    onFullFocusToggle: toggleFullFocus,
    showArchived,
    onToggleArchived: handleToggleArchived,
    onAddNotebookDrawerChange: (open) => {
      setNotebookAddOpen(open);
      menuDrawerChange?.(open);
      if (open) {
        setActiveDrawer('notebookAdd');
      } else {
        clearActiveDrawer();
        throttleManageHover();
      }
    },
    ...menuRest,
  };

  return (
    <div className={classNames(styles.root, { [styles.hideTree]: hideTree }, className)} style={style}>
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
        drawerProps={{ template: 'editor', ...editorDrawerProps }}
      >
        <NotebookEditor {...editorProps} />
      </FullScreenCanvas>

      <AntDrawer
        title={`New ${addDrawer.type === 'group' ? 'Group' : 'Subgroup'}`}
        open={addDrawer.open}
        onClose={handleAddDrawerClose}
      >
        <Input
          placeholder="Name"
          value={addDrawer.name}
          onChange={(e) =>
            setAddDrawer((prev) => ({ ...prev, name: e.target.value }))
          }
          style={{ marginBottom: '0.5rem' }}
        />
        <Input.TextArea
          placeholder="Description (optional)"
          value={addDrawer.description}
          onChange={(e) =>
            setAddDrawer((prev) => ({ ...prev, description: e.target.value }))
          }
          style={{ marginBottom: '0.5rem' }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <Button onClick={handleAddDrawerClose}>Cancel</Button>
          <Button type="primary" onClick={handleAddDrawerCreate}>
            Create
          </Button>
        </div>
      </AntDrawer>

      {!(editorState.isOpen && editorState.type === 'entry') && (
        <Drawer template="controller" {...controllerDrawerProps} />
      )}

      {pomodoroEnabled && <PomodoroWidget />}

      {children}
    </div>
  );
}
