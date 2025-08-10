import React, { useMemo } from 'react';
import { Tree, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
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
        }}
      />
    </div>
  );
}

