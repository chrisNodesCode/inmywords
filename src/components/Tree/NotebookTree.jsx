import React, { useEffect, useRef, useState } from 'react';
import { Button } from 'antd';
import GroupCard from './GroupCard';
import SubgroupCard from './SubgroupCard';
import EntryCard from './EntryCard';
import styles from './Tree.module.css';

// Utility helpers preserved from previous implementation
const getPlainTextSnippet = (html, length = 200) => {
  if (!html) return null;
  const text = html.replace(/<[^>]+>/g, '').trim();
  if (!text) return null;
  return text.length > length ? `${text.slice(0, length)}...` : text;
};

const formatDate = (date) => (date ? new Date(date).toLocaleDateString() : '');

/**
 * Custom card based notebook tree.
 * Renders hierarchical data using GroupCard → SubgroupCard → EntryCard components
 * with single open item per level and animated expand/collapse.
 */
export default function NotebookTree({
  treeData = [],
  onAddGroup,
  onAddSubgroup,
  onAddEntry,
  notebookId,
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

  // refs for scrolling
  const groupRefs = useRef({});
  const subgroupRefs = useRef({});
  const entryRefs = useRef({});

  const scrollTo = (refMap, id) => {
    const node = refMap.current[id];
    if (node && typeof node.scrollIntoView === 'function') {
      node.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleGroupToggle = (id) => {
    setOpenGroupId((prev) => (prev === id ? null : id));
    setOpenSubgroupId(null);
    setOpenEntryId(null);
    setTimeout(() => scrollTo(groupRefs, id), 0);
  };

  const handleSubgroupToggle = (id) => {
    setOpenSubgroupId((prev) => (prev === id ? null : id));
    setOpenEntryId(null);
    setTimeout(() => scrollTo(subgroupRefs, id), 0);
  };

  const handleEntryToggle = (id) => {
    setOpenEntryId((prev) => (prev === id ? null : id));
    setTimeout(() => scrollTo(entryRefs, id), 0);
  };

  return (
    <div className={styles.root}>
      {notebookTitle && (
        <header className={styles.header}>
          <h2 className={styles.headerTitle}>{notebookTitle}</h2>
          <div className={styles.meta}>
            {createdAt && <time dateTime={createdAt}>{formatDate(createdAt)}</time>}
            {updatedAt && <time dateTime={updatedAt}>{formatDate(updatedAt)}</time>}
          </div>
        </header>
      )}

      {treeData.map((group) => (
        <GroupCard
          key={group.key}
          ref={(el) => (groupRefs.current[group.key] = el)}
          title={group.title}
          isOpen={openGroupId === group.key}
          onToggle={() => handleGroupToggle(group.key)}
        >
          {group.children?.map((sub) => (
            <SubgroupCard
              key={sub.key}
              ref={(el) => (subgroupRefs.current[sub.key] = el)}
              title={sub.title}
              isOpen={openSubgroupId === sub.key}
              onToggle={() => handleSubgroupToggle(sub.key)}
            >
              {sub.children?.map((entry) => (
                <EntryCard
                  key={entry.key}
                  ref={(el) => (entryRefs.current[entry.key] = el)}
                  title={entry.title}
                  snippet={getPlainTextSnippet(entry.content)}
                  isOpen={openEntryId === entry.key}
                  onToggle={() => handleEntryToggle(entry.key)}
                />
              ))}
              {onAddEntry && (
                <Button type="dashed" onClick={() => onAddEntry(group.key, sub.key)}>
                  Add entry
                </Button>
              )}
            </SubgroupCard>
          ))}
          {onAddSubgroup && (
            <Button type="dashed" onClick={() => onAddSubgroup(group.key)}>
              Add subgroup
            </Button>
          )}
        </GroupCard>
      ))}
      {onAddGroup && (
        <Button type="dashed" onClick={onAddGroup} style={{ marginTop: '1rem' }}>
          Add group
        </Button>
      )}
    </div>
  );
}

