import React, { forwardRef, useCallback } from 'react';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import styles from './Tree.module.css';

const SubgroupCard = forwardRef(
  ({ id, title, isOpen, onToggle, children, disableDrag }, ref) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
      id,
      disabled: disableDrag,
    });
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      marginBottom: '0.75rem',
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
      <div ref={mergedRef} style={style}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {!disableDrag && (
            <span
              {...attributes}
              {...listeners}
              onClick={(e) => e.stopPropagation()}
              style={{ cursor: 'grab', marginRight: '0.5rem' }}
            >
              =
            </span>
          )}
          <div
            className={styles.subgroupTitle}
            style={{ cursor: 'pointer' }}
            onClick={onToggle}
          >
            {title}
          </div>
        </div>
        <AnimatePresence initial={false}>
          {isOpen && (
            <Motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden', marginLeft: '1rem' }}
            >
              {children}
            </Motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

export default SubgroupCard;

