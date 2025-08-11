import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Tree, Button, Input, Affix, Tag, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import Drawer from '@/components/Drawer/Drawer';
import styles from './Tree.module.css';

const getPlainTextSnippet = (html, length = 200) => {
  if (!html) return null;
  const text = html.replace(/<[^>]+>/g, '').trim();
  if (!text) return null;
  return text.length > length ? `${text.slice(0, length)}...` : text;
};

/**
 * NotebookTree (Option B: Affixed context bar)
 * Adds a thin Affix bar that displays the current path (Group → Subgroup → Entry).
 * All existing behaviors are preserved (add nodes, DnD, manage drawer, preview).
 */
export default function NotebookTree({
  className = '',
  pillSelected = false,
  dashedOpen = false,
  style,
  treeData: rawTreeData = [],
  onAddGroup,
  onAddSubgroup,
  onAddEntry,
  onSelectItem,
  manageMode = false,
  showDrawer = true,
  notebookId,
  previewEntry,
  // Optional: offset for top app header (px). Defaults to 0.
  affixOffsetTop = 0,
  // Optional: hide entry in context bar (show only Group/Subgroup)
  showEntryInContext = true,
  ...treeProps
}) {
  const wrapperClasses = [
    styles.root,
    pillSelected ? styles.pillSelected : '',
    dashedOpen ? styles.dashedOpen : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerPinned, setDrawerPinned] = useState(false);
  const drawerCloseTimeoutRef = useRef(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [notebookTitle, setNotebookTitle] = useState('');

  useEffect(() => {
    if (manageMode) {
      setDrawerOpen(true);
      if (notebookId) {
        setSelectedItem({ type: 'notebook', id: notebookId });
      }
    } else {
      setDrawerOpen(false);
      setSelectedItem(null);
    }
  }, [manageMode, notebookId]);

  useEffect(() => {
    if (!notebookId) {
      setNotebookTitle('');
      return;
    }
    fetch(`/api/notebooks/${notebookId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((nb) => {
        if (nb) {
          setNotebookTitle(nb.title || '');
          if (manageMode) {
            setFormValues({
              title: nb.title || '',
              description: nb.description || '',
              groupAlias: nb.user_notebook_tree?.[0] || '',
              subgroupAlias: nb.user_notebook_tree?.[1] || '',
              entryAlias: nb.user_notebook_tree?.[2] || '',
            });
          }
        }
      })
      .catch((err) => console.error('Failed to load notebook', err));
  }, [notebookId, manageMode]);

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
      if (!drawerPinned && !manageMode) {
        setDrawerOpen(false);
      }
    }, 200);
  };

  const handleInputChange = (field, value) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const endpointMap = {
    notebook: '/api/notebooks',
    group: '/api/groups',
    subgroup: '/api/subgroups',
    entry: '/api/entries',
  };

  const handleSave = async () => {
    if (!selectedItem) return;
    const { type, id } = selectedItem;
    try {
      let body = formValues;
      if (type === 'notebook') {
        body = {
          title: formValues.title,
          description: formValues.description,
          user_notebook_tree: [
            formValues.groupAlias,
            formValues.subgroupAlias,
            formValues.entryAlias,
          ],
        };
      }
      await fetch(`${endpointMap[type]}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (err) {
      console.error('Save failed', err);
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    const { type, id } = selectedItem;
    try {
      await fetch(`${endpointMap[type]}/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  const handleCancel = () => {
    setSelectedItem(null);
    setDrawerOpen(false);
  };

  const [treeDataState, setTreeDataState] = useState(rawTreeData);
  useEffect(() => {
    setTreeDataState(rawTreeData);
  }, [rawTreeData]);

  const {
    onDrop: onDropProp,
    onDragStart: onDragStartProp,
    onDragOver: onDragOverProp,
    onDragEnd: onDragEndProp,
    onSelect: onSelectProp,
    onExpand: onExpandProp,
    style: treeStyle = {},
    ...restTreeProps
  } = treeProps;

  const treeWidthStyle = {
    maxWidth: treeStyle.maxWidth,
    width: treeStyle.width,
  };

  // Inject synthetic "add" buttons at each level (unchanged)
  const treeData = useMemo(() => {
    const addNode = (key, title, extra = {}) => ({
      key,
      title,
      isLeaf: true,
      selectable: false,
      disableCheckbox: true,
      disabled: false,
      kind: 'add',
      ...extra,
    });

    const entryNodes = (g, s) => {
      if (s.children === undefined) return undefined;
      return [
        ...(s.children || []).map((e) => ({ ...e })),
        addNode(`add-entry:${g.key}:${s.key}`, 'Add entry', {
          parentId: s.key,
          addType: 'entry',
          groupId: g.key,
        }),
      ];
    };

    const subgroupNodes = (g) => {
      if (g.children === undefined) return undefined;
      return [
        ...(g.children || []).map((s) => ({
          ...s,
          children: entryNodes(g, s),
        })),
        addNode(`add-subgroup:${g.key}`, 'Add subgroup', {
          parentId: g.key,
          addType: 'subgroup',
        }),
      ];
    };

    const groupNodes = [
      ...(treeDataState || []).map((g) => ({
        ...g,
        children: subgroupNodes(g),
      })),
      addNode('add-group', 'Add group', { addType: 'group' }),
    ];

    return groupNodes;
  }, [treeDataState]);

  // --- Context bar state (Affix) -----------------------------------------
  // Build an index of real nodes (skip synthetic 'add') → { key, title, type, parentKey }
  const nodeIndex = useMemo(() => {
    const map = new Map();
    const walk = (nodes, parentKey = null) => {
      (nodes || []).forEach((n) => {
        if (n.kind !== 'add') {
          map.set(n.key, {
            key: n.key,
            title: n.title,
            type: n.type,
            parentKey,
          });
        }
        if (n.children) walk(n.children, n.key);
      });
    };
    walk(treeData);
    return map;
  }, [treeData]);

  const getPathTitles = (key) => {
    const titles = [];
    let cur = key;
    while (cur != null && nodeIndex.has(cur)) {
      const info = nodeIndex.get(cur);
      titles.push({ title: info.title, type: info.type, key: info.key });
      cur = info.parentKey;
    }
    titles.reverse();
    return titles;
  };

  const [contextPath, setContextPath] = useState([]);

  // Keep context if previewEntry is injected externally
  useEffect(() => {
    if (previewEntry?.id && nodeIndex.has(previewEntry.id)) {
      const path = getPathTitles(previewEntry.id);
      setContextPath(showEntryInContext ? path : path.filter(p => p.type !== 'entry'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewEntry?.id, nodeIndex, showEntryInContext]);

  // --- Drag & drop (unchanged) -------------------------------------------
  const dragOriginRef = useRef(null);
  const dropHandledRef = useRef(false);

  const restoreOriginal = () => {
    const origin = dragOriginRef.current;
    if (!origin) return;
    const { groupIndex, subgroupIndex, entries } = origin;
    const group = treeDataState[groupIndex];
    if (!group) return;
    const subgroup = group.children?.[subgroupIndex];
    if (!subgroup) return;
    const updatedSubgroup = { ...subgroup, children: entries };
    const updatedGroup = {
      ...group,
      children: [
        ...group.children.slice(0, subgroupIndex),
        updatedSubgroup,
        ...group.children.slice(subgroupIndex + 1),
      ],
    };
    const newTree = [
      ...treeDataState.slice(0, groupIndex),
      updatedGroup,
      ...treeDataState.slice(groupIndex + 1),
    ];
    setTreeDataState(newTree);
  };

  const handleDragStart = (info) => {
    const node = info.node;
    if (node.type !== 'entry') {
      onDragStartProp && onDragStartProp(info);
      return;
    }
    const groupIndex = treeDataState.findIndex((g) => g.key === node.groupId);
    if (groupIndex === -1) {
      onDragStartProp && onDragStartProp(info);
      return;
    }
    const group = treeDataState[groupIndex];
    const subgroupIndex = group.children?.findIndex((s) => s.key === node.subgroupId);
    if (subgroupIndex === -1) {
      onDragStartProp && onDragStartProp(info);
      return;
    }
    const subgroup = group.children[subgroupIndex];
    dragOriginRef.current = {
      groupIndex,
      subgroupIndex,
      entries: [...(subgroup.children || [])],
    };
    dropHandledRef.current = false;
    onDragStartProp && onDragStartProp(info);
  };

  const handleDragOver = (info) => {
    const dragNode = info.dragNode;
    const dropNode = info.node;
    if (dragNode.key === dropNode.key) {
      onDragOverProp && onDragOverProp(info);
      return;
    }
    if (dragNode.type !== 'entry' || dropNode.type !== 'entry') {
      onDragOverProp && onDragOverProp(info);
      return;
    }
    if (dragNode.subgroupId !== dropNode.subgroupId) {
      onDragOverProp && onDragOverProp(info);
      return;
    }

    const groupIndex = treeDataState.findIndex((g) => g.key === dragNode.groupId);
    const group = treeDataState[groupIndex];
    const subgroupIndex = group.children?.findIndex((s) => s.key === dragNode.subgroupId);
    const subgroup = group.children[subgroupIndex];
    const entries = [...(subgroup.children || [])];

    const dragIndex = entries.findIndex((e) => e.key === dragNode.key);
    const dropIndex = entries.findIndex((e) => e.key === dropNode.key);
    let insertIndex = dropIndex;
    const relativePos = info.dropPosition - Number(info.node.pos.split('-').pop());
    if (relativePos === 1) insertIndex = dropIndex + 1;
    if (insertIndex === dragIndex || insertIndex === dragIndex + 1) {
      onDragOverProp && onDragOverProp(info);
      return;
    }

    const newEntries = [...entries];
    const [moved] = newEntries.splice(dragIndex, 1);
    if (dragIndex < insertIndex) insertIndex--;
    newEntries.splice(insertIndex, 0, moved);

    const updatedSubgroup = { ...subgroup, children: newEntries };
    const updatedGroup = {
      ...group,
      children: [
        ...group.children.slice(0, subgroupIndex),
        updatedSubgroup,
        ...group.children.slice(subgroupIndex + 1),
      ],
    };
    const newTree = [
      ...treeDataState.slice(0, groupIndex),
      updatedGroup,
      ...treeDataState.slice(groupIndex + 1),
    ];
    setTreeDataState(newTree);
    onDragOverProp && onDragOverProp(info);
  };

  const handleDrop = async (info) => {
    const dragNode = info.dragNode;
    const dropNode = info.node;
    // --- Group reorder ---------------------------------------------------
    if (dragNode.type === 'group' && dropNode.type === 'group') {
      try {
        const dragIndex = treeDataState.findIndex((g) => g.key === dragNode.key);
        const dropIndex = treeDataState.findIndex((g) => g.key === dropNode.key);
        if (dragIndex !== -1 && dropIndex !== -1) {
          let insertIndex = dropIndex;
          const relativePos = info.dropPosition - Number(info.node.pos.split('-').pop());
          if (relativePos === 1) insertIndex = dropIndex + 1;
          const newGroups = [...treeDataState];
          const [moved] = newGroups.splice(dragIndex, 1);
          if (dragIndex < insertIndex) insertIndex--;
          newGroups.splice(insertIndex, 0, moved);
          setTreeDataState(newGroups);
          const orders = newGroups.map((g, idx) => ({ id: g.key, user_sort: idx }));
          await fetch('/api/groups/reorder', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orders }),
          });
        }
      } catch (err) {
        console.error('Failed to reorder groups', err);
      }

      dragOriginRef.current = null;
      dropHandledRef.current = true;
      onDropProp && onDropProp(info);
      return;
    }

    // --- Subgroup reorder ------------------------------------------------
    if (
      dragNode.type === 'subgroup' &&
      dropNode.type === 'subgroup' &&
      dragNode.groupId === dropNode.groupId
    ) {
      try {
        const groupIndex = treeDataState.findIndex((g) => g.key === dragNode.groupId);
        if (groupIndex !== -1) {
          const group = treeDataState[groupIndex];
          const subgroups = [...(group.children || [])];
          const dragIndex = subgroups.findIndex((s) => s.key === dragNode.key);
          const dropIndex = subgroups.findIndex((s) => s.key === dropNode.key);
          if (dragIndex !== -1 && dropIndex !== -1) {
            let insertIndex = dropIndex;
            const relativePos = info.dropPosition - Number(info.node.pos.split('-').pop());
            if (relativePos === 1) insertIndex = dropIndex + 1;
            const [moved] = subgroups.splice(dragIndex, 1);
            if (dragIndex < insertIndex) insertIndex--;
            subgroups.splice(insertIndex, 0, moved);
            const updatedGroup = { ...group, children: subgroups };
            const newTree = [...treeDataState];
            newTree[groupIndex] = updatedGroup;
            setTreeDataState(newTree);
            const orders = subgroups.map((s, idx) => ({ id: s.key, user_sort: idx }));
            await fetch('/api/subgroups/reorder', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orders }),
            });
          }
        }
      } catch (err) {
        console.error('Failed to reorder subgroups', err);
      }

      dragOriginRef.current = null;
      dropHandledRef.current = true;
      onDropProp && onDropProp(info);
      return;
    }

    // --- Entry reorder ---------------------------------------------------
    if (
      dragNode.type === 'entry' &&
      dropNode.type === 'entry' &&
      dragNode.subgroupId === dropNode.subgroupId
    ) {
      try {
        const groupIndex = treeDataState.findIndex((g) => g.key === dragNode.groupId);
        const subgroupIndex = treeDataState[groupIndex].children?.findIndex(
          (s) => s.key === dragNode.subgroupId
        );
        const entries =
          treeDataState[groupIndex].children?.[subgroupIndex]?.children || [];
        const orders = entries.map((e, idx) => ({ id: e.key, user_sort: idx }));
        await fetch('/api/entries/reorder', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orders }),
        });
      } catch (err) {
        console.error('Failed to reorder entries', err);
      }

      dragOriginRef.current = null;
      dropHandledRef.current = true;
      onDropProp && onDropProp(info);
      return;
    }

    // Unknown or unsupported drop → revert
    restoreOriginal();
    dragOriginRef.current = null;
    dropHandledRef.current = true;
    onDropProp && onDropProp(info);
  };

  const handleDragEnd = (info) => {
    if (!dropHandledRef.current && dragOriginRef.current) {
      restoreOriginal();
    }
    dragOriginRef.current = null;
    dropHandledRef.current = false;
    onDragEndProp && onDragEndProp(info);
  };

  // --- Selection / Expansion with context updates ------------------------
  const updateContextForKey = (key) => {
    if (!key || !nodeIndex.has(key)) return;
    const path = getPathTitles(key);
    setContextPath(showEntryInContext ? path : path.filter(p => p.type !== 'entry'));
  };

  const handleSelect = (keys, info) => {
    const node = info.node;
    if (node.kind === 'add') return;
    if (manageMode && node.type === 'entry') {
      // Still update context so users see where they are, but do not open editor
      updateContextForKey(node.key);
      return;
    }

    // Preserve existing callbacks
    onSelectProp && onSelectProp(keys, info);
    if (onSelectItem) {
      onSelectItem({ kind: node.type, id: node.key });
    }
    updateContextForKey(node.key);

    if (manageMode) {
      setSelectedItem({ type: node.type, id: node.key });
      setFormValues({ title: node.title });
      setDrawerOpen(true);
    }
  };

  const handleExpand = (expandedKeys, info) => {
    onExpandProp && onExpandProp(expandedKeys, info);
    if (info.expanded && info.node?.key) {
      // When a parent opens, reflect it in the context
      updateContextForKey(info.node.key);
    }
  };

  // Render
  return (
    <div className={wrapperClasses} style={style}>
      {/* Affixed context bar */}
      <Affix offsetTop={affixOffsetTop}>
        <div
          style={{
            padding: 8,
            background: 'var(--ant-color-bg-container, #fff)',
            borderBottom: '1px solid var(--ant-color-border-secondary, #f0f0f0)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            zIndex: 1,
          }}
        >
          <Space size={6} wrap>
            {contextPath.length === 0 ? (
              <Tag style={{ opacity: 0.7 }}>No selection</Tag>
            ) : (
              contextPath.map((p, i) => (
                <Tag key={p.key || i}>{p.title}</Tag>
              ))
            )}
          </Space>
        </div>
      </Affix>

      {/* Tree */}
      <div style={{ marginTop: 8, ...treeWidthStyle }}>
        {notebookTitle && (
          <h2 style={{ margin: '0 0 8px 0' }}>{notebookTitle}</h2>
        )}
        <Tree
          {...restTreeProps}
          style={treeStyle}
          blockNode
          expandAction="click"
          treeData={treeData}
          onExpand={handleExpand}
          onSelect={handleSelect}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          titleRender={(node) => {
            if (node.kind === 'add') {
              const handleClick = (e) => {
                e.stopPropagation();
                if (manageMode) return;
                if (node.addType === 'group') {
                  return onAddGroup && onAddGroup();
                }
                if (node.addType === 'subgroup' && node.parentId) {
                  return onAddSubgroup && onAddSubgroup(node.parentId);
                }
                if (node.addType === 'entry' && node.parentId) {
                  const parts = String(node.key).split(':');
                  const groupId = parts[1];
                  const subgroupId = parts[2];
                  return onAddEntry && onAddEntry(groupId, subgroupId);
                }
              };

              return (
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  block
                  onClick={handleClick}
                  disabled={manageMode}
                  onMouseDown={(e) => e.stopPropagation()}
                  size="small"
                  style={{ justifyContent: 'flex-start' }}
                >
                  {node.title}
                </Button>
              );
            }

            const typeClass =
              node.type === 'group'
                ? styles.groupTitle
                : node.type === 'subgroup'
                  ? styles.subgroupTitle
                  : node.type === 'entry'
                    ? styles.entryTitle
                    : '';

            const isPreview = previewEntry && previewEntry.id === node.key;
            const snippet =
              isPreview ? getPlainTextSnippet(previewEntry.content, 200) : null;

            return (
              <span className={styles.nodeContainer}>
                <span className={typeClass}>{node.title}</span>
                {snippet && <span className={styles.entrySnippet}>{snippet}</span>}
              </span>
            );
          }}
        />
      </div>

      {showDrawer && (
        <Drawer
          open={drawerOpen}
          width={300}
          onHamburgerClick={handleHamburgerClick}
          onMouseEnter={handleDrawerMouseEnter}
          onMouseLeave={handleDrawerMouseLeave}
          header={
            <h3 style={{ marginTop: 0 }}>
              {selectedItem ? `Edit ${selectedItem.type}` : 'Manage'}
            </h3>
          }
          body={
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {(() => {
                if (!selectedItem) return null;
                switch (selectedItem.type) {
                  case 'notebook':
                    return (
                      <>
                        <Input
                          placeholder="Title"
                          value={formValues.title}
                          onChange={(e) => handleInputChange('title', e.target.value)}
                          style={{ marginBottom: '0.5rem' }}
                        />
                        <Input.TextArea
                          placeholder="Description"
                          value={formValues.description}
                          onChange={(e) => handleInputChange('description', e.target.value)}
                          style={{ marginBottom: '0.5rem' }}
                        />
                        <Input
                          placeholder="Group Alias"
                          value={formValues.groupAlias}
                          onChange={(e) => handleInputChange('groupAlias', e.target.value)}
                          style={{ marginBottom: '0.5rem' }}
                        />
                        <Input
                          placeholder="Subgroup Alias"
                          value={formValues.subgroupAlias}
                          onChange={(e) => handleInputChange('subgroupAlias', e.target.value)}
                          style={{ marginBottom: '0.5rem' }}
                        />
                        <Input
                          placeholder="Entry Alias"
                          value={formValues.entryAlias}
                          onChange={(e) => handleInputChange('entryAlias', e.target.value)}
                        />
                      </>
                    );
                  case 'entry':
                    return (
                      <>
                        <Input
                          placeholder="Title"
                          value={formValues.title}
                          onChange={(e) => handleInputChange('title', e.target.value)}
                          style={{ marginBottom: '0.5rem' }}
                        />
                        <Input.TextArea
                          placeholder="Content"
                          value={formValues.content}
                          onChange={(e) => handleInputChange('content', e.target.value)}
                          style={{ marginBottom: '0.5rem' }}
                          rows={4}
                        />
                        <Input
                          placeholder="Tags"
                          value={formValues.tags}
                          onChange={(e) => handleInputChange('tags', e.target.value)}
                        />
                      </>
                    );
                  default:
                    return (
                      <Input
                        placeholder="Title"
                        value={formValues.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                      />
                    );
                }
              })()}
              <Button type="primary" onClick={handleSave}>
                Save
              </Button>
              {selectedItem && (
                <Button danger onClick={handleDelete}>
                  Delete
                </Button>
              )}
              <Button onClick={handleCancel}>Cancel</Button>
            </div>
          }
        />
      )}
    </div>
  );
}
