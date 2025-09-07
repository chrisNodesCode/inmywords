import React, { useEffect, useRef, useState } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import GroupCard from './GroupCard';
import SubgroupCard from './SubgroupCard';
import EntryCard from './EntryCard';
import AddGroupButton from './AddGroupButton';
import AddSubgroupButton from './AddSubgroupButton';
import AddEntryButton from './AddEntryButton';
import EntityEditDrawer from './EntityEditDrawer';
import styles from './Tree.module.css';
import { useDrawer } from '@/components/Drawer/DrawerManager';

const formatDate = (date) => (date ? new Date(date).toLocaleDateString() : '');

/**
 * Custom card based notebook tree.
 * Renders hierarchical data using GroupCard → SubgroupCard → EntryCard components
 * with single open item per level and animated expand/collapse.
 */
export default function NotebookTree({
  treeData = [],
  setTreeData,
  onAddGroup,
  onAddSubgroup,
  onAddEntry,
  onEdit,
  notebookId,
  loadData,
  manageMode,
  reorderMode = false,
  showArchived = false,
}) {
  // notebook metadata
  const [notebookTitle, setNotebookTitle] = useState('');
  const [createdAt, setCreatedAt] = useState('');
  const [updatedAt, setUpdatedAt] = useState('');

  useEffect(() => {
    if (!notebookId) return;
    fetch(`/api/notebooks/${notebookId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((nb) => {
        if (nb) {
          setNotebookTitle(nb.title || '');
          setCreatedAt(nb.createdAt || '');
          setUpdatedAt(nb.updatedAt || '');
        }
      })
      .catch((err) => console.error('Failed to load notebook', err));
  }, [notebookId]);

  // open state per hierarchy level
  const [openGroupId, setOpenGroupId] = useState(null);
  const [openSubgroupId, setOpenSubgroupId] = useState(null);
  const [openEntryId, setOpenEntryId] = useState(null);

  const [editEntity, setEditEntity] = useState(null);
  const {
    openDrawer: openEditDrawer,
    closeDrawer: closeEditDrawer,
  } = useDrawer('entity-edit');

  // refs for scrolling
  const groupRefs = useRef({});
  const subgroupRefs = useRef({});
  const entryRefs = useRef({});
  const editDrawerHideRef = useRef(null);

  const clearEditDrawerHide = () => {
    if (editDrawerHideRef.current) {
      clearTimeout(editDrawerHideRef.current);
      editDrawerHideRef.current = null;
    }
  };

  const handleEditDrawerMouseEnter = () => {
    clearEditDrawerHide();
  };

  const handleEditDrawerMouseLeave = () => {
    clearEditDrawerHide();
    editDrawerHideRef.current = setTimeout(() => {
      setEditEntity(null);
      closeEditDrawer();
    }, 2000);
  };

  useEffect(
    () => () => {
      clearEditDrawerHide();
    },
    []
  );

  const scrollTo = (refMap, id) => {
    const node = refMap.current[id];
    if (node && typeof node.scrollIntoView === 'function') {
      node.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleGroupToggle = async (group) => {
    if (manageMode) {
      setEditEntity({ type: 'group', id: group.key, data: group });
      openEditDrawer();
      return;
    }
    const isCurrentlyOpen = openGroupId === group.key;
    if (isCurrentlyOpen) {
      setOpenGroupId(null);
      return;
    }

    // wait for data to load before expanding so children render with animation
    if (loadData) {
      await loadData(group, showArchived);
    }

    setOpenGroupId(group.key);
    setOpenSubgroupId(null);
    setOpenEntryId(null);
    setTimeout(() => scrollTo(groupRefs, group.key), 0);
  };

  const handleSubgroupToggle = async (sub) => {
    if (manageMode) {
      setEditEntity({ type: 'subgroup', id: sub.key, data: sub });
      openEditDrawer();
      return;
    }
    const isCurrentlyOpen = openSubgroupId === sub.key;
    if (isCurrentlyOpen) {
      setOpenSubgroupId(null);
      return;
    }

    if (loadData) {
      await loadData(sub, showArchived);
    }

    setOpenSubgroupId(sub.key);
    setOpenEntryId(null);
    setTimeout(() => scrollTo(subgroupRefs, sub.key), 0);
  };

  const handleEntryToggle = (entry) => {
    const entryId = typeof entry === 'object' ? entry.id : entry;
    if (manageMode) {
      const subs = treeData.flatMap((g) =>
        (g.children || []).map((s) => ({
          id: s.key,
          title: s.title,
          groupTitle: g.title,
        }))
      );
      setEditEntity({
        type: 'entry',
        id: entryId,
        data: entry,
        subgroups: subs,
      });
      openEditDrawer();
      return;
    }
    setOpenEntryId((prev) => (prev === entryId ? null : entryId));
    setTimeout(() => scrollTo(entryRefs, entryId), 0);
  };

  useEffect(() => {
    if (!manageMode || !loadData) return;
    async function loadAll() {
      for (const group of treeData) {
        await loadData(group, showArchived);
        if (group.children) {
          for (const sub of group.children) {
            await loadData(sub, showArchived);
          }
        }
      }
    }
    loadAll();
  }, [manageMode, loadData, treeData, showArchived]);

  const persistGroupOrder = (items) => {
    const orders = items.map((g, index) => ({ id: g.key, user_sort: index }));
    fetch('/api/groups/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orders }),
    });
  };

  const persistSubgroupOrder = (items) => {
    const orders = items.map((s, index) => ({ id: s.key, user_sort: index }));
    fetch('/api/subgroups/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orders }),
    });
  };

  const persistEntryOrder = (items) => {
    const orders = items.map((e, index) => ({ id: e.key, user_sort: index }));
    fetch('/api/entries/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orders }),
    });
  };

  const handleGroupDragEnd = ({ active, over }) => {
    if (manageMode || !reorderMode || !over || active.id === over.id) return;
    setTreeData((items) => {
      const oldIndex = items.findIndex((i) => i.key === active.id);
      const newIndex = items.findIndex((i) => i.key === over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);
      persistGroupOrder(newItems);
      return newItems;
    });
  };

  const handleSubgroupDragEnd = (groupKey) => ({ active, over }) => {
    if (manageMode || !reorderMode || !over || active.id === over.id) return;
    setTreeData((groups) => {
      const gIndex = groups.findIndex((g) => g.key === groupKey);
      const group = groups[gIndex];
      const children = group.children || [];
      const oldIndex = children.findIndex((c) => c.key === active.id);
      const newIndex = children.findIndex((c) => c.key === over.id);
      const newChildren = arrayMove(children, oldIndex, newIndex);
      const newGroups = [...groups];
      newGroups[gIndex] = { ...group, children: newChildren };
      persistSubgroupOrder(newChildren);
      return newGroups;
    });
  };

  const handleEntryDragEnd = (groupKey, subgroupKey) => ({ active, over }) => {
    if (manageMode || !reorderMode || !over || active.id === over.id) return;
    setTreeData((groups) => {
      const gIndex = groups.findIndex((g) => g.key === groupKey);
      const group = groups[gIndex];
      const sIndex = group.children?.findIndex((s) => s.key === subgroupKey) ?? -1;
      if (sIndex === -1) return groups;
      const subgroup = group.children[sIndex];
      const entries = subgroup.children || [];
      const oldIndex = entries.findIndex((e) => e.key === active.id);
      const newIndex = entries.findIndex((e) => e.key === over.id);
      const newEntries = arrayMove(entries, oldIndex, newIndex);
      const newGroups = [...groups];
      newGroups[gIndex] = { ...group, children: [...group.children] };
      newGroups[gIndex].children[sIndex] = { ...subgroup, children: newEntries };
      persistEntryOrder(newEntries);
      return newGroups;
    });
  };

  const handleEntitySave = (updated) => {
    if (!editEntity) return;
    const type = editEntity.type;
    if (type === 'notebook') {
      setNotebookTitle(updated.title || '');
      return;
    }
    if (!setTreeData) return;
    if (type === 'group') {
      setTreeData((groups) =>
        groups.map((g) =>
          g.key === updated.id
            ? {
                ...g,
                title: updated.name ?? updated.title ?? g.title,
                description: updated.description,
              }
            : g
        )
      );
    } else if (type === 'subgroup') {
      setTreeData((groups) =>
        groups.map((g) => ({
          ...g,
          children: g.children?.map((s) =>
            s.key === updated.id
              ? {
                  ...s,
                  title: updated.name ?? updated.title ?? s.title,
                  description: updated.description,
                }
              : s
          ),
        }))
      );
    } else if (type === 'entry') {
      setTreeData((groups) => {
        const newGroups = groups.map((g) => ({
          ...g,
          children: g.children?.map((s) => ({
            ...s,
            children: s.children ? [...s.children] : [],
          })) || [],
        }));

        // remove entry from old location
        for (const g of newGroups) {
          for (const s of g.children) {
            s.children = (s.children || []).filter(
              (e) => e.id !== updated.id && e.key !== updated.id
            );
          }
        }

        const targetGroupId = updated.subgroup?.group?.id || updated.subgroup?.groupId;
        const targetSubId = updated.subgroupId;
        const targetGroup = newGroups.find((g) => g.key === targetGroupId);
        if (targetGroup) {
          const targetSub = targetGroup.children.find((s) => s.key === targetSubId);
          if (targetSub) {
            targetSub.children = targetSub.children || [];
            targetSub.children.push({
              key: updated.id,
              id: updated.id,
              title: updated.title,
              snippet: updated.content?.slice(0, 100) || updated.snippet || '',
            });
          }
        }

        return newGroups;
      });

      setOpenGroupId(updated.subgroup?.group?.id || updated.subgroup?.groupId || null);
      setOpenSubgroupId(updated.subgroupId);
      setOpenEntryId(updated.id);
    }
  };

  const handleEntryDelete = (entry) => {
    if (!setTreeData) return;
    setTreeData((groups) =>
      groups.map((g) => {
        if (g.key !== entry.groupId) return g;
        return {
          ...g,
          children: g.children?.map((s) => {
            if (s.key !== entry.subgroupId) return s;
            return {
              ...s,
              children: (s.children || []).filter(
                (e) => e.key !== entry.key && e.id !== entry.id
              ),
            };
          }),
        };
      })
    );
    setOpenEntryId((prev) => (prev === entry.id ? null : prev));
  };

  return (
    <div className={styles.root}>
      {notebookTitle && (
        <header className={styles.header}>
          <h2
            className={styles.headerTitle}
            style={{ cursor: manageMode ? 'pointer' : 'default' }}
            onClick={
              manageMode
                ? () =>
                    setEditEntity({
                      type: 'notebook',
                      id: notebookId,
                      data: { title: notebookTitle },
                    })
                : undefined
            }
          >
            {notebookTitle}
          </h2>
          <div className={styles.meta}>
            {createdAt && <time dateTime={createdAt}>{formatDate(createdAt)}</time>}
            {updatedAt && <time dateTime={updatedAt}>{formatDate(updatedAt)}</time>}
          </div>
        </header>
      )}

      <DndContext collisionDetection={closestCenter} onDragEnd={handleGroupDragEnd}>
        <SortableContext
          items={treeData.map((g) => g.key)}
          strategy={verticalListSortingStrategy}
        >
          {treeData.map((group) => {
            const groupDragDisabled = manageMode || !reorderMode || openGroupId !== null;
            return (
              <GroupCard
                key={group.key}
                id={group.key}
                disableDrag={groupDragDisabled}
                ref={(el) => (groupRefs.current[group.key] = el)}
                title={group.title}
                isOpen={manageMode || openGroupId === group.key}
                onToggle={() => handleGroupToggle(group)}
                manageMode={manageMode}
              >
                <DndContext
                  collisionDetection={closestCenter}
                  onDragEnd={handleSubgroupDragEnd(group.key)}
                >
                  <SortableContext
                    items={group.children?.map((sg) => sg.key) || []}
                    strategy={verticalListSortingStrategy}
                  >
                    {group.children?.map((sub) => {
                      const subgroupDragDisabled =
                        manageMode ||
                        !reorderMode ||
                        openGroupId !== group.key ||
                        openSubgroupId !== null;
                      const nonArchivedCount =
                        sub.children?.filter((e) => !e.archived).length || 0;
                      return (
                        <SubgroupCard
                          key={sub.key}
                          id={sub.key}
                          disableDrag={subgroupDragDisabled}
                          ref={(el) => (subgroupRefs.current[sub.key] = el)}
                          title={`${sub.title} (${nonArchivedCount})`}
                          isOpen={manageMode || openSubgroupId === sub.key}
                          onToggle={() => handleSubgroupToggle(sub)}
                          manageMode={manageMode}
                        >
                          <DndContext
                            collisionDetection={closestCenter}
                            onDragEnd={handleEntryDragEnd(group.key, sub.key)}
                          >
                            <SortableContext
                              items={sub.children?.map((e) => e.key) || []}
                              strategy={verticalListSortingStrategy}
                            >
                              {sub.children?.map((entry) => {
                                const entryDragDisabled =
                                  manageMode ||
                                  !reorderMode ||
                                  openSubgroupId !== sub.key ||
                                  openEntryId !== null;
                                const entryWithContext = {
                                  ...entry,
                                  subgroupId: sub.key,
                                  groupId: group.key,
                                };
                                return (
                                  <EntryCard
                                    key={entry.key}
                                    id={entry.key}
                                    disableDrag={entryDragDisabled}
                                    ref={(el) => (entryRefs.current[entryWithContext.id] = el)}
                                    entry={entryWithContext}
                                    isOpen={openEntryId === entry.id}
                                    onToggle={() => handleEntryToggle(entryWithContext)}
                                    onEdit={onEdit}
                                    onDelete={handleEntryDelete}
                                    actionsDisabled={manageMode}
                                    manageMode={manageMode}
                                  />
                                );
                              })}
                            </SortableContext>
                          </DndContext>
                          {!manageMode && onAddEntry && (
                            <AddEntryButton
                              groupKey={group.key}
                              subgroupKey={sub.key}
                              subgroupTitle={sub.title}
                              onAddEntry={onAddEntry}
                            />
                          )}
                        </SubgroupCard>
                      );
                    })}
                  </SortableContext>
                </DndContext>
                {!manageMode && onAddSubgroup && (
                  <AddSubgroupButton
                    groupKey={group.key}
                    groupTitle={group.title}
                    onAddSubgroup={onAddSubgroup}
                  />
                )}
              </GroupCard>
            );
          })}
        </SortableContext>
      </DndContext>
      {!manageMode && onAddGroup && <AddGroupButton onAddGroup={onAddGroup} />}
      {editEntity && (
        <div
          onMouseEnter={handleEditDrawerMouseEnter}
          onMouseLeave={handleEditDrawerMouseLeave}
        >
          <EntityEditDrawer
            type={editEntity.type}
            id={editEntity.id}
            initialData={editEntity.data}
            subgroupOptions={editEntity.subgroups}
            onSave={handleEntitySave}
            onClose={() => {
              setEditEntity(null);
              closeEditDrawer();
            }}
          />
        </div>
      )}
    </div>
  );
}

