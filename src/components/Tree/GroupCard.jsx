import React, { forwardRef, useCallback } from 'react';
import classNames from 'classnames';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { HolderOutlined } from '@ant-design/icons';
import styles from './GroupCard.module.css';

const GroupCard = forwardRef(
  (
    { id, title, isOpen, onToggle, children, disableDrag, manageMode },
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

    return (
      <div
        ref={mergedRef}
        style={style}
        className={classNames('nt-card', styles.card, { [styles.interactive]: !manageMode })}
        role="button"
        tabIndex={0}
        aria-label={title}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
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
          <div className={styles.title}>
            {title}
          </div>
        </div>
        <AnimatePresence initial={false}>
          {isOpen && (
            <Motion.div
              className="nt-children"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'visible', marginLeft: '1rem', padding: '0.25rem 0' }}
              onClick={(e) => e.stopPropagation()}
            >
              {children}
            </Motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

export default GroupCard;
