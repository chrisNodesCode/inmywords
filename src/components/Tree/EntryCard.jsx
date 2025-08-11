import React, { forwardRef } from 'react';
import { Button } from 'antd';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import styles from './Tree.module.css';

const EntryCard = forwardRef(({ entry, isOpen, onToggle, onEdit }, ref) => {
  const handleEdit = (e) => {
    e.stopPropagation();
    onEdit?.(entry);
  };

  const handleArchive = async (e) => {
    e.stopPropagation();
    await fetch(`/api/entries/${entry.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: true }),
    });
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    await fetch(`/api/entries/${entry.id}`, { method: 'DELETE' });
  };

  const handleDuplicate = async (e) => {
    e.stopPropagation();
    const res = await fetch(`/api/entries/${entry.id}`);
    if (!res.ok) return;
    const data = await res.json();
    await fetch('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: data.title,
        content: data.content,
        subgroupId: data.subgroupId,
        tagIds: data.tags?.map((t) => t.id),
      }),
    });
  };

  const handleAddTag = async (e) => {
    e.stopPropagation();
    const tagId = window.prompt('Enter tag ID');
    if (!tagId) return;
    const res = await fetch(`/api/entries/${entry.id}`);
    if (!res.ok) return;
    const data = await res.json();
    const ids = data.tags?.map((t) => t.id) || [];
    if (ids.includes(tagId)) return;
    ids.push(tagId);
    await fetch(`/api/entries/${entry.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tagIds: ids }),
    });
  };

  return (
    <div ref={ref} style={{ marginBottom: '0.5rem' }}>
      <div className={styles.entryTitle} style={{ cursor: 'pointer' }} onClick={onToggle}>
        {entry.title}
      </div>
      <AnimatePresence initial={false}>
        {isOpen && (
          <Motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden', marginLeft: '1rem' }}
            onClick={() => onEdit?.(entry)}
          >
            {entry.snippet && <p className={styles.entrySnippet}>{entry.snippet}</p>}
            <div className={styles.entryActions} onClick={(e) => e.stopPropagation()}>
              <Button size="small" onClick={handleEdit}>
                Edit
              </Button>
              <Button size="small" onClick={handleArchive}>
                Archive
              </Button>
              <Button size="small" onClick={handleDelete}>
                Delete
              </Button>
              <Button size="small" onClick={handleDuplicate}>
                Duplicate
              </Button>
              <Button size="small" onClick={handleAddTag}>
                Add Tag
              </Button>
            </div>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default EntryCard;

