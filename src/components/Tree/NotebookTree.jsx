import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Tree, Button, Input } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import Drawer from '@/components/Drawer/Drawer';
import styles from './Tree.module.css';

/**
 * NotebookTree
 * Centralized styled Tree wrapper.
 * Props pass through to antd <Tree />. Style variants are toggled via props.
 *
 * Synthetic "add" nodes are injected at each level and rendered as dashed
 * buttons. Clicking a button triggers the corresponding add handler.
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

  useEffect(() => {
    if (manageMode) {
      setDrawerOpen(true);
      if (notebookId) {
        setSelectedItem({ type: 'notebook', id: notebookId });
        fetch(`/api/notebooks/${notebookId}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((nb) => {
            if (nb) {
              setFormValues({
                title: nb.title || '',
                description: nb.description || '',
                groupAlias: nb.user_notebook_tree?.[0] || '',
                subgroupAlias: nb.user_notebook_tree?.[1] || '',
                entryAlias: nb.user_notebook_tree?.[2] || '',
              });
            }
          })
          .catch((err) => console.error('Failed to load notebook', err));
      }
    } else {
      setDrawerOpen(false);
      setSelectedItem(null);
    }
  }, [manageMode, notebookId]);

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

  const renderForm = () => {
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
  };

  const header = (
    <h3 style={{ marginTop: 0 }}>
      {selectedItem ? `Edit ${selectedItem.type}` : 'Manage'}
    </h3>
  );

  const body = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {renderForm()}
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
  );

  const [treeDataState, setTreeDataState] = useState(rawTreeData);

  useEffect(() => {
    setTreeDataState(rawTreeData);
  }, [rawTreeData]);

  const { onDrop: onDropProp, ...restTreeProps } = treeProps;

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
      // If entries haven't been loaded yet, leave children undefined so
      // antd's Tree will call `loadData` when the subgroup is expanded.
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
      // Likewise, don't inject synthetic nodes until real subgroups have
      // been fetched for the group.
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

  const handleDrop = async (info) => {
    const dragNode = info.dragNode;
    const dropNode = info.node;

    if (dragNode.type !== 'entry' || dropNode.type !== 'entry') {
      onDropProp && onDropProp(info);
      return;
    }
    if (dragNode.subgroupId !== dropNode.subgroupId) {
      onDropProp && onDropProp(info);
      return;
    }

    const groupIndex = treeDataState.findIndex((g) => g.key === dragNode.groupId);
    if (groupIndex === -1) return;
    const group = treeDataState[groupIndex];
    const subgroupIndex = group.children?.findIndex((s) => s.key === dragNode.subgroupId);
    if (subgroupIndex === -1) return;
    const subgroup = group.children[subgroupIndex];
    const entries = [...(subgroup.children || [])];

    const dragIndex = entries.findIndex((e) => e.key === dragNode.key);
    if (dragIndex === -1) return;
    const dragged = entries.splice(dragIndex, 1)[0];

    const dropIndex = entries.findIndex((e) => e.key === dropNode.key);
    let insertIndex = dropIndex;
    const relativePos = info.dropPosition - Number(info.node.pos.split('-').pop());
    if (relativePos === 1) insertIndex = dropIndex + 1;
    if (dragIndex < insertIndex) insertIndex--;
    entries.splice(insertIndex, 0, dragged);

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

    try {
      const orders = entries.map((e, idx) => ({ id: e.key, user_sort: idx }));
      await fetch('/api/entries/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders }),
      });
    } catch (err) {
      console.error('Failed to reorder entries', err);
    }

    onDropProp && onDropProp(info);
  };

  return (
    <div className={wrapperClasses} style={style}>
      <Tree
        {...restTreeProps}
        blockNode
        expandAction="click"
        treeData={treeData}
        onDrop={handleDrop}
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
            isPreview && previewEntry.content
              ? previewEntry.content.slice(0, 200) +
                (previewEntry.content.length > 200 ? '...' : '')
              : null;

          return (
            <span className={styles.nodeContainer}>
              <span className={typeClass}>{node.title}</span>
              {snippet && <span className={styles.entrySnippet}>{snippet}</span>}
            </span>
          );
        }}
        onSelect={(keys, info) => {
          const node = info.node;
          if (node.kind === 'add') return;
          if (manageMode && node.type === 'entry') return;
          if (treeProps.onSelect) treeProps.onSelect(keys, info);
          if (onSelectItem) {
            onSelectItem({ kind: node.type, id: node.key });
          }
          if (manageMode) {
            setSelectedItem({ type: node.type, id: node.key });
            setFormValues({ title: node.title });
            setDrawerOpen(true);
          }
        }}
      />
      {showDrawer && (
        <Drawer
          open={drawerOpen}
          width={300}
          onHamburgerClick={handleHamburgerClick}
          onMouseEnter={handleDrawerMouseEnter}
          onMouseLeave={handleDrawerMouseLeave}
          header={header}
          body={body}
        />
      )}
    </div>
  );
}

