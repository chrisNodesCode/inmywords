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
    } else {
      setDrawerOpen(false);
      setSelectedItem(null);
    }
  }, [manageMode]);

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
      await fetch(`${endpointMap[type]}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formValues),
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
              placeholder="Aliases"
              value={formValues.aliases}
              onChange={(e) => handleInputChange('aliases', e.target.value)}
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
      ...(rawTreeData || []).map((g) => ({
        ...g,
        children: subgroupNodes(g),
      })),
      addNode('add-group', 'Add group', { addType: 'group' }),
    ];

    return groupNodes;
  }, [rawTreeData]);

  return (
    <div className={wrapperClasses} style={style}>
      <Tree
        {...treeProps}
        blockNode
        treeData={treeData}
        titleRender={(node) => {
          if (node.kind === 'add') {
            const handleClick = (e) => {
              e.stopPropagation();
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
                onMouseDown={(e) => e.stopPropagation()}
                size="small"
                style={{ justifyContent: 'flex-start' }}
              >
                {node.title}
              </Button>
            );
          }

          return <span>{node.title}</span>;
        }}
        onSelect={(keys, info) => {
          const node = info.node;
          if (node.kind === 'add') return;
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
      <Drawer
        open={drawerOpen}
        width={300}
        onHamburgerClick={handleHamburgerClick}
        onMouseEnter={handleDrawerMouseEnter}
        onMouseLeave={handleDrawerMouseLeave}
        header={header}
        body={body}
      />
    </div>
  );
}

