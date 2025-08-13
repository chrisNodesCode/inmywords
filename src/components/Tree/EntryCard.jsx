import React, { forwardRef, useCallback } from 'react';
import classNames from 'classnames';
import { Button } from 'antd';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { HolderOutlined } from '@ant-design/icons';
import styles from './EntryCard.module.css';

const EntryCard = forwardRef(
  (
    {
      id,
      entry,
      isOpen,
      onToggle,
      onEdit,
      disableDrag,
      actionsDisabled,
      manageMode,
    },
    ref
  ) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
      id,
      disabled: disableDrag,
    });
    const transformStyle = CSS.Transform.toString(transform);
    const style = {
      transform:
        transformStyle === 'none'
          ? 'scale(var(--scale))'
          : `${transformStyle} scale(var(--scale))`,
      transition,
    };
    const mergedRef = useCallback(
      (node) => {
        setNodeRef(node);
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      },
      [ref, setNodeRef]
    );

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
    <div
      ref={mergedRef}
      style={style}
      className={classNames(styles.card, { [styles.interactive]: !manageMode })}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {!disableDrag && (
          <span
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            style={{ cursor: 'grab', marginRight: '0.5rem' }}
          >
            <HolderOutlined />
          </span>
        )}
        <div
          className={styles.title}
          style={{ cursor: actionsDisabled ? 'default' : 'pointer' }}
          onClick={onToggle}
        >
          {entry.title}
        </div>
      </div>
      <AnimatePresence initial={false}>
        {isOpen && (
          <Motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'visible', marginLeft: '1rem', padding: '0.25rem 0' }}
            onClick={() => onEdit?.(entry)}
          >
            {entry.snippet && <p className={styles.snippet}>{entry.snippet}</p>}
            {!actionsDisabled && (
              <div
                className={styles.actions}
                onClick={(e) => e.stopPropagation()}
              >
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
            )}
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default EntryCard;

